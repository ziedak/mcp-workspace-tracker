#!/bin/bash

echo "Installing MCP Server dependencies..."
npm install

echo "Building MCP Server..."
npm run build

echo "Setup complete! You can now run the server with: npm start [workspace_path]"
