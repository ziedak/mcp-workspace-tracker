#!/bin/bash

# Docker helper script for MCP Workspace Tracker

# Display help information
function show_help {
    echo "MCP Workspace Tracker Docker Helper"
    echo "Usage: $0 [OPTION] [WORKSPACE_PATH]"
    echo ""
    echo "Options:"
    echo "  dev        Run development container with hot-reloading"
    echo "  prod       Run production container"
    echo "  build      Build containers without running"
    echo "  clean      Remove containers and volumes"
    echo "  help       Display this help message"
    echo ""
    echo "Example:"
    echo "  $0 dev /path/to/workspace"
    echo ""
}

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker and Docker Compose are required but not installed."
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Default workspace path is the current directory
WORKSPACE_PATH=${2:-$(pwd)}

# Process command
case "$1" in
    dev)
        echo "Starting development container with workspace: $WORKSPACE_PATH"
        cd "$PROJECT_ROOT" && WORKSPACE_PATH=$WORKSPACE_PATH docker-compose up dev
        ;;
    prod)
        echo "Starting production container with workspace: $WORKSPACE_PATH"
        cd "$PROJECT_ROOT" && WORKSPACE_PATH=$WORKSPACE_PATH docker-compose up -d prod
        ;;
    build)
        echo "Building containers"
        cd "$PROJECT_ROOT" && docker-compose build
        echo "Done! Use './cli/docker.sh dev' or './cli/docker.sh prod' to run."
        ;;
    clean)
        echo "Cleaning Docker resources"
        cd "$PROJECT_ROOT" && docker-compose down -v
        echo "Done!"
        ;;
    help|*)
        show_help
        ;;
esac
