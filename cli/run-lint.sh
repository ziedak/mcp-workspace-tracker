#!/bin/bash

# run-lint.sh
# Script to run ESLint checks and optionally fix common issues

set -e

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Default options
FIX_ISSUES=false
CHECK_ALL=true
SPECIFIC_FILES=""

# Script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Print title
echo -e "${BOLD}MCP Workspace Tracker - Lint Checker${NC}"
echo "=================================="

# Function to print usage information
print_usage() {
  echo -e "${BOLD}Usage:${NC}"
  echo "  $0 [options] [files...]"
  echo ""
  echo -e "${BOLD}Options:${NC}"
  echo "  --fix          Automatically fix problems when possible"
  echo "  --help, -h     Show this help message"
  echo ""
  echo -e "${BOLD}Examples:${NC}"
  echo "  $0                     # Check all files"
  echo "  $0 --fix               # Check and fix all files"
  echo "  $0 src/core/*.ts       # Check only specific files"
  echo "  $0 --fix src/core/*.ts # Check and fix specific files"
  echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --fix)
      FIX_ISSUES=true
      shift
      ;;
    --help|-h)
      print_usage
      exit 0
      ;;
    *)
      # If we receive any other arguments, they are treated as file paths
      if [[ -z "$SPECIFIC_FILES" ]]; then
        SPECIFIC_FILES="$1"
      else
        SPECIFIC_FILES="$SPECIFIC_FILES $1"
      fi
      CHECK_ALL=false
      shift
      ;;
  esac
done

# Change to project root directory
cd "$PROJECT_ROOT"

# Check if eslint is available
if ! npm ls eslint > /dev/null 2>&1; then
  echo -e "${YELLOW}ESLint not found in project dependencies, checking if it's installed globally...${NC}"
  if ! command -v eslint > /dev/null; then
    echo -e "${RED}ESLint not found! Please install ESLint:${NC}"
    echo "  npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin"
    exit 1
  fi
fi

# Build lint command
LINT_CMD="npx eslint --ext .js,.ts"

# Add fix option if requested
if [ "$FIX_ISSUES" = true ]; then
  LINT_CMD="$LINT_CMD --fix"
  echo -e "${BLUE}Running ESLint with auto-fix enabled...${NC}"
else
  echo -e "${BLUE}Running ESLint check...${NC}"
fi

# Add files to check
if [ "$CHECK_ALL" = true ]; then
  LINT_CMD="$LINT_CMD src tests"
else
  LINT_CMD="$LINT_CMD $SPECIFIC_FILES"
fi

# Print command for debugging
echo -e "${YELLOW}Command:${NC} $LINT_CMD"
echo ""

# Run ESLint and capture exit code
$LINT_CMD
LINT_EXIT_CODE=$?

# Display result
echo ""
if [ $LINT_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}=================================="
  echo -e "Linting passed successfully! ✓"
  echo -e "==================================${NC}"
else
  echo -e "${RED}=================================="
  echo -e "Linting found issues! ✗"
  echo -e "==================================${NC}"
  
  if [ "$FIX_ISSUES" = false ]; then
    echo -e "Run with ${YELLOW}--fix${NC} option to automatically fix some issues:"
    echo -e "  $0 --fix"
  else
    echo -e "Some issues could not be fixed automatically."
    echo -e "Please review and fix the remaining issues manually."
  fi
fi

exit $LINT_EXIT_CODE