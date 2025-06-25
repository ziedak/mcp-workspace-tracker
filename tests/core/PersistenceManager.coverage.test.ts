import { PersistenceManager } from "../../src/core/services/PersistenceManager";
import { MockLogger } from "../mocks/MockLogger";
import * as fs from "fs/promises";

// Mock fs/promises
jest.mock("fs/promises", () => ({
	mkdir: jest.fn(),
	writeFile: jest.fn(),
	readFile: jest.fn(),
	access: jest.fn(),
	unlink: jest.fn(),
	readdir: jest.fn(),
}));

describe("PersistenceManager - Missing Branch Coverage", () => {
	let mockLogger: MockLogger;
	const mockFs = fs as jest.Mocked<typeof fs>;

	beforeEach(() => {
		mockLogger = new MockLogger();
		jest.resetAllMocks();

		// Default successful implementations
		mockFs.mkdir.mockResolvedValue(undefined);
		mockFs.writeFile.mockResolvedValue(undefined);
		mockFs.readFile.mockResolvedValue("{}");
		mockFs.access.mockResolvedValue(undefined);
		mockFs.unlink.mockResolvedValue(undefined);
		mockFs.readdir.mockResolvedValue([]);
	});

	describe("isValidCacheDirectory behavior", () => {
		it("should handle saveData when cache directory is invalid (not initialized)", async () => {
			// Create manager but don't initialize (cache directory is empty string)
			const persistenceManager = new PersistenceManager(mockLogger);
			const testData = { value: "test" };

			// Should store in memory only
			await persistenceManager.saveData("test-key", testData);

			// Should not attempt to write to disk
			expect(mockFs.writeFile).not.toHaveBeenCalled();

			// Should be able to load from memory
			const result = await persistenceManager.loadData("test-key");
			expect(result).toEqual(testData);
		});

		it("should handle loadData when cache directory is invalid (not initialized)", async () => {
			// Create manager but don't initialize (cache directory is empty string)
			const persistenceManager = new PersistenceManager(mockLogger);

			// Should return null when cache directory is invalid and no memory cache
			const result = await persistenceManager.loadData("non-existent-key");
			expect(result).toBeNull();

			// Should not attempt to read from disk
			expect(mockFs.readFile).not.toHaveBeenCalled();
		});

		it("should handle clear when cache directory is invalid (not initialized)", async () => {
			// Create manager but don't initialize (cache directory is empty string)
			const persistenceManager = new PersistenceManager(mockLogger);

			// Add some data to memory cache
			await persistenceManager.saveData("test-key", { value: "test" });
			persistenceManager.updateFileHash("file.ts", "hash123");

			// Clear should work without errors
			await persistenceManager.clear();

			// Should not attempt file system operations
			expect(mockFs.readdir).not.toHaveBeenCalled();
			expect(mockFs.unlink).not.toHaveBeenCalled();

			// Memory should be cleared
			const result = await persistenceManager.loadData("test-key");
			expect(result).toBeNull();
			expect(persistenceManager.isCachedAndUnchanged("file.ts", "hash123")).toBe(false);
		});

		it("should handle saveFileHashes when cache directory is invalid", async () => {
			// Create manager but don't initialize (cache directory is empty string)
			const persistenceManager = new PersistenceManager(mockLogger);

			// Update file hash to trigger saveFileHashes
			persistenceManager.updateFileHash("file.ts", "hash123");

			// Force call the private saveFileHashes method
			await (persistenceManager as any).saveFileHashes();

			// Should not attempt to write file hashes to disk
			expect(mockFs.writeFile).not.toHaveBeenCalled();
		});
	});

	describe("JSON parsing error handling", () => {
		it("should handle JSON parsing errors in loadData", async () => {
			const persistenceManager = new PersistenceManager(mockLogger);
			await persistenceManager.initialize("/test/workspace");

			// Mock file exists but contains invalid JSON
			mockFs.readFile.mockResolvedValue("invalid json content {");

			const result = await persistenceManager.loadData("test-key");

			// Should return null and log error
			expect(result).toBeNull();
			expect(mockLogger.hasLog("error", "Failed to load data for key: test-key")).toBe(true);
		});

		it("should handle non-Error objects in loadData catch block", async () => {
			const persistenceManager = new PersistenceManager(mockLogger);
			await persistenceManager.initialize("/test/workspace");

			// Mock readFile to throw a non-Error object
			mockFs.readFile.mockImplementation(() => {
				throw "String error"; // Non-Error object
			});

			const result = await persistenceManager.loadData("test-key");

			// Should return null and handle non-Error properly
			expect(result).toBeNull();
			expect(mockLogger.hasLog("error", "Failed to load data for key: test-key")).toBe(true);
		});
	});

	describe("Additional error scenarios for complete coverage", () => {
		it("should handle file access errors during file existence check", async () => {
			const persistenceManager = new PersistenceManager(mockLogger);
			await persistenceManager.initialize("/test/workspace");

			// Mock access to throw error (file doesn't exist)
			mockFs.access.mockRejectedValue(new Error("File not found"));

			const result = await persistenceManager.loadData("test-key");
			expect(result).toBeNull();
		});

		it("should handle readFile errors in loadData", async () => {
			const persistenceManager = new PersistenceManager(mockLogger);
			await persistenceManager.initialize("/test/workspace");

			// Mock file exists but readFile fails
			mockFs.access.mockResolvedValue(undefined);
			mockFs.readFile.mockRejectedValue(new Error("Permission denied"));

			const result = await persistenceManager.loadData("test-key");

			// Should return null and log error
			expect(result).toBeNull();
			expect(mockLogger.hasLog("error", "Failed to load data for key: test-key")).toBe(true);
		});

		it("should handle saveData error with non-Error object", async () => {
			const persistenceManager = new PersistenceManager(mockLogger);
			await persistenceManager.initialize("/test/workspace");

			// Mock writeFile to throw non-Error object
			mockFs.writeFile.mockImplementation(() => {
				throw "String error"; // Non-Error object
			});

			await persistenceManager.saveData("test-key", { value: "test" });

			// Should handle non-Error properly
			expect(mockLogger.hasLog("error", "Failed to save data for key: test-key")).toBe(true);
		});

		it("should handle initialization error with non-Error object", async () => {
			const persistenceManager = new PersistenceManager(mockLogger);

			// Mock mkdir to throw non-Error object
			mockFs.mkdir.mockImplementation(() => {
				throw "String error"; // Non-Error object
			});

			await expect(persistenceManager.initialize("/test/workspace")).rejects.toEqual(
				"String error"
			);
			expect(mockLogger.hasLog("error", "Failed to initialize persistence manager")).toBe(true);
		});

		it("should handle clear error with non-Error object", async () => {
			const persistenceManager = new PersistenceManager(mockLogger);
			await persistenceManager.initialize("/test/workspace");

			// Mock readdir to throw non-Error object
			mockFs.readdir.mockImplementation(() => {
				throw "String error"; // Non-Error object
			});

			await persistenceManager.clear();

			// Should handle non-Error properly
			expect(mockLogger.hasLog("error", "Failed to clear cache directory")).toBe(true);
		});
	});
});
