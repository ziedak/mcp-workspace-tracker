import { WorkspaceFile } from "../models/WorkspaceFile";

/**
 * Interface for workspace scanning service
 */
export interface IWorkspaceScanner {
	/**
	 * Scans workspace for files
	 * @param workspacePath - The path to the workspace to scan
	 * @returns Promise with array of workspace files
	 */
	scanWorkspace(workspacePath: string): Promise<WorkspaceFile[]>;

	/**
	 * Find files matching a pattern
	 * @param pattern - Glob pattern to match files against
	 * @returns Promise with array of matching files
	 */
	findFiles(pattern: string): Promise<WorkspaceFile[]>;

	/**
	 * Read a file from the workspace
	 * @param filePath - Path to the file (relative or absolute)
	 * @returns Promise with file content
	 */
	readFile(filePath: string): Promise<string>;

	/**
	 * Get statistics about the workspace files
	 * @returns Object containing file statistics
	 */
	getWorkspaceStats(): Promise<{
		totalFiles: number;
		sourceFiles: number;
		testFiles: number;
		configFiles: number;
		otherFiles: number;
	}>;
}
