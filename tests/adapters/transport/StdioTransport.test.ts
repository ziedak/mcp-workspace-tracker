import { StdioTransport } from "../../../src/adapters/transport/StdioTransport";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Mock the MCP SDK
jest.mock("@modelcontextprotocol/sdk/server/stdio.js");
jest.mock("@modelcontextprotocol/sdk/server/mcp.js");

const MockedStdioServerTransport = StdioServerTransport as jest.MockedClass<
	typeof StdioServerTransport
>;
const MockedMcpServer = McpServer as jest.MockedClass<typeof McpServer>;

describe("StdioTransport", () => {
	let transport: StdioTransport;
	let mockServer: jest.Mocked<McpServer>;
	let mockStdioTransport: jest.Mocked<StdioServerTransport>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockStdioTransport = {
			onclose: undefined,
		} as any;

		mockServer = {
			connect: jest.fn(),
		} as any;

		MockedStdioServerTransport.mockImplementation(() => mockStdioTransport);

		transport = new StdioTransport();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe("connect", () => {
		it("should create StdioServerTransport and connect server", async () => {
			await transport.connect(mockServer);

			expect(MockedStdioServerTransport).toHaveBeenCalledTimes(1);
			expect(mockServer.connect).toHaveBeenCalledWith(mockStdioTransport);
			expect(transport.isConnected()).toBe(true);
		});

		it("should throw error if already connected", async () => {
			await transport.connect(mockServer);

			await expect(transport.connect(mockServer)).rejects.toThrow(
				"Stdio transport is already connected"
			);
		});

		it("should handle connection errors", async () => {
			const error = new Error("Connection failed");
			mockServer.connect.mockRejectedValue(error);

			await expect(transport.connect(mockServer)).rejects.toThrow("Connection failed");
			expect(transport.isConnected()).toBe(false);
		});
	});

	describe("disconnect", () => {
		it("should disconnect when connected", async () => {
			await transport.connect(mockServer);

			await transport.disconnect();

			expect(transport.isConnected()).toBe(false);
		});

		it("should not throw error when disconnecting unconnected transport", async () => {
			expect(transport.isConnected()).toBe(false);

			await expect(transport.disconnect()).resolves.not.toThrow();
			expect(transport.isConnected()).toBe(false);
		});

		it("should be able to disconnect after connection", async () => {
			await transport.connect(mockServer);
			expect(transport.isConnected()).toBe(true);

			await transport.disconnect();

			expect(transport.isConnected()).toBe(false);
		});
	});

	describe("isConnected", () => {
		it("should return false initially", () => {
			expect(transport.isConnected()).toBe(false);
		});

		it("should return true after connecting", async () => {
			await transport.connect(mockServer);
			expect(transport.isConnected()).toBe(true);
		});

		it("should return false after disconnecting", async () => {
			await transport.connect(mockServer);
			await transport.disconnect();
			expect(transport.isConnected()).toBe(false);
		});
	});

	describe("getType", () => {
		it("should return 'stdio'", () => {
			expect(transport.getType()).toBe("stdio");
		});
	});

	describe("getAddress", () => {
		it("should return null (stdio has no address)", () => {
			expect(transport.getAddress()).toBeNull();
		});

		it("should return null even when connected", async () => {
			await transport.connect(mockServer);
			expect(transport.getAddress()).toBeNull();
		});
	});
});
