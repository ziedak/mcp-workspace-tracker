/**
 * MCPProtocolHandler class
 * Handles MCP protocol requests and responses
 */

import * as http from "http";
import { WorkspaceScanner } from "../core/WorkspaceScanner";
import { SymbolIndexer } from "../core/SymbolIndexer";
import { PersistenceManager } from "../persistence/PersistenceManager";

/**
 * Interface for MCP protocol request
 */
interface MCPRequest {
	method: string;
	params?: any;
}

/**
 * Interface for MCP protocol response
 */
interface MCPResponse {
	result?: any;
	error?: {
		code: number;
		message: string;
	};
}

/**
 * MCPProtocolHandler class for handling MCP protocol requests
 */
export class MCPProtocolHandler {
	private server: http.Server | null = null;
	private port = 7860; // Default port for MCP server
	private workspaceScanner: WorkspaceScanner;
	private symbolIndexer: SymbolIndexer;
	private persistenceManager: PersistenceManager;

	/**
	 * Constructor for MCPProtocolHandler
	 * @param workspaceScanner WorkspaceScanner instance
	 * @param symbolIndexer SymbolIndexer instance
	 * @param persistenceManager PersistenceManager instance
	 */
	constructor(
		workspaceScanner: WorkspaceScanner,
		symbolIndexer: SymbolIndexer,
		persistenceManager: PersistenceManager
	) {
		this.workspaceScanner = workspaceScanner;
		this.symbolIndexer = symbolIndexer;
		this.persistenceManager = persistenceManager;
	}

	/**
	 * Start the MCP server
	 */
	public startServer(): void {
		if (this.server) {
			console.log("Server already running");
			return;
		}

		this.server = http.createServer((req, res) => this.handleRequest(req, res));

		this.server.listen(this.port, () => {
			console.log(`MCP Protocol server running on port ${this.port}`);
		});

		this.server.on("error", (err) => {
			console.error("Server error:", err);
		});
	}

	/**
	 * Stop the MCP server
	 */
	public stopServer(): void {
		if (!this.server) {
			console.log("No server running");
			return;
		}

		this.server.close(() => {
			console.log("MCP Protocol server stopped");
			this.server = null;
		});
	}

	/**
	 * Handle HTTP request
	 * @param req HTTP request object
	 * @param res HTTP response object
	 */
	private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
		// Set CORS headers
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type");

		// Handle OPTIONS request (CORS preflight)
		if (req.method === "OPTIONS") {
			res.writeHead(204);
			res.end();
			return;
		}

		// Only accept POST requests
		if (req.method !== "POST") {
			res.writeHead(405);
			res.end("Method Not Allowed");
			return;
		}

		// Parse request body
		try {
			const body = await this.parseRequestBody(req);
			const request: MCPRequest = JSON.parse(body);

			// Process the request
			const response = await this.processRequest(request);

			// Send response
			res.setHeader("Content-Type", "application/json");
			res.writeHead(200);
			res.end(JSON.stringify(response));
		} catch (error) {
			console.error("Error handling request:", error);

			// Send error response
			const errorResponse: MCPResponse = {
				error: {
					code: 500,
					message: `Internal server error: ${
						error instanceof Error ? error.message : String(error)
					}`,
				},
			};

			res.setHeader("Content-Type", "application/json");
			res.writeHead(500);
			res.end(JSON.stringify(errorResponse));
		}
	}

	/**
	 * Parse request body
	 * @param req HTTP request object
	 * @returns Promise resolving to body string
	 */
	private parseRequestBody(req: http.IncomingMessage): Promise<string> {
		return new Promise((resolve, reject) => {
			let body = "";

			req.on("data", (chunk) => {
				body += chunk.toString();
			});

			req.on("end", () => {
				resolve(body);
			});

			req.on("error", (err) => {
				reject(err);
			});
		});
	}

	/**
	 * Process MCP request
	 * @param request MCP request object
	 * @returns MCP response object
	 */
	private async processRequest(request: MCPRequest): Promise<MCPResponse> {
		console.log(`Processing MCP request: ${request.method}`);

		try {
			switch (request.method) {
				case "getWorkspaceStructure":
					return await this.handleGetWorkspaceStructure(request.params);

				case "getSymbolInfo":
					return await this.handleGetSymbolInfo(request.params);

				case "getFileSymbols":
					return await this.handleGetFileSymbols(request.params);

				default:
					return {
						error: {
							code: 404,
							message: `Method not found: ${request.method}`,
						},
					};
			}
		} catch (error) {
			console.error(`Error processing request ${request.method}:`, error);
			return {
				error: {
					code: 500,
					message: `Error processing request: ${
						error instanceof Error ? error.message : String(error)
					}`,
				},
			};
		}
	}

	/**
	 * Handle getWorkspaceStructure request
	 * @param params Request parameters
	 * @returns MCP response object
	 */
	private async handleGetWorkspaceStructure(params: any): Promise<MCPResponse> {
		try {
			const workspacePath = params?.workspacePath || process.cwd();
			const files = await this.workspaceScanner.scanWorkspace(workspacePath);

			return {
				result: {
					workspacePath,
					files,
				},
			};
		} catch (error) {
			return {
				error: {
					code: 500,
					message: `Error getting workspace structure: ${
						error instanceof Error ? error.message : String(error)
					}`,
				},
			};
		}
	}

	/**
	 * Handle getSymbolInfo request
	 * @param params Request parameters
	 * @returns MCP response object
	 */
	private async handleGetSymbolInfo(params: any): Promise<MCPResponse> {
		try {
			if (!params?.symbolName) {
				return {
					error: {
						code: 400,
						message: "Missing required parameter: symbolName",
					},
				};
			}

			const symbolName = params.symbolName;
			const parsedFiles = this.symbolIndexer.getParsedFiles();
			const symbols: any[] = [];

			// Search for symbol in all parsed files
			for (const [_, parsedFile] of parsedFiles) {
				const matchingSymbols = parsedFile.symbols.filter((s) => s.name === symbolName);
				symbols.push(...matchingSymbols);
			}

			return {
				result: {
					symbols,
				},
			};
		} catch (error) {
			return {
				error: {
					code: 500,
					message: `Error getting symbol info: ${
						error instanceof Error ? error.message : String(error)
					}`,
				},
			};
		}
	}

	/**
	 * Handle getFileSymbols request
	 * @param params Request parameters
	 * @returns MCP response object
	 */
	private async handleGetFileSymbols(params: any): Promise<MCPResponse> {
		try {
			if (!params?.filePath) {
				return {
					error: {
						code: 400,
						message: "Missing required parameter: filePath",
					},
				};
			}

			const filePath = params.filePath;
			const parsedFiles = this.symbolIndexer.getParsedFiles();
			const parsedFile = parsedFiles.get(filePath);

			if (!parsedFile) {
				return {
					error: {
						code: 404,
						message: `File not indexed: ${filePath}`,
					},
				};
			}

			return {
				result: {
					filePath,
					symbols: parsedFile.symbols,
					imports: parsedFile.imports,
					exports: parsedFile.exports,
				},
			};
		} catch (error) {
			return {
				error: {
					code: 500,
					message: `Error getting file symbols: ${
						error instanceof Error ? error.message : String(error)
					}`,
				},
			};
		}
	}
}
