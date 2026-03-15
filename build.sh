#!/bin/bash
set -e

echo "Clearing node_modules and package-lock.json for platform-specific dependency resolution..."
rm -rf node_modules frontend/node_modules package-lock.json

echo "Installing dependencies without lock file (will regenerate platform-specific binaries)..."
npm install --verbose

echo "Building frontend..."
export VITE_API_BASE_URL="https://north-star-backend-production-83d2.up.railway.app/api"
export VITE_LAYOUT_ENGINE_ENABLED="true"
# VITE_POSTHOG_KEY must be set in Vercel Environment Variables (Settings → Environment Variables).
# It is intentionally NOT hardcoded here — it stays out of version control.
# Vercel injects it into the build environment automatically when set in the dashboard.
# This echo confirms presence at build time without exposing the value.
if [ -n "${VITE_POSTHOG_KEY}" ]; then
  echo "VITE_POSTHOG_KEY: SET (${#VITE_POSTHOG_KEY} chars) — PostHog remote analytics will be active"
else
  echo "VITE_POSTHOG_KEY: NOT SET — PostHog will fall back to console logger"
fi
npm run build --workspace=frontend

echo "Build complete!"
