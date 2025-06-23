import { injectable, inject } from "inversify";
import * as fs from "fs";
import * as path from "path";
import { minimatch } from "minimatch";
import { IWorkspaceScanner } from "../interfaces/IWorkspaceScanner";
import { WorkspaceFile, WorkspaceFileType } from "../models/WorkspaceFile";
import { ILogger } from "../interfaces/ILogger";
import { TYPES } from "../../config/types";

/**
 * Service for scanning workspace files
 */
@injectable()
export class WorkspaceScanner implements IWorkspaceScanner {
	private rootPath: string = "";
	private cachedFiles: WorkspaceFile[] = [];
	private readonly excludePatterns: string[] = [
		"node_modules/**",
		"dist/**",
		".git/**",
		"**/node_modules/**",
		"**/dist/**",
		"**/.git/**",
		"**/coverage/**",
	];

	/**
	 * Create a new WorkspaceScanner
	 * @param logger - Logger instance
	 */
	public constructor(@inject(TYPES.Logger) private readonly logger: ILogger) {}

	/**
	 * Scan workspace for files
	 * @param workspacePath - Path to workspace
	 * @returns Array of workspace files
	 */
	public async scanWorkspace(workspacePath: string): Promise<WorkspaceFile[]> {
		this.logger.info(`Scanning workspace: ${workspacePath}`);
		this.rootPath = workspacePath;

		try {
			// Validate path
			const stats = await fs.promises.stat(workspacePath);
			if (!stats.isDirectory()) {
				throw new Error(`Workspace path is not a directory: ${workspacePath}`);
			}

			// Read gitignore if exists
			const gitignorePath = path.join(workspacePath, ".gitignore");
			let gitignorePatterns: string[] = [];
			try {
				const gitignoreContent = await fs.promises.readFile(gitignorePath, "utf8");
				gitignorePatterns = gitignoreContent
					.split("\n")
					.filter((line) => line.trim() && !line.startsWith("#"))
					.map((line) => line.trim());

				this.logger.info(`Loaded ${gitignorePatterns.length} patterns from .gitignore`);
			} catch (error) {
				this.logger.debug("No .gitignore file found, continuing without it");
			}

			// Combine exclude patterns
			const excludePatterns = [...this.excludePatterns, ...gitignorePatterns];
			this.logger.debug(`Total exclude patterns: ${excludePatterns.length}`);

			// Scan directories recursively
			const filePaths = await this.traverseDirectory(
				workspacePath,
				workspacePath,
				0,
				excludePatterns
			);

			// Convert to WorkspaceFile objects
			this.cachedFiles = await this.createWorkspaceFiles(filePaths, workspacePath);

			this.logger.info(`Scan complete. Found ${this.cachedFiles.length} files.`);
			return this.cachedFiles;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.error("Failed to scan workspace", err);
			throw err;
		}
	}

	/**
	 * Find files matching a pattern
	 * @param pattern - Glob pattern
	 * @returns Matching workspace files
	 */
	public async findFiles(pattern: string): Promise<WorkspaceFile[]> {
		if (!this.cachedFiles.length && this.rootPath) {
			await this.scanWorkspace(this.rootPath);
		}

		if (!pattern || pattern === "*" || pattern === "**/*") {
			return this.cachedFiles;
		}

		return this.cachedFiles.filter((file) => {
			return minimatch(file.relativePath, pattern);
		});
	}

	/**
	 * Read a file from the workspace
	 * @param filePath - Path to file
	 * @returns File content
	 */
	public async readFile(filePath: string): Promise<string> {
		try {
			// If path is relative, resolve against workspace root
			const absolutePath = path.isAbsolute(filePath)
				? filePath
				: path.resolve(this.rootPath, filePath);

			return await fs.promises.readFile(absolutePath, "utf-8");
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.error(`Error reading file ${filePath}`, err);
			throw new Error(`Failed to read file: ${filePath}`);
		}
	}

	/**
	 * Get statistics about the workspace files
	 * @returns Object with file statistics
	 */
	public async getWorkspaceStats(): Promise<{
		totalFiles: number;
		sourceFiles: number;
		testFiles: number;
		configFiles: number;
		otherFiles: number;
	}> {
		if (!this.cachedFiles.length && this.rootPath) {
			await this.scanWorkspace(this.rootPath);
		}

		const sourceFiles = this.cachedFiles.filter((f) => f.type === WorkspaceFileType.SOURCE).length;
		const testFiles = this.cachedFiles.filter((f) => f.type === WorkspaceFileType.TEST).length;
		const configFiles = this.cachedFiles.filter((f) => f.type === WorkspaceFileType.CONFIG).length;
		const docFiles = this.cachedFiles.filter(
			(f) => f.type === WorkspaceFileType.DOCUMENTATION
		).length;
		const otherFiles = this.cachedFiles.filter((f) => f.type === WorkspaceFileType.OTHER).length;

		return {
			totalFiles: this.cachedFiles.length,
			sourceFiles,
			testFiles,
			configFiles,
			otherFiles: otherFiles + docFiles,
		};
	}

	/**
	 * Traverse directory recursively
	 * @param rootPath - Workspace root path
	 * @param currentPath - Current path to traverse
	 * @param depth - Current depth
	 * @param excludePatterns - Patterns to exclude
	 * @returns Array of file paths
	 * @private
	 */
	private async traverseDirectory(
		rootPath: string,
		currentPath: string,
		depth: number,
		excludePatterns: string[]
	): Promise<string[]> {
		// Avoid infinite recursion
		if (depth > 30) {
			this.logger.warn(`Maximum directory depth reached at ${currentPath}`);
			return [];
		}

		try {
			const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
			const files: string[] = [];

			for (const entry of entries) {
				const fullPath = path.join(currentPath, entry.name);
				const relativePath = path.relative(rootPath, fullPath);

				// Check if path should be excluded
				if (this.shouldExclude(relativePath, entry.isDirectory(), excludePatterns)) {
					continue;
				}

				if (entry.isDirectory()) {
					// Recursively process subdirectory
					const subDirFiles = await this.traverseDirectory(
						rootPath,
						fullPath,
						depth + 1,
						excludePatterns
					);
					files.push(...subDirFiles);
				} else if (entry.isFile()) {
					// Add file to results
					files.push(fullPath);
				}
				// Ignore symlinks and other special files
			}

			return files;
		} catch (error) {
			this.logger.warn(
				`Error reading directory ${currentPath}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
			return [];
		}
	}

	/**
	 * Check if a path should be excluded based on patterns
	 * @param relativePath - Path relative to workspace root
	 * @param isDirectory - Whether path is directory
	 * @param excludePatterns - Patterns to match against
	 * @returns Whether path should be excluded
	 * @private
	 */
	private shouldExclude(
		relativePath: string,
		isDirectory: boolean,
		excludePatterns: string[]
	): boolean {
		// Standardize path for pattern matching
		const normalizedPath = relativePath.replace(/\\/g, "/");

		// Test against exclude patterns
		for (const pattern of excludePatterns) {
			try {
				// Simple case for exact directory matches
				if (isDirectory) {
					if (pattern === normalizedPath || pattern === `${normalizedPath}/`) {
						return true;
					}
				}

				// Use minimatch
				if (minimatch(normalizedPath, pattern, { dot: true })) {
					return true;
				}
			} catch (error) {
				this.logger.debug(
					`Error matching pattern ${pattern}: ${
						error instanceof Error ? error.message : String(error)
					}`
				);
			}
		}

		return false;
	}

	/**
	 * Create WorkspaceFile objects from paths
	 * @param filePaths - Array of file paths
	 * @param rootPath - Workspace root path
	 * @returns Array of WorkspaceFile objects
	 * @private
	 */
	private async createWorkspaceFiles(
		filePaths: string[],
		rootPath: string
	): Promise<WorkspaceFile[]> {
		const workspaceFiles: WorkspaceFile[] = [];

		for (const filePath of filePaths) {
			try {
				const relativePath = path.relative(rootPath, filePath);
				const stats = await fs.promises.stat(filePath);

				workspaceFiles.push(
					new WorkspaceFile(
						filePath,
						relativePath,
						this.determineFileType(filePath, relativePath),
						stats.size,
						new Date(stats.mtime)
					)
				);
			} catch (error) {
				this.logger.warn(
					`Error processing file ${filePath}: ${
						error instanceof Error ? error.message : String(error)
					}`
				);
			}
		}

		return workspaceFiles;
	}

	/**
	 * Determine the type of file
	 * @param filepath - Absolute file path
	 * @param relativePath - Path relative to workspace root
	 * @returns WorkspaceFileType
	 * @private
	 */
	private determineFileType(filepath: string, relativePath: string): WorkspaceFileType {
		const ext = path.extname(filepath).toLowerCase();
		const basename = path.basename(filepath).toLowerCase();

		// Check if it's a test file
		if (
			relativePath.includes("/test/") ||
			relativePath.includes("/tests/") ||
			relativePath.includes("/__tests__/") ||
			relativePath.includes(".test.") ||
			relativePath.includes(".spec.")
		) {
			return WorkspaceFileType.TEST;
		}

		// Check if it's a source code file
		if (
			[
				".ts",
				".js",
				".tsx",
				".jsx",
				".py",
				".java",
				".cpp",
				".c",
				".h",
				".go",
				".rs",
				".php",
				".rb",
			].includes(ext)
		) {
			return WorkspaceFileType.SOURCE;
		}

		// Check if it's a config file
		if (
			[".json", ".yml", ".yaml", ".toml", ".ini", ".config", ".conf"].includes(ext) ||
			basename === ".gitignore" ||
			basename === ".env" ||
			basename.startsWith("tsconfig.") ||
			basename.startsWith("package.") ||
			basename === "dockerfile"
		) {
			return WorkspaceFileType.CONFIG;
		}

		// Check if it's documentation
		if ([".md", ".markdown", ".txt", ".pdf", ".doc", ".docx"].includes(ext)) {
			return WorkspaceFileType.DOCUMENTATION;
		}

		// Otherwise it's another type of file
		return WorkspaceFileType.OTHER;
	}
}
