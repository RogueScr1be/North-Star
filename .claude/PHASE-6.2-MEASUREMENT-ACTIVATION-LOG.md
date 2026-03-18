# PHASE 6.2 MEASUREMENT ACTIVATION LOG

**Deployment Date**: 2026-03-13  
**Deployment Commit**: a2844ed  
**Status**: ✅ READY TO MEASURE

---

## Measurement Activation Checklist

### Pre-Measurement Setup (Before Day 1)
- [ ] Production deployment completed (dist/ pushed)
- [ ] VITE_LAYOUT_ENGINE_ENABLED=true confirmed in production .env
- [ ] LayoutModeSelector visible in production
- [ ] Kill switch tested (set VITE_LAYOUT_ENGINE_ENABLED=false locally, verified feature disables)
- [ ] PostHog or console analytics sink verified working
- [ ] Phase 6.2 monitoring owner assigned
- [ ] Week 1 baseline collection procedures prepared

### Analytics Events to Monitor (Phase 6.1)

#### Event 1: layout_mode_changed
- Fires when user clicks LayoutModeSelector toggle
- Payload: {from_mode, to_mode, visible_node_count, visible_project_count}
- Use for adoption tracking: count(to_mode='d3') / count(total toggles)

#### Event 2: layout_convergence_measured
- Fires after D3 layout finishes converging
- Payload: {convergence_ms, iteration_count, final_velocity, converged}
- Use for performance tracking: percentile(convergence_ms) where converged=true

#### Event 3: layout_error
- Fires if D3 simulation fails or error occurs
- Payload: {error_reason, fallback_mode='api'}
- Use for error tracking: count(layout_error) = 0 is success

#### Event 4: ask_graph_evidence_clicked (Phase 4.0)
- Existing event; use for comprehension Signal 1
- Payload: {evidence_id, evidence_kind, citation_index, layout_mode}
- Measure: evidence_click_rate by layout_mode (D3 vs Curated)

---

## 4-Week Measurement Timeline

### Week 1 (Days 1-7): Baseline Collection
**Daily Monitoring**:
- Track adoption rate: (layout_mode_changed to 'd3') / (page loads)
- Track error rate: (layout_error events) / (d3 sessions)
- Track convergence times: p50, p95, p99 of convergence_ms

**Friday (Day 5) Review**:
- Output: Week 1 Baseline Report (adoption %, error count, convergence p95)
- Calculate: evidence_click_rate (D3 vs Curated) [Signal 1]
- Note any early patterns in revert behavior

**Success Criteria for Week 1**:
- Adoption rate trending ≥10%? (aim for 15-20% by week end)
- Error rate = 0%? (any errors require investigation)
- Convergence p95 <500ms? (performance on target)

### Weeks 2-3 (Days 8-21): Pattern Analysis
**Twice-Weekly Deep Dives**:
- High-revert cohort analysis: Why do users switch back?
  - Error? → Escalate (error_rate > 0% triggers immediate review)
  - Performance? → Check p95 against 500ms threshold
  - Layout confusion? → Design judgment signal
- Active D3 cohort analysis: What drives continued use?
  - Evidence engagement? [Signal 1]
  - Semantic filter usage? [Signal 3]
  - Session duration? [Signal 4]

**Output**: Weeks 2-3 Trend Report (adoption curve, revert patterns, performance distribution)

### Week 4 (Days 22-28): Final Decision Gate
**Friday (Day 28) Final Evaluation**:
- Aggregate all 7 criteria:
  1. Adoption ≥10%?
  2. Revert ≤30%?
  3. Error = 0%?
  4. Performance p95 ≤500ms?
  5. Correctness: Zero regressions?
  6. Design judgment: Thumbs up?
  7. Comprehension delta ≥ baseline? [Signals 1-4]
- Decision gate logic:
  ```
  IF (all 6 technical = PASS AND comprehension ≥ baseline)
  THEN: GO for Phase 6.3 default shift
  ELSE: NO-GO; keep D3 experimental forever
  ```

**Output**: Week 4 Final Decision Memo (per template)

---

## Comprehension Measurement (Phase 6.2 New)

### Signal 1: Evidence Click Rate
```
D3_evidence_ctr = (ask_graph_evidence_clicked in D3) / (ask_graph_answered in D3)
Curated_ctr = (ask_graph_evidence_clicked in Curated) / (ask_graph_answered in Curated)
Target: D3_ctr ≥ Curated_ctr
```

### Signal 2: Average Hops to Insight
```
avg_hops_D3 = mean(distinct selections per session) in D3 mode
avg_hops_Curated = mean(distinct selections per session) in Curated mode
Target: avg_hops_D3 ≤ avg_hops_Curated (users need fewer clicks in D3)
```

### Signal 3: Semantic Filter Adoption
```
filter_rate_D3 = (sessions_with_filter_toggle / total_D3_sessions)
filter_rate_Curated = (sessions_with_filter_toggle / total_Curated_sessions)
Target: filter_rate_D3 ≥ filter_rate_Curated (D3 inspires deeper exploration)
```

### Signal 4: Session Engagement Ratio
```
engagement_ratio_D3 = (navigation_time / search_time) in D3 mode
engagement_ratio_Curated = (navigation_time / search_time) in Curated mode
Target: engagement_ratio_D3 ≥ engagement_ratio_Curated (D3 invites exploration)
```

---

## Critical Escalation Rules

### Immediate Action (Don't Wait for Weekly Review)
- **Error rate > 1%**: Investigate + may trigger rollback
- **Comprehension regression observed**: Flag immediately
- **p95 convergence > 1000ms**: Performance degradation
- **Correctness regression**: Rollback without hesitation

### No-Go Triggers (Week 4)
- Adoption < 10%
- Revert rate > 30%
- Error rate > 0%
- p95 > 500ms
- Design judgment: Negative
- **Comprehension delta negative**: Users understand worse in D3

---

## Measurement Infrastructure

### Data Sources
- PostHog (if remote analytics enabled) OR console logs (if local)
- URL state (?selected=X) for selection tracking
- Event timestamps for session duration
- Manual user feedback (Slack, email, in-app surveys)

### Weekly Review Meeting
- Owner: [PM role]
- Attendees: Product, Design, Engineering
- Agenda: Baseline/trends/decision gate
- Output: Signed report (one per week)

---

## Success Criteria

**Phase 6.2 Success**: All 7 criteria pass + comprehension metrics documented

**Phase 6.3 Readiness**:
- IF all 6 technical pass AND comprehension ≥ baseline
- THEN: Proceed with default shift (optional Phase 6.3)
- ELSE: Keep D3 experimental forever (acceptable outcome)

**Key Principle**:
> Do not default D3 until comprehension metrics prove it helps. Visual sophistication ≠ user value. Measure understanding, not just adoption.

---

**Day 0 (Deployment)**: 2026-03-13 (Phase 6.1 live on Vercel)
**Day 1 (Baseline Start)**: 2026-03-14 ← MEASUREMENT WINDOW OPEN
**Measurement Period**: 4 weeks (Days 1–28)
**Week 1 Review Date**: 2026-03-21 (Friday)
**Week 2 Review Date**: 2026-03-28 (Friday)
**Week 3 Review Date**: 2026-04-04 (Friday)
**Final Decision Date**: 2026-04-11 (Day 29, Friday)
**Owner**: Prentiss (PM + founder role)
**Rollback Contact**: Prentiss — set VITE_LAYOUT_ENGINE_ENABLED=false in Vercel env, redeploy (~5 min)
**Status**: 🟡 ACTIVE (INTERNAL-ONLY) — window open, remote sink not yet connected
**Classification**: INTERNAL-ONLY MEASUREMENT (events fire to console; PostHog SDK commented out)
**Blocker to TRUE LIVE**: Uncomment PostHog SDK in index.html + set VITE_POSTHOG_KEY in Vercel env vars

