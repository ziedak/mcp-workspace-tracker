import { registerMcpTools } from "../../../src/adapters/mcp/tools";
import { MockLogger } from "../../mocks/MockLogger";
import { SymbolKind } from "../../../src/core/models/Symbol";

describe("MCP Tools", () => {
	const mockServer = {
		registerTool: jest.fn(),
	};

	const mockWorkspaceTracker = {
		getLogger: jest.fn(),
		getWorkspaceScanner: jest.fn(),
		getSymbolIndexer: jest.fn(),
		getPersistenceManager: jest.fn(),
	};

	const mockWorkspaceScanner = {
		findFiles: jest.fn(),
		readFile: jest.fn(),
		scanWorkspace: jest.fn(),
	};

	const mockSymbolIndexer = {
		searchSymbols: jest.fn(),
		getFileSymbols: jest.fn(),
		indexFiles: jest.fn(),
	};

	const mockLogger = new MockLogger();

	beforeEach(() => {
		jest.clearAllMocks();
		mockWorkspaceTracker.getLogger.mockReturnValue(mockLogger);
		mockWorkspaceTracker.getWorkspaceScanner.mockReturnValue(mockWorkspaceScanner);
		mockWorkspaceTracker.getSymbolIndexer.mockReturnValue(mockSymbolIndexer);

		// Mock symbol search
		mockSymbolIndexer.searchSymbols.mockResolvedValue([
			{
				name: "TestClass",
				kind: SymbolKind.CLASS,
				location: { filePath: "/workspace/test.ts", line: 10, character: 1 },
				documentation: "Test class documentation",
			},
			{
				name: "testFunction",
				kind: SymbolKind.FUNCTION,
				location: { filePath: "/workspace/test.ts", line: 20, character: 1 },
				documentation: "Test function documentation",
			},
		]);

		// Mock file symbols
		mockSymbolIndexer.getFileSymbols.mockResolvedValue([
			{
				name: "FileClass",
				kind: SymbolKind.CLASS,
				location: { filePath: "/workspace/file.ts", line: 5, character: 1 },
				documentation: "File class documentation",
			},
		]);
	});

	it("should register search-symbols tool", () => {
		// Act
		registerMcpTools(mockServer as any, mockWorkspaceTracker as any);

		// Assert
		expect(mockServer.registerTool).toHaveBeenCalledWith(
			"search-symbols",
			expect.any(Object),
			expect.any(Function)
		);
	});

	it("should register scan-workspace tool", () => {
		// Act
		registerMcpTools(mockServer as any, mockWorkspaceTracker as any);

		// Assert
		expect(mockServer.registerTool).toHaveBeenCalledWith(
			"scan-workspace",
			expect.any(Object),
			expect.any(Function)
		);
	});

	it("should search symbols with query", async () => {
		// Arrange
		registerMcpTools(mockServer as any, mockWorkspaceTracker as any);
		const toolHandler = mockServer.registerTool.mock.calls.find(
			(call) => call[0] === "search-symbols"
		)[2];

		// Act
		const result = await toolHandler({ query: "test", kind: SymbolKind.CLASS });

		// Assert
		expect(mockSymbolIndexer.searchSymbols).toHaveBeenCalledWith("test", SymbolKind.CLASS);
		const symbols = JSON.parse(result.content[0].text);
		expect(symbols).toHaveLength(2);
		expect(symbols[0].name).toBe("TestClass");
	});

	it("should scan workspace", async () => {
		// Arrange
		registerMcpTools(mockServer as any, mockWorkspaceTracker as any);
		const toolHandler = mockServer.registerTool.mock.calls.find(
			(call) => call[0] === "scan-workspace"
		)[2];

		// Mock workspaceScanner
		mockWorkspaceScanner.scanWorkspace = jest
			.fn()
			.mockResolvedValue([{ path: "/workspace/file1.ts" }, { path: "/workspace/file2.ts" }]);

		// Act
		const result = await toolHandler({ path: "/workspace" });

		// Assert
		expect(mockWorkspaceScanner.scanWorkspace).toHaveBeenCalledWith("/workspace");
		expect(mockSymbolIndexer.indexFiles).toHaveBeenCalled();
		expect(result.content[0].text).toContain("Successfully scanned workspace");
	});

	it("should handle errors in search symbols handler", async () => {
		// Arrange
		registerMcpTools(mockServer as any, mockWorkspaceTracker as any);

		// Get the handler but don't override the mock yet
		const toolHandler = mockServer.registerTool.mock.calls.find(
			(call) => call[0] === "search-symbols"
		)[2];

		// Now override the mock to throw an error
		mockSymbolIndexer.searchSymbols.mockImplementationOnce(() => {
			throw new Error("Search error");
		});

		// Act
		const result = await toolHandler({ query: "test" });

		// Assert
		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("Failed to search symbols");
		expect(
			mockLogger.logs.some(
				(log) => log.level === "error" && log.message === "Failed to search symbols" && log.error
			)
		).toBe(true);
	});

	it("should handle errors in scan workspace handler", async () => {
		// Arrange
		mockWorkspaceScanner.scanWorkspace.mockRejectedValue(new Error("Scan error"));
		registerMcpTools(mockServer as any, mockWorkspaceTracker as any);
		const toolHandler = mockServer.registerTool.mock.calls.find(
			(call) => call[0] === "scan-workspace"
		)[2];

		// Act
		const result = await toolHandler({ path: "/workspace" });

		// Assert
		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("Failed to scan workspace");
		expect(mockLogger.hasLog("error", "Failed to scan workspace")).toBeTruthy();
	});

	it("should use process.cwd() when no path is specified for scan workspace", async () => {
		// Arrange
		const mockFiles = [{ path: "/default/path/file.js" }];
		mockWorkspaceScanner.scanWorkspace.mockResolvedValue(mockFiles);
		registerMcpTools(mockServer as any, mockWorkspaceTracker as any);
		const toolHandler = mockServer.registerTool.mock.calls.find(
			(call) => call[0] === "scan-workspace"
		)[2];

		// Act
		const result = await toolHandler({}); // No path provided

		// Assert
		expect(mockWorkspaceScanner.scanWorkspace).toHaveBeenCalled();
		expect(mockWorkspaceScanner.scanWorkspace.mock.calls[0][0]).toBe(process.cwd());
		expect(result.content[0].text).toContain("Successfully scanned workspace");
	});

	it("should handle non-Error objects in search symbols handler", async () => {
		// Arrange
		registerMcpTools(mockServer as any, mockWorkspaceTracker as any);

		const toolHandler = mockServer.registerTool.mock.calls.find(
			(call) => call[0] === "search-symbols"
		)[2];

		// Override the mock to throw a non-Error object
		mockSymbolIndexer.searchSymbols.mockImplementationOnce(() => {
			throw "Search failed"; // Non-error object
		});

		// Act
		const result = await toolHandler({ query: "test" });

		// Assert
		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("Failed to search symbols");
		expect(
			mockLogger.logs.some(
				(log) => log.level === "error" && log.message === "Failed to search symbols"
			)
		).toBe(true);
	});

	it("should handle non-Error objects in scan workspace handler", async () => {
		// Arrange
		mockWorkspaceScanner.scanWorkspace.mockImplementationOnce(() => {
			throw "Scan failed"; // Non-error object
		});
		registerMcpTools(mockServer as any, mockWorkspaceTracker as any);
		const toolHandler = mockServer.registerTool.mock.calls.find(
			(call) => call[0] === "scan-workspace"
		)[2];

		// Act
		const result = await toolHandler({ path: "/workspace" });

		// Assert
		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("Failed to scan workspace");
		expect(mockLogger.hasLog("error", "Failed to scan workspace")).toBeTruthy();
	});
});
