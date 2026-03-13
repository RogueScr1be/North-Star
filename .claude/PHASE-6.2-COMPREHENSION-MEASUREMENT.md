# PHASE 6.2 EXTENDED GATE — COMPREHENSION METRICS FRAMEWORK

**Principle**: Do not shift D3 to default until we prove it helps users understand the knowledge better.

---

## Decision Gate: 7 Criteria (All Must Pass)

### Technical Criteria (Phases 6.1-6.2)
| # | Criterion | Type | Target | Measurement |
|---|-----------|------|--------|-------------|
| 1 | Adoption rate | Technical | ≥10% | toggle-to-d3 / constellation loads |
| 2 | Revert rate | Technical | ≤30% | toggle-back-to-api / toggle-to-d3 |
| 3 | Error rate | Technical | =0% | layout_error events (Phase 6.1 analytics) |
| 4 | Performance p95 | Technical | ≤500ms | convergence_ms distribution (Phase 6.1 analytics) |
| 5 | Correctness | Technical | Zero regressions | Picking, selection, edges, highlighting work in both modes |
| 6 | Design judgment | Subjective | Thumbs up | Visual quality, layout clarity, aesthetic alignment |

### Comprehension Criterion (NEW - Phase 6.2)
| # | Criterion | Type | Target | Measurement |
|---|-----------|------|--------|-------------|
| 7 | **Comprehension delta** | **Comprehension** | **D3 ≥ Curated** | **See metrics below** |

**Rule**: All 7 criteria must pass. If ANY fails (including comprehension), D3 stays experimental forever.

---

## Comprehension Measurement Strategy

### What We're Measuring
- **Hypothesis**: Users with D3 (dynamic layout) will navigate and understand the graph better than users with Curated (static layout)
- **Test**: Compare comprehension signals between D3 users and Curated users over 4 weeks
- **Success**: D3 signal ≥ Curated signal (neutrality is acceptable for Phase 6.3; degradation triggers no-go)

### Comprehension Signals (4-Week Baseline Collection)

#### Signal 1: Ask-the-Graph Effectiveness (Evidence Engagement)
```
Metric: evidence_click_rate = (evidence_clicked / answers_displayed)

D3 Mode:   Percentage of answers where user clicks cited nodes/projects
Curated:   Same percentage in Curated mode
Target:    D3 signal ≥ Curated signal (user engages more with evidence in D3)

Collection: Track ask_graph_evidence_clicked events from Phase 6.1 analytics
```

**Interpretation**:
- If D3 ≥ Curated: Users find D3 layout helpful for understanding answers
- If D3 < Curated: D3 might obscure evidence or make navigation harder
- If D3 = Curated: Visual layout doesn't affect evidence engagement (neutral)

#### Signal 2: Navigation Flow Efficiency (Multi-Hop Exploration)
```
Metric: avg_hops_to_insight = (edges_traversed_per_session)

D3 Mode:   Average number of node selections before user "gives up" or "understands"
Curated:   Same measurement in Curated mode
Target:    D3 ≤ Curated (users need fewer clicks to understand in D3)

Collection: Derived from selection_mode_changed + layout_convergence_measured events
```

**Interpretation**:
- If D3 < Curated: Users reach understanding faster in D3 (comprehension win)
- If D3 = Curated: No efficiency gain (neutral)
- If D3 > Curated: Users struggle more in D3, need more clicks (comprehension loss)

#### Signal 3: Semantic Filter Adoption (Sophisticated Navigation)
```
Metric: semantic_filter_usage_rate = (sessions_using_filters / total_sessions)

D3 Mode:   % of D3 users who enable subgraph, project clustering, or type/tag filters
Curated:   % of Curated users who enable same filters
Target:    D3 ≥ Curated (D3 users engage deeper with graph structure)

Collection: Count semantic_filter_toggled events per user + layout_mode_changed events
```

**Interpretation**:
- If D3 > Curated: D3 inspires deeper exploration (comprehension signal positive)
- If D3 = Curated: Layout doesn't affect filter usage (neutral)
- If D3 < Curated: D3 users less engaged with semantic controls (concern)

#### Signal 4: Session Duration & Engagement (Time-to-Value)
```
Metric: session_depth = (time_spent_navigating / time_searching)

D3 Mode:   Ratio of navigation time (selection + panning) vs search time
Curated:   Same ratio in Curated mode
Target:    D3 > Curated (users spend more time exploring in D3, less time searching)

Collection: Inferred from event timestamps + selection_mode_changed events
```

**Interpretation**:
- If D3 > Curated: D3 layout invites exploration (comprehension positive)
- If D3 = Curated: No difference in engagement (neutral)
- If D3 < Curated: Users abandon exploration in D3, rely on search (concern)

#### Signal 5: User Satisfaction (Subjective - Opt-in Feedback)
```
Metric: satisfaction_signal = (positive_feedback / total_feedback)

D3 Mode:   Qualitative feedback from users who tried D3
Target:    ≥60% positive ("helps me understand", "clearer", "engaging")

Collection: Email surveys, Slack feedback, in-app feedback widget (if available)
```

**Interpretation**:
- If ≥60% positive: Users report better comprehension in D3
- If <60% positive: Mixed or negative feedback (concern signal)

---

## Measurement Execution (4 Weeks)

### Week 1: Baseline Collection
**Goal**: Establish baseline metrics in both modes

**Daily Monitoring**:
- Track adoption (% toggle-to-d3)
- Monitor error rate (layout_error count)
- Collect convergence times (p95)

**Friday Review**:
- Calculate: evidence_click_rate (D3 vs Curated)
- Calculate: avg_hops_to_insight (early estimate)
- Calculate: semantic_filter_usage_rate (by mode)
- Note any patterns in revert behavior

**Output**: Week 1 Baseline Report

### Week 2-3: Pattern Analysis
**Goal**: Trend comprehension signals; identify divergence between modes

**Ongoing**:
- Plot adoption curve (should stabilize around day 10-15)
- Plot revert rate (users returning to Curated)
- Track convergence time distribution (p50, p95, p99)

**Twice-Weekly Deep Dives**:
- Analyze high-revert cohort: "Why are these users switching back?"
  - Error? → Escalate (error_rate > 0%)
  - Slow convergence? → Check p95 against 500ms threshold
  - Layout confusion? → Design judgment signal (may be no-go)
  - Prefer curated layout? → Expected; still count as comprehension neutral
- Analyze active D3 cohort: "What drives continued use?"
  - Evidence engagement? (Signal 1)
  - Filter usage? (Signal 3)
  - Session duration? (Signal 4)

**Output**: Week 2-3 Trend Analysis Report

### Week 4: Final Aggregation & Decision Gate
**Goal**: Evaluate all 7 criteria; make GO/NO-GO decision for Phase 6.3

**Metrics Aggregation**:
- Adoption rate: (toggle-to-d3 count) / (page load count) = %
- Revert rate: (toggle-back-to-api count) / (toggle-to-d3 count) = %
- Error rate: (layout_error count) / (d3 session count) = %
- Performance p95: percentile(convergence_ms) where convergence=true = ms
- Correctness: Binary (no regressions vs regressions found)
- Design judgment: Subjective assessment (thumbs up / sideways / down)
- **Comprehension delta**: Compare Signal 1-4 (D3 vs Curated)

**Decision Gate Logic**:
```
IF (adoption ≥ 10% AND revert ≤ 30% AND error = 0% AND p95 ≤ 500ms 
    AND correctness = PASS AND design = PASS AND comprehension ≥ baseline)
THEN: GO for Phase 6.3 default shift
ELSE: NO-GO; keep D3 experimental forever
```

**Special Case - All Technical Pass, Comprehension Neutral**:
If technical criteria all pass but comprehension delta = 0:
- **Decision**: GO for Phase 6.3 (visual sophistication doesn't hurt)
- **Rationale**: Users choose D3 for reasons other than comprehension benefit (aesthetics, engagement)
- **Caveat**: Re-evaluate Phase 6.3 if comprehension regresses

**Special Case - Technical Pass, Comprehension Negative**:
If technical criteria pass but users comprehend WORSE in D3:
- **Decision**: NO-GO; keep D3 experimental forever
- **Rationale**: Layout sophistication reduces understanding (comprehension violation)
- **Archive**: Document "visual beauty ≠ comprehension help" finding for future

**Output**: Week 4 Final Decision Memo (per PHASE-6.2-MONITORING-ACTIVATION.md)

---

## Comprehension Metrics Details

### Evidence Click Rate (Signal 1)

**Collection**:
- Phase 6.1 fires: ask_graph_evidence_clicked event
- Payload: {evidence_id, evidence_kind: 'node'|'project', citation_index, layout_mode}
- Count by layout_mode

**Calculation**:
```
D3_evidence_ctr = (ask_graph_evidence_clicked in D3) / (ask_graph_answered in D3)
Curated_ctr = (ask_graph_evidence_clicked in Curated) / (ask_graph_answered in Curated)

Target: D3_ctr ≥ Curated_ctr
```

**Interpretation Table**:
| D3_ctr | Curated_ctr | Result | Comprehension Signal |
|--------|-------------|--------|----------------------|
| 60% | 40% | D3 > Curated | ✅ POSITIVE (users engage more) |
| 45% | 45% | Equal | ⚪ NEUTRAL (no difference) |
| 35% | 50% | D3 < Curated | ❌ NEGATIVE (users less engaged) |

### Average Hops to Insight (Signal 2)

**Collection**:
- Phase 2.6 URL state: ?selected=X
- Phase 6.2A picks layer fires on click
- Count selection events per session

**Calculation**:
```
session_hops = count(distinct selected_id) per session
avg_hops_to_insight_D3 = mean(session_hops) where layout_mode='d3'
avg_hops_to_insight_Curated = mean(session_hops) where layout_mode='api'

Target: avg_hops_to_insight_D3 ≤ avg_hops_to_insight_Curated
```

**Interpretation**:
- If D3 avg 3.2 hops, Curated avg 4.5 hops: D3 wins (30% faster)
- If D3 avg 4.5 hops, Curated avg 4.5 hops: Neutral
- If D3 avg 6.2 hops, Curated avg 4.5 hops: D3 loses (38% slower)

### Semantic Filter Usage Rate (Signal 3)

**Collection**:
Phase 5.5 semantic filter events (if instrumented in Phase 6.2):
- Toggle filter: type, tag, gravity threshold, rel-type, project cluster, subgraph
- Count per user per session
- Tag with layout_mode

**Calculation**:
```
D3_filter_sessions = count(sessions where filter_toggled=true AND layout='d3')
D3_total_sessions = count(sessions where layout='d3')
D3_filter_rate = D3_filter_sessions / D3_total_sessions

Curated_filter_rate = same calc for layout='api'

Target: D3_filter_rate ≥ Curated_filter_rate
```

**Interpretation**:
- If D3 25% use filters, Curated 18%: D3 wins (deeper engagement)
- If D3 20%, Curated 20%: Neutral
- If D3 12%, Curated 20%: D3 loses (users avoid filters in D3)

### Session Duration Ratio (Signal 4)

**Collection**:
Inferred from event timestamps:
- search_executed timestamp
- selection_mode_changed timestamp
- session start/end

**Calculation**:
```
session_navigation_time = sum(time_between(selection_event_i, selection_event_i+1))
session_search_time = sum(time_between(search_event, selection_event))
session_depth = navigation_time / search_time

avg_depth_D3 = mean(session_depth) in D3 mode
avg_depth_Curated = mean(session_depth) in Curated mode

Target: avg_depth_D3 ≥ avg_depth_Curated
```

**Interpretation**:
- If D3 ratio 2.0 (2x more navigation than search), Curated ratio 1.2: D3 wins (exploration)
- If D3 1.5, Curated 1.5: Neutral
- If D3 0.8, Curated 1.5: D3 loses (users search more, navigate less)

---

## Thresholds & Escalation

### Immediate Escalation (Don't Wait for Week 4)
- Error rate > 1%: Investigate immediately; may trigger rollback
- Comprehension regression observed: Flag and investigate
- p95 convergence > 1000ms: May need optimization before Phase 6.3
- Correctness regression: Rollback without hesitation

### Week 4 No-Go Triggers
- Adoption < 10%: Users don't care about D3
- Revert rate > 30%: Users switch back too often
- Error rate > 0%: Stability issue
- p95 > 500ms: Performance doesn't meet target
- Design judgment: Negative feedback on visual quality
- **Comprehension delta negative**: Users understand worse in D3

### Week 4 Go Decision
- All 6 technical criteria: PASS
- Comprehension delta: ≥ baseline (positive or neutral acceptable)
- No escalations triggered

---

## Success Criteria Summary

**Phase 6.2 Success**: All 7 criteria pass + comprehension metrics documented

**Phase 6.3 Readiness**: 
- Deploy D3 as default for new users
- Offer Curated opt-in for users who prefer
- Continue measurement (Phase 6.3 can refine based on Phase 6.2 findings)

**Phase 6.2 Failure** (Any criterion fails):
- Keep D3 as experimental forever
- Archive findings for future reference
- Focus on knowledge governance + comprehension (next priority per user direction)

---

## Key Principle

> Do not default D3 until comprehension metrics prove it helps. Visual sophistication ≠ user value. Measure understanding, not just adoption.

