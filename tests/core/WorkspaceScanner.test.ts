// @ts-nocheck
// Using ts-nocheck to bypass strict TypeScript issues with the mock implementations
import { WorkspaceScanner } from "../../src/core/services/WorkspaceScanner";
import { MockLogger } from "../mocks/MockLogger";
import type { PathLike, Stats, Dirent } from "fs";
import * as fs from "fs/promises";
import * as path from "path";

// Mock fs/promises
jest.mock("fs/promises");

describe("WorkspaceScanner", () => {
	let workspaceScanner: WorkspaceScanner;
	let mockLogger: MockLogger;
	const mockFs = fs as jest.Mocked<typeof fs>;

	beforeEach(() => {
		mockLogger = new MockLogger();
		workspaceScanner = new WorkspaceScanner(mockLogger);

		// Reset all mocks
		jest.resetAllMocks();
	});

	describe("scanWorkspace", () => {
		it("should scan workspace and return files", async () => {
			// Mock filesystem functions
			const workspacePath = "/test/workspace";

			mockFs.readdir.mockImplementation(async (dirPath, options) => {
				const dirPathStr = dirPath.toString();
				if (dirPathStr === workspacePath) {
					if (options?.withFileTypes) {
						return [
							createDirent("file1.ts", false),
							createDirent("file2.js", false),
							createDirent("dir1", true),
						];
					}
					return ["file1.ts", "file2.js", "dir1"];
				} else if (dirPathStr === path.join(workspacePath, "dir1")) {
					if (options?.withFileTypes) {
						return [createDirent("file3.ts", false), createDirent("file4.js", false)];
					}
					return ["file3.ts", "file4.js"];
				}
				return options?.withFileTypes ? [] : [];
			});

			mockFs.stat.mockImplementation(async (filePath) => {
				const filePathStr = filePath.toString();
				if (
					filePathStr.includes("dir1") &&
					!filePathStr.endsWith(".ts") &&
					!filePathStr.endsWith(".js")
				) {
					return {
						isDirectory: () => true,
						isFile: () => false,
						size: 0,
						mtime: new Date(),
					};
				}
				return {
					isDirectory: () => false,
					isFile: () => true,
					size: 1024,
					mtime: new Date(),
				};
			});

			const files = await workspaceScanner.scanWorkspace(workspacePath);

			// Verify results
			expect(files).toHaveLength(4);
			expect(files[0].path).toContain("file1.ts");
			expect(files[1].path).toContain("file2.js");
			expect(files[2].path).toContain("file3.ts");
			expect(files[3].path).toContain("file4.js");

			// Verify logging
			expect(mockLogger.hasLog("info", `Scanning workspace: ${workspacePath}`)).toBeTruthy();
			expect(mockLogger.hasLog("info", "Scan complete")).toBeTruthy();
		});

		it("should handle filesystem errors gracefully", async () => {
			// Mock invalid path - not a directory
			mockFs.stat.mockResolvedValue({
				isDirectory: () => false,
				isFile: () => true,
				size: 0,
				mtime: new Date(),
			});

			const workspacePath = "/invalid/workspace";
			await expect(workspaceScanner.scanWorkspace(workspacePath)).rejects.toThrow(
				"Workspace path is not a directory"
			);

			// Verify error was logged
			expect(mockLogger.hasLog("error", "Failed to scan workspace")).toBeTruthy();
		});
	});

	describe("findFiles", () => {
		it("should find files matching pattern", async () => {
			// Setup by scanning some mock files first
			const workspacePath = "/test/workspace";

			mockFs.readdir.mockImplementation(async (dirPath, options) => {
				const dirPathStr = dirPath.toString();
				if (dirPathStr === workspacePath) {
					if (options?.withFileTypes) {
						return [
							createDirent("file1.ts", false),
							createDirent("file2.js", false),
							createDirent("dir1", true),
							createDirent(".git", true),
						];
					}
					return ["file1.ts", "file2.js", "dir1", ".git"];
				} else if (dirPathStr === path.join(workspacePath, "dir1")) {
					if (options?.withFileTypes) {
						return [createDirent("file3.ts", false), createDirent("file4.js", false)];
					}
					return ["file3.ts", "file4.js"];
				}
				return options?.withFileTypes ? [] : [];
			});

			mockFs.stat.mockImplementation(async (filePath) => {
				const filePathStr = filePath.toString();
				if (
					(filePathStr.includes("dir1") &&
						!filePathStr.endsWith(".ts") &&
						!filePathStr.endsWith(".js")) ||
					filePathStr.includes(".git")
				) {
					return {
						isDirectory: () => true,
						isFile: () => false,
						size: 0,
						mtime: new Date(),
					};
				}
				return {
					isDirectory: () => false,
					isFile: () => true,
					size: 1024,
					mtime: new Date(),
				};
			});

			await workspaceScanner.scanWorkspace(workspacePath);

			// Now test pattern matching
			const tsFiles = await workspaceScanner.findFiles("**/*.ts");

			// Verify results
			expect(tsFiles).toHaveLength(2);
			expect(tsFiles[0].path).toContain("file1.ts");
			expect(tsFiles[1].path).toContain("file3.ts");
		});

		it("should return all files when using wildcard pattern", async () => {
			// Setup mock workspace
			const workspacePath = "/test/workspace";
			mockFs.stat.mockResolvedValue({
				isDirectory: () => true,
				isFile: () => false,
				size: 0,
				mtime: new Date(),
			});

			mockFs.readdir.mockImplementation(async (dirPath, options) => {
				if (options?.withFileTypes) {
					return [createDirent("file.ts", false)];
				}
				return ["file.ts"];
			});

			await workspaceScanner.scanWorkspace(workspacePath);

			const allFiles = await workspaceScanner.findFiles("*");
			expect(allFiles.length).toBeGreaterThan(0);
		});
	});

	describe("getWorkspaceStats", () => {
		it("should calculate correct file statistics", async () => {
			// Setup by scanning some mock files with different types
			const workspacePath = "/test/workspace";

			mockFs.readdir.mockImplementation(async (dirPath, options) => {
				const dirPathStr = dirPath.toString();
				if (dirPathStr === workspacePath) {
					if (options?.withFileTypes) {
						return [
							createDirent("app.ts", false),
							createDirent("test.spec.ts", false),
							createDirent("config.json", false),
						];
					}
					return ["app.ts", "test.spec.ts", "config.json"];
				}
				return options?.withFileTypes ? [] : [];
			});

			mockFs.stat.mockImplementation(async (filePath) => {
				return {
					isDirectory: () => false,
					isFile: () => true,
					size: 1024,
					mtime: new Date(),
				};
			});

			await workspaceScanner.scanWorkspace(workspacePath);

			// Get stats
			const stats = await workspaceScanner.getWorkspaceStats();

			// Verify results
			expect(stats.totalFiles).toBe(3);
			expect(stats.sourceFiles).toBe(1); // app.ts
			expect(stats.testFiles).toBe(1); // test.spec.ts
			expect(stats.configFiles).toBe(1); // config.json
			expect(stats.otherFiles).toBe(0);
		});
	});

	describe("readFile", () => {
		it("should read file content", async () => {
			const filePath = "/test/workspace/file.txt";
			const fileContent = "test file content";

			// Mock readFile implementation
			mockFs.readFile.mockResolvedValue(Buffer.from(fileContent));

			// Set the root path
			await workspaceScanner.scanWorkspace("/test/workspace");

			// Read the file
			const content = await workspaceScanner.readFile(filePath);

			expect(content).toBe(fileContent);
		});

		it("should handle read file errors", async () => {
			const filePath = "/test/workspace/nonexistent.txt";

			// Mock readFile to throw an error
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			// Set the root path
			await workspaceScanner.scanWorkspace("/test/workspace");

			// Expect readFile to throw
			await expect(workspaceScanner.readFile(filePath)).rejects.toThrow("Failed to read file");
		});
	});

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
		};
	}
});
