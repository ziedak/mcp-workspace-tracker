import { Container } from "inversify";
import { TYPES } from "../../src/config/types";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { ILogger } from "../../src/core/interfaces/ILogger";
import { IPersistenceManager } from "../../src/core/interfaces/IPersistenceManager";
import { ISymbolIndexer } from "../../src/core/interfaces/ISymbolIndexer";
import { IWorkspaceScanner } from "../../src/core/interfaces/IWorkspaceScanner";
import { Logger } from "../../src/core/services/Logger";
import { SymbolIndexer } from "../../src/core/services/SymbolIndexer";
import { WorkspaceScanner } from "../../src/core/services/WorkspaceScanner";
import { MockPersistenceManager } from "../mocks/PersistenceManager.mock";
import { SymbolKind } from "../../src/core/models/Symbol";

// Unmock fs/promises for this integration test
jest.unmock("fs/promises");

describe("Integration Tests", () => {
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

		// Create test files with TypeScript code
		await createTestFiles(workspaceDir);
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

		container
			.bind<IWorkspaceScanner>(TYPES.WorkspaceScanner)
			.to(WorkspaceScanner)
			.inSingletonScope();

		container.bind<ISymbolIndexer>(TYPES.SymbolIndexer).to(SymbolIndexer).inSingletonScope();

		// No need to set up McpWorkspaceTracker - we'll test SymbolIndexer directly

		// Get services
		logger = container.get<ILogger>(TYPES.Logger);
		persistenceManager = container.get<IPersistenceManager>(TYPES.PersistenceManager);
		symbolIndexer = container.get<ISymbolIndexer>(TYPES.SymbolIndexer);

		// Initialize persistence manager
		await persistenceManager.initialize(workspaceDir);
	});

	describe("SymbolIndexer with Real File System", () => {
		it("should index and find symbols from real TypeScript files", async () => {
			// Get the file paths
			const filePaths = [
				path.join(workspaceDir, "User.ts"),
				path.join(workspaceDir, "UserService.ts"),
				path.join(workspaceDir, "IUser.ts"),
				path.join(workspaceDir, "utils.ts"),
			];

			// Index the files
			await symbolIndexer.indexFiles(filePaths);

			// Test symbol search for classes
			const userSymbols = await symbolIndexer.searchSymbols("user");
			expect(userSymbols.length).toBeGreaterThan(0);
			expect(userSymbols.some((s) => s.name === "User" && s.kind === SymbolKind.CLASS)).toBe(true);
			expect(userSymbols.some((s) => s.name === "UserService" && s.kind === SymbolKind.CLASS)).toBe(
				true
			);
			expect(userSymbols.some((s) => s.name === "IUser" && s.kind === SymbolKind.INTERFACE)).toBe(
				true
			);
		});

		it("should handle caching of unchanged files", async () => {
			const filePaths = [path.join(workspaceDir, "User.ts")];

			// First indexing
			await symbolIndexer.indexFiles(filePaths);

			// Mock persistence to return cached data
			jest.spyOn(persistenceManager, "isCachedAndUnchanged").mockReturnValue(true);

			// Second indexing should use cached data
			await symbolIndexer.indexFiles(filePaths);

			// Still should work correctly
			const symbols = await symbolIndexer.searchSymbols("User");
			expect(symbols.some((s) => s.name === "User")).toBe(true);
		});

		it("should find and correctly parse classes with methods", async () => {
			// Index the files
			const filePaths = [path.join(workspaceDir, "User.ts")];

			await symbolIndexer.indexFiles(filePaths);

			// Get the user class
			const userSymbols = await symbolIndexer.searchSymbols("User", SymbolKind.CLASS);
			expect(userSymbols.length).toBe(1);

			const userClass = userSymbols[0];

			// Verify the class has children including the method we're looking for
			expect(userClass.children).toBeDefined();
			expect(userClass.children!.length).toBeGreaterThan(0);

			// Find the method in the children
			const method = userClass.children!.find((c) => c.name === "getDisplayName");
			expect(method).toBeDefined();
			expect(method!.kind).toBe(SymbolKind.METHOD);
			expect(method!.parentName).toBe("User");
		});

		it("should find and correctly parse interfaces", async () => {
			// Index the files
			const filePaths = [path.join(workspaceDir, "IUser.ts")];

			await symbolIndexer.indexFiles(filePaths);

			// Look for the IUser interface
			const symbols = await symbolIndexer.searchSymbols("IUser");

			// Verify interface was found
			expect(symbols.length).toBeGreaterThan(0);
			const userInterface = symbols.find(
				(s) => s.name === "IUser" && s.kind === SymbolKind.INTERFACE
			);
			expect(userInterface).toBeDefined();
			expect(userInterface?.exportStatus).toBe("exported");
		});

		it("should find and correctly parse functions", async () => {
			// Index the files
			const filePaths = [path.join(workspaceDir, "utils.ts")];

			await symbolIndexer.indexFiles(filePaths);

			// Look for formatDate function
			const symbols = await symbolIndexer.searchSymbols("format");

			// Verify function was found
			expect(symbols.length).toBeGreaterThan(0);
			const formatFunction = symbols.find(
				(s) => s.name === "formatDate" && s.kind === SymbolKind.FUNCTION
			);
			expect(formatFunction).toBeDefined();
			expect(formatFunction?.exportStatus).toBe("exported");
		});

		it("should handle indexing and searching multiple files", async () => {
			// Index all files
			const filePaths = [
				path.join(workspaceDir, "User.ts"),
				path.join(workspaceDir, "UserService.ts"),
				path.join(workspaceDir, "IUser.ts"),
				path.join(workspaceDir, "utils.ts"),
			];

			await symbolIndexer.indexFiles(filePaths);

			// Check if we can find all important symbols
			const allSymbols = await symbolIndexer.searchSymbols("");

			// We should find all key symbols across files
			expect(allSymbols.some((s) => s.name === "User" && s.kind === SymbolKind.CLASS)).toBe(true);
			expect(allSymbols.some((s) => s.name === "UserService" && s.kind === SymbolKind.CLASS)).toBe(
				true
			);
			expect(allSymbols.some((s) => s.name === "IUser" && s.kind === SymbolKind.INTERFACE)).toBe(
				true
			);
			expect(
				allSymbols.some((s) => s.name === "formatDate" && s.kind === SymbolKind.FUNCTION)
			).toBe(true);
			expect(
				allSymbols.some((s) => s.name === "generateId" && s.kind === SymbolKind.FUNCTION)
			).toBe(true);
		});
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
