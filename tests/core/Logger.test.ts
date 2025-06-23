import { Logger } from "../../src/core/services/Logger";
import winston from "winston";

// Mock winston
jest.mock("winston", () => {
	const mockLogger = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};

	return {
		createLogger: jest.fn().mockReturnValue(mockLogger),
		format: {
			combine: jest.fn(),
			timestamp: jest.fn(),
			json: jest.fn(),
			colorize: jest.fn(),
			simple: jest.fn(),
		},
		transports: {
			Console: jest.fn(),
		},
	};
});

describe("Logger", () => {
	let logger: Logger;
	let mockWinstonLogger: any;

	beforeEach(() => {
		// Reset winston mock
		jest.clearAllMocks();

		// Get a reference to the mock winston logger
		mockWinstonLogger = (winston.createLogger as jest.Mock)();

		// Create logger
		logger = new Logger();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("log levels", () => {
		it("should log debug messages", () => {
			const message = "Debug message";
			const meta = { test: "metadata" };

			logger.debug(message, meta);

			expect(mockWinstonLogger.debug).toHaveBeenCalledWith(message, meta);
		});

		it("should log info messages", () => {
			const message = "Info message";
			const meta = { test: "metadata" };

			logger.info(message, meta);

			expect(mockWinstonLogger.info).toHaveBeenCalledWith(message, meta);
		});

		it("should log warning messages", () => {
			const message = "Warning message";
			const meta = { test: "metadata" };

			logger.warn(message, meta);

			expect(mockWinstonLogger.warn).toHaveBeenCalledWith(message, meta);
		});

		it("should log error messages", () => {
			const message = "Error message";
			const error = new Error("Test error");
			const meta = { test: "metadata" };

			logger.error(message, error, meta);

			expect(mockWinstonLogger.error).toHaveBeenCalledWith(message, {
				error: {
					message: error.message,
					stack: error.stack,
					name: error.name,
				},
				...meta,
			});
		});

		it("should log error messages without error object", () => {
			const message = "Error message";
			const meta = { test: "metadata" };

			logger.error(message, undefined, meta);

			expect(mockWinstonLogger.error).toHaveBeenCalledWith(message, {
				error: undefined,
				...meta,
			});
		});

		it("should log without metadata", () => {
			const message = "Info without metadata";

			logger.info(message);

			expect(mockWinstonLogger.info).toHaveBeenCalledWith(message, undefined);
		});
	});
});
