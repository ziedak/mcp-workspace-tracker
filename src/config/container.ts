import "reflect-metadata";
import { Container } from "inversify";
import { ILogger } from "../core/interfaces/ILogger";
import { Logger } from "../core/services/Logger";
import { TYPES } from "./types";
import { IWorkspaceScanner } from "../core/interfaces/IWorkspaceScanner";
import { WorkspaceScanner } from "../core/services/WorkspaceScanner";
import { ISymbolIndexer } from "../core/interfaces/ISymbolIndexer";
import { SymbolIndexer } from "../core/services/SymbolIndexer";
import { IPersistenceManager } from "../core/interfaces/IPersistenceManager";
import { PersistenceManager } from "../core/services/PersistenceManager";
import { IMcpWorkspaceTracker, IMcpServerConfig } from "../core/interfaces/IMcpWorkspaceTracker";
import { McpWorkspaceTracker } from "../core/services/McpWorkspaceTracker";

// Create a singleton container instance
const container = new Container({
	defaultScope: "Singleton",
	skipBaseClassChecks: false,
});

/**
 * Configure dependency injection container
 */
export function configureContainer(): Container {
	// Configure server details
	const serverConfig: IMcpServerConfig = {
		name: "mcp-workspace-tracker",
		version: "1.0.0",
	};

	// Bind services
	container.bind<ILogger>(TYPES.Logger).to(Logger);
	container.bind<IWorkspaceScanner>(TYPES.WorkspaceScanner).to(WorkspaceScanner);
	container.bind<ISymbolIndexer>(TYPES.SymbolIndexer).to(SymbolIndexer);
	container.bind<IPersistenceManager>(TYPES.PersistenceManager).to(PersistenceManager);
	container.bind<IMcpServerConfig>(TYPES.McpServerConfig).toConstantValue(serverConfig);
	container.bind<IMcpWorkspaceTracker>(TYPES.McpWorkspaceTracker).to(McpWorkspaceTracker);

	return container;
}

// Export the container instance
export { container };

// Initialize the container
configureContainer();
