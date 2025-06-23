import { IPersistenceManager } from "../../src/core/interfaces/IPersistenceManager";

/**
 * Mock implementation of IPersistenceManager for testing
 */
export class MockPersistenceManager implements IPersistenceManager {
	private data: Map<string, any> = new Map();
	private fileHashes: Map<string, string> = new Map();
	private workspacePath: string = "";

	async initialize(workspacePath: string): Promise<void> {
		this.workspacePath = workspacePath;
		return Promise.resolve();
	}

	async saveData<T>(key: string, data: T): Promise<void> {
		this.data.set(key, JSON.parse(JSON.stringify(data)));
	}

	async loadData<T>(key: string): Promise<T | null> {
		return this.data.get(key) || null;
	}

	updateFileHash(filePath: string, hash: string): void {
		this.fileHashes.set(filePath, hash);
	}

	isCachedAndUnchanged(filePath: string, hash: string): boolean {
		return this.fileHashes.get(filePath) === hash;
	}

	/**
	 * Helper to get all stored data
	 */
	getAllData(): Map<string, any> {
		return new Map(this.data);
	}

	/**
	 * Helper to get all file hashes
	 */
	getFileHashes(): Map<string, string> {
		return new Map(this.fileHashes);
	}

	/**
	 * Clear all stored data
	 */
	clear(): Promise<void> {
		this.data.clear();
		this.fileHashes.clear();
		return Promise.resolve();
	}
}
