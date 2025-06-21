/**
 * PersistenceManager class
 * Responsible for saving and loading cached results
 */

import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { FileSystemUtils } from "../utils/FileSystemUtils";

/**
 * Interface for file hash map
 */
interface FileHashMap {
	[filePath: string]: string;
}

/**
 * Interface for cached workspace data
 */
interface CachedWorkspace {
	version: string;
	timestamp: number;
	fileHashes: FileHashMap;
}

/**
 * PersistenceManager class for handling caching of workspace data
 */
export class PersistenceManager {
	private cacheDirName = ".mcp-cache";
	private cacheVersion = "0.1.0";
	private workspacePath: string = "";
	private cachePath: string = "";
	private fileUtils: FileSystemUtils;
	private fileHashes: FileHashMap = {};

	/**
	 * Constructor for PersistenceManager
	 */
	constructor() {
		this.fileUtils = new FileSystemUtils();
	}

	/**
	 * Initialize the persistence manager for a workspace
	 * @param workspacePath The root path of the workspace
	 */
	public async initialize(workspacePath: string): Promise<void> {
		this.workspacePath = workspacePath;

		// Use a cache directory inside /app which is owned by the mcp user
		const workspaceHash = crypto.createHash("md5").update(workspacePath).digest("hex");
		this.cachePath = path.join("/app/cache", workspaceHash);

		// Create cache directory if it doesn't exist
		await this.fileUtils.ensureDirectoryExists(this.cachePath);

		// Try to load existing cache data
		await this.loadCacheData();

		console.log(`PersistenceManager initialized for workspace: ${workspacePath}`);
		console.log(`Cache directory: ${this.cachePath}`);
	}

	/**
	 * Check if a file has changed since last cached
	 * @param filePath Path to the file
	 * @returns Promise resolving to boolean indicating if file changed
	 */
	public async hasFileChanged(filePath: string): Promise<boolean> {
		try {
			// Calculate current hash
			const currentHash = await this.fileUtils.calculateFileHash(filePath);

			// Check if we have a previous hash
			const previousHash = this.fileHashes[filePath];

			if (!previousHash) {
				// New file, store its hash
				this.fileHashes[filePath] = currentHash;
				return true;
			}

			// Compare hashes
			const hasChanged = currentHash !== previousHash;

			// Update hash if changed
			if (hasChanged) {
				this.fileHashes[filePath] = currentHash;
			}

			return hasChanged;
		} catch (error) {
			console.error(
				`Error checking if file changed: ${error instanceof Error ? error.message : String(error)}`
			);
			return true; // Assume changed on error
		}
	}

	/**
	 * Save cache data for the workspace
	 */
	public async saveCacheData(): Promise<void> {
		try {
			const cacheData: CachedWorkspace = {
				version: this.cacheVersion,
				timestamp: Date.now(),
				fileHashes: this.fileHashes,
			};

			const metaFilePath = path.join(this.cachePath, "meta.json");
			await this.fileUtils.writeJsonFile(metaFilePath, cacheData);

			console.log(`Cache data saved to ${metaFilePath}`);
		} catch (error) {
			console.error(
				`Error saving cache data: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Save data for a specific component
	 * @param componentName The name of the component (e.g., 'symbolIndex')
	 * @param data The data to save
	 */
	public async saveComponentData<T>(componentName: string, data: T): Promise<void> {
		try {
			const componentFilePath = path.join(this.cachePath, `${componentName}.json`);
			await this.fileUtils.writeJsonFile(componentFilePath, data);

			console.log(`Component data saved to ${componentFilePath}`);
		} catch (error) {
			console.error(
				`Error saving component data: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Load data for a specific component
	 * @param componentName The name of the component (e.g., 'symbolIndex')
	 * @returns Promise resolving to the loaded data, or null if not found
	 */
	public async loadComponentData<T>(componentName: string): Promise<T | null> {
		try {
			const componentFilePath = path.join(this.cachePath, `${componentName}.json`);

			// Check if file exists
			const exists = await this.fileUtils.fileExists(componentFilePath);
			if (!exists) {
				console.log(`No cache found for component ${componentName}`);
				return null;
			}

			// Load and parse data
			const data = await this.fileUtils.readJsonFile<T>(componentFilePath);
			console.log(`Loaded cache data for component ${componentName}`);

			return data;
		} catch (error) {
			console.error(
				`Error loading component data: ${error instanceof Error ? error.message : String(error)}`
			);
			return null;
		}
	}

	/**
	 * Get the path to the cache directory
	 * @returns Path to the cache directory
	 */
	public getCachePath(): string {
		return this.cachePath;
	}

	/**
	 * Load cache metadata from disk
	 */
	private async loadCacheData(): Promise<void> {
		try {
			const metaFilePath = path.join(this.cachePath, "meta.json");

			// Check if meta file exists
			const exists = await this.fileUtils.fileExists(metaFilePath);
			if (!exists) {
				console.log("No cache metadata found. Starting with empty cache.");
				this.fileHashes = {};
				return;
			}

			// Load and parse metadata
			const cacheData = await this.fileUtils.readJsonFile<CachedWorkspace>(metaFilePath);

			// Check version compatibility
			if (cacheData.version !== this.cacheVersion) {
				console.log(
					`Cache version mismatch (found ${cacheData.version}, expected ${this.cacheVersion}). Starting with empty cache.`
				);
				this.fileHashes = {};
				return;
			}

			// Load file hashes
			this.fileHashes = cacheData.fileHashes;

			console.log(
				`Loaded cache metadata. Contains ${Object.keys(this.fileHashes).length} file hashes.`
			);
		} catch (error) {
			console.error(
				`Error loading cache metadata: ${error instanceof Error ? error.message : String(error)}`
			);
			this.fileHashes = {};
		}
	}
}
