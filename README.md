# MCP Server for VSCode + Copilot Agent Mode

A TypeScript-based Model Communication Protocol (MCP) server to provide VSCode with enhanced code intelligence.

## Features

- Directory & file structure analysis
- Class & symbol hierarchy extraction
- Module dependency graph
- Persistent symbol intelligence
- Real-time updates for Copilot Agent Mode

## Architecture

```
VSCode Extension
 └── MCP Server (Node.js/TypeScript)
      ├── WorkspaceScanner
      ├── SymbolIndexer
      ├── ClassHierarchyBuilder
      ├── ProjectGraphBuilder
      ├── MCPProtocolHandler
      ├── CopilotAgentAdapter
      └── PersistenceManager
```

## Project Structure

```
mcp-workspace-tracker/
├── cli/                     # Command-line scripts
│   ├── create-sample-workspace.sh  # Creates sample TypeScript project
│   ├── docker.sh            # Docker management script
│   └── setup.sh             # Project setup script
├── docker/                  # Docker configuration
│   ├── Dockerfile           # Production Docker configuration
│   └── Dockerfile.dev       # Development Docker configuration
├── docs/                    # Documentation
│   └── ...
├── sample-workspace/        # Sample TypeScript project for testing
│   └── ...
├── src/                     # Source code
│   ├── core/                # Core analysis modules
│   ├── persistence/         # Caching system
│   ├── protocol/            # Protocol handlers
│   └── utils/               # Utilities
└── tests/                   # Test files
    └── ...
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Build the project:

```bash
npm run build
```

3. Run the server:

```bash
npm start /path/to/workspace
```

## Development

- Build in watch mode:

```bash
npm run watch
```

- Run tests:

```bash
npm test
```

## Docker Support

The project includes Docker configurations for both development and production environments.

### Using Docker

1. Development mode with hot-reloading:

```bash
./cli/docker.sh dev /path/to/workspace
```

2. Production mode:

```bash
./cli/docker.sh prod /path/to/workspace
```

3. Build containers without running:

```bash
./cli/docker.sh build
```

4. Clean up Docker resources:

```bash
./cli/docker.sh clean
```

### Manual Docker Commands

You can also use Docker Compose directly:

```bash
# Development mode
WORKSPACE_PATH=/path/to/workspace docker-compose up dev

# Production mode
WORKSPACE_PATH=/path/to/workspace docker-compose up -d prod
```

## Project Status

This project is currently in active development following a phased approach:

### Phase 1: Core Infrastructure (Completed)

- Robust WorkspaceScanner with minimatch-based ignore patterns
- SymbolIndexer with TypeScript Compiler API
- File-based caching system with hash comparison
- Essential MCP protocol handlers

### Phase 2: Advanced Analysis (Current)

- Class hierarchy analysis
- Project dependency graph
- Enhanced persistence layer
- Extended MCP protocol

### Future Phases

- WebSocket-based real-time updates
- Plugin system for additional languages
- Visualization capabilities
- Code refactoring suggestions

## License

MIT
