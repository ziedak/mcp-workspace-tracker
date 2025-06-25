import "reflect-metadata";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { container } from "./config/container"; // Import the already configured container
import { TYPES } from "./config/types";
import { IMcpWorkspaceTracker } from "./core/interfaces/IMcpWorkspaceTracker";
import { ITransportAdapter } from "./core/interfaces/ITransportAdapter";
import { registerMcpResources } from "./adapters/mcp/resources";
import { registerMcpTools } from "./adapters/mcp/tools";
import {
	TransportFactory,
	TransportType,
	TransportOptions,
} from "./adapters/transport/TransportFactory";

/**
 * Start the MCP server with the provided workspace tracker instance and transport
 * @param workspaceTracker - Initialized workspace tracker instance
 * @param transportType - Type of transport to use ('stdio' | 'http')
 * @param transportOptions - Configuration options for the transport
 */
export async function startMcpServer(
	workspaceTracker: IMcpWorkspaceTracker,
	transportType: TransportType = "stdio",
	transportOptions?: TransportOptions
): Promise<{ server: McpServer; transport: ITransportAdapter }> {
	const logger = workspaceTracker.getLogger();
	const config = workspaceTracker.getConfig();

	logger.info("Starting MCP Server", {
		name: config.name,
		version: config.version,
		transport: transportType,
	});

	// Create MCP server
	const server = new McpServer({
		name: config.name,
		version: config.version,
	});

	// Register MCP resources and tools
	registerMcpResources(server, workspaceTracker);
	registerMcpTools(server, workspaceTracker);

	// Create and connect transport
	const transport = TransportFactory.create(transportType, transportOptions);
	await transport.connect(server);

	logger.info("MCP Server started and connected", {
		transport: transport.getType(),
		address: transport.getAddress?.() || null,
	});

	return { server, transport };
}

/**
 * Main entry point for direct execution (stdio transport)
 */
async function main(): Promise<void> {
	try {
		// Get application services from the already configured container
		// imported at the top of the file (no need to call configureContainer again)
		const workspaceTracker = container.get<IMcpWorkspaceTracker>(TYPES.McpWorkspaceTracker);
		const logger = workspaceTracker.getLogger();

		// Initialize workspace with current directory
		await workspaceTracker.initialize(process.cwd());

		// Start MCP server with stdio transport (default)
		await startMcpServer(workspaceTracker, "stdio");
	} catch (error) {
		console.error("Failed to initialize MCP server:", error);
		process.exit(1);
	}
}

// Execute main function when file is run directly
if (require.main === module) {
	main().catch((err) => {
		console.error("Unhandled error:", err);
		process.exit(1);
	});
}
if (require.main === module) {
	main().catch((err) => {
		console.error("Unhandled error:", err);
		process.exit(1);
	});
}
