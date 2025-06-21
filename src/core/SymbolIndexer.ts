/**
 * SymbolIndexer class
 * Responsible for parsing source files and extracting symbols
 */

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

/**
 * Interface for a parsed symbol
 */
export interface Symbol {
	name: string;
	kind: string;
	location: {
		filePath: string;
		line: number;
		character: number;
	};
	documentation: string;
	parentName?: string;
	exportStatus: "exported" | "default" | "none";
	children?: Symbol[];
}

/**
 * Interface for a parsed file
 */
export interface ParsedFile {
	filePath: string;
	symbols: Symbol[];
	imports: {
		module: string;
		symbols: string[];
	}[];
	exports: {
		name: string;
		isDefault: boolean;
	}[];
}

/**
 * SymbolIndexer class for parsing source files and extracting symbols
 */
export class SymbolIndexer {
	private parsedFiles: Map<string, ParsedFile>;

	/**
	 * Constructor for SymbolIndexer
	 */
	constructor() {
		this.parsedFiles = new Map();
	}

	/**
	 * Index all files in a workspace
	 * @param filePaths Array of file paths to index
	 */
	public async indexWorkspace(filePaths: string[]): Promise<void> {
		console.log(`Indexing ${filePaths.length} files...`);

		// Filter for TypeScript/JavaScript files for now
		const tsFiles = filePaths.filter(
			(file) =>
				file.endsWith(".ts") ||
				file.endsWith(".tsx") ||
				file.endsWith(".js") ||
				file.endsWith(".jsx")
		);

		console.log(`Found ${tsFiles.length} TypeScript/JavaScript files`);

		// Process files
		for (const file of tsFiles) {
			try {
				await this.indexFile(file);
			} catch (error) {
				console.error(
					`Error indexing file ${file}: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}

		console.log(`Indexed ${this.parsedFiles.size} files successfully`);
	}

	/**
	 * Index a single file
	 * @param filePath Path to the file
	 */
	public async indexFile(filePath: string): Promise<void> {
		try {
			console.log(`Indexing file: ${filePath}`);

			// Read file content
			const content = await fs.promises.readFile(filePath, "utf8");

			// Parse file using TypeScript compiler API
			const parsedFile = this.parseTypeScriptFile(filePath, content);

			// Store parsed information
			this.parsedFiles.set(filePath, parsedFile);
		} catch (error) {
			console.error(
				`Error in indexFile for ${filePath}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
			throw error;
		}
	}

	/**
	 * Get all indexed files
	 * @returns Map of file paths to parsed files
	 */
	public getParsedFiles(): Map<string, ParsedFile> {
		return this.parsedFiles;
	}

	/**
	 * Parse a TypeScript file and extract symbols
	 * @param filePath Path to the file
	 * @param content File content
	 * @returns ParsedFile object
	 */
	private parseTypeScriptFile(filePath: string, content: string): ParsedFile {
		// Create source file
		const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

		const parsedFile: ParsedFile = {
			filePath,
			symbols: [],
			imports: [],
			exports: [],
		};

		// Traverse the AST and collect symbols
		this.collectSymbols(sourceFile, parsedFile);

		return parsedFile;
	}

	/**
	 * Traverse AST and collect symbols
	 * @param sourceFile TypeScript source file
	 * @param parsedFile ParsedFile object to populate
	 */
	private collectSymbols(sourceFile: ts.SourceFile, parsedFile: ParsedFile): void {
		const visit = (node: ts.Node, parent?: ts.Node): void => {
			// Check for different kinds of declarations
			if (ts.isClassDeclaration(node)) {
				this.processClassDeclaration(node, sourceFile, parsedFile);
			} else if (ts.isFunctionDeclaration(node)) {
				this.processFunctionDeclaration(node, sourceFile, parsedFile);
			} else if (ts.isInterfaceDeclaration(node)) {
				this.processInterfaceDeclaration(node, sourceFile, parsedFile);
			} else if (ts.isTypeAliasDeclaration(node)) {
				this.processTypeAliasDeclaration(node, sourceFile, parsedFile);
			} else if (ts.isVariableStatement(node)) {
				this.processVariableStatement(node, sourceFile, parsedFile);
			} else if (ts.isImportDeclaration(node)) {
				this.processImportDeclaration(node, parsedFile);
			} else if (ts.isExportDeclaration(node)) {
				this.processExportDeclaration(node, parsedFile);
			}

			// Continue traversing
			ts.forEachChild(node, (child: ts.Node) => visit(child, node));
		};

		// Start traversal
		visit(sourceFile);
	}

	/**
	 * Process a class declaration
	 * @param node Class declaration node
	 * @param sourceFile Source file
	 * @param parsedFile ParsedFile to update
	 */
	private processClassDeclaration(
		node: ts.ClassDeclaration,
		sourceFile: ts.SourceFile,
		parsedFile: ParsedFile
	): void {
		if (!node.name) return;

		const location = sourceFile.getLineAndCharacterOfPosition(node.name.getStart());
		const docs = this.getDocumentation(node);
		const symbol: Symbol = {
			name: node.name.text,
			kind: "class",
			location: {
				filePath: parsedFile.filePath,
				line: location.line + 1,
				character: location.character + 1,
			},
			documentation: docs,
			exportStatus: this.getExportStatus(node),
			children: [],
		};

		// Process class members (methods, properties)
		node.members.forEach((member: ts.ClassElement) => {
			if (ts.isMethodDeclaration(member) && member.name) {
				const memberName = member.name.getText();
				const memberLocation = sourceFile.getLineAndCharacterOfPosition(member.getStart());
				const memberDocs = this.getDocumentation(member);

				symbol.children?.push({
					name: memberName,
					kind: "method",
					location: {
						filePath: parsedFile.filePath,
						line: memberLocation.line + 1,
						character: memberLocation.character + 1,
					},
					documentation: memberDocs,
					parentName: symbol.name,
					exportStatus: "none", // Methods aren't directly exported
				});
			} else if (ts.isPropertyDeclaration(member) && member.name) {
				const memberName = member.name.getText();
				const memberLocation = sourceFile.getLineAndCharacterOfPosition(member.getStart());
				const memberDocs = this.getDocumentation(member);

				symbol.children?.push({
					name: memberName,
					kind: "property",
					location: {
						filePath: parsedFile.filePath,
						line: memberLocation.line + 1,
						character: memberLocation.character + 1,
					},
					documentation: memberDocs,
					parentName: symbol.name,
					exportStatus: "none", // Properties aren't directly exported
				});
			}
		});

		parsedFile.symbols.push(symbol);

		// If exported, add to exports
		if (symbol.exportStatus !== "none") {
			parsedFile.exports.push({
				name: symbol.name,
				isDefault: symbol.exportStatus === "default",
			});
		}
	}

	/**
	 * Process a function declaration
	 * @param node Function declaration node
	 * @param sourceFile Source file
	 * @param parsedFile ParsedFile to update
	 */
	private processFunctionDeclaration(
		node: ts.FunctionDeclaration,
		sourceFile: ts.SourceFile,
		parsedFile: ParsedFile
	): void {
		if (!node.name) return;

		const location = sourceFile.getLineAndCharacterOfPosition(node.name.getStart());
		const docs = this.getDocumentation(node);
		const symbol: Symbol = {
			name: node.name.text,
			kind: "function",
			location: {
				filePath: parsedFile.filePath,
				line: location.line + 1,
				character: location.character + 1,
			},
			documentation: docs,
			exportStatus: this.getExportStatus(node),
		};

		parsedFile.symbols.push(symbol);

		// If exported, add to exports
		if (symbol.exportStatus !== "none") {
			parsedFile.exports.push({
				name: symbol.name,
				isDefault: symbol.exportStatus === "default",
			});
		}
	}

	/**
	 * Process an interface declaration
	 * @param node Interface declaration node
	 * @param sourceFile Source file
	 * @param parsedFile ParsedFile to update
	 */
	private processInterfaceDeclaration(
		node: ts.InterfaceDeclaration,
		sourceFile: ts.SourceFile,
		parsedFile: ParsedFile
	): void {
		const location = sourceFile.getLineAndCharacterOfPosition(node.name.getStart());
		const docs = this.getDocumentation(node);
		const symbol: Symbol = {
			name: node.name.text,
			kind: "interface",
			location: {
				filePath: parsedFile.filePath,
				line: location.line + 1,
				character: location.character + 1,
			},
			documentation: docs,
			exportStatus: this.getExportStatus(node),
			children: [],
		};

		// Process interface members
		node.members.forEach((member: ts.TypeElement) => {
			if (member.name) {
				const memberName = member.name.getText();
				const memberLocation = sourceFile.getLineAndCharacterOfPosition(member.getStart());
				const memberDocs = this.getDocumentation(member);

				symbol.children?.push({
					name: memberName,
					kind: ts.isMethodSignature(member) ? "method" : "property",
					location: {
						filePath: parsedFile.filePath,
						line: memberLocation.line + 1,
						character: memberLocation.character + 1,
					},
					documentation: memberDocs,
					parentName: symbol.name,
					exportStatus: "none",
				});
			}
		});

		parsedFile.symbols.push(symbol);

		// If exported, add to exports
		if (symbol.exportStatus !== "none") {
			parsedFile.exports.push({
				name: symbol.name,
				isDefault: symbol.exportStatus === "default",
			});
		}
	}

	/**
	 * Process a type alias declaration
	 * @param node Type alias declaration node
	 * @param sourceFile Source file
	 * @param parsedFile ParsedFile to update
	 */
	private processTypeAliasDeclaration(
		node: ts.TypeAliasDeclaration,
		sourceFile: ts.SourceFile,
		parsedFile: ParsedFile
	): void {
		const location = sourceFile.getLineAndCharacterOfPosition(node.name.getStart());
		const docs = this.getDocumentation(node);
		const symbol: Symbol = {
			name: node.name.text,
			kind: "typeAlias",
			location: {
				filePath: parsedFile.filePath,
				line: location.line + 1,
				character: location.character + 1,
			},
			documentation: docs,
			exportStatus: this.getExportStatus(node),
		};

		parsedFile.symbols.push(symbol);

		// If exported, add to exports
		if (symbol.exportStatus !== "none") {
			parsedFile.exports.push({
				name: symbol.name,
				isDefault: symbol.exportStatus === "default",
			});
		}
	}

	/**
	 * Process a variable statement
	 * @param node Variable statement node
	 * @param sourceFile Source file
	 * @param parsedFile ParsedFile to update
	 */
	private processVariableStatement(
		node: ts.VariableStatement,
		sourceFile: ts.SourceFile,
		parsedFile: ParsedFile
	): void {
		const exportStatus = this.getExportStatus(node);

		node.declarationList.declarations.forEach((declaration: ts.VariableDeclaration) => {
			if (!ts.isIdentifier(declaration.name)) return;

			const location = sourceFile.getLineAndCharacterOfPosition(declaration.name.getStart());
			const docs = this.getDocumentation(node);
			const symbol: Symbol = {
				name: declaration.name.text,
				kind: "variable",
				location: {
					filePath: parsedFile.filePath,
					line: location.line + 1,
					character: location.character + 1,
				},
				documentation: docs,
				exportStatus,
			};

			parsedFile.symbols.push(symbol);

			// If exported, add to exports
			if (exportStatus !== "none") {
				parsedFile.exports.push({
					name: symbol.name,
					isDefault: exportStatus === "default",
				});
			}
		});
	}

	/**
	 * Process an import declaration
	 * @param node Import declaration node
	 * @param parsedFile ParsedFile to update
	 */
	private processImportDeclaration(node: ts.ImportDeclaration, parsedFile: ParsedFile): void {
		if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) return;

		const moduleSpecifier = node.moduleSpecifier.text;
		const importedSymbols: string[] = [];

		if (node.importClause) {
			// Named imports
			if (node.importClause.namedBindings) {
				if (ts.isNamedImports(node.importClause.namedBindings)) {
					node.importClause.namedBindings.elements.forEach((element: ts.ImportSpecifier) => {
						importedSymbols.push(element.name.text);
					});
				} else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
					importedSymbols.push(`* as ${node.importClause.namedBindings.name.text}`);
				}
			}
			// Default import
			if (node.importClause.name) {
				importedSymbols.push(`default as ${node.importClause.name.text}`);
			}
		}

		parsedFile.imports.push({
			module: moduleSpecifier,
			symbols: importedSymbols,
		});
	}

	/**
	 * Process an export declaration
	 * @param node Export declaration node
	 * @param parsedFile ParsedFile to update
	 */
	private processExportDeclaration(node: ts.ExportDeclaration, parsedFile: ParsedFile): void {
		if (!node.exportClause) return;

		if (ts.isNamedExports(node.exportClause)) {
			node.exportClause.elements.forEach((element: ts.ExportSpecifier) => {
				parsedFile.exports.push({
					name: element.name.text,
					isDefault: false,
				});
			});
		}
	}

	/**
	 * Get JSDoc comments for a node
	 * @param node TypeScript AST node
	 * @returns String of documentation comments
	 */
	private getDocumentation(node: ts.Node): string {
		const text = node.getFullText();
		const commentRanges = ts.getLeadingCommentRanges(text, 0);

		if (!commentRanges || commentRanges.length === 0) {
			return "";
		}

		// Extract JSDoc comments
		return commentRanges
			.map((range: ts.CommentRange) => text.substring(range.pos, range.end))
			.filter((comment: string) => comment.startsWith("/**"))
			.map((comment: string) => {
				// Clean up the comment
				return comment
					.replace(/\/\*\*|\*\//g, "") // Remove start/end markers
					.split("\n")
					.map((line: string) => line.replace(/^\s*\*\s?/, "")) // Remove * at start of lines
					.join("\n")
					.trim();
			})
			.join("\n");
	}

	/**
	 * Get export status of a node
	 * @param node TypeScript AST node
	 * @returns Export status string
	 */
	private getExportStatus(node: ts.Node): "exported" | "default" | "none" {
		// Check for export modifiers
		// Type assertion using hasModifiers type guard
		const nodeWithModifiers = node as any;
		if (nodeWithModifiers.modifiers && Array.isArray(nodeWithModifiers.modifiers)) {
			const hasExport = nodeWithModifiers.modifiers.some(
				(m: any) => m.kind === ts.SyntaxKind.ExportKeyword
			);
			const hasDefault = nodeWithModifiers.modifiers.some(
				(m: any) => m.kind === ts.SyntaxKind.DefaultKeyword
			);

			if (hasExport && hasDefault) {
				return "default";
			} else if (hasExport) {
				return "exported";
			}
		}

		return "none";
	}
}
