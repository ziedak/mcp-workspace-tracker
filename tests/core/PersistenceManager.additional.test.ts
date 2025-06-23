import { PersistenceManager } from "../../src/core/services/PersistenceManager";
import { MockLogger } from "../mocks/MockLogger";
import * as fs from "fs/promises";
import * as path from "path";

// Mock fs/promises
jest.mock("fs/promises", () => ({
	mkdir: jest.fn(),
	writeFile: jest.fn(),
	readFile: jest.fn(),
	access: jest.fn(),
	unlink: jest.fn(),
	readdir: jest.fn(),
	stat: jest.fn(),
	rm: jest.fn(),
}));

describe("PersistenceManager Additional Tests", () => {
	let persistenceManager: PersistenceManager;
	let mockLogger: MockLogger;

	beforeEach(() => {
		mockLogger = new MockLogger();
		persistenceManager = new PersistenceManager(mockLogger);

		// Reset all mocks
		jest.resetAllMocks();

		// Default mock implementations
		(fs.mkdir as jest.Mock).mockResolvedValue(undefined);
		(fs.writeFile as jest.Mock).mockResolvedValue(undefined);
		(fs.readFile as jest.Mock).mockResolvedValue("{}");
		(fs.access as jest.Mock).mockResolvedValue(undefined);
		(fs.unlink as jest.Mock).mockResolvedValue(undefined);
		(fs.readdir as jest.Mock).mockResolvedValue([]);
		(fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
		(fs.rm as jest.Mock).mockResolvedValue(undefined);
	});

	describe("Error handling in saveFileHashes", () => {
		it("should handle errors when saving file hashes", async () => {
			// Arrange
			await persistenceManager.initialize("/test/workspace");
			(fs.writeFile as jest.Mock).mockImplementation((path, content, encoding) => {
				// Only reject the file-hashes.json write, not the data file write
				if (path.toString().includes("file-hashes.json")) {
					return Promise.reject(new Error("Write error"));
				}
				return Promise.resolve();
			});

			// Act - save some data to trigger saveFileHashes
			await persistenceManager.saveData("test-key", { data: "test" });

			// Force call the private saveFileHashes method directly to ensure it runs
			await (persistenceManager as any).saveFileHashes();

			// Assert
			expect(fs.writeFile).toHaveBeenCalled();

			// Wait a bit to ensure async error handling completes
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Look for any error with the Write error message
			expect(
				mockLogger.logs.some(
					(log) =>
						log.level === "error" &&
						log.message === "Failed to save file hashes" &&
						log.error?.message === "Write error"
				)
			).toBeTruthy();
		});

		it("should not attempt to save file hashes if cache directory isn't set", async () => {
			// Arrange - don't initialize to keep cacheDir empty

			// Access private method using type assertion and call it directly
			const saveMethod = (persistenceManager as any).saveFileHashes.bind(persistenceManager);

			// Act
			await saveMethod();

			// Assert
			expect(fs.writeFile).not.toHaveBeenCalled();
		});
	});

	describe("Load data error handling", () => {
		it("should handle file not found errors when loading data", async () => {
			// Arrange
			await persistenceManager.initialize("/test/workspace");
			(fs.access as jest.Mock).mockRejectedValue(new Error("File not found"));

			// Act
			const result = await persistenceManager.loadData("test-key");

			// Assert
			expect(result).toBeNull();
		});

		it("should handle JSON parse errors when loading data", async () => {
			// Arrange
			await persistenceManager.initialize("/test/workspace");
			(fs.access as jest.Mock).mockResolvedValue(undefined);
			(fs.readFile as jest.Mock).mockResolvedValue("invalid json");

			// Act
			const result = await persistenceManager.loadData("test-key");

			// Assert
			expect(result).toBeNull();
			expect(mockLogger.hasLog("error", "Failed to load data for key: test-key")).toBeTruthy();
		});

		it("should return cached data if available", async () => {
			// Arrange
			await persistenceManager.initialize("/test/workspace");

			// Save data to cache it
			await persistenceManager.saveData("test-key", { value: "cached" });

			// Clear fs mocks to verify they aren't called
			jest.clearAllMocks();

			// Act
			const result = await persistenceManager.loadData("test-key");

			// Assert
			expect(result).toEqual({ value: "cached" });
			expect(fs.readFile).not.toHaveBeenCalled(); // Should use cache
		});
	});

	describe("Clear cache edge cases", () => {
		it("should handle errors when clearing cache", async () => {
			// Arrange
			await persistenceManager.initialize("/test/workspace");
			(fs.readdir as jest.Mock).mockRejectedValue(new Error("Read error"));

			// Act
			await persistenceManager.clear();

			// Assert
			expect(mockLogger.hasLog("error", "Failed to clear cache directory")).toBeTruthy();
		});

		it("should handle file deletion errors", async () => {
			// Arrange
			await persistenceManager.initialize("/test/workspace");
			(fs.readdir as jest.Mock).mockResolvedValue(["file1", "file2"]);
			(fs.unlink as jest.Mock).mockRejectedValue(new Error("Delete error"));

			// Act
			await persistenceManager.clear();

			// Assert
			expect(fs.unlink).toHaveBeenCalled();

			// Wait a bit to ensure async error handling completes
			await new Promise((resolve) => setTimeout(resolve, 10));

			// There's no specific error for individual file deletion failures in the implementation
			// It will simply continue with other files, so we should check for any error messages
			expect(
				mockLogger.logs.some(
					(log) => log.level === "error" && log.error?.message === "Delete error"
				)
			).toBeTruthy();
		});

		it("should handle non-existent cache directory", async () => {
			// Arrange
			await persistenceManager.initialize("/test/workspace");
			(fs.access as jest.Mock).mockRejectedValue({ code: "ENOENT" });

			// Act
			await persistenceManager.clear();

			// Assert
			expect(fs.readdir).not.toHaveBeenCalled();
		});
	});

	describe("clear method", () => {
		it("should remove all data files", async () => {
			// Arrange
			await persistenceManager.initialize("/test/workspace");
			(fs.readdir as jest.Mock).mockResolvedValue(["file1.json", "file2.json"]);

			// Act
			await persistenceManager.clear();

			// Assert
			expect(fs.unlink).toHaveBeenCalledTimes(2);
		});

		it("should handle errors when clearing data", async () => {
			// Arrange
			await persistenceManager.initialize("/test/workspace");
			(fs.readdir as jest.Mock).mockRejectedValue(new Error("Delete error"));

			// Act
			await persistenceManager.clear();

			// Assert
			expect(mockLogger.hasLog("error", "Failed to clear cache directory")).toBeTruthy();
		});

		it("should clear in-memory cache", async () => {
			// Arrange
			await persistenceManager.initialize("/test/workspace");
			await persistenceManager.saveData("test-key", { data: "value" });

			// Mock the file system so loadData would fail if in-memory cache wasn't used
			(fs.access as jest.Mock).mockRejectedValue(new Error("File not found"));

			// Verify data is in cache by loading it once
			const beforeClear = await persistenceManager.loadData("test-key");
			expect(beforeClear).toEqual({ data: "value" });

			// Act
			await persistenceManager.clear();

			// Set up the file system to return null for file reads after clearing
			(fs.access as jest.Mock).mockRejectedValue({ code: "ENOENT" });

			const result = await persistenceManager.loadData("test-key");

			// Assert
			expect(result).toBeNull();
		});
	});
});
