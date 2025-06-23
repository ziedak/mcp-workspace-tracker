#!/bin/bash

# Run Jest tests
echo "Running tests..."
npm test

# Check if tests passed
if [ $? -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Tests failed. Please check the output above."
  exit 1
fi
