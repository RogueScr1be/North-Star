#!/bin/bash
set -e

echo "Installing dependencies (all workspaces)..."
npm install --workspaces

echo "Building frontend..."
npm run build --workspace=frontend

echo "Build complete!"
