/**
 * Symbol constants for dependency injection
 */
export const TYPES = {
	Logger: Symbol.for("Logger"),
	WorkspaceScanner: Symbol.for("WorkspaceScanner"),
	SymbolIndexer: Symbol.for("SymbolIndexer"),
	PersistenceManager: Symbol.for("PersistenceManager"),
	McpServerConfig: Symbol.for("McpServerConfig"),
	McpWorkspaceTracker: Symbol.for("McpWorkspaceTracker"),
};
