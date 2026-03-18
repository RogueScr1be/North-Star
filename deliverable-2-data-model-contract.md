# DELIVERABLE 2: DATA MODEL CONTRACT

**Status:** Phase 0 Specification
**Database:** Supabase Postgres
**Updated:** 2025-03-07

---

## LOCKED FROM SOURCE

✅ **Database:** Supabase Postgres
✅ **Minimum table set:** profiles, projects, nodes, edges
✅ **Positions (x, y, z):** Persisted and stable (from MFP spec, Section 4: "stored positions for stability")
✅ **Layout computation:** Precomputed and cached, not recomputed on every request
✅ **Scoping:** Every node belongs to one profile (scoped isolation)
✅ **Data integrity:** No orphan edges (hard constraint)
✅ **Node types:** project | decision | constraint | failure | metric | skill | outcome | experiment
✅ **Relationship types:** contains | improves | uses | causes | conflicts_with | depends_on | derived_from | enables | shapes | drives | demonstrates | shares_pattern | led_to

---

## TABLE SCHEMAS

### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug CITEXT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  headline TEXT,
  summary TEXT,
  hero_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_slug ON profiles(slug);
```

**Locked values:**
- Each profile is a single founder constellation
- Public read access
- Admin-only modifications

---

### `projects`
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug CITEXT UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  one_liner TEXT,
  system_design_plan TEXT,
  next_proof TEXT,
  display_order INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_profile_id ON projects(profile_id);
CREATE INDEX idx_projects_display_order ON projects(profile_id, display_order);
```

**Locked values:**
- Scoped to single profile
- deterministic display_order for stable rendering

---

### `nodes`
```sql
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- ENUM: project|decision|constraint|failure|metric|skill|outcome|experiment
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata_json JSONB,

  -- Layout
  x FLOAT,
  y FLOAT,
  z FLOAT,

  -- Content signal
  gravity_score FLOAT CHECK (gravity_score >= 0.0 AND gravity_score <= 1.0),
  is_featured BOOLEAN DEFAULT false,

  -- Referential (optional)
  ref_table VARCHAR(50),
  ref_id UUID,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nodes_profile_id ON nodes(profile_id);
CREATE INDEX idx_nodes_type ON nodes(profile_id, type);
CREATE INDEX idx_nodes_gravity ON nodes(profile_id, gravity_score DESC);
CREATE INDEX idx_nodes_featured ON nodes(profile_id, is_featured);
```

**Locked values:**
- Positions (x, y, z) are persisted and stable
- gravity_score clamped [0.0, 1.0]
- type enum is frozen
- metadata_json is JSONB for flexible evidence/tags

---

### `edges`
```sql
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- ENUM: locked list below
  weight FLOAT DEFAULT 1.0 CHECK (weight >= 0.0 AND weight <= 1.0),
  metadata_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT no_self_loops CHECK (source_node_id != target_node_id),
  CONSTRAINT no_duplicate_edges UNIQUE(source_node_id, target_node_id, relationship_type)
);

CREATE INDEX idx_edges_profile_id ON edges(profile_id);
CREATE INDEX idx_edges_source ON edges(source_node_id);
CREATE INDEX idx_edges_target ON edges(target_node_id);
CREATE INDEX idx_edges_relationship ON edges(relationship_type);
```

**Locked values:**
- No orphan edges (FK constraints enforced)
- No self-loops
- No duplicate edges with same source, target, relationship_type
- weight clamped [0.0, 1.0]
- relationship_type is frozen enum

---

## ENUMS (FROZEN)

### NodeType
```
project
decision
constraint
failure
metric
skill
outcome
experiment
```

### RelationType
```
contains
improves
uses
causes
conflicts_with
depends_on
derived_from
enables
shapes
drives
demonstrates
shares_pattern
led_to
```

### metadata_json Structure (PROPOSED, REQUIRES CTO APPROVAL)

**For all nodes:**
```json
{
  "status": "active|archived|planned|gap",
  "tags": ["string", "string"],
  "evidence": [
    {
      "source": "string (e.g., 'Prentiss North Star Projects')",
      "detail": "string (quoted from source material or synthesis)",
      "url": "string (optional link)"
    }
  ],
  "custom_field": "any (implementation-specific)"
}
```

**Example for a decision node:**
```json
{
  "status": "active",
  "tags": ["marketplace", "gtm", "trust-building"],
  "evidence": [
    {
      "source": "Prentiss North Star Projects",
      "detail": "Invite-only controlled launch first. Phased expansion as part of GTM logic."
    }
  ]
}
```

---

## LAYOUT COMPUTATION (PROPOSED, REQUIRES CTO APPROVAL)

### Strategy
**Option A (RECOMMENDED for MFP):**
- Positions computed once, offline, via force-directed algorithm (d3-force or similar)
- Stored in `nodes.x, nodes.y, nodes.z`
- Treated as immutable (users cannot drag/edit)
- If content changes, admin runs `/api/graph/layout/recompute` to regenerate all positions
- Ensures stable, reproducible layout across sessions

### Algorithm Parameters
```
Force Library: d3-force (or physics-based equivalent)
Forces: link, charge, center
Iterations: 300
Output: x, y, z positions stored in nodes table
Collision detection: Sphere-based (radius ~30px)
```

### Recompute Trigger
Admin-only endpoint: `POST /api/graph/layout/recompute`
- Deletes all existing positions
- Re-runs force-directed layout
- Stores new positions
- Invalidates query cache
- Logs operation for audit trail

---

## GRAVITY SCORE ASSIGNMENT (PROPOSED, REQUIRES CTO APPROVAL)

### Option A (RECOMMENDED): Author-Assigned

**Rationale:**
- Explicit intent: founder controls signal
- Interpretable: score reflects importance judgment, not black-box computation
- Stable: doesn't change when content is added elsewhere

**Process:**
- Assigned during content seeding (Phase 0)
- Range: 0.0 (low importance) → 1.0 (high importance)
- Examples:
  - Decision = 0.85–0.95
  - Constraint = 0.75–0.90
  - Failure = 0.50–0.70
  - Skill = 0.80–0.95
  - Outcome = 0.60–0.85

**No runtime recomputation.**

---

## CONSTRAINTS & INTEGRITY

| Constraint | Rule | Enforced | Rollback |
|-----------|------|----------|----------|
| No orphans | Every edge's source and target nodes must exist | FK trigger | RESTRICT |
| No self-loops | source_node_id ≠ target_node_id | CHECK constraint | REJECT |
| No duplicates | (source_id, target_id, type) is unique | UNIQUE index | CONFLICT: UPDATE weight or REJECT |
| Gravity bounds | 0.0 ≤ gravity_score ≤ 1.0 | CHECK constraint | REJECT |
| Profile scoping | Every node belongs to exactly one profile | FK constraint | RESTRICT |
| Position persistence | x, y, z treated as immutable (app-level enforcement) | No DB trigger (admin-only) | Manual via recompute |

---

## OPEN QUESTIONS

- [ ] Should gravity_score be user-editable in Phase 1+? (Currently: admin-only)
- [ ] Should layout be user-dragable in Phase 2? (Currently: admin-only recompute)
- [ ] Is there a max node limit per profile for MFP v0? (Currently: unbounded)
- [ ] Should metadata_json have a schema validation (JSON schema) enforced at DB level?
- [ ] Should edges have bidirectional traversal indexes for query performance?
- [ ] Do we need a `deleted_at` soft-delete column for audit trail?

---

## ACCEPTANCE CRITERIA

- [x] All enums are frozen and non-negotiable
- [x] All table schemas specified with types, constraints, indexes
- [x] No contradictions between locked facts and proposed defaults
- [x] Referential integrity is explicit and enforced
- [x] Metadata JSON structure is documented and examples provided
- [x] Layout computation strategy is defined with algorithm parameters
- [ ] **CTO approval required before Phase 1 begins**

