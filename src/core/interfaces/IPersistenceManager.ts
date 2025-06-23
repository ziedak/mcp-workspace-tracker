/**
 * Interface for persistence manager
 */
export interface IPersistenceManager {
	/**
	 * Initialize persistence for workspace
	 * @param workspacePath - Path to workspace
	 * @returns Promise resolving when initialization completes
	 */
	initialize(workspacePath: string): Promise<void>;

	/**
	 * Check if file hash is cached and unchanged
	 * @param filePath - Path to file
	 * @param currentHash - Current hash of file
	 * @returns True if hash matches cache
	 */
	isCachedAndUnchanged(filePath: string, currentHash: string): boolean;

	/**
	 * Update file hash in cache
	 * @param filePath - Path to file
	 * @param hash - New hash value
	 */
	updateFileHash(filePath: string, hash: string): void;

	/**
	 * Save data to persistent storage
	 * @param key - Storage key
	 * @param data - Data to store
	 * @returns Promise resolving when save completes
	 */
	saveData<T>(key: string, data: T): Promise<void>;

	/**
	 * Load data from persistent storage
	 * @param key - Storage key
	 * @returns Promise with stored data or null if not found
	 */
	loadData<T>(key: string): Promise<T | null>;

	/**
	 * Clear persistence data
	 * @returns Promise resolving when clear completes
	 */
	clear(): Promise<void>;
}
