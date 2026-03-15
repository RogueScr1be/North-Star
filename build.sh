#!/bin/bash
set -e

echo "Clearing node_modules to force fresh platform-specific dependency resolution..."
rm -rf node_modules frontend/node_modules

echo "Installing dependencies (all workspaces)..."
npm install

echo "Building frontend..."
npm run build --workspace=frontend

echo "Build complete!"
