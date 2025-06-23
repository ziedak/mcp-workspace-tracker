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
	private symbols: Map<string, Symbol[]> = new Map(); // filePath -> symbols
	private fileContentCache: Map<string, string> = new Map(); // filePath -> content

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
		const relevantFiles = files.filter((file) => {
			const ext = path.extname(file).toLowerCase();
			return [".ts", ".tsx", ".js", ".jsx"].includes(ext);
		});

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
	 * Process a single file to extract symbols
	 *
	 * @param filePath - Path to file
	 */
	private async processFile(filePath: string): Promise<void> {
		try {
			// Read file content
			const content = await fs.readFile(filePath, "utf8");

			// Calculate hash
			const hash = crypto.createHash("md5").update(content).digest("hex");

			// Check if cached and unchanged
			if (this.persistenceManager.isCachedAndUnchanged(filePath, hash)) {
				this.logger.debug(`File unchanged, using cached symbols: ${filePath}`);

				// Load symbols from persistence
				const cachedSymbols = await this.persistenceManager.loadData<Symbol[]>(
					`symbols:${filePath}`
				);
				if (cachedSymbols) {
					this.symbols.set(filePath, cachedSymbols);
					this.fileContentCache.set(filePath, content);
					return;
				}
			}

			// Parse file and extract symbols
			this.logger.debug(`Parsing file for symbols: ${filePath}`);
			const fileSymbols = this.parseFileForSymbols(filePath, content);

			// Store results
			this.symbols.set(filePath, fileSymbols);
			this.fileContentCache.set(filePath, content);

			// Update persistence
			await this.persistenceManager.saveData(`symbols:${filePath}`, fileSymbols);
			this.persistenceManager.updateFileHash(filePath, hash);
		} catch (error) {
			this.logger.error(
				`Error processing file: ${filePath}`,
				error instanceof Error ? error : new Error(String(error))
			);
		}
	}

	/**
	 * Parse file content to extract symbols
	 *
	 * @param filePath - Path to file
	 * @param content - File content
	 * @returns Array of discovered symbols
	 */
	private parseFileForSymbols(filePath: string, content: string): Symbol[] {
		const symbols: Symbol[] = [];

		try {
			const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

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
		// Extract symbol information based on node type
		let symbol: Symbol | undefined;

		// Check node kind
		if (ts.isClassDeclaration(node) && node.name) {
			const pos = node.name.getStart();
			const location = ts.getLineAndCharacterOfPosition(node.getSourceFile(), pos);

			symbol = {
				name: node.name.text,
				kind: SymbolKind.CLASS,
				location: {
					filePath,
					line: location.line + 1, // Convert to 1-indexed
					character: location.character + 1, // Convert to 1-indexed
				},
				documentation: this.getDocumentation(node),
				exportStatus: this.getExportStatus(node),
				parentName: parentSymbol?.name,
				children: [],
			};

			symbols.push(symbol);
		} else if (ts.isInterfaceDeclaration(node) && node.name) {
			const pos = node.name.getStart();
			const location = ts.getLineAndCharacterOfPosition(node.getSourceFile(), pos);

			symbol = {
				name: node.name.text,
				kind: SymbolKind.INTERFACE,
				location: {
					filePath,
					line: location.line + 1,
					character: location.character + 1,
				},
				documentation: this.getDocumentation(node),
				exportStatus: this.getExportStatus(node),
				parentName: parentSymbol?.name,
				children: [],
			};

			symbols.push(symbol);
		} else if (ts.isFunctionDeclaration(node) && node.name) {
			const pos = node.name.getStart();
			const location = ts.getLineAndCharacterOfPosition(node.getSourceFile(), pos);

			symbol = {
				name: node.name.text,
				kind: SymbolKind.FUNCTION,
				location: {
					filePath,
					line: location.line + 1,
					character: location.character + 1,
				},
				documentation: this.getDocumentation(node),
				exportStatus: this.getExportStatus(node),
				parentName: parentSymbol?.name,
			};

			symbols.push(symbol);
		} else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
			const pos = node.name.getStart();
			const location = ts.getLineAndCharacterOfPosition(node.getSourceFile(), pos);

			symbol = {
				name: node.name.text,
				kind: SymbolKind.METHOD,
				location: {
					filePath,
					line: location.line + 1,
					character: location.character + 1,
				},
				documentation: this.getDocumentation(node),
				exportStatus: "none", // Methods are not directly exported
				parentName: parentSymbol?.name,
			};

			if (parentSymbol && parentSymbol.children) {
				parentSymbol.children.push(symbol);
			} else {
				symbols.push(symbol);
			}
		} else if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
			const pos = node.name.getStart();
			const location = ts.getLineAndCharacterOfPosition(node.getSourceFile(), pos);

			symbol = {
				name: node.name.text,
				kind: SymbolKind.PROPERTY,
				location: {
					filePath,
					line: location.line + 1,
					character: location.character + 1,
				},
				documentation: this.getDocumentation(node),
				exportStatus: "none", // Properties are not directly exported
				parentName: parentSymbol?.name,
			};

			if (parentSymbol && parentSymbol.children) {
				parentSymbol.children.push(symbol);
			} else {
				symbols.push(symbol);
			}
		} else if (ts.isVariableStatement(node)) {
			node.declarationList.declarations.forEach((declaration) => {
				if (ts.isIdentifier(declaration.name)) {
					const pos = declaration.name.getStart();
					const location = ts.getLineAndCharacterOfPosition(node.getSourceFile(), pos);

					const varSymbol: Symbol = {
						name: declaration.name.text,
						kind: SymbolKind.VARIABLE,
						location: {
							filePath,
							line: location.line + 1,
							character: location.character + 1,
						},
						documentation: this.getDocumentation(node),
						exportStatus: this.getExportStatus(node),
						parentName: parentSymbol?.name,
					};

					symbols.push(varSymbol);
				}
			});
		} else if (ts.isEnumDeclaration(node) && node.name) {
			const pos = node.name.getStart();
			const location = ts.getLineAndCharacterOfPosition(node.getSourceFile(), pos);

			symbol = {
				name: node.name.text,
				kind: SymbolKind.ENUM,
				location: {
					filePath,
					line: location.line + 1,
					character: location.character + 1,
				},
				documentation: this.getDocumentation(node),
				exportStatus: this.getExportStatus(node),
				parentName: parentSymbol?.name,
				children: [],
			};

			symbols.push(symbol);
		} else if (ts.isTypeAliasDeclaration(node) && node.name) {
			const pos = node.name.getStart();
			const location = ts.getLineAndCharacterOfPosition(node.getSourceFile(), pos);

			symbol = {
				name: node.name.text,
				kind: SymbolKind.TYPE_ALIAS,
				location: {
					filePath,
					line: location.line + 1,
					character: location.character + 1,
				},
				documentation: this.getDocumentation(node),
				exportStatus: this.getExportStatus(node),
				parentName: parentSymbol?.name,
			};

			symbols.push(symbol);
		} else if (ts.isModuleDeclaration(node) && node.name) {
			const isNamespace = node.flags & ts.NodeFlags.Namespace;
			const pos = node.name.getStart();
			const location = ts.getLineAndCharacterOfPosition(node.getSourceFile(), pos);

			symbol = {
				name: ts.isIdentifier(node.name) ? node.name.text : node.name.getText(),
				kind: isNamespace ? SymbolKind.NAMESPACE : SymbolKind.MODULE,
				location: {
					filePath,
					line: location.line + 1,
					character: location.character + 1,
				},
				documentation: this.getDocumentation(node),
				exportStatus: this.getExportStatus(node),
				parentName: parentSymbol?.name,
				children: [],
			};

			symbols.push(symbol);
		}

		// Continue recursively for children
		ts.forEachChild(node, (child) => {
			this.visitNode(child, symbols, filePath, symbol || parentSymbol);
		});
	}

	/**
	 * Extract documentation comments from node
	 *
	 * @param node - TypeScript AST node
	 * @returns Documentation string or empty string if none
	 */
	private getDocumentation(node: ts.Node): string {
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
	 *
	 * @param node - TypeScript AST node
	 * @returns Export status
	 */
	private getExportStatus(node: ts.Node): "exported" | "default" | "none" {
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
	 *
	 * @param symbols - Array of symbols to search
	 * @param queryLower - Lowercase query string
	 * @param kind - Optional filter by symbol kind
	 * @returns Array of matching symbols
	 */
	private findMatchingSymbols(symbols: Symbol[], queryLower: string, kind?: SymbolKind): Symbol[] {
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
