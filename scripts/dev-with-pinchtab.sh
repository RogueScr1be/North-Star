#!/bin/bash
# North Star Development with Pinchtab Integration
# Starts: Pinchtab server + North Star backend + frontend + test harness
# Usage: ./scripts/dev-with-pinchtab.sh

set -euo pipefail

PINCHTAB_BIN=~/bin/pinchtab
PINCHTAB_PORT=9867
NORTH_STAR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    jobs -p | xargs -r kill 2>/dev/null || true
    wait 2>/dev/null || true
    echo -e "${GREEN}Done${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}North Star Development + Pinchtab${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check Pinchtab binary
if [ ! -f "$PINCHTAB_BIN" ]; then
    echo -e "${YELLOW}Pinchtab not found at $PINCHTAB_BIN${NC}"
    echo -e "${YELLOW}Build with: cd ~/pinchtab && go build -o ~/bin/pinchtab ./cmd/pinchtab${NC}"
    exit 1
fi

# Check if ports are available
echo -e "${BLUE}[1/4] Checking port availability...${NC}"
for PORT in 3000 3001 $PINCHTAB_PORT; do
    if lsof -i ":$PORT" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Port $PORT already in use${NC}"
        echo -e "${YELLOW}Kill with: lsof -i :$PORT | awk 'NR==2 {print \$2}' | xargs kill${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ All ports available${NC}"
echo ""

# Start Pinchtab
echo -e "${BLUE}[2/4] Starting Pinchtab server...${NC}"
"$PINCHTAB_BIN" &
PINCHTAB_PID=$!
echo -e "${GREEN}✓ Pinchtab PID: $PINCHTAB_PID (http://localhost:$PINCHTAB_PORT)${NC}"
sleep 2
echo ""

# Verify Pinchtab is running
if ! curl -s "http://localhost:$PINCHTAB_PORT/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}✗ Pinchtab failed to start${NC}"
    kill $PINCHTAB_PID 2>/dev/null || true
    exit 1
fi

# Start North Star
echo -e "${BLUE}[3/4] Starting North Star (backend + frontend)...${NC}"
cd "$NORTH_STAR_DIR"
npm run dev:full &
NORTH_STAR_PID=$!
echo -e "${GREEN}✓ North Star PID: $NORTH_STAR_PID${NC}"
sleep 5
echo ""

# Verify North Star is running
if ! curl -s "http://localhost:3000/constellation" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ North Star may still be starting...${NC}"
fi

# Ready message
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Development Environment Ready${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BLUE}Pinchtab Server${NC}       http://localhost:$PINCHTAB_PORT"
echo -e "  ${BLUE}North Star Canvas${NC}     http://localhost:3000/constellation"
echo -e "  ${BLUE}Backend API${NC}           http://localhost:3001"
echo ""
echo -e "${YELLOW}Available Commands (in new terminal):${NC}"
echo ""
echo -e "  ${CYAN}# Run integration test${NC}"
echo -e "  ./scripts/pinchtab-test.sh"
echo ""
echo -e "  ${CYAN}# Basic Pinchtab CLI${NC}"
echo -e "  pinchtab nav http://localhost:3000/constellation"
echo -e "  pinchtab snap -i"
echo -e "  pinchtab text"
echo ""
echo -e "  ${CYAN}# Verify everything works${NC}"
echo -e "  curl http://localhost:9867/instances"
echo -e "  curl http://localhost:3000/constellation | head -20"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep running
wait
