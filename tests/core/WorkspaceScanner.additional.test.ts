// Define mock functions first
const mockFsPromises = {
	stat: jest.fn(),
	readdir: jest.fn(),
	readFile: jest.fn(),
};

// Override fs module with our mock
jest.mock("fs", () => ({
	promises: mockFsPromises,
}));

import { WorkspaceScanner } from "../../src/core/services/WorkspaceScanner";
import { MockLogger } from "../mocks/MockLogger";
import * as path from "path";
import type { Dirent, Stats } from "fs";

describe("WorkspaceScanner Additional Tests", () => {
	let workspaceScanner: WorkspaceScanner;
	let mockLogger: MockLogger;

	// Helper function to create mock Stats object
	const createMockStats = (isDir: boolean): Stats =>
		({
			isDirectory: () => isDir,
			isFile: () => !isDir,
			size: isDir ? 0 : 1024,
			mtime: new Date(),
			birthtime: new Date(),
			atime: new Date(),
			ctime: new Date(),
			dev: 0,
			gid: 0,
			uid: 0,
			ino: 0,
			mode: 0,
			nlink: 0,
			rdev: 0,
			blocks: 0,
			blksize: 0,
		} as Stats);

	// Helper function to create Dirent-like objects for testing
	function createDirent(name: string, isDir: boolean): Dirent {
		return {
			name,
			isDirectory: () => isDir,
			isFile: () => !isDir,
			isBlockDevice: () => false,
			isCharacterDevice: () => false,
			isSymbolicLink: () => false,
			isFIFO: () => false,
			isSocket: () => false,
			path: `/test/workspace/${isDir ? name : ""}`,
			parentPath: `/test/workspace`,
		} as unknown as Dirent;
	}

	beforeEach(() => {
		mockLogger = new MockLogger();
		workspaceScanner = new WorkspaceScanner(mockLogger);

		// Reset all mocks
		jest.resetAllMocks();

		// Set up default mock implementations
		mockFsPromises.stat.mockImplementation((path) => {
			const pathStr = path.toString();
			if (pathStr === "/test/workspace") {
				return Promise.resolve(createMockStats(true));
			} else if (pathStr.includes("file")) {
				return Promise.resolve(createMockStats(false));
			} else {
				return Promise.resolve(createMockStats(true));
			}
		});

		// Create a default workspace for all tests to use
		mockFsPromises.readdir.mockImplementation((dirPath, options) => {
			if (dirPath.toString() === "/test/workspace") {
				if (options?.withFileTypes) {
					return Promise.resolve([createDirent("file1.ts", false)]);
				}
				return Promise.resolve(["file1.ts"]);
			}
			return Promise.resolve([]);
		});

		// Set up default readFile mock
		mockFsPromises.readFile.mockImplementation(() => {
			return Promise.resolve("file content");
		});

		// We'll set up the workspace manually instead of scanning
		(workspaceScanner as any).rootPath = "/test/workspace";
		(workspaceScanner as any).cachedFiles = [
			{
				path: "/test/workspace/file1.ts",
				relativePath: "file1.ts",
				type: "source",
				size: 100,
				lastModified: new Date(),
			},
		];
	});

	describe("Edge cases and error handling", () => {
		it("should handle error reading directory during recursive scan", async () => {
			// Set up problematic directory structure
			mockFsPromises.readdir.mockImplementation((dirPath, options) => {
				const dirPathStr = dirPath.toString();
				if (dirPathStr === "/test/workspace") {
					if (options?.withFileTypes) {
						return Promise.resolve([
							createDirent("file1.ts", false),
							createDirent("problem-dir", true),
						]);
					}
					return Promise.resolve(["file1.ts", "problem-dir"]);
				} else if (dirPathStr.includes("problem-dir")) {
					// Simulate error reading the directory
					return Promise.reject(new Error("Permission denied"));
				}
				return Promise.resolve(options?.withFileTypes ? [] : []);
			});

			// Force the test to go through traverseDirectory by removing cached files
			(workspaceScanner as any).cachedFiles = [];

			// Perform directory scan on a subdirectory
			const files = await (workspaceScanner as any).traverseDirectory(
				"/test/workspace",
				"/test/workspace",
				0,
				[]
			);

			// Verify we got the first level files but without problem-dir content
			expect(files).toHaveLength(1);
			expect(files[0]).toContain("file1.ts");
			expect(mockLogger.hasLog("warn", "Error reading directory")).toBeTruthy();
		});

		it("should handle gitignore patterns correctly", () => {
			// Test the shouldExclude method directly
			const excludePatterns = ["node_modules/**", "*.log", "dist/**"];

			// Create an instance with access to private methods
			const scanner = workspaceScanner as any;

			// Check if paths are correctly excluded
			expect(scanner.shouldExclude("node_modules/package.json", true, excludePatterns)).toBe(true);
			expect(scanner.shouldExclude("src/app.log", false, excludePatterns)).toBe(true);
			expect(scanner.shouldExclude("src/dist/bundle.js", true, excludePatterns)).toBe(true);
			expect(scanner.shouldExclude("src/app.ts", false, excludePatterns)).toBe(false);
		});

		it("should handle absolute file path requests when reading files", async () => {
			// Setup
			const filePath = "/test/workspace/src/file.ts";
			const fileContent = "test content";

			// Mock readFile for the specific file
			mockFsPromises.readFile.mockImplementation((path) => {
				const pathStr = path.toString();
				if (pathStr === filePath) {
					return Promise.resolve(fileContent);
				}
				return Promise.reject(new Error("File not found"));
			});

			// Read absolute file path
			const content = await workspaceScanner.readFile(filePath);

			// Verify
			expect(content).toBe(fileContent);
		});

		it("should handle invalid or malformed file type patterns in findFiles", async () => {
			// Set up cached files with different extensions
			(workspaceScanner as any).cachedFiles = [
				{ path: "/test/workspace/file1.ts", relativePath: "file1.ts", type: "source" },
				{ path: "/test/workspace/file2.js", relativePath: "file2.js", type: "source" },
			];

			// Test with invalid pattern
			const files1 = await workspaceScanner.findFiles("[");
			expect(files1.length).toBe(0);

			// Test with pattern that matches nothing
			const files2 = await workspaceScanner.findFiles("*.xyz");
			expect(files2.length).toBe(0);

			// Test with valid pattern to verify it works
			const files3 = await workspaceScanner.findFiles("*.ts");
			expect(files3.length).toBe(1);
			expect(files3[0].path).toContain("file1.ts");
		});
	});

	describe("File type classification", () => {
		it("should correctly classify different file types", async () => {
			// Setup various file types
			mockFsPromises.readdir.mockImplementation((dirPath, options) => {
				if (dirPath.toString() === "/test/workspace") {
					if (options?.withFileTypes) {
						return Promise.resolve([
							createDirent("app.js", false),
							createDirent("test.spec.js", false),
							createDirent("README.md", false),
							createDirent("tsconfig.json", false),
							createDirent("image.png", false),
						]);
					}
					return Promise.resolve([
						"app.js",
						"test.spec.js",
						"README.md",
						"tsconfig.json",
						"image.png",
					]);
				}
				return Promise.resolve([]);
			});

			// Scan workspace with our custom files
			await workspaceScanner.scanWorkspace("/test/workspace");

			// Get stats
			const stats = await workspaceScanner.getWorkspaceStats();

			// Verify correct classification
			expect(stats.sourceFiles).toBe(1); // app.js
			expect(stats.testFiles).toBe(1); // test.spec.js
			expect(stats.configFiles).toBe(1); // tsconfig.json
			expect(stats.otherFiles).toBe(2); // README.md and image.png
			expect(stats.totalFiles).toBe(5);
		});
	});
});
