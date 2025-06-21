<!-- filepath: /home/zied/workspace/mcp/workspace-tracker/docs/mcp_server_summary_backup.md -->

# MCP Server for VSCode + Copilot Agent Mode

## 🧠 Overview

A TypeScript-based Model Communication Protocol (MCP) server to provide VSCode with:

- Directory & file structure
- Class & symbol hierarchy
- Module dependency graph
- Persistent symbol intelligence
- Real-time updates for Copilot Agent Mode

---

## 🏗️ Architecture

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

---

## 📁 Directory Structure

```
src/
├── core/
│   ├── WorkspaceScanner.ts
│   ├── SymbolIndexer.ts
│   ├── ClassHierarchyBuilder.ts
│   ├── ProjectGraphBuilder.ts
├── protocol/
│   └── MCPProtocolHandler.ts
├── agent/
│   └── CopilotAgentAdapter.ts
├── persistence/
│   ├── PersistenceManager.ts
│   ├── CacheSerializer.ts
│   └── HashUtils.ts
├── utils/
│   └── FileSystemUtils.ts
└── index.ts
```

---

## 🧱 Class Responsibilities

### `WorkspaceScanner`

- Traverse and collect file paths in workspace
- Handles ignore patterns

### `SymbolIndexer`

- Parse source files
- Extract symbols (classes, functions, variables)

### `ClassHierarchyBuilder`

- Build class inheritance and implementation maps

### `ProjectGraphBuilder`

- Analyze import/require to build module dependency graph

### `MCPProtocolHandler`

- Handle requests: getSymbolInfo, getProjectStructure, etc.

### `CopilotAgentAdapter`

- Format results for Copilot Agent Mode
- Stream changes with WebSocket if needed

### `PersistenceManager`

- Save/load cached results
- Detect file changes using hash comparison

---

## 💾 Persistence Strategy

- Caches:
  - `symbolIndex`
  - `classHierarchy`
  - `projectGraph`
- Uses `.mcp-cache` directory
- JSON format for transparency
- mkdir per-file hash for partial rebuilds

---

## ⚡ Optimizations

### 🔥 Performance

- Incremental symbol indexing (per-file)
- Parallel parsing with worker threads
- Lazy dependency graph evaluation
- Memory-efficient AST traversal
- cache compression Reduce .mcp-cache/ size

### 🧠 Intelligence

- Symbol summaries (natural language)
- Symbol usage heatmaps
- Change impact analysis

### 🔌 Integration

- WebSocket push updates to agents
- Plugin system for polyglot support
- Symbol search endpoint

### 🧪 Dev & DX

- Devtools overlay for real-time views
- Telemetry and performance stats (future version)
- Snapshot-based debugging (future version)

---

## ✅ Prioritized Next Steps

1. Implement file-hash-based per-file cache
2. Add worker-thread-based parallel parsing
3. Generate symbol summaries for LLM context
4. Integrate WebSocket + Devtools overlay
5. Add plugin architecture for extensibility
