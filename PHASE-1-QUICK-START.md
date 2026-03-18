# PHASE 1 QUICK START REFERENCE
## North Star MFP — Ship Comprehension Before Interactivity

**Generated:** 2025-03-07 | **Status:** Ready for Build

---

## THE GOAL
Ship a **static, read-only founder knowledge graph** that makes Prentiss's thinking visible.
- ✅ Who is the founder? (Profile Hub)
- ✅ What is he building? (Project Ledger)
- ✅ Why these decisions? (Node Detail + Evidence)
- ✅ What patterns connect them? (Static Edge Display)

**Zero interactive 3D rendering. Zero real-time updates. Pure comprehension.**

---

## WHAT TO BUILD (Phase 1 In-Scope)

### Pages (4)
1. **ProfileHub** — "Here's Prentiss. Here's what he's building."
2. **ProjectLedger** — "Four projects. Here's their status and scope."
3. **ProjectDetail** — "GetIT is about X. It has Y decisions. Z skills in play."
4. **NodeDetail** — "This decision exists because of these constraints. These skills demonstrate it."

### Components (Reusable)
- ProfileCard, ProjectCard, NodeCard
- EvidenceDisplay (citations + sources)
- EdgeList (related nodes, static table)
- Breadcrumb navigation
- GravityIndicator (visual importance rating)

### API (4 Endpoints)
```
GET /api/profiles/:slug              → founder context
GET /api/projects                    → all projects
GET /api/nodes/:id                   → node + edges + evidence
GET /api/projects/:id/nodes          → scoped node list
```

### Database (Existing Schema)
```
profiles (1 row)          Prentiss
projects (4 rows)         GetIT, Fast Food, Anansi, North Star
nodes (52 rows)           decisions, constraints, outcomes, skills, etc.
edges (59 rows)           demonstrates, produces, shapes, etc.
```

---

## WHAT NOT TO BUILD (Phase 1 Out-of-Scope)

❌ **3D Graph Rendering** — No Three.js, R3F, or force-directed layout
❌ **Interactive Canvas** — No zoom, pan, click-to-focus
❌ **Node Expansion Panel** — No side drawer revealing details
❌ **Ask-the-Graph** — No semantic query interface
❌ **Fit Check** — No relationship validation
❌ **Real-Time Updates** — No subscriptions or mutations
❌ **User Feedback Layer** — No comments, ratings, or validation

---

## KEY DECISIONS LOCKED

### Taxonomy: 8-Verb Core
The revised inventory uses 11 edge verbs. Phase 1 consolidates to 8:
1. **demonstrates** — Skill proves decision
2. **produces** — Decision creates outcome
3. **shapes** — Constraint influences decision
4. **requires** — Constraint demands skill
5. **shares_pattern** — Projects share approach
6. **enables** — Decision/skill unlocks capability
7. **leads_to** — Failure teaches learning
8. **contains** — Project contains decision/skill

**Unused verbs deferred:** improves, uses, causes, conflicts_with, depends_on, derived_from, derives

### Metrics Reclassification
`node-getit-metric-watchthrough` → **outcome** (not metric)
- Reason: No quantified measurement; only "capability enabled"
- Result: Graph shows 0 metrics (honest to Phase 0 state)
- Future: Add real metrics Phase 2+ after market validation

### Content Model: Static (MDX-First)
- All 52 nodes + 59 edges: pre-seeded to Supabase
- No content CRUD Phase 1 (read-only API)
- Evidence: stored in node `metadata_json.evidence[]` array
- Transition: DB-First mutations Phase 2+

---

## ROUTE MAP (Simple)

```
/                     → ProfileHub (founder context)
/projects             → ProjectLedger (all projects)
/projects/:id         → ProjectDetail (one project + nodes)
/nodes/:id            → NodeDetail (one node + evidence + edges)
```

No search, filters, or graph UI Phase 1. Just clean navigation.

---

## ACCEPTANCE CRITERIA (Define Done)

### Data ✅
- [ ] 52 nodes seeded
- [ ] 59 edges seeded (all valid source/target pairs)
- [ ] No orphan edges
- [ ] Evidence metadata populated (source, detail, URL)

### API ✅
- [ ] 4 endpoints working
- [ ] Query parameters working (filters, pagination)
- [ ] HTTP 404 on missing resources
- [ ] CORS configured

### UI ✅
- [ ] All 4 routes functional + linked
- [ ] No broken links
- [ ] Mobile-friendly (responsive)
- [ ] Keyboard navigation works
- [ ] WCAG AA contrast (per Deliverable 4 colors)

### Performance ✅
- [ ] Page load < 3.0s
- [ ] Lighthouse >85 on main route
- [ ] No console errors

---

## FILE STRUCTURE (Minimal)

```
/backend/
  supabase/migrations/         (5 .sql files)
  api/routes/                  (4 .ts files)

/frontend/
  src/pages/                   (4 .tsx files)
  src/components/              (10 .tsx files)
  src/hooks/                   (4 .ts files)
  src/lib/                     (3 .ts files)

/content/
  seeding/phase1-seed.sql      (insert all nodes/edges)
```

---

## TIMELINE (Estimate)

| Week | Task | Owner |
|------|------|-------|
| 1 | DB setup, seeding, validation | Backend |
| 2 | API build + tests | Backend |
| 3 | Frontend pages + components | Frontend |
| 4 | Testing, polish, launch | QA + Team |

---

## SUCCESS METRIC (Phase 1 Complete When)

> **Prentiss can land on ProfileHub, click through to any project, navigate to any node, see the evidence attribution, and understand the full context of that decision without needing to ask clarifying questions.**

---

## WHAT COMES NEXT (Phase 2 Preview)

🚀 **Constellation Canvas** — 3D force-directed graph (Three.js)
🚀 **Node Expansion Panel** — Side drawer with interactive detail
🚀 **Ask-the-Graph** — Semantic query interface
🚀 **Fit Check** — Validate relationship completeness
🚀 **Real-Time Metrics** — Live project status + KPIs

---

**Full Phase 1 Implementation Plan: `phase-1-implementation-plan.md`**
**Audit Details: `pre-phase-1-audit-summary.md`**

Ready to build. 🚀
