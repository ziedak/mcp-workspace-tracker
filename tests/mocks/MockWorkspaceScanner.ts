import { IWorkspaceScanner } from "../../src/core/interfaces/IWorkspaceScanner";
import { WorkspaceFile, WorkspaceFileType } from "../../src/core/models/WorkspaceFile";

/**
 * Mock implementation of IWorkspaceScanner for testing
 */
export class MockWorkspaceScanner implements IWorkspaceScanner {
	private files: WorkspaceFile[] = [];
	private fileContents: Map<string, string> = new Map();
	private workspacePath: string = "";

	async scanWorkspace(workspacePath: string): Promise<WorkspaceFile[]> {
		this.workspacePath = workspacePath;
		return [...this.files];
	}

	async findFiles(pattern: string): Promise<WorkspaceFile[]> {
		// Simple pattern matching for testing purposes
		return this.files.filter((file) => {
			if (pattern.includes("*")) {
				const regex = new RegExp(pattern.replace(/\*/g, ".*"));
				return regex.test(file.relativePath);
			}
			return file.relativePath.includes(pattern);
		});
	}

	async readFile(filePath: string): Promise<string> {
		const content = this.fileContents.get(filePath);
		if (content === undefined) {
			throw new Error(`File not found: ${filePath}`);
		}
		return content;
	}

	async getWorkspaceStats(): Promise<{
		totalFiles: number;
		sourceFiles: number;
		testFiles: number;
		configFiles: number;
		otherFiles: number;
	}> {
		return {
			totalFiles: this.files.length,
			sourceFiles: this.files.filter((f) => f.type === WorkspaceFileType.SOURCE).length,
			testFiles: this.files.filter((f) => f.type === WorkspaceFileType.TEST).length,
			configFiles: this.files.filter((f) => f.type === WorkspaceFileType.CONFIG).length,
			otherFiles: this.files.filter((f) => f.type === WorkspaceFileType.OTHER).length,
		};
	}

	/**
	 * Helper to set mock files for testing
	 */
	setMockFiles(files: WorkspaceFile[]): void {
		this.files = [...files];
	}

	/**
	 * Helper to set file contents for testing
	 */
	setFileContent(filePath: string, content: string): void {
		this.fileContents.set(filePath, content);
	}

	/**
	 * Helper to get the current workspace path
	 */
	getWorkspacePath(): string {
		return this.workspacePath;
	}
}
