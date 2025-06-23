#!/bin/bash

# Run Jest tests with coverage
echo "Running tests with coverage..."
npm run test:coverage

# Check if tests passed
if [ $? -eq 0 ]; then
  echo "✅ All tests passed!"
  
  # Create coverage badges if the script exists
  if [ -f "./cli/create-coverage-badges.sh" ]; then
    ./cli/create-coverage-badges.sh
  fi
  
  exit 0
else
  echo "❌ Tests failed. Please check the output above."
  exit 1
fi
