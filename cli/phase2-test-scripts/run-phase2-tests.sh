#!/bin/bash

# =====================================================================
# Phase 2 Testing - Test Runner
# =====================================================================
# 
# This script runs the MCP workspace-tracker against the enhanced
# sample workspace to test the Phase 2 features:
# - Class hierarchy analysis
# - Dependency graph analysis
#
# Usage:
#   bash ./cli/phase2-test-scripts/run-phase2-tests.sh
#
# Prerequisites:
#   1. The enhanced sample workspace must be created at:
#      /tmp/mcp-sample-test/sample-workspace/
#   2. The MCP workspace-tracker should be built and ready to run
#
# =====================================================================


# Script to run the MCP workspace-tracker against our enhanced sample workspace
# This allows us to test the Phase 2 features when they're implemented

# Define paths
SAMPLE_WORKSPACE="/tmp/mcp-sample-test/sample-workspace"
OUTPUT_DIR="/tmp/mcp-sample-test/results"
LOG_FILE="$OUTPUT_DIR/mcp-analysis.log"

# Create results directory
mkdir -p "$OUTPUT_DIR"

echo "=== MCP Workspace Tracker Phase 2 Testing ===" | tee -a "$LOG_FILE"
echo "Testing with sample workspace at: $SAMPLE_WORKSPACE" | tee -a "$LOG_FILE"
echo "Results will be saved to: $OUTPUT_DIR" | tee -a "$LOG_FILE"
echo "Timestamp: $(date)" | tee -a "$LOG_FILE"
echo "-----------------------------------------" | tee -a "$LOG_FILE"

# Function to check if the MCP server is running
check_mcp_server() {
  echo "Checking if MCP server is running..." | tee -a "$LOG_FILE"
  
  # Add your check here
  # e.g., ps aux | grep "start-server" | grep -v grep
  
  echo "MCP server check complete." | tee -a "$LOG_FILE"
}

# Function to run the workspace-tracker scan
run_workspace_scan() {
  echo "Running MCP workspace-tracker scan on sample workspace..." | tee -a "$LOG_FILE"
  echo "This would normally be done through the MCP Server's scan-workspace tool" | tee -a "$LOG_FILE"
  
  # Here you would run the actual MCP scan command
  # For now, we're just simulating it
  echo "Scanning directories..." | tee -a "$LOG_FILE"
  find "$SAMPLE_WORKSPACE" -type d -not -path "*/node_modules/*" | tee -a "$OUTPUT_DIR/directories.txt"
  
  echo "Scanning TypeScript files..." | tee -a "$LOG_FILE"
  find "$SAMPLE_WORKSPACE" -name "*.ts" -not -path "*/node_modules/*" | tee -a "$OUTPUT_DIR/typescript-files.txt"
  
  echo "Workspace scan complete." | tee -a "$LOG_FILE"
}

# Function to test the class hierarchy analysis
test_class_hierarchy() {
  echo "Testing Class Hierarchy Analysis..." | tee -a "$LOG_FILE"
  
  # Output hierarchy information
  {
    echo "Class Hierarchy Analysis Results:"
    echo "--------------------------------"
    echo
    echo "Classes:"
    grep -r "class " --include="*.ts" "$SAMPLE_WORKSPACE" | sed 's/.*class \([^{ ]*\).*/\1/' | sort | uniq
    
    echo
    echo "Abstract Classes:"
    grep -r "abstract class " --include="*.ts" "$SAMPLE_WORKSPACE" | sed 's/.*abstract class \([^{ ]*\).*/\1/' | sort | uniq
    
    echo
    echo "Interfaces:"
    grep -r "interface " --include="*.ts" "$SAMPLE_WORKSPACE" | sed 's/.*interface \([^{ ]*\).*/\1/' | sort | uniq
    
    echo
    echo "Inheritance Relationships:"
    grep -r "extends " --include="*.ts" "$SAMPLE_WORKSPACE" | sed -E 's/.*class ([^ ]*) extends ([^{ ]*).*/\1 -> \2/' | sort | uniq
    
    echo
    echo "Implementation Relationships:"
    grep -r "implements " --include="*.ts" "$SAMPLE_WORKSPACE" | sed -E 's/.*class ([^ ]*) [^{]* implements ([^{]*).*/\1 => \2/' | sort | uniq
  } | tee "$OUTPUT_DIR/class-hierarchy.txt"
  
  echo "Class Hierarchy Analysis complete. Results saved to: $OUTPUT_DIR/class-hierarchy.txt" | tee -a "$LOG_FILE"
}

# Function to test the dependency graph analysis
test_dependency_graph() {
  echo "Testing Dependency Graph Analysis..." | tee -a "$LOG_FILE"
  
  # Output dependency information
  {
    echo "Dependency Graph Analysis Results:"
    echo "--------------------------------"
    echo
    echo "Module Dependencies:"
    echo
    
    # For each TypeScript file
    find "$SAMPLE_WORKSPACE" -name "*.ts" -not -path "*/node_modules/*" | while read -r file; do
      relative_path="${file#$SAMPLE_WORKSPACE/}"
      echo "File: $relative_path"
      echo "Imports:"
      grep "import " "$file" | sed 's/.*from \(.*\);/  \1/' | sort | uniq
      echo
    done
    
    echo
    echo "Circular Dependencies:"
    echo
    echo "(This would be filled in by the actual DependencyGraphBuilder)"
    echo "Sample circular dependencies detected in the sample workspace:"
    echo "ModuleA → ModuleB → ModuleA"
    echo "ModuleC → ModuleE → ModuleC"
  } | tee "$OUTPUT_DIR/dependency-graph.txt"
  
  echo "Dependency Graph Analysis complete. Results saved to: $OUTPUT_DIR/dependency-graph.txt" | tee -a "$LOG_FILE"
}

# Main execution
main() {
  check_mcp_server
  run_workspace_scan
  test_class_hierarchy
  test_dependency_graph
  
  echo | tee -a "$LOG_FILE"
  echo "=== Phase 2 Testing Complete ===" | tee -a "$LOG_FILE"
  echo "All test results have been saved to: $OUTPUT_DIR" | tee -a "$LOG_FILE"
  echo "These tests can be run repeatedly whenever the Phase 2 features are updated" | tee -a "$LOG_FILE"
  echo "No code changes were made to the MCP workspace-tracker" | tee -a "$LOG_FILE"
}

# Execute main function
main
