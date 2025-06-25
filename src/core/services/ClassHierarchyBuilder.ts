import { injectable, inject } from "inversify";
import {
	IClassHierarchyBuilder,
	ClassHierarchy,
	ClassNode,
	InheritanceChain,
	MethodOverride,
	MethodInfo,
	PropertyInfo,
	ParameterInfo,
	TypeParameterInfo,
} from "../interfaces/IClassHierarchyBuilder";
import type { ILogger } from "../interfaces/ILogger";
import type { IPersistenceManager } from "../interfaces/IPersistenceManager";
import type { IWorkspaceScanner } from "../interfaces/IWorkspaceScanner";
import { TYPES } from "../../config/types";
import * as ts from "typescript";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Service for building and analyzing class hierarchies in TypeScript/JavaScript code
 * Uses TypeScript Compiler API to extract class relationships and structure
 */
@injectable()
export class ClassHierarchyBuilder implements IClassHierarchyBuilder {
	protected hierarchy: ClassHierarchy;
	protected program: ts.Program | null = null;
	protected typeChecker: ts.TypeChecker | null = null;

	constructor(
		@inject(TYPES.Logger) private readonly logger: ILogger,
		@inject(TYPES.PersistenceManager) private readonly persistenceManager: IPersistenceManager,
		@inject(TYPES.WorkspaceScanner) private readonly workspaceScanner: IWorkspaceScanner
	) {
		this.hierarchy = {
			classes: new Map(),
			interfaces: new Map(),
			inheritanceTree: new Map(),
			implementationTree: new Map(),
		};
	}

	/**
	 * Build complete class hierarchy for the workspace
	 */
	async buildHierarchy(workspacePath: string): Promise<ClassHierarchy> {
		this.logger.info(`Building class hierarchy for workspace: ${workspacePath}`);

		try {
			// Step 1: Scan and filter source files
			const sourceFiles = await this.scanAndFilterSourceFiles(workspacePath);

			if (sourceFiles.length === 0) {
				this.logger.warn("No TypeScript/JavaScript files found in workspace");
				return this.hierarchy;
			}

			// Step 2: Create TypeScript program and type checker
			this.createTypeScriptProgram(sourceFiles);

			// Step 3: Process all source files
			await this.processAllSourceFiles(sourceFiles);

			// Step 4: Build inheritance and implementation trees
			this.buildInheritanceTrees();

			// Step 5: Cache the hierarchy data
			await this.cacheHierarchy();

			this.logger.info(
				`Class hierarchy built successfully. Found ${this.hierarchy.classes.size} classes and ${this.hierarchy.interfaces.size} interfaces`
			);
			return this.hierarchy;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(
				`Failed to build class hierarchy: ${errorMessage}`,
				error instanceof Error ? error : new Error(errorMessage)
			);
			throw error;
		}
	}

	/**
	 * Scan workspace and filter for TypeScript/JavaScript source files
	 * Made protected for testing
	 */
	protected async scanAndFilterSourceFiles(workspacePath: string): Promise<string[]> {
		const files = await this.workspaceScanner.scanWorkspace(workspacePath);
		return files.filter((file) => this.isSourceFile(file.path)).map((file) => file.path);
	}

	/**
	 * Check if a file is a TypeScript/JavaScript source file
	 * Made protected for testing
	 */
	protected isSourceFile(filePath: string): boolean {
		return /\.(ts|tsx|js|jsx)$/.test(filePath) && !/\.d\.ts$/.test(filePath);
	}

	/**
	 * Create TypeScript program and type checker
	 * Made protected for testing
	 */
	protected createTypeScriptProgram(sourceFiles: string[]): void {
		this.program = ts.createProgram(sourceFiles, this.getCompilerOptions());
		this.typeChecker = this.program.getTypeChecker();
	}

	/**
	 * Get TypeScript compiler options
	 * Made protected for testing
	 */
	protected getCompilerOptions(): ts.CompilerOptions {
		return {
			target: ts.ScriptTarget.ES2020,
			module: ts.ModuleKind.CommonJS,
			allowJs: true,
			declaration: false,
			skipLibCheck: true,
			skipDefaultLibCheck: true,
		};
	}

	/**
	 * Process all source files to extract class information
	 * Made protected for testing
	 */
	protected async processAllSourceFiles(sourceFiles: string[]): Promise<void> {
		if (!this.program) {
			throw new Error("TypeScript program not initialized");
		}

		for (const sourceFile of this.program.getSourceFiles()) {
			if (!sourceFile.isDeclarationFile && sourceFiles.includes(sourceFile.fileName)) {
				await this.processSourceFile(sourceFile);
			}
		}
	}

	/**
	 * Get hierarchy information for a specific class
	 */
	async getClassHierarchy(className: string): Promise<ClassNode | null> {
		const classNode =
			this.hierarchy.classes.get(className) || this.hierarchy.interfaces.get(className);
		return classNode || null;
	}

	/**
	 * Find all classes that implement a specific interface
	 */
	async getInterfaceImplementations(interfaceName: string): Promise<ClassNode[]> {
		const implementations = this.hierarchy.implementationTree.get(interfaceName) || [];
		return implementations
			.map((className) => this.hierarchy.classes.get(className))
			.filter((node): node is ClassNode => node !== undefined);
	}

	/**
	 * Analyze the complete inheritance chain for a class
	 */
	async analyzeInheritanceChain(className: string): Promise<InheritanceChain> {
		const chain: string[] = [];
		let currentClass = className;
		let depth = 0;

		while (currentClass) {
			const classNode = this.hierarchy.classes.get(currentClass);
			if (!classNode || !classNode.superClass) {
				break;
			}

			chain.push(classNode.superClass);
			currentClass = classNode.superClass;
			depth++;

			// Prevent infinite loops in case of circular inheritance (shouldn't happen in valid TS)
			if (depth > 50) {
				this.logger.warn(`Possible circular inheritance detected for class: ${className}`);
				break;
			}
		}

		return {
			className,
			chain,
			depth,
		};
	}

	/**
	 * Find method overrides for a specific method
	 */
	async findMethodOverrides(className: string, methodName: string): Promise<MethodOverride[]> {
		const overrides: MethodOverride[] = [];
		const classNode = this.hierarchy.classes.get(className);

		if (!classNode) {
			return overrides;
		}

		// Find the method in the current class
		const method = classNode.methods.find((m) => m.name === methodName);
		if (!method) {
			return overrides;
		}

		// Check if this method overrides a parent method
		if (method.isOverride && method.overriddenFrom) {
			overrides.push({
				methodName,
				className,
				overriddenFrom: method.overriddenFrom,
				filePath: classNode.filePath,
				signature: this.formatMethodSignature(method),
			});
		}

		// Find all derived classes and check if they override this method
		const derivedClasses = await this.getDerivedClasses(className);
		for (const derivedClass of derivedClasses) {
			const derivedMethod = derivedClass.methods.find((m) => m.name === methodName);
			if (derivedMethod && derivedMethod.isOverride) {
				overrides.push({
					methodName,
					className: derivedClass.name,
					overriddenFrom: className,
					filePath: derivedClass.filePath,
					signature: this.formatMethodSignature(derivedMethod),
				});
			}
		}

		return overrides;
	}

	/**
	 * Refresh hierarchy data for specific files (incremental update)
	 */
	async refreshHierarchy(filePaths: string[]): Promise<void> {
		this.logger.info(`Refreshing class hierarchy for ${filePaths.length} files`);

		try {
			// Remove existing data for these files
			for (const filePath of filePaths) {
				this.removeFileFromHierarchy(filePath);
			}

			// Re-process the files
			if (this.program) {
				const updatedProgram = ts.createProgram(filePaths, {
					target: ts.ScriptTarget.ES2020,
					module: ts.ModuleKind.CommonJS,
					allowJs: true,
					declaration: false,
					skipLibCheck: true,
					skipDefaultLibCheck: true,
				});

				this.typeChecker = updatedProgram.getTypeChecker();

				for (const sourceFile of updatedProgram.getSourceFiles()) {
					if (!sourceFile.isDeclarationFile && filePaths.includes(sourceFile.fileName)) {
						await this.processSourceFile(sourceFile);
					}
				}
			}

			// Rebuild trees
			this.buildInheritanceTrees();

			// Update cache
			await this.cacheHierarchy();

			this.logger.info("Class hierarchy refresh completed");
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(
				`Failed to refresh class hierarchy: ${errorMessage}`,
				error instanceof Error ? error : new Error(errorMessage)
			);
			throw error;
		}
	}

	/**
	 * Get all classes that extend from a specific base class
	 */
	async getDerivedClasses(baseClassName: string): Promise<ClassNode[]> {
		const derivedClassNames = this.hierarchy.inheritanceTree.get(baseClassName) || [];
		const derivedClasses: ClassNode[] = [];

		for (const className of derivedClassNames) {
			const classNode = this.hierarchy.classes.get(className);
			if (classNode) {
				derivedClasses.push(classNode);
				// Recursively get derived classes of derived classes
				const nestedDerived = await this.getDerivedClasses(className);
				derivedClasses.push(...nestedDerived);
			}
		}

		return derivedClasses;
	}

	/**
	 * Check if a class implements a specific interface (directly or through inheritance)
	 */
	async implementsInterface(className: string, interfaceName: string): Promise<boolean> {
		const classNode = this.hierarchy.classes.get(className);
		if (!classNode) {
			return false;
		}

		// Check direct implementation
		if (classNode.interfaces.includes(interfaceName)) {
			return true;
		}

		// Check inheritance chain
		const chain = await this.analyzeInheritanceChain(className);
		for (const parentClass of chain.chain) {
			const parentNode = this.hierarchy.classes.get(parentClass);
			if (parentNode && parentNode.interfaces.includes(interfaceName)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Process a TypeScript source file to extract class information
	 * Made protected for testing
	 */
	protected async processSourceFile(sourceFile: ts.SourceFile): Promise<void> {
		const visit = (node: ts.Node) => {
			if (this.isClassOrInterfaceDeclaration(node)) {
				const classNode = this.extractClassNode(node, sourceFile);
				if (classNode) {
					this.addClassNodeToHierarchy(classNode);
				}
			}
			ts.forEachChild(node, visit);
		};

		visit(sourceFile);
	}

	/**
	 * Check if a node is a class or interface declaration
	 * Made protected for testing
	 */
	protected isClassOrInterfaceDeclaration(
		node: ts.Node
	): node is ts.ClassDeclaration | ts.InterfaceDeclaration {
		return ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node);
	}

	/**
	 * Add a class node to the appropriate hierarchy collection
	 * Made protected for testing
	 */
	protected addClassNodeToHierarchy(classNode: ClassNode): void {
		if (classNode.isInterface) {
			this.hierarchy.interfaces.set(classNode.name, classNode);
		} else {
			this.hierarchy.classes.set(classNode.name, classNode);
		}
	}

	/**
	 * Extract class/interface information from a TypeScript node
	 * Made protected for testing
	 */
	protected extractClassNode(
		node: ts.ClassDeclaration | ts.InterfaceDeclaration,
		sourceFile: ts.SourceFile
	): ClassNode | null {
		if (!node.name) {
			return null;
		}

		const className = node.name.text;
		const isInterface = ts.isInterfaceDeclaration(node);
		const isAbstract = this.isAbstractClass(node, isInterface);

		// Extract inheritance information
		const superClass = this.extractSuperClass(node);
		const interfaces = this.extractImplementedInterfaces(node, isInterface);

		// Extract members
		const methods = this.extractMethods(node);
		const properties = this.extractProperties(node);

		// Extract type parameters
		const typeParameters = this.extractTypeParameters(node);

		return {
			name: className,
			filePath: sourceFile.fileName,
			superClass,
			interfaces,
			methods,
			properties,
			isAbstract,
			isInterface,
			typeParameters: typeParameters.length > 0 ? typeParameters : undefined,
			accessModifier: this.getAccessModifier(node.modifiers),
		};
	}

	/**
	 * Check if a class is abstract
	 * Made protected for testing
	 */
	protected isAbstractClass(
		node: ts.ClassDeclaration | ts.InterfaceDeclaration,
		isInterface: boolean
	): boolean {
		return (
			(!isInterface && node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.AbstractKeyword)) ||
			false
		);
	}

	/**
	 * Extract superclass name from a class declaration
	 * Made protected for testing
	 */
	protected extractSuperClass(
		node: ts.ClassDeclaration | ts.InterfaceDeclaration
	): string | undefined {
		if (ts.isClassDeclaration(node) && node.heritageClauses) {
			for (const heritage of node.heritageClauses) {
				if (heritage.token === ts.SyntaxKind.ExtendsKeyword && heritage.types.length > 0) {
					return heritage.types[0].expression.getText();
				}
			}
		}
		return undefined;
	}

	/**
	 * Extract implemented interfaces from a class/interface declaration
	 * Made protected for testing
	 */
	protected extractImplementedInterfaces(
		node: ts.ClassDeclaration | ts.InterfaceDeclaration,
		isInterface: boolean
	): string[] {
		const interfaces: string[] = [];
		if (node.heritageClauses) {
			for (const heritage of node.heritageClauses) {
				const targetToken = isInterface
					? ts.SyntaxKind.ExtendsKeyword
					: ts.SyntaxKind.ImplementsKeyword;
				if (heritage.token === targetToken) {
					interfaces.push(...heritage.types.map((type) => type.expression.getText()));
				}
			}
		}
		return interfaces;
	}

	/**
	 * Extract methods from a class/interface declaration
	 * Made protected for testing
	 */
	protected extractMethods(node: ts.ClassDeclaration | ts.InterfaceDeclaration): MethodInfo[] {
		const methods: MethodInfo[] = [];
		for (const member of node.members) {
			if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
				const method = this.extractMethodInfo(member);
				if (method) {
					methods.push(method);
				}
			}
		}
		return methods;
	}

	/**
	 * Extract properties from a class/interface declaration
	 * Made protected for testing
	 */
	protected extractProperties(node: ts.ClassDeclaration | ts.InterfaceDeclaration): PropertyInfo[] {
		const properties: PropertyInfo[] = [];
		for (const member of node.members) {
			if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
				const property = this.extractPropertyInfo(member);
				if (property) {
					properties.push(property);
				}
			}
		}
		return properties;
	}

	/**
	 * Extract type parameters from a class/interface declaration
	 * Made protected for testing
	 */
	protected extractTypeParameters(
		node: ts.ClassDeclaration | ts.InterfaceDeclaration
	): TypeParameterInfo[] {
		const typeParameters: TypeParameterInfo[] = [];
		if (node.typeParameters) {
			for (const typeParam of node.typeParameters) {
				typeParameters.push({
					name: typeParam.name.text,
					constraint: typeParam.constraint?.getText(),
					defaultType: typeParam.default?.getText(),
				});
			}
		}
		return typeParameters;
	}

	/**
	 * Extract method information from a TypeScript method node
	 * Made protected for testing
	 */
	protected extractMethodInfo(node: ts.MethodDeclaration | ts.MethodSignature): MethodInfo | null {
		if (!node.name) {
			return null;
		}

		const methodName = node.name.getText();
		const isStatic = this.hasStaticModifier(node.modifiers);
		const isAbstract = this.hasAbstractModifier(node.modifiers);

		// Extract parameters
		const parameters = this.extractMethodParameters(node.parameters);

		return {
			name: methodName,
			returnType: node.type?.getText() || "void",
			parameters,
			accessModifier: this.getAccessModifier(node.modifiers),
			isStatic,
			isAbstract,
			isOverride: false, // Will be determined during tree building
			overriddenFrom: undefined,
		};
	}

	/**
	 * Check if modifiers contain static keyword
	 * Made protected for testing
	 */
	protected hasStaticModifier(modifiers?: ts.NodeArray<ts.ModifierLike>): boolean {
		return modifiers?.some((mod) => mod.kind === ts.SyntaxKind.StaticKeyword) || false;
	}

	/**
	 * Check if modifiers contain abstract keyword
	 * Made protected for testing
	 */
	protected hasAbstractModifier(modifiers?: ts.NodeArray<ts.ModifierLike>): boolean {
		return modifiers?.some((mod) => mod.kind === ts.SyntaxKind.AbstractKeyword) || false;
	}

	/**
	 * Extract method parameters from TypeScript parameter list
	 * Made protected for testing
	 */
	protected extractMethodParameters(
		parameters: ts.NodeArray<ts.ParameterDeclaration>
	): ParameterInfo[] {
		const parameterInfos: ParameterInfo[] = [];
		for (const param of parameters) {
			parameterInfos.push({
				name: param.name.getText(),
				type: param.type?.getText() || "any",
				isOptional: !!param.questionToken,
				defaultValue: param.initializer?.getText(),
			});
		}
		return parameterInfos;
	}

	/**
	 * Extract property information from a TypeScript property node
	 * Made protected for testing
	 */
	protected extractPropertyInfo(
		node: ts.PropertyDeclaration | ts.PropertySignature
	): PropertyInfo | null {
		if (!node.name) {
			return null;
		}

		const propertyName = node.name.getText();
		const isStatic = this.hasStaticModifier(node.modifiers);
		const isReadonly = this.hasReadonlyModifier(node.modifiers);

		return {
			name: propertyName,
			type: node.type?.getText() || "any",
			accessModifier: this.getAccessModifier(node.modifiers),
			isStatic,
			isReadonly,
		};
	}

	/**
	 * Check if modifiers contain readonly keyword
	 * Made protected for testing
	 */
	protected hasReadonlyModifier(modifiers?: ts.NodeArray<ts.ModifierLike>): boolean {
		return modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword) || false;
	}

	/**
	 * Get access modifier from TypeScript modifiers
	 * Made protected for testing
	 */
	protected getAccessModifier(
		modifiers?: ts.NodeArray<ts.ModifierLike>
	): "public" | "private" | "protected" {
		if (!modifiers) {
			return "public";
		}

		for (const modifier of modifiers) {
			if (ts.isModifier(modifier)) {
				switch (modifier.kind) {
					case ts.SyntaxKind.PrivateKeyword:
						return "private";
					case ts.SyntaxKind.ProtectedKeyword:
						return "protected";
					case ts.SyntaxKind.PublicKeyword:
						return "public";
				}
			}
		}

		return "public";
	}

	/**
	 * Build inheritance and implementation trees from collected class data
	 * Made protected for testing
	 */
	protected buildInheritanceTrees(): void {
		// Clear existing trees
		this.hierarchy.inheritanceTree.clear();
		this.hierarchy.implementationTree.clear();

		// Build inheritance tree (parent -> children)
		this.buildInheritanceTree();

		// Build implementation tree (interface -> implementations)
		this.buildImplementationTree();
	}

	/**
	 * Build inheritance tree from classes
	 * Made protected for testing
	 */
	protected buildInheritanceTree(): void {
		for (const [className, classNode] of this.hierarchy.classes) {
			if (classNode.superClass) {
				const children = this.hierarchy.inheritanceTree.get(classNode.superClass) || [];
				children.push(className);
				this.hierarchy.inheritanceTree.set(classNode.superClass, children);

				// Mark method overrides
				this.markMethodOverrides(classNode);
			}
		}
	}

	/**
	 * Build implementation tree from interfaces
	 * Made protected for testing
	 */
	protected buildImplementationTree(): void {
		for (const [className, classNode] of this.hierarchy.classes) {
			for (const interfaceName of classNode.interfaces) {
				const implementations = this.hierarchy.implementationTree.get(interfaceName) || [];
				implementations.push(className);
				this.hierarchy.implementationTree.set(interfaceName, implementations);
			}
		}
	}

	/**
	 * Mark method overrides by comparing with parent class methods
	 * Made protected for testing
	 */
	protected markMethodOverrides(classNode: ClassNode): void {
		if (!classNode.superClass) {
			return;
		}

		const parentClass = this.hierarchy.classes.get(classNode.superClass);
		if (!parentClass) {
			return;
		}

		for (const method of classNode.methods) {
			const parentMethod = parentClass.methods.find((m) => m.name === method.name);
			if (parentMethod) {
				method.isOverride = true;
				method.overriddenFrom = classNode.superClass;
			}
		}
	}

	/**
	 * Remove class/interface data for a specific file
	 * Made protected for testing
	 */
	protected removeFileFromHierarchy(filePath: string): void {
		// Remove classes from this file
		for (const [className, classNode] of this.hierarchy.classes) {
			if (classNode.filePath === filePath) {
				this.hierarchy.classes.delete(className);
			}
		}

		// Remove interfaces from this file
		for (const [interfaceName, interfaceNode] of this.hierarchy.interfaces) {
			if (interfaceNode.filePath === filePath) {
				this.hierarchy.interfaces.delete(interfaceName);
			}
		}
	}

	/**
	 * Format method signature for display
	 * Made protected for testing
	 */
	protected formatMethodSignature(method: MethodInfo): string {
		const params = method.parameters
			.map((p) => `${p.name}${p.isOptional ? "?" : ""}: ${p.type}`)
			.join(", ");
		return `${method.name}(${params}): ${method.returnType}`;
	}

	/**
	 * Cache hierarchy data using persistence manager
	 * Made protected for testing
	 */
	protected async cacheHierarchy(): Promise<void> {
		try {
			// Convert Maps to objects for serialization
			const cacheData = {
				classes: Array.from(this.hierarchy.classes.entries()),
				interfaces: Array.from(this.hierarchy.interfaces.entries()),
				inheritanceTree: Array.from(this.hierarchy.inheritanceTree.entries()),
				implementationTree: Array.from(this.hierarchy.implementationTree.entries()),
			};

			await this.persistenceManager.saveData("class-hierarchy", cacheData);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.warn(`Failed to cache class hierarchy data: ${errorMessage}`);
		}
	}
}
