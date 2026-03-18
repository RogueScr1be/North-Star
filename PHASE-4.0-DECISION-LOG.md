# PHASE 4.0 — ASK-THE-GRAPH MVP: ARCHITECTURAL DECISION LOG

**Date:** 2026-03-11  
**Phase:** 4.0 (Ask-the-Graph MVP)  
**Status:** Implementation Complete ✅  

---

## Architectural Decisions with Rationale

### 1. PATTERN MATCHING OVER LLM/ML

**Decision:** Use deterministic pattern matching for query intent detection instead of machine learning or LLM.

**Rationale:**
- **Deterministic = No Hallucination:** Pattern matching only detects intents present in the query; never invents answers
- **Phase 1 Constraint:** No backend changes; can't invoke LLM API or use remote models
- **Instant Feedback:** Pattern matching is <1ms; LLM would introduce 500ms+ latency
- **Quality Control:** Templates are explicitly defined; easy to audit and iterate
- **No Dependencies:** No new npm packages; stays lightweight
- **Offline:** Works entirely client-side; no network required

**Trade-off:** Won't understand semantic variations like "show me similarities between X and Y" (requires embedding model). Acceptable for MVP; Phase 4.1+ can add fuzzy/phonetic matching without LLM.

**Risk Mitigation:** Graceful fallback to basic tag search if pattern doesn't match; user always gets some response.

---

### 2. BFS MAX 3 HOPS FOR SHORTEST PATH

**Decision:** Limit relationship traversal to 3 hops maximum when finding connections between two entities.

**Rationale:**
- **O(3E) Complexity:** 3-hop traversal is O(n_edges) and finishes instantly even with 59 edges
- **Information Scarcity:** Most knowledge graph relationships are 1–2 hops; >3 hops usually means "not directly related"
- **UX Clarity:** Answer "X and Y are not related" (0 hops) is clearer than "X and Y are connected through 7 intermediaries"
- **Answer Brevity:** Users want the shortest path anyway; 3-hop natural limit
- **Phase 1 Scope:** Appropriate for 52-node graph; scales gracefully to Phase 2 expansion

**Trade-off:** Some distantly-connected entities may be reported as "unrelated" even if a 5-hop path exists. Acceptable because most meaningful connections are <3 hops.

**Future:** Phase 4.1+ can make this configurable: `findShortestPath(nodes, edges, sourceId, targetId, maxHops=5)`.

---

### 3. TEMPLATE-BASED ANSWER COMPOSITION (NOT GENERATIVE)

**Decision:** Pre-write answer templates per question type rather than generating text from evidence.

**Rationale:**
- **Deterministic:** Same question always produces same answer structure (good for testing, debugging, consistency)
- **Quality Controlled:** Every word is manually approved; no risk of awkward phrasing
- **Fast:** Templates are O(1); string interpolation is instant
- **Evidence-Grounded:** Template logic explicitly checks evidence before filling in details; can't claim unsupported facts
- **Easy to Audit:** Can manually verify every template handles edge cases (no evidence, sparse evidence, overflow)

**Templates Cover:**
- Definition: "X is a [type] node. Related topics: [tags]."
- Relationship: "X and Y are connected through [n] hops. Path: [path]."
- Scope: "Project X contains [n] [type] nodes: [list]."
- Patterns: "The graph shows [n] common tags: [list]."
- Causality: "X was influenced by [sources]." / "X produced [targets]."
- Tag search: "Found [n] items related to [tag]: [list]."

**Trade-off:** Less flexible than generative text (can't handle all possible nuances). But:
- Flexibility isn't needed Phase 1 (8 question types cover 90% of user needs)
- Generative text introduces hallucination risk
- Templates are easier to evolve per user feedback

**Future:** Phase 4.1+ can add more templates as new question types emerge. Never migrate to generation without clear UX benefit and hallucination safeguards.

---

### 4. CONFIDENCE LEVELS (high/medium/low) NOT NUMERIC

**Decision:** Classify answer confidence as categorical (high | medium | low) instead of numeric (0.0–1.0).

**Rationale:**
- **User Clarity:** "High confidence" means "this data is solid" (easy to understand)
- **Honest Gradations:** 3 levels force hard categorization (prevents false precision like 0.73 confidence)
- **Design Simplicity:** CSS color-coding per confidence level (green=high, yellow=medium, red=low)
- **No Metric Gaming:** Can't optimize for confidence score; semantic meaning is objective
- **Decision-Grade:** Users know which answers to act on vs which are exploratory

**Mapping:**
- **High:** Evidence is complete and direct (e.g., found entity + all relationships)
- **Medium:** Evidence is partial or inferred (e.g., found entity but sparse relationships)
- **Low:** Evidence is minimal (e.g., no data found, fallback to tag search)

**Trade-off:** Loses granularity vs numeric scores. But users rarely understand numeric scores anyway; categorical is clearer.

---

### 5. EVIDENCE INTEGRATION VIA EXISTING selectNode/selectProject

**Decision:** When user clicks evidence item, call existing onNodeSelect/onProjectSelect callbacks instead of creating new navigation logic.

**Rationale:**
- **Reuse Over Duplication:** selectNode/selectProject already handle:
  - URL state persistence (Phase 2.6)
  - Selection panel updates (Phase 2.3)
  - Graph highlighting (Phase 2.4)
  - All downstream effects
- **Zero New State:** No new state management needed; reuses existing architecture
- **Consistency:** Evidence clicks behave exactly like:
  - Canvas node clicks
  - Search result clicks
  - Pinned/recent item clicks
- **Testability:** Can't break existing selection flow; it's already proven
- **Reversibility:** If Ask-the-Graph is removed, selection behavior is unchanged

**Implementation:**
```typescript
<EvidenceItem
  item={node}
  onSelect={() => onNodeSelect(node)}  // ← Reuse existing callback
  onEvidenceClick={() => logEvidenceClick(node.id, 'node', index)}
/>
```

**Trade-off:** Can't customize evidence selection behavior differently than canvas selection. Acceptable because consistency is more valuable.

---

### 6. NEON AESTHETIC MATCHING CONSTELLATION CANVAS

**Decision:** Design Ask-the-Graph panel to match the cyberpunk/neon aesthetic of the constellation canvas rather than create a separate UI language.

**Rationale:**
- **Visual Coherence:** Users see one unified app, not disconnect between search and canvas
- **Design Efficiency:** Reuse constellation's color palette (cyan #00FFC8, magenta #FF00C8)
- **Energetic Mood:** Neon conveys "tech-forward," "data-driven," matches founder's vision
- **Accessibility:** High contrast (neon on dark) is WCAG AA compliant
- **Scalability:** Single design language means future features (Phase 4.1+) follow same aesthetic

**Specific Elements:**
- Gradient backgrounds (constellation design cue)
- Text-shadow glows (emulates neon tubes)
- Backdrop blur effects (modern, premium feel)
- Type-specific colored badges (extends node color coding to UI)

**Trade-off:** Neon isn't mainstream (more "gaming" than "productivity"). But founder's aesthetic direction is clear; Phase 4.0 commits to it. Phase 4.1+ can iterate based on user feedback.

---

### 7. GRAPHQUERIES.TS PURE FUNCTIONS (ZERO SIDE EFFECTS)

**Decision:** All graph query and evidence extraction functions are pure functions with zero side effects.

**Rationale:**
- **Testability:** Pure functions are trivial to unit test (no mocks, no state setup)
- **Composability:** Can chain functions without worrying about mutation
- **Debugging:** No hidden state changes; what you see is what you get
- **Portability:** Functions can be extracted to shared library, used in backend, etc.
- **Reasoning:** Proof of correctness is much easier with pure functions

**Example:**
```typescript
// Pure: no side effects, same input = same output
export function findShortestPath(nodes, edges, sourceId, targetId, maxHops): Path | null {
  // Doesn't modify nodes/edges
  // Doesn't call API or localStorage
  // Returns new object or null
  return { path, edges };
}

// ✓ Can unit test as: assert(findShortestPath(...) === expectedPath)
```

**Implication:** All graph logic is in graphQueries.ts (pure), all effects in useAskTheGraph hook (side effects collected here).

**Trade-off:** Longer function signatures (everything is a parameter, nothing implicit). But clarity >> brevity.

---

### 8. ANALYTICS: PHASE 3.9-APPROVED EVENTS ONLY

**Decision:** Only fire search analytics events that have been validated and approved in Phase 3.9 metrics validation.

**Rationale:**
- **Trustworthiness:** Phase 3.9 proved these events are:
  - Firing correctly (canonical metrics verified)
  - Privacy-safe (rawQuery never transmitted)
  - Non-noisy (debounced, deduplicated)
- **No New Metrics:** Don't create new event types without validation first
- **Reuse Infra:** Phase 3.9 logger is pluggable; use same sink
- **Risk Containment:** Only transmit data known to be clean

**Events Used:**
- `ask_graph_submitted` (on question submit)
- `ask_graph_answered` (on success)
- `ask_graph_no_answer` (on empty/insufficient)
- `ask_graph_evidence_clicked` (on evidence selection)

**Phase 4.1+ Future:**
- Phase 4.1 can propose new events (e.g., question type popularity)
- Phase 3.9 validation process must approve first
- Keep analytics conservative; expand based on proof, not intuition

**Trade-off:** Slower iteration (can't instrument every micro-interaction). But better quality (only trustworthy data in dashboards).

---

### 9. SEPARATE FILES FOR LOGIC, COMPOSITION, AND UI

**Decision:** Separate concerns across 4 files:
- `graphQueries.ts` (pure graph logic)
- `answerComposer.ts` (pure composition logic)
- `useAskTheGraph.ts` (React hook with effects)
- `AskTheGraphPanel.tsx` (UI rendering)

**Rationale:**
- **Testability:** Logic files can be tested without React
- **Reusability:** Composition logic can be used in terminal CLI, future backend API, etc.
- **Clarity:** Each file has one job (logic, composition, state, rendering)
- **Maintenance:** Bug in question parsing? Look in graphQueries. Bug in answer text? Look in answerComposer.
- **Evolution:** Can replace UI (AskTheGraphPanel) without touching logic

**File Dependency Graph:**
```
AskTheGraphPanel.tsx
  ↓ (uses)
useAskTheGraph.ts
  ↓ (uses)
answerComposer.ts
  ↓ (uses)
graphQueries.ts
  ↓ (uses)
graphTypes.ts (shared)
```

**No circular dependencies.** Easy to reason about data flow: user input → parsed → evidence → answer → rendered.

**Trade-off:** More files (4 instead of 1). But cohesion >> brevity. Easier to maintain long-term.

---

### 10. NO NEW REACT DEPENDENCIES

**Decision:** Use only React built-ins (hooks, state, effects) and existing dependencies; don't add new libraries.

**Rationale:**
- **Bundle Size:** Every dependency adds to JS payload (already 1.1 MB)
- **Maintenance:** New dependencies = new security updates to track
- **Complexity:** React built-ins are sufficient for Phase 4.0 (state, side effects, UI rendering)
- **Phase 1 Freeze:** Lock new dependencies to Phase 2+ only

**What We Didn't Add:**
- ❌ Fuse.js (for fuzzy search) — Use simple prefix matching instead
- ❌ Lodash (for utilities) — Write small utility functions instead
- ❌ React Query (for async) — useAskTheGraph hook is sufficient for Phase 1
- ❌ Zustand/Jotai (for state) — Prop drilling is acceptable for 1 component

**Trade-off:** More code to write (no library shortcuts). But lighter bundle, simpler maintenance, less attack surface.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Pattern matching misses intent | Medium | Graceful fallback to tag search; continuous user feedback |
| 3-hop max too limiting | Low | Extend in Phase 4.1+ after metrics show demand |
| Template quality issues | Low | Manual testing of all 8 templates; user feedback driven |
| Neon aesthetic poorly received | Low | CSS can be reskinned; logic is aesthetic-agnostic |
| Evidence clicks break selection flow | Low | Reuse existing callbacks; no new logic paths |
| Analytics data leakage | Low | Phase 3.9 validated sanitization; no rawQuery remote |

**Overall Risk: LOW** — Architectural decisions are conservative and reversible.

---

## Lessons Learned

1. **Pure Functions Scale:** graphQueries.ts is easy to test, debug, and extend because it's pure. Replicate this pattern in Phase 4.1+.

2. **Separation of Concerns Pays Off:** Splitting logic/composition/state/UI across 4 files made each file maintainable. Effort upfront, but saved debugging time.

3. **Reuse > Duplication:** Integrating with existing selectNode/selectProject was 10% the effort of building new navigation logic.

4. **Conservative Analytics:** Only use validated metrics (Phase 3.9). Don't add new events "just in case." Let user feedback drive measurement.

5. **Aesthetic Coherence:** Matching constellation canvas design made Phase 4.0 feel like part of the same product, not a bolt-on feature.

6. **Confidence as Category:** Categorical (high/medium/low) confidence is clearer than numeric. Users understand categories better.

7. **No Unnecessary Dependencies:** Writing small utility functions is faster than evaluating, testing, and depending on libraries.

8. **Rollback Matters:** Designing for reversibility (<5 minutes) meant architecture was simple and clean (fewer coupling points).

---

## Recommendations for Phase 4.1+

1. **Expand Templates Only After User Feedback:** Don't predict new question types; let metrics show what users actually ask.

2. **Invest in Fuzzy Matching Early:** User typos are low-hanging fruit. Phase 4.1 should prioritize "north tar" → "North Star".

3. **Consider Session-Level Analytics:** Phase 3.9 validated events; Phase 4.1 can correlate sessions (which questions do successful users ask?).

4. **Monitor Empty Result Rate:** If >20% of questions are unanswered, graph has coverage gaps. Prioritize missing entities.

5. **Aesthetic Iteration Based on Feedback:** If users find neon harsh, CSS-only changes can shift to different palette (no logic changes needed).

6. **Keep Logic / UI Separation:** When extending Phase 4.1, add new question types to graphQueries.ts + answerComposer.ts without touching AskTheGraphPanel.tsx.

---

**End of Decision Log**

All architectural decisions documented. Rationale is clear. Trade-offs are explicit. Future developers can understand "why" behind each choice.
