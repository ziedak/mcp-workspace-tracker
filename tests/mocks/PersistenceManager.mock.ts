import { IPersistenceManager } from "../../src/core/interfaces/IPersistenceManager";

/**
 * Mock implementation of PersistenceManager for integration tests
 * This prevents file system errors during test cleanup
 */
export class MockPersistenceManager implements IPersistenceManager {
	private fileHashes: Map<string, string> = new Map();
	private dataCache: Map<string, any> = new Map();
	private workspacePath: string = "";

	public async initialize(workspacePath: string): Promise<void> {
		this.workspacePath = workspacePath;
	}

	public isCachedAndUnchanged(filePath: string, currentHash: string): boolean {
		const cachedHash = this.fileHashes.get(filePath);
		return cachedHash === currentHash;
	}

	public updateFileHash(filePath: string, hash: string): void {
		this.fileHashes.set(filePath, hash);
	}

	public async saveData<T>(key: string, data: T): Promise<void> {
		this.dataCache.set(key, data);
	}

	public async loadData<T>(key: string): Promise<T | null> {
		if (this.dataCache.has(key)) {
			return this.dataCache.get(key) as T;
		}
		return null;
	}

	public async clear(): Promise<void> {
		this.fileHashes.clear();
		this.dataCache.clear();
	}
}
