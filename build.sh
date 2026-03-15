#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Building frontend..."
echo "Current directory: $(pwd)"
echo "Frontend package.json exists: $(test -f frontend/package.json && echo 'yes' || echo 'no')"
echo "Frontend node_modules exists: $(test -d frontend/node_modules && echo 'yes' || echo 'no')"
echo "Running build command..."
npm run build --workspace=frontend

echo "Build complete!"
