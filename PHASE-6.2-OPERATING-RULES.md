---
name: Phase 6.2 Operating Rules
description: Decision trees, rollback triggers, escalation paths, and authority for Phase 6.2 monitoring
type: project
---

# Phase 6.2 — Operating Rules

**Purpose:** Define clear decision paths for Week 1–4 observation, eliminating ambiguity about when to act.

**Authority:** Product/CTO team. Engineering implements rollback if triggered.

**Escalation:** Any blocker goes to CTO immediately (no waiting for weekly review).

---

## Rule Matrix

### Rule 1: Immediate Rollback (STOP, don't investigate)

**Trigger any of these → ROLLBACK IMMEDIATELY**

```
IF error_rate > 1% (layout_error events excessive)
  → Rollback to API layout immediately (feature flag OFF)
  → Reason: D3 is fundamentally unreliable
  → No further observation needed
  → Preserve all logs for post-mortem

IF correctness_check = ❌ FAIL (any single item fails)
  → Rollback immediately (feature flag OFF)
  → Reason: Phase 2.3–5.7 integrity is non-negotiable
  → Don't wait for confirmation
  → Prioritize fixing the regression before next attempt

IF p95_convergence_ms > 1000ms
  → Escalate to CTO (may rollback or increase timeout)
  → Reason: Performance unacceptable; users perceive layout as broken
  → If no resolution within 48 hours → rollback

IF complaint_rate > 10%
  → Escalate to CTO (users voting with their feet)
  → Reason: Systemic dissatisfaction
  → Rollback likely, unless root cause is UI clarity issue (can be fixed)

IF design_judgment = ❌ FAIL / "doesn't work"
  → Escalate to CTO for architectural review
  → Reason: Visual quality or fundamental issue
  → May rollback or request design iteration
```

**Execution:**
```
1. PM detects blocker
2. PM → CTO: "Immediate rollback triggered (rule 1)"
3. CTO approves rollback via Slack
4. Eng: Feature flag OFF (3 seconds, no code deploy)
5. Verify: constellation loads with API layout
6. Notify: Users that Dynamic (Experimental) is temporarily unavailable
7. Post-mortem: Analyze logs, plan fix
```

**No communication delay. No further metrics. Act immediately.**

---

### Rule 2: Hold and Escalate (Investigate, may rollback)

**Trigger any of these → ESCALATE TO CTO, watch closely**

```
IF adoption_rate < 5% (insufficient interest)
  AND it's Week 1
    → Continue observing (may need more time to discover)
    → Improve UI clarity? "Dynamic (Experimental)" toggle visibility?
    → Check week 2; if still <5%, escalate Week 3

  AND it's Week 3+
    → Escalate: Feature not resonating with users
    → Decision: Keep experimental (accept niche use) OR rollback

IF revert_rate > 50% (majority abandoning)
  → Escalate: Feature has quality issues
  → Decision: Rollback after investigation OR iterate (Phase 6.2b)

IF p95_convergence_ms > 500ms < 1000ms
  AND it's increasing week-over-week
    → Monitor closely
    → Understand: Growing graph size? Subgraph isolation working?
    → If trend continues → escalate for performance optimization

IF complaint_rate > 5% < 10%
  → Escalate: Pattern emerging
  → Gather user feedback: Specific complaints or general dissatisfaction?
  → Decision: Minor UI fix → proceed, OR rollback if no clear fix
```

**Execution:**
```
1. PM detects hold trigger
2. PM → CTO: "[Metric] triggered hold. Investigating..."
3. Gather context: User feedback, graph characteristics, performance profile
4. PM + CTO: Decision within 48 hours
   - Proceed with observation (if clear fix in sight)
   - Rollback (if no path forward)
   - Iterate (Phase 6.2b, if time allows)
5. Communicate decision to team + users
```

**Escalation is not failure.** It's a checkpoint for informed decision-making.

---

### Rule 3: Continue Monitoring (WATCH, collect evidence)

**If not rule 1 or 2 → Continue monitoring this week**

```
IF adoption_rate is 5–10% (early adopters trying it)
  → Status: ON TRACK, observe adoption curve
  → Monitor: Does adoption grow week 2–4?
  → Watch for: Adoption plateau vs continued growth

IF adoption_rate is > 10%
  → Status: ✅ GOOD, adoption gate passing
  → Monitor: Trend (stable or growing?)
  → Watch for: Revert rate (are early adopters staying?)

IF revert_rate is ≤ 30%
  → Status: ✅ GOOD, users giving it a fair shot
  → Monitor: Trend (improving or declining?)
  → Watch for: Any correlation with graph size, node count

IF revert_rate is 30–50%
  → Status: ⏳ WATCH, mixed satisfaction
  → Continue observing Week 2–3
  → Gather feedback: Why do reverts happen?
  → If trending worse → escalate Week 3

IF error_rate is 0%
  → Status: ✅ EXCELLENT, reliability perfect
  → Continue monitoring
  → Watch for: Stays at 0% through full observation

IF error_rate is 0% < 1%
  → Status: ⏳ WATCH, isolated issues
  → Investigate: What graph structures cause errors?
  → Debug: Can we fix specific failures?
  → If trend worsens → escalate; if stays <1% → acceptable

IF p95_convergence_ms is ≤ 500ms
  → Status: ✅ GOOD, performance acceptable
  → Monitor: Trend over weeks
  → Watch for: Degradation as more users adopt

IF p95_convergence_ms is 500–1000ms
  → Status: ⏳ WATCH, borderline acceptable
  → Monitor: Is subgraph isolation helping?
  → Understand: Which graph sizes are problematic?
  → If improving (trend down) → continue; if worsening → escalate

IF complaint_rate is 0–5%
  → Status: ✅ HEALTHY, issue-free
  → Monitor: Trend over weeks
  → Watch for: Any emerging patterns

IF complaint_rate is 5–10%
  → Status: ⏳ WATCH, issues emerging
  → Investigate: Same users complaining or different users?
  → Categorize complaints: Performance? Visual? Correctness?
  → Trend: Getting better or worse?

IF correctness_check = ✅ PASS
  → Status: ✅ EXCELLENT, no regressions
  → Continue weekly verification (risk is always there)
  → Watch for: Late-appearing bugs (weeks 2–4)

IF design_judgment is "good" or "OK"
  → Status: ACCEPTABLE, visual quality reasonable
  → Monitor: Does feedback improve over weeks?
  → If users like it → trend positive; continue
```

**Execution:**
```
1. Fill weekly review template
2. Plot metrics: adoption, revert, convergence, error rate, complaint rate
3. Identify trends: increasing, decreasing, stable?
4. Prepare for Week 4 final decision:
   - Which criteria are closest to failing?
   - What would need to change?
5. Continue monitoring
```

---

### Rule 4: Gate Passage (Week 4 Final)

**All 4 weeks complete → Run final decision gate**

```
PASS ALL 6 CRITERIA?
  adoption_rate ≥ 10%
  revert_rate ≤ 30%
  error_rate = 0%
  p95_convergence_ms ≤ 500ms
  complaint_rate ≤ 5%
  correctness = PASS
  design_judgment = PASS

YES (ALL PASS) → Proceed to Phase 6.3 Gradient Rollout
  Decision: "Evidence supports broader rollout"
  Next steps: Plan 10% → 50% → 100% rollout schedule
  Documentation: Create Phase 6.3 implementation plan
  Timeline: Phase 6.3 starts immediately (days 29+)

NO (ANY FAIL) → Keep D3 as Experimental (Acceptable Outcome)
  Decision: "Evidence doesn't support default shift, but feature has value as opt-in"
  Keep: LayoutModeSelector toggle stays visible
  Users: Can still opt into Dynamic if they want
  Future: Phase 7.0+ can revisit if improvements made
  Timeline: No Phase 6.3 rollout; continue monitoring Phase 7.0 adoption
```

**No partial passes.** All 6 must pass to proceed to Phase 6.3.

---

## Critical Rules (Absolute Guardrails)

### NEVER Do These

```
❌ Don't override decision gate criteria based on "vibes" or preference
   → All decisions data-driven; require evidence

❌ Don't introduce new D3 features during Phase 6.2 monitoring
   → Scope is locked; observe what exists
   → Any new features → Phase 6.3+ (if approved)

❌ Don't add caching/persistence during Phase 6.2
   → D3 positions remain transient (in-memory only)
   → Persistence decisions come later (Phase 6.3+)

❌ Don't shift D3 to default during observation period
   → Curated stays default through Week 4
   → Only Phase 6.3 considers default shift (if all criteria pass)

❌ Don't roll out to >10% users before Phase 6.2 complete
   → Canary rollout starts in Phase 6.3 only
   → Until then: Opt-in only

❌ Don't wait for "perfect" metrics; accept satisfactory ranges
   → adoption_rate ≥ 10% is sufficient (not "need 30%+")
   → revert_rate ≤ 30% is acceptable (users explore, some leave)
   → p95_convergence ≤ 500ms is OK (noticeable but acceptable)

❌ Don't skip correctness verification
   → Even if adoption looks good, one regression = rollback

❌ Don't assume no complaints = zero issues
   → Users may silently revert; silent revert is data, not absence of data
```

---

## Escalation Path

**CTO is decision-maker. PM triggers escalation.**

```
Priority 1 (IMMEDIATE):
  Blocker detected (error_rate > 1%, correctness fail, etc.)
  → PM texts CTO
  → CTO approves rollback
  → Eng executes within 5 min
  → No waiting for weekly sync

Priority 2 (URGENT, within 24 hours):
  Hold trigger (adoption < 5% week 3+, revert > 50%, etc.)
  → PM → CTO Slack message
  → CTO + PM discuss next steps
  → Decision within 48 hours
  → Implement decision or escalate further

Priority 3 (SCHEDULED, weekly):
  Metrics trending wrong but not yet critical
  → Include in Friday weekly review
  → Discuss in regular sync
  → Plan mitigation for next week

Priority 4 (INFORMATIONAL):
  Positive trends, no action needed
  → Report in weekly review
  → Celebrate progress
  → Continue monitoring
```

**Communication Template:**

```
Priority 1:
"[Metric] triggered blocker rule. Rolling back immediately.
Error rate: [X]%. Reason: [brief]. Rollback complete at [time]."

Priority 2:
"[Metric] triggered hold rule. Escalating for decision.
Context: [adoption < 5%, revert > 50%, etc.]
Evidence: [specific data points]
Recommend: [rollback / investigate / iterate]
Decision needed by: [date]"

Priority 3:
"[Metric] trending [wrong/well]. Will resolve by [approach].
Week [N] target: [metric value].
No action needed now; monitoring."

Priority 4:
"[Metric] looking good. Adoption: X%, revert: Y%, convergence: Z ms.
No issues. Continue monitoring."
```

---

## Rollback Procedure (If Triggered)

**Time to complete: 3 seconds**

```
1. CTO approves via Slack: "OK to rollback"
2. Eng finds LayoutModeSelector feature flag in code
3. Flip flag: layoutEngineEnabled = false
4. Rebuild frontend (Vite)
5. Deploy (seconds)
6. Verify: constellation loads with Curated (API) layout by default
7. Confirm: LayoutModeSelector no longer visible
8. Notify: Team + users via [status page / Slack / email]
   Message: "D3 Dynamic layout is temporarily unavailable as we investigate.
             Sorry for the inconvenience. Regular Curated layout is back."
9. Preserve logs for post-mortem analysis
```

**No data loss.** No schema changes needed. Positions persist in database (unchanged).

---

## Authority Matrix

| Decision | Authority | Approval | Timeline |
|----------|-----------|----------|----------|
| Immediate rollback (blocker) | CTO | Verbal (Slack) | <5 min |
| Hold + escalate (investigate) | CTO | Written (Slack) | <48 hours |
| Proceed to Phase 6.3 (all pass) | CTO | Executive review | Day 28 |
| Keep experimental (criteria fail) | CTO | Executive review | Day 28 |
| New D3 features (Phase 6.2) | None — scope locked | N/A | N/A |

---

## Weekly Sync Format

**Every Friday at [TIME]**

```
Attendees: PM, CTO, Design (if available)
Duration: 30 min
Agenda:
  1. (5 min) Metrics summary: adoption, revert, convergence, errors
  2. (10 min) Trend analysis: up/down/stable?
  3. (10 min) Issues: Any blockers, holds, or investigations?
  4. (5 min) Decision: Continue, escalate, or rollback?
  5. (5 min) Action items for next week

Output: Weekly Review Template (filled)
Decision: [ON TRACK | WATCH | BLOCKER]
Next Review: [DATE + TIME]
```

---

## Documentation Artifacts

**Phase 6.2 Monitoring Suite:**
1. ✅ **Weekly Review Template** (PHASE-6.2-WEEKLY-REVIEW-TEMPLATE.md)
2. ✅ **Decision Dashboard Spec** (PHASE-6.2-DECISION-DASHBOARD-SPEC.md)
3. ✅ **Operating Rules** (this file)
4. 📋 **Week 4 Final Review Template** (created Day 28)
5. 📋 **Post-Mortem (if rollback)** (created only if triggered)

---

## Sign-Off

**Rules Version:** 1.0
**Created:** 2026-03-13
**Effective:** From Phase 6.1 deployment (Day 1)
**Review:** Weeks 1–4 (Friday syncs)
**Final Decision:** Day 28 (Week 4 completion)

**Reviewed By:** [CTO Name]
**Approved By:** [Executive]

