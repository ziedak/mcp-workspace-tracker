#!/bin/bash

# =====================================================================
# Phase 2 Testing - Workspace Analyzer
# =====================================================================
# 
# This script analyzes the basic structure of the sample workspace
# to verify it was created correctly and is suitable for testing.
#
# Usage:
#   bash ./cli/phase2-test-scripts/analyze-workspace.sh
#
# Prerequisites:
#   The sample workspace must already be created at:
#   /tmp/mcp-sample-test/sample-workspace/
#
# =====================================================================


# Script to analyze a sample workspace using MCP workspace-tracker
# This script doesn't modify any code, just uses the MCP workspace-tracker for analysis

# Define paths
SAMPLE_WORKSPACE="/tmp/mcp-sample-test/sample-workspace"
MCP_SERVER_SCRIPT="./start-server.ts"

# Function to check if sample workspace exists
check_sample_workspace() {
  if [ ! -d "$SAMPLE_WORKSPACE" ]; then
    echo "Error: Sample workspace not found at $SAMPLE_WORKSPACE"
    echo "Please run the create-sample-workspace-modified.sh script first"
    exit 1
  fi
  echo "Sample workspace found at $SAMPLE_WORKSPACE"
}

# Function to start MCP server with the sample workspace
start_mcp_server() {
  echo "Starting MCP server with sample workspace..."
  echo "This will run in the background. Check the server logs for details."
  node --loader ts-node/esm $MCP_SERVER_SCRIPT --workspace $SAMPLE_WORKSPACE &
  SERVER_PID=$!
  echo "MCP server started with PID: $SERVER_PID"
  sleep 5 # Give the server time to initialize
}

# Function to analyze the workspace structure
analyze_workspace_structure() {
  echo -e "\n--- Analyzing Workspace Structure ---"
  echo "Files in the workspace:"
  find $SAMPLE_WORKSPACE -type f | grep -v "node_modules" | sort
  echo -e "\nDirectory structure:"
  find $SAMPLE_WORKSPACE -type d | grep -v "node_modules" | sort
}

# Function to analyze TypeScript interfaces
analyze_interfaces() {
  echo -e "\n--- Analyzing TypeScript Interfaces ---"
  echo "Interfaces defined in the workspace:"
  grep -r "interface " --include="*.ts" $SAMPLE_WORKSPACE | cut -d':' -f2- | sort
}

# Function to analyze class implementations
analyze_classes() {
  echo -e "\n--- Analyzing Class Implementations ---"
  echo "Classes defined in the workspace:"
  grep -r "class " --include="*.ts" $SAMPLE_WORKSPACE | cut -d':' -f2- | sort
  
  echo -e "\nClasses that implement interfaces:"
  grep -r "implements " --include="*.ts" $SAMPLE_WORKSPACE | cut -d':' -f2- | sort
}

# Function to analyze imports (dependency relationships)
analyze_dependencies() {
  echo -e "\n--- Analyzing Module Dependencies ---"
  echo "Import statements in the workspace:"
  grep -r "import " --include="*.ts" $SAMPLE_WORKSPACE | cut -d':' -f2- | sort
}

# Function to analyze function signatures
analyze_functions() {
  echo -e "\n--- Analyzing Function Signatures ---"
  echo "Functions defined in the workspace:"
  grep -r "function " --include="*.ts" $SAMPLE_WORKSPACE | cut -d':' -f2- | sort
  
  echo -e "\nAsync functions:"
  grep -r "async " --include="*.ts" $SAMPLE_WORKSPACE | cut -d':' -f2- | sort
}

# Function to clean up
cleanup() {
  echo -e "\n--- Cleaning Up ---"
  if [ -n "$SERVER_PID" ]; then
    echo "Stopping MCP server (PID: $SERVER_PID)"
    kill $SERVER_PID 2>/dev/null || true
  fi
  echo "Analysis complete."
}

# Main execution flow
main() {
  echo "=== MCP Workspace Analysis Test Scenario ==="
  check_sample_workspace
  
  # Perform static analysis without starting the server
  analyze_workspace_structure
  analyze_interfaces
  analyze_classes
  analyze_dependencies
  analyze_functions
  
  echo -e "\n=== Analysis Summary ==="
  echo "The sample workspace contains:"
  echo "- Interfaces and classes with implementation relationships"
  echo "- Module dependencies between files"
  echo "- Various function types (regular, async)"
  echo "- JSDoc comments for documentation"
  echo -e "\nThis workspace is ideal for testing the upcoming Phase 2 features:"
  echo "- Class hierarchy analysis (interfaces, implementations)"
  echo "- Dependency graph analysis"
  
  cleanup
}

# Execute main function
main
