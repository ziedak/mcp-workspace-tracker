import { McpWorkspaceTracker } from "../../src/core/services/McpWorkspaceTracker";
import { MockLogger } from "../mocks/MockLogger";
import { MockWorkspaceScanner } from "../mocks/MockWorkspaceScanner";
import { MockSymbolIndexer } from "../mocks/MockSymbolIndexer";
import { MockPersistenceManager } from "../mocks/MockPersistenceManager";
import { WorkspaceFile, WorkspaceFileType } from "../../src/core/models/WorkspaceFile";

describe("McpWorkspaceTracker", () => {
	let mcpWorkspaceTracker: McpWorkspaceTracker;
	let mockLogger: MockLogger;
	let mockWorkspaceScanner: MockWorkspaceScanner;
	let mockSymbolIndexer: MockSymbolIndexer;
	let mockPersistenceManager: MockPersistenceManager;

	beforeEach(() => {
		// Create mock dependencies
		mockLogger = new MockLogger();
		mockWorkspaceScanner = new MockWorkspaceScanner();
		mockSymbolIndexer = new MockSymbolIndexer();
		mockPersistenceManager = new MockPersistenceManager();

		// Create test instance
		mcpWorkspaceTracker = new McpWorkspaceTracker(
			mockLogger,
			mockWorkspaceScanner,
			mockSymbolIndexer,
			mockPersistenceManager,
			{ name: "Test MCP Server", version: "1.0.0" }
		);
	});

	describe("initialize", () => {
		it("should initialize all services", async () => {
			// Setup mock files
			const mockFiles = [
				new WorkspaceFile(
					"/test/workspace/file1.ts",
					"file1.ts",
					WorkspaceFileType.SOURCE,
					100,
					new Date()
				),
				new WorkspaceFile(
					"/test/workspace/file2.ts",
					"file2.ts",
					WorkspaceFileType.SOURCE,
					200,
					new Date()
				),
			];

			mockWorkspaceScanner.setMockFiles(mockFiles);
			// Add proper spies
			jest.spyOn(mockWorkspaceScanner, "scanWorkspace").mockResolvedValue(mockFiles);
			jest.spyOn(mockSymbolIndexer, "indexFiles").mockResolvedValue();
			jest.spyOn(mockPersistenceManager, "initialize").mockResolvedValue();

			// Initialize
			const workspacePath = "/test/workspace";
			await mcpWorkspaceTracker.initialize(workspacePath);

			// Verify persistence manager was initialized
			expect(mockPersistenceManager.initialize).toHaveBeenCalledWith(workspacePath);

			// Verify workspace was scanned
			expect(mockWorkspaceScanner.scanWorkspace).toHaveBeenCalledWith(workspacePath);

			// Verify symbols were indexed
			expect(mockSymbolIndexer.indexFiles).toHaveBeenCalledWith(
				expect.arrayContaining(["/test/workspace/file1.ts", "/test/workspace/file2.ts"])
			);

			// Verify logging
			expect(mockLogger.hasLog("info", "Workspace tracker initialization complete")).toBeTruthy();
		});

		it("should handle initialization errors", async () => {
			// Setup mock to throw an error
			jest.spyOn(mockWorkspaceScanner, "scanWorkspace").mockImplementation(() => {
				throw new Error("Scan failed");
			});

			// Initialize
			const workspacePath = "/test/workspace";
			await expect(mcpWorkspaceTracker.initialize(workspacePath)).rejects.toThrow("Scan failed");

			// Verify error was logged
			expect(mockLogger.hasLog("error", "Failed to initialize workspace tracker")).toBe(true);
			expect(
				mockLogger.logs.find(
					(log) => log.level === "error" && log.message === "Failed to initialize workspace tracker"
				)?.error?.message
			).toBe("Scan failed");
		});

		it("should handle initialization errors with non-Error objects", async () => {
			// Setup mock to throw a non-Error object
			jest.spyOn(mockWorkspaceScanner, "scanWorkspace").mockImplementation(() => {
				throw "String error message"; // Non-error object
			});

			// Initialize
			const workspacePath = "/test/workspace";
			try {
				await mcpWorkspaceTracker.initialize(workspacePath);
				fail("Should have thrown an error");
			} catch (error) {
				// Verify error was caught and thrown
				expect(error).toBe("String error message");
			}

			// Verify error was logged
			expect(mockLogger.hasLog("error", "Failed to initialize workspace tracker")).toBe(true);
			// Verify the error was properly wrapped as an Error object
			expect(
				mockLogger.logs.find(
					(log) => log.level === "error" && log.message === "Failed to initialize workspace tracker"
				)?.error instanceof Error
			).toBe(true);
		});
	});

	describe("service access", () => {
		it("should provide access to workspace scanner", () => {
			expect(mcpWorkspaceTracker.getWorkspaceScanner()).toBe(mockWorkspaceScanner);
		});

		it("should provide access to symbol indexer", () => {
			expect(mcpWorkspaceTracker.getSymbolIndexer()).toBe(mockSymbolIndexer);
		});

		it("should provide access to persistence manager", () => {
			expect(mcpWorkspaceTracker.getPersistenceManager()).toBe(mockPersistenceManager);
		});

		it("should provide access to logger", () => {
			expect(mcpWorkspaceTracker.getLogger()).toBe(mockLogger);
		});

		it("should provide access to config", () => {
			expect(mcpWorkspaceTracker.getConfig()).toEqual({
				name: "Test MCP Server",
				version: "1.0.0",
			});
		});
	});
});
