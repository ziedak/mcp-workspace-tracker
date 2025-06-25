/**
 * Interface for building and analyzing class hierarchies in TypeScript/JavaScript code
 */

export interface ClassNode {
	name: string;
	filePath: string;
	superClass?: string;
	interfaces: string[];
	methods: MethodInfo[];
	properties: PropertyInfo[];
	isAbstract: boolean;
	isInterface: boolean;
	typeParameters?: TypeParameterInfo[];
	accessModifier: "public" | "private" | "protected";
}

export interface MethodInfo {
	name: string;
	returnType: string;
	parameters: ParameterInfo[];
	accessModifier: "public" | "private" | "protected";
	isStatic: boolean;
	isAbstract: boolean;
	isOverride: boolean;
	overriddenFrom?: string;
}

export interface PropertyInfo {
	name: string;
	type: string;
	accessModifier: "public" | "private" | "protected";
	isStatic: boolean;
	isReadonly: boolean;
}

export interface ParameterInfo {
	name: string;
	type: string;
	isOptional: boolean;
	defaultValue?: string;
}

export interface TypeParameterInfo {
	name: string;
	constraint?: string;
	defaultType?: string;
}

export interface InheritanceChain {
	className: string;
	chain: string[];
	depth: number;
}

export interface MethodOverride {
	methodName: string;
	className: string;
	overriddenFrom: string;
	filePath: string;
	signature: string;
}

export interface ClassHierarchy {
	classes: Map<string, ClassNode>;
	interfaces: Map<string, ClassNode>;
	inheritanceTree: Map<string, string[]>; // parent -> children
	implementationTree: Map<string, string[]>; // interface -> implementations
}

/**
 * Service interface for building and analyzing class hierarchies
 */
export interface IClassHierarchyBuilder {
	/**
	 * Build complete class hierarchy for the workspace
	 * @param workspacePath Path to the workspace to analyze
	 * @returns Promise resolving to complete class hierarchy
	 */
	buildHierarchy(workspacePath: string): Promise<ClassHierarchy>;

	/**
	 * Get hierarchy information for a specific class
	 * @param className Name of the class to analyze
	 * @returns Promise resolving to class node or null if not found
	 */
	getClassHierarchy(className: string): Promise<ClassNode | null>;

	/**
	 * Find all classes that implement a specific interface
	 * @param interfaceName Name of the interface
	 * @returns Promise resolving to array of implementing classes
	 */
	getInterfaceImplementations(interfaceName: string): Promise<ClassNode[]>;

	/**
	 * Analyze the complete inheritance chain for a class
	 * @param className Name of the class to analyze
	 * @returns Promise resolving to inheritance chain information
	 */
	analyzeInheritanceChain(className: string): Promise<InheritanceChain>;

	/**
	 * Find method overrides for a specific method
	 * @param className Name of the class containing the method
	 * @param methodName Name of the method to analyze
	 * @returns Promise resolving to array of method overrides
	 */
	findMethodOverrides(className: string, methodName: string): Promise<MethodOverride[]>;

	/**
	 * Refresh hierarchy data for specific files (incremental update)
	 * @param filePaths Array of file paths that have changed
	 * @returns Promise resolving when refresh is complete
	 */
	refreshHierarchy(filePaths: string[]): Promise<void>;

	/**
	 * Get all classes that extend from a specific base class
	 * @param baseClassName Name of the base class
	 * @returns Promise resolving to array of derived classes
	 */
	getDerivedClasses(baseClassName: string): Promise<ClassNode[]>;

	/**
	 * Check if a class implements a specific interface (directly or through inheritance)
	 * @param className Name of the class to check
	 * @param interfaceName Name of the interface to check for
	 * @returns Promise resolving to boolean indicating implementation
	 */
	implementsInterface(className: string, interfaceName: string): Promise<boolean>;
}
