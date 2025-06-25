import "reflect-metadata";
import { Container } from "inversify";
import { ClassHierarchyBuilder } from "../../src/core/services/ClassHierarchyBuilder";
import {
	IClassHierarchyBuilder,
	ClassHierarchy,
	ClassNode,
	MethodInfo,
	PropertyInfo,
	TypeParameterInfo,
} from "../../src/core/interfaces/IClassHierarchyBuilder";
import { ILogger } from "../../src/core/interfaces/ILogger";
import { IPersistenceManager } from "../../src/core/interfaces/IPersistenceManager";
import { IWorkspaceScanner } from "../../src/core/interfaces/IWorkspaceScanner";
import { WorkspaceFile, WorkspaceFileType } from "../../src/core/models/WorkspaceFile";
import { TYPES } from "../../src/config/types";
import * as ts from "typescript";
import * as path from "path";

// Test class that extends ClassHierarchyBuilder to access protected methods
class TestableClassHierarchyBuilder extends ClassHierarchyBuilder {
	// Expose protected methods for testing
	public testScanAndFilterSourceFiles(workspacePath: string): Promise<string[]> {
		return this.scanAndFilterSourceFiles(workspacePath);
	}

	public testIsSourceFile(filePath: string): boolean {
		return this.isSourceFile(filePath);
	}

	public testCreateTypeScriptProgram(sourceFiles: string[]): void {
		return this.createTypeScriptProgram(sourceFiles);
	}

	public testGetCompilerOptions(): ts.CompilerOptions {
		return this.getCompilerOptions();
	}

	public testProcessAllSourceFiles(sourceFiles: string[]): Promise<void> {
		return this.processAllSourceFiles(sourceFiles);
	}

	public testProcessSourceFile(sourceFile: ts.SourceFile): Promise<void> {
		return this.processSourceFile(sourceFile);
	}

	public testIsClassOrInterfaceDeclaration(
		node: ts.Node
	): node is ts.ClassDeclaration | ts.InterfaceDeclaration {
		return this.isClassOrInterfaceDeclaration(node);
	}

	public testAddClassNodeToHierarchy(classNode: ClassNode): void {
		return this.addClassNodeToHierarchy(classNode);
	}

	public testExtractClassNode(
		node: ts.ClassDeclaration | ts.InterfaceDeclaration,
		sourceFile: ts.SourceFile
	): ClassNode | null {
		return this.extractClassNode(node, sourceFile);
	}

	public testIsAbstractClass(
		node: ts.ClassDeclaration | ts.InterfaceDeclaration,
		isInterface: boolean
	): boolean {
		return this.isAbstractClass(node, isInterface);
	}

	public testExtractSuperClass(
		node: ts.ClassDeclaration | ts.InterfaceDeclaration
	): string | undefined {
		return this.extractSuperClass(node);
	}

	public testExtractImplementedInterfaces(
		node: ts.ClassDeclaration | ts.InterfaceDeclaration,
		isInterface: boolean
	): string[] {
		return this.extractImplementedInterfaces(node, isInterface);
	}

	public testExtractMethods(node: ts.ClassDeclaration | ts.InterfaceDeclaration): MethodInfo[] {
		return this.extractMethods(node);
	}

	public testExtractProperties(
		node: ts.ClassDeclaration | ts.InterfaceDeclaration
	): PropertyInfo[] {
		return this.extractProperties(node);
	}

	public testExtractTypeParameters(
		node: ts.ClassDeclaration | ts.InterfaceDeclaration
	): TypeParameterInfo[] {
		return this.extractTypeParameters(node);
	}

	public testExtractMethodInfo(node: ts.MethodDeclaration | ts.MethodSignature): MethodInfo | null {
		return this.extractMethodInfo(node);
	}

	public testHasStaticModifier(modifiers?: ts.NodeArray<ts.ModifierLike>): boolean {
		return this.hasStaticModifier(modifiers);
	}

	public testHasAbstractModifier(modifiers?: ts.NodeArray<ts.ModifierLike>): boolean {
		return this.hasAbstractModifier(modifiers);
	}

	public testExtractMethodParameters(
		parameters: ts.NodeArray<ts.ParameterDeclaration>
	): import("../../src/core/interfaces/IClassHierarchyBuilder").ParameterInfo[] {
		return this.extractMethodParameters(parameters);
	}

	public testExtractPropertyInfo(
		node: ts.PropertyDeclaration | ts.PropertySignature
	): PropertyInfo | null {
		return this.extractPropertyInfo(node);
	}

	public testHasReadonlyModifier(modifiers?: ts.NodeArray<ts.ModifierLike>): boolean {
		return this.hasReadonlyModifier(modifiers);
	}

	public testGetAccessModifier(
		modifiers?: ts.NodeArray<ts.ModifierLike>
	): "public" | "private" | "protected" {
		return this.getAccessModifier(modifiers);
	}

	public testBuildInheritanceTrees(): void {
		return this.buildInheritanceTrees();
	}

	public testBuildInheritanceTree(): void {
		return this.buildInheritanceTree();
	}

	public testBuildImplementationTree(): void {
		return this.buildImplementationTree();
	}

	public testMarkMethodOverrides(classNode: ClassNode): void {
		return this.markMethodOverrides(classNode);
	}

	public testRemoveFileFromHierarchy(filePath: string): void {
		return this.removeFileFromHierarchy(filePath);
	}

	public testFormatMethodSignature(method: MethodInfo): string {
		return this.formatMethodSignature(method);
	}

	public testCacheHierarchy(): Promise<void> {
		return this.cacheHierarchy();
	}

	// Helper to access hierarchy for testing
	public getHierarchy(): ClassHierarchy {
		return this.hierarchy;
	}

	// Helper to access program for testing
	public getProgram(): ts.Program | null {
		return this.program;
	}

	// Helper to access type checker for testing
	public getTypeChecker(): ts.TypeChecker | null {
		return this.typeChecker;
	}
}

// Mock dependencies
const mockLogger: jest.Mocked<ILogger> = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
};

const mockPersistenceManager: jest.Mocked<IPersistenceManager> = {
	initialize: jest.fn(),
	isCachedAndUnchanged: jest.fn(),
	updateFileHash: jest.fn(),
	saveData: jest.fn(),
	loadData: jest.fn(),
	clear: jest.fn(),
};

const mockWorkspaceScanner: jest.Mocked<IWorkspaceScanner> = {
	scanWorkspace: jest.fn(),
	findFiles: jest.fn(),
	readFile: jest.fn(),
	getWorkspaceStats: jest.fn(),
};

describe("ClassHierarchyBuilder", () => {
	let container: Container;
	let classHierarchyBuilder: IClassHierarchyBuilder;
	let testableBuilder: TestableClassHierarchyBuilder;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Create fresh container
		container = new Container();
		container.bind<ILogger>(TYPES.Logger).toConstantValue(mockLogger);
		container
			.bind<IPersistenceManager>(TYPES.PersistenceManager)
			.toConstantValue(mockPersistenceManager);
		container.bind<IWorkspaceScanner>(TYPES.WorkspaceScanner).toConstantValue(mockWorkspaceScanner);
		container.bind<IClassHierarchyBuilder>(TYPES.ClassHierarchyBuilder).to(ClassHierarchyBuilder);

		// Get instances
		classHierarchyBuilder = container.get<IClassHierarchyBuilder>(TYPES.ClassHierarchyBuilder);

		// Create testable instance
		testableBuilder = new TestableClassHierarchyBuilder(
			mockLogger,
			mockPersistenceManager,
			mockWorkspaceScanner
		);
	});

	it("should be defined", () => {
		expect(ClassHierarchyBuilder).toBeDefined();
	});

	it("should be instantiable", () => {
		expect(classHierarchyBuilder).toBeInstanceOf(ClassHierarchyBuilder);
	});

	describe("buildHierarchy", () => {
		it("should build hierarchy from TypeScript files", async () => {
			const workspacePath = "/test/workspace";
			const testFiles = [
				new WorkspaceFile(
					path.join(workspacePath, "BaseClass.ts"),
					"BaseClass.ts",
					WorkspaceFileType.SOURCE,
					100,
					new Date()
				),
				new WorkspaceFile(
					path.join(workspacePath, "DerivedClass.ts"),
					"DerivedClass.ts",
					WorkspaceFileType.SOURCE,
					150,
					new Date()
				),
			];

			const baseClassContent = `
				export class BaseClass {
					protected name: string;
					
					constructor(name: string) {
						this.name = name;
					}
					
					public getName(): string {
						return this.name;
					}
				}
			`;

			const derivedClassContent = `
				import { BaseClass } from './BaseClass';
				
				export class DerivedClass extends BaseClass {
					private id: number;
					
					constructor(name: string, id: number) {
						super(name);
						this.id = id;
					}
					
					public getId(): number {
						return this.id;
					}
					
					public getName(): string {
						return \`\${super.getName()}_\${this.id}\`;
					}
				}
			`;

			mockWorkspaceScanner.scanWorkspace.mockResolvedValue(testFiles);
			mockWorkspaceScanner.readFile
				.mockResolvedValueOnce(baseClassContent)
				.mockResolvedValueOnce(derivedClassContent);
			mockPersistenceManager.loadData.mockResolvedValue(null);
			mockPersistenceManager.saveData.mockResolvedValue();

			const result = await classHierarchyBuilder.buildHierarchy(workspacePath);

			expect(result).toBeDefined();
			expect(result.classes).toBeDefined();
			expect(mockWorkspaceScanner.scanWorkspace).toHaveBeenCalledWith(workspacePath);
			expect(mockPersistenceManager.saveData).toHaveBeenCalled();
		});

		it("should handle empty workspace", async () => {
			const workspacePath = "/empty/workspace";
			mockWorkspaceScanner.scanWorkspace.mockResolvedValue([]);
			mockPersistenceManager.loadData.mockResolvedValue(null);

			const result = await classHierarchyBuilder.buildHierarchy(workspacePath);

			expect(result).toBeDefined();
			expect(result.classes).toBeDefined();
		});

		it("should build new hierarchy when no cache available", async () => {
			const workspacePath = "/cached/workspace";

			mockWorkspaceScanner.scanWorkspace.mockResolvedValue([]);

			const result = await classHierarchyBuilder.buildHierarchy(workspacePath);

			expect(result).toBeDefined();
			expect(result.classes).toBeDefined();
		});

		it("should handle scan errors gracefully", async () => {
			const workspacePath = "/error/workspace";
			mockWorkspaceScanner.scanWorkspace.mockRejectedValue(new Error("Scan failed"));

			await expect(classHierarchyBuilder.buildHierarchy(workspacePath)).rejects.toThrow(
				"Scan failed"
			);
		});
	});

	describe("getClassHierarchy", () => {
		it("should return null for non-existent class", async () => {
			mockWorkspaceScanner.scanWorkspace.mockResolvedValue([]);
			mockPersistenceManager.loadData.mockResolvedValue(null);

			await classHierarchyBuilder.buildHierarchy("/test");
			const result = await classHierarchyBuilder.getClassHierarchy("NonExistentClass");
			expect(result).toBeNull();
		});
	});

	describe("getInterfaceImplementations", () => {
		it("should return empty array for interface with no implementations", async () => {
			const result = await classHierarchyBuilder.getInterfaceImplementations("IUnused");
			expect(result).toEqual([]);
		});
	});

	describe("analyzeInheritanceChain", () => {
		it("should handle class with no inheritance", async () => {
			const result = await classHierarchyBuilder.analyzeInheritanceChain("BaseClass");
			expect(result).toBeDefined();
			expect(result.className).toBe("BaseClass");
		});

		it("should build complete inheritance chain", async () => {
			// Setup test hierarchy with multiple levels
			const grandParent: ClassNode = {
				name: "GrandParent",
				filePath: "/test/GrandParent.ts",
				superClass: undefined,
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			const parent: ClassNode = {
				name: "Parent",
				filePath: "/test/Parent.ts",
				superClass: "GrandParent",
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			const child: ClassNode = {
				name: "Child",
				filePath: "/test/Child.ts",
				superClass: "Parent",
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			testableBuilder.testAddClassNodeToHierarchy(grandParent);
			testableBuilder.testAddClassNodeToHierarchy(parent);
			testableBuilder.testAddClassNodeToHierarchy(child);

			const result = await testableBuilder.analyzeInheritanceChain("Child");

			expect(result.className).toBe("Child");
			expect(result.chain).toEqual(["Parent", "GrandParent"]);
			expect(result.depth).toBe(2);
		});

		it("should detect potential circular inheritance", async () => {
			// This would be an invalid scenario but we should handle it gracefully
			const classA: ClassNode = {
				name: "ClassA",
				filePath: "/test/ClassA.ts",
				superClass: "ClassB",
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			// Create a deep chain that exceeds the limit
			for (let i = 0; i < 60; i++) {
				const className = `Class${i}`;
				const superClassName = i < 59 ? `Class${i + 1}` : undefined;
				const classNode: ClassNode = {
					name: className,
					filePath: `/test/${className}.ts`,
					superClass: superClassName,
					interfaces: [],
					methods: [],
					properties: [],
					isAbstract: false,
					isInterface: false,
					accessModifier: "public",
				};
				testableBuilder.testAddClassNodeToHierarchy(classNode);
			}

			const result = await testableBuilder.analyzeInheritanceChain("Class0");

			expect(result.className).toBe("Class0");
			expect(result.depth).toBe(51); // Actually processes 51 before warning
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining("Possible circular inheritance detected")
			);
		});
	});

	describe("findMethodOverrides", () => {
		it("should return empty array for method with no overrides", async () => {
			const result = await classHierarchyBuilder.findMethodOverrides("BaseClass", "getName");
			expect(result).toEqual([]);
		});

		it("should find method overrides in inheritance chain", async () => {
			// Setup test hierarchy with method overrides
			const baseClass: ClassNode = {
				name: "BaseClass",
				filePath: "/test/BaseClass.ts",
				superClass: undefined,
				interfaces: [],
				methods: [
					{
						name: "getName",
						returnType: "string",
						parameters: [],
						accessModifier: "public",
						isStatic: false,
						isAbstract: false,
						isOverride: false,
					},
				],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			const derivedClass: ClassNode = {
				name: "DerivedClass",
				filePath: "/test/DerivedClass.ts",
				superClass: "BaseClass",
				interfaces: [],
				methods: [
					{
						name: "getName",
						returnType: "string",
						parameters: [],
						accessModifier: "public",
						isStatic: false,
						isAbstract: false,
						isOverride: true,
						overriddenFrom: "BaseClass",
					},
				],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			testableBuilder.testAddClassNodeToHierarchy(baseClass);
			testableBuilder.testAddClassNodeToHierarchy(derivedClass);
			testableBuilder.testBuildInheritanceTrees();

			const result = await testableBuilder.findMethodOverrides("BaseClass", "getName");

			expect(result).toHaveLength(1);
			expect(result[0].methodName).toBe("getName");
			expect(result[0].className).toBe("DerivedClass");
			expect(result[0].overriddenFrom).toBe("BaseClass");
			expect(result[0].filePath).toBe("/test/DerivedClass.ts");
		});

		it("should return empty array for non-existent class", async () => {
			const result = await testableBuilder.findMethodOverrides("NonExistentClass", "someMethod");
			expect(result).toEqual([]);
		});

		it("should return empty array for non-existent method", async () => {
			const baseClass: ClassNode = {
				name: "BaseClass",
				filePath: "/test/BaseClass.ts",
				superClass: undefined,
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			testableBuilder.testAddClassNodeToHierarchy(baseClass);

			const result = await testableBuilder.findMethodOverrides("BaseClass", "nonExistentMethod");
			expect(result).toEqual([]);
		});
	});

	describe("refreshHierarchy", () => {
		it("should handle refresh with empty file list", async () => {
			await expect(classHierarchyBuilder.refreshHierarchy([])).resolves.not.toThrow();
		});

		it("should handle refresh with file list", async () => {
			const filePaths = ["/test/file1.ts", "/test/file2.ts"];
			mockWorkspaceScanner.readFile.mockResolvedValue("export class TestClass {}");

			await expect(classHierarchyBuilder.refreshHierarchy(filePaths)).resolves.not.toThrow();
		});

		it("should remove existing files and re-process", async () => {
			// Setup initial hierarchy
			const testClass: ClassNode = {
				name: "TestClass",
				filePath: "/test/TestClass.ts",
				superClass: undefined,
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			testableBuilder.testAddClassNodeToHierarchy(testClass);

			// Initialize program
			testableBuilder.testCreateTypeScriptProgram(["/test/dummy.ts"]);

			const hierarchy = testableBuilder.getHierarchy();
			expect(hierarchy.classes.has("TestClass")).toBe(true);

			// Refresh with the same file
			await testableBuilder.refreshHierarchy(["/test/TestClass.ts"]);

			// Should have processed the refresh
			expect(mockPersistenceManager.saveData).toHaveBeenCalled();
		});

		it("should handle refresh when no program exists", async () => {
			// Ensure program is null
			expect(testableBuilder.getProgram()).toBeNull();

			// Should not throw
			await expect(testableBuilder.refreshHierarchy(["/test/file.ts"])).resolves.not.toThrow();
		});
	});

	describe("implementsInterface", () => {
		it("should return false for class that doesn't implement interface", async () => {
			const result = await classHierarchyBuilder.implementsInterface("BaseClass", "IUnused");
			expect(result).toBe(false);
		});

		it("should return true for direct interface implementation", async () => {
			const testClass: ClassNode = {
				name: "TestClass",
				filePath: "/test/TestClass.ts",
				superClass: undefined,
				interfaces: ["ITestInterface"],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			testableBuilder.testAddClassNodeToHierarchy(testClass);

			const result = await testableBuilder.implementsInterface("TestClass", "ITestInterface");
			expect(result).toBe(true);
		});

		it("should return true for inherited interface implementation", async () => {
			// Setup parent class that implements interface
			const parentClass: ClassNode = {
				name: "ParentClass",
				filePath: "/test/ParentClass.ts",
				superClass: undefined,
				interfaces: ["ITestInterface"],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			// Setup child class that extends parent
			const childClass: ClassNode = {
				name: "ChildClass",
				filePath: "/test/ChildClass.ts",
				superClass: "ParentClass",
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			testableBuilder.testAddClassNodeToHierarchy(parentClass);
			testableBuilder.testAddClassNodeToHierarchy(childClass);

			const result = await testableBuilder.implementsInterface("ChildClass", "ITestInterface");
			expect(result).toBe(true);
		});

		it("should return false for non-existent class", async () => {
			const result = await testableBuilder.implementsInterface(
				"NonExistentClass",
				"ITestInterface"
			);
			expect(result).toBe(false);
		});
	});

	describe("getDerivedClasses", () => {
		it("should return empty array for class with no derived classes", async () => {
			const baseClass: ClassNode = {
				name: "BaseClass",
				filePath: "/test/BaseClass.ts",
				superClass: undefined,
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			testableBuilder.testAddClassNodeToHierarchy(baseClass);
			testableBuilder.testBuildInheritanceTrees();

			const result = await testableBuilder.getDerivedClasses("BaseClass");
			expect(result).toEqual([]);
		});

		it("should return direct and nested derived classes", async () => {
			// Setup inheritance hierarchy: Base -> Child1, Base -> Child2 -> GrandChild
			const baseClass: ClassNode = {
				name: "BaseClass",
				filePath: "/test/BaseClass.ts",
				superClass: undefined,
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			const child1: ClassNode = {
				name: "Child1",
				filePath: "/test/Child1.ts",
				superClass: "BaseClass",
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			const child2: ClassNode = {
				name: "Child2",
				filePath: "/test/Child2.ts",
				superClass: "BaseClass",
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			const grandChild: ClassNode = {
				name: "GrandChild",
				filePath: "/test/GrandChild.ts",
				superClass: "Child2",
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			testableBuilder.testAddClassNodeToHierarchy(baseClass);
			testableBuilder.testAddClassNodeToHierarchy(child1);
			testableBuilder.testAddClassNodeToHierarchy(child2);
			testableBuilder.testAddClassNodeToHierarchy(grandChild);
			testableBuilder.testBuildInheritanceTrees();

			const result = await testableBuilder.getDerivedClasses("BaseClass");

			expect(result).toHaveLength(3); // Child1, Child2, GrandChild
			const classNames = result.map((c) => c.name);
			expect(classNames).toContain("Child1");
			expect(classNames).toContain("Child2");
			expect(classNames).toContain("GrandChild");
		});
	});

	describe("getInterfaceImplementations", () => {
		it("should return empty array for interface with no implementations", async () => {
			const result = await classHierarchyBuilder.getInterfaceImplementations("IUnused");
			expect(result).toEqual([]);
		});

		it("should return classes that implement interface", async () => {
			const interface1: ClassNode = {
				name: "ITestInterface",
				filePath: "/test/ITestInterface.ts",
				superClass: undefined,
				interfaces: [],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: true,
				accessModifier: "public",
			};

			const class1: ClassNode = {
				name: "TestClass1",
				filePath: "/test/TestClass1.ts",
				superClass: undefined,
				interfaces: ["ITestInterface"],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			const class2: ClassNode = {
				name: "TestClass2",
				filePath: "/test/TestClass2.ts",
				superClass: undefined,
				interfaces: ["ITestInterface", "IOtherInterface"],
				methods: [],
				properties: [],
				isAbstract: false,
				isInterface: false,
				accessModifier: "public",
			};

			testableBuilder.testAddClassNodeToHierarchy(interface1);
			testableBuilder.testAddClassNodeToHierarchy(class1);
			testableBuilder.testAddClassNodeToHierarchy(class2);
			testableBuilder.testBuildInheritanceTrees();

			const result = await testableBuilder.getInterfaceImplementations("ITestInterface");

			expect(result).toHaveLength(2);
			const classNames = result.map((c) => c.name);
			expect(classNames).toContain("TestClass1");
			expect(classNames).toContain("TestClass2");
		});
	});

	describe("error handling", () => {
		it("should handle file read errors", async () => {
			const workspacePath = "/test/workspace";
			const testFiles = [
				new WorkspaceFile(
					path.join(workspacePath, "ErrorFile.ts"),
					"ErrorFile.ts",
					WorkspaceFileType.SOURCE,
					100,
					new Date()
				),
			];

			mockWorkspaceScanner.scanWorkspace.mockResolvedValue(testFiles);
			mockWorkspaceScanner.readFile.mockRejectedValue(new Error("File read error"));
			mockPersistenceManager.loadData.mockResolvedValue(null);

			// Should not throw, should handle error gracefully
			await expect(classHierarchyBuilder.buildHierarchy(workspacePath)).resolves.toBeDefined();
		});

		it("should handle invalid TypeScript code", async () => {
			const workspacePath = "/test/workspace";
			const testFiles = [
				new WorkspaceFile(
					path.join(workspacePath, "InvalidFile.ts"),
					"InvalidFile.ts",
					WorkspaceFileType.SOURCE,
					100,
					new Date()
				),
			];

			const invalidContent = "this is not valid typescript code {{{ }}";

			mockWorkspaceScanner.scanWorkspace.mockResolvedValue(testFiles);
			mockWorkspaceScanner.readFile.mockResolvedValue(invalidContent);
			mockPersistenceManager.loadData.mockResolvedValue(null);

			// Should handle invalid syntax gracefully
			await expect(classHierarchyBuilder.buildHierarchy(workspacePath)).resolves.toBeDefined();
		});
	});

	describe("persistence integration", () => {
		it("should handle persistence operations gracefully", async () => {
			const workspacePath = "/test/workspace";
			const testFiles = [
				new WorkspaceFile(
					path.join(workspacePath, "TestClass.ts"),
					"TestClass.ts",
					WorkspaceFileType.SOURCE,
					100,
					new Date()
				),
			];

			const testContent = "export class TestClass {}";

			mockWorkspaceScanner.scanWorkspace.mockResolvedValue(testFiles);
			mockWorkspaceScanner.readFile.mockResolvedValue(testContent);
			mockPersistenceManager.saveData.mockResolvedValue();

			const result = await classHierarchyBuilder.buildHierarchy(workspacePath);

			expect(result).toBeDefined();
			// Verify saveData was called (implementation uses this for caching)
			expect(mockPersistenceManager.saveData).toHaveBeenCalledWith(
				"class-hierarchy",
				expect.any(Object)
			);
		});

		it("should handle save errors gracefully", async () => {
			const workspacePath = "/test/workspace";
			const testFiles = [
				new WorkspaceFile(
					path.join(workspacePath, "TestClass.ts"),
					"TestClass.ts",
					WorkspaceFileType.SOURCE,
					100,
					new Date()
				),
			];

			mockWorkspaceScanner.scanWorkspace.mockResolvedValue(testFiles);
			mockWorkspaceScanner.readFile.mockResolvedValue("export class TestClass {}");
			mockPersistenceManager.saveData.mockRejectedValue(new Error("Save failed"));

			// Should not throw even if save fails
			await expect(classHierarchyBuilder.buildHierarchy(workspacePath)).resolves.toBeDefined();
		});
	});

	// Tests for protected helper methods
	describe("Protected Helper Methods", () => {
		describe("isSourceFile", () => {
			it("should return true for TypeScript files", () => {
				expect(testableBuilder.testIsSourceFile("test.ts")).toBe(true);
				expect(testableBuilder.testIsSourceFile("test.tsx")).toBe(true);
			});

			it("should return true for JavaScript files", () => {
				expect(testableBuilder.testIsSourceFile("test.js")).toBe(true);
				expect(testableBuilder.testIsSourceFile("test.jsx")).toBe(true);
			});

			it("should return false for non-source files", () => {
				expect(testableBuilder.testIsSourceFile("test.json")).toBe(false);
				expect(testableBuilder.testIsSourceFile("test.md")).toBe(false);
				expect(testableBuilder.testIsSourceFile("test.txt")).toBe(false);
				expect(testableBuilder.testIsSourceFile("test.d.ts")).toBe(false);
			});

			it("should handle files without extensions", () => {
				expect(testableBuilder.testIsSourceFile("README")).toBe(false);
			});

			it("should handle paths with multiple dots", () => {
				expect(testableBuilder.testIsSourceFile("test.component.ts")).toBe(true);
				expect(testableBuilder.testIsSourceFile("test.component.d.ts")).toBe(false);
				expect(testableBuilder.testIsSourceFile("test.spec.ts")).toBe(true);
			});
		});

		describe("scanAndFilterSourceFiles", () => {
			it("should filter workspace files to only include source files", async () => {
				const workspacePath = "/test/workspace";
				const testFiles = [
					new WorkspaceFile(
						path.join(workspacePath, "index.ts"),
						"index.ts",
						WorkspaceFileType.SOURCE,
						100,
						new Date()
					),
					new WorkspaceFile(
						path.join(workspacePath, "config.json"),
						"config.json",
						WorkspaceFileType.CONFIG,
						50,
						new Date()
					),
					new WorkspaceFile(
						path.join(workspacePath, "utils.js"),
						"utils.js",
						WorkspaceFileType.SOURCE,
						75,
						new Date()
					),
					new WorkspaceFile(
						path.join(workspacePath, "README.md"),
						"README.md",
						WorkspaceFileType.DOCUMENTATION,
						25,
						new Date()
					),
				];

				mockWorkspaceScanner.scanWorkspace.mockResolvedValue(testFiles);

				const result = await testableBuilder.testScanAndFilterSourceFiles(workspacePath);

				expect(mockWorkspaceScanner.scanWorkspace).toHaveBeenCalledWith(workspacePath);
				expect(result).toHaveLength(2);
				expect(result).toContain(path.join(workspacePath, "index.ts"));
				expect(result).toContain(path.join(workspacePath, "utils.js"));
				expect(result).not.toContain(path.join(workspacePath, "config.json"));
				expect(result).not.toContain(path.join(workspacePath, "README.md"));
			});

			it("should return empty array when no source files found", async () => {
				const workspacePath = "/test/workspace";
				const testFiles = [
					new WorkspaceFile(
						path.join(workspacePath, "config.json"),
						"config.json",
						WorkspaceFileType.CONFIG,
						50,
						new Date()
					),
					new WorkspaceFile(
						path.join(workspacePath, "README.md"),
						"README.md",
						WorkspaceFileType.DOCUMENTATION,
						25,
						new Date()
					),
				];

				mockWorkspaceScanner.scanWorkspace.mockResolvedValue(testFiles);

				const result = await testableBuilder.testScanAndFilterSourceFiles(workspacePath);

				expect(result).toHaveLength(0);
			});
		});

		describe("getCompilerOptions", () => {
			it("should return consistent TypeScript compiler options", () => {
				const options = testableBuilder.testGetCompilerOptions();

				expect(options).toBeDefined();
				expect(options.target).toBe(ts.ScriptTarget.ES2020);
				expect(options.module).toBe(ts.ModuleKind.CommonJS);
				expect(options.allowJs).toBe(true);
				expect(options.declaration).toBe(false);
				expect(options.skipLibCheck).toBe(true);
				expect(options.skipDefaultLibCheck).toBe(true);
			});
		});

		describe("createTypeScriptProgram", () => {
			it("should create TypeScript program and type checker", () => {
				const sourceFiles = ["/test/file1.ts", "/test/file2.ts"];

				// Before creation
				expect(testableBuilder.getProgram()).toBeNull();
				expect(testableBuilder.getTypeChecker()).toBeNull();

				testableBuilder.testCreateTypeScriptProgram(sourceFiles);

				// After creation
				expect(testableBuilder.getProgram()).not.toBeNull();
				expect(testableBuilder.getTypeChecker()).not.toBeNull();
			});
		});

		describe("isClassOrInterfaceDeclaration", () => {
			it("should identify class declarations", () => {
				const source = ts.createSourceFile(
					"test.ts",
					"class TestClass {}",
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						expect(testableBuilder.testIsClassOrInterfaceDeclaration(node)).toBe(true);
					}
				});
			});

			it("should identify interface declarations", () => {
				const source = ts.createSourceFile(
					"test.ts",
					"interface ITestInterface {}",
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isInterfaceDeclaration(node)) {
						expect(testableBuilder.testIsClassOrInterfaceDeclaration(node)).toBe(true);
					}
				});
			});

			it("should reject other node types", () => {
				const source = ts.createSourceFile(
					"test.ts",
					"const x = 5; function test() {}",
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					expect(testableBuilder.testIsClassOrInterfaceDeclaration(node)).toBe(false);
				});
			});
		});

		describe("addClassNodeToHierarchy", () => {
			it("should add class to classes collection", () => {
				const classNode: ClassNode = {
					name: "TestClass",
					filePath: "/test/TestClass.ts",
					superClass: undefined,
					interfaces: [],
					methods: [],
					properties: [],
					isAbstract: false,
					isInterface: false,
					accessModifier: "public",
				};

				testableBuilder.testAddClassNodeToHierarchy(classNode);

				const hierarchy = testableBuilder.getHierarchy();
				expect(hierarchy.classes.has("TestClass")).toBe(true);
				expect(hierarchy.classes.get("TestClass")).toBe(classNode);
				expect(hierarchy.interfaces.has("TestClass")).toBe(false);
			});

			it("should add interface to interfaces collection", () => {
				const interfaceNode: ClassNode = {
					name: "ITestInterface",
					filePath: "/test/ITestInterface.ts",
					superClass: undefined,
					interfaces: [],
					methods: [],
					properties: [],
					isAbstract: false,
					isInterface: true,
					accessModifier: "public",
				};

				testableBuilder.testAddClassNodeToHierarchy(interfaceNode);

				const hierarchy = testableBuilder.getHierarchy();
				expect(hierarchy.interfaces.has("ITestInterface")).toBe(true);
				expect(hierarchy.interfaces.get("ITestInterface")).toBe(interfaceNode);
				expect(hierarchy.classes.has("ITestInterface")).toBe(false);
			});
		});

		describe("getAccessModifier", () => {
			it("should return public by default", () => {
				expect(testableBuilder.testGetAccessModifier()).toBe("public");
				expect(testableBuilder.testGetAccessModifier(undefined)).toBe("public");
			});

			it("should detect private modifier", () => {
				const source = ts.createSourceFile(
					"test.ts",
					"class Test { private x: number; }",
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						node.members.forEach((member) => {
							if (ts.isPropertyDeclaration(member)) {
								expect(testableBuilder.testGetAccessModifier(member.modifiers)).toBe("private");
							}
						});
					}
				});
			});

			it("should detect protected modifier", () => {
				const source = ts.createSourceFile(
					"test.ts",
					"class Test { protected x: number; }",
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						node.members.forEach((member) => {
							if (ts.isPropertyDeclaration(member)) {
								expect(testableBuilder.testGetAccessModifier(member.modifiers)).toBe("protected");
							}
						});
					}
				});
			});

			it("should detect public modifier", () => {
				const source = ts.createSourceFile(
					"test.ts",
					"class Test { public x: number; }",
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						node.members.forEach((member) => {
							if (ts.isPropertyDeclaration(member)) {
								expect(testableBuilder.testGetAccessModifier(member.modifiers)).toBe("public");
							}
						});
					}
				});
			});
		});

		describe("hasStaticModifier", () => {
			it("should return false for no modifiers", () => {
				expect(testableBuilder.testHasStaticModifier()).toBe(false);
				expect(testableBuilder.testHasStaticModifier(undefined)).toBe(false);
			});

			it("should detect static modifier", () => {
				const source = ts.createSourceFile(
					"test.ts",
					"class Test { static x: number; }",
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						node.members.forEach((member) => {
							if (ts.isPropertyDeclaration(member)) {
								expect(testableBuilder.testHasStaticModifier(member.modifiers)).toBe(true);
							}
						});
					}
				});
			});

			it("should return false without static modifier", () => {
				const source = ts.createSourceFile(
					"test.ts",
					"class Test { private x: number; }",
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						node.members.forEach((member) => {
							if (ts.isPropertyDeclaration(member)) {
								expect(testableBuilder.testHasStaticModifier(member.modifiers)).toBe(false);
							}
						});
					}
				});
			});
		});

		describe("hasAbstractModifier", () => {
			it("should return false for no modifiers", () => {
				expect(testableBuilder.testHasAbstractModifier()).toBe(false);
				expect(testableBuilder.testHasAbstractModifier(undefined)).toBe(false);
			});

			it("should detect abstract modifier", () => {
				const source = ts.createSourceFile(
					"test.ts",
					"abstract class Test { abstract method(): void; }",
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						node.members.forEach((member) => {
							if (ts.isMethodDeclaration(member)) {
								expect(testableBuilder.testHasAbstractModifier(member.modifiers)).toBe(true);
							}
						});
					}
				});
			});
		});

		describe("hasReadonlyModifier", () => {
			it("should return false for no modifiers", () => {
				expect(testableBuilder.testHasReadonlyModifier()).toBe(false);
				expect(testableBuilder.testHasReadonlyModifier(undefined)).toBe(false);
			});

			it("should detect readonly modifier", () => {
				const source = ts.createSourceFile(
					"test.ts",
					"class Test { readonly x: number; }",
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						node.members.forEach((member) => {
							if (ts.isPropertyDeclaration(member)) {
								expect(testableBuilder.testHasReadonlyModifier(member.modifiers)).toBe(true);
							}
						});
					}
				});
			});
		});

		describe("formatMethodSignature", () => {
			it("should format method signature correctly", () => {
				const method: MethodInfo = {
					name: "testMethod",
					returnType: "string",
					parameters: [
						{ name: "param1", type: "number", isOptional: false },
						{ name: "param2", type: "string", isOptional: true },
					],
					accessModifier: "public",
					isStatic: false,
					isAbstract: false,
					isOverride: false,
				};

				const signature = testableBuilder.testFormatMethodSignature(method);
				expect(signature).toBe("testMethod(param1: number, param2?: string): string");
			});

			it("should handle method with no parameters", () => {
				const method: MethodInfo = {
					name: "noParams",
					returnType: "void",
					parameters: [],
					accessModifier: "public",
					isStatic: false,
					isAbstract: false,
					isOverride: false,
				};

				const signature = testableBuilder.testFormatMethodSignature(method);
				expect(signature).toBe("noParams(): void");
			});
		});

		describe("cacheHierarchy", () => {
			it("should call persistenceManager.saveData", async () => {
				mockPersistenceManager.saveData.mockResolvedValue();

				await testableBuilder.testCacheHierarchy();

				expect(mockPersistenceManager.saveData).toHaveBeenCalledWith(
					"class-hierarchy",
					expect.objectContaining({
						classes: expect.any(Array),
						interfaces: expect.any(Array),
						inheritanceTree: expect.any(Array),
						implementationTree: expect.any(Array),
					})
				);
			});

			it("should handle save errors gracefully", async () => {
				mockPersistenceManager.saveData.mockRejectedValue(new Error("Save failed"));

				// Should not throw
				await expect(testableBuilder.testCacheHierarchy()).resolves.not.toThrow();
				expect(mockLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining("Failed to cache class hierarchy data")
				);
			});
		});

		describe("removeFileFromHierarchy", () => {
			it("should remove classes and interfaces from specified file", () => {
				const filePath = "/test/TestFile.ts";

				// Add test data
				const classNode: ClassNode = {
					name: "TestClass",
					filePath,
					superClass: undefined,
					interfaces: [],
					methods: [],
					properties: [],
					isAbstract: false,
					isInterface: false,
					accessModifier: "public",
				};

				const interfaceNode: ClassNode = {
					name: "ITestInterface",
					filePath,
					superClass: undefined,
					interfaces: [],
					methods: [],
					properties: [],
					isAbstract: false,
					isInterface: true,
					accessModifier: "public",
				};

				testableBuilder.testAddClassNodeToHierarchy(classNode);
				testableBuilder.testAddClassNodeToHierarchy(interfaceNode);

				const hierarchy = testableBuilder.getHierarchy();
				expect(hierarchy.classes.has("TestClass")).toBe(true);
				expect(hierarchy.interfaces.has("ITestInterface")).toBe(true);

				testableBuilder.testRemoveFileFromHierarchy(filePath);

				expect(hierarchy.classes.has("TestClass")).toBe(false);
				expect(hierarchy.interfaces.has("ITestInterface")).toBe(false);
			});

			it("should not affect classes from other files", () => {
				const filePath1 = "/test/File1.ts";
				const filePath2 = "/test/File2.ts";

				const classNode1: ClassNode = {
					name: "Class1",
					filePath: filePath1,
					superClass: undefined,
					interfaces: [],
					methods: [],
					properties: [],
					isAbstract: false,
					isInterface: false,
					accessModifier: "public",
				};

				const classNode2: ClassNode = {
					name: "Class2",
					filePath: filePath2,
					superClass: undefined,
					interfaces: [],
					methods: [],
					properties: [],
					isAbstract: false,
					isInterface: false,
					accessModifier: "public",
				};

				testableBuilder.testAddClassNodeToHierarchy(classNode1);
				testableBuilder.testAddClassNodeToHierarchy(classNode2);

				testableBuilder.testRemoveFileFromHierarchy(filePath1);

				const hierarchy = testableBuilder.getHierarchy();
				expect(hierarchy.classes.has("Class1")).toBe(false);
				expect(hierarchy.classes.has("Class2")).toBe(true);
			});
		});

		describe("extractClassNode", () => {
			it("should extract class information correctly", () => {
				const source = ts.createSourceFile(
					"test.ts",
					`
					abstract class TestClass extends BaseClass implements IInterface {
						private name: string;
						protected age: number;
						public static count: number;
						
						constructor(name: string) {
							this.name = name;
						}
						
						public getName(): string {
							return this.name;
						}
						
						abstract getAge(): number;
						static getCount(): number {
							return TestClass.count;
						}
					}
					`,
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						const classNode = testableBuilder.testExtractClassNode(node, source);

						expect(classNode).not.toBeNull();
						expect(classNode!.name).toBe("TestClass");
						expect(classNode!.superClass).toBe("BaseClass");
						expect(classNode!.interfaces).toContain("IInterface");
						expect(classNode!.isAbstract).toBe(true);
						expect(classNode!.isInterface).toBe(false);
						expect(classNode!.methods).toHaveLength(3); // constructor, getName, getAge, getCount
						expect(classNode!.properties).toHaveLength(3); // name, age, count
					}
				});
			});

			it("should extract interface information correctly", () => {
				const source = ts.createSourceFile(
					"test.ts",
					`
					interface ITestInterface extends IBaseInterface {
						name: string;
						readonly id: number;
						
						getName(): string;
						setName(name: string): void;
					}
					`,
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isInterfaceDeclaration(node)) {
						const interfaceNode = testableBuilder.testExtractClassNode(node, source);

						expect(interfaceNode).not.toBeNull();
						expect(interfaceNode!.name).toBe("ITestInterface");
						expect(interfaceNode!.interfaces).toContain("IBaseInterface");
						expect(interfaceNode!.isInterface).toBe(true);
						expect(interfaceNode!.isAbstract).toBe(false);
						expect(interfaceNode!.methods).toHaveLength(2); // getName, setName
						expect(interfaceNode!.properties).toHaveLength(2); // name, id
					}
				});
			});

			it("should return null for node without name", () => {
				const source = ts.createSourceFile(
					"test.ts",
					"export default class {}",
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						const classNode = testableBuilder.testExtractClassNode(node, source);
						expect(classNode).toBeNull();
					}
				});
			});

			it("should handle class with type parameters", () => {
				const source = ts.createSourceFile(
					"test.ts",
					`
					class GenericClass<T extends string, U = number> {
						value: T;
						count: U;
					}
					`,
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						const classNode = testableBuilder.testExtractClassNode(node, source);

						expect(classNode).not.toBeNull();
						expect(classNode!.typeParameters).toBeDefined();
						expect(classNode!.typeParameters).toHaveLength(2);
						expect(classNode!.typeParameters![0].name).toBe("T");
						expect(classNode!.typeParameters![0].constraint).toBe("string");
						expect(classNode!.typeParameters![1].name).toBe("U");
						expect(classNode!.typeParameters![1].defaultType).toBe("number");
					}
				});
			});
		});

		describe("extractMethods", () => {
			it("should extract method information correctly", () => {
				const source = ts.createSourceFile(
					"test.ts",
					`
					class TestClass {
						public method1(): void {}
						private method2(param: string): number { return 0; }
						protected static method3(optional?: boolean): string { return ""; }
						abstract method4(): void;
					}
					`,
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						const methods = testableBuilder.testExtractMethods(node);

						expect(methods).toHaveLength(4);

						const method1 = methods.find((m) => m.name === "method1");
						expect(method1).toBeDefined();
						expect(method1!.accessModifier).toBe("public");
						expect(method1!.returnType).toBe("void");
						expect(method1!.isStatic).toBe(false);
						expect(method1!.isAbstract).toBe(false);

						const method2 = methods.find((m) => m.name === "method2");
						expect(method2).toBeDefined();
						expect(method2!.accessModifier).toBe("private");
						expect(method2!.returnType).toBe("number");
						expect(method2!.parameters).toHaveLength(1);
						expect(method2!.parameters[0].name).toBe("param");
						expect(method2!.parameters[0].type).toBe("string");

						const method3 = methods.find((m) => m.name === "method3");
						expect(method3).toBeDefined();
						expect(method3!.accessModifier).toBe("protected");
						expect(method3!.isStatic).toBe(true);
						expect(method3!.parameters[0].isOptional).toBe(true);

						const method4 = methods.find((m) => m.name === "method4");
						expect(method4).toBeDefined();
						expect(method4!.isAbstract).toBe(true);
					}
				});
			});
		});

		describe("extractProperties", () => {
			it("should extract property information correctly", () => {
				const source = ts.createSourceFile(
					"test.ts",
					`
					class TestClass {
						public name: string;
						private readonly id: number;
						protected static count: number;
						value?: string;
					}
					`,
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						const properties = testableBuilder.testExtractProperties(node);

						expect(properties).toHaveLength(4);

						const name = properties.find((p) => p.name === "name");
						expect(name).toBeDefined();
						expect(name!.accessModifier).toBe("public");
						expect(name!.type).toBe("string");
						expect(name!.isStatic).toBe(false);
						expect(name!.isReadonly).toBe(false);

						const id = properties.find((p) => p.name === "id");
						expect(id).toBeDefined();
						expect(id!.accessModifier).toBe("private");
						expect(id!.isReadonly).toBe(true);

						const count = properties.find((p) => p.name === "count");
						expect(count).toBeDefined();
						expect(count!.accessModifier).toBe("protected");
						expect(count!.isStatic).toBe(true);

						const value = properties.find((p) => p.name === "value");
						expect(value).toBeDefined();
						expect(value!.type).toBe("string");
					}
				});
			});
		});

		describe("extractMethodParameters", () => {
			it("should extract method parameters correctly", () => {
				const source = ts.createSourceFile(
					"test.ts",
					`
					class TestClass {
						method(required: string, optional?: number, withDefault: boolean = true): void {}
					}
					`,
					ts.ScriptTarget.ES2020,
					true
				);

				source.forEachChild((node) => {
					if (ts.isClassDeclaration(node)) {
						node.members.forEach((member) => {
							if (ts.isMethodDeclaration(member)) {
								const parameters = testableBuilder.testExtractMethodParameters(member.parameters);

								expect(parameters).toHaveLength(3);

								expect(parameters[0].name).toBe("required");
								expect(parameters[0].type).toBe("string");
								expect(parameters[0].isOptional).toBe(false);
								expect(parameters[0].defaultValue).toBeUndefined();

								expect(parameters[1].name).toBe("optional");
								expect(parameters[1].type).toBe("number");
								expect(parameters[1].isOptional).toBe(true);

								expect(parameters[2].name).toBe("withDefault");
								expect(parameters[2].type).toBe("boolean");
								expect(parameters[2].isOptional).toBe(false);
								expect(parameters[2].defaultValue).toBe("true");
							}
						});
					}
				});
			});
		});

		describe("buildInheritanceTrees", () => {
			it("should build inheritance tree correctly", () => {
				// Setup test hierarchy
				const baseClass: ClassNode = {
					name: "BaseClass",
					filePath: "/test/BaseClass.ts",
					superClass: undefined,
					interfaces: [],
					methods: [
						{
							name: "baseMethod",
							returnType: "void",
							parameters: [],
							accessModifier: "public",
							isStatic: false,
							isAbstract: false,
							isOverride: false,
						},
					],
					properties: [],
					isAbstract: false,
					isInterface: false,
					accessModifier: "public",
				};

				const derivedClass: ClassNode = {
					name: "DerivedClass",
					filePath: "/test/DerivedClass.ts",
					superClass: "BaseClass",
					interfaces: ["IInterface"],
					methods: [
						{
							name: "baseMethod",
							returnType: "void",
							parameters: [],
							accessModifier: "public",
							isStatic: false,
							isAbstract: false,
							isOverride: false,
						},
					],
					properties: [],
					isAbstract: false,
					isInterface: false,
					accessModifier: "public",
				};

				const interfaceNode: ClassNode = {
					name: "IInterface",
					filePath: "/test/IInterface.ts",
					superClass: undefined,
					interfaces: [],
					methods: [],
					properties: [],
					isAbstract: false,
					isInterface: true,
					accessModifier: "public",
				};

				testableBuilder.testAddClassNodeToHierarchy(baseClass);
				testableBuilder.testAddClassNodeToHierarchy(derivedClass);
				testableBuilder.testAddClassNodeToHierarchy(interfaceNode);

				testableBuilder.testBuildInheritanceTrees();

				const hierarchy = testableBuilder.getHierarchy();

				// Check inheritance tree
				expect(hierarchy.inheritanceTree.has("BaseClass")).toBe(true);
				expect(hierarchy.inheritanceTree.get("BaseClass")).toContain("DerivedClass");

				// Check implementation tree
				expect(hierarchy.implementationTree.has("IInterface")).toBe(true);
				expect(hierarchy.implementationTree.get("IInterface")).toContain("DerivedClass");

				// Check method override marking
				const derivedMethod = derivedClass.methods.find((m) => m.name === "baseMethod");
				expect(derivedMethod!.isOverride).toBe(true);
				expect(derivedMethod!.overriddenFrom).toBe("BaseClass");
			});
		});

		describe("markMethodOverrides", () => {
			it("should mark method overrides correctly", () => {
				const baseClass: ClassNode = {
					name: "BaseClass",
					filePath: "/test/BaseClass.ts",
					superClass: undefined,
					interfaces: [],
					methods: [
						{
							name: "method1",
							returnType: "void",
							parameters: [],
							accessModifier: "public",
							isStatic: false,
							isAbstract: false,
							isOverride: false,
						},
					],
					properties: [],
					isAbstract: false,
					isInterface: false,
					accessModifier: "public",
				};

				const derivedClass: ClassNode = {
					name: "DerivedClass",
					filePath: "/test/DerivedClass.ts",
					superClass: "BaseClass",
					interfaces: [],
					methods: [
						{
							name: "method1",
							returnType: "void",
							parameters: [],
							accessModifier: "public",
							isStatic: false,
							isAbstract: false,
							isOverride: false,
						},
						{
							name: "method2",
							returnType: "void",
							parameters: [],
							accessModifier: "public",
							isStatic: false,
							isAbstract: false,
							isOverride: false,
						},
					],
					properties: [],
					isAbstract: false,
					isInterface: false,
					accessModifier: "public",
				};

				testableBuilder.testAddClassNodeToHierarchy(baseClass);
				testableBuilder.testAddClassNodeToHierarchy(derivedClass);

				testableBuilder.testMarkMethodOverrides(derivedClass);

				const method1 = derivedClass.methods.find((m) => m.name === "method1");
				const method2 = derivedClass.methods.find((m) => m.name === "method2");

				expect(method1!.isOverride).toBe(true);
				expect(method1!.overriddenFrom).toBe("BaseClass");
				expect(method2!.isOverride).toBe(false);
				expect(method2!.overriddenFrom).toBeUndefined();
			});

			it("should handle class with no superclass", () => {
				const baseClass: ClassNode = {
					name: "BaseClass",
					filePath: "/test/BaseClass.ts",
					superClass: undefined,
					interfaces: [],
					methods: [
						{
							name: "method1",
							returnType: "void",
							parameters: [],
							accessModifier: "public",
							isStatic: false,
							isAbstract: false,
							isOverride: false,
						},
					],
					properties: [],
					isAbstract: false,
					isInterface: false,
					accessModifier: "public",
				};

				// Should not throw
				expect(() => testableBuilder.testMarkMethodOverrides(baseClass)).not.toThrow();
			});
		});
	});
});
