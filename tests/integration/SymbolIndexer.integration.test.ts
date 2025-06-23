import { Container } from "inversify";
import { TYPES } from "../../src/config/types";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { ILogger } from "../../src/core/interfaces/ILogger";
import { IPersistenceManager } from "../../src/core/interfaces/IPersistenceManager";
import { ISymbolIndexer } from "../../src/core/interfaces/ISymbolIndexer";
import { Logger } from "../../src/core/services/Logger";
import { SymbolIndexer } from "../../src/core/services/SymbolIndexer";
import { SymbolKind } from "../../src/core/models/Symbol";
import { MockPersistenceManager } from "../mocks/PersistenceManager.mock";

// Unmock fs/promises for this integration test
jest.unmock("fs/promises");

describe("SymbolIndexer Integration Tests", () => {
	let container: Container;
	let logger: ILogger;
	let persistenceManager: IPersistenceManager;
	let symbolIndexer: ISymbolIndexer;
	let tempDir: string;
	let workspaceDir: string;

	beforeAll(async () => {
		// Create a temporary directory for our test workspace
		tempDir = path.join(os.tmpdir(), `workspace-tracker-test-${Date.now()}`);
		workspaceDir = path.join(tempDir, "workspace");
		await fs.mkdir(workspaceDir, { recursive: true });
	});

	afterAll(async () => {
		// Clean up the temporary directory
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
		} catch (error) {
			console.error(`Failed to remove temp directory: ${error}`);
		}
	});

	beforeEach(async () => {
		// Setup container with real implementations but mock PersistenceManager
		container = new Container();
		container.bind<ILogger>(TYPES.Logger).to(Logger).inSingletonScope();

		// Use mock persistence manager to avoid file system issues
		const mockPersistenceManager = new MockPersistenceManager();
		container
			.bind<IPersistenceManager>(TYPES.PersistenceManager)
			.toConstantValue(mockPersistenceManager);

		container.bind<ISymbolIndexer>(TYPES.SymbolIndexer).to(SymbolIndexer).inSingletonScope();

		// Get services
		logger = container.get<ILogger>(TYPES.Logger);
		persistenceManager = container.get<IPersistenceManager>(TYPES.PersistenceManager);
		symbolIndexer = container.get<ISymbolIndexer>(TYPES.SymbolIndexer);

		// Initialize persistence manager
		await persistenceManager.initialize(workspaceDir);

		// Create test files with TypeScript code
		await createTestFiles(workspaceDir);
	});

	afterEach(async () => {
		// Clean up test files but not directories
		try {
			const files = await fs.readdir(workspaceDir);
			for (const file of files) {
				const filePath = path.join(workspaceDir, file);
				const stats = await fs.stat(filePath);

				if (stats.isFile()) {
					await fs.unlink(filePath);
				}
			}
		} catch (error) {
			console.error(`Failed to clean test files: ${error}`);
		}
	});

	it("should index and find classes from real TypeScript files", async () => {
		// Index the files
		const filesToIndex = [
			path.join(workspaceDir, "User.ts"),
			path.join(workspaceDir, "UserService.ts"),
		];

		await symbolIndexer.indexFiles(filesToIndex);

		// Search for symbols
		const userSymbols = await symbolIndexer.searchSymbols("User");

		// There should be at least two symbols: the User class and the UserService class
		expect(userSymbols.length).toBeGreaterThanOrEqual(2);

		// Find the User class symbol
		const userClass = userSymbols.find((s) => s.name === "User" && s.kind === SymbolKind.CLASS);
		expect(userClass).toBeDefined();
		expect(userClass?.location.filePath).toContain("User.ts");

		// Find the UserService class symbol
		const userServiceClass = userSymbols.find(
			(s) => s.name === "UserService" && s.kind === SymbolKind.CLASS
		);
		expect(userServiceClass).toBeDefined();
		expect(userServiceClass?.location.filePath).toContain("UserService.ts");

		// Check if the method was indexed
		const userServiceMethods = userServiceClass?.children || [];
		expect(
			userServiceMethods.some((m) => m.name === "getUser" && m.kind === SymbolKind.METHOD)
		).toBe(true);
	});

	it("should index and find interfaces from real TypeScript files", async () => {
		// Index the files
		const filesToIndex = [path.join(workspaceDir, "IUser.ts")];

		await symbolIndexer.indexFiles(filesToIndex);

		// Search for interface symbols
		const interfaceSymbols = await symbolIndexer.searchSymbols("IUser");

		// Find the IUser interface symbol
		const userInterface = interfaceSymbols.find(
			(s) => s.name === "IUser" && s.kind === SymbolKind.INTERFACE
		);
		expect(userInterface).toBeDefined();
		expect(userInterface?.location.filePath).toContain("IUser.ts");
		expect(userInterface?.exportStatus).toBe("exported");
	});

	it("should index and find functions from real TypeScript files", async () => {
		// Index the files
		const filesToIndex = [path.join(workspaceDir, "utils.ts")];

		await symbolIndexer.indexFiles(filesToIndex);

		// Search for function symbols
		const functionSymbols = await symbolIndexer.searchSymbols("format");

		// Find the formatDate function symbol
		const formatFunction = functionSymbols.find(
			(s) => s.name === "formatDate" && s.kind === SymbolKind.FUNCTION
		);
		expect(formatFunction).toBeDefined();
		expect(formatFunction?.location.filePath).toContain("utils.ts");
	});

	it("should handle caching of unchanged files", async () => {
		// Index the files first time
		const filesToIndex = [path.join(workspaceDir, "User.ts")];

		await symbolIndexer.indexFiles(filesToIndex);

		// Mock the isCachedAndUnchanged method
		const spy = jest.spyOn(persistenceManager, "isCachedAndUnchanged").mockReturnValue(true);

		// Index again - should use cache
		await symbolIndexer.indexFiles(filesToIndex);

		expect(spy).toHaveBeenCalled();

		// Restore the original implementation
		spy.mockRestore();
	});
});

/**
 * Helper function to create test TypeScript files
 */
async function createTestFiles(workspaceDir: string): Promise<void> {
	// User class
	const userClass = `
        /**
         * Represents a user in the system
         */
        export class User {
            /**
             * User's unique identifier
             */
            id: string;
            
            /**
             * User's display name
             */
            name: string;
            
            /**
             * Creates a new User instance
             */
            constructor(id: string, name: string) {
                this.id = id;
                this.name = name;
            }
            
            /**
             * Gets the user's full display name
             */
            getDisplayName(): string {
                return this.name;
            }
        }
    `;

	// IUser interface
	const userInterface = `
        /**
         * Interface defining user properties
         */
        export interface IUser {
            /**
             * User's unique identifier
             */
            id: string;
            
            /**
             * User's display name
             */
            name: string;
        }
    `;

	// UserService class
	const userService = `
        import { User } from './User';
        
        /**
         * Service for managing users
         */
        export class UserService {
            private users: Map<string, User> = new Map();
            
            /**
             * Gets a user by ID
             * @param id User ID
             */
            public getUser(id: string): User | undefined {
                return this.users.get(id);
            }
            
            /**
             * Adds a new user
             * @param user User to add
             */
            public addUser(user: User): void {
                this.users.set(user.id, user);
            }
        }
    `;

	// Utils with functions
	const utilsFunctions = `
        /**
         * Formats a date to a string
         * @param date The date to format
         */
        export function formatDate(date: Date): string {
            return date.toISOString().split('T')[0];
        }
        
        /**
         * Generates a random ID
         */
        export function generateId(): string {
            return Math.random().toString(36).substring(2, 15);
        }
    `;

	// Write the files
	await fs.writeFile(path.join(workspaceDir, "User.ts"), userClass);
	await fs.writeFile(path.join(workspaceDir, "IUser.ts"), userInterface);
	await fs.writeFile(path.join(workspaceDir, "UserService.ts"), userService);
	await fs.writeFile(path.join(workspaceDir, "utils.ts"), utilsFunctions);
}
