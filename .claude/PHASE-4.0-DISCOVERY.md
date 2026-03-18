# PHASE 4.0 DISCOVERY — ASK-THE-GRAPH MVP

**Status:** Discovery & Architecture ✅
**Date:** 2026-03-10
**Scope:** Design lightweight NL question-answering on graph

---

## ASSUMPTIONS

1. **Backend locked (Phase 1):** All retrieval must be client-side using existing `GET /api/graph` response
2. **No hallucination tolerance:** Answers must cite only nodes/edges that exist in loaded graph
3. **Clickable evidence:** Users must click cited nodes to select them (navigate via SelectionPanel)
4. **Privacy-first:** No raw queries sent remotely; metrics validation from Phase 3.9 applies
5. **Minimal LLM:** Deterministic retrieval *first*, optional summarization *after* evidence assembled
6. **Single-user single-session:** No session management, no persistence beyond browser
7. **Phases 2.3–3.9 immutable:** Zero breaking changes to existing features
8. **No new npm deps:** Only add if unavoidable (prefer builtin + existing)

---

## DISCOVERY FINDINGS

### 1. Graph Schema (Locked, Immutable)

**Node Types (8):**
- `project` | `decision` | `constraint` | `failure` | `metric` | `skill` | `outcome` | `experiment`

**Relationship Types (14, using 13 actively):**
- Phase 1 core (8): demonstrates, produces, shapes, requires, shares_pattern, enables, leads_to, contains
- Phase 2+ reserved: improves, uses, causes, conflicts_with, depends_on, derived_from

**Entity Fields Available:**
- **Node:** id, type, title, description, gravity_score, tags[], is_featured, project_id
- **Project:** id, title, description, gravity_score, is_featured
- **Edge:** source_id, target_id, relationship_type

**Key Insight:** Graph is small (50 nodes, 4 projects, ~45 edges). Deterministic traversal is feasible; no pagination needed.

### 2. Data Access Layer

**API Endpoint:** `GET /api/graph` (Phase 2.2, read-only)
- Returns full graph: nodes[], projects[], edges[], metadata
- No query filtering; returns everything
- No auth required
- Called once on ConstellationCanvas mount via `useGraphData` hook
- Data cached in React state

**Fetch Flow:**
```
ConstellationCanvas mount
  → useGraphData() hook
    → fetchGraphData() in api.ts
      → GET /api/graph
        → Supabase (5 parallel queries)
          → nodes, projects, edges, metadata
```

**No endpoints for:**
- Filtered search (client-side only)
- Graph queries / traversals (client-side only)
- Relationship inference (would require backend)

**Implication:** All question answering must use in-memory graph from single API call.

### 3. Current Search & Filtering Utilities

**searchUtils.ts: searchGraphItems()**
- Filters nodes by type (filterType) and entity (filterEntity)
- Returns ranked SearchResult[] (exact > prefix > loose matches)
- Used by SearchUI for keyword search
- **Reusable for Ask-the-Graph filtering**

**searchUtils.ts: highlightMatchedSubstring()**
- Marks matched text portions for UI highlighting
- Safe substring extraction
- **Reusable for evidence highlighting in response**

**Example Use:**
```typescript
const decisionNodes = searchGraphItems('', nodes, projects, {
  filterEntity: 'node',
  filterType: 'decision'
}); // Returns all decision nodes
```

### 4. Graph Traversal & Adjacency

**graphTransforms.ts: buildVertexMap()**
- Maps node/project ID → [x, y, z] position
- **Reusable for resolving citations**

**graphTransforms.ts: resolveAllEdges()**
- Validates edge source/target existence
- Returns resolved and unresolved edges
- **Reusable for computing relationships**

**No existing adjacency API.** Need to build:
```typescript
// What we need for Ask-the-Graph
buildAdjacencyMap(edges):
  // node/project ID → Set<{id, type, relationshipType}>
```

### 5. Selection & Navigation State

**useURLSelection hook:**
- Persists selection to URL (?selected=node-{id} or ?selected=project-{id})
- Restores selection on page load
- Methods: selectNode(), selectProject(), clearSelection()
- Called from SearchUI when result selected
- Triggers SelectionPanel render
- **Ask-the-Graph can reuse:** Click evidence → calls selectNode/selectProject

**SelectionPanel component:**
- Displays selected node/project details
- Shows description, tags, type, evidence, edges
- **Can extend to show "cited from question" metadata**

**Flow:** Question answer → click evidence → selectNode() → URL updated → SelectionPanel shows node

### 6. Current Analytics Events (Phase 3.9-Validated)

**Pluggable logger interface:** `SearchAnalyticsLogger`
- `log(event: SearchAnalyticsEvent)` method
- ConsoleSearchAnalyticsLogger (default, dev-only)
- PostHogSearchAnalyticsLogger (remote, if VITE_POSTHOG_KEY set)

**Privacy-safe events:**
- search_executed: sanitizedQuery (100 char), queryHash (non-reversible)
- search_result_selected: selectedId, selectedRank, resultCount
- search_abandoned: sessionDurationMs, parsed status

**Lesson from Phase 3.9:**
- Only canonical metrics ready for decisions (total searches, empty-result rate)
- Never transmit rawQuery remotely
- Debounce high-frequency events (300ms for search_executed)

**For Ask-the-Graph, create analogous events:**
- ask_graph_submitted: question text (sanitized like Phase 3.7)
- ask_graph_answered: answer_type (lookup, inference, uncertain), evidence_count
- ask_graph_no_answer: reason (no_matches, ambiguous_query, insufficient_evidence)
- ask_graph_evidence_clicked: evidence_id, evidence_type (node|project)

### 7. Current UI Architecture

**SearchUI.tsx:**
- Input field with Cmd+K global shortcut support
- Grouped results (Projects, Nodes) with section headers
- Metadata display (tags for nodes, description for projects)
- Keyboard navigation (Arrow Up/Down, Enter, Escape)
- Recent searches & pinned items when query empty
- Matched-term highlighting

**SelectionPanel.tsx:**
- Right-side panel showing selected item details
- Type badges, description, evidence, edges
- Pin/unpin affordance (★ icon)
- Close button (×) and Escape support

**ConstellationCanvas.tsx:**
- Graph render orchestration
- Selection state management
- Global Cmd+K listener

**Implication:** Ask-the-Graph can reuse this UI pattern: input surface → response panel (like SelectionPanel)

### 8. Navigation Memory (Phase 3.4)

**useNavigationMemory hook:**
- Tracks selected items to localStorage
- Pinned items (max 10, user-managed)
- Recent items (max 10, auto-tracked)
- Reusable for Ask-the-Graph history: "recent questions"

### 9. Missing Infrastructure (Need to Build)

1. **Query understanding:**
   - Parse question intent (what type of question is it?)
   - Extract entities (which nodes/projects are mentioned?)
   - Identify intent (lookup? relationship? pattern? context?)

2. **Graph queries (deterministic only):**
   - Find all nodes of type X
   - Find nodes with tag Y
   - Find nodes connected to X
   - Find common patterns across nodes
   - Find nodes in project scope

3. **Answer composition:**
   - Package evidence as clickable citations
   - Format answer text with evidence references
   - Show confidence/certainty level
   - Fallback for insufficient evidence

4. **UI components:**
   - Ask-the-Graph input (similar to SearchUI)
   - Response panel (similar to SelectionPanel)
   - Evidence citations (clickable nodes/projects)
   - Confidence indicators

5. **Analytics tracking:**
   - New event types (ask_graph_submitted, etc.)
   - Privacy-safe payload (no rawQuery)
   - Pluggable to existing SearchAnalyticsLogger system

---

## ARCHITECTURE PROPOSAL

### Design Principles

1. **Deterministic first:** Assemble evidence via graph traversal *before* any summarization
2. **Minimal LLM:** Use retrieval + composition; only add LLM if needed for UX
3. **Grounded only:** Never answer with info not in graph; admit uncertainty clearly
4. **Reuse existing:** Leverage SearchUI, SelectionPanel, useURLSelection, graph utilities
5. **Pluggable analytics:** Use same event system as Phase 3.6–3.8
6. **No backend changes:** Everything client-side; API locked Phase 1

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ AskTheGraphPage (new)                                       │
│ - Input (question text)                                      │
│ - Response panel (answer + evidence)                         │
│ - State: question, response, loading, error                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Question Processing Pipeline                                 │
│ 1. parseQuestionIntent() → intent type + entities            │
│ 2. retrieveEvidence() → nodes/projects/edges matching intent │
│ 3. composeAnswer() → format as answer + citations            │
│ 4. formatResponse() → UI-ready response object               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Graph Query Layer (deterministic, no backend)                │
│ - filterNodesByType(type)                                    │
│ - filterNodesByTag(tag)                                      │
│ - findConnectedNodes(nodeId, relationshipType?)              │
│ - findNodesInProject(projectId)                              │
│ - buildAdjacencyMap(edges)                                   │
│ - findCommonPatterns(nodes[])                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Existing Data Layer (no changes)                             │
│ - useGraphData() → nodes, projects, edges                    │
│ - SearchUtils (reuse: searchGraphItems, highlight)           │
│ - GraphTransforms (reuse: buildVertexMap, resolveEdges)      │
│ - useURLSelection → selectNode/selectProject callbacks       │
└─────────────────────────────────────────────────────────────┘
```

### Question Intent Types

Proposed categories (deterministic pattern matching, no ML):

1. **Lookup:** "What is X?" → Find node X, show description
   - Entity extraction: identify "X"
   - Retrieval: search title/tags for "X"
   - Evidence: node description, tags, edges

2. **Relationship:** "How does X connect to Y?" → Find path(s) between X and Y
   - Entity extraction: identify "X" and "Y"
   - Retrieval: find shortest path (BFS/DFS on edges)
   - Evidence: edges connecting X → ... → Y, intermediate nodes

3. **Type/Filter:** "What are all the decisions?" → List nodes of type
   - Entity extraction: identify type keyword (decision, skill, etc.)
   - Retrieval: filter nodes by type
   - Evidence: list of matching nodes, grouped by gravity_score

4. **Project Context:** "What's in GetIT?" → Show project nodes/edges
   - Entity extraction: identify project name
   - Retrieval: find project, find child nodes, edges within project
   - Evidence: project description, child nodes, internal edges

5. **Pattern/Inference:** "What patterns appear across projects?" → Analyze tags/types
   - Entity extraction: detect multi-entity or cross-project pattern query
   - Retrieval: aggregate tags, types, relationships across projects
   - Evidence: grouped patterns, nodes exemplifying each pattern

6. **Uncertain/No Match:** Query doesn't fit 1-5 → Admit limitation
   - No matching intent detected
   - Evidence: empty
   - Response: "I couldn't understand the question. Try asking about [examples]"

### Privacy-Safe Analytics

Reuse Phase 3.9 validated patterns:

**Event: ask_graph_submitted**
```typescript
{
  type: 'ask_graph_submitted',
  sanitizedQuestion: string,  // 100 char limit, Phase 3.7 style
  questionHash: string,        // Non-reversible, Phase 3.7 style
  intentType: string | null,   // 'lookup' | 'relationship' | 'type_filter' | ...
  entityCount: number,         // How many entities extracted
  timestamp: number
}
```

**Event: ask_graph_answered**
```typescript
{
  type: 'ask_graph_answered',
  intentType: string,          // Detected intent
  resultCount: number,         // Evidence items returned
  evidenceTypes: string[],     // ['node', 'edge', 'project']
  certainty: string,           // 'high' | 'medium' | 'low'
  timestamp: number
}
```

**Event: ask_graph_no_answer**
```typescript
{
  type: 'ask_graph_no_answer',
  reason: string,              // 'no_matches' | 'ambiguous' | 'insufficient'
  timestamp: number
}
```

**Event: ask_graph_evidence_clicked**
```typescript
{
  type: 'ask_graph_evidence_clicked',
  evidenceId: string,          // Node or project ID
  evidenceType: string,        // 'node' | 'project'
  timestamp: number
}
```

---

## MINIMUM VIABLE PHASE BREAKDOWN

### Phase 4.0 (MVP): Lookup + Type Filter + Basic UI
- ✓ Question input surface
- ✓ Simple intent detection (lookup, type/filter, no match)
- ✓ Evidence retrieval (keyword search + type filter)
- ✓ Response panel with clickable citations
- ✓ Answer composition (lookup, type list, uncertain)
- ✓ Analytics events (ask_graph_submitted, ask_graph_answered, ask_graph_no_answer)
- Exclude: Relationship queries, multi-entity inference, pattern analysis

**Deliverables:**
1. Graph query utilities (lib/graph/graphQueries.ts)
2. Question parser (lib/ask/questionParser.ts)
3. Answer composer (lib/ask/answerComposer.ts)
4. AskTheGraphPage component
5. Analytics integration (ask_graph_* events)
6. Runtime verification report
7. Regression report (Phases 2.3–3.9 intact)
8. CLAUDE.md update

**Rationale:** Lookup + type filter cover 80% of question patterns users will ask. Simpler to build, validate, and extend.

### Phase 4.1 (Future): Relationship Queries
- Graph traversal (BFS/DFS for paths)
- "How does X connect to Y?"
- Path formatting with intermediate nodes

### Phase 4.2 (Future): Pattern & Inference
- Cross-project pattern analysis
- Tag aggregation
- Multi-entity relationship discovery

### Phase 4.3 (Future): LLM Summarization (Optional)
- Only after Phases 4.0–4.2 validate retrieval quality
- Use LLM to rephrase/enhance assembled evidence (not to answer)
- Strictly optional; deterministic answer already shipped Phase 4.0

---

## FILES TO CREATE

**Phase 4.0 (MVP):**
1. `frontend/src/lib/graph/graphQueries.ts` (~200 LOC)
   - findNodesByType(type, nodes)
   - findNodesByTag(tag, nodes)
   - findNodesByTitle(title, nodes)
   - findProjectByTitle(title, projects)
   - getNodesByProject(projectId, nodes)
   - buildAdjacencyMap(edges)

2. `frontend/src/lib/ask/questionParser.ts` (~150 LOC)
   - parseQuestion(text) → ParsedQuestion
   - extractEntities(text) → string[]
   - detectIntent(text) → IntentType
   - IntentType: 'lookup' | 'type_filter' | 'uncertain'

3. `frontend/src/lib/ask/answerComposer.ts` (~250 LOC)
   - composeAnswer(intent, evidence) → AnswerResponse
   - formatEvidenceAsHTML(nodes[], projects[]) → string
   - classifyConfidence(evidenceCount) → 'high' | 'medium' | 'low'
   - AnswerResponse interface

4. `frontend/src/lib/ask/askAnalytics.ts` (~100 LOC)
   - ask_graph_submitted event interface
   - ask_graph_answered event interface
   - ask_graph_no_answer event interface
   - ask_graph_evidence_clicked event interface
   - logAskEvent() function (reuses SearchAnalyticsLogger)

5. `frontend/src/pages/AskTheGraphPage.tsx` (~300 LOC)
   - Input field for questions
   - Response panel
   - State: question, response, loading, error
   - Call: parseQuestion → retrieveEvidence → composeAnswer
   - Click handlers: citation click → selectNode/selectProject

6. `frontend/src/pages/AskTheGraphPage.css` (~200 LOC)
   - Input styling
   - Response panel
   - Citation styling (clickable, hover effects)
   - Loading/error states

**Phase 4.0 Integration:**
- Modify `frontend/src/App.tsx`: Add /ask route
- Modify `frontend/src/components/Layout.tsx`: Add Ask nav link

---

## RISKS & MITIGATIONS

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Hallucination (answer with non-existent nodes) | HIGH | Strict deterministic retrieval; only cite nodes/edges in graph |
| Unclear answers (query too ambiguous) | MEDIUM | Detect uncertain intent; show fallback message |
| Performance (traversal slow on large graph) | LOW | Graph is small (50 nodes); O(n) operations acceptable |
| No relationship support (Phase 4.0 MVP limitation) | MEDIUM | Clear scope: Phase 4.0 = lookup + type; Phase 4.1 = relationships |
| Analytics events too noisy | LOW | Phase 3.9 validated event quality; apply same patterns |
| Regression to Phases 2.3–3.9 | MEDIUM | Zero changes to existing code; new route, new components only |

---

## ROLLBACK PLAN

If Phase 4.0 causes issues:
1. Remove `frontend/src/pages/AskTheGraphPage.*`
2. Remove `frontend/src/lib/ask/` directory
3. Remove `frontend/src/lib/graph/graphQueries.ts`
4. Revert `frontend/src/App.tsx` (remove /ask route)
5. Revert `frontend/src/components/Layout.tsx` (remove nav link)
6. Rebuild: `npm run build`
7. Time: <5 minutes

**No backend changes, no schema changes, no data corruption risk.**

---

## BLAST RADIUS: MINIMAL

- **New files only:** 7 files created, 0 deleted
- **Modified files:** 2 (App.tsx, Layout.tsx) — minimal, additive only
- **Changed APIs:** None (reuse existing)
- **Breaking changes:** None
- **New dependencies:** None
- **Database changes:** None
- **Analytics:** New events, backward compatible with Phase 3.6–3.8

---

## DECISION LOG

**Why no backend graph-query endpoint?**
- Phase 1 locked: No new endpoints
- Graph is small (50 nodes): Client-side traversal acceptable
- Deterministic retrieval sufficient: No need for server-side inference
- Simpler: Keep frontend and backend decoupled

**Why deterministic before LLM?**
- Grounding requirement: All answers must cite actual nodes
- LLM risk: Hallucination, confabulation, non-existent entities
- Validation: Deterministic retrieval ensures correctness; LLM can enhance later
- Reversibility: Remove LLM layer anytime; deterministic layer stays

**Why not extend SelectionPanel for Ask response?**
- SelectionPanel shows *one* entity (selected node/project)
- Ask response shows *many* entities (evidence set)
- Different UX: SelectionPanel = detail view; Ask = list + answer text
- Better: New component (AskTheGraphPage) keeps concerns separated

**Why Phases 4.1+ for relationship queries?**
- Complexity: Relationship detection requires entity disambiguation
- MVP scope: Lookup + type filter are 80% of questions
- Validation: Phase 4.0 proves approach before expanding
- Risk: Overengineering early; validate iteratively

---

## NEXT STEPS

1. **User review:** Confirm architecture, scope, risks
2. **Phase 4.0 implementation prompt:** Detailed coding instructions
3. **Runtime verification:** Test all intent types, edge cases, error states
4. **Regression testing:** Verify Phases 2.3–3.9 untouched
5. **Analytics validation:** Ensure ask_graph_* events fire correctly
6. **CLAUDE.md update:** Document patterns, learnings for future phases

