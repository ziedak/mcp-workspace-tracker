# MCP Server for VSCode - Phase 2 Implementation Plan

## Objectives

Phase 2 focuses on expanding the code intelligence capabilities by implementing advanced analysis features that build upon the SOLID infrastructure established in Phase 1. The main goals are:

1. Implement class hierarchy analysis
2. Build a module dependency graph
3. Enhance the MCP resources and tools for new data structures
4. Extend the comprehensive test suite with new component tests

## Components to Implement

### 1. Class Hierarchy Analysis

**Interface & Implementation:**

- Create `IClassHierarchyBuilder` interface in `src/core/interfaces/IClassHierarchyBuilder.ts`
- Implement `ClassHierarchyBuilder` service in `src/core/services/ClassHierarchyBuilder.ts`
- Register in the DI container

**Features:**

- Inheritance relationship tracking (class extends)
- Interface implementation detection (class implements)
- Type inheritance and extension mapping
- Method override analysis
- Support for mixins and utility types

**Implementation Plan:**

- Leverage the TypeScript Compiler API to extract hierarchical relationships
- Build a class hierarchy model with proper typing
- Create algorithms to traverse the inheritance tree
- Implement persistence with the `IPersistenceManager`

### 2. Dependency Graph Analysis

**Interface & Implementation:**

- Create `IDependencyGraphBuilder` interface in `src/core/interfaces/IDependencyGraphBuilder.ts`
- Implement `DependencyGraphBuilder` service in `src/core/services/DependencyGraphBuilder.ts`
- Register in the DI container

**Features:**

- Import/export relationship mapping
- Circular dependency detection
- Module usage graph
- External vs. internal dependency differentiation
- Impact analysis (what would be affected by a change)

**Implementation Plan:**

- Create graph data structures for dependency relationships
- Analyze import statements in TypeScript/JavaScript files
- Build traversal and query algorithms for the dependency graph
- Add visualization data formatting for client consumption

### 3. Enhanced MCP Resources and Tools

Extend the MCP integration to expose the new functionality:

**New Resources:**

- `hierarchy://class/{className}` - Get class hierarchy information
- `hierarchy://interface/{interfaceName}` - Get interface implementation information
- `dependency://module/{modulePath}` - Get module dependencies
- `dependency://impact/{modulePath}` - Get modules impacted by changes

**New Tools:**

- `analyze-hierarchy` - Analyze class/interface hierarchies
- `find-implementations` - Find implementations of interfaces/abstract classes
- `analyze-dependencies` - Analyze module dependencies
- `find-circular-dependencies` - Detect circular dependencies

**Implementation Plan:**

- Extend `src/adapters/mcp/resources.ts` with new resource definitions
- Extend `src/adapters/mcp/tools.ts` with new tool definitions
- Create response formatters for hierarchical and graph data

### 4. Testing Strategy

**Unit Tests:**

- Create `tests/ClassHierarchyBuilder.test.ts` and `tests/ClassHierarchyBuilder.additional.test.ts`
- Create `tests/DependencyGraphBuilder.test.ts` and `tests/DependencyGraphBuilder.additional.test.ts`
- Add test fixtures for various class hierarchies and dependency patterns
- Ensure all edge cases are covered with targeted tests

**Integration Tests:**

- Create test for end-to-end flows combining multiple services
- Test persistence and retrieval of the combined data structures
- Test MCP protocol responses for the new resources and tools
- Verify real-world code pattern handling

**Test Implementation:**

- Continue using Jest testing framework
- Follow established pattern of main + additional test files for comprehensive coverage
- Create mock implementations of interfaces for isolated testing
- Build test fixtures representing different codebase scenarios
- Maintain high coverage standards (>89% statement, >70% branch)
- Include error handling tests for all new components

### 5. Leveraging Existing Test Infrastructure

Phase 1 established a robust testing foundation with:

- Comprehensive test suite for all core services
- High coverage metrics (>89% statement, >70% branch coverage)
- Error handling validation across components
- Reliable mocking of filesystem and TypeScript Compiler API

Phase 2 will build upon this foundation by:

- Extending the mock framework to support new components
- Reusing existing test utilities and fixtures
- Following the established pattern of base tests plus additional tests for edge cases
- Maintaining adherence to coverage thresholds
- Ensuring backward compatibility with existing functionality

This approach ensures that new components integrate seamlessly while maintaining the quality standards established in Phase 1.

## Initial Focus: Enhanced Transport and Debugging

Before implementing the core Phase 2 features, we will enhance the server transport and debugging capabilities:

### 1. Streamable HTTP Transport

Phase 1 currently uses stdio transport, which limits testing and validation. At the beginning of Phase 2, we will:

- Implement the Streamable HTTP transport from the [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk?tab=readme-ov-file#server)
- Expose the server's capabilities over HTTP for better testability
- Update the validation scripts to work with the HTTP transport
- Create a dedicated service for transport configuration and management

**Implementation Plan:**

```typescript
// Example HTTP server setup
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";

// Create a server with HTTP transport
const server = new McpServer({
	name: "mcp-workspace-tracker",
	version: "1.0.0",
});

// Connect via HTTP transport
const transport = new HttpServerTransport({ port: 3000 });
await server.connect(transport);
```

### 2. MCP Inspector Integration

To facilitate testing and debugging during Phase 2 development, we will integrate MCP Inspector:

- Set up the MCP Inspector tool for development and testing
- Create dedicated debugging endpoints and tools
- Implement enhanced logging specifically for inspector interactions
- Add development scripts to easily launch the server with inspector support

**Implementation Plan:**

```bash
# Using MCP Inspector with our server
npm run mcp:inspect -- --server-command 'npm run start:server /path/to/workspace'
```

This will allow developers to:

- Visualize the server's capabilities
- Interactively test tools and resources
- Debug requests and responses in real-time
- Validate the class hierarchy and dependency graph features

These enhancements will be prioritized at the beginning of Phase 2 to establish a more robust development and testing environment before implementing the core analytical features.

## Implementation Milestones

1. **Milestone 0: Transport and Debugging Enhancements** (NEW)

   - Implement Streamable HTTP transport
   - Integrate MCP Inspector for testing and debugging
   - Create HTTP server configuration
   - Update validation scripts for HTTP transport

2. **Milestone 1: Core Class Hierarchy Analysis**

   - Interface definition
   - Basic implementation
   - Simple hierarchy tracking

3. **Milestone 2: Advanced Class Relationships**

   - Interface implementations
   - Method overrides
   - Generic type handling

4. **Milestone 3: Dependency Graph Foundation**

   - Interface definition
   - Basic import/export tracking
   - Module relationship model

5. **Milestone 4: Advanced Dependency Analysis**

   - Circular dependency detection
   - Impact analysis
   - Dependency visualization data

6. **Milestone 5: MCP Integration**

   - New resources
   - New tools
   - Response formatting

7. **Milestone 6: Testing & Documentation**
   - Unit tests for new components
   - Integration tests for combined functionality
   - API documentation
   - Coverage report maintenance
   - Error handling validation

## Ready-to-Proceed Assessment

Phase 1 is complete with all core components implemented following SOLID principles:

✅ Core interfaces defined  
✅ DI container set up  
✅ Base services implemented  
✅ TypeScript errors fixed  
✅ MCP integration established  
✅ Comprehensive test suite with high coverage (>89% statement, >70% branch)  
✅ Robust error handling across all components

The project is **ready to begin Phase 2** implementation with a solid foundation of reliable, well-tested code.

3. **Performance Tests:**
   - Benchmark hierarchy building on large codebases
   - Measure memory usage for large dependency graphs
   - Test incremental update performance

## Expected Outcomes

By the end of Phase 2, the MCP Server should be able to:

1. Build and maintain a complete class hierarchy for the workspace
2. Generate a comprehensive module dependency graph
3. Efficiently store and retrieve these structures
4. Answer complex queries about code relationships
5. Provide enhanced code intelligence data to VSCode and Copilot Agent Mode

## Timeline

1. Streamable HTTP transport and MCP Inspector integration: 1 week
2. ClassHierarchyBuilder implementation: 1-2 weeks
3. DependencyGraphBuilder implementation: 1-2 weeks
4. Enhanced Persistence Layer: 1 week
5. Extended MCP Protocol: 1 week
6. Testing and refinement: 1 week (accelerated due to existing test infrastructure)

Total estimated time: 5-8 weeks depending on complexity and scope adjustments.

Note: The timeline benefits from the robust test infrastructure already in place, which accelerates test development for new components.

## Next Steps After Phase 2

1. Implement real-time updates via WebSockets (Phase 3)
2. Add intelligent code completion suggestions
3. Develop visualization capabilities for class hierarchies and dependency graphs
4. Implement code refactoring suggestions based on structural analysis
