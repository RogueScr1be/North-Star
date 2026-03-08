# Coordinate Authoring Workflow

## Blocking Status
**Phase 2 cannot proceed until real authored coordinates replace current placeholders (0,0,0) across all 50 nodes.**

## Step 1: Generate First-Pass Layout

Install d3-force:
```bash
cd backend/seeding
npm install d3-force
```

Generate draft coordinates:
```bash
node generate-coordinates.js /Users/thewhitley/North\ Star/deliverable-1.1-founder-node-inventory-revised.json > coordinates-draft.json
```

Output: `coordinates-draft.json` with (id, x, y, z) for all 50 nodes in range [-100, +100].

## Step 2: Manual Review & Tuning

Open `coordinates-draft.json` and review against Spatial Narrative Rules:

- **Founder:** should be near (0, 0, 0) — adjust if needed
- **Projects:** GetIT (east), Fast Food (north), Anansi (west), North Star (center-adjacent) — visually distinct?
- **Skills (13 nodes):** bridging projects at 25–40 units — visible as bridges?
- **Decisions:** per-project chains readable?
- **Constraints/failures:** near parent project?
- **Outcomes:** near decisions they result from?

No node pairs closer than 8 units. Hard limit ±120 units.

Make manual adjustments to coordinates for narrative clarity.

## Step 3: Persist Final Coordinates

Create a merge script or manually edit inventory:

```bash
# For each node in coordinates-draft.json (after tuning):
# Update corresponding node in deliverable-1.1-founder-node-inventory-revised.json
# with final (x, y, z) values
```

Or use a tool like `jq` to merge:
```bash
jq -r '.[] | @json' coordinates-draft.json > coords-tuned.ndjson
# Then merge into inventory using your preferred tool
```

## Step 4: Validate

```bash
# All coordinates present
jq '.nodes | map(select(.x == null or .y == null or .z == null)) | length' inventory.json
# Should return: 0

# Range check
jq '[.nodes[] | [.x, .y]] | flatten | [min, max]' inventory.json
# min >= -120, max <= 120

# No unintended (0,0,0)
jq '.nodes | map(select(.x == 0 and .y == 0 and .z == 0)) | length' inventory.json
# Should be 0 (unless explicitly intended and founder confirms)
```

## Step 5: Dry-Run Seed Generation

```bash
python3 generate-seed.py /Users/thewhitley/North\ Star/deliverable-1.1-founder-node-inventory-revised.json > /tmp/test-seed.sql
# Should succeed with no errors
grep "INSERT INTO nodes" /tmp/test-seed.sql | head -1 | grep -E "x|y|z"
# Should show coordinates in column list and VALUES
```

## Step 6: Commit & Await Approval

```bash
git add deliverable-1.1-founder-node-inventory-revised.json
git commit -m "author: add real constellation coordinates (draft review pending)"
# Do NOT reseed DB until founder approves spatial narrative
```

## Blockers for Phase 2.1
- ❌ Cannot proceed to API work without authored coordinates
- ❌ Cannot proceed to rendering without coordinates in DB
- ✅ Can proceed once: coordinates in inventory + validation passes + founder approves layout
