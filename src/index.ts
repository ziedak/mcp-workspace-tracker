import 'reflect-metadata';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { configureContainer } from './config/container';
import { TYPES } from './config/types';
import { IMcpWorkspaceTracker } from './core/interfaces/IMcpWorkspaceTracker';
import { registerMcpResources } from './adapters/mcp/resources';
import { registerMcpTools } from './adapters/mcp/tools';

/**
 * Start the MCP server with the provided workspace tracker instance
 * @param workspaceTracker - Initialized workspace tracker instance
 */
export async function startMcpServer(workspaceTracker: IMcpWorkspaceTracker): Promise<McpServer> {
  const logger = workspaceTracker.getLogger();
  const config = workspaceTracker.getConfig();
  
  logger.info('Starting MCP Server', {
    name: config.name,
    version: config.version
  });
  
  // Create MCP server
  const server = new McpServer({
    name: config.name,
    version: config.version
  });
  
  // Register MCP resources and tools
  registerMcpResources(server, workspaceTracker);
  registerMcpTools(server, workspaceTracker);
  
  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logger.info('MCP Server started and connected via stdio transport');
  
  return server;
}

/**
 * Main entry point for direct execution
 */
async function main(): Promise<void> {
  try {
    // Initialize dependency injection
    const container = configureContainer();
    
    // Get application services
    const workspaceTracker = container.get<IMcpWorkspaceTracker>(TYPES.McpWorkspaceTracker);
    const logger = workspaceTracker.getLogger();
    
    // Initialize workspace with current directory
    await workspaceTracker.initialize(process.cwd());
    
    // Start MCP server
    await startMcpServer(workspaceTracker);
  } catch (error) {
    console.error('Failed to initialize MCP server:', error);
    process.exit(1);
  }
}

// Execute main function when file is run directly
if (require.main === module) {
  main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}
