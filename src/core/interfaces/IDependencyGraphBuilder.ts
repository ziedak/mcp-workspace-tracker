/**
 * Interface for building and analyzing module dependency graphs
 */

export interface ModuleDependency {
	modulePath: string;
	dependencies: string[];
	dependents: string[];
	isExternal: boolean;
	importType: "import" | "require" | "dynamic";
	imports: ImportInfo[];
	exports: ExportInfo[];
}

export interface ImportInfo {
	specifier: string; // what is being imported
	from: string; // where it's imported from
	type: "named" | "default" | "namespace" | "side-effect";
	alias?: string; // alias if renamed during import
	isTypeOnly: boolean;
}

export interface ExportInfo {
	specifier: string; // what is being exported
	type: "named" | "default" | "namespace" | "re-export";
	from?: string; // source module if re-exporting
	alias?: string; // alias if renamed during export
	isTypeOnly: boolean;
}

export interface CircularDependency {
	cycle: string[]; // array of module paths forming the cycle
	severity: "warning" | "error";
	description: string;
}

export interface DependencyPath {
	from: string;
	to: string;
	path: string[];
	distance: number;
}

export interface ImpactAnalysis {
	modulePath: string;
	directDependents: string[];
	indirectDependents: string[];
	totalImpact: number;
	riskLevel: "low" | "medium" | "high";
	affectedComponents: string[];
}

export interface DependencyGraph {
	modules: Map<string, ModuleDependency>;
	externalDependencies: Set<string>;
	circularDependencies: CircularDependency[];
	dependencyLevels: Map<number, string[]>; // level -> modules at that level
	entryPoints: string[]; // modules with no dependencies
	orphanModules: string[]; // modules with no dependents
}

export interface DependencyMetrics {
	totalModules: number;
	totalDependencies: number;
	externalDependencies: number;
	circularDependencies: number;
	maxDepth: number;
	averageDependencies: number;
	mostDepended: { module: string; count: number };
	mostDependencies: { module: string; count: number };
}

/**
 * Service interface for building and analyzing module dependency graphs
 */
export interface IDependencyGraphBuilder {
	/**
	 * Build complete dependency graph for the workspace
	 * @param workspacePath Path to the workspace to analyze
	 * @returns Promise resolving to complete dependency graph
	 */
	buildDependencyGraph(workspacePath: string): Promise<DependencyGraph>;

	/**
	 * Get dependency information for a specific module
	 * @param modulePath Path to the module to analyze
	 * @returns Promise resolving to module dependency information
	 */
	getModuleDependencies(modulePath: string): Promise<ModuleDependency | null>;

	/**
	 * Find all circular dependencies in the workspace
	 * @returns Promise resolving to array of circular dependencies
	 */
	findCircularDependencies(): Promise<CircularDependency[]>;

	/**
	 * Analyze the impact of changes to a specific module
	 * @param modulePath Path to the module to analyze
	 * @returns Promise resolving to impact analysis
	 */
	analyzeImpactAnalysis(modulePath: string): Promise<ImpactAnalysis>;

	/**
	 * Find dependency path between two modules
	 * @param fromModule Source module path
	 * @param toModule Target module path
	 * @returns Promise resolving to array of possible dependency paths
	 */
	getDependencyChain(fromModule: string, toModule: string): Promise<DependencyPath[]>;

	/**
	 * Refresh dependency data for specific files (incremental update)
	 * @param filePaths Array of file paths that have changed
	 * @returns Promise resolving when refresh is complete
	 */
	refreshDependencies(filePaths: string[]): Promise<void>;

	/**
	 * Get modules that directly depend on the specified module
	 * @param modulePath Path to the module
	 * @returns Promise resolving to array of dependent modules
	 */
	getDirectDependents(modulePath: string): Promise<string[]>;

	/**
	 * Get all modules that the specified module depends on (directly and indirectly)
	 * @param modulePath Path to the module
	 * @returns Promise resolving to array of dependency modules
	 */
	getAllDependencies(modulePath: string): Promise<string[]>;

	/**
	 * Calculate dependency metrics for the workspace
	 * @returns Promise resolving to dependency metrics
	 */
	calculateMetrics(): Promise<DependencyMetrics>;

	/**
	 * Find unused modules (modules that are not imported by any other module)
	 * @returns Promise resolving to array of unused module paths
	 */
	findUnusedModules(): Promise<string[]>;

	/**
	 * Get modules sorted by dependency level (topological sort)
	 * @returns Promise resolving to modules grouped by dependency level
	 */
	getDependencyLevels(): Promise<Map<number, string[]>>;
}
