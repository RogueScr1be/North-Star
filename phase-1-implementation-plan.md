# PHASE 1 IMPLEMENTATION PLAN
## North Star MFP — Ship Comprehension Before Interactivity

**Status:** Ready for Build
**Start Date:** 2025-03-07
**Objective:** Establish static, read-only founder knowledge graph with high-signal content navigation and evidence infrastructure. Zero interactive graph rendering. Focus on information architecture and citation integrity.

---

## NORMALIZATION AUDIT (COMPLETED)

### 1. Relationship Taxonomy Audit

**Current State:**
- 13 edge verbs defined in Deliverable 2
- 11 types actively used in revised inventory
- Distribution is heavily skewed: `demonstrates` = 37% of edges

**Audit Finding: OVER-DEFINED**

| Verb | Usage | Status | Phase 1 Recommendation |
|------|-------|--------|----------------------|
| demonstrates | 22 edges | ✅ Core | KEEP — Skill→Decision evidence backbone |
| produces | 8 edges | ✅ Core | KEEP — Decision→Outcome causality |
| shares_pattern | 3 edges | ✅ Secondary | KEEP — Cross-project synthesis signals |
| shapes | 3 edges | ✅ Secondary | KEEP — Constraint→Decision influence |
| requires | 3 edges | ✅ Secondary | KEEP — Constraint→Skill dependency |
| enables | 1 edge | ⚠️ Rare | OPTIONAL — Captures enablement but overlaps with produces/shapes |
| drives | 1 edge | ⚠️ Rare | CONSOLIDATE — Merge into demonstrates or shapes |
| leads_to | 1 edge | ✅ Secondary | KEEP — Captures failure→learning paths |
| defines | 1 edge | ⚠️ Ad-hoc | CONSOLIDATE — Merge into produces or shapes |
| refines | 1 edge | ⚠️ Ad-hoc | CONSOLIDATE — Merge into shapes or leads_to |
| addresses | 1 edge | ⚠️ Ad-hoc | CONSOLIDATE — Merge into shapes or produces |
| (unused: contains, improves, uses, causes, conflicts_with, depends_on, derived_from) | 0 | ❌ Dead | REMOVE from schema for Phase 1 |

**Phase 1 Action:**
- Use 8 core verbs for all Phase 1 content
- Database remains locked to original 13 (for future expansion)
- Document Phase 2+ verb consolidation separately

**Reduced Verb Set for Phase 1:**
```
1. demonstrates    (skill → decision/project/outcome)
2. produces        (decision → outcome/artifact)
3. shapes          (constraint → decision/outcome)
4. requires        (constraint → skill)
5. shares_pattern  (project → project / skill → skill)
6. enables         (decision/skill → capability)
7. leads_to        (failure → learning/decision)
8. contains        (project → decision/constraint/skill) [hierarchical scoping]
```

---

### 2. Proof-Bearing Nodes Audit

**Current State:**
- 50 nodes, 45 edges
- Zero artifact/demo/prototype nodes
- Zero user feedback/validation nodes
- Only 1 metric node (`node-getit-metric-watchthrough`)

**Audit Finding: METRICS NODE MISLABELED**

`node-getit-metric-watchthrough`
- **Current type:** metric
- **Actual content:** "MVP capabilities are descriptive rather than prescriptive; testing and UX iteration ongoing"
- **Problem:** This describes an OUTCOME (MVP capabilities established), not a quantified METRIC (watch-through rate measured)
- **Changelog confirmation:** "Metrics Gap — Only 1 formal metric documented. Most projects lack quantified signals."

**Phase 1 Action:**
- **RECLASSIFY:** `node-getit-metric-watchthrough` → `outcome`
- **NEW ID:** `node-getit-outcome-watchthrough-tracking` (to avoid collision with existing outcome)
- **NEW TITLE:** "Watch-Through Tracking Capability Enabled"
- **RATIONALE:** Graph documents founder intent and capability, not yet validated metrics. This is an outcome (capability enabled), not a metric (result measured).

**Proof-Bearing Nodes (Future Phases):**
- Phase 1: Document structure for evidence but don't fabricate nodes
- Phase 2: Add artifact/demo nodes after shipping
- Phase 3: Add user validation and quantified metrics after market validation

---

### 3. Outcome vs. Metric Distinction

**Outcome Nodes (Phase 1 ✅):**
- "MVP Capabilities Established"
- "Expansion UX Approach Designed"
- "Biometric Learning Path Established"
- "Lesson-to-Game Model Established"
- "Rendering Spec Locked"
- "API Contract Specified"
- **Watch-Through Tracking Capability Enabled** ← reclassified

**Metric Nodes (Deferred to Phase 2+):**
- GMV, CAC, retention, vendor density (GetIT)
- Meal planning adoption, family cohesion scores (Fast Food)
- User engagement, learning outcome (Anansi)
- Canvas render time, query latency (North Star)

---

## PHASE 1 SCOPE (FINAL)

### Build (In Scope)
✅ **Profile Hub**
- Founder profile card with headline, focus areas, project summary
- Static biographical context
- Evidence/source attribution display

✅ **Project Ledger**
- Project catalog (4 projects: GetIT, Fast Food, Anansi, North Star)
- Per-project card with gravity score, status, short description, system design
- Project-scoped node/edge counts
- Featured vs. standard indication

✅ **Static Evidence & Citation Presentation**
- Node detail page with source attribution
- Evidence/proof metadata structure (source, detail, URL)
- Linkable citations back to source material
- Tag-based content organization

✅ **Project Navigation**
- Route to project detail page
- Route to individual node detail page
- Breadcrumb navigation (Profile → Project → Node)
- Project-filtered node list

✅ **Content Architecture**
- Database schema (Deliverable 2): `profiles`, `projects`, `nodes`, `edges`
- API contract (4 endpoints minimum)
- Metadata JSON structure for evidence/tags
- Static rendering pipeline (no real-time updates Phase 1)

### Do Not Build (Out of Scope)
❌ Constellation Canvas (3D graph rendering)
❌ Node Expansion Panel (interactive detail drawer)
❌ Ask-the-Graph (semantic query layer)
❌ Fit Check (relationship validation logic)
❌ Three.js / React Three Fiber work
❌ Zoom, pan, click-to-focus camera logic
❌ Force-directed layout computation
❌ Graph algorithm visualization

---

## FILE STRUCTURE & ORGANIZATION

### Backend (API + Database)

```
/backend/
├── supabase/
│   └── migrations/
│       ├── 001_create_profiles.sql
│       ├── 002_create_projects.sql
│       ├── 003_create_nodes.sql
│       ├── 004_create_edges.sql
│       └── 005_add_indexes.sql
├── api/
│   ├── routes/
│   │   ├── profiles.ts       # GET /api/profiles/:slug
│   │   ├── projects.ts       # GET /api/projects, GET /api/projects/:id
│   │   ├── nodes.ts          # GET /api/nodes/:id, GET /api/projects/:id/nodes
│   │   └── edges.ts          # GET /api/edges (for project context)
│   ├── types.ts              # TypeScript interfaces (Node, Edge, etc.)
│   └── config.ts             # Supabase client, environment
```

### Frontend (UI + Client)

```
/frontend/
├── src/
│   ├── pages/
│   │   ├── ProfileHub.tsx           # Main founder page
│   │   ├── ProjectLedger.tsx        # Project catalog
│   │   ├── ProjectDetail.tsx        # Single project + its nodes
│   │   ├── NodeDetail.tsx           # Single node + evidence + edges
│   │   └── 404.tsx
│   ├── components/
│   │   ├── ProfileCard.tsx          # Founder bio + focus areas
│   │   ├── ProjectCard.tsx          # Gravity score + status + description
│   │   ├── NodeCard.tsx             # Minimal node representation
│   │   ├── EvidenceDisplay.tsx      # Citation + metadata rendering
│   │   ├── EdgeList.tsx             # Related nodes (incoming/outgoing)
│   │   ├── Breadcrumb.tsx           # Navigation context
│   │   └── Layout.tsx               # Header + sidebar
│   ├── hooks/
│   │   ├── useProfile.ts            # Fetch founder profile
│   │   ├── useProjects.ts           # Fetch all projects
│   │   ├── useNode.ts               # Fetch node + edges
│   │   └── useRelatedNodes.ts       # Fetch connected nodes
│   ├── lib/
│   │   ├── api.ts                   # API client wrapper
│   │   ├── types.ts                 # Shared types
│   │   └── formatting.ts            # Utils for gravity scores, tags
│   ├── styles/
│   │   ├── globals.css
│   │   └── components/              # CSS modules per component
│   └── App.tsx                      # Router + layout
```

### Content & Configuration

```
/content/
├── founder-inventory-1.1.json       # Data source (read-only Phase 1)
├── seeding/
│   └── phase1-seed.sql              # Insert statements for all nodes/edges
└── evidence/                        # Citation sources
    └── sources.md                   # Mapping: node ID → source material
```

---

## CONTENT MODEL DECISION: **MDX-FIRST (STATIC)**

### Rationale
- **No dynamic content in Phase 1:** All founder nodes, projects, and edges are static (from revised inventory)
- **Evidence is metadata-driven:** Source attributions live in JSON metadata, not separate content files
- **Citation integrity:** Embed source URLs and quotes in node detail pages
- **Future-proof:** Easy to add dynamic metrics/feedback in Phase 2

### Strategy
**Phase 1 Content Pipeline:**
```
Revised Inventory (JSON)
  ↓
Supabase Seeding Script
  ↓
API Endpoints (read-only)
  ↓
React Components (static pages)
```

**Data Model (per Node):**
```json
{
  "id": "node-getit-decision-video-first",
  "type": "decision",
  "title": "Prioritize Video-First Interaction",
  "description": "...",
  "gravity_score": 0.95,
  "tags": ["video", "ux", "marketplace", "core-decision"],
  "metadata_json": {
    "status": "active",
    "evidence": [
      {
        "source": "Revised Founder Inventory 1.1",
        "detail": "Make video the primary medium for service discovery, transactions, and user interaction.",
        "url": "https://north-star.internal/docs/deliverable-1.1"
      }
    ]
  }
}
```

**Why NOT DB-First:**
- Phase 1 has zero user-generated content
- All content is curated by Prentiss (admin-only seeding)
- No need for complex CRUD or versioning yet
- Static generation is faster and more testable

**Transition to DB-First (Phase 2+):**
- Add user feedback and metrics nodes
- Implement admin CRUD endpoints
- Add mutation operations (create node, link nodes)
- Migrate to proper content versioning

---

## ROUTE MAP

### Public Routes (No Auth)

| Route | Component | Data Source | Purpose |
|-------|-----------|-------------|---------|
| `/` | ProfileHub | `profiles/:slug` | Founder overview + project links |
| `/projects` | ProjectLedger | `projects` | Full catalog with gravity scores |
| `/projects/:projectId` | ProjectDetail | `projects/:id`, `nodes?project_id=:id` | Project context + scoped nodes |
| `/nodes/:nodeId` | NodeDetail | `nodes/:id`, `edges` filtered | Node detail + evidence + related nodes |
| `/404` | NotFound | N/A | Fallback |

### API Endpoints (Read-Only Phase 1)

| Endpoint | Method | Returns | Purpose |
|----------|--------|---------|---------|
| `/api/profiles/:slug` | GET | Profile + projects list | Founder context |
| `/api/projects` | GET | Array of projects with counts | Project catalog |
| `/api/projects/:id` | GET | Single project + scoped node count | Project detail |
| `/api/nodes/:id` | GET | Node + edges (in/out) + evidence | Node detail |

**Query Parameters (Phase 1):**
- `?project_id=:id` — Filter nodes by project scope
- `?type=decision,outcome` — Filter by node type (comma-separated)
- `?gravity_min=0.8` — Filter by gravity floor
- `?limit=50&offset=0` — Pagination for node lists

---

## COMPONENT LIST

### Layout & Navigation
- `Layout` — Persistent header + sidebar, route transitions
- `Breadcrumb` — Profile → Project → Node context

### Pages
- `ProfileHub` — Founder bio, focus areas, featured projects
- `ProjectLedger` — Sortable/filterable project catalog
- `ProjectDetail` — Project system design, nodes table, edge visualization (static)
- `NodeDetail` — Node content, evidence, related nodes (incoming/outgoing)

### Reusable Components
- `ProfileCard` — Founder name, title, headline
- `ProjectCard` — Gravity score, status, short description
- `NodeCard` — Type badge, title, gravity indicator, tags
- `EvidenceDisplay` — Source attribution, quoted detail, optional URL
- `EdgeList` — Table of related nodes (type, relationship, gravity)
- `TagBadge` — Inline tag rendering with hover state

### Utilities
- `GravityIndicator` — Visual representation of gravity_score (e.g., bars, percentage)
- `NodeTypeIcon` — Color-coded node type identifier
- `PageMeta` — SEO/title metadata per route

---

## ACCEPTANCE CRITERIA (Phase 1 Definition of Done)

### Content Completeness
- [ ] All 50 nodes from revised inventory seeded to Supabase
- [ ] All 45 edges seeded with correct source/target/relationship_type
- [ ] All evidence metadata populated (source, detail, URL where applicable)
- [ ] All gravity scores in valid range [0.0, 1.0]
- [ ] No orphan edges (every edge has valid endpoints)
- [ ] No duplicate edges (unique on source, target, relationship_type)

### API Completeness
- [ ] `GET /api/profiles/:slug` returns full profile + project list
- [ ] `GET /api/projects` returns array with counts
- [ ] `GET /api/nodes/:id` returns node + edges (in/out) + evidence
- [ ] Query parameters working: `?project_id`, `?type`, `?gravity_min`, pagination
- [ ] HTTP 404 on missing resource
- [ ] CORS configured for frontend origin

### UI/UX Completeness
- [ ] ProfileHub displays founder name, headline, focus areas, featured projects
- [ ] ProjectLedger shows all 4 projects with sortable gravity scores
- [ ] ProjectDetail shows project description + scoped node count + node table
- [ ] NodeDetail shows node content, evidence panel, related nodes (incoming/outgoing)
- [ ] Breadcrumb navigation works across all pages
- [ ] All links are functional (no 404s on valid routes)
- [ ] Page titles/meta tags reflect current route

### Performance & Accessibility
- [ ] Initial page load < 3.0s (without 3D rendering burden)
- [ ] Node list pagination works for projects with >20 nodes
- [ ] Keyboard navigation works (Tab, Enter, Arrow keys)
- [ ] Color contrast meets WCAG AA (Deliverable 4 specifies colors; verify in CSS)
- [ ] Semantic HTML (no divitis; proper heading hierarchy)
- [ ] Images/icons have alt text

### Data Integrity
- [ ] Gravity scores reflect intended importance (0.85–0.95 for decisions, etc.)
- [ ] Relationship types match taxonomy (demonstrates, produces, shapes, etc.)
- [ ] Cross-project edges (5 total) render correctly and link back
- [ ] Node tags are consistent (no spelling variants)
- [ ] Evidence sources are authoritative (point to Deliverables or internal docs)

---

## TEST PLAN

### Unit Tests (Components & Utilities)
```
src/__tests__/
├── components/
│   ├── EvidenceDisplay.test.tsx      → Renders source, detail, URL correctly
│   ├── EdgeList.test.tsx              → Filters incoming/outgoing edges
│   ├── NodeCard.test.tsx              → Displays type, title, gravity, tags
│   └── GravityIndicator.test.tsx      → Visual representation accurate
├── hooks/
│   ├── useProfile.test.ts             → Fetches and caches profile
│   ├── useProjects.test.ts            → Fetches project array
│   └── useNode.test.ts                → Fetches node + edges
└── lib/
    ├── api.test.ts                    → API client handles errors
    └── formatting.test.ts             → Gravity display, tag formatting
```

### Integration Tests (Routes + Data Flow)
```
src/__tests__/integration/
├── ProfileHub.test.tsx                → Loads founder profile + links to projects
├── ProjectLedger.test.tsx             → Lists all projects, filters by gravity
├── ProjectDetail.test.tsx             → Shows project + scoped nodes
├── NodeDetail.test.tsx                → Shows node + evidence + edges
└── navigation.test.tsx                → Breadcrumb, route transitions work
```

### E2E Tests (User Workflows)
```
cypress/e2e/
├── profile-discovery.cy.ts            → User lands on ProfileHub, sees founder context
├── project-browse.cy.ts               → User browses projects, clicks project
├── node-exploration.cy.ts             → User explores node, sees evidence, related nodes
└── search-and-filter.cy.ts            → User filters by project/type/gravity
```

### Data Validation Tests (Seeding & Schema)
```
backend/tests/
├── seeding.test.ts                    → All 50 nodes + 45 edges insert correctly
├── schema.test.ts                     → FK constraints enforced
├── orphans.test.ts                    → No orphan edges
└── uniqueness.test.ts                 → No duplicate edges
```

---

## ROLLBACK PLAN

### If Phase 1 Fails to Launch

**Trigger:** Critical bug, missing content, or data integrity issue

**Rollback Steps:**

1. **Revert Database (Fastest)**
   ```bash
   supabase db reset   # Drop all tables, re-apply migrations
   ```
   - Time: ~30 seconds
   - Data loss: All seeded content (acceptable; all in version control)
   - Scope: Clean state for retry

2. **Revert Frontend Code**
   ```bash
   git checkout main   # Drop uncommitted Phase 1 changes
   ```
   - Time: ~10 seconds
   - Restores last stable version

3. **Notify Stakeholders**
   - Document root cause in ROLLBACK.md
   - Schedule Phase 1 retry with updated plan

4. **Investigate Root Cause**
   - Review test coverage gaps
   - Add regression test before retry

### Partial Rollback Scenarios

| Scenario | Action |
|----------|--------|
| API works, UI broken | Revert frontend only; keep DB |
| Single route broken | Disable that route, redirect to 404 |
| Single node has bad data | Delete node, re-seed that project |
| Search/filter broken | Disable filter UI, fall back to full list |

---

## BLAST RADIUS (Who/What Is Affected)

### Internal (During Phase 1 Build)
- **Developers:** 1–2 engineers building API + frontend
- **Database:** Supabase test instance (not production)
- **Timeframe:** 2–3 weeks
- **No external impact**

### At Phase 1 Launch
- **Prentiss (Founder):** Views own profile + projects + graph structure
- **Stakeholders:** Demo access to ProfileHub + ProjectLedger
- **Public:** Not released; internal tool only
- **Fallback:** If broken, revert to previous version (likely README + static docs)

### Phase 2 Expansion (Beyond Phase 1 Scope)
- **Graph Rendering:** Introduction of 3D constellation will require new API queries for positions (x, y, z)
- **Real-Time Updates:** Query subscriptions needed for collaborative editing
- **Cross-Founder Support:** Multiple profiles will require auth + isolation changes
- **Phase 1 Must Support:** Profile scoping (already in schema; just not used in Phase 1)

---

## LOCKED IMPLEMENTATION DECISIONS

### Database & Schema (Immutable)
- ✅ Supabase Postgres (from Deliverable 2)
- ✅ 4 tables: profiles, projects, nodes, edges
- ✅ Node types: 8 (project|decision|constraint|failure|metric|skill|outcome|experiment)
- ✅ Relationship types: 13 (using 8 in Phase 1; 5 reserved)
- ✅ Positions (x, y, z): Persisted, admin-only recompute
- ✅ gravity_score: [0.0, 1.0], author-assigned

### Content (From Revised Inventory 1.1)
- ✅ 1 founder profile (Prentiss)
- ✅ 4 projects (GetIT, Fast Food, Anansi, North Star)
- ✅ 50 nodes (6 constraints, 15 decisions, 2 failures, 0 metrics, 13 skills, 7 outcomes, 7 experiments)
- ✅ 45 edges with verified source/target integrity
- ✅ Metric reclassification: `node-getit-metric-watchthrough` → outcome (removed from metrics count)

### Stack (From Deliverables)
- ✅ Frontend: React 18+, TypeScript
- ✅ Backend: Node.js + Express (or Supabase edge functions)
- ✅ API: REST + OpenAPI 3.0 spec (4 endpoints minimum)
- ✅ Rendering: Static HTML (no Three.js Phase 1)

### Performance Targets (Phase 1 Relaxed)
- ✅ Initial page load < 3.0s (vs. LCP <2.0s Phase 2)
- ✅ No FPS targets (no 3D rendering)
- ✅ Hover latency: Acceptable delays (no <50ms requirement)
- ⚠️ Click-to-panel: Deferred to Phase 2 (no expansion panel Phase 1)

---

## NEXT STEPS (Phase 1 Kick-Off)

### Week 1: Setup & Seeding
1. Initialize Supabase project + migrations
2. Seed revised inventory (50 nodes, 45 edges)
3. Validate data integrity (no orphans, duplicates, type validation)
4. Set up CI/CD pipeline for migrations

### Week 2: API & Backend
1. Build 4 REST endpoints (profiles, projects, nodes with edges)
2. Add query parameter support (filters, pagination)
3. Write integration tests for data flow
4. Document API with OpenAPI 3.0 spec

### Week 3: Frontend & UI
1. Build Layout + Breadcrumb
2. Build ProfileHub, ProjectLedger, ProjectDetail, NodeDetail pages
3. Build reusable components (Card, EvidenceDisplay, EdgeList)
4. Implement navigation + routing

### Week 4: Testing & Polish
1. Write E2E tests (Cypress)
2. Performance audit (Lighthouse)
3. Accessibility audit (WAVE, manual testing)
4. Bug fixes + polish

### Ready-State Criteria
- [ ] All code merged to `main`
- [ ] All tests passing (unit, integration, E2E)
- [ ] Lighthouse score >85 on ProfileHub
- [ ] Accessibility audit: zero WCAG AA violations
- [ ] API documentation complete
- [ ] Deployment scripted (one-command launch)

---

**Phase 1 Plan Complete. Ready for CTO Approval & Build Handoff.**
