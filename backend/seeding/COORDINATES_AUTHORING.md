# Coordinate Authoring for North Star Phase 2

## Status
Migration 006 created. Seed generator updated. JSON schema now supports x, y, z.
**Blocker:** All nodes currently have placeholder coordinates (0, 0, 0). Real authored coordinates must be added before Phase 2 readiness.

## Required Next Steps

### 1. Author Real Coordinates
Generate first-pass layout using external tool (d3-force, vis.js, or similar) that consumes:
- 50 nodes
- 59 edges
- Relationship types

Output format: x, y, z coordinates for each node.

### 2. Manual Tuning
Domain expert (founder) reviews and adjusts coordinates for narrative clarity:
- Project clusters positioned clearly
- Skill nodes form meaningful subgraphs
- Constraint/decision/outcome chains readable

### 3. Persist in Canonical Inventory
Update `deliverable-1.1-founder-node-inventory-revised.json`:
```json
{
  "id": "node-id",
  "x": 5.2,    // Real authored value
  "y": 12.1,   // Real authored value
  "z": 0.0,    // Real authored value
  ...
}
```

### 4. Regenerate Seed
```bash
cd backend/seeding
python3 generate-seed.py ../../../deliverable-1.1-founder-node-inventory-revised.json > phase1-seed.sql
```

Seed will fail fast if any node lacks x, y, or z.

### 5. Apply Seed & Verify
```bash
# In Supabase SQL editor:
SELECT COUNT(*) as nodes_with_coords
FROM nodes
WHERE x IS NOT NULL AND y IS NOT NULL AND z IS NOT NULL;
-- Should equal 50

SELECT COUNT(*) as unintended_defaults
FROM nodes
WHERE x = 0 AND y = 0 AND z = 0;
-- Should be 0 (unless (0,0,0) was explicitly intended for a node)
```

## Blockers for Phase 2.1
- Cannot proceed to `/api/graph` endpoint until authored coordinates are seeded
- Cannot proceed to constellation rendering until coordinates are verified
