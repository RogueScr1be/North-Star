# PHASE 6.2 — D3 LAYOUT PILOT POST-SHIP REVIEW PLAN

**Date:** 2026-03-13
**Duration:** 2–4 weeks (collection phase)
**Goal:** Validate Phase 6.1 D3 pilot against decision gate criteria before Phase 6.3 rollout planning

---

## Decision Gate Criteria (All 6 Must Pass)

| # | Criterion | Target | Metric | Source |
|---|-----------|--------|--------|--------|
| 1 | **Adoption Rate** | ≥10% | (toggle-to-d3) / (all constellation page loads) | `layout_mode_changed` events |
| 2 | **Revert Rate** | ≤30% | (toggle-back-to-api) / (toggle-to-d3) | `layout_mode_changed` events |
| 3 | **Complaint Rate** | ≤5% | (error events OR user feedback) / (sessions with d3) | `layout_error` events + feedback |
| 4 | **Performance (p95)** | ≤500ms | p95 convergence_ms from `layout_convergence_measured` | Phase 6.1 analytics |
| 5 | **Correctness** | 0 regressions | No bugs in picking, selection, edges, highlighting | Manual testing + issue tracking |
| 6 | **Design Judgment** | Thumbs up | Subjective quality assessment from design/user feedback | Manual review + feedback |

---

## Success Definition

Phase 6.2 is **PASS** if **ALL 6 criteria** are met by end of 4-week collection period.

**If ANY criterion fails:** Keep D3 as experimental opt-in perpetually (acceptable outcome, no forced migration).

**If ALL criteria pass:** Proceed to Phase 6.3 gradient rollout planning.

---

## Monitoring Framework (Days 1–28)

### Week 1: Baseline Establishment (Days 1–7)

**What to measure:**
- Total constellation page loads
- Total `layout_mode_changed` events (d3 toggles)
- Raw convergence times (min, p50, p95, p99, max)
- First error/complaint reports

**Actions:**
1. Deploy Phase 6.1 (if not already live)
2. Enable PostHog analytics with VITE_POSTHOG_KEY
3. Log baseline metrics to spreadsheet
4. Start monitoring browser error logs (Sentry/LogRocket if available)

**Success indicator:** >5 adopters by Day 7 (>10% if <50 loads/day)

---

### Week 2–3: Adoption Pattern Observation (Days 8–21)

**What to measure:**
- Daily active adopters (unique users toggling to D3)
- Revert patterns (same session vs later session)
- Convergence time distribution by graph size (full vs filtered)
- Performance complaints in user feedback
- Any layout correctness issues (nodes overlapping, missing edges, etc.)

**Actions:**
1. Check for feature flags or config controlling D3 visibility (if any)
2. Monitor constellation error logs for crashes
3. Analyze `layout_convergence_measured` payloads:
   - Sorted by convergence_ms
   - Grouped by visible_node_count (0–20, 20–50, 50+)
4. Spot-check 5 random D3 layouts in production (visual QA)

**Metric aggregation (daily):**
- Adoption % = (unique users toggling to D3) / (unique constellation users)
- Revert % = (same-user toggle back) / (initial toggle to D3)
- p95_convergence_ms = 95th percentile of convergence_ms values
- Error count (from logs)

**Success indicator:** Adoption >5%, revert <30%, p95 <500ms, 0 errors

---

### Week 4: Validation + Decision (Days 22–28)

**What to measure:**
- Final aggregated metrics across all 4 weeks
- Any late-stage regressions (7-day rolling window)
- User feedback summary (sentiment analysis if available)
- Design team subjective assessment

**Actions:**
1. Run final metrics aggregation (see Metrics Aggregation section below)
2. Compute decision gate pass/fail for each criterion
3. Schedule design team review (thumbs up/down on visual quality)
4. Prepare Phase 6.2 Post-Ship Review Report (see Report Template)
5. **Go/No-Go decision:** If all 6 pass, recommend Phase 6.3. If any fail, document findings for perpetual experimental phase.

**Success indicator:** All 6 criteria pass OR documented reason for each failure

---

## Metrics Collection & Aggregation

### Data Sources

**PostHog Analytics (if enabled):**
- `layout_mode_changed` events → adoption, revert rates
- `layout_convergence_measured` events → performance (convergence_ms)
- `layout_error` events → complaint rate
- Session tracking → user engagement (optional)

**Local Console Logs (fallback):**
- Browser DevTools console captures `[SearchAnalytics]` logs
- Manual export if PostHog unavailable

**Manual QA/Feedback:**
- GitHub issues / bug reports
- Slack/email feedback
- User interviews (if time allows)

### Metric Calculations

**Adoption Rate:**
```
adoption_rate = (count of unique users who toggled to d3)
              / (count of unique constellation page visits)
```
- Expected: ≥10% (means ≥1 in 10 users tries it)
- If <10%: Feature not visible enough OR not interesting enough

**Revert Rate:**
```
revert_rate = (count of "api" after "d3" in same session)
            / (count of users who toggled to d3)
```
- Expected: ≤30% (means ≤3 in 10 users abandon it in same session)
- If >30%: Feature is broken OR produces bad layouts

**Performance (p95):**
```
p95_convergence_ms = 95th percentile of convergence_ms values
                     from layout_convergence_measured events
```
- Expected: ≤500ms (full graph should converge in <500ms, p95)
- Group by visible_node_count:
  - Full (50 nodes): p95 ≤ 500ms
  - Filtered (5–20 nodes): p95 ≤ 100ms (should be fast)

**Complaint Rate:**
```
complaint_rate = (layout_error events + manual complaints)
               / (total sessions using d3 mode)
```
- Expected: ≤5% (≤1 in 20 users encounters issues)
- If >5%: Stability problems, consider rollback

**Correctness:**
- Manual checklist:
  - [ ] Can click and select nodes in D3 mode
  - [ ] Node highlighting works (adjacent, selected)
  - [ ] Edges render and highlight correctly
  - [ ] Semantic filters still work with D3 layout
  - [ ] URL state persists correctly
  - [ ] Selection panel shows all node/project data
  - [ ] No visual glitches (z-fighting, clipping)
  - [ ] No crashes on rapid toggling
- If all items pass: Correctness = ✅ PASS
- If any item fails: Correctness = ❌ FAIL (investigate + document issue)

**Design Judgment:**
- Subjective review by design lead (or CTO)
- Question: "Does the D3 layout look good and feel intentional?"
- Acceptable visual artifacts:
  - ✓ Mild node overlap in dense areas (force-directed tradeoff)
  - ✓ Different layout every session (ephemeral is OK if clearly labeled)
  - ✗ Nodes piled in corner (broken simulation)
  - ✗ Missing edges or disconnected islands (rendering bug)
- Result: Yes/No + brief reasoning

---

## Phase 6.2 Report Template

Create: `PHASE-6.2-POST-SHIP-REVIEW-REPORT.md`

```markdown
# PHASE 6.2 POST-SHIP REVIEW REPORT

**Date:** [End of Day 28]
**Review Period:** [Day 1]–[Day 28]
**Status:** ✅ PASS / ❌ FAIL (decision gate outcome)

---

## Executive Summary

[1–2 sentence summary of outcome + key finding]

### Decision Gate Results

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| Adoption Rate | ≥10% | X% | ✅/❌ |
| Revert Rate | ≤30% | X% | ✅/❌ |
| Performance (p95) | ≤500ms | Xms | ✅/❌ |
| Complaint Rate | ≤5% | X% | ✅/❌ |
| Correctness | 0 regressions | [details] | ✅/❌ |
| Design Judgment | Thumbs up | Yes/No | ✅/❌ |

**Overall:** [All 6 pass = READY FOR PHASE 6.3] [Any fail = Keep as experimental]

---

## Detailed Findings

### Adoption Metrics
- Total constellation page loads: X
- Unique users: Y
- Unique adopters (toggled to D3): Z
- Adoption rate: Z/Y = X%
- Trend: [Increasing/Decreasing/Stable]

### Revert & Engagement
- Same-session reverts: X
- Cross-session adopters: Y
- Revert rate: X/(X+Y) = Z%
- Avg time in D3 mode: X minutes
- Returning adopters: Y% (users who tried D3 more than once)

### Performance Analysis
- Convergence time (full graph, 50 nodes):
  - Min: Xms, Median: Yms, p95: Zms, Max: Wms
  - ✓/✗ Meets p95 ≤500ms target
- Convergence time (filtered graph, 5–20 nodes):
  - Median: Xms, p95: Yms
  - ✓ Fast subgraph performance
- No timeout events reported

### Complaint & Error Summary
- `layout_error` events: X
- Manual feedback: [list issues]
- Complaint rate: X% (above/below 5% threshold)
- Severity: [critical/high/medium/low/none]

### Correctness Verification (Manual)
- Selection/picking: ✅ works
- Highlighting: ✅ works
- Edges: ✅ visible and correct
- Semantic filters: ✅ work with D3
- URL state: ✅ persists
- Visual quality: [describe layout quality]
- No visual glitches: ✅
- Stress test (rapid toggles): ✅ stable

### Design Assessment
- Visual quality: [Good/Acceptable/Poor]
- Intentionality: [Feels polished / Feels beta / Needs work]
- Recommendation: [Approve / Fix and retry / Archive as experimental]

---

## Decision & Next Steps

### Outcome
[If all 6 criteria pass:]
✅ **READY FOR PHASE 6.3 ROLLOUT**
- Proceed with gradient rollout strategy (10% → 50% → 100%)
- No blocking issues identified
- Users responding positively

[If any criterion fails:]
⚠️ **KEEP AS EXPERIMENTAL OPT-IN FOREVER**
- D3 layout remains toggle-based, default OFF
- Document learnings for Phase 7.0+ if applicable
- No regression: existing API-based layout unaffected
- Acceptable outcome: some users benefit from D3, others stay with Curated

### Phase 6.3 Plan (if PASS)
[Outline gradient rollout, monitoring, rollback strategy]

### Lessons & Guardrails
[Key learnings that apply to future phases]

---

**Report Date:** [Day 28]
**Prepared By:** [Claude Code / Design Team]
**Approved By:** [CTO / Design Lead]
```

---

## Rollback Strategy (Emergency)

If critical issues discovered during Week 2–4:

**Option 1: Feature Flag (Seconds)**
- Disable D3 via environment variable
- All users see Curated default
- Toggle becomes grayed out or hidden
- Cost: Environment redeploy (2–5 min)

**Option 2: Code Rollback (Minutes)**
- Revert Phase 6.1 changes (3 files, 125 LOC)
- Remove analytics events (optional)
- Rebuild frontend
- Cost: 3–5 minutes

**At ANY point:** If revert_rate >60% (6 in 10 users abandon) or error_rate >10%, pause monitoring and evaluate rollback immediately (don't wait for Week 4).

---

## What Stays Static (Even During Monitoring)

✅ **Never change during Phase 6.2:**
- Curated (API) default behavior
- Database schema (x, y, z persistence)
- API position payloads
- Node/project taxonomy
- Semantic filtering logic

D3 affects layout rendering only. Graph semantics, data model, and core UX remain unchanged.

---

## Communication Plan

**Weekly Updates (Internal):**
- Adoption % (daily snapshot)
- p95 convergence (rolling 7-day)
- Any reported issues
- Design team spot-check results

**User-Facing:**
- ✓ "Dynamic (Experimental)" label stays in UI
- ✓ Clear expectation that feature may change/improve
- ✓ Feedback encouraged (GitHub issues)
- ✗ No marketing/announcement until Phase 6.3 (post-gate pass)

**Decision Communication:**
- Day 28: Final report presented
- PASS: "Rolling out D3 to more users in Phase 6.3"
- FAIL: "D3 remains experimental; thank you for feedback"

---

## Success Criteria Summary

**Phase 6.2 succeeds if:**
- ✅ Adoption ≥10%
- ✅ Revert ≤30%
- ✅ p95 convergence ≤500ms
- ✅ Complaint rate ≤5%
- ✅ Zero correctness regressions
- ✅ Design team thumbs-up

**Phase 6.2 fails gracefully if:**
- ⚠️ Any criterion misses: document findings, keep experimental forever (no forced migration)
- ⚠️ Users benefit from D3 even if not hitting all gates: acceptable outcome

---

**Ready to Monitor:** Phase 6.1 deployment complete. Metrics collection can begin Day 1.

---

## Appendix: Analytics Event Reference

**Phase 6.1 Events Available for Monitoring:**

1. **layout_mode_changed**
   - Fired: When user toggles layout mode
   - Payload: from_mode, to_mode, visible_node_count, visible_project_count
   - Use: Adoption % (count to_mode='d3'), Revert % (count from_mode='d3' to_mode='api')

2. **layout_convergence_measured**
   - Fired: When D3 simulation completes
   - Payload: convergence_ms, iteration_count, final_velocity, converged
   - Use: Performance (p95 of convergence_ms)

3. **layout_error**
   - Fired: When D3 simulation fails
   - Payload: error_reason, fallback_mode (always 'api')
   - Use: Complaint rate (count errors / total D3 sessions)

All events logged locally to console (Phase 3.6 searchAnalytics logger) and optionally to PostHog (Phase 3.8 integration) if VITE_POSTHOG_KEY set.

---

**Prepared:** 2026-03-13
**Review Schedule:** Days 7, 14, 21, 28
