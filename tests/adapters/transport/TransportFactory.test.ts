import { TransportFactory, TransportType } from "../../../src/adapters/transport/TransportFactory";
import { StdioTransport } from "../../../src/adapters/transport/StdioTransport";
import { HttpTransport } from "../../../src/adapters/transport/HttpTransport";

describe("TransportFactory", () => {
	describe("create", () => {
		it("should create StdioTransport for stdio type", () => {
			const transport = TransportFactory.create("stdio");
			expect(transport).toBeInstanceOf(StdioTransport);
		});

		it("should create HttpTransport for http type with options", () => {
			const options = {
				http: {
					port: 3000,
					host: "localhost",
				},
			};
			const transport = TransportFactory.create("http", options);
			expect(transport).toBeInstanceOf(HttpTransport);
		});

		it("should throw error for http type without options", () => {
			expect(() => {
				TransportFactory.create("http");
			}).toThrow("HTTP transport requires configuration options");
		});

		it("should throw error for unsupported transport type", () => {
			expect(() => {
				TransportFactory.create("websocket" as TransportType);
			}).toThrow("Unsupported transport type: websocket");
		});
	});

	describe("getSupportedTypes", () => {
		it("should return array of supported transport types", () => {
			const types = TransportFactory.getSupportedTypes();
			expect(types).toEqual(["stdio", "http"]);
			expect(Array.isArray(types)).toBe(true);
		});

		it("should include stdio and http types", () => {
			const types = TransportFactory.getSupportedTypes();
			expect(types).toContain("stdio");
			expect(types).toContain("http");
		});
	});
});
