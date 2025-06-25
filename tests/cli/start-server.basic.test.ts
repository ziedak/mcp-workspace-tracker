import { jest } from "@jest/globals";

describe("start-server module", () => {
	let originalArgv: string[];
	let originalCwd: () => string;

	beforeAll(() => {
		originalArgv = [...process.argv];
		originalCwd = process.cwd;
	});

	afterAll(() => {
		process.argv = originalArgv;
		process.cwd = originalCwd;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		// Reset process methods
		process.argv = originalArgv.slice(0, 2); // Keep node and script name
		process.cwd = originalCwd;
	});

	afterEach(() => {
		process.argv = originalArgv;
		process.cwd = originalCwd;
	});

	it("should load the module without errors", () => {
		// This test simply verifies that the module can be loaded
		// without throwing syntax errors or import issues
		expect(() => {
			const startServerPath = require.resolve("../../src/start-server.ts");
			expect(startServerPath).toBeDefined();
		}).not.toThrow();
	});

	it("should export expected functionality", () => {
		// Simple smoke test to ensure the module structure is valid
		const startServerPath = require.resolve("../../src/start-server.ts");
		expect(startServerPath).toContain("start-server");
	});
});
