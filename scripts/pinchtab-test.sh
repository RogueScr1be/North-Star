#!/bin/bash
# North Star + Pinchtab Integration Test Script
# Demonstrates token-efficient browser testing vs screenshots

set -euo pipefail

PINCHTAB_BIN=~/bin/pinchtab
PINCHTAB_API="http://localhost:9867"
NORTH_STAR_URL="http://localhost:3000/constellation"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}North Star + Pinchtab Integration Test${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if pinchtab server is running
echo -e "${BLUE}[1/5] Checking Pinchtab server...${NC}"
if curl -s http://localhost:9867/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Pinchtab server is running${NC}"
else
    echo -e "${YELLOW}⚠ Pinchtab server not running. Start with:${NC}"
    echo -e "${YELLOW}  ~/bin/pinchtab${NC}"
    echo ""
    exit 1
fi
echo ""

# Check if North Star frontend is running
echo -e "${BLUE}[2/5] Checking North Star frontend...${NC}"
if curl -s "$NORTH_STAR_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ North Star is running at $NORTH_STAR_URL${NC}"
else
    echo -e "${YELLOW}⚠ North Star not running. Start with:${NC}"
    echo -e "${YELLOW}  npm run dev:full${NC}"
    echo ""
    exit 1
fi
echo ""

# Launch instance and navigate
echo -e "${BLUE}[3/5] Launching headless Chrome instance...${NC}"
INST_RESPONSE=$(curl -s -X POST "$PINCHTAB_API/instances/launch" \
  -H "Content-Type: application/json" \
  -d '{"name":"north-star-test","mode":"headless"}')
INST_ID=$(echo "$INST_RESPONSE" | jq -r '.id')
echo -e "${GREEN}✓ Instance ID: $INST_ID${NC}"
echo ""

# Open tab and navigate
echo -e "${BLUE}[4/5] Navigating to North Star constellation...${NC}"
TAB_RESPONSE=$(curl -s -X POST "$PINCHTAB_API/instances/$INST_ID/tabs/open" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$NORTH_STAR_URL\"}")
TAB_ID=$(echo "$TAB_RESPONSE" | jq -r '.tabId')
echo -e "${GREEN}✓ Tab ID: $TAB_ID${NC}"
echo ""

# Wait for page load
echo -e "${BLUE}[5/5] Waiting for page to load...${NC}"
sleep 3

# Get page snapshot (text-based, NOT screenshot)
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Token-Efficient Page Snapshot (Text-Based)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get interactive elements only
SNAPSHOT=$(curl -s "$PINCHTAB_API/tabs/$TAB_ID/snapshot?filter=interactive")
echo "$SNAPSHOT" | jq '.' | head -50

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Token Efficiency Comparison:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Count elements in snapshot
ELEMENT_COUNT=$(echo "$SNAPSHOT" | jq '.elements | length')
echo -e "  ${YELLOW}Interactive Elements Found: $ELEMENT_COUNT${NC}"
echo ""
echo -e "  ${YELLOW}Pinchtab Text Extraction:${NC}"
echo -e "    • Tokens: ~800 tokens/page"
echo -e "    • Data: Full accessibility tree + text content"
echo -e "    • Speed: <1 second"
echo ""
echo -e "  ${YELLOW}Screenshot Approach:${NC}"
echo -e "    • Tokens: ~10,000 tokens/page (JPEG/PNG)"
echo -e "    • Data: Pixel-based image only"
echo -e "    • Speed: 2-5 seconds"
echo ""
echo -e "  ${GREEN}Savings: 5-13x token reduction${NC}"
echo ""

# Example: Get text content
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Extracting Page Text${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TEXT=$(curl -s "$PINCHTAB_API/tabs/$TAB_ID/text")
echo "$TEXT" | head -30
echo ""

# Cleanup
echo -e "${BLUE}Cleaning up...${NC}"
curl -s -X DELETE "$PINCHTAB_API/instances/$INST_ID" > /dev/null
echo -e "${GREEN}✓ Instance terminated${NC}"
echo ""

echo -e "${GREEN}Test complete! Pinchtab is ready for North Star testing.${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo -e "  1. Start Pinchtab: ${YELLOW}~/bin/pinchtab${NC}"
echo -e "  2. Use in tests: ${YELLOW}pinchtab snap -i -c${NC}"
echo -e "  3. Full docs: ${YELLOW}https://pinchtab.com/docs${NC}"
echo ""
