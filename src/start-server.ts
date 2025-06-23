#!/usr/bin/env node

import path from "path";
import { container } from "./config/container";
import { TYPES } from "./config/types";
import { IMcpWorkspaceTracker } from "./core/interfaces/IMcpWorkspaceTracker";
import { ILogger } from "./core/interfaces/ILogger";
import { startMcpServer } from "./index";

/**
 * Entry point for the MCP workspace tracker server
 */
async function main(): Promise<void> {
	try {
		// Get workspace path from arguments or use current directory
		const workspacePath = process.argv[2] || process.cwd();
		const absoluteWorkspacePath = path.resolve(workspacePath);

		// Get services from DI container
		const logger = container.get<ILogger>(TYPES.Logger);
		const workspaceTracker = container.get<IMcpWorkspaceTracker>(TYPES.McpWorkspaceTracker);

		// Log startup information
		logger.info(`MCP Workspace Tracker starting...`);
		logger.info(`Workspace path: ${absoluteWorkspacePath}`);

		// Initialize the workspace tracker
		await workspaceTracker.initialize(absoluteWorkspacePath);

		// Initialize and start the MCP server using standard import
		await startMcpServer(workspaceTracker);

		logger.info(`MCP Workspace Tracker server started successfully`);
	} catch (error) {
		console.error("Failed to start MCP Workspace Tracker server:");
		console.error(error);
		process.exit(1);
	}
}

// Run the main function
main().catch((error) => {
	console.error("Unhandled error:");
	console.error(error);
	process.exit(1);
});
