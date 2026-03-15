#!/bin/bash
set -e

echo "Clearing node_modules and package-lock.json for platform-specific dependency resolution..."
rm -rf node_modules frontend/node_modules package-lock.json

echo "Installing dependencies without lock file (will regenerate platform-specific binaries)..."
npm install --verbose

echo "Building frontend..."
npm run build --workspace=frontend

echo "Build complete!"
