#!/bin/bash
set -euo pipefail

PROJECT_ROOT="/Users/thewhitley/North Star"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
FRONTEND_PORT=3000
BACKEND_PORT=3001

echo "🚀 North Star MFP — Launching..."
echo

kill_port_if_needed() {
  local port="$1"
  if lsof -ti tcp:"$port" >/dev/null 2>&1; then
    echo "⚠️  Port $port already in use. Kill? (y/n)"
    read -r reply
    if [[ "$reply" =~ ^[Yy]$ ]]; then
      lsof -ti tcp:"$port" | xargs kill -9
      sleep 1
    else
      echo "Aborted because port $port is in use."
      exit 1
    fi
  fi
}

require_dir() {
  local dir="$1"
  local label="$2"
  if [[ ! -d "$dir" ]]; then
    echo "❌ $label directory not found: $dir"
    exit 1
  fi
}

require_script() {
  local dir="$1"
  local script_name="$2"
  local label="$3"
  if ! npm --prefix "$dir" run | grep -qE "^[[:space:]]+$script_name"; then
    echo "❌ Missing '$script_name' script in $label package.json"
    exit 1
  fi
}

require_dir "$BACKEND_DIR" "Backend"
require_dir "$FRONTEND_DIR" "Frontend"

kill_port_if_needed "$FRONTEND_PORT"
kill_port_if_needed "$BACKEND_PORT"

echo "Checking npm scripts..."
require_script "$BACKEND_DIR" "dev" "backend"
require_script "$FRONTEND_DIR" "dev" "frontend"
echo "✅ Required scripts found."
echo

echo "Starting backend on http://localhost:$BACKEND_PORT ..."
osascript <<EOF
tell application "Terminal"
  do script "cd \"$BACKEND_DIR\" && npm run dev"
end tell
EOF

echo "Waiting 3 seconds for backend to initialize..."
sleep 3

echo
echo "Starting frontend on http://localhost:$FRONTEND_PORT ..."
osascript <<EOF
tell application "Terminal"
  do script "cd \"$FRONTEND_DIR\" && npm run dev"
end tell
EOF

echo "Waiting 4 seconds for frontend to initialize..."
sleep 4

echo
echo "✅ North Star launch commands sent."
echo "Backend:  http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo
echo "Press Enter to close this launcher window."
read -r
