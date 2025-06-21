import { WorkspaceScanner } from "../src/core/WorkspaceScanner";
import { FileSystemUtils } from "../src/utils/FileSystemUtils";
import * as path from "path";
import * as fs from "fs";

// Mock FileSystemUtils
jest.mock("../src/utils/FileSystemUtils");

describe("WorkspaceScanner", () => {
	let workspaceScanner: WorkspaceScanner;
	let mockFileUtils: jest.Mocked<FileSystemUtils>;

	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();

		// Create a new instance for each test
		mockFileUtils = new FileSystemUtils() as jest.Mocked<FileSystemUtils>;
		workspaceScanner = new WorkspaceScanner();

		// Inject mock into private property (for testing)
		Object.defineProperty(workspaceScanner, "fileUtils", {
			value: mockFileUtils,
			writable: true,
		});
	});

	describe("scanWorkspace", () => {
		it("should scan a workspace and return file paths", async () => {
			// Mock fs.promises.stat
			const mockStat = {
				isDirectory: jest.fn().mockReturnValue(true),
			};
			jest.spyOn(fs.promises, "stat").mockResolvedValue(mockStat as any);

			// Mock fs.promises.readFile for gitignore
			jest.spyOn(fs.promises, "readFile").mockResolvedValue("node_modules\ndist\n.git");

			// Mock fs.promises.readdir
			const mockEntries = [
				{ name: "file1.ts", isDirectory: () => false, isFile: () => true },
				{ name: "file2.ts", isDirectory: () => false, isFile: () => true },
				{ name: "subdir", isDirectory: () => true, isFile: () => false },
			];
			jest.spyOn(fs.promises, "readdir").mockImplementation((path) => {
				if (path.toString().includes("subdir")) {
					return Promise.resolve([
						{ name: "file3.ts", isDirectory: () => false, isFile: () => true },
					] as any);
				}
				return Promise.resolve(mockEntries as any);
			});

			// Run the scanner
			const workspacePath = "/test/workspace";
			const result = await workspaceScanner.scanWorkspace(workspacePath);

			// Check results
			expect(result).toEqual([
				path.join(workspacePath, "file1.ts"),
				path.join(workspacePath, "file2.ts"),
				path.join(workspacePath, "subdir", "file3.ts"),
			]);

			// Verify fs.promises.readdir was called
			expect(fs.promises.readdir).toHaveBeenCalledTimes(2);
			expect(fs.promises.readdir).toHaveBeenCalledWith(workspacePath, { withFileTypes: true });
			expect(fs.promises.readdir).toHaveBeenCalledWith(path.join(workspacePath, "subdir"), {
				withFileTypes: true,
			});
		});

		it("should handle errors when scanning workspace", async () => {
			// Mock fs.promises.stat to throw an error
			jest.spyOn(fs.promises, "stat").mockRejectedValue(new Error("Test error"));

			// Run the scanner and expect it to throw
			const workspacePath = "/invalid/path";
			await expect(workspaceScanner.scanWorkspace(workspacePath)).rejects.toThrow("Test error");
		});
	});
});
