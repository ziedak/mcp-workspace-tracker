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
// Phase 2 imports - interfaces only for now (implementations will be added later)
import type { IClassHierarchyBuilder } from "../core/interfaces/IClassHierarchyBuilder";
import type { IDependencyGraphBuilder } from "../core/interfaces/IDependencyGraphBuilder";
import { ClassHierarchyBuilder } from "../core/services/ClassHierarchyBuilder";

/**
 * Singleton container instance for dependency injection
 */
const container = new Container({
	defaultScope: "Singleton",
	skipBaseClassChecks: false,
});

// Configure server details
const serverConfig: IMcpServerConfig = {
	name: "mcp-workspace-tracker",
	version: "1.0.0",
};

// Phase 1 service bindings
container.bind<ILogger>(TYPES.Logger).to(Logger);
container.bind<IWorkspaceScanner>(TYPES.WorkspaceScanner).to(WorkspaceScanner);
container.bind<ISymbolIndexer>(TYPES.SymbolIndexer).to(SymbolIndexer);
container.bind<IPersistenceManager>(TYPES.PersistenceManager).to(PersistenceManager);
container.bind<IMcpServerConfig>(TYPES.McpServerConfig).toConstantValue(serverConfig);
container.bind<IMcpWorkspaceTracker>(TYPES.McpWorkspaceTracker).to(McpWorkspaceTracker);

// Phase 2 service bindings
// Note: Transport classes are now created directly via TransportFactory (no DI needed)
container.bind<IClassHierarchyBuilder>(TYPES.ClassHierarchyBuilder).to(ClassHierarchyBuilder);
// TODO: Add DependencyGraphBuilder binding when implementation is ready
// container.bind<IDependencyGraphBuilder>(TYPES.DependencyGraphBuilder).to(DependencyGraphBuilder);

// Export the singleton container instance
export { container };
