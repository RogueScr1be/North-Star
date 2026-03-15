#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Building frontend..."
npm run build --workspace=frontend

echo "Build complete!"
