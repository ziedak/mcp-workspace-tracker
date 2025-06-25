import { injectable, inject } from "inversify";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import * as ts from "typescript";
import { ISymbolIndexer } from "../interfaces/ISymbolIndexer";
import type { ILogger } from "../interfaces/ILogger";
import type { IPersistenceManager } from "../interfaces/IPersistenceManager";
import { Symbol, SymbolKind } from "../models/Symbol";
import { TYPES } from "../../config/types";

/**
 * Implementation of the symbol indexer service
 */
@injectable()
export class SymbolIndexer implements ISymbolIndexer {
	protected symbols: Map<string, Symbol[]> = new Map(); // filePath -> symbols
	protected fileContentCache: Map<string, string> = new Map(); // filePath -> content

	/**
	 * Creates a new SymbolIndexer
	 *
	 * @param logger - Logger service
	 * @param persistenceManager - Persistence manager service
	 */
	constructor(
		@inject(TYPES.Logger) private readonly logger: ILogger,
		@inject(TYPES.PersistenceManager) private readonly persistenceManager: IPersistenceManager
	) {}

	/**
	 * Index files to extract symbols
	 *
	 * @param files - Array of file paths to index
	 */
	public async indexFiles(files: string[]): Promise<void> {
		this.logger.info(`Indexing ${files.length} files for symbols`);

		// Filter to relevant file types
		const relevantFiles = this.filterRelevantFiles(files);

		if (relevantFiles.length === 0) {
			this.logger.info("No relevant files to index");
			return;
		}

		this.logger.debug(`Found ${relevantFiles.length} relevant files to index`);

		// Process each file
		await Promise.all(relevantFiles.map((filePath) => this.processFile(filePath)));

		this.logger.info(`Completed indexing ${relevantFiles.length} files`);
	}

	/**
	 * Filter files to relevant types for symbol indexing
	 * Made protected for testing
	 */
	protected filterRelevantFiles(files: string[]): string[] {
		return files.filter((file) => this.isRelevantFileType(file));
	}

	/**
	 * Check if file type is relevant for symbol indexing
	 * Made protected for testing
	 */
	protected isRelevantFileType(file: string): boolean {
		const ext = path.extname(file).toLowerCase();
		return [".ts", ".tsx", ".js", ".jsx"].includes(ext);
	}

	/**
	 * Process a single file to extract symbols
	 * Made protected for testing
	 *
	 * @param filePath - Path to file
	 */
	protected async processFile(filePath: string): Promise<void> {
		try {
			// Read file content
			const content = await this.readFileContent(filePath);
			
			// Calculate hash
			const hash = this.calculateFileHash(content);

			// Check if cached and unchanged
			if (await this.canUseCachedSymbols(filePath, hash)) {
				await this.loadCachedSymbols(filePath, content);
				return;
			}

			// Parse file and extract symbols
			this.logger.debug(`Parsing file for symbols: ${filePath}`);
			const fileSymbols = this.parseFileForSymbols(filePath, content);

			// Store results
			await this.storeSymbolResults(filePath, content, fileSymbols, hash);
		} catch (error) {
			this.logger.error(
				`Error processing file: ${filePath}`,
				error instanceof Error ? error : new Error(String(error))
			);
		}
	}

	/**
	 * Read file content
	 * Made protected for testing
	 */
	protected async readFileContent(filePath: string): Promise<string> {
		return await fs.readFile(filePath, "utf8");
	}

	/**
	 * Calculate MD5 hash of file content
	 * Made protected for testing
	 */
	protected calculateFileHash(content: string): string {
		return crypto.createHash("md5").update(content).digest("hex");
	}

	/**
	 * Check if cached symbols can be used
	 * Made protected for testing
	 */
	protected async canUseCachedSymbols(filePath: string, hash: string): Promise<boolean> {
		return this.persistenceManager.isCachedAndUnchanged(filePath, hash);
	}

	/**
	 * Load symbols from cache
	 * Made protected for testing
	 */
	protected async loadCachedSymbols(filePath: string, content: string): Promise<void> {
		this.logger.debug(`File unchanged, using cached symbols: ${filePath}`);

		// Load symbols from persistence
		const cachedSymbols = await this.persistenceManager.loadData<Symbol[]>(
			`symbols:${filePath}`
		);
		if (cachedSymbols) {
			this.symbols.set(filePath, cachedSymbols);
			this.fileContentCache.set(filePath, content);
		}
	}

	/**
	 * Store symbol results in cache and persistence
	 * Made protected for testing
	 */
	protected async storeSymbolResults(
		filePath: string,
		content: string,
		fileSymbols: Symbol[],
		hash: string
	): Promise<void> {
		// Store results
		this.symbols.set(filePath, fileSymbols);
		this.fileContentCache.set(filePath, content);

		// Update persistence
		await this.persistenceManager.saveData(`symbols:${filePath}`, fileSymbols);
		this.persistenceManager.updateFileHash(filePath, hash);
	}

	/**
	 * Parse file content to extract symbols
	 * Made protected for testing
	 *
	 * @param filePath - Path to file
	 * @param content - File content
	 * @returns Array of discovered symbols
	 */
	protected parseFileForSymbols(filePath: string, content: string): Symbol[] {
		const symbols: Symbol[] = [];

		try {
			const sourceFile = this.createSourceFile(filePath, content);
			// Visit nodes and collect symbols
			this.visitNode(sourceFile, symbols, filePath);
		} catch (error) {
			this.logger.error(
				`Error parsing file for symbols: ${filePath}`,
				error instanceof Error ? error : new Error(String(error))
			);
		}

		return symbols;
	}

	/**
	 * Create TypeScript source file
	 * Made protected for testing
	 */
	protected createSourceFile(filePath: string, content: string): ts.SourceFile {
		return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
	}

	/**
	 * Recursively visit AST nodes to collect symbols
	 *
	 * @param node - TypeScript AST node
	 * @param symbols - Array to populate with found symbols
	 * @param filePath - Path to source file
	 * @param parentSymbol - Optional parent symbol
	 */
	private visitNode(
		node: ts.Node,
		symbols: Symbol[],
		filePath: string,
		parentSymbol?: Symbol
	): void {
		let symbol: Symbol | undefined;

		// Handle variable statements specially (they can contain multiple declarations)
		if (ts.isVariableStatement(node)) {
			this.processVariableStatement(node, filePath, parentSymbol, symbols);
		} else {
			// Extract symbol information based on node type
			symbol = this.createSymbolFromNode(node, filePath, parentSymbol);

			// Add symbol to appropriate collection
			if (symbol) {
				this.addSymbolToCollection(symbol, symbols, parentSymbol);
			}
		}

		// Continue recursively for children
		ts.forEachChild(node, (child) => {
			this.visitNode(child, symbols, filePath, symbol || parentSymbol);
		});
	}

	/**
	 * Create symbol from AST node based on node type
	 * Made protected for testing
	 */
	protected createSymbolFromNode(
		node: ts.Node,
		filePath: string,
		parentSymbol?: Symbol
	): Symbol | undefined {
		if (ts.isClassDeclaration(node) && node.name) {
			return this.createClassSymbol(node, filePath, parentSymbol);
		} else if (ts.isInterfaceDeclaration(node) && node.name) {
			return this.createInterfaceSymbol(node, filePath, parentSymbol);
		} else if (ts.isFunctionDeclaration(node) && node.name) {
			return this.createFunctionSymbol(node, filePath, parentSymbol);
		} else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
			return this.createMethodSymbol(node, filePath, parentSymbol);
		} else if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
			return this.createPropertySymbol(node, filePath, parentSymbol);
		} else if (ts.isEnumDeclaration(node) && node.name) {
			return this.createEnumSymbol(node, filePath, parentSymbol);
		} else if (ts.isTypeAliasDeclaration(node) && node.name) {
			return this.createTypeAliasSymbol(node, filePath, parentSymbol);
		} else if (ts.isModuleDeclaration(node) && node.name) {
			return this.createModuleSymbol(node, filePath, parentSymbol);
		}

		return undefined;
	}

	/**
	 * Add symbol to appropriate collection
	 * Made protected for testing
	 */
	protected addSymbolToCollection(symbol: Symbol, symbols: Symbol[], parentSymbol?: Symbol): void {
		if (symbol.kind === SymbolKind.METHOD || symbol.kind === SymbolKind.PROPERTY) {
			if (parentSymbol && parentSymbol.children) {
				parentSymbol.children.push(symbol);
			} else {
				symbols.push(symbol);
			}
		} else {
			symbols.push(symbol);
		}
	}

	/**
	 * Create class symbol from class declaration node
	 * Made protected for testing
	 */
	protected createClassSymbol(
		node: ts.ClassDeclaration,
		filePath: string,
		parentSymbol?: Symbol
	): Symbol {
		const location = this.getSymbolLocation(node.name!, filePath);
		return {
			name: node.name!.text,
			kind: SymbolKind.CLASS,
			location,
			documentation: this.getDocumentation(node),
			exportStatus: this.getExportStatus(node),
			parentName: parentSymbol?.name,
			children: [],
		};
	}

	/**
	 * Create interface symbol from interface declaration node
	 * Made protected for testing
	 */
	protected createInterfaceSymbol(
		node: ts.InterfaceDeclaration,
		filePath: string,
		parentSymbol?: Symbol
	): Symbol {
		const location = this.getSymbolLocation(node.name, filePath);
		return {
			name: node.name.text,
			kind: SymbolKind.INTERFACE,
			location,
			documentation: this.getDocumentation(node),
			exportStatus: this.getExportStatus(node),
			parentName: parentSymbol?.name,
			children: [],
		};
	}

	/**
	 * Create function symbol from function declaration node
	 * Made protected for testing
	 */
	protected createFunctionSymbol(
		node: ts.FunctionDeclaration,
		filePath: string,
		parentSymbol?: Symbol
	): Symbol {
		const location = this.getSymbolLocation(node.name!, filePath);
		return {
			name: node.name!.text,
			kind: SymbolKind.FUNCTION,
			location,
			documentation: this.getDocumentation(node),
			exportStatus: this.getExportStatus(node),
			parentName: parentSymbol?.name,
		};
	}

	/**
	 * Create method symbol from method declaration node
	 * Made protected for testing
	 */
	protected createMethodSymbol(
		node: ts.MethodDeclaration,
		filePath: string,
		parentSymbol?: Symbol
	): Symbol {
		const location = this.getSymbolLocation(node.name as ts.Identifier, filePath);
		return {
			name: (node.name as ts.Identifier).text,
			kind: SymbolKind.METHOD,
			location,
			documentation: this.getDocumentation(node),
			exportStatus: "none", // Methods are not directly exported
			parentName: parentSymbol?.name,
		};
	}

	/**
	 * Create property symbol from property declaration node
	 * Made protected for testing
	 */
	protected createPropertySymbol(
		node: ts.PropertyDeclaration,
		filePath: string,
		parentSymbol?: Symbol
	): Symbol {
		const location = this.getSymbolLocation(node.name as ts.Identifier, filePath);
		return {
			name: (node.name as ts.Identifier).text,
			kind: SymbolKind.PROPERTY,
			location,
			documentation: this.getDocumentation(node),
			exportStatus: "none", // Properties are not directly exported
			parentName: parentSymbol?.name,
		};
	}

	/**
	 * Create variable symbol from variable statement node
	 * Made protected for testing
	 * Note: Returns undefined for variable statements (handled specially in createSymbolFromNode)
	 */
	protected createVariableSymbol(
		node: ts.VariableStatement,
		filePath: string,
		parentSymbol?: Symbol
	): Symbol | undefined {
		// Variable statements need special handling as they can contain multiple declarations
		// This is handled in a separate method
		return undefined;
	}

	/**
	 * Process variable statement to extract variable symbols
	 * Made protected for testing
	 */
	protected processVariableStatement(
		node: ts.VariableStatement,
		filePath: string,
		parentSymbol: Symbol | undefined,
		symbols: Symbol[]
	): void {
		node.declarationList.declarations.forEach((declaration) => {
			if (ts.isIdentifier(declaration.name)) {
				const location = this.getSymbolLocation(declaration.name, filePath);
				const varSymbol: Symbol = {
					name: declaration.name.text,
					kind: SymbolKind.VARIABLE,
					location,
					documentation: this.getDocumentation(node),
					exportStatus: this.getExportStatus(node),
					parentName: parentSymbol?.name,
				};
				symbols.push(varSymbol);
			}
		});
	}

	/**
	 * Create enum symbol from enum declaration node
	 * Made protected for testing
	 */
	protected createEnumSymbol(
		node: ts.EnumDeclaration,
		filePath: string,
		parentSymbol?: Symbol
	): Symbol {
		const location = this.getSymbolLocation(node.name, filePath);
		return {
			name: node.name.text,
			kind: SymbolKind.ENUM,
			location,
			documentation: this.getDocumentation(node),
			exportStatus: this.getExportStatus(node),
			parentName: parentSymbol?.name,
			children: [],
		};
	}

	/**
	 * Create type alias symbol from type alias declaration node
	 * Made protected for testing
	 */
	protected createTypeAliasSymbol(
		node: ts.TypeAliasDeclaration,
		filePath: string,
		parentSymbol?: Symbol
	): Symbol {
		const location = this.getSymbolLocation(node.name, filePath);
		return {
			name: node.name.text,
			kind: SymbolKind.TYPE_ALIAS,
			location,
			documentation: this.getDocumentation(node),
			exportStatus: this.getExportStatus(node),
			parentName: parentSymbol?.name,
		};
	}

	/**
	 * Create module symbol from module declaration node
	 * Made protected for testing
	 */
	protected createModuleSymbol(
		node: ts.ModuleDeclaration,
		filePath: string,
		parentSymbol?: Symbol
	): Symbol {
		const isNamespace = node.flags & ts.NodeFlags.Namespace;
		const location = this.getSymbolLocation(node.name, filePath);
		return {
			name: ts.isIdentifier(node.name) ? node.name.text : node.name.getText(),
			kind: isNamespace ? SymbolKind.NAMESPACE : SymbolKind.MODULE,
			location,
			documentation: this.getDocumentation(node),
			exportStatus: this.getExportStatus(node),
			parentName: parentSymbol?.name,
			children: [],
		};
	}

	/**
	 * Get symbol location from node
	 * Made protected for testing
	 */
	protected getSymbolLocation(nameNode: ts.Node, filePath: string): { filePath: string; line: number; character: number } {
		const pos = nameNode.getStart();
		const location = ts.getLineAndCharacterOfPosition(nameNode.getSourceFile(), pos);
		return {
			filePath,
			line: location.line + 1, // Convert to 1-indexed
			character: location.character + 1, // Convert to 1-indexed
		};
	}

	/**
	 * Extract documentation comments from node
	 * Made protected for testing
	 *
	 * @param node - TypeScript AST node
	 * @returns Documentation string or empty string if none
	 */
	protected getDocumentation(node: ts.Node): string {
		const text = node.getFullText();
		const commentRanges = ts.getLeadingCommentRanges(text, 0);

		if (!commentRanges || commentRanges.length === 0) {
			return "";
		}

		// Get JSDoc comments
		const docComments = commentRanges
			.filter((range) => text.substring(range.pos, range.end).startsWith("/**"))
			.map((range) => text.substring(range.pos, range.end))
			.join("\n");

		return docComments || "";
	}

	/**
	 * Determine export status of a declaration
	 * Made protected for testing
	 *
	 * @param node - TypeScript AST node
	 * @returns Export status
	 */
	protected getExportStatus(node: ts.Node): "exported" | "default" | "none" {
		// Check for export modifier using the safer getModifiers() method
		const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;

		if (modifiers && modifiers.length > 0) {
			const hasExport = modifiers.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);
			const hasDefault = modifiers.some((mod) => mod.kind === ts.SyntaxKind.DefaultKeyword);

			if (hasExport && hasDefault) {
				return "default";
			}

			if (hasExport) {
				return "exported";
			}
		}

		return "none";
	}

	/**
	 * Search for symbols matching a query
	 *
	 * @param query - Search query string
	 * @param kind - Optional filter by symbol kind
	 * @returns Array of matching symbols
	 */
	public async searchSymbols(query: string, kind?: SymbolKind): Promise<Symbol[]> {
		this.logger.debug(`Searching symbols with query "${query}"${kind ? ` and kind ${kind}` : ""}`);

		const queryLower = query.toLowerCase();
		const results: Symbol[] = [];

		// Search in all indexed files
		for (const symbols of this.symbols.values()) {
			const matches = this.findMatchingSymbols(symbols, queryLower, kind);
			results.push(...matches);
		}

		this.logger.debug(`Found ${results.length} symbols matching query`);
		return results;
	}

	/**
	 * Find symbols matching query in a symbol array
	 * Made protected for testing
	 *
	 * @param symbols - Array of symbols to search
	 * @param queryLower - Lowercase query string
	 * @param kind - Optional filter by symbol kind
	 * @returns Array of matching symbols
	 */
	protected findMatchingSymbols(symbols: Symbol[], queryLower: string, kind?: SymbolKind): Symbol[] {
		return symbols.filter((symbol) => {
			// Check kind filter
			if (kind && symbol.kind !== kind) {
				return false;
			}

			// Check name match
			if (symbol.name.toLowerCase().includes(queryLower)) {
				return true;
			}

			// Check documentation match
			if (symbol.documentation.toLowerCase().includes(queryLower)) {
				return true;
			}

			// Check children recursively
			if (symbol.children && symbol.children.length > 0) {
				const childMatches = this.findMatchingSymbols(symbol.children, queryLower, kind);
				return childMatches.length > 0;
			}

			return false;
		});
	}

	/**
	 * Get symbols for a specific file
	 *
	 * @param filePath - Path to file
	 * @returns Array of symbols in file
	 */
	public async getFileSymbols(filePath: string): Promise<Symbol[]> {
		this.logger.debug(`Getting symbols for file: ${filePath}`);

		// Check if file is indexed
		if (!this.symbols.has(filePath)) {
			// Try to process file
			await this.processFile(filePath);
		}

		return this.symbols.get(filePath) || [];
	}

	/**
	 * Clear index
	 */
	public clearIndex(): void {
		this.logger.info("Clearing symbol index");
		this.symbols.clear();
		this.fileContentCache.clear();
	}
}
