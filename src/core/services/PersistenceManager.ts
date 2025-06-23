import { injectable, inject } from "inversify";
import * as fs from "fs/promises";
import * as path from "path";
import type { IPersistenceManager } from "../interfaces/IPersistenceManager";
import type { ILogger } from "../interfaces/ILogger";
import { TYPES } from "../../config/types";

/**
 * Implementation of persistence manager service
 */
@injectable()
export class PersistenceManager implements IPersistenceManager {
	private workspacePath: string = "";
	private cacheDir: string = "";
	private fileHashes: Map<string, string> = new Map();
	private inMemoryCache: Map<string, any> = new Map();

	/**
	 * Creates a new PersistenceManager
	 *
	 * @param logger - Logger service
	 */
	constructor(@inject(TYPES.Logger) private readonly logger: ILogger) {}

	/**
	 * Initialize persistence for workspace
	 * @param workspacePath - Path to workspace
	 */
	public async initialize(workspacePath: string): Promise<void> {
		this.logger.info(`Initializing persistence manager for ${workspacePath}`);
		this.workspacePath = workspacePath;

		// Setup cache directory
		this.cacheDir = path.join(workspacePath, ".mcp-cache");

		try {
			// Create cache directory if it doesn't exist
			await fs.mkdir(this.cacheDir, { recursive: true });

			// Load file hashes from disk
			await this.loadFileHashes();

			this.logger.info("Persistence manager initialized");
		} catch (error) {
			this.logger.error(
				"Failed to initialize persistence manager",
				error instanceof Error ? error : new Error(String(error))
			);
			throw error;
		}
	}

	/**
	 * Load file hashes from disk
	 */
	private async loadFileHashes(): Promise<void> {
		const hashFilePath = path.join(this.cacheDir, "file-hashes.json");

		try {
			const exists = await this.fileExists(hashFilePath);
			if (exists) {
				const content = await fs.readFile(hashFilePath, "utf8");
				const hashes = JSON.parse(content);

				// Convert to Map
				this.fileHashes = new Map(Object.entries(hashes));
				this.logger.info(`Loaded ${this.fileHashes.size} file hashes from cache`);
			} else {
				this.logger.info("No existing file hashes found");
			}
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.warn("Error loading file hashes, starting with empty cache", {
				errorMessage: err.message,
			});
			// Start with empty file hashes
			this.fileHashes = new Map();
		}
	}

	/**
	 * Save file hashes to disk
	 */
	private async saveFileHashes(): Promise<void> {
		if (!this.cacheDir) {
			return;
		}

		const hashFilePath = path.join(this.cacheDir, "file-hashes.json");

		try {
			// Convert Map to object for JSON serialization
			const hashObject = Object.fromEntries(this.fileHashes.entries());
			await fs.writeFile(hashFilePath, JSON.stringify(hashObject, null, 2), "utf8");
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.error("Failed to save file hashes", err);
		}
	}

	/**
	 * Check if file exists
	 */
	private async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Check if file hash is cached and unchanged
	 *
	 * @param filePath - Path to file
	 * @param currentHash - Current hash of file
	 * @returns True if hash matches cache
	 */
	public isCachedAndUnchanged(filePath: string, currentHash: string): boolean {
		const cachedHash = this.fileHashes.get(filePath);
		return cachedHash === currentHash;
	}

	/**
	 * Update file hash in cache
	 *
	 * @param filePath - Path to file
	 * @param hash - New hash value
	 */
	public updateFileHash(filePath: string, hash: string): void {
		this.fileHashes.set(filePath, hash);

		// Schedule saving to disk
		this.debouncedSaveFileHashes();
	}

	/**
	 * Debounced version of saveFileHashes to avoid excessive writes
	 */
	private debouncedSaveFileHashes = (() => {
		let timeoutId: NodeJS.Timeout | null = null;

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			timeoutId = setTimeout(() => {
				this.saveFileHashes();
				timeoutId = null;
			}, 1000);
		};
	})();

	/**
	 * Save data to persistent storage
	 *
	 * @param key - Storage key
	 * @param data - Data to store
	 */
	public async saveData<T>(key: string, data: T): Promise<void> {
		if (!this.cacheDir) {
			this.inMemoryCache.set(key, data);
			return;
		}

		try {
			// Store in memory cache
			this.inMemoryCache.set(key, data);

			// Persist to disk
			const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
			const filePath = path.join(this.cacheDir, `${sanitizedKey}.json`);

			await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
			this.logger.debug(`Saved data to ${filePath}`);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.error(`Failed to save data for key: ${key}`, err);
		}
	}

	/**
	 * Load data from persistent storage
	 *
	 * @param key - Storage key
	 * @returns Stored data or null if not found
	 */
	public async loadData<T>(key: string): Promise<T | null> {
		// First check memory cache
		if (this.inMemoryCache.has(key)) {
			return this.inMemoryCache.get(key) as T;
		}

		if (!this.cacheDir) {
			return null;
		}

		try {
			const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
			const filePath = path.join(this.cacheDir, `${sanitizedKey}.json`);

			const exists = await this.fileExists(filePath);
			if (!exists) {
				return null;
			}

			const content = await fs.readFile(filePath, "utf8");
			const data = JSON.parse(content) as T;

			// Cache in memory
			this.inMemoryCache.set(key, data);

			return data;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.error(`Failed to load data for key: ${key}`, err);
			return null;
		}
	}

	/**
	 * Clear persistence data
	 */
	public async clear(): Promise<void> {
		this.logger.info("Clearing persistence data");

		// Clear memory caches
		this.fileHashes.clear();
		this.inMemoryCache.clear();

		if (!this.cacheDir) {
			return;
		}

		try {
			// Check if directory exists
			const exists = await this.fileExists(this.cacheDir);
			if (exists) {
				// Remove all files in cache directory
				const files = await fs.readdir(this.cacheDir);

				await Promise.all(
					files.map((file) => {
						const filePath = path.join(this.cacheDir, file);
						return fs.unlink(filePath);
					})
				);

				this.logger.info(`Removed ${files.length} cache files`);
			}
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.error("Failed to clear cache directory", err);
		}
	}
}
