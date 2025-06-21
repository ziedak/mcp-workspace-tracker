/**
 * MCP Server for VSCode + Copilot Agent Mode
 * Main entry point
 */

import { WorkspaceScanner } from "./core/WorkspaceScanner";
import { SymbolIndexer } from "./core/SymbolIndexer";
import { PersistenceManager } from "./persistence/PersistenceManager";
import { MCPProtocolHandler } from "./protocol/MCPProtocolHandler";

/**
 * Main class for the MCP Workspace Tracker
 */
class MCPWorkspaceTracker {
	private workspaceScanner: WorkspaceScanner;
	private symbolIndexer: SymbolIndexer;
	private persistenceManager: PersistenceManager;
	private protocolHandler: MCPProtocolHandler;

	constructor() {
		this.persistenceManager = new PersistenceManager();
		this.workspaceScanner = new WorkspaceScanner();
		this.symbolIndexer = new SymbolIndexer();
		this.protocolHandler = new MCPProtocolHandler(
			this.workspaceScanner,
			this.symbolIndexer,
			this.persistenceManager
		);
	}

	/**
	 * Initialize the workspace tracker
	 * @param workspacePath The path to the workspace
	 */
	public async initialize(workspacePath: string): Promise<void> {
		console.log(`Initializing MCP Workspace Tracker for ${workspacePath}`);

		// Initialize persistence system
		await this.persistenceManager.initialize(workspacePath);

		// Scan the workspace
		const files = await this.workspaceScanner.scanWorkspace(workspacePath);
		console.log(`Found ${files.length} files in workspace`);

		// Index symbols
		await this.symbolIndexer.indexWorkspace(files);

		// Start the protocol handler
		this.protocolHandler.startServer();

		console.log("MCP Workspace Tracker initialization complete");
	}
}

// Export the main class
export { MCPWorkspaceTracker };

// If this script is run directly, create an instance and initialize with args
if (require.main === module) {
	const workspaceTracker = new MCPWorkspaceTracker();
	const workspacePath = process.argv[2] || process.cwd();
	workspaceTracker.initialize(workspacePath).catch((err) => {
		console.error("Failed to initialize workspace tracker:", err);
		process.exit(1);
	});
}
