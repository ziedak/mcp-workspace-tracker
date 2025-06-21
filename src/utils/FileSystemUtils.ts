/**
 * FileSystemUtils class
 * Utility functions for file system operations
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/**
 * Utility class for file system operations
 */
export class FileSystemUtils {
	/**
	 * Calculate a hash for a file's contents
	 * @param filePath Path to the file
	 * @returns Promise resolving to hash string
	 */
	public async calculateFileHash(filePath: string): Promise<string> {
		try {
			const fileContent = await fs.promises.readFile(filePath);
			return crypto.createHash("md5").update(fileContent).digest("hex");
		} catch (error) {
			console.error(
				`Error calculating hash for ${filePath}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
			throw error;
		}
	}

	/**
	 * Ensure a directory exists, creating it if necessary
	 * @param dirPath Path to the directory
	 */
	public async ensureDirectoryExists(dirPath: string): Promise<void> {
		try {
			await fs.promises.mkdir(dirPath, { recursive: true });
		} catch (error) {
			console.error(
				`Error creating directory ${dirPath}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
			throw error;
		}
	}

	/**
	 * Check if a file exists
	 * @param filePath Path to the file
	 * @returns Promise resolving to boolean
	 */
	public async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.promises.access(filePath, fs.constants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get file stats
	 * @param filePath Path to the file
	 * @returns Promise resolving to fs.Stats
	 */
	public async getFileStats(filePath: string): Promise<fs.Stats> {
		try {
			return await fs.promises.stat(filePath);
		} catch (error) {
			console.error(
				`Error getting stats for ${filePath}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
			throw error;
		}
	}

	/**
	 * Read a JSON file
	 * @param filePath Path to the JSON file
	 * @returns Promise resolving to parsed JSON object
	 */
	public async readJsonFile<T>(filePath: string): Promise<T> {
		try {
			const content = await fs.promises.readFile(filePath, "utf8");
			return JSON.parse(content) as T;
		} catch (error) {
			console.error(
				`Error reading JSON file ${filePath}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
			throw error;
		}
	}

	/**
	 * Write a JSON file
	 * @param filePath Path to the JSON file
	 * @param data Data to write
	 */
	public async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
		try {
			const content = JSON.stringify(data, null, 2);
			await this.ensureDirectoryExists(path.dirname(filePath));
			await fs.promises.writeFile(filePath, content, "utf8");
		} catch (error) {
			console.error(
				`Error writing JSON file ${filePath}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
			throw error;
		}
	}
}
