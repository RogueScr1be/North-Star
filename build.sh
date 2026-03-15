#!/bin/bash
set -e

echo "Clearing node_modules and package-lock.json for platform-specific dependency resolution..."
rm -rf node_modules frontend/node_modules package-lock.json

echo "Installing dependencies without lock file (will regenerate platform-specific binaries)..."
npm install --verbose

echo "Building frontend..."
export VITE_API_BASE_URL="https://north-star-backend-production-83d2.up.railway.app/api"
export VITE_LAYOUT_ENGINE_ENABLED="true"
npm run build --workspace=frontend

echo "Build complete!"
