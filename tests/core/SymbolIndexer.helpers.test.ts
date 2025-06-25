import { SymbolIndexer } from "../../src/core/services/SymbolIndexer";
import { Symbol, SymbolKind } from "../../src/core/models/Symbol";
import * as ts from "typescript";
import * as path from "path";

// Mock dependencies
const mockLogger = {
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn(),
};

const mockPersistenceManager = {
	saveData: jest.fn(),
	loadData: jest.fn(),
	exists: jest.fn(),
	isCachedAndUnchanged: jest.fn(),
	updateFileHash: jest.fn(),
};

// Create a test class that extends SymbolIndexer to access protected methods
class TestableSymbolIndexer extends SymbolIndexer {
	// Expose protected methods for testing
	public testFilterRelevantFiles(files: string[]): string[] {
		return this.filterRelevantFiles(files);
	}

	public testIsRelevantFileType(file: string): boolean {
		return this.isRelevantFileType(file);
	}

	public testCalculateFileHash(content: string): string {
		return this.calculateFileHash(content);
	}

	public testCreateSourceFile(filePath: string, content: string): ts.SourceFile {
		return this.createSourceFile(filePath, content);
	}

	public testGetSymbolLocation(nameNode: ts.Node, filePath: string): { filePath: string; line: number; character: number } {
		return this.getSymbolLocation(nameNode, filePath);
	}

	public testGetDocumentation(node: ts.Node): string {
		return this.getDocumentation(node);
	}

	public testGetExportStatus(node: ts.Node): "exported" | "default" | "none" {
		return this.getExportStatus(node);
	}

	public testCreateSymbolFromNode(node: ts.Node, filePath: string, parentSymbol?: Symbol): Symbol | undefined {
		return this.createSymbolFromNode(node, filePath, parentSymbol);
	}

	public testAddSymbolToCollection(symbol: Symbol, symbols: Symbol[], parentSymbol?: Symbol): void {
		return this.addSymbolToCollection(symbol, symbols, parentSymbol);
	}

	public testCreateClassSymbol(node: ts.ClassDeclaration, filePath: string, parentSymbol?: Symbol): Symbol {
		return this.createClassSymbol(node, filePath, parentSymbol);
	}

	public testCreateInterfaceSymbol(node: ts.InterfaceDeclaration, filePath: string, parentSymbol?: Symbol): Symbol {
		return this.createInterfaceSymbol(node, filePath, parentSymbol);
	}

	public testCreateFunctionSymbol(node: ts.FunctionDeclaration, filePath: string, parentSymbol?: Symbol): Symbol {
		return this.createFunctionSymbol(node, filePath, parentSymbol);
	}

	public testCreateMethodSymbol(node: ts.MethodDeclaration, filePath: string, parentSymbol?: Symbol): Symbol {
		return this.createMethodSymbol(node, filePath, parentSymbol);
	}

	public testCreatePropertySymbol(node: ts.PropertyDeclaration, filePath: string, parentSymbol?: Symbol): Symbol {
		return this.createPropertySymbol(node, filePath, parentSymbol);
	}

	public testCreateEnumSymbol(node: ts.EnumDeclaration, filePath: string, parentSymbol?: Symbol): Symbol {
		return this.createEnumSymbol(node, filePath, parentSymbol);
	}

	public testCreateTypeAliasSymbol(node: ts.TypeAliasDeclaration, filePath: string, parentSymbol?: Symbol): Symbol {
		return this.createTypeAliasSymbol(node, filePath, parentSymbol);
	}

	public testCreateModuleSymbol(node: ts.ModuleDeclaration, filePath: string, parentSymbol?: Symbol): Symbol {
		return this.createModuleSymbol(node, filePath, parentSymbol);
	}

	public testProcessVariableStatement(node: ts.VariableStatement, filePath: string, parentSymbol: Symbol | undefined, symbols: Symbol[]): void {
		return this.processVariableStatement(node, filePath, parentSymbol, symbols);
	}

	public testFindMatchingSymbols(symbols: Symbol[], queryLower: string, kind?: SymbolKind): Symbol[] {
		return this.findMatchingSymbols(symbols, queryLower, kind);
	}
}

describe("SymbolIndexer - Helper Methods", () => {
	let symbolIndexer: TestableSymbolIndexer;

	beforeEach(() => {
		jest.clearAllMocks();
		symbolIndexer = new TestableSymbolIndexer(mockLogger as any, mockPersistenceManager as any);
	});

	describe("File Filtering", () => {
		it("should filter relevant files correctly", () => {
			const files = [
				"/path/to/file.ts",
				"/path/to/file.tsx",
				"/path/to/file.js",
				"/path/to/file.jsx",
				"/path/to/file.txt",
				"/path/to/file.md",
				"/path/to/file.json",
			];

			const result = symbolIndexer.testFilterRelevantFiles(files);

			expect(result).toEqual([
				"/path/to/file.ts",
				"/path/to/file.tsx",
				"/path/to/file.js",
				"/path/to/file.jsx",
			]);
		});

		it("should handle empty file array", () => {
			const result = symbolIndexer.testFilterRelevantFiles([]);
			expect(result).toEqual([]);
		});

		it("should handle files with no extensions", () => {
			const files = ["/path/to/file", "/path/to/README"];
			const result = symbolIndexer.testFilterRelevantFiles(files);
			expect(result).toEqual([]);
		});
	});

	describe("File Type Checking", () => {
		it("should identify TypeScript files", () => {
			expect(symbolIndexer.testIsRelevantFileType("/path/to/file.ts")).toBe(true);
			expect(symbolIndexer.testIsRelevantFileType("/path/to/file.tsx")).toBe(true);
		});

		it("should identify JavaScript files", () => {
			expect(symbolIndexer.testIsRelevantFileType("/path/to/file.js")).toBe(true);
			expect(symbolIndexer.testIsRelevantFileType("/path/to/file.jsx")).toBe(true);
		});

		it("should reject non-relevant file types", () => {
			expect(symbolIndexer.testIsRelevantFileType("/path/to/file.txt")).toBe(false);
			expect(symbolIndexer.testIsRelevantFileType("/path/to/file.md")).toBe(false);
			expect(symbolIndexer.testIsRelevantFileType("/path/to/file.json")).toBe(false);
			expect(symbolIndexer.testIsRelevantFileType("/path/to/file.css")).toBe(false);
		});

		it("should handle case insensitive extensions", () => {
			expect(symbolIndexer.testIsRelevantFileType("/path/to/file.TS")).toBe(true);
			expect(symbolIndexer.testIsRelevantFileType("/path/to/file.JS")).toBe(true);
		});
	});

	describe("Hash Calculation", () => {
		it("should calculate consistent hashes for same content", () => {
			const content = "export class TestClass {}";
			const hash1 = symbolIndexer.testCalculateFileHash(content);
			const hash2 = symbolIndexer.testCalculateFileHash(content);
			
			expect(hash1).toBe(hash2);
			expect(typeof hash1).toBe("string");
		});

		it("should produce different hashes for different content", () => {
			const content1 = "export class TestClass1 {}";
			const content2 = "export class TestClass2 {}";
			
			const hash1 = symbolIndexer.testCalculateFileHash(content1);
			const hash2 = symbolIndexer.testCalculateFileHash(content2);
			
			expect(hash1).not.toBe(hash2);
		});

		it("should handle empty content", () => {
			const hash = symbolIndexer.testCalculateFileHash("");
			expect(typeof hash).toBe("string");
		});
	});

	describe("Source File Creation", () => {
		it("should create TypeScript source file", () => {
			const filePath = "/test/file.ts";
			const content = "export class TestClass {}";
			
			const sourceFile = symbolIndexer.testCreateSourceFile(filePath, content);
			
			expect(sourceFile).toBeDefined();
			expect(sourceFile.fileName).toBe(filePath);
			expect(sourceFile.text).toBe(content);
		});

		it("should handle invalid TypeScript code gracefully", () => {
			const filePath = "/test/file.ts";
			const content = "invalid typescript code {{{";
			
			// Should not throw but create a source file with syntax errors
			const sourceFile = symbolIndexer.testCreateSourceFile(filePath, content);
			
			expect(sourceFile).toBeDefined();
			expect(sourceFile.fileName).toBe(filePath);
		});
	});

	describe("Symbol Location Extraction", () => {
		const setupSourceFileWithClass = () => {
			const content = `
export class TestClass {
	method() {}
}`;
			const sourceFile = ts.createSourceFile("/test.ts", content, ts.ScriptTarget.Latest, true);
			
			// Find the class declaration
			let classNode: ts.ClassDeclaration | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isClassDeclaration(node)) {
					classNode = node;
				}
			});
			
			return { sourceFile, classNode };
		};

		it("should extract correct location information", () => {
			const { classNode } = setupSourceFileWithClass();
			
			if (classNode && classNode.name) {
				const location = symbolIndexer.testGetSymbolLocation(classNode.name, "/test.ts");
				
				expect(location.filePath).toBe("/test.ts");
				expect(typeof location.line).toBe("number");
				expect(typeof location.character).toBe("number");
				expect(location.line).toBeGreaterThan(0); // 1-indexed
				expect(location.character).toBeGreaterThan(0); // 1-indexed
			} else {
				fail("Class node not found");
			}
		});
	});

	describe("Documentation Extraction", () => {
		const createNodeWithDocumentation = (code: string) => {
			const sourceFile = ts.createSourceFile("/test.ts", code, ts.ScriptTarget.Latest, true);
			let targetNode: ts.Node | undefined;
			
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node)) {
					targetNode = node;
				}
			});
			
			return targetNode;
		};

		it("should extract JSDoc comments", () => {
			const code = `
/**
 * This is a test class
 * @param name The name parameter
 */
export class TestClass {}`;
			
			const node = createNodeWithDocumentation(code);
			if (node) {
				const docs = symbolIndexer.testGetDocumentation(node);
				expect(docs).toContain("This is a test class");
			} else {
				fail("Node not found");
			}
		});

		it("should return empty string for nodes without documentation", () => {
			const code = "export class TestClass {}";
			
			const node = createNodeWithDocumentation(code);
			if (node) {
				const docs = symbolIndexer.testGetDocumentation(node);
				expect(docs).toBe("");
			} else {
				fail("Node not found");
			}
		});
	});

	describe("Export Status Detection", () => {
		const createNodeWithExportStatus = (code: string) => {
			const sourceFile = ts.createSourceFile("/test.ts", code, ts.ScriptTarget.Latest, true);
			let targetNode: ts.Node | undefined;
			
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node)) {
					targetNode = node;
				}
			});
			
			return targetNode;
		};

		it("should detect exported declarations", () => {
			const code = "export class TestClass {}";
			const node = createNodeWithExportStatus(code);
			
			if (node) {
				const status = symbolIndexer.testGetExportStatus(node);
				expect(status).toBe("exported");
			} else {
				fail("Node not found");
			}
		});

		it("should detect default exports", () => {
			const code = "export default class TestClass {}";
			const node = createNodeWithExportStatus(code);
			
			if (node) {
				const status = symbolIndexer.testGetExportStatus(node);
				expect(status).toBe("default");
			} else {
				fail("Node not found");
			}
		});

		it("should detect non-exported declarations", () => {
			const code = "class TestClass {}";
			const node = createNodeWithExportStatus(code);
			
			if (node) {
				const status = symbolIndexer.testGetExportStatus(node);
				expect(status).toBe("none");
			} else {
				fail("Node not found");
			}
		});
	});

	describe("Symbol Creation from Nodes", () => {
		const createTestSourceFile = (code: string) => {
			return ts.createSourceFile("/test.ts", code, ts.ScriptTarget.Latest, true);
		};

		it("should create symbol from class declaration", () => {
			const code = "export class TestClass {}";
			const sourceFile = createTestSourceFile(code);
			
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isClassDeclaration(node)) {
					const symbol = symbolIndexer.testCreateSymbolFromNode(node, "/test.ts");
					
					expect(symbol).toBeDefined();
					expect(symbol!.kind).toBe(SymbolKind.CLASS);
					expect(symbol!.name).toBe("TestClass");
					expect(symbol!.exportStatus).toBe("exported");
				}
			});
		});

		it("should create symbol from interface declaration", () => {
			const code = "export interface TestInterface {}";
			const sourceFile = createTestSourceFile(code);
			
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node)) {
					const symbol = symbolIndexer.testCreateSymbolFromNode(node, "/test.ts");
					
					expect(symbol).toBeDefined();
					expect(symbol!.kind).toBe(SymbolKind.INTERFACE);
					expect(symbol!.name).toBe("TestInterface");
				}
			});
		});

		it("should create symbol from function declaration", () => {
			const code = "export function testFunction() {}";
			const sourceFile = createTestSourceFile(code);
			
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isFunctionDeclaration(node)) {
					const symbol = symbolIndexer.testCreateSymbolFromNode(node, "/test.ts");
					
					expect(symbol).toBeDefined();
					expect(symbol!.kind).toBe(SymbolKind.FUNCTION);
					expect(symbol!.name).toBe("testFunction");
				}
			});
		});

		it("should return undefined for unsupported node types", () => {
			const code = "import { something } from 'somewhere';";
			const sourceFile = createTestSourceFile(code);
			
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isImportDeclaration(node)) {
					const symbol = symbolIndexer.testCreateSymbolFromNode(node, "/test.ts");
					expect(symbol).toBeUndefined();
				}
			});
		});
	});

	describe("Symbol Collection Management", () => {
		it("should add method symbols to parent children", () => {
			const parentSymbol: Symbol = {
				name: "TestClass",
				kind: SymbolKind.CLASS,
				location: { filePath: "/test.ts", line: 1, character: 1 },
				documentation: "",
				exportStatus: "exported",
				children: [],
			};

			const methodSymbol: Symbol = {
				name: "testMethod",
				kind: SymbolKind.METHOD,
				location: { filePath: "/test.ts", line: 2, character: 1 },
				documentation: "",
				exportStatus: "none",
				parentName: "TestClass",
			};

			const symbols: Symbol[] = [];

			symbolIndexer.testAddSymbolToCollection(methodSymbol, symbols, parentSymbol);

			expect(parentSymbol.children).toContain(methodSymbol);
			expect(symbols).not.toContain(methodSymbol);
		});

		it("should add property symbols to parent children", () => {
			const parentSymbol: Symbol = {
				name: "TestClass",
				kind: SymbolKind.CLASS,
				location: { filePath: "/test.ts", line: 1, character: 1 },
				documentation: "",
				exportStatus: "exported",
				children: [],
			};

			const propertySymbol: Symbol = {
				name: "testProperty",
				kind: SymbolKind.PROPERTY,
				location: { filePath: "/test.ts", line: 2, character: 1 },
				documentation: "",
				exportStatus: "none",
				parentName: "TestClass",
			};

			const symbols: Symbol[] = [];

			symbolIndexer.testAddSymbolToCollection(propertySymbol, symbols, parentSymbol);

			expect(parentSymbol.children).toContain(propertySymbol);
			expect(symbols).not.toContain(propertySymbol);
		});

		it("should add non-method/property symbols to main symbols array", () => {
			const classSymbol: Symbol = {
				name: "TestClass",
				kind: SymbolKind.CLASS,
				location: { filePath: "/test.ts", line: 1, character: 1 },
				documentation: "",
				exportStatus: "exported",
				children: [],
			};

			const symbols: Symbol[] = [];

			symbolIndexer.testAddSymbolToCollection(classSymbol, symbols);

			expect(symbols).toContain(classSymbol);
		});

		it("should add methods/properties to symbols array when no parent", () => {
			const methodSymbol: Symbol = {
				name: "testMethod",
				kind: SymbolKind.METHOD,
				location: { filePath: "/test.ts", line: 2, character: 1 },
				documentation: "",
				exportStatus: "none",
			};

			const symbols: Symbol[] = [];

			symbolIndexer.testAddSymbolToCollection(methodSymbol, symbols);

			expect(symbols).toContain(methodSymbol);
		});
	});

	describe("Variable Statement Processing", () => {
		it("should process variable statement with single declaration", () => {
			const code = "export const testVar = 'value';";
			const sourceFile = ts.createSourceFile("/test.ts", code, ts.ScriptTarget.Latest, true);
			const symbols: Symbol[] = [];

			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					symbolIndexer.testProcessVariableStatement(node, "/test.ts", undefined, symbols);
				}
			});

			expect(symbols).toHaveLength(1);
			expect(symbols[0].name).toBe("testVar");
			expect(symbols[0].kind).toBe(SymbolKind.VARIABLE);
		});

		it("should process variable statement with multiple declarations", () => {
			const code = "const var1 = 'value1', var2 = 'value2';";
			const sourceFile = ts.createSourceFile("/test.ts", code, ts.ScriptTarget.Latest, true);
			const symbols: Symbol[] = [];

			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					symbolIndexer.testProcessVariableStatement(node, "/test.ts", undefined, symbols);
				}
			});

			expect(symbols).toHaveLength(2);
			expect(symbols[0].name).toBe("var1");
			expect(symbols[1].name).toBe("var2");
		});
	});

	describe("Symbol Search", () => {
		const createTestSymbols = (): Symbol[] => [
			{
				name: "TestClass",
				kind: SymbolKind.CLASS,
				location: { filePath: "/test.ts", line: 1, character: 1 },
				documentation: "A test class for demonstration",
				exportStatus: "exported",
				children: [
					{
						name: "testMethod",
						kind: SymbolKind.METHOD,
						location: { filePath: "/test.ts", line: 2, character: 1 },
						documentation: "",
						exportStatus: "none",
						parentName: "TestClass",
					}
				],
			},
			{
				name: "TestInterface",
				kind: SymbolKind.INTERFACE,
				location: { filePath: "/test.ts", line: 5, character: 1 },
				documentation: "",
				exportStatus: "exported",
			},
			{
				name: "helperFunction",
				kind: SymbolKind.FUNCTION,
				location: { filePath: "/test.ts", line: 8, character: 1 },
				documentation: "Helper function for testing",
				exportStatus: "none",
			},
		];

		it("should find symbols by name match", () => {
			const symbols = createTestSymbols();
			const results = symbolIndexer.testFindMatchingSymbols(symbols, "testclass", undefined);

			expect(results).toHaveLength(1); // Only TestClass should match
			expect(results.find(s => s.name === "TestClass")).toBeDefined();
		});

		it("should find symbols by documentation match", () => {
			const symbols = createTestSymbols();
			const results = symbolIndexer.testFindMatchingSymbols(symbols, "demonstration", undefined);

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe("TestClass");
		});

		it("should filter by symbol kind", () => {
			const symbols = createTestSymbols();
			const results = symbolIndexer.testFindMatchingSymbols(symbols, "test", SymbolKind.CLASS);

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe("TestClass");
			expect(results[0].kind).toBe(SymbolKind.CLASS);
		});

		it("should find symbols in children recursively", () => {
			const symbols = createTestSymbols();
			const results = symbolIndexer.testFindMatchingSymbols(symbols, "testmethod", undefined);

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe("TestClass"); // Parent is returned when child matches
		});

		it("should return empty array when no matches found", () => {
			const symbols = createTestSymbols();
			const results = symbolIndexer.testFindMatchingSymbols(symbols, "nonexistent", undefined);

			expect(results).toHaveLength(0);
		});
	});
});
