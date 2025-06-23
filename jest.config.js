module.exports = {
	preset: "ts-jest",
	testTimeout: 15000,
	setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
	testEnvironment: "node",
	roots: ["<rootDir>/src", "<rootDir>/tests"],
	testMatch: ["**/*.test.ts"],
	transform: {
		"^.+\\.ts$": [
			"ts-jest",
			{
				tsconfig: "tsconfig.json",
			},
		],
	},
	collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/**/index.ts", "!src/config/**/*"],
	coverageThreshold: {
		global: {
			branches: 70,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
};
