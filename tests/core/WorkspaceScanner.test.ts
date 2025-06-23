// Mock fs/promises and fs before imports
const mockStat = jest.fn();
const mockReaddir = jest.fn();
const mockReadFile = jest.fn();

jest.mock("fs/promises", () => ({
	stat: mockStat,
	readdir: mockReaddir,
	readFile: mockReadFile,
}));

jest.mock("fs", () => {
	const actualFs = jest.requireActual("fs");
	return {
		...actualFs,
		promises: {
			stat: mockStat,
			readdir: mockReaddir,
			readFile: mockReadFile,
		},
	};
});

// Import after mocking
import { WorkspaceScanner } from "../../src/core/services/WorkspaceScanner";
import { MockLogger } from "../mocks/MockLogger";
import * as path from "path";
import type { Dirent, Stats } from "fs";

describe("WorkspaceScanner", () => {
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
	});

	describe("scanWorkspace", () => {
		it("should scan workspace and return files", async () => {
			// Mock filesystem functions
			const workspacePath = "/test/workspace";

			// Mock workspace as directory
			mockStat.mockImplementation((filePath: string) => {
				const filePathStr = filePath.toString();
				if (filePathStr === workspacePath) {
					return Promise.resolve(createMockStats(true));
				} else if (
					filePathStr.includes("dir1") &&
					!filePathStr.endsWith(".ts") &&
					!filePathStr.endsWith(".js")
				) {
					return Promise.resolve(createMockStats(true));
				}
				return Promise.resolve(createMockStats(false));
			});

			// Mock gitignore file
			mockReadFile.mockImplementation((filePath: string, encoding: string) => {
				if (filePath.toString().includes(".gitignore")) {
					return Promise.resolve("node_modules\n.cache\ndist");
				}
				return Promise.reject(new Error("File not found"));
			});

			mockReaddir.mockImplementation((dirPath, options) => {
				const dirPathStr = dirPath.toString();
				if (dirPathStr === workspacePath) {
					if (options?.withFileTypes) {
						return Promise.resolve([
							createDirent("file1.ts", false),
							createDirent("file2.js", false),
							createDirent("dir1", true),
						]);
					}
					return Promise.resolve(["file1.ts", "file2.js", "dir1"]);
				} else if (dirPathStr === path.join(workspacePath, "dir1")) {
					if (options?.withFileTypes) {
						return Promise.resolve([
							createDirent("file3.ts", false),
							createDirent("file4.js", false),
						]);
					}
					return Promise.resolve(["file3.ts", "file4.js"]);
				}
				return Promise.resolve(options?.withFileTypes ? [] : []);
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
			mockStat.mockResolvedValue(createMockStats(false));

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

			// Mock workspace as directory
			mockStat.mockImplementation((filePath: string) => {
				const filePathStr = filePath.toString();
				if (
					filePathStr === workspacePath ||
					filePathStr.includes("dir1") ||
					filePathStr.includes(".git")
				) {
					return Promise.resolve(createMockStats(true));
				}
				return Promise.resolve(createMockStats(false));
			});

			mockReaddir.mockImplementation((dirPath, options) => {
				const dirPathStr = dirPath.toString();
				if (dirPathStr === workspacePath) {
					if (options?.withFileTypes) {
						return Promise.resolve([
							createDirent("file1.ts", false),
							createDirent("file2.js", false),
							createDirent("dir1", true),
							createDirent(".git", true),
						]);
					}
					return Promise.resolve(["file1.ts", "file2.js", "dir1", ".git"]);
				} else if (dirPathStr === path.join(workspacePath, "dir1")) {
					if (options?.withFileTypes) {
						return Promise.resolve([
							createDirent("file3.ts", false),
							createDirent("file4.js", false),
						]);
					}
					return Promise.resolve(["file3.ts", "file4.js"]);
				}
				return Promise.resolve(options?.withFileTypes ? [] : []);
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

			mockStat.mockImplementation((filePath: string) => {
				const filePathStr = filePath.toString();
				if (filePathStr === workspacePath) {
					return Promise.resolve(createMockStats(true));
				}
				return Promise.resolve(createMockStats(false));
			});

			mockReaddir.mockImplementation((dirPath, options) => {
				if (options?.withFileTypes) {
					return Promise.resolve([createDirent("file.ts", false)]);
				}
				return Promise.resolve(["file.ts"]);
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

			mockStat.mockImplementation((filePath: string) => {
				const filePathStr = filePath.toString();
				if (filePathStr === workspacePath) {
					return Promise.resolve(createMockStats(true));
				}
				return Promise.resolve(createMockStats(false));
			});

			mockReaddir.mockImplementation((dirPath, options) => {
				const dirPathStr = dirPath.toString();
				if (dirPathStr === workspacePath) {
					if (options?.withFileTypes) {
						return Promise.resolve([
							createDirent("app.ts", false),
							createDirent("test.spec.ts", false),
							createDirent("config.json", false),
						]);
					}
					return Promise.resolve(["app.ts", "test.spec.ts", "config.json"]);
				}
				return Promise.resolve(options?.withFileTypes ? [] : []);
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

			// Mock readFile implementation - return string content directly
			mockReadFile.mockResolvedValue(fileContent);

			// Set the root path
			mockStat.mockResolvedValue(createMockStats(true));
			mockReaddir.mockResolvedValue([]);
			await workspaceScanner.scanWorkspace("/test/workspace");

			// Read the file
			const content = await workspaceScanner.readFile(filePath);

			expect(content).toBe(fileContent);
		});

		it("should handle read file errors", async () => {
			const filePath = "/test/workspace/nonexistent.txt";

			// Mock readFile to throw an error
			mockReadFile.mockRejectedValue(new Error("File not found"));

			// Set the root path
			mockStat.mockResolvedValue(createMockStats(true));
			mockReaddir.mockResolvedValue([]);
			await workspaceScanner.scanWorkspace("/test/workspace");

			// Expect readFile to throw
			await expect(workspaceScanner.readFile(filePath)).rejects.toThrow("Failed to read file");
		});
	});
});
