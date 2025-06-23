/**
 * Represents a file in the workspace
 */
export class WorkspaceFile {
	/**
	 * Creates a new WorkspaceFile instance
	 *
	 * @param path - The absolute path to the file
	 * @param relativePath - The path relative to workspace root
	 * @param type - The file type
	 * @param size - The file size in bytes
	 * @param lastModified - The last modified timestamp
	 */
	constructor(
		public readonly path: string,
		public readonly relativePath: string,
		public readonly type: WorkspaceFileType,
		public readonly size: number,
		public readonly lastModified: Date
	) {}
}

/**
 * Enum representing different file types in a workspace
 */
export enum WorkspaceFileType {
	SOURCE = "source",
	TEST = "test",
	CONFIG = "config",
	DOCUMENTATION = "documentation",
	OTHER = "other",
}
