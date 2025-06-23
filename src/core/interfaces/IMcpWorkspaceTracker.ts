import { IWorkspaceScanner } from "../interfaces/IWorkspaceScanner";
import { ISymbolIndexer } from "../interfaces/ISymbolIndexer";
import { IPersistenceManager } from "../interfaces/IPersistenceManager";
import { ILogger } from "../interfaces/ILogger";

/**
 * Interface for MCP server configuration
 */
export interface IMcpServerConfig {
	name: string;
	version: string;
}

/**
 * Interface for MCP workspace tracker service
 */
export interface IMcpWorkspaceTracker {
	/**
	 * Initialize the workspace tracker
	 * @param workspacePath - Path to workspace
	 * @returns Promise resolving when initialization completes
	 */
	initialize(workspacePath: string): Promise<void>;

	/**
	 * Get the workspace scanner instance
	 */
	getWorkspaceScanner(): IWorkspaceScanner;

	/**
	 * Get the symbol indexer instance
	 */
	getSymbolIndexer(): ISymbolIndexer;

	/**
	 * Get the persistence manager instance
	 */
	getPersistenceManager(): IPersistenceManager;

	/**
	 * Get the logger instance
	 */
	getLogger(): ILogger;

	/**
	 * Get the MCP server configuration
	 */
	getConfig(): IMcpServerConfig;
}
