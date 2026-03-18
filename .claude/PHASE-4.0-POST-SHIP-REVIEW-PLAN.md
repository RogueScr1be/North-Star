# Phase 4.0 Post-Ship Review Plan

**Document Purpose:** Operational guide for 7-day post-deployment validation and Phase 4.1 decision framework.

**Duration:** Days 1–7 post-deployment  
**Owner:** Prentiss (monitoring + decision-making)  
**Output:** Weekly review report (template provided)

---

## 1. Seven-Day Observation Metrics

Track these KPIs during the first 7 days. Data feeds from PostHog (if enabled) or console logs (local-only).

### Core Metrics (Canonical)

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Total Ask-the-Graph queries** | >5 | Shows feature discovery and adoption |
| **Success rate (high/medium confidence)** | >60% | Answers are useful; low indicates graph gaps or poor patterns |
| **Evidence click-through rate** | >40% | Users trust answers enough to navigate via evidence |
| **No runtime errors** | 0 | Feature is stable (track browser console warnings) |

### Discovery Metrics (Directional)

| Metric | Purpose |
|--------|---------|
| **Query type distribution** | Which patterns are users asking? (definition, relationship, scope, patterns, causality) |
| **Empty-result rate** | Which entities/relationships are missing from graph? |
| **Average confidence score** | Is NL parsing working well? (high confidence = good parsing) |
| **Parsed vs unparsed ratio** | Are users using intent patterns or falling back to tag search? |

### Observational Signals

| Signal | Watch For |
|--------|-----------|
| **User pain in search** | If users give up on Ask-the-Graph and switch to keyword search, NL isn't resonating |
| **Repeated failed queries** | Same query failing multiple times = gap in graph data or pattern |
| **Unanswered questions in logs** | Query types we don't recognize = need to extend patterns |

---

## 2. Remote Telemetry Verification Checklist

**When:** Before relying on PostHog metrics for decision-making  
**How:** One-time validation pass in a keyed environment (VITE_POSTHOG_KEY set)

### Pre-Flight (Day 1–2)

- [ ] Set `VITE_POSTHOG_KEY` in .env (production PostHog project)
- [ ] Rebuild: `npm run build`
- [ ] Deploy to staging environment
- [ ] Verify PostHog SDK loaded: check Network tab for `https://api.posthog.com/decide`

### Payload Inspection (Day 2–3)

- [ ] Submit 3 test queries (answerable, relationship, nonsense)
- [ ] Inspect PostHog payloads in Network tab
- [ ] Verify **rawQuery is NEVER present** in any payload
- [ ] Verify **sanitizedQuery is truncated** to ≤100 chars
- [ ] Verify **queryHash is deterministic** (same query = same hash)
- [ ] Verify **no sensitive internal terms** in payloads (e.g., project names, decision IDs truncated or hashed)

### Event Quality (Day 3–4)

- [ ] `ask_graph_submitted` fires on each query
- [ ] `ask_graph_answered` fires on successful answer
- [ ] `ask_graph_no_answer` fires on empty result
- [ ] `ask_graph_evidence_clicked` fires on evidence selection
- [ ] All events have required fields (timestamp, type, confidence, resultCount)
- [ ] No events with null/undefined critical fields

### Stability (Day 4–5)

- [ ] Run for 24 hours in production shadow mode (collect but don't rely)
- [ ] Check for event batching errors or dropped events
- [ ] Verify no performance degradation from telemetry SDK
- [ ] Check PostHog project for data quality warnings

### Go/No-Go Decision (Day 5)

**GO:** All checks pass → Scale to primary analytics  
**NO-GO:** Any rawQuery leakage or payload corruption → Revert to console-only, file bug

---

## 3. Query Log Review Framework

**Purpose:** Identify graph gaps and pattern misses through user behavior.

### Weekly Review Process

#### Step 1: Query Inventory (20 min)
```
From PostHog or console logs:
- Total unique queries submitted
- Query count by type (definition, relationship, scope, patterns, causality, tag-search)
- Queries with zero results
```

#### Step 2: Failure Analysis (30 min)
**For each zero-result query:**
1. Is it a real entity in the graph? (search graph_inventory.json)
2. Should we recognize this pattern? (review queryParser.ts patterns)
3. Is it user error or graph gap?

**Buckets:**
- **Graph gap:** "Who created GetIT?" (we don't have creator_of relationships)
- **Pattern miss:** "getit what?" (malformed/incomplete query)
- **Real miss:** "What is FakeProject?" (user asks about non-existent entity)

#### Step 3: Pattern Effectiveness (20 min)
```
For each recognized pattern:
- Queries matching pattern: ___
- Success rate (high/medium confidence): ___% 
- Most common confidence level: ___
```

#### Step 4: Evidence Quality (15 min)
- % of answers with evidence clicked: ___
- Most-clicked evidence nodes (reveals which entities are "navigation hubs")
- Nodes with zero clicks (dead evidence?)

#### Step 5: Emerging Needs (15 min)
Look for repeated phrases or question structures that don't match current patterns:
- "Show me all X" (might need collection queries)
- "What happened before X?" (temporal queries)
- "Why did we X?" (justification queries)

---

## 4. Criteria for Phase 4.1 Priority Selection

**Decision framework:** Use post-ship metrics to prioritize next phase work.

### Success Threshold (Phase 4.0 is "complete")
- ✅ >5 queries submitted in 7 days
- ✅ >0 runtime errors
- ✅ Remote telemetry verified (rawQuery safe)
- ✅ User feedback: no major pain points

**If threshold met:** Phase 4.0 is stable. Proceed to Phase 4.1 prioritization.

### Phase 4.1 Prioritization Matrix

**Rank by impact (high to low):**

| Feature | Trigger | Effort | Impact | Priority |
|---------|---------|--------|--------|----------|
| **Fuzzy matching** | >20% queries with typos (e.g., "dekision") | Low | High | Rank 1 if triggered |
| **Pattern expansion** | >10 failed queries of same unparseable type | Medium | Medium | Rank 2 if triggered |
| **Better entity lookup** | >30% of failed queries are real entities (user misspelled) | Low | High | Rank 1 if triggered |
| **Relationship direction** | Users ask "what caused X?" repeatedly | Medium | Low | Rank 4 (defer) |
| **Multi-entity patterns** | Users ask "show relationships between X and Y" | High | Medium | Rank 3 (defer) |
| **LLM summarization** | Users request longer/richer answers | High | Low | Rank 5 (defer) |
| **Saved queries** | Users ask same query >3 times | Low | Low | Rank 5 (defer) |

**Decision:** Pick top 2 items by "trigger met + impact/effort ratio". Defer rest.

---

## 5. Post-Ship Review Report Template

**To be completed at end of Week 1.**

```markdown
# Phase 4.0 Post-Ship Review — Week 1

## Executive Summary
[1-2 sentences: Is Phase 4.0 stable? What's the top finding?]

## Metrics (7-Day Snapshot)

### Canonical Metrics
- Total queries: ___ 
- Success rate: ___%
- Evidence CTR: ___%
- Runtime errors: ___

### Adoption Signals
- Most common query type: _________
- Zero-result queries: ___ (% of total)
- Parsed vs unparsed: __:__

## Query Analysis

### Top 5 Successful Queries
1. "[Query 1]" (type: ___, confidence: ___)
2. "[Query 2]" (type: ___, confidence: ___)
3. ...

### Top 5 Failed Queries (No Results)
1. "[Query A]" → root cause: [graph-gap | pattern-miss | real-miss]
2. "[Query B]" → root cause: [graph-gap | pattern-miss | real-miss]
3. ...

### Pattern Effectiveness
- definition queries: __% success
- relationship queries: __% success
- scope queries: __% success
- patterns queries: __% success
- causality queries: __% success
- tag-search fallback: __% success

## Remote Telemetry Status
- [ ] PostHog enabled and verified safe (rawQuery not leaked)
- [ ] Event payload inspection completed
- [ ] No privacy violations detected
- [ ] Ready to rely on metrics for Phase 4.1 decisions

**OR**

- [ ] Reverted to console-only logging (reason: _________)
- [ ] Bug filed: ___________
- [ ] Plan to re-attempt: [date]

## User Feedback Highlights
[Paraphrase any user comments or requests]

## Phase 4.1 Recommendation

### Top Priority
Feature: _____________
Trigger: [evidence from metrics]
Effort: [Low | Medium | High]
Expected impact: [1-2 sentences]

### Secondary Candidates
1. Feature: __________ (metric trigger: __________)
2. Feature: __________ (metric trigger: __________)

## Risks & Blockers
[Any emerging issues? Graph gaps? Performance problems?]

## Appendices

### Appendix A: Raw Query Log
[20-30 sample queries with type/confidence/result]

### Appendix B: Full Pattern Distribution
[Graph showing query type distribution]

---

**Compiled by:** [name]  
**Date:** [week 1 end date]  
**Next review:** [week 2 date]
```

---

## Execution Checklist

**Day 1–2: Setup & Go-Live**
- [ ] Deploy Phase 4.0 to production
- [ ] Enable PostHog in .env (production key)
- [ ] Verify analytics logging to PostHog (check Network tab)
- [ ] Notify users if applicable (internal announcement)

**Day 2–5: Telemetry Verification**
- [ ] Run telemetry verification checklist (Section 2)
- [ ] File any security/privacy bugs immediately
- [ ] Decide: PostHog or console-only for phase decision-making

**Day 4–7: Query Analysis**
- [ ] Export query logs from PostHog or console
- [ ] Run query log review framework (Section 3)
- [ ] Identify top 5 successes and top 5 failures
- [ ] Categorize failures (graph-gap | pattern-miss | real-miss)

**Day 7: Review & Decision**
- [ ] Complete post-ship review report (Section 5)
- [ ] Apply prioritization matrix to decide Phase 4.1
- [ ] Share findings with team
- [ ] File bugs for any issues found

---

## Success Criteria for Phase 4.0 Stability

**Phase 4.0 is STABLE if:**
- ✅ >5 queries/week (adoption signal)
- ✅ >60% success rate (answers are useful)
- ✅ >40% evidence CTR (users trust it)
- ✅ 0 runtime errors (no crashes)
- ✅ Remote telemetry verified safe (rawQuery protection intact)

**Phase 4.0 needs FIXES if:**
- ❌ Zero adoption (users don't use Ask-the-Graph)
- ❌ <30% success rate (too many empty results)
- ❌ Runtime errors or crashes
- ❌ rawQuery leaked in telemetry (privacy violation)

**If STABLE:** Proceed to Phase 4.1.  
**If needs FIXES:** File bugs, patch, and re-verify before Phase 4.1.

---

## Notes for Future Sessions

1. **Data retention:** Keep Week 1 logs for 3 months (baseline for future analysis)
2. **Comparative analysis:** Week 2–4 can compare to Week 1 baseline
3. **User feedback loop:** If possible, survey users about Ask-the-Graph quality mid-week
4. **Pattern iteration:** By end of Week 2, you'll have clear signal on which patterns need expansion
5. **Graph gaps doc:** Create a "Graph Gaps" doc for features missing (e.g., creator_of, timeline_of relationships)

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-11  
**Status:** Ready for deployment
