// Define mock functions before using them in jest.mock
const mockFunctions = {
	stat: jest.fn(),
	readdir: jest.fn(),
	readFile: jest.fn(),
};

// Mock the fs module
jest.mock("fs", () => ({
	promises: mockFunctions,
}));

import { WorkspaceScanner } from "../../src/core/services/WorkspaceScanner";
import { MockLogger } from "../mocks/MockLogger";
import * as path from "path";
import { WorkspaceFile } from "../../src/core/models/WorkspaceFile";

describe("WorkspaceScanner Simplified Tests", () => {
	let workspaceScanner: WorkspaceScanner;
	let mockLogger: MockLogger;

	beforeEach(() => {
		mockLogger = new MockLogger();
		workspaceScanner = new WorkspaceScanner(mockLogger);

		jest.resetAllMocks();

		// Set up basic mocks for all tests
		mockFunctions.stat.mockImplementation((path) => {
			return Promise.resolve({
				isDirectory: () => path.toString().endsWith("workspace"),
				isFile: () => !path.toString().endsWith("workspace"),
				size: 1024,
				mtime: new Date(),
			});
		});

		mockFunctions.readdir.mockImplementation((dirPath) => {
			if (dirPath.toString() === "/test/workspace") {
				return Promise.resolve(["file1.ts"]);
			}
			return Promise.resolve([]);
		});

		mockFunctions.readFile.mockImplementation(() => {
			return Promise.resolve("file content");
		});
	});

	it("should get workspace stats", async () => {
		// Prepare
		const cachedFiles: WorkspaceFile[] = [
			{
				path: "/test/workspace/file1.ts",
				relativePath: "file1.ts",
				type: "source",
				size: 100,
				lastModified: new Date(),
			} as any,
			{
				path: "/test/workspace/test.spec.ts",
				relativePath: "test.spec.ts",
				type: "test",
				size: 100,
				lastModified: new Date(),
			} as any,
			{
				path: "/test/workspace/config.json",
				relativePath: "config.json",
				type: "config",
				size: 100,
				lastModified: new Date(),
			} as any,
			{
				path: "/test/workspace/readme.md",
				relativePath: "readme.md",
				type: "other",
				size: 100,
				lastModified: new Date(),
			} as any,
		];

		// Set cached files directly
		(workspaceScanner as any).rootPath = "/test/workspace";
		(workspaceScanner as any).cachedFiles = cachedFiles;

		// Act
		const stats = await workspaceScanner.getWorkspaceStats();

		// Assert
		expect(stats.totalFiles).toBe(4);
		expect(stats.sourceFiles).toBe(1);
		expect(stats.testFiles).toBe(1);
		expect(stats.configFiles).toBe(1);
		expect(stats.otherFiles).toBe(1);
	});

	it("should find files by pattern", async () => {
		// Prepare
		const cachedFiles: WorkspaceFile[] = [
			{
				path: "/test/workspace/file1.ts",
				relativePath: "file1.ts",
				type: "source",
				size: 100,
				lastModified: new Date(),
			} as any,
			{
				path: "/test/workspace/file2.js",
				relativePath: "file2.js",
				type: "source",
				size: 100,
				lastModified: new Date(),
			} as any,
		];

		// Set cached files directly
		(workspaceScanner as any).rootPath = "/test/workspace";
		(workspaceScanner as any).cachedFiles = cachedFiles;

		// Act
		const tsFiles = await workspaceScanner.findFiles("*.ts");

		// Assert
		expect(tsFiles).toHaveLength(1);
		expect(tsFiles[0].path).toContain("file1.ts");
	});

	it("should read file content", async () => {
		// Prepare
		(workspaceScanner as any).rootPath = "/test/workspace";

		// Act
		const content = await workspaceScanner.readFile("/test/workspace/file1.ts");

		// Assert
		expect(content).toBe("file content");
		expect(mockFunctions.readFile).toHaveBeenCalled();
	});
});
