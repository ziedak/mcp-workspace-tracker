// Global test setup
jest.mock("fs/promises", () => ({
	readFile: jest.fn(),
	writeFile: jest.fn(),
	mkdir: jest.fn(),
	readdir: jest.fn(),
	stat: jest.fn(),
	unlink: jest.fn(),
	access: jest.fn(),
}));

// Reset all mocks between tests
beforeEach(() => {
	jest.clearAllMocks();
});
