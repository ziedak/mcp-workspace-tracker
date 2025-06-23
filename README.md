# MCP Workspace Tracker

A TypeScript-based Model Context Protocol (MCP) server to provide VSCode with enhanced code intelligence using the official MCP TypeScript SDK. Built with SOLID principles and dependency injection.

## Features

- Directory & file structure analysis
- Class & symbol hierarchy extraction
- Module dependency graph
- Persistent symbol intelligence
- Real-time updates for AI assistants
- MCP TypeScript SDK integration
- Standard MCP resources and tools
- SOLID architecture with dependency injection

## Architecture

```
VSCode Extension
 └── MCP Server (Node.js/TypeScript)
      ├── Core
      │   ├── Interfaces (SOLID contracts)
      │   ├── Models (Domain entities)
      │   └── Services (Business logic)
      │       ├── Logger
      │       ├── WorkspaceScanner
      │       ├── SymbolIndexer
      │       ├── PersistenceManager
      │       └── McpWorkspaceTracker
      ├── Adapters
      │   └── MCP Integration
      │       ├── Resources
      │       └── Tools
      └── Config
          └── Dependency Injection Container
```

## Project Structure

```
mcp-workspace-tracker/
├── cli/                     # Command-line scripts
│   ├── clean-test-results.sh       # Cleans test results directory
│   ├── copy-test-results.sh        # Copies test results from Docker
│   ├── create-sample-workspace.sh  # Creates sample TypeScript project
│   ├── docker.sh                   # Docker management script
│   ├── run-lint.sh                 # Runs ESLint on the codebase
│   ├── run-tests.sh                # Runs tests in a clean Docker env
│   └── setup.sh                    # Project setup script
├── docs/                    # Documentation
│   └── ...
├── src/                     # Source code
│   ├── config/              # Configuration and DI setup
│   │   ├── container.ts     # Inversify DI container
│   │   └── types.ts         # DI type identifiers
│   ├── core/                # Core modules
│   │   ├── interfaces/      # SOLID interface contracts
│   │   ├── models/          # Domain models
│   │   └── services/        # Service implementations
│   ├── adapters/            # External system adapters
│   │   └── mcp/             # MCP protocol integration
│   │       ├── resources.ts # MCP resource definitions
│   │       └── tools.ts     # MCP tool definitions
│   ├── domain/              # Domain specific logic
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── tests/                   # Test files
│   └── ...
└── start-server.ts         # Server entry point
```

## Development Workflow

This project uses a clean, modular development approach with strong adherence to SOLID principles:

- **Dependency Injection**: All components are injected via Inversify
- **Interface-first development**: Components implement clear interfaces
- **Testable components**: Services designed for unit testing

### Local Development Setup

1. Install dependencies:

```bash
npm install
```

2. Build the project:

```bash
npm run build
```

3. Run the server locally:

```bash
# Run with a specific workspace path
npm start /path/to/workspace

# Or using the command directly
node dist/start-server.js --workspace=/path/to/workspace
```

### Testing

```bash
# Run tests locally
npm test

# Run tests with coverage
npm run test:coverage
```

## Getting Started

1. For development, follow the Local Development Setup steps above.

2. For usage:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server with a workspace path
npm start /path/to/workspace
```

## MCP SDK Integration

This project implements the official [Model Context Protocol (MCP) TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) to provide a standards-compliant MCP server. The SDK provides:

- Standardized protocol handling
- Resource and tool registration
- Multiple transport options (stdio, HTTP)
- Error handling and validation

### Available MCP Resources

| Resource        | URI Pattern           | Description                               |
| --------------- | --------------------- | ----------------------------------------- |
| Workspace Info  | `workspace://info`    | General workspace statistics              |
| File List       | `files://{pattern}`   | Lists files matching a glob pattern       |
| File Contents   | `file://{path}`       | Retrieves the contents of a specific file |
| Symbol Info     | `symbol://{name}`     | Retrieves information about code symbols  |
| Class Hierarchy | `hierarchy://{class}` | Retrieves class inheritance hierarchy     |

### Available MCP Tools

| Tool               | Description                                    | Parameters                                                    |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------- |
| `search-symbols`   | Search for symbols in the workspace            | `query`: Search term<br>`kind`: Symbol kind filter (optional) |
| `scan-workspace`   | Scan workspace to update file and symbol index | `path`: Path to scan (optional)                               |
| `get-file-symbols` | Get symbols for a specific file                | `filePath`: Path to the file to analyze                       |

## Running the Server

```bash
# Build the project
npm run build

# Run MCP server with stdio transport (default)
npm start /path/to/workspace

# Run with HTTP transport
node dist/start-server.js --workspace=/path/to/workspace --transport=http
```
