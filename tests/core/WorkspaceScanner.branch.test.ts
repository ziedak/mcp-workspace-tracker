import { WorkspaceScanner } from "../../src/core/services/WorkspaceScanner";
import * as fs from "fs/promises";
import * as path from "path";

// Mock dependencies
jest.mock("fs/promises");
const mockFs = fs as jest.Mocked<typeof fs>;

const mockLogger = {
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn(),
};

describe("WorkspaceScanner - Branch Coverage", () => {
	let workspaceScanner: WorkspaceScanner;

	beforeEach(() => {
		jest.clearAllMocks();
		workspaceScanner = new WorkspaceScanner(mockLogger);
	});

	describe("edge cases for better branch coverage", () => {
		it.skip("should handle readdir when directory read fails", async () => {
			mockFs.readdir.mockRejectedValue(new Error("Permission denied"));

			const files = await workspaceScanner.scanWorkspace("/test/path");
			expect(files).toEqual([]);
			expect(mockLogger.error).toHaveBeenCalled();
		});

		it.skip("should handle stat when file stat fails", async () => {
			mockFs.readdir.mockResolvedValue([{ name: "test.ts", isDirectory: () => false }] as any);
			mockFs.stat.mockRejectedValue(new Error("Stat failed"));

			const files = await workspaceScanner.scanWorkspace("/test/path");
			expect(files).toEqual([]);
		});

		it.skip("should handle empty directories", async () => {
			mockFs.readdir.mockResolvedValue([]);

			const files = await workspaceScanner.scanWorkspace("/empty/path");
			expect(files).toEqual([]);
		});

		it.skip("should handle mixed file types", async () => {
			const mixedFiles = [
				{ name: "test.ts", isDirectory: () => false },
				{ name: "test.js", isDirectory: () => false },
				{ name: "test.txt", isDirectory: () => false },
				{ name: "subdir", isDirectory: () => true },
			];

			mockFs.readdir.mockResolvedValue(mixedFiles as any);
			mockFs.stat.mockImplementation((filePath) => {
				const fileName = path.basename(filePath as string);
				return Promise.resolve({
					isDirectory: () => fileName === "subdir",
					isFile: () => fileName !== "subdir",
					size: 1000,
					mtime: new Date(),
				} as any);
			});

			// Mock subdirectory to be empty
			mockFs.readdir.mockImplementation((dirPath) => {
				if ((dirPath as string).includes("subdir")) {
					return Promise.resolve([]);
				}
				return Promise.resolve(mixedFiles as any);
			});

			const files = await workspaceScanner.scanWorkspace("/test/path");
			expect(files.length).toBeGreaterThan(0);
		});

		it.skip("should handle deep directory structures", async () => {
			// Mock a directory structure that goes several levels deep
			mockFs.readdir.mockImplementation((dirPath) => {
				const pathStr = dirPath as string;
				if (pathStr.includes("level3")) {
					return Promise.resolve([]);
				} else if (pathStr.includes("level2")) {
					return Promise.resolve([{ name: "level3", isDirectory: () => true }] as any);
				} else if (pathStr.includes("level1")) {
					return Promise.resolve([{ name: "level2", isDirectory: () => true }] as any);
				} else {
					return Promise.resolve([
						{ name: "level1", isDirectory: () => true },
						{ name: "file.ts", isDirectory: () => false },
					] as any);
				}
			});

			mockFs.stat.mockResolvedValue({
				isDirectory: () => false,
				isFile: () => true,
				size: 1000,
				mtime: new Date(),
			} as any);

			const files = await workspaceScanner.scanWorkspace("/deep/path");
			expect(files).toBeDefined();
		});
	});
});
