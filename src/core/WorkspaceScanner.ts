/**
 * WorkspaceScanner class
 * Responsible for scanning the workspace and collecting file paths
 */

import * as fs from "fs";
import * as path from "path";
import { FileSystemUtils } from "../utils/FileSystemUtils";

// Import minimatch dynamically to avoid TypeScript errors
let minimatchLib: ((path: string, pattern: string, options?: any) => boolean) | undefined;
try {
	// Using dynamic import with require
	minimatchLib = eval('require("minimatch")');
	console.log("Successfully loaded minimatch library");
} catch (error) {
	console.warn("Failed to import minimatch library, will use fallback pattern matching");
}

/**
 * Interface for WorkspaceScanner options
 */
interface WorkspaceScannerOptions {
	excludePatterns?: string[]; // Glob patterns to exclude
	includePatterns?: string[]; // Glob patterns to include
	maxDepth?: number; // Maximum directory depth to traverse
}

/**
 * A glob pattern matcher that handles gitignore-style patterns
 */
class PatternMatcher {
	private patterns: string[];

	constructor(patterns: string[]) {
		// Process patterns to handle directory patterns consistently
		this.patterns = patterns.map((pattern) => {
			// Handle directory-only patterns (ending with /)
			if (pattern.endsWith("/") && !pattern.endsWith("*/")) {
				return `${pattern}**`;
			}
			return pattern;
		});

		// Log patterns for debugging
		console.log(`Initialized PatternMatcher with ${this.patterns.length} patterns`);
	}

	/**
	 * Test if a path matches any of the patterns
	 * @param testPath The path to test
	 * @param isDirectory Whether the path is a directory
	 */
	matches(testPath: string, isDirectory = false): boolean {
		// Normalize path for matching (use forward slashes)
		const normalizedPath = testPath.replace(/\\/g, "/");

		// Create an array of paths to test including variations for directories
		const pathsToTest = [normalizedPath];

		// For directories, add additional path variations to check
		if (isDirectory) {
			// Add paths with trailing slash and with /** for contents
			if (!normalizedPath.endsWith("/")) {
				pathsToTest.push(`${normalizedPath}/`);
			}
			pathsToTest.push(`${normalizedPath}/**`);
		}

		// Fast path checks for common directories that should be ignored
		// This is a performance optimization to avoid calling minimatch in obvious cases
		const commonIgnoreDirs = [
			// "node_modules" - removed to test .gitignore handling
			".git",
			"dist",
			"build",
			".vscode",
			".idea",
			"coverage",
			".next",
			"out",
			".cache",
		];

		for (const dir of commonIgnoreDirs) {
			// Check if path is exactly the dir or contains it as a directory part
			if (
				normalizedPath === dir ||
				normalizedPath.startsWith(`${dir}/`) ||
				normalizedPath.includes(`/${dir}/`)
			) {
				return true;
			}
		}

		// Try matching each pattern against all path variations
		for (const pattern of this.patterns) {
			for (const pathToTest of pathsToTest) {
				try {
					// Use minimatchLib if available
					if (minimatchLib && minimatchLib(pathToTest, pattern, { dot: true, matchBase: true })) {
						return true;
					} else {
						// Fallback to simpler matching if minimatch is unavailable
						return this.simpleMatch(pathToTest, pattern);
					}
				} catch (error) {
					// Fallback if minimatch throws an error
					return this.simpleMatch(pathToTest, pattern);
				}
			}
		}

		return false;
	}

	/**
	 * Simple fallback pattern matching when minimatch is unavailable
	 */
	private simpleMatch(testPath: string, pattern: string): boolean {
		// Direct equality
		if (pattern === testPath) {
			return true;
		}

		// Handle **/node_modules/** pattern
		if (pattern.includes("node_modules") && testPath.includes("node_modules")) {
			return true;
		}

		// Simple suffix/prefix wildcard
		if (pattern.startsWith("*") && !pattern.slice(1).includes("*")) {
			return testPath.endsWith(pattern.slice(1));
		}

		if (pattern.endsWith("*") && !pattern.slice(0, -1).includes("*")) {
			return testPath.startsWith(pattern.slice(0, -1));
		}

		// Double wildcard match (**/*.js)
		if (pattern.includes("**")) {
			const [prefix, suffix] = pattern.split("**");
			return (!prefix || testPath.startsWith(prefix)) && (!suffix || testPath.endsWith(suffix));
		}

		return false;
	}
}

/**
 * WorkspaceScanner class for traversing and discovering files in a workspace
 */
export class WorkspaceScanner {
	private options: WorkspaceScannerOptions;
	private fileUtils: FileSystemUtils;
	private patternMatcher: PatternMatcher | null = null;

	/**
	 * Constructor for WorkspaceScanner
	 * @param options Configuration options
	 */
	constructor(options: WorkspaceScannerOptions = {}) {
		this.options = {
			excludePatterns: [
				"**/node_modules/**",
				"**/node_modules/",
				"**/dist/**",
				"**/build/**",
				"**/.git/**",
				"**/.vscode/**",
				"**/.idea/**",
				"**/coverage/**",
				// Common binary and non-text files
				"**/*.exe",
				"**/*.dll",
				"**/*.so",
				"**/*.dylib",
				"**/*.jar",
				"**/*.zip",
				"**/*.tar",
				"**/*.gz",
				"**/*.png",
				"**/*.jpg",
				"**/*.jpeg",
				"**/*.gif",
				"**/*.bmp",
				"**/*.ico",
				"**/*.svg",
				"**/*.ttf",
				"**/*.woff",
				"**/*.woff2",
				"**/*.eot",
				"**/*.mp3",
				"**/*.mp4",
				"**/*.mov",
				"**/*.avi",
				"**/*.pdf",
			],
			includePatterns: ["**/*"],
			maxDepth: 20,
			...options,
		};
		this.fileUtils = new FileSystemUtils();
	}

	/**
	 * Scan a workspace and return all file paths
	 * @param workspacePath The root path of the workspace
	 * @returns Promise resolving to an array of file paths
	 */
	public async scanWorkspace(workspacePath: string): Promise<string[]> {
		console.log(`Scanning workspace: ${workspacePath}`);

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
					.filter((line: string) => line.trim() && !line.startsWith("#"))
					.map((line: string) => line.trim());

				console.log(`Loaded ${gitignorePatterns.length} patterns from .gitignore`);
			} catch (error) {
				console.log("No .gitignore file found, continuing without it");
			}

			// Combine exclude patterns
			const excludePatterns = [...(this.options.excludePatterns || []), ...gitignorePatterns];
			console.log(`Total exclude patterns: ${excludePatterns.length}`);

			// Initialize the pattern matcher
			this.patternMatcher = new PatternMatcher(excludePatterns);

			// Start recursive traversal
			const files = await this.traverseDirectory(workspacePath, workspacePath, 0);

			console.log(`Scan complete. Found ${files.length} files.`);
			return files;
		} catch (error) {
			console.error(
				`Error scanning workspace: ${error instanceof Error ? error.message : String(error)}`
			);
			throw error;
		}
	}

	/**
	 * Recursively traverse a directory and collect file paths
	 * @param rootPath The root workspace path for relative path calculation
	 * @param currentPath The current directory to traverse
	 * @param depth Current traversal depth
	 * @returns Promise resolving to an array of file paths
	 */
	private async traverseDirectory(
		rootPath: string,
		currentPath: string,
		depth: number
	): Promise<string[]> {
		// Check depth limit
		if (depth > (this.options.maxDepth || 20)) {
			return [];
		}

		try {
			const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
			const files: string[] = [];

			// Process each directory entry
			for (const entry of entries) {
				const fullPath = path.join(currentPath, entry.name);
				const relativePath = path.relative(rootPath, fullPath);

				// Skip based on exclude patterns
				if (this.shouldExclude(relativePath, entry.isDirectory())) {
					continue;
				}

				if (entry.isDirectory()) {
					// Recursively process subdirectory
					const subDirFiles = await this.traverseDirectory(rootPath, fullPath, depth + 1);
					files.push(...subDirFiles);
				} else if (entry.isFile()) {
					// Add file to results
					files.push(fullPath);
				}
				// Ignore symlinks and other special files
			}

			return files;
		} catch (error) {
			console.warn(
				`Error reading directory ${currentPath}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
			return [];
		}
	}

	/**
	 * Check if a path should be excluded based on patterns
	 * @param relativePath The path to check, relative to workspace root
	 * @param isDirectory Whether the path is a directory
	 * @returns Boolean indicating if the path should be excluded
	 */
	private shouldExclude(relativePath: string, isDirectory: boolean): boolean {
		if (!this.patternMatcher) return false;

		// Standardize path for pattern matching
		const normalizedPath = relativePath.replace(/\\/g, "/");

		// Use our pattern matcher to check against all patterns
		return this.patternMatcher.matches(normalizedPath, isDirectory);
	}
}
