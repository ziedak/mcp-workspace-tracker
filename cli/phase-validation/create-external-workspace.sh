#!/bin/bash

# =====================================================================
# Modified Sample Workspace Creator
# =====================================================================
#
# This script creates a sample workspace for testing MCP Server
# in a specified location to keep the project directory clean.
#
# Usage:
#   SAMPLE_DIR=/tmp/my-test-dir bash ./cli/phase-validation/create-external-workspace.sh
#
# =====================================================================

# Script to create a sample workspace for testing MCP Server

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Define directory structure - use environment variable if provided, otherwise default
if [ -z "$SAMPLE_DIR" ]; then
    echo "❌ Error: SAMPLE_DIR environment variable is not set"
    echo "Usage: SAMPLE_DIR=/path/to/dir bash $0"
    exit 1
fi

echo "Creating sample workspace at: $SAMPLE_DIR"

SRC_DIR="$SAMPLE_DIR/src"
UTILS_DIR="$SRC_DIR/utils"
MODELS_DIR="$SRC_DIR/models"
SERVICES_DIR="$SRC_DIR/services"
TESTS_DIR="$SAMPLE_DIR/tests"

# Create directories
mkdir -p $UTILS_DIR $MODELS_DIR $SERVICES_DIR $TESTS_DIR

# Call the original script with the modified SAMPLE_DIR
# This runs the original script but with our environment variable
"$PROJECT_ROOT/cli/create-sample-workspace.sh"

# Verify the workspace was created in the correct location
if [ -d "$SAMPLE_DIR/src" ]; then
    echo "Sample workspace created successfully at $SAMPLE_DIR"
else
    echo "Error: Failed to create sample workspace at $SAMPLE_DIR"
    exit 1
fi
