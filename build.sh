#!/bin/bash
set -e

echo "Installing root dependencies..."
npm ci

echo "Installing frontend dependencies..."
npm ci --prefix frontend

echo "Building frontend..."
npm run build --workspace=frontend

echo "Build complete!"
