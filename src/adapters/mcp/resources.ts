import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IMcpWorkspaceTracker } from "../../core/interfaces/IMcpWorkspaceTracker";

/**
 * Register all MCP resources
 * @param server - MCP Server instance
 * @param workspaceTracker - Workspace tracker service
 */
export function registerMcpResources(
	server: McpServer,
	workspaceTracker: IMcpWorkspaceTracker
): void {
	const logger = workspaceTracker.getLogger();
	const workspaceScanner = workspaceTracker.getWorkspaceScanner();

	// Register workspace info resource
	server.registerResource(
		"workspace-info",
		"workspace://info",
		{
			title: "Workspace Information",
			description: "Information about the current workspace",
			mimeType: "text/plain",
		},
		async (uri: URL) => {
			try {
				logger.debug("Retrieving workspace information");
				const workspaceStats = await workspaceScanner.getWorkspaceStats();

				const content = `Workspace Statistics:
- Total Files: ${workspaceStats.totalFiles}
- Source Files: ${workspaceStats.sourceFiles}
- Test Files: ${workspaceStats.testFiles}
- Configuration Files: ${workspaceStats.configFiles}
- Other Files: ${workspaceStats.otherFiles}
`;

				return {
					contents: [
						{
							uri: uri.href,
							text: content,
						},
					],
				};
			} catch (error) {
				logger.error(
					"Failed to retrieve workspace information",
					error instanceof Error ? error : new Error(String(error))
				);
				throw new Error(`Failed to retrieve workspace information: ${error}`);
			}
		}
	);

	// Register file list resource
	server.registerResource(
		"files",
		new ResourceTemplate("files://{pattern}", { list: undefined }),
		{
			title: "Workspace Files",
			description: "List of files in the workspace matching a pattern",
			mimeType: "text/plain",
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		async (uri: URL, extra: any) => {
			try {
				const pattern = extra.parameters?.pattern || "*";
				logger.debug("Listing files matching pattern", { pattern });
				const files = await workspaceScanner.findFiles(pattern);
				const content = files.map((file) => file.relativePath).join("\n");

				return {
					contents: [
						{
							uri: uri.href,
							text: content,
						},
					],
				};
			} catch (error) {
				logger.error(
					"Failed to list files",
					error instanceof Error ? error : new Error(String(error))
				);
				throw new Error(`Failed to list files: ${error}`);
			}
		}
	);

	// Register file contents resource
	server.registerResource(
		"file-contents",
		new ResourceTemplate("file://{path}", { list: undefined }),
		{
			title: "File Contents",
			description: "Contents of a specific file in the workspace",
			mimeType: "text/plain",
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		async (uri: URL, extra: any) => {
			const path = extra.parameters?.path || "";
			try {
				logger.debug("Reading file contents", { path });
				const content = await workspaceScanner.readFile(path);

				return {
					contents: [
						{
							uri: uri.href,
							text: content,
						},
					],
				};
			} catch (error) {
				logger.error(
					`Error reading file ${path}`,
					error instanceof Error ? error : new Error(String(error))
				);
				throw new Error(`Failed to read file: ${path}`);
			}
		}
	);
}
