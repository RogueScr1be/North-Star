# PHASE 4.0 — ASK-THE-GRAPH MVP: DISCOVERY REPORT

**Status:** Discovery Complete
**Date:** 2026-03-10
**Phase Objective:** Build lightweight natural-language query interface grounded in graph data

---

## 1. ASSUMPTIONS

### A. Scope Assumptions
- **"Ask-the-Graph" means:** User types a question → system returns grounded answer + cited supporting nodes/projects
- **Grounding requirement:** Only use data in current loaded graph (no external lookups)
- **No backend changes:** Keep Phase 1 API contract locked (GET /api/graph is the sole data source)
- **Single-user context:** No session/auth complexity
- **No LLM required initially:** Deterministic graph retrieval first, optional summarization later

### B. Architecture Assumptions
- **Query parsing is deterministic:** Map questions to graph queries via pattern matching
- **Evidence assembly is deterministic:** Use graph traversal, filtering, and ranking
- **UI response is composable:** Answer text + list of cited items + click-to-navigate
- **State integration is seamless:** Selected items from Ask-the-Graph navigate to canvas/panel exactly like search

### C. UX Assumptions
- **Lightweight UI:** Input surface adjacent to search (not separate modal)
- **Fast response:** Sub-500ms latency (no backend calls for answer generation)
- **Graceful fallback:** When query cannot be answered, clearly say "insufficient data" vs "invalid query"
- **Evidence UX:** Clicking cited item selects it on canvas, updates panel, highlights edges

### D. Analytics Assumptions
- **Only Phase 3.7-approved metrics:** ask_graph_submitted, ask_graph_answered, ask_graph_no_answer, ask_graph_evidence_clicked
- **No raw query transmission:** Follow Phase 3.6-3.8 privacy constraints

---

## 2. DISCOVERY FINDINGS

### A. Current File Structure

**Frontend Organization:**
```
frontend/src/
├── components/
│   ├── constellation/        ← Canvas, scene, search UI, selection panel
│   └── [page-level components]
├── pages/
│   ├── ConstellationCanvas.tsx ← Main page shell (50 LOC)
│   └── [other pages]
├── hooks/
│   ├── useGraphData.ts       ← Fetches /api/graph (single source)
│   ├── useURLSelection.ts    ← State sync with URL
│   ├── useSelection.ts       ← Selection state (node|project|null)
│   ├── useNavigationMemory.ts ← Auto-saves to localStorage
│   └── [other hooks]
└── lib/
    ├── graph/
    │   ├── graphTypes.ts     ← Type contracts (GraphNode, GraphProject, GraphEdge, etc.)
    │   ├── graphTransforms.ts ← API → renderable (buildVertexMap, resolveEdges)
    │   ├── graphBounds.ts    ← Camera framing
    │   └── highlighting.ts   ← Adjacency + highlight state
    ├── search/
    │   ├── searchUtils.ts    ← searchGraphItems(), groupSearchResults(), ranking
    │   ├── queryParser.ts    ← NL → filter mappings (Phase 3.5)
    │   ├── navigationUtils.ts ← Pinned/recent items
    │   └── searchIntentHelper.ts ← deriveIntentPattern()
    ├── analytics/
    │   ├── searchAnalytics.ts  ← Event types + logger interface
    │   ├── postHogSearchAnalyticsLogger.ts ← Remote sink (Phase 3.8)
    │   ├── metricsDefinitions.ts ← Metrics classifications
    │   └── [other analytics files]
    ├── api.ts                ← fetch wrappers
    └── types.ts              ← Shared types (mirrors backend)
```

**Backend Organization:**
```
backend/api/
├── routes/
│   ├── graph.ts         ← GET /api/graph (main data source)
│   ├── profiles.ts      ← GET /api/profiles/{slug}
│   ├── projects.ts      ← GET /api/projects, GET /api/projects/{id}/nodes
│   └── nodes.ts         ← GET /api/nodes/{id}
├── types.ts             ← Shared type defs
└── config.ts            ← Supabase client
```

### B. Current Graph Schema & Types

**GraphNode (from API):**
```typescript
{
  id: string;                    // "node-getit-decision-pricing"
  type: NodeType;                // 8 types: project|decision|constraint|failure|metric|skill|outcome|experiment
  title: string;                 // "Pricing Decision"
  description?: string;          // Optional narrative
  gravity_score: number;         // [0.0, 1.0], author-assigned importance
  tags: string[];                // ["monetization", "model"]
  is_featured: boolean;
  x, y, z: number;               // Persisted coordinates
  project_id?: string;           // Parent project if node belongs to one
}
```

**GraphProject (from API):**
```typescript
{
  id: string;                    // "project-getit"
  title: string;                 // "GetIT"
  description: string;           // Short description
  gravity_score: number;         // Aggregate importance
  is_featured: boolean;
  x_derived, y_derived, z_derived: number; // Computed from child nodes
}
```

**GraphEdge (from API):**
```typescript
{
  id: string;
  source_id: string;             // Node or project ID
  target_id: string;             // Node or project ID
  relationship_type: RelationshipType; // 14 types: demonstrates, produces, shapes, requires, shares_pattern, enables, leads_to, contains, improves, uses, causes, conflicts_with, depends_on, derived_from
}
```

### C. Current Data Access Patterns

**Main Source: GET /api/graph**
- Returns all nodes, projects, edges in single call
- Fetched once via `useGraphData()` hook
- Cached in local state
- Validates edge referential integrity on load
- No pagination, no filtering at API level
- Current state: ~50 nodes, 4 projects, 45 edges (live API)

**Search Patterns (Phase 3.5-3.7):**
```typescript
// searchGraphItems(query, nodes, projects, { filterType?, filterEntity? })
// Matches: title (exact/prefix/loose), id, tags
// Ranks by: field priority > match quality > length
// Returns: SearchResult[] (max 20 by default)
```

**Graph Traversal:**
- `graphTransforms.ts` builds VertexMap (id → [x, y, z])
- `resolveAllEdges()` validates edges against VertexMap
- `highlighting.ts` computes adjacency for a given node ID:
  ```typescript
  // buildAdjacencyMap(edges) → Map<id, Set<id>>
  // Direct connections only (1-hop neighbors)
  ```

### D. Current Navigation & Selection Flow

**Selection State:**
```typescript
type SelectedItem =
  | { type: 'node'; data: GraphNode }
  | { type: 'project'; data: GraphProject }
  | null
```

**State Sync Paths:**
1. **URL-based:** `useURLSelection` syncs selectedItem ↔ ?selected=node-{id} | ?selected=project-{id}
2. **Canvas click:** `onNodeClick` → `selectNode(node.id)` → state update → URL change
3. **Search result click:** `selectResult()` → `onNodeSelect(node)` → same selectNode
4. **Recent/pinned click:** `selectNavigationItem()` → same selectNode/selectProject
5. **Back/forward:** URL change → useURLSelection detects and restores

**Navigation Memory:**
- `useNavigationMemory` auto-saves selectedItem to localStorage (pinned, recent)
- 10 max each, deduped by entity ID
- Accessible via search dropdown when query is empty

### E. Current Analytics Infrastructure

**Event Firing Locations:**
- `SearchUI.tsx` fires: search_executed, search_result_selected, search_abandoned
- Uses `logSearchEvent()` from `searchAnalytics.ts`
- Pluggable logger interface allows console or PostHog sink

**Approved Metrics (Phase 3.9 PASS):**
- ✅ Canonical: total_searches, empty_result_rate
- 📊 Directional: parsed_vs_unparsed, search_result_ctr, avg_result_position
- ⚠️ Heuristic: abandonment_rate (20-30% false positive rate)

**Privacy Requirements:**
- rawQuery: Local only, never transmitted
- sanitizedQuery: 100-char truncated, safe to log
- queryHash: Deterministic, enables deduplication

### F. Existing Query Parsing (Phase 3.5)

**Current NL Patterns Supported:**
1. "find {type} nodes about {thing}" → filterType={type}, search={thing}
2. "{thing} {type}" → filterType={type}, search={thing}
3. "{thing} projects" → filterEntity=project, search={thing}
4. "{type} nodes" → filterType={type}, search="" (all of type)
5. "{thing}" → basic search, no filters

**Type Aliases:**
- decision, problem→constraint, issue→failure, metric, lesson→outcome, skill, capability, test→experiment

**Current Limitations:**
- No relationship/connectivity queries ("what connects X to Y?")
- No fuzzy matching ("dekision" → "decision")
- No boolean operators
- No graph traversal patterns

### G. Current Selection Panel & Navigation

**SelectionPanel shows:**
- Node type, description, gravity_score, tags, project_id, id (for nodes)
- Description, gravity_score, id (for projects)
- Pin button (toggles ★/☆)
- Close button

**Can click from panel to:**
- Other items via search (indirect)
- No direct citation links yet (Ask-the-Graph will add this)

**No current evidence display:**
- Panel doesn't show "why this item is relevant"
- No cited supporting nodes/edges
- Ask-the-Graph will add this capability

---

## 3. ARCHITECTURE PROPOSAL

### A. High-Level Design

**Three-Phase Retrieval Pipeline:**

```
User Input (Natural Language)
    ↓
[1] Query Intent Detection (pattern matching)
    ↓ (deterministic)
    ↓ Parsed Intent: { questionType, entity, relationType?, filters? }
    ↓
[2] Graph Retrieval (deterministic node/edge selection)
    ↓ (uses existing graph data)
    ↓ Evidence Set: { nodes, projects, edges }
    ↓
[3] Answer Composition (template + ranking)
    ↓ (no LLM required)
    ↓ Response: { answerText, citations, explanationText, confidence }
    ↓
UI Render + Navigation Integration
    ↓
User clicks cited item → selectNode/selectProject → state flows to canvas/panel
```

### B. Query Intent Types

Define deterministic question patterns:

```typescript
type QuestionType =
  | 'definition'              // "What is GetIT?"
  | 'relationship'            // "How are X and Y connected?"
  | 'causality'               // "What caused this?"
  | 'influence'               // "What influenced this?"
  | 'scope'                   // "What nodes are in project X?"
  | 'pattern'                 // "What patterns appear across projects?"
  | 'constraint'              // "What constraints apply?"
  | 'decision_rationale'      // "Why was this decision made?"
  | 'failure_analysis'        // "What failures occurred?"
  | 'tag_search'              // "Show nodes about X"
  | 'unknown'                 // Cannot parse
```

### C. Graph Retrieval Strategies

**For each question type, define a deterministic retrieval:**

1. **"What is {entity}?"** (definition)
   - Find node/project by title/id match
   - Return: node description + top 2-3 tags
   - Evidence: the entity itself

2. **"How are {A} and {B} connected?"** (relationship)
   - Find shortest path between A and B (BFS, max 3 hops)
   - Return: "A {edge1} C {edge2} B" (path description)
   - Evidence: all nodes in path + all edges

3. **"What {type} nodes are in {project}?"** (scope)
   - Filter nodes where project_id = project.id (if filterType) or all nodes
   - Rank by gravity_score (desc)
   - Return: list of nodes with brief descriptions
   - Evidence: filtered nodes

4. **"What patterns appear?"** (pattern)
   - Find most common relationship_types across all edges
   - Find nodes with same tags (intra-project and cross-project)
   - Return: "This graph shows {X}% of edges are {type}, shared patterns: {tags}"
   - Evidence: nodes sharing patterns, edges of common type

5. **"What shaped {entity}?"** (influence/causality)
   - Find all incoming edges to entity (source → entity)
   - Return: "This was shaped by: {sources}"
   - Evidence: source nodes + edges

6. **"What did {entity} produce/lead to?"** (downstream)
   - Find all outgoing edges from entity (entity → target)
   - Return: "This produced/led to: {targets}"
   - Evidence: target nodes + edges

**Pattern: Evidence Structure**
```typescript
interface AnswerEvidence {
  nodeIds: Set<string>;        // All cited nodes
  projectIds: Set<string>;     // All cited projects
  edgeIds: Set<string>;        // All edges in explanation
  explanation: string;          // Human-readable traversal path
  confidence: 'high' | 'medium' | 'low'; // How certain is answer
}
```

### D. UI Architecture

**New Component: `AskTheGraphPanel`**
- Input: question text box (similar to search)
- Dropzone: above or below search UI
- Output when answered:
  - Answer text (generated from template)
  - Confidence badge (high/medium/low)
  - Cited items section (clickable nodes/projects)
  - "Learn more" link (expands to show full path/evidence)
- Empty state: "Ask about nodes, projects, patterns, or connections"
- Loading state: spinner, "Analyzing graph..."
- No answer state: "The graph doesn't contain enough information about {entity}"

**Integration with Existing UI:**
- Clicking cited item calls `selectNode(id)` or `selectProject(id)`
- Same flow as search results → selection panel + canvas highlighting
- Can close answer panel without affecting selection

**Analytics Events (Phase 3.9-approved):**
- ask_graph_submitted: { rawQuery (local only), sanitizedQuery, entity, questionType, timestamp }
- ask_graph_answered: { answerLength, citedNodeCount, citedProjectCount, answerConfidence }
- ask_graph_no_answer: { rawQuery (local only), entity, attemptedQuestionType, reason }
- ask_graph_evidence_clicked: { itemId, itemType, citationIndex, timestamp }

### E. New Utilities to Create

**File: `frontend/src/lib/graph/graphQueries.ts` (~300 LOC)**
- `detectQuestionType(query: string): { type: QuestionType, entity: string, relationType?: string }`
- `findNodesByTitle(nodes, query): GraphNode[]` (case-insensitive, substring)
- `findProjectsByTitle(projects, query): GraphProject[]`
- `findShortestPath(nodes, edges, sourceId, targetId, maxHops): { path, edges }`
- `getConnectedNodes(nodes, edges, nodeId, direction): { inbound, outbound }`
- `findCommonPatterns(nodes, projects): { commonRelationships, sharedTags }`
- All pure functions, fully testable

**File: `frontend/src/lib/graph/answerComposer.ts` (~250 LOC)**
- `composeAnswer(evidenceSet, questionType): { text, confidence, explanation }`
- Templates for each question type
- Rank evidence by gravity_score for presentation
- Never claim information not in evidence set
- Fallback: "insufficient data" message when evidence is weak

**File: `frontend/src/hooks/useAskTheGraph.ts` (~100 LOC)**
- Custom hook wrapping query → evidence → answer pipeline
- State: { query, loading, answer, evidence, error }
- Memoization: Don't re-compute if query/graph unchanged
- Debounce input (300ms) to avoid excessive computation

**File: `frontend/src/components/constellation/AskTheGraphPanel.tsx` (~200 LOC)**
- Input component
- Answer display component with cited items
- Click handlers → call onNodeSelect/onProjectSelect
- Loading/empty/error states

**File: `frontend/src/components/constellation/CitedItemsList.tsx` (~100 LOC)**
- Render list of cited nodes/projects
- Show type badge, title, brief description
- Clickable, visual hover state
- Distinguish nodes vs projects with colors

### F. No API Changes Required

- All data comes from existing GET /api/graph
- No new endpoints needed
- Query parsing and answer generation are 100% client-side
- Fully reversible if Ask-the-Graph doesn't resonate

---

## 4. MINIMAL VIABLE PHASE BREAKDOWN

### Phase 4.0 (MVP) — Deterministic Query + Answer Composition
**Deliverable:** User can ask simple questions, get grounded answers with citations
- Query parsing: 5 question types (definition, relationship, scope, patterns, influence)
- Evidence retrieval: Pure graph functions (no LLM)
- Answer composition: Template-based
- UI: Input + answer panel + cited items
- Analytics: 4 events approved in Phase 3.9
- Expected implementation: ~1200 LOC, 6 new files

**Success Criteria:**
- Query "What is North Star?" returns project description + tags
- Query "How are GetIT and Fast Food connected?" returns path (if exists) + nodes
- Query "What decisions shaped GetIT?" returns decision nodes with edges
- Clicking cited item navigates to canvas/panel like search
- No regressions to Phases 2.3–3.9
- Analytics events fire correctly (verified via console)

### Phase 4.1 (Polish) — Fuzzy Matching & Better Patterns
**Deferred to later if needed**
- Fuzzy query parsing (typo tolerance)
- Multi-hop relationship discovery
- Advanced pattern detection (temporal sequences)
- LLM-based summarization (optional, if latency < 2s)

### Phase 4.2 (Advanced) — Saved Queries & Analytics Dashboard
**Deferred if not requested**
- Save favorite questions
- Query suggestions based on recent graph updates
- Analytics: track most-asked questions, low-answer-rate patterns

---

## 5. EXACT FILES TO MODIFY/CREATE

### Create (4 files, ~700 LOC utilities + ~400 LOC UI)

| File | Purpose | LOC | Why New |
|------|---------|-----|---------|
| `frontend/src/lib/graph/graphQueries.ts` | Query pattern matching + graph traversal | 300 | Pure graph algorithms, fully testable |
| `frontend/src/lib/graph/answerComposer.ts` | Template-based answer generation | 250 | Template composition logic |
| `frontend/src/hooks/useAskTheGraph.ts` | Hook wrapping full pipeline | 100 | State management for Q&A flow |
| `frontend/src/components/constellation/AskTheGraphPanel.tsx` | Input + answer UI | 200 | New user surface |

### Modify (3 files, ~80 LOC changes)

| File | Change | Lines | Why |
|------|--------|-------|-----|
| `ConstellationCanvas.tsx` | Import + render `AskTheGraphPanel`, pass selectNode/selectProject callbacks | ~15 | Integrate new surface into main page |
| `SearchUI.tsx` or `constellation/` CSS | Optional: Add AskTheGraph tab or toggle to search surface | ~30 | UX: where to place input (alongside search or separate) |
| `frontend/src/lib/analytics/searchAnalytics.ts` | Add 4 new event types (ask_graph_submitted, etc.) | ~35 | Analytics instrumentation |

### No Changes Required
- Backend (no new endpoints)
- Data model (uses existing GraphNode/GraphProject/GraphEdge)
- Navigation flow (reuses selectNode/selectProject)
- URL persistence (reuses useURLSelection)

---

## 6. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Query intent detection too simplistic** | User asks valid question, parser marks as "unknown" | Phase 4.1: expand patterns; fallback to tag-based search for low-confidence queries |
| **Graph too small for sophisticated queries** | Current ~50 nodes may not have rich enough paths for "how connected" queries | Phase 4.1: provide helpful "insufficient data" message; suggest related entities |
| **Ambiguous entity references** | User says "What is North Star?" - matches both project title and node title | Prioritize projects first, then nodes; show disambiguation if multiple matches |
| **LLM temptation creep** | Later phases pressure to add LLM summarization | Keep Phase 4.0 deterministic; defer LLM to Phase 4.2+; measure quality of template answers first |
| **Evidence set explosion** | Some queries might traverse many edges, creating large evidence set | Cap traversal depth (max 3 hops), cap results (max 10 cited items) |
| **Performance regression** | Heavy graph algorithms on canvas page slow down interaction | Memoize query results by query string; lazy-compute on-demand (not on every keystroke) |
| **Analytics query sensitivity** | Users might ask questions revealing internal strategy | Follow Phase 3.6-3.8 sanitization rules; rawQuery stays local; sanitizedQuery capped at 100 chars |

---

## 7. ROLLBACK PLAN

If Phase 4.0 doesn't work out:

1. **Delete 4 new files** (`graphQueries.ts`, `answerComposer.ts`, `useAskTheGraph.ts`, `AskTheGraphPanel.tsx`)
2. **Revert 3 modified files** (ConstellationCanvas.tsx, SearchUI.tsx if modified, searchAnalytics.ts)
3. **Rebuild**: `npm run build`
4. **Time to rollback:** <5 minutes
5. **Data loss:** Zero (no schema/API changes)
6. **Regression risk to Phases 2.3–3.9:** Zero (all changes are additive/removable)

---

## 8. BLAST RADIUS: MINIMAL ✅

- **Scope:** New UI surface only (AskTheGraphPanel component)
- **Dependencies:** None new (uses existing graphTypes, search utils, analytics)
- **API changes:** Zero
- **Schema changes:** Zero
- **State changes:** Only new `useAskTheGraph` state (isolated)
- **Reversibility:** <5 minutes
- **Impact on existing features:** Zero (parallel surface, no shared state modifications)
- **Build impact:** Minimal (~50 KB JS, same as Phase 2.8 + Phase 3.5 combined)
- **Performance impact:** Lazy computation (only when user asks), memoized (no repeated work)

---

## NEXT STEPS: READY FOR PHASE 4.0 IMPLEMENTATION

✅ Architecture approved
✅ File structure clear
✅ Risk surface understood
✅ Rollback path defined
✅ No blockers identified

**Ready to proceed with Phase 4.0 implementation prompt.**

