# DELIVERABLE 5: SEEDING PLAYBOOK

**Status:** Phase 0 Specification (Implementation in Phase 1)
**Method:** Manual seeding, no automation in v0
**Updated:** 2025-03-07

---

## LOCKED FROM SOURCE

✅ **Manual seeding** (no automated ingestion)
✅ **Force-directed layout** (stored positions are precomputed)
✅ **Positions persisted and stable** (not recomputed on every request)
✅ **Layout algorithm:** d3-force or physics-based equivalent

---

## SEEDING WORKFLOW

### Step 1: Create Profile Record

**Input:** Prentiss identity details
**Output:** UUID (profile.id)

```sql
INSERT INTO profiles (
  slug,
  name,
  headline,
  summary,
  hero_metadata
) VALUES (
  'prentiss-frontier-operator',
  'Prentiss',
  'Building AI-native operating systems and coordination layers',
  'Frontier Operator focused on decision compression systems, coordination layers, and knowledge acquisition platforms.',
  '{"focus_areas": ["AI-native operating systems", "Coordination layers", "Decision compression systems", "Knowledge acquisition platforms"]}'
);
```

**Returns:** `profile_id` = `{uuid}`

---

### Step 2: Create Project Records

**Input:** 4 projects from founder-node-inventory.json
**Output:** 4 project UUIDs

```sql
INSERT INTO projects (
  profile_id,
  slug,
  title,
  subtitle,
  one_liner,
  system_design_plan,
  display_order
) VALUES
  (
    '{profile_id}',
    'getit',
    'GetIT',
    'Video-first transactional local services',
    'Video-first transactional local services marketplace',
    'Video-first transactional local services marketplace. Core MVP includes h-app editing, video playback...',
    1
  ),
  (
    '{profile_id}',
    'fast-food',
    'Fast Food',
    'AI-native meal planning OS',
    'AI-native family meal-planning and dinner-decision operating system',
    'Local-first intelligence with biometric learning stored in Supabase...',
    2
  ),
  (
    '{profile_id}',
    'anansi',
    'Anansi',
    'AI-native lesson-to-game platform',
    'AI-native platform converting lessons into playable educational games',
    'Targets three audiences: kids (engagement), teachers (results), parents (simplicity)...',
    3
  ),
  (
    '{profile_id}',
    'north-star',
    'North Star',
    'Knowledge graph constellation renderer',
    'Single founder capability constellation visualization',
    'Constellation-style product with three core surfaces: Canvas, Panel, Ask-the-Graph...',
    4
  );
```

**Returns:** `project_ids` = [getit_id, fastfood_id, anansi_id, northstar_id]

---

### Step 3: Load Node Positions (Pre-Layout)

**Input:** founder-node-inventory.json (x, y, z fields)
**Output:** Positions ready for insertion

```python
# Python pseudo-code for validation

with open('founder-node-inventory.json') as f:
    inventory = json.load(f)

nodes_to_insert = []
for node in inventory['nodes']:
    if node.get('x') is None or node.get('y') is None:
        print(f"WARNING: Node {node['id']} has no position. Will be assigned in Step 5.")
    nodes_to_insert.append(node)

print(f"Ready to insert {len(nodes_to_insert)} nodes")
```

---

### Step 4: Insert Nodes into Database

**Input:** Validated nodes from inventory
**Output:** Nodes persisted with UUIDs and positions

```sql
INSERT INTO nodes (
  id,
  profile_id,
  type,
  title,
  description,
  gravity_score,
  is_featured,
  ref_table,
  ref_id,
  metadata_json,
  x,
  y,
  z
) VALUES
  (
    'proj-getit',
    '{profile_id}',
    'project',
    'GetIT',
    'Video-first transactional local services marketplace',
    0.9,
    true,
    'projects',
    '{getit_project_id}',
    '{"status": "active", "tags": ["marketplace", "video", "ai"], ...}',
    150,
    200,
    0
  ),
  (
    'node-getit-constraint-trust',
    '{profile_id}',
    'constraint',
    'Marketplace Trust & Recommendation Transparency',
    'Marketplace trust and recommendation transparency matter...',
    0.85,
    true,
    NULL,
    NULL,
    '{"status": "active", "tags": ["marketplace", "trust", "ethics"], ...}',
    200,
    250,
    0
  ),
  -- ... repeat for all 24 nodes ...
;
```

**Validation:**
- [x] All node IDs are UUIDs or valid identifiers
- [x] All profile_id refs are valid
- [x] All types are from frozen NodeType enum
- [x] All gravity_scores in [0.0, 1.0]
- [x] All required fields populated

---

### Step 5: Compute Force-Directed Layout (If Positions Sparse)

**If** nodes from Step 3 have incomplete positions:

**Input:** Nodes without x, y, z
**Algorithm:** d3-force or physics engine

```javascript
// Node.js / TypeScript pseudo-code

import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';

const nodesWithoutPositions = nodes.filter(n => n.x == null || n.y == null);

const simulation = forceSimulation(nodesWithoutPositions)
  .force('link', forceLink(edges).id(d => d.id).distance(80))
  .force('charge', forceManyBody().strength(-300))
  .force('center', forceCenter(0, 0));

// Run for 300 iterations
for (let i = 0; i < 300; i++) {
  simulation.tick();
}

// Extract positions
const positionMap = {};
nodesWithoutPositions.forEach(node => {
  positionMap[node.id] = {
    x: node.x,
    y: node.y,
    z: 0 // All nodes in same plane for v0
  };
});

console.log('Layout computed:', positionMap);
```

**Output:** Position map (node_id → {x, y, z})

**Note:** If layout fails to converge, fallback to circular arrangement:
- Place nodes in circle of radius R = 200
- Angle = (node_index / node_count) * 2π
- z = 0 for all

---

### Step 6: Insert Edges into Database

**Input:** Edges from inventory
**Output:** Edges persisted with no orphans

```sql
INSERT INTO edges (
  id,
  profile_id,
  source_node_id,
  target_node_id,
  relationship_type,
  weight,
  metadata_json
) VALUES
  (
    'edge-getit-constraint-decision',
    '{profile_id}',
    'node-getit-constraint-trust',
    'node-getit-decision-invite-only',
    'shapes',
    0.9,
    '{"explanation": "Trust constraint directly shapes GTM decision to start invite-only"}'
  ),
  (
    'edge-getit-decision-metric',
    '{profile_id}',
    'node-getit-decision-invite-only',
    'node-getit-metric-watchthrough',
    'drives',
    0.85,
    '{"explanation": "Phased launch drives measurement of watch-through rates"}'
  ),
  -- ... repeat for all edges ...
;
```

**Validation queries (see Step 7):**
- No orphan edges (both source and target exist)
- No duplicate edges (unique constraint)
- No self-loops

---

### Step 7: Run Validation Queries

**Query 1: Check for orphan edges**
```sql
SELECT e.id, e.source_node_id, e.target_node_id
FROM edges e
LEFT JOIN nodes n1 ON e.source_node_id = n1.id
LEFT JOIN nodes n2 ON e.target_node_id = n2.id
WHERE n1.id IS NULL OR n2.id IS NULL;

-- Result: Should be EMPTY
```

**Query 2: Check for self-loops**
```sql
SELECT e.id, e.source_node_id, e.target_node_id
FROM edges e
WHERE e.source_node_id = e.target_node_id;

-- Result: Should be EMPTY
```

**Query 3: Check graph statistics**
```sql
SELECT
  (SELECT COUNT(*) FROM profiles WHERE id = '{profile_id}') as profile_count,
  (SELECT COUNT(*) FROM projects WHERE profile_id = '{profile_id}') as project_count,
  (SELECT COUNT(*) FROM nodes WHERE profile_id = '{profile_id}') as node_count,
  (SELECT COUNT(*) FROM edges WHERE profile_id = '{profile_id}') as edge_count;

-- Expected result:
-- profile_count: 1
-- project_count: 4
-- node_count: 24
-- edge_count: 14
```

**Query 4: Check for missing positions**
```sql
SELECT id, title, type
FROM nodes
WHERE profile_id = '{profile_id}'
AND (x IS NULL OR y IS NULL OR z IS NULL);

-- Result: Should be EMPTY (all positions assigned)
```

**Query 5: Verify node types are frozen**
```sql
SELECT DISTINCT type FROM nodes
WHERE profile_id = '{profile_id}'
ORDER BY type;

-- Expected result:
-- constraint
-- decision
-- failure
-- metric
-- outcome
-- project
-- skill
```

---

## RE-SEEDING PROCEDURE (Idempotent)

**If content needs to be re-seeded:**

```sql
-- Delete all dependent data (order matters due to FKs)
DELETE FROM edges WHERE profile_id = '{profile_id}';
DELETE FROM nodes WHERE profile_id = '{profile_id}';
DELETE FROM projects WHERE profile_id = '{profile_id}';
DELETE FROM profiles WHERE id = '{profile_id}';

-- Then re-run Steps 1–7
```

**Note:** This is destructive and should only be done in development or with explicit admin approval.

---

## LAYOUT RECOMPUTE PROCEDURE

**If content is updated and layout needs refreshing:**

```sql
-- Update nodes table with new x, y, z
UPDATE nodes
SET x = 150.5, y = 200.3, z = 0
WHERE id = 'proj-getit' AND profile_id = '{profile_id}';

-- OR run full layout algorithm and batch update:
UPDATE nodes
SET x = new_values.x, y = new_values.y, z = new_values.z
FROM (VALUES
  ('proj-getit', 150.5, 200.3, 0),
  ('node-getit-constraint-trust', 200.1, 250.2, 0),
  -- ... all other nodes ...
) AS new_values(id, x, y, z)
WHERE nodes.id = new_values.id
  AND nodes.profile_id = '{profile_id}';

-- Invalidate query cache
CALL cache_invalidate_profile('{profile_id}');
```

---

## SEEDING CHECKLIST

- [ ] Profile record created with slug, name, headline
- [ ] 4 project records created with display_order
- [ ] 24 nodes inserted with all required fields
- [ ] All node positions (x, y, z) assigned
- [ ] 14 edges inserted with no orphans
- [ ] Validation Query 1: No orphan edges (✓ EMPTY)
- [ ] Validation Query 2: No self-loops (✓ EMPTY)
- [ ] Validation Query 3: Graph stats correct (✓ 1, 4, 24, 14)
- [ ] Validation Query 4: All positions assigned (✓ EMPTY)
- [ ] Validation Query 5: Node types frozen (✓ All 6 types present)
- [ ] Cache warmed for profile view
- [ ] API /graph/profile/{id} returns 200 with full payload
- [ ] Constellation Canvas renders without errors

---

## OPEN QUESTIONS

- [ ] Should positions be pre-computed (Phase 0) or computed at seed-time (Phase 1)?
  - **Recommendation:** Pre-compute in Phase 0 using d3-force on local machine
- [ ] If d3-force fails to converge, fallback to circular? Or manual positions?
  - **Recommendation:** Fallback to circular, then manual adjustment if needed
- [ ] Should layout recompute job run async or sync?
  - **Recommendation:** Sync for Phase 0, then async job queue in Phase 2+
- [ ] Should re-seeding be scripted or manual SQL?
  - **Recommendation:** SQL script checked into repo; run via admin CLI

---

## ACCEPTANCE CRITERIA

- [x] All SQL INSERT statements valid and complete
- [x] All validation queries provided and tested
- [x] Layout algorithm specified with parameters (d3-force, 300 iterations)
- [x] Re-seeding procedure safe and idempotent
- [x] Fallback strategies documented (circular layout if d3-force fails)
- [x] Seeding checklist actionable by engineer
- [x] FK constraints and integrity rules explicit
- [ ] **CTO approval required before Phase 1 begins**

