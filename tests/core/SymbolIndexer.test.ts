// @ts-nocheck
// @ts-nocheck
import { SymbolIndexer } from "../../src/core/services/SymbolIndexer";
import { MockLogger } from "../mocks/MockLogger";
import { MockPersistenceManager } from "../mocks/MockPersistenceManager";
import { Symbol, SymbolKind } from "../../src/core/models/Symbol";
import * as fs from "fs/promises";
import * as ts from "typescript";

// Patch the module mocks
jest.mock("fs/promises", () => ({
	readFile: jest.fn(),
	writeFile: jest.fn(),
	stat: jest.fn(),
	readdir: jest.fn(),
	mkdir: jest.fn(),
}));

jest.mock("typescript", () => ({
	createSourceFile: jest.fn(),
	getLineAndCharacterOfPosition: jest.fn(),
	getLeadingCommentRanges: jest.fn(),
	canHaveModifiers: jest.fn(),
	getModifiers: jest.fn(),
	isClassDeclaration: jest.fn(),
	isInterfaceDeclaration: jest.fn(),
	isFunctionDeclaration: jest.fn(),
	isMethodDeclaration: jest.fn(),
	isPropertyDeclaration: jest.fn(),
	isVariableStatement: jest.fn(),
	isEnumDeclaration: jest.fn(),
	isTypeAliasDeclaration: jest.fn(),
	isModuleDeclaration: jest.fn(),
	isIdentifier: jest.fn(),
	ScriptTarget: { Latest: 99 },
	ScriptKind: { TS: 3 },
}));

describe("SymbolIndexer", () => {
	let symbolIndexer: SymbolIndexer;
	let mockLogger: MockLogger;
	let mockPersistenceManager: MockPersistenceManager;

	// Create simple mock objects
	const mockFs = {
		readFile: jest.fn(),
		writeFile: jest.fn(),
		stat: jest.fn(),
	};
	const mockTs = {
		createSourceFile: jest.fn(),
		getLineAndCharacterOfPosition: jest.fn(),
		getLeadingCommentRanges: jest.fn(),
		canHaveModifiers: jest.fn(),
		getModifiers: jest.fn(),
		isClassDeclaration: jest.fn(),
		isInterfaceDeclaration: jest.fn(),
		isFunctionDeclaration: jest.fn(),
		isMethodDeclaration: jest.fn(),
		isPropertyDeclaration: jest.fn(),
		isVariableStatement: jest.fn(),
		isEnumDeclaration: jest.fn(),
		isTypeAliasDeclaration: jest.fn(),
		isModuleDeclaration: jest.fn(),
		isIdentifier: jest.fn(),
	};

	beforeEach(() => {
		mockLogger = new MockLogger();
		mockPersistenceManager = new MockPersistenceManager();
		symbolIndexer = new SymbolIndexer(mockLogger, mockPersistenceManager);

		// Reset all mocks
		jest.resetAllMocks();

		// Setup basic TypeScript mocks
		mockTs.createSourceFile.mockReturnValue({
			getFullText: () => "",
			statements: [],
			forEachChild: jest.fn(),
		});

		mockTs.getLineAndCharacterOfPosition.mockReturnValue({ line: 0, character: 0 });
		mockTs.getLeadingCommentRanges.mockReturnValue([]);
		mockTs.canHaveModifiers.mockReturnValue(true);
		mockTs.getModifiers.mockReturnValue([]);
		mockTs.isClassDeclaration.mockReturnValue(false);
		mockTs.isInterfaceDeclaration.mockReturnValue(false);
		mockTs.isFunctionDeclaration.mockReturnValue(false);
		mockTs.isMethodDeclaration.mockReturnValue(false);
		mockTs.isPropertyDeclaration.mockReturnValue(false);
		mockTs.isVariableStatement.mockReturnValue(false);
		mockTs.isEnumDeclaration.mockReturnValue(false);
		mockTs.isTypeAliasDeclaration.mockReturnValue(false);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);
		mockTs.canHaveModifiers.mockReturnValue(true);
		mockTs.getModifiers.mockReturnValue([]);
		mockTs.isClassDeclaration.mockReturnValue(false);
		mockTs.isInterfaceDeclaration.mockReturnValue(false);
		mockTs.isFunctionDeclaration.mockReturnValue(false);
		mockTs.isMethodDeclaration.mockReturnValue(false);
		mockTs.isPropertyDeclaration.mockReturnValue(false);
		mockTs.isVariableStatement.mockReturnValue(false);
		mockTs.isEnumDeclaration.mockReturnValue(false);
		mockTs.isTypeAliasDeclaration.mockReturnValue(false);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);
		mockTs.getModifiers.mockReturnValue([]);
		mockTs.isClassDeclaration.mockReturnValue(false);
		mockTs.isInterfaceDeclaration.mockReturnValue(false);
		mockTs.isFunctionDeclaration.mockReturnValue(false);
		mockTs.isMethodDeclaration.mockReturnValue(false);
		mockTs.isPropertyDeclaration.mockReturnValue(false);
		mockTs.isVariableStatement.mockReturnValue(false);
		mockTs.isEnumDeclaration.mockReturnValue(false);
		mockTs.isTypeAliasDeclaration.mockReturnValue(false);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);

		// Set default returns for type predicates
		mockTs.isClassDeclaration.mockReturnValue(false);
		mockTs.isInterfaceDeclaration.mockReturnValue(false);
		mockTs.isFunctionDeclaration.mockReturnValue(false);
		mockTs.isMethodDeclaration.mockReturnValue(false);
		mockTs.isPropertyDeclaration.mockReturnValue(false);
		mockTs.isVariableStatement.mockReturnValue(false);
		mockTs.isEnumDeclaration.mockReturnValue(false);
		mockTs.isTypeAliasDeclaration.mockReturnValue(false);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);
		mockTs.isInterfaceDeclaration.mockReturnValue(false);
		mockTs.isFunctionDeclaration.mockReturnValue(false);
		mockTs.isMethodDeclaration.mockReturnValue(false);
		mockTs.isPropertyDeclaration.mockReturnValue(false);
		mockTs.isVariableStatement.mockReturnValue(false);
		mockTs.isEnumDeclaration.mockReturnValue(false);
		mockTs.isTypeAliasDeclaration.mockReturnValue(false);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);
		mockTs.isFunctionDeclaration.mockReturnValue(false);
		mockTs.isMethodDeclaration.mockReturnValue(false);
		mockTs.isPropertyDeclaration.mockReturnValue(false);
		mockTs.isVariableStatement.mockReturnValue(false);
		mockTs.isEnumDeclaration.mockReturnValue(false);
		mockTs.isTypeAliasDeclaration.mockReturnValue(false);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);
		mockTs.isMethodDeclaration.mockReturnValue(false);
		mockTs.isPropertyDeclaration.mockReturnValue(false);
		mockTs.isVariableStatement.mockReturnValue(false);
		mockTs.isEnumDeclaration.mockReturnValue(false);
		mockTs.isTypeAliasDeclaration.mockReturnValue(false);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);
		mockTs.isPropertyDeclaration.mockReturnValue(false);
		mockTs.isVariableStatement.mockReturnValue(false);
		mockTs.isEnumDeclaration.mockReturnValue(false);
		mockTs.isTypeAliasDeclaration.mockReturnValue(false);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);
		mockTs.isVariableStatement.mockReturnValue(false);
		mockTs.isEnumDeclaration.mockReturnValue(false);
		mockTs.isTypeAliasDeclaration.mockReturnValue(false);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);
		mockTs.isEnumDeclaration.mockReturnValue(false);
		mockTs.isTypeAliasDeclaration.mockReturnValue(false);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);
		mockTs.isTypeAliasDeclaration.mockReturnValue(false);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);
		mockTs.isModuleDeclaration.mockReturnValue(false);
		mockTs.isIdentifier.mockReturnValue(true);
		mockTs.isIdentifier.mockReturnValue(true);
	});

	// Simplified test suite
	it("should work with basic functionality", async () => {
		// Test setup
		const fileSymbols: Symbol[] = [
			{
				name: "TestClass",
				kind: SymbolKind.CLASS,
				location: { filePath: "/test.ts", line: 1, character: 1 },
				exportStatus: "exported",
				documentation: "",
			},
		];

		// @ts-ignore - Set private property for testing
		symbolIndexer["symbols"].set("/test.ts", fileSymbols);

		// Test functionality
		const results = await symbolIndexer.getFileSymbols("/test.ts");
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("TestClass");
	});

	// Test basic file indexing
	it("should index files correctly", async () => {
		// Mock file content
		const filePath = "/test/file.ts";
		const fileContent = "class TestClass {}";
		mockFs.readFile.mockResolvedValue(fileContent);

		// Mock typescript parsing behavior
		mockTs.isClassDeclaration.mockImplementation((node: any) => node.kind === "ClassDeclaration");
		mockTs.createSourceFile.mockReturnValue({
			getFullText: () => fileContent,
			statements: [
				{
					kind: "ClassDeclaration",
					name: { text: "TestClass", getStart: () => 6 },
					getSourceFile: () => ({ getFullText: () => fileContent }),
					getStart: () => 0,
					forEachChild: jest.fn(),
				},
			],
			forEachChild: (callback: any) => {
				mockTs.createSourceFile().statements.forEach(callback);
			},
		});

		// Index the file
		await symbolIndexer.indexFiles([filePath]);

		// Verify the file was processed
		expect(mockFs.readFile).toHaveBeenCalledWith(filePath, "utf8");

		// Check the results
		const symbols = await symbolIndexer.getFileSymbols(filePath);
		expect(symbols).toHaveLength(1);
		expect(symbols[0].name).toBe("TestClass");
		expect(symbols[0].kind).toBe(SymbolKind.CLASS);
	});

	// Test searching for symbols
	it("should search for symbols correctly", async () => {
		// Setup test data
		const filePathA = "/test/a.ts";
		const filePathB = "/test/b.ts";

		const symbolsA = [
			{
				name: "UserService",
				kind: SymbolKind.CLASS,
				location: { filePath: filePathA, line: 1, character: 1 },
				exportStatus: "exported",
				documentation: "Handles user operations",
				children: [],
			},
		];

		const symbolsB = [
			{
				name: "ProductService",
				kind: SymbolKind.CLASS,
				location: { filePath: filePathB, line: 1, character: 1 },
				exportStatus: "exported",
				documentation: "Handles product operations",
				children: [],
			},
		];

		// @ts-ignore - Set private property for testing
		symbolIndexer["symbols"].set(filePathA, symbolsA);
		symbolIndexer["symbols"].set(filePathB, symbolsB);

		// Test searching
		const userResults = await symbolIndexer.searchSymbols("user");
		expect(userResults).toHaveLength(1);
		expect(userResults[0].name).toBe("UserService");

		const serviceResults = await symbolIndexer.searchSymbols("service");
		expect(serviceResults).toHaveLength(2);

		// Test searching with kind filter
		const classResults = await symbolIndexer.searchSymbols("service", SymbolKind.CLASS);
		expect(classResults).toHaveLength(2);

		const interfaceResults = await symbolIndexer.searchSymbols("service", SymbolKind.INTERFACE);
		expect(interfaceResults).toHaveLength(0);
	});
});
