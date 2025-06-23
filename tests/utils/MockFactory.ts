import { Symbol, SymbolKind } from "../../src/core/models/Symbol";
import { WorkspaceFile, WorkspaceFileType } from "../../src/core/models/WorkspaceFile";

/**
 * Factory for creating mock data for tests
 */
export class MockFactory {
  /**
   * Create a mock workspace file
   */
  static createWorkspaceFile(
    path: string, 
    relativePath: string, 
    type: WorkspaceFileType = WorkspaceFileType.SOURCE,
    size: number = 1024
  ): WorkspaceFile {
    return new WorkspaceFile(
      path,
      relativePath,
      type,
      size,
      new Date()
    );
  }
  
  /**
   * Create a mock class symbol
   */
  static createClassSymbol(
    name: string,
    filePath: string,
    line: number = 1,
    character: number = 1,
    exported: boolean = true,
    documentation: string = ""
  ): Symbol {
    return {
      name,
      kind: SymbolKind.CLASS,
      location: {
        filePath,
        line,
        character
      },
      exportStatus: exported ? "exported" : "none",
      documentation,
      children: []
    };
  }
  
  /**
   * Create a mock method symbol
   */
  static createMethodSymbol(
    name: string,
    filePath: string,
    parentName?: string,
    line: number = 1,
    character: number = 1,
    documentation: string = ""
  ): Symbol {
    return {
      name,
      kind: SymbolKind.METHOD,
      location: {
        filePath,
        line,
        character
      },
      exportStatus: "none",
      documentation,
      parentName
    };
  }
  
  /**
   * Create a simple TypeScript file content
   */
  static createTsFileContent(className: string): string {
    return `
/**
 * Example class
 */
export class ${className} {
  /**
   * Example method
   */
  public doSomething(): void {
    console.log('Doing something');
  }
}
`;
  }
}
