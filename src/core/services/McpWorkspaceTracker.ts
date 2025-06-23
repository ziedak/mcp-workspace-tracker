import { injectable, inject } from "inversify";
import { ILogger } from "../interfaces/ILogger";
import { IWorkspaceScanner } from "../interfaces/IWorkspaceScanner";
import { ISymbolIndexer } from "../interfaces/ISymbolIndexer";
import { IPersistenceManager } from "../interfaces/IPersistenceManager";
import { IMcpWorkspaceTracker, IMcpServerConfig } from "../interfaces/IMcpWorkspaceTracker";
import { TYPES } from "../../config/types";

/**
 * Main workspace tracker service implementation
 */
@injectable()
export class McpWorkspaceTracker implements IMcpWorkspaceTracker {
	/**
	 * Creates a new McpWorkspaceTracker
	 *
	 * @param logger - Logger service
	 * @param workspaceScanner - Workspace scanner service
	 * @param symbolIndexer - Symbol indexer service
	 * @param persistenceManager - Persistence manager service
	 * @param config - Server configuration
	 */
	public constructor(
		@inject(TYPES.Logger) private readonly logger: ILogger,
		@inject(TYPES.WorkspaceScanner) private readonly workspaceScanner: IWorkspaceScanner,
		@inject(TYPES.SymbolIndexer) private readonly symbolIndexer: ISymbolIndexer,
		@inject(TYPES.PersistenceManager) private readonly persistenceManager: IPersistenceManager,
		@inject(TYPES.McpServerConfig) private readonly config: IMcpServerConfig
	) {}

	/**
	 * Initialize the workspace tracker
	 * @param workspacePath - Path to workspace
	 */
	public async initialize(workspacePath: string): Promise<void> {
		this.logger.info(`Initializing workspace tracker for ${workspacePath}`);

		try {
			// Initialize persistence system
			await this.persistenceManager.initialize(workspacePath);

			// Scan the workspace
			const files = await this.workspaceScanner.scanWorkspace(workspacePath);
			this.logger.info(`Found ${files.length} files in workspace`);

			// Index files to extract symbols
			await this.symbolIndexer.indexFiles(files.map((file) => file.path));

			this.logger.info("Workspace tracker initialization complete");
		} catch (error) {
			this.logger.error(
				"Failed to initialize workspace tracker",
				error instanceof Error ? error : new Error(String(error))
			);
			throw error;
		}
	}

	/**
	 * Get the workspace scanner instance
	 */
	public getWorkspaceScanner(): IWorkspaceScanner {
		return this.workspaceScanner;
	}

	/**
	 * Get the symbol indexer instance
	 */
	public getSymbolIndexer(): ISymbolIndexer {
		return this.symbolIndexer;
	}

	/**
	 * Get the persistence manager instance
	 */
	public getPersistenceManager(): IPersistenceManager {
		return this.persistenceManager;
	}

	/**
	 * Get the logger instance
	 */
	public getLogger(): ILogger {
		return this.logger;
	}

	/**
	 * Get the MCP server configuration
	 */
	public getConfig(): IMcpServerConfig {
		return this.config;
	}
}
