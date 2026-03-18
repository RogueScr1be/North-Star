# Pinchtab Quick Reference for North Star

## Startup (Terminal 1)
```bash
~/bin/pinchtab
```

## In Development (Terminal 2+)

### Basic Navigation
```bash
# Navigate to North Star constellation
pinchtab nav http://localhost:3000/constellation

# Get current page structure
pinchtab snap -i                    # Interactive elements only
pinchtab snap -i -c                 # With coordinates

# Extract text
pinchtab text                       # All text content
pinchtab text | head -30            # First 30 lines

# Click element
pinchtab click e5                   # 'e5' from snap output

# Fill input
pinchtab fill e2 "decision"         # Fill search with "decision"

# Press key
pinchtab press e7 Enter             # Submit form

# Type text
pinchtab type e3 "test"             # Type into input
```

## Common Workflows

### Verify Canvas Renders
```bash
pinchtab nav http://localhost:3000/constellation
sleep 2
pinchtab text | grep -E "North Star|GetIT|Fast Food"
```

### Test Search
```bash
pinchtab nav http://localhost:3000/constellation
SEARCH=$(pinchtab snap -i | jq -r '.elements[] | select(.label | contains("Search")) | .ref' | head -1)
pinchtab fill $SEARCH "decision"
sleep 1
pinchtab text | head -20
```

### Click and Verify
```bash
# Get elements
SNAP=$(pinchtab snap -i -c)

# Find first clickable element
ELEM=$(echo $SNAP | jq -r '.elements[0].ref')

# Click it
pinchtab click $ELEM

# Verify result
sleep 1
pinchtab snap -i
```

### Check URL State
```bash
# Navigate
pinchtab nav "http://localhost:3000/constellation?selected=node-xyz"

# Verify state persists (check text for selected item)
sleep 2
pinchtab text | grep "selected"
```

## HTTP API (Direct curl)

### Create Instance
```bash
# Launch headless
INST=$(curl -s -X POST http://localhost:9867/instances/launch \
  -H "Content-Type: application/json" \
  -d '{"name":"test","mode":"headless"}' | jq -r '.id')

# Launch headed (visible Chrome)
INST=$(curl -s -X POST http://localhost:9867/instances/launch \
  -H "Content-Type: application/json" \
  -d '{"name":"debug","mode":"headed"}' | jq -r '.id')
```

### Open Tab
```bash
TAB=$(curl -s -X POST http://localhost:9867/instances/$INST/tabs/open \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:3000/constellation"}' | jq -r '.tabId')
```

### Get Snapshot
```bash
# Interactive elements
curl -s "http://localhost:9867/tabs/$TAB/snapshot?filter=interactive" | jq .

# All elements
curl -s "http://localhost:9867/tabs/$TAB/snapshot" | jq .

# Count elements
curl -s "http://localhost:9867/tabs/$TAB/snapshot?filter=interactive" | jq '.elements | length'
```

### Extract Text
```bash
curl -s "http://localhost:9867/tabs/$TAB/text"

# Search in output
curl -s "http://localhost:9867/tabs/$TAB/text" | grep -i "decision"
```

### Click Element
```bash
curl -X POST "http://localhost:9867/tabs/$TAB/action" \
  -H "Content-Type: application/json" \
  -d '{"kind":"click","ref":"e5"}'
```

### Fill Input
```bash
curl -X POST "http://localhost:9867/tabs/$TAB/action" \
  -H "Content-Type: application/json" \
  -d '{"kind":"fill","ref":"e2","text":"decision"}'
```

### Type Text
```bash
curl -X POST "http://localhost:9867/tabs/$TAB/action" \
  -H "Content-Type: application/json" \
  -d '{"kind":"type","ref":"e3","text":"hello"}'
```

### Press Key
```bash
curl -X POST "http://localhost:9867/tabs/$TAB/action" \
  -H "Content-Type: application/json" \
  -d '{"kind":"press","ref":"e7","key":"Enter"}'
```

### Close Instance
```bash
curl -s -X DELETE "http://localhost:9867/instances/$INST"
```

## Scripting Patterns

### Chained Operations
```bash
#!/bin/bash
# 1. Navigate
pinchtab nav http://localhost:3000/constellation
sleep 2

# 2. Get elements
SNAP=$(pinchtab snap -i -c)
SEARCH=$(echo $SNAP | jq -r '.elements[] | select(.label | contains("Search")) | .ref' | head -1)

# 3. Fill and wait
pinchtab fill $SEARCH "decision"
sleep 2

# 4. Get results
pinchtab text | head -30
```

### Error Handling
```bash
#!/bin/bash
set -e

# Navigate and fail loudly if unreachable
pinchtab nav http://localhost:3000/constellation || {
    echo "Failed to navigate"
    exit 1
}

sleep 2

# Get snapshot or fail
SNAP=$(pinchtab snap -i) || {
    echo "Failed to get snapshot"
    exit 1
}

# Extract and process
echo "$SNAP" | jq .
```

### Logging & Debugging
```bash
#!/bin/bash

LOG_FILE="/tmp/pinchtab-test.log"

echo "[$(date)] Starting test" | tee -a $LOG_FILE

pinchtab nav http://localhost:3000/constellation | tee -a $LOG_FILE
sleep 2

TEXT=$(pinchtab text)
echo "[$(date)] Page text length: ${#TEXT}" | tee -a $LOG_FILE

if echo "$TEXT" | grep -q "North Star"; then
    echo "[$(date)] ✓ Test passed" | tee -a $LOG_FILE
else
    echo "[$(date)] ✗ Test failed" | tee -a $LOG_FILE
    exit 1
fi
```

## Token Estimation

### Snapshot (Text-Based)
```
Number of elements: 50
JSON size: ~25KB
Estimated tokens: 800
```

### Screenshot (Pixel-Based)
```
Image size: 1920×1080
JPEG size: ~500KB
Estimated tokens: 10,000
```

**Savings per operation: 9,200 tokens (92% reduction)**

## Common Elements

### Search Input
```bash
pinchtab snap -i | jq '.elements[] | select(.label | contains("Search"))'
# Returns: ref, label, value, attributes
```

### Button/Link
```bash
pinchtab snap -i | jq '.elements[] | select(.tag == "button")'
```

### Result Item
```bash
pinchtab snap -i | jq '.elements[] | select(.attributes != null)'
```

### Text Content
```bash
pinchtab snap -i | jq '.elements[] | select(.text != null) | .text'
```

## Performance Tips

1. **Cache snapshots** — Don't call `snap` multiple times if not needed
2. **Use filters** — `?filter=interactive` is faster than full snapshot
3. **Parallel instances** — Run multiple headless instances simultaneously
4. **Cleanup** — Always delete instances when done
5. **Wait appropriately** — Use `sleep` between navigation and interaction

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Port 9867 in use** | `lsof -i :9867 \| awk 'NR==2 {print $2}' \| xargs kill` |
| **No elements returned** | Ensure page fully loaded (`sleep 3`) |
| **Ref invalid** | Get fresh snapshot before clicking |
| **Timeout** | Check if North Star backend is running (`curl localhost:3001`) |
| **Text extraction empty** | Page may have shadow DOM (use `snap -i` instead) |

## Files

- **Integration Guide:** `./.PINCHTAB-INTEGRATION.md`
- **Setup Complete:** `./.PINCHTAB-SETUP-COMPLETE.md`
- **Test Suite:** `./scripts/pinchtab-verify-ns.sh`
- **Dev Launcher:** `./scripts/dev-with-pinchtab.sh`
- **Reference Test:** `./scripts/pinchtab-test.sh`

## Quick Links

- Docs: https://pinchtab.com/docs
- API: http://localhost:9867 (when running)
- North Star: http://localhost:3000/constellation
- Binary: ~/bin/pinchtab

---

**Need help?** See `.PINCHTAB-INTEGRATION.md` for 80+ detailed sections.

**Ready to test?** Run: `./scripts/pinchtab-verify-ns.sh`
