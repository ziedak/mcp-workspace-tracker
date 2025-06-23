import { Container } from "inversify";
import { TYPES } from "../../src/config/types";
import type { PathLike } from "fs";
import { ILogger } from "../../src/core/interfaces/ILogger";
import { IPersistenceManager } from "../../src/core/interfaces/IPersistenceManager";
import { ISymbolIndexer } from "../../src/core/interfaces/ISymbolIndexer";
import { IWorkspaceScanner } from "../../src/core/interfaces/IWorkspaceScanner";
import { IMcpWorkspaceTracker } from "../../src/core/interfaces/IMcpWorkspaceTracker";
import { Logger } from "../../src/core/services/Logger";
import { PersistenceManager } from "../../src/core/services/PersistenceManager";
import { SymbolIndexer } from "../../src/core/services/SymbolIndexer";
import { WorkspaceScanner } from "../../src/core/services/WorkspaceScanner";
import { McpWorkspaceTracker } from "../../src/core/services/McpWorkspaceTracker";
import * as fs from "fs/promises";

// Mock fs/promises
jest.mock("fs/promises");

describe("Integration Tests", () => {
	let container: Container;
	let logger: ILogger;
	let persistenceManager: IPersistenceManager;
	let workspaceScanner: IWorkspaceScanner;
	let symbolIndexer: ISymbolIndexer;
	let workspaceTracker: IMcpWorkspaceTracker;
	const mockFs = fs as jest.Mocked<typeof fs>;

	beforeEach(async () => {
		// Setup container with real implementations
		container = new Container();
		container.bind<ILogger>(TYPES.Logger).to(Logger).inSingletonScope();
		container
			.bind<IPersistenceManager>(TYPES.PersistenceManager)
			.to(PersistenceManager)
			.inSingletonScope();
		container
			.bind<IWorkspaceScanner>(TYPES.WorkspaceScanner)
			.to(WorkspaceScanner)
			.inSingletonScope();
		container.bind<ISymbolIndexer>(TYPES.SymbolIndexer).to(SymbolIndexer).inSingletonScope();
		container
			.bind<IMcpWorkspaceTracker>(TYPES.McpWorkspaceTracker)
			.to(McpWorkspaceTracker)
			.inSingletonScope();

		// Get services
		logger = container.get<ILogger>(TYPES.Logger);
		persistenceManager = container.get<IPersistenceManager>(TYPES.PersistenceManager);
		workspaceScanner = container.get<IWorkspaceScanner>(TYPES.WorkspaceScanner);
		symbolIndexer = container.get<ISymbolIndexer>(TYPES.SymbolIndexer);
		workspaceTracker = container.get<IMcpWorkspaceTracker>(TYPES.McpWorkspaceTracker);

		// Reset mocks
		jest.resetAllMocks();

		// Setup basic mocks
		mockFs.mkdir = jest.fn().mockResolvedValue(undefined);
		mockFs.writeFile = jest.fn().mockResolvedValue(undefined);
		mockFs.readFile = jest.fn().mockImplementation((filePath: PathLike) => {
			if (typeof filePath === "string" && filePath.includes("App.ts")) {
				return Promise.resolve(`
          // App.ts
          import { UserService } from './UserService';
          
          export class App {
            private userService = new UserService();
            
            /**
             * Initialize the application
             */
            public init(): void {
              console.log('App initialized');
            }
          }
        `);
			} else if (typeof filePath === "string" && filePath.includes("UserService.ts")) {
				return Promise.resolve(`
          // UserService.ts
          import { User } from './models/User';
import { MockFactory } from "../utils/MockFactory";
import { MockFactory } from "../utils/MockFactory";
          
          /**
           * Service for managing users
           */
          export class UserService {
            public getUser(id: string): User {
              return { id, name: 'Test User' };
            }
          }
        `);
			}
			return Promise.reject(new Error("File not found"));
		});

		mockFs.stat = jest.fn().mockImplementation((filePath: PathLike) => {
			return Promise.resolve({
				isDirectory: () => false,
				size: 1024,
				mtime: new Date(),
			} as any);
		});

		mockFs.readdir = jest.fn().mockImplementation((dirPath: PathLike) => {
			if (typeof dirPath === "string" && dirPath.includes("workspace")) {
				return Promise.resolve(["App.ts", "UserService.ts", "README.md"] as any);
			}
			return Promise.resolve([]);
		});

		// Initialize persistence manager
		await persistenceManager.initialize("/test/workspace");
	});

	describe("End-to-End Workspace Processing", () => {
		it("should scan, index and provide workspace information", async () => {
			// Initialize workspace
			await workspaceTracker.initialize("/test/workspace");

			// Test workspace statistics via WorkspaceScanner
			const scanner = workspaceTracker.getWorkspaceScanner();
			const stats = await scanner.getWorkspaceStats();
			expect(stats.totalFiles).toBeGreaterThan(0);

			// Test symbol search via SymbolIndexer
			const symbolIndexer = workspaceTracker.getSymbolIndexer();
			const symbols = await symbolIndexer.searchSymbols("user");
			expect(symbols.length).toBeGreaterThan(0);
			expect(symbols.some((s) => s.name === "UserService")).toBe(true);

			// Test file retrieval via WorkspaceScanner
			const files = await scanner.findFiles("*.ts");
			expect(files.length).toBeGreaterThan(0);
			expect(files.some((f) => f.relativePath.includes("App.ts"))).toBe(true);

			// Test file content via WorkspaceScanner
			const content = await scanner.readFile("App.ts");
			expect(content).toContain("App");
			expect(content).toContain("init");
		});

		it("should handle reinitializing with existing data", async () => {
			// First initialization
			await workspaceTracker.initialize("/test/workspace");

			// Mock persistence to return cached data
			jest.spyOn(persistenceManager, "isCachedAndUnchanged").mockReturnValue(true);

			// Second initialization should use cached data
			await workspaceTracker.initialize("/test/workspace");

			// Still should work correctly
			const symbolIndexer = workspaceTracker.getSymbolIndexer();
			const symbols = await symbolIndexer.searchSymbols("service");
			expect(symbols.some((s) => s.name === "UserService")).toBe(true);
		});
	});
});
