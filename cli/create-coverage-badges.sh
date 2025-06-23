#!/bin/bash

# Create coverage badges from Jest coverage report

set -e

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if coverage directory exists
if [ ! -d "./coverage" ]; then
  echo -e "${YELLOW}No coverage directory found. Running tests with coverage...${NC}"
  npm run test:coverage
fi

# Check if coverage summary exists
if [ ! -f "./coverage/coverage-summary.json" ]; then
  echo -e "${RED}Error: coverage-summary.json not found${NC}"
  exit 1
fi

# Create badges directory
mkdir -p ./.github/badges

# Extract coverage values
LINES=$(cat ./coverage/coverage-summary.json | grep -o '"lines":{"total":[0-9]*,"covered":[0-9]*,"skipped":[0-9]*,"pct":[0-9]*\.[0-9]*' | grep -o 'pct":[0-9]*\.[0-9]*' | cut -d':' -f2)
STATEMENTS=$(cat ./coverage/coverage-summary.json | grep -o '"statements":{"total":[0-9]*,"covered":[0-9]*,"skipped":[0-9]*,"pct":[0-9]*\.[0-9]*' | grep -o 'pct":[0-9]*\.[0-9]*' | cut -d':' -f2)
FUNCTIONS=$(cat ./coverage/coverage-summary.json | grep -o '"functions":{"total":[0-9]*,"covered":[0-9]*,"skipped":[0-9]*,"pct":[0-9]*\.[0-9]*' | grep -o 'pct":[0-9]*\.[0-9]*' | cut -d':' -f2)
BRANCHES=$(cat ./coverage/coverage-summary.json | grep -o '"branches":{"total":[0-9]*,"covered":[0-9]*,"skipped":[0-9]*,"pct":[0-9]*\.[0-9]*' | grep -o 'pct":[0-9]*\.[0-9]*' | cut -d':' -f2)

# Generate color based on percentage
get_color() {
  local pct=$1
  if (( $(echo "$pct >= 90" | bc -l) )); then
    echo "brightgreen"
  elif (( $(echo "$pct >= 80" | bc -l) )); then
    echo "green"
  elif (( $(echo "$pct >= 70" | bc -l) )); then
    echo "yellowgreen"
  elif (( $(echo "$pct >= 60" | bc -l) )); then
    echo "yellow"
  elif (( $(echo "$pct >= 50" | bc -l) )); then
    echo "orange"
  else
    echo "red"
  fi
}

# Generate badge URLs
LINES_COLOR=$(get_color $LINES)
STATEMENTS_COLOR=$(get_color $STATEMENTS)
FUNCTIONS_COLOR=$(get_color $FUNCTIONS)
BRANCHES_COLOR=$(get_color $BRANCHES)

# Update README badges with coverage information
echo -e "${YELLOW}Updating README.md badges...${NC}"

# Check if badges section exists, if not add it
if ! grep -q "## Coverage" "./README.md"; then
  cat >> "./README.md" << BADGESEOF

## Coverage

![Lines](https://img.shields.io/badge/lines-${LINES}%25-${LINES_COLOR})
![Statements](https://img.shields.io/badge/statements-${STATEMENTS}%25-${STATEMENTS_COLOR})
![Functions](https://img.shields.io/badge/functions-${FUNCTIONS}%25-${FUNCTIONS_COLOR})
![Branches](https://img.shields.io/badge/branches-${BRANCHES}%25-${BRANCHES_COLOR})

BADGESEOF
else
  # Update existing badges
  sed -i "s/lines-[0-9.]\+%25-[a-z]\+/lines-${LINES}%25-${LINES_COLOR}/g" ./README.md
  sed -i "s/statements-[0-9.]\+%25-[a-z]\+/statements-${STATEMENTS}%25-${STATEMENTS_COLOR}/g" ./README.md
  sed -i "s/functions-[0-9.]\+%25-[a-z]\+/functions-${FUNCTIONS}%25-${FUNCTIONS_COLOR}/g" ./README.md
  sed -i "s/branches-[0-9.]\+%25-[a-z]\+/branches-${BRANCHES}%25-${BRANCHES_COLOR}/g" ./README.md
fi

echo -e "${GREEN}Coverage badges updated successfully!${NC}"
