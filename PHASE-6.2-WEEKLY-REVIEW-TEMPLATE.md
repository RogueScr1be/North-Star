---
name: Phase 6.2 Weekly Review Template
description: Compact weekly monitoring summary for D3 dynamic layout pilot (2-4 week observation period)
type: project
---

# Phase 6.2 — Weekly Review Template

**Week:** [1–4]
**Report Date:** [YYYY-MM-DD]
**Reporting Period:** [Monday–Sunday]
**Data Source:** PostHog + Browser Console Analytics

---

## Executive Summary

**Overall Status:** [ ] 🟢 ON TRACK | [ ] 🟡 WATCH | [ ] 🔴 BLOCKER

**Recommendation:** [ ] Continue monitoring | [ ] Escalate issue | [ ] Proceed to Week 4 decision

---

## Metrics Dashboard

| Metric | Current | Target | Status | Trend |
|--------|---------|--------|--------|-------|
| **Adoption Rate** | __%  | ≥10% | [ ] ✅ PASS [ ] ⏳ LOW [ ] ❌ FAIL | ↑↓ |
| **Revert Rate** | __%  | ≤30% | [ ] ✅ PASS [ ] ⏳ WATCH [ ] ❌ FAIL | ↑↓ |
| **Error Rate** | __% | =0% | [ ] ✅ PASS [ ] ⚠️ ERRORS [ ] ❌ FAIL | ↑↓ |
| **p95 Convergence** | __ms | ≤500ms | [ ] ✅ PASS [ ] ⏳ WATCH [ ] ❌ FAIL | ↑↓ |
| **Complaint Rate** | __%  | ≤5% | [ ] ✅ PASS [ ] ⏳ WATCH [ ] ❌ FAIL | ↑↓ |
| **Correctness** | Binary | No regressions | [ ] ✅ PASS [ ] ⚠️ REGRESSION [ ] ❌ FAIL | — |

---

## Detailed Findings

### 1. Adoption Rate: __%

**Calculation:**
```
(layout_mode_changed events with to_mode='d3') / (constellation canvas loads)
```

**Observations:**
- [ ] Early interest (5–10% of users experimented)
- [ ] Moderate adoption (10–20% active users)
- [ ] High adoption (20%+ daily active users)
- [ ] Flat or declining trend
- **Specific users:** [List prominent early adopters if <50 total]

**Interpretation:**
- Below 10%: Users don't see value yet, OR UI is unclear
- 10–20%: Healthy early adopter signal
- Above 20%: Strong confidence in feature

---

### 2. Revert Rate: __%

**Calculation:**
```
(layout_mode_changed with to_mode='api' AND previous was 'd3') / (total to_mode='d3' events)
```

**Observations:**
- [ ] Users are staying (revert rate < 20%)
- [ ] Mixed feelings (20–30% revert)
- [ ] Quick abandonment (revert rate > 30%)
- **Timing:** When do users revert? (immediately, after 5min, next session?)
- **Correlation:** Any pattern? (revert after errors, or after long convergence?)

**Interpretation:**
- Below 30%: Users gave it a fair shot and like it
- 30–50%: Users tried it, didn't immediately love it (watch)
- Above 50%: Feature isn't resonating; stop here

---

### 3. Error Rate: __%

**Calculation:**
```
(layout_error events) / (layout_convergence_measured events)
```

**Observations:**
- [ ] No errors observed (0%)
- [ ] Isolated errors ([N] instances, likely data-specific)
- [ ] Systemic errors (affects [N]% of D3 sessions)
- **Error types:** [List observed error_reason values]
- **Fallback worked:** Y/N — Did error trigger fallback to API? (should always = Y)

**Interpretation:**
- 0%: Perfect (proceed with confidence)
- <1%: Acceptable (isolated issues, monitor)
- 1–5%: Concerning (investigate root cause)
- >5%: Critical (rollback immediately)

---

### 4. p95 Convergence: __ms

**Calculation:**
```
95th percentile of convergence_ms across all convergence_measured events
```

**Observations:**
- [ ] Median: __ms | Mean: __ms | Max: __ms
- **By graph size:**
  - Subgraph (5–10 nodes): __ms
  - Small (11–20 nodes): __ms
  - Medium (21–50 nodes): __ms
  - Full (50+ nodes): __ms
- **Trend:** Consistent or degrading over week?

**Interpretation:**
- ≤300ms: Excellent, instant feedback
- 300–500ms: Acceptable, user notices slight pause
- 500–1000ms: Borderline (may frustrate users on slow devices)
- >1000ms: Poor (unacceptable, rollback)

---

### 5. Complaint Rate: __%

**Calculation:**
```
(layout_error events + manual support tickets) / (layout_mode_changed to 'd3' events)
```

**Observations:**
- [ ] No complaints
- [ ] [N] manual support tickets received
- [ ] User feedback: [summarize sentiment]
- **Common issues:** [e.g., "layout looks jumbled", "can't find my node", "too slow"]

**Interpretation:**
- ≤5%: Healthy (isolated complaints)
- 5–10%: Watch (pattern emerging)
- >10%: Escalate (rollback likely)

---

### 6. Correctness: PASS / REGRESSION

**Checks (all must pass):**
- [ ] Node/project selection works correctly (picks correct item, panel updates)
- [ ] URL state sync works (back/forward, refresh restores selection)
- [ ] Graph highlighting preserves selection + adjacency (Phase 2.4 working)
- [ ] Semantic filters still apply (Phase 5.5 filtering respected)
- [ ] Zoom/pan smooth (no jank, no z-fighting)
- [ ] Edge display correct (highlighted edges visible, non-selected dim correctly)
- [ ] No visual glitches (nodes overlapping, z-fighting, text render issues)
- [ ] Search → selection → panel flow works (Phase 3.x intact)
- [ ] Ask-the-Graph panel renders correctly with D3 positions

**Regression Observed:** [ ] NO | [ ] YES — [describe]

**Interpretation:**
- All pass: Proceed confidently
- Any fail: Rollback immediately (correctness is non-negotiable)

---

## Design Judgment

**Subjective Assessment (Qualitative):**

**Visual Quality:** [ ] Excellent | [ ] Good | [ ] OK | [ ] Poor

**Comments:**
- Does D3 layout look more natural / less structured than API positions?
- Are nodes well-distributed or clustered problematically?
- Do project anchors read clearly?
- Comparison to Curated layout: [Better / Worse / Same?]

**Overall Recommendation:**
- [ ] Enthusiastic thumbs up 👍
- [ ] Cautiously optimistic 🤔
- [ ] Needs iteration ⚠️
- [ ] Doesn't work ❌

---

## Decision: Can We Proceed?

**Criterion Status:**
- Adoption: [ ] PASS [ ] HOLD [ ] FAIL
- Revert: [ ] PASS [ ] HOLD [ ] FAIL
- Convergence: [ ] PASS [ ] HOLD [ ] FAIL
- Errors: [ ] PASS [ ] HOLD [ ] FAIL
- Correctness: [ ] PASS [ ] HOLD [ ] FAIL
- Design: [ ] PASS [ ] HOLD [ ] FAIL

**Gate Result (all 6 must be ≥ HOLD to continue):**
```
[ ] ALL PASS → Continue to next week (or Week 4 decision if final week)
[ ] SOME PASS → Continue monitoring (address FAIL items)
[ ] ANY CRITICAL FAIL → Escalate for immediate rollback
```

---

## Action Items (This Week)

1. [ ] **If adoption < 10%:** Investigate UI clarity. Is "Dynamic (Experimental)" button visible? Is it clear how to toggle?
2. [ ] **If revert > 30%:** Gather user feedback. Why are users switching back? Survey or manual interviews.
3. [ ] **If convergence > 500ms:** Profile D3 simulation. Are iterations exceeding 500? Reduce max iterations.
4. [ ] **If errors observed:** Capture error logs. Debug specific graph structures causing failures.
5. [ ] **If regressions found:** Rollback immediately via feature flag. Debug in isolated branch.
6. [ ] **If design judgment is poor:** Collect specific feedback (what looks wrong?). May need minor tuning.

---

## Notes for Next Week

[Space for observations, patterns, or blockers to carry forward]

---

## Appendix: Where to Find Raw Data

**PostHog Events:**
```
PostHog Dashboard → Events → Filter by:
- layout_mode_changed
- layout_convergence_measured
- layout_error
```

**Console Analytics (Local Dev):**
```
Browser DevTools → Console → Events logged via SearchAnalyticsLogger
Look for:
- "layout_mode_changed: from_mode=api to_mode=d3"
- "layout_convergence: convergence_ms=266 iteration_count=380"
- "layout_error: error_reason=..."
```

**Percentile Calculation (Excel/Google Sheets):**
```
p95_convergence = PERCENTILE(convergence_ms_array, 0.95)
```

---

## Sign-Off

**Reviewed By:** [Name/Role]
**Date:** [YYYY-MM-DD]
**Next Review:** [YYYY-MM-DD]

---

**Template Version:** 1.0
**Last Updated:** 2026-03-13
