---
name: Phase 6.2 Decision Dashboard Specification
description: Exact metric definitions, formulas, and thresholds for D3 layout pilot decision gate
type: project
---

# Phase 6.2 — Decision Dashboard Specification

**Purpose:** Define precise, auditable calculations for all 6 decision-gate criteria.

**Observation Period:** Days 1–28 (from Phase 6.1 deployment)

**Data Source:** PostHog analytics (from Phase 6.1 instrumentation) + Manual correctness verification

---

## 1. Adoption Rate

**What it measures:** Percentage of constellation canvas loads where user opts into Dynamic layout.

**Calculation:**
```
adoption_rate = (COUNT of users who toggled to D3 at least once) / (COUNT of unique constellation canvas loads)
            OR
adoption_rate = (COUNT of layout_mode_changed events with to_mode='d3') / (COUNT of constellation page loads)
```

**Data Points Needed:**
- `layout_mode_changed` events (fired when user clicks toggle)
- Filter: `to_mode == 'd3'`
- `constellation_canvas_load` or `page_load` events (baseline denominator)

**Exact Formula (SQL-style):**
```sql
SELECT
  COUNT(DISTINCT session_id) as users_adopted_d3,
  COUNT(DISTINCT session_id) as total_users,
  CAST(COUNT(DISTINCT session_id) FILTER (WHERE event_name='layout_mode_changed' AND to_mode='d3')
    AS FLOAT) / COUNT(DISTINCT session_id) * 100 as adoption_percent
FROM events
WHERE timestamp BETWEEN deployment_date AND deployment_date + 28 days;
```

**Simpler Alternative (for quick check):**
```
adoption_rate = (layout_mode_changed events with to_mode='d3') / (total page loads)
```

**Decision Threshold:**
- ✅ **PASS:** adoption_rate ≥ 10%
- ⏳ **HOLD:** 5% ≤ adoption_rate < 10% (marginal interest, continue observing)
- ❌ **FAIL:** adoption_rate < 5% (insufficient interest, rollback likely after Week 4)

**Interpretation:**
- <5%: Feature is hidden, unclear, or doesn't solve a problem
- 5–10%: Early adopters only; mass market hasn't discovered it
- 10–20%: Healthy signal; feature is discoverable and users see value
- >20%: Strong signal; feature is resonating widely

**Notes:**
- Count unique users, not events (one user switching back and forth = 1 adopter, not N)
- Include users across all sessions (don't reset at week boundary)
- "Adoption" = at least one D3 session; doesn't require staying

---

## 2. Revert Rate

**What it measures:** Of users who tried D3, what % reverted back to Curated and stayed there?

**Calculation:**
```
revert_rate = (COUNT of layout_mode_changed events: to_mode='api' after previously selected to_mode='d3')
            / (COUNT of layout_mode_changed events: to_mode='d3')
```

**Data Points Needed:**
- All `layout_mode_changed` events
- Track session/user context
- Identify transitions: d3 → api (reverts)

**Exact Formula (for single user):**
```
user_revert_rate = (times toggled api after trying d3) / (times toggled d3)
overall_revert_rate = SUM(user_revert_rate) / COUNT(users_who_tried_d3)
```

**SQL-style (cohort-based):**
```sql
WITH d3_users AS (
  SELECT DISTINCT user_id FROM events
  WHERE event_name='layout_mode_changed' AND to_mode='d3'
),
d3_reverts AS (
  SELECT user_id, COUNT(*) as revert_count FROM events
  WHERE event_name='layout_mode_changed'
    AND to_mode='api'
    AND user_id IN (SELECT user_id FROM d3_users)
  GROUP BY user_id
),
d3_sessions AS (
  SELECT user_id, COUNT(*) as d3_session_count FROM events
  WHERE event_name='layout_mode_changed'
    AND to_mode='d3'
  GROUP BY user_id
)
SELECT
  CAST(SUM(COALESCE(revert_count, 0))
    AS FLOAT) / SUM(d3_session_count) * 100 as revert_rate_percent
FROM d3_sessions
LEFT JOIN d3_reverts USING (user_id);
```

**Decision Threshold:**
- ✅ **PASS:** revert_rate ≤ 30%
- ⏳ **WATCH:** 30% < revert_rate ≤ 50% (users giving it a fair shot, but some leaving)
- ❌ **FAIL:** revert_rate > 50% (majority of adopters abandoning; quality issue)

**Interpretation:**
- <20%: Users love it; sticky feature
- 20–30%: Mixed opinions; some users happy, some want old way
- 30–50%: Marginal satisfaction; feature has issues
- >50%: Feature isn't working for most who try it

**Notes:**
- A user can toggle multiple times (d3 → api → d3 → api). Count total transitions.
- "Revert" = intentional switch back to api. Not session expiration or browser crash.
- Within-session toggles (back and forth) still count as exploration, not necessarily dissatisfaction.

---

## 3. Error Rate

**What it measures:** What % of D3 layout sessions produce runtime errors?

**Calculation:**
```
error_rate = (COUNT of layout_error events)
           / (COUNT of layout_convergence_measured events)
```

**Data Points Needed:**
- `layout_error` events (fired when D3 simulation fails)
- `layout_convergence_measured` events (fired after successful layout)

**Exact Formula:**
```sql
SELECT
  CAST(COUNT(*) FILTER (WHERE event_name='layout_error')
    AS FLOAT) / COUNT(*) FILTER (WHERE event_name='layout_convergence_measured')
    * 100 as error_rate_percent
FROM events
WHERE timestamp BETWEEN deployment_date AND deployment_date + 28 days
  AND (event_name='layout_error' OR event_name='layout_convergence_measured');
```

**Alternative (per graph size):**
```
error_rate_by_size = {
  subgraph_5_nodes: (errors_on_subgraph) / (convergence_on_subgraph),
  medium_20_nodes: (errors_on_medium) / (convergence_on_medium),
  large_50_nodes: (errors_on_large) / (convergence_on_large),
}
```

**Decision Threshold:**
- ✅ **PASS:** error_rate = 0% (no errors observed)
- ⚠️ **WATCH:** 0% < error_rate < 1% (isolated, investigate but proceed)
- ❌ **FAIL:** error_rate ≥ 1% (systematic issue, rollback)

**Interpretation:**
- 0%: Perfect reliability
- <1%: Acceptable (rare edge cases)
- 1–5%: Concerning (pattern emerging, requires root cause)
- >5%: Unacceptable (rollback immediately)

**Critical Note:** If error_rate > 0%, ALL layout_error events should have triggered fallback_mode='api'. Verify this in logs.

---

## 4. Convergence p95 (Performance)

**What it measures:** 95th percentile of D3 simulation time across all graphs.

**Calculation:**
```
p95_convergence_ms = PERCENTILE(convergence_ms_values, 0.95)
```

**Data Points Needed:**
- `layout_convergence_measured` event field: `convergence_ms` (integer milliseconds)
- May also track: `iteration_count`, `final_velocity`, `visible_node_count`

**Exact Formula (SQL):**
```sql
SELECT
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY convergence_ms)
    AS p95_convergence_ms,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY convergence_ms)
    AS p50_median_ms,
  MAX(convergence_ms) AS p100_max_ms
FROM events
WHERE event_name='layout_convergence_measured'
  AND timestamp BETWEEN deployment_date AND deployment_date + 28 days;
```

**By Graph Size (for context):**
```sql
SELECT
  CASE WHEN visible_node_count <= 10 THEN 'subgraph'
       WHEN visible_node_count <= 25 THEN 'small'
       WHEN visible_node_count <= 50 THEN 'medium'
       ELSE 'large' END as size_category,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY convergence_ms) as p95_ms,
  COUNT(*) as sample_count
FROM events
WHERE event_name='layout_convergence_measured'
GROUP BY size_category;
```

**Decision Threshold:**
- ✅ **PASS:** p95_convergence_ms ≤ 500ms (acceptable latency)
- ⏳ **WATCH:** 500 < p95_convergence_ms ≤ 1000ms (noticeable pause, monitor user perception)
- ❌ **FAIL:** p95_convergence_ms > 1000ms (unacceptable, feels broken)

**Interpretation:**
- ≤300ms: Instant (no perceived delay)
- 300–500ms: Noticeable but acceptable (user sees a flash)
- 500–1000ms: Borderline (user waits for layout)
- >1000ms: Poor (feels broken, likely to frustrate)

**Notes:**
- D3 max iterations = 500 (hard cap). p95 should reflect this.
- Subgraph isolation (Phase 5.5) reduces node count → faster convergence. Expect p95_subgraph << p95_full.
- Network latency is NOT included (convergence is client-side computation).

---

## 5. Complaint Rate

**What it measures:** What % of D3 sessions result in errors or user complaints?

**Calculation:**
```
complaint_rate = (COUNT of layout_error events + manual complaint tickets)
               / (COUNT of layout_mode_changed events with to_mode='d3')
```

**Data Points Needed:**
- `layout_error` events (automated)
- Manual complaint tickets (email, Slack, support channel)
- `layout_mode_changed` events baseline

**Exact Formula:**
```sql
WITH d3_sessions AS (
  SELECT COUNT(*) as d3_toggles FROM events
  WHERE event_name='layout_mode_changed' AND to_mode='d3'
),
automated_complaints AS (
  SELECT COUNT(*) as error_count FROM events
  WHERE event_name='layout_error'
),
manual_complaints AS (
  SELECT COUNT(*) as ticket_count FROM support_tickets
  WHERE tag='layout_issue' OR tag='d3_bug'
    AND created_date BETWEEN deployment_date AND deployment_date + 28 days
)
SELECT
  CAST((a.error_count + m.ticket_count)
    AS FLOAT) / d.d3_toggles * 100 as complaint_rate_percent
FROM d3_sessions d
CROSS JOIN automated_complaints a
CROSS JOIN manual_complaints m;
```

**Decision Threshold:**
- ✅ **PASS:** complaint_rate ≤ 5% (isolated issues)
- ⏳ **WATCH:** 5% < complaint_rate ≤ 10% (pattern emerging, escalate)
- ❌ **FAIL:** complaint_rate > 10% (systemic dissatisfaction, rollback)

**Interpretation:**
- ≤5%: Healthy (rare issues, expected in beta)
- 5–10%: Concerning (users noticing problems)
- >10%: Unacceptable (majority experiencing issues)

**Notes:**
- Manual complaints may lag events (user may not report immediately). Check weekly.
- "Complaint" includes errors AND subjective issues ("layout looks wrong", "too slow").
- Zero manual feedback doesn't mean zero complaints (users may just switch back silently).

---

## 6. Correctness (Binary)

**What it measures:** Do all Phase 2.3–5.7 features work identically with D3 positions?

**Calculation:**
```
correctness_pass = ALL of the following are true:
  ✓ Node/project selection works (picks correct item, panel updates with all fields)
  ✓ URL state sync works (back/forward, page reload restores selection)
  ✓ Graph highlighting correct (selection colors, adjacency dim, edge colors)
  ✓ Semantic filters work (Phase 5.5 filtering respected, pick layer updated)
  ✓ Zoom/pan smooth (no jank, 60 FPS, no z-fighting)
  ✓ Edge display correct (selected edges bright, non-selected edges dim)
  ✓ No visual glitches (no overlapping nodes, no render artifacts)
  ✓ Search → selection → panel flow works (Phase 3 intact)
  ✓ Ask-the-Graph panel renders (cited nodes highlighted correctly)
```

**Verification Method:**
- Manual testing once per week
- Use Phase 6.1 verification matrix (8 test scenarios)
- Record pass/fail for each scenario

**Exact Checklist:**
```
Week [N] Correctness Verification:

Node/Project Selection:
  [ ] Click node at position (X, Y) → correct item selected
  [ ] Panel shows: title, type badge, description, gravity %, tags, ID
  [ ] URL updates to ?selected=node-[id]

URL State Sync:
  [ ] Bookmark URL, close tab, reopen → selection restored
  [ ] Back button → previous selection restored
  [ ] Forward button → next selection restored

Graph Highlighting (Phase 2.4):
  [ ] Selected node is brightest (1.3x type color)
  [ ] Adjacent nodes are medium (1.15x)
  [ ] Non-adjacent nodes are dim (0.75x during answer, 1.0x default)
  [ ] Connected edges are red (0.85 opacity)
  [ ] Non-connected edges are gray (0.25 opacity) or invisible

Semantic Filters (Phase 5.5):
  [ ] Toggle subgraph → shows only N-hop neighborhood
  [ ] Toggle project cluster → shows only nodes in project
  [ ] Toggle node type → visibility updates
  [ ] Picking layer respects visibility (can't click hidden items)

Zoom/Pan:
  [ ] Zoom in 5x with mouse wheel → smooth, no stutter
  [ ] Zoom out 10x → smooth, no stutter
  [ ] Pan with mouse drag → responsive
  [ ] Double-click to reset view → camera resets correctly

Edge Display:
  [ ] Select node → edges to/from that node are bright red
  [ ] Deselect → edges return to gray
  [ ] No visual glitches (edges don't flicker, z-fight, or disappear)

Search & Selection Flow:
  [ ] Type in search → results appear
  [ ] Click result → selection updates, panel opens
  [ ] URL changes to ?selected=...
  [ ] Search closes automatically

Ask-the-Graph:
  [ ] Ask question → answer appears
  [ ] Cited nodes are highlighted (1.35x brightness)
  [ ] Cited edges are cyan
  [ ] Non-cited items dim (0.75x)
  [ ] Click evidence → item selected, panel updates
  [ ] Clear answer → graph returns to normal

Regression Status:
  [ ] ALL PASS → correctness = ✅ PASS
  [ ] ANY FAIL → correctness = ❌ FAIL (ROLLBACK)
```

**Decision Rule:**
- ✅ **PASS:** All 9 checklist items pass
- ❌ **FAIL:** Any item fails (rollback immediately, do not proceed)

---

## Phase 6.2 Decision Matrix (Week 4)

**Gate Rule: ALL 6 criteria must be ≥ PASS**

```
PASS to Phase 6.3 if:
  adoption_rate ≥ 10%              AND
  revert_rate ≤ 30%                AND
  error_rate = 0%                   AND
  p95_convergence_ms ≤ 500ms        AND
  complaint_rate ≤ 5%               AND
  correctness = ✅ PASS             AND
  design_judgment = thumbs up

NO-GO (Keep as Experimental) if:
  ANY criterion fails               OR
  design_judgment = thumbs down

ROLLBACK IMMEDIATELY if:
  error_rate > 1%                   OR
  correctness = ❌ FAIL             OR
  complaint_rate > 10%              OR
  p95_convergence_ms > 1000ms
```

---

## Data Collection Schedule

| Frequency | What | Who | Tool |
|-----------|------|-----|------|
| Real-time | Error rate | Dev/Ops | PostHog alerts |
| Daily | Adoption trend | PM | PostHog dashboard |
| Daily | Error count | Dev | Browser console logs |
| Weekly | All metrics | PM | Weekly review template |
| Weekly | Correctness | QA | Manual test matrix |
| Weekly | Complaints | Support | Email/Slack review |
| Week 4 | Final aggregation | PM | Decision dashboard |

---

## Appendix: Sample Queries

### Adoption Rate (PostHog)
```sql
-- Events → layout_mode_changed
-- Filter: to_mode = 'd3'
-- Group by: user_id
-- Count: DISTINCT user_id where to_mode='d3'
-- Total: DISTINCT user_id (all)
-- Result: (d3 users) / (all users) * 100
```

### Revert Rate (PostHog)
```sql
-- Events → layout_mode_changed
-- Where: (to_mode='api' AND previous event for same user has to_mode='d3')
-- Result: (reverts) / (d3 sessions) * 100
```

### Error Rate (PostHog)
```sql
-- Filter 1: event='layout_error'
-- Filter 2: event='layout_convergence_measured'
-- Result: COUNT(filter1) / COUNT(filter2) * 100
```

### p95 Convergence (PostHog)
```sql
-- Events → layout_convergence_measured
-- Field: convergence_ms
-- Function: PERCENTILE_CONT(0.95)
-- Result: milliseconds
```

---

## Sign-Off

**Spec Version:** 1.0
**Created:** 2026-03-13
**Review Frequency:** Weekly (weeks 1–4)
**Next Update:** Week 4 final decision (2026-04-10)

