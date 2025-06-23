import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { IMcpWorkspaceTracker } from "../../core/interfaces/IMcpWorkspaceTracker";
import { SymbolKind } from "../../core/models/Symbol";

/**
 * Register all MCP tools
 * @param server - MCP Server instance
 * @param workspaceTracker - Workspace tracker service
 */
export function registerMcpTools(server: McpServer, workspaceTracker: IMcpWorkspaceTracker): void {
	const logger = workspaceTracker.getLogger();
	const symbolIndexer = workspaceTracker.getSymbolIndexer();
	const workspaceScanner = workspaceTracker.getWorkspaceScanner();

	// Register symbol search tool
	server.registerTool(
		"search-symbols",
		{
			title: "Search Symbols",
			description: "Search for symbols in the workspace",
			inputSchema: {
				query: z.string().describe("Search query for symbols"),
				kind: z
					.enum([
						SymbolKind.CLASS,
						SymbolKind.INTERFACE,
						SymbolKind.FUNCTION,
						SymbolKind.METHOD,
						SymbolKind.PROPERTY,
						SymbolKind.VARIABLE,
						SymbolKind.ENUM,
						SymbolKind.TYPE_ALIAS,
						SymbolKind.NAMESPACE,
						SymbolKind.MODULE,
					])
					.optional()
					.describe("Type of symbol to search for"),
			},
		},
		async ({ query, kind }) => {
			logger.debug("Searching symbols", { query, kind });
			try {
				const symbols = await symbolIndexer.searchSymbols(query, kind);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(symbols, null, 2),
						},
					],
				};
			} catch (error) {
				logger.error("Failed to search symbols", error instanceof Error ? error : undefined);
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: `Failed to search symbols: ${
								error instanceof Error ? error.message : String(error)
							}`,
						},
					],
				};
			}
		}
	);

	// Register workspace scan tool
	server.registerTool(
		"scan-workspace",
		{
			title: "Scan Workspace",
			description: "Scan the workspace to update the file and symbol index",
			inputSchema: {
				path: z.string().optional().describe("Optional path to scan, defaults to full workspace"),
			},
		},
		async ({ path }) => {
			try {
				const scanPath = path || process.cwd();
				logger.info("Scanning workspace", { path: scanPath });

				const files = await workspaceScanner.scanWorkspace(scanPath);
				await symbolIndexer.indexFiles(files.map((file) => file.path));

				return {
					content: [
						{
							type: "text",
							text: `Successfully scanned workspace at ${scanPath}. Found ${files.length} files.`,
						},
					],
				};
			} catch (error) {
				logger.error(
					"Failed to scan workspace",
					error instanceof Error ? error : new Error(String(error))
				);
				return {
					content: [
						{
							type: "text",
							text: `Failed to scan workspace: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);
}
