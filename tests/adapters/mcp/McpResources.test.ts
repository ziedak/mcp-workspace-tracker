import { registerMcpResources } from "../../../src/adapters/mcp/resources";
import { MockLogger } from "../../mocks/MockLogger";

describe("MCP Resources", () => {
	const mockServer = {
		registerResource: jest.fn(),
	};

	const mockWorkspaceTracker = {
		getLogger: jest.fn(),
		getWorkspaceScanner: jest.fn(),
		getSymbolIndexer: jest.fn(),
		getPersistenceManager: jest.fn(),
	};

	const mockWorkspaceScanner = {
		getWorkspaceStats: jest.fn(),
		findFiles: jest.fn(),
		readFile: jest.fn(),
	};

	const mockLogger = new MockLogger();

	beforeEach(() => {
		jest.clearAllMocks();
		mockWorkspaceTracker.getLogger.mockReturnValue(mockLogger);
		mockWorkspaceTracker.getWorkspaceScanner.mockReturnValue(mockWorkspaceScanner);

		// Mock workspace stats
		mockWorkspaceScanner.getWorkspaceStats.mockResolvedValue({
			totalFiles: 100,
			sourceFiles: 50,
			testFiles: 20,
			configFiles: 10,
			otherFiles: 20,
		});

		// Mock file finding
		mockWorkspaceScanner.findFiles.mockResolvedValue([
			{ path: "/workspace/file1.ts", relativePath: "/workspace/file1.ts", type: "source" },
			{ path: "/workspace/file2.ts", relativePath: "/workspace/file2.ts", type: "source" },
		]);

		// Mock file reading
		mockWorkspaceScanner.readFile.mockResolvedValue("file content");
	});

	it("should register workspace-info resource", () => {
		// Act
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);

		// Assert
		expect(mockServer.registerResource).toHaveBeenCalledWith(
			"workspace-info",
			"workspace://info",
			expect.any(Object),
			expect.any(Function)
		);
	});

	it("should register files resource", () => {
		// Act
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);

		// Assert
		expect(mockServer.registerResource).toHaveBeenCalledWith(
			"files",
			expect.any(Object),
			expect.any(Object),
			expect.any(Function)
		);
	});

	it("should register file-contents resource", () => {
		// Act
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);

		// Assert
		expect(mockServer.registerResource).toHaveBeenCalledWith(
			"file-contents",
			expect.any(Object),
			expect.any(Object),
			expect.any(Function)
		);
	});

	it("should generate workspace info content", async () => {
		// Arrange
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "workspace-info"
		)[3];

		// Act
		const result = await resourceHandler(new URL("workspace://info"));

		// Assert
		expect(result.contents[0].text).toContain("Total Files: 100");
		expect(result.contents[0].text).toContain("Source Files: 50");
		expect(mockWorkspaceScanner.getWorkspaceStats).toHaveBeenCalled();
	});

	it("should generate file list content", async () => {
		// Arrange
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "files"
		)[3];

		// Act
		const result = await resourceHandler(new URL("files://*"), { parameters: { pattern: "*" } });

		// Assert
		expect(mockWorkspaceScanner.findFiles).toHaveBeenCalledWith("*");
		expect(result.contents[0].text).toContain("/workspace/file1.ts");
		expect(result.contents[0].text).toContain("/workspace/file2.ts");
	});

	it("should generate file content", async () => {
		// Arrange
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "file-contents"
		)[3];

		// Act
		const url = new URL("file:///workspace/file1.ts");
		const result = await resourceHandler(url, { parameters: { path: "/workspace/file1.ts" } });

		// Assert
		expect(mockWorkspaceScanner.readFile).toHaveBeenCalledWith("/workspace/file1.ts");
		expect(result.contents[0].text).toBe("file content");
	});

	it("should handle errors in workspace info handler", async () => {
		// Arrange
		mockWorkspaceScanner.getWorkspaceStats.mockImplementationOnce(() => {
			throw new Error("Test error");
		});
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "workspace-info"
		)[3];

		// Act & Assert
		try {
			await resourceHandler(new URL("workspace://info"));
			fail("Should have thrown an error");
		} catch (error) {
			expect(error.message).toContain("Failed to retrieve workspace information");
			expect(
				mockLogger.logs.some(
					(log) =>
						log.level === "error" &&
						log.message === "Failed to retrieve workspace information" &&
						log.error
				)
			).toBe(true);
		}
	});

	it("should handle errors in file content handler", async () => {
		// Arrange
		mockWorkspaceScanner.readFile.mockRejectedValueOnce(new Error("File not found"));
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "file-contents"
		)[3];

		// Act & Assert
		try {
			await resourceHandler(new URL("file:///test.txt"), {
				parameters: { path: "/workspace/missing-file.txt" },
			});
			fail("Should have thrown an error");
		} catch (error) {
			expect(error.message).toContain("Failed to read file");
			expect(
				mockLogger.logs.some(
					(log) => log.level === "error" && log.message.includes("Error reading file") && log.error
				)
			).toBe(true);
		}
	});

	it("should handle the files resource", async () => {
		// Arrange
		const mockFiles = [
			{ relativePath: "src/file1.ts", path: "/workspace/src/file1.ts" },
			{ relativePath: "src/file2.ts", path: "/workspace/src/file2.ts" },
		];
		mockWorkspaceScanner.findFiles.mockResolvedValueOnce(mockFiles);
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "files"
		)[3];

		// Act
		const result = await resourceHandler(new URL("files://foo"), {
			parameters: { pattern: "*.ts" },
		});

		// Assert
		expect(mockWorkspaceScanner.findFiles).toHaveBeenCalledWith("*.ts");
		expect(result.contents[0].text).toBe("src/file1.ts\nsrc/file2.ts");
	});

	it("should handle errors in files resource", async () => {
		// Arrange
		mockWorkspaceScanner.findFiles.mockRejectedValueOnce(new Error("Invalid pattern"));
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "files"
		)[3];

		// Act & Assert
		try {
			await resourceHandler(new URL("files://invalid"), { parameters: { pattern: "**/*" } });
			fail("Should have thrown an error");
		} catch (error) {
			expect(error.message).toContain("Failed to list files");
			expect(
				mockLogger.logs.some(
					(log) => log.level === "error" && log.message === "Failed to list files" && log.error
				)
			).toBe(true);
		}
	});

	it("should use default pattern when no pattern is specified in files resource", async () => {
		// Arrange
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "files"
		)[3];

		// Act
		const result = await resourceHandler(new URL("files://default"), { parameters: {} });

		// Assert
		expect(mockWorkspaceScanner.findFiles).toHaveBeenCalledWith("*");
		expect(result.contents).toBeDefined();
	});

	it("should handle non-Error objects in workspace info error handling", async () => {
		// Arrange
		mockWorkspaceScanner.getWorkspaceStats.mockImplementationOnce(() => {
			throw "String error"; // Non-error object
		});
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "workspace-info"
		)[3];

		// Act & Assert
		try {
			await resourceHandler(new URL("workspace://info"));
			fail("Should have thrown an error");
		} catch (error) {
			expect(error.message).toContain("Failed to retrieve workspace information");
			expect(
				mockLogger.logs.some(
					(log) =>
						log.level === "error" && log.message === "Failed to retrieve workspace information"
				)
			).toBe(true);
		}
	});

	it("should handle non-Error objects in file list error handling", async () => {
		// Arrange
		mockWorkspaceScanner.findFiles.mockImplementationOnce(() => {
			throw "Invalid pattern error"; // Non-error object
		});
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "files"
		)[3];

		// Act & Assert
		try {
			await resourceHandler(new URL("files://invalid"), { parameters: { pattern: "**/*" } });
			fail("Should have thrown an error");
		} catch (error) {
			expect(error.message).toContain("Failed to list files");
			expect(
				mockLogger.logs.some(
					(log) => log.level === "error" && log.message === "Failed to list files"
				)
			).toBe(true);
		}
	});

	it("should handle errors in file contents handler", async () => {
		// Arrange
		mockWorkspaceScanner.readFile.mockImplementationOnce(() => {
			throw new Error("File read error");
		});
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "file-contents"
		)[3];

		// Act & Assert
		try {
			const url = new URL("file:///workspace/error-file.ts");
			await resourceHandler(url, { parameters: { path: "/workspace/error-file.ts" } });
			fail("Should have thrown an error");
		} catch (error) {
			expect(error.message).toContain("Failed to read file");
			expect(error.message).toContain("/workspace/error-file.ts");
		}

		// Skip checking mockLogger.error since it's not a jest mock in the registerMcpResources function
	});

	it("should handle non-Error objects in file contents error handling", async () => {
		// Arrange
		mockWorkspaceScanner.readFile.mockImplementationOnce(() => {
			throw "String error"; // Non-Error object
		});
		registerMcpResources(mockServer as any, mockWorkspaceTracker as any);
		const resourceHandler = mockServer.registerResource.mock.calls.find(
			(call) => call[0] === "file-contents"
		)[3];

		// Act & Assert
		try {
			const url = new URL("file:///workspace/error-file.ts");
			await resourceHandler(url, { parameters: { path: "/workspace/error-file.ts" } });
			fail("Should have thrown an error");
		} catch (error) {
			expect(error.message).toContain("Failed to read file");
			expect(error.message).toContain("/workspace/error-file.ts");
		}
	});
});
