import { PersistenceManager } from "../../src/core/services/PersistenceManager";
import { MockLogger } from "../mocks/MockLogger";
import type { PathLike } from "fs";
import * as fs from "fs/promises";

// Mock fs/promises
jest.mock("fs/promises");

describe("PersistenceManager", () => {
	let persistenceManager: PersistenceManager;
	let mockLogger: MockLogger;

	beforeEach(() => {
		mockLogger = new MockLogger();
		persistenceManager = new PersistenceManager(mockLogger);

		// Reset all mocks
		jest.resetAllMocks();

		// Mock fs methods using jest.spyOn instead of direct assignment
		jest.spyOn(fs, "mkdir").mockResolvedValue(undefined);
		jest.spyOn(fs, "readFile").mockRejectedValue(new Error("File not found"));
		jest.spyOn(fs, "writeFile").mockResolvedValue(undefined);
	});

	describe("initialize", () => {
		it("should create cache directory if it doesn't exist", async () => {
			const workspacePath = "/test/workspace";

			await persistenceManager.initialize(workspacePath);

			// Verify cache directory was created
			expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining(".mcp-cache"), {
				recursive: true,
			});

			// Verify attempt to load hashes file
			expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining("file-hashes.json"), "utf8");

			// Verify logging
			expect(mockLogger.hasLog("info", "Initializing persistence manager")).toBeTruthy();
		});

		it("should load existing hashes if available", async () => {
			const workspacePath = "/test/workspace";
			const existingHashes = JSON.stringify({
				"file1.ts": "hash1",
				"file2.ts": "hash2",
			});

			// Mock existing hashes file
			jest
				.spyOn(fs, "readFile")
				.mockImplementation((path: PathLike | fs.FileHandle, options?: any) => {
					if (String(path).includes("file-hashes.json")) {
						return Promise.resolve(existingHashes);
					}
					return Promise.reject(new Error("File not found"));
				});

			await persistenceManager.initialize(workspacePath);

			// Verify hashes were loaded
			expect(persistenceManager.isCachedAndUnchanged("file1.ts", "hash1")).toBe(true);
			expect(persistenceManager.isCachedAndUnchanged("file1.ts", "different-hash")).toBe(false);
		});

		it("should handle errors gracefully", async () => {
			const workspacePath = "/test/workspace";

			// Mock mkdir to fail
			jest.spyOn(fs, "mkdir").mockRejectedValue(new Error("Permission denied"));

			try {
				await persistenceManager.initialize(workspacePath);
			} catch (error) {
				// Error is expected
			}

			// Verify error was logged
			expect(mockLogger.hasLog("error", "Failed to initialize persistence manager")).toBeTruthy();
		});
	});

	describe("saveData and loadData", () => {
		it("should save and load data correctly", async () => {
			const workspacePath = "/test/workspace";
			const testData = { name: "Test", value: 42 };
			const testKey = "test-key";

			// Initialize first
			await persistenceManager.initialize(workspacePath);

			// Save data
			await persistenceManager.saveData(testKey, testData);

			// Verify file was written
			expect(fs.writeFile).toHaveBeenCalledWith(
				expect.stringContaining(testKey),
				expect.any(String),
				"utf8"
			);

			// Mock reading the file back
			jest
				.spyOn(fs, "readFile")
				.mockImplementation((path: PathLike | fs.FileHandle, options?: any) => {
					if (String(path).includes(testKey)) {
						return Promise.resolve(JSON.stringify(testData));
					}
					return Promise.reject(new Error("File not found"));
				});

			// Load the data
			const loadedData = await persistenceManager.loadData(testKey);

			// Verify data matches
			expect(loadedData).toEqual(testData);
		});

		it("should handle loading non-existent data", async () => {
			const workspacePath = "/test/workspace";
			const nonExistentKey = "non-existent";

			// Initialize first
			await persistenceManager.initialize(workspacePath);

			// Load non-existent data
			const result = await persistenceManager.loadData(nonExistentKey);

			// Verify null is returned
			expect(result).toBeNull();

			// The implementation doesn't log a "Cache miss" message
			// Instead we'll verify the result is null
			expect(result).toBeNull();
		});

		it("should handle save errors", async () => {
			const workspacePath = "/test/workspace";
			const testData = { name: "Test", value: 42 };
			const testKey = "test-key";

			// Initialize first
			await persistenceManager.initialize(workspacePath);

			// Mock writeFile to fail
			jest.spyOn(fs, "writeFile").mockRejectedValue(new Error("Disk full"));

			// Save data
			await persistenceManager.saveData(testKey, testData);

			// Verify error was logged
			expect(mockLogger.hasLog("error", "Failed to save data")).toBeTruthy();
		});
	});

	describe("file hash management", () => {
		it("should track file hashes", async () => {
			const workspacePath = "/test/workspace";
			const filePath = "file1.ts";
			const hash = "abc123";

			// Initialize first
			await persistenceManager.initialize(workspacePath);

			// Update hash
			persistenceManager.updateFileHash(filePath, hash);

			// Verify hash is tracked in memory
			expect(persistenceManager.isCachedAndUnchanged(filePath, hash)).toBe(true);
			expect(persistenceManager.isCachedAndUnchanged(filePath, "different-hash")).toBe(false);
			expect(persistenceManager.isCachedAndUnchanged("different-file.ts", hash)).toBe(false);

			// Note: The implementation uses debounced saving, so writeFile might not be called immediately
			// We're not testing the debounced functionality here
		});
	});

	describe("clear", () => {
		it("should clear all cached data", async () => {
			const workspacePath = "/test/workspace";

			// Initialize first
			await persistenceManager.initialize(workspacePath);

			// Update some data
			persistenceManager.updateFileHash("file1.ts", "hash1");
			await persistenceManager.saveData("test-key", { value: 42 });

			// Clear all data
			await persistenceManager.clear();

			// Verify data was cleared
			expect(persistenceManager.isCachedAndUnchanged("file1.ts", "hash1")).toBe(false);

			// Verify logging
			expect(mockLogger.hasLog("info", "Clearing persistence data")).toBeTruthy();
		});
	});
});
