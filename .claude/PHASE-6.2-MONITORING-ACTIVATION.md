# PHASE 6.2 MONITORING ACTIVATION

**Deployment Date (Day 0):** ________
**Week 1 Start Date (Day 1):** ________
**Monitoring Owner (PM):** ________

---

## PRE-MEASUREMENT CHECKLIST (Day 0)

### Analytics Sink Verification
- [ ] PostHog account accessible
- [ ] `VITE_POSTHOG_KEY` configured in production
- [ ] Real-time events dashboard open
- [ ] Event names confirmed:
  - [ ] `layout_mode_changed` (adoption tracking)
  - [ ] `layout_convergence_measured` (performance tracking)
  - [ ] `layout_error` (stability tracking)

### Weekly Review Owner Assigned
- [ ] PM identified and confirmed
- [ ] PM has access to PostHog dashboard
- [ ] PM will complete weekly review template every Friday
- [ ] PM understands decision gate criteria (all 6 must pass)

### First Friday Review Scheduled
- [ ] Calendar event created for Week 1 review
- [ ] Date: ________ (Friday of first week)
- [ ] Time: ________ (recommend EOD Friday)
- [ ] Attendees: PM, CTO (optional for Week 1, required Week 4)

### Measurement Window Defined
- [ ] Week 1 (Days 1–7): Baseline collection
- [ ] Week 2–3 (Days 8–21): Pattern analysis
- [ ] Week 4 (Days 22–28): Final aggregation + decision gate
- [ ] Day 29: GO/NO-GO decision

---

## DAY 0–1: DEPLOYMENT & ACTIVATION

### Deployment Execution
- [ ] Phase 6.1 code deployed to production
- [ ] `VITE_LAYOUT_ENGINE_ENABLED=true` confirmed in production
- [ ] Smoke test checklist completed (PASS status)
- [ ] LayoutModeSelector visible on live site
- [ ] PostHog events flowing to dashboard

### Announce to Users (optional, recommended)
- [ ] Email/Slack message: "D3 Dynamic layout now available as experimental opt-in"
- [ ] Link to documentation (if exists)
- [ ] Feedback channel provided (Slack, form, etc.)
- [ ] Set expectation: "This is experimental and subject to change based on user feedback"

### Team Notification
- [ ] Engineering team: Feature live, monitor for errors
- [ ] Product team: Measurement period begins
- [ ] Design team: Feedback period open
- [ ] Exec sponsor: Deployment successful, awaiting metrics

---

## WEEK 1 (Days 1–7): BASELINE COLLECTION

### Real-Time Monitoring (ongoing)
- [ ] Watch PostHog dashboard for errors: `layout_error` count
  - Target: 0 (zero failures expected)
  - Action if >0: Investigate immediately
- [ ] Watch PostHog dashboard for adoption: `layout_mode_changed` count
  - Target: >1 event (at least one user tried D3)
  - Action if 0: Increase user awareness

### Friday Review (Day 5–7)
- [ ] Complete PHASE-6.2-WEEKLY-REVIEW-TEMPLATE.md for Week 1
- [ ] Fill in 6 metrics:
  1. Adoption rate (%)
  2. Revert rate (%)
  3. Error rate (%)
  4. Convergence p95 (ms)
  5. Complaint rate (%)
  6. Correctness (pass/fail)
- [ ] Assess design judgment subjectively
- [ ] Note any immediate blockers or red flags
- [ ] Decision: **CONTINUE** to Week 2 (unless error > 1% or correctness fail)

---

## WEEKS 2–3 (Days 8–21): PATTERN ANALYSIS

### Data Collection
- [ ] PostHog: Aggregate metrics daily (can automated via dashboard export)
- [ ] Slack/Support: Log any user complaints or feedback
- [ ] Manual verification: Spot-check 3 random D3 layouts for visual quality
- [ ] Performance: Check browser DevTools on a few sample selections

### Trend Analysis (Friday of each week)
- [ ] Complete weekly review template
- [ ] Plot adoption over time:
  - Week 1 adoption: ________ %
  - Week 2 adoption: ________ % (trend: ↗ ↘ →)
  - Week 3 adoption: ________ % (trend: ↗ ↘ →)
- [ ] Plot revert rate:
  - Week 2 revert: ________ % (trend: ↗ ↘ →)
  - Week 3 revert: ________ % (trend: ↗ ↘ →)
- [ ] Plot convergence time:
  - Week 2 p95: ________ ms
  - Week 3 p95: ________ ms
- [ ] Error rate and complaint rate remain low?

### Decision at Week 2/3 Review
- [ ] Check decision gate criteria (all 6):
  1. Adoption ≥10%? ☐ YES  ☐ NO
  2. Revert ≤30%? ☐ YES  ☐ NO
  3. Error = 0%? ☐ YES  ☐ NO
  4. p95 convergence ≤500ms? ☐ YES  ☐ NO
  5. Complaints ≤5%? ☐ YES  ☐ NO
  6. Correctness (no regressions)? ☐ YES  ☐ NO
- [ ] **Decision:** CONTINUE to Week 4 OR escalate if ANY fail

---

## WEEK 4 (Days 22–28): FINAL AGGREGATION & DECISION GATE

### Data Finalization
- [ ] Aggregate all 4 weeks of events from PostHog
- [ ] Calculate final 6 metrics (use PHASE-6.2-DECISION-DASHBOARD-SPEC.md)
- [ ] Verify field values:
  - Adoption rate ________%
  - Revert rate ________%
  - Error rate ________%
  - p95 convergence ________ms
  - Complaint rate ________%
  - Correctness ☐ PASS  ☐ FAIL
- [ ] Subjective design judgment ☐ THUMBS UP  ☐ THUMBS DOWN

### Decision Gate Evaluation
```
✓ ALL 6 criteria pass? → PROCEED to Phase 6.3 rollout
✗ ANY 1 criterion fails? → HOLD D3 as permanent experimental feature
```

- [ ] Run decision gate calculation (use PHASE-6.2-WEEK-4-FINAL-DECISION-MEMO.md)
- [ ] Outcome: **PASS** ☐  **FAIL** ☐
- [ ] GO/NO-GO Decision: **GO** ☐  **NO-GO** ☐

### Executive Sign-Off (Day 28–29)
- [ ] Complete PHASE-6.2-WEEK-4-FINAL-DECISION-MEMO.md
- [ ] Share with PM + CTO + Design lead
- [ ] Final decision: GO (Phase 6.3) or NO-GO (stay experimental forever)
- [ ] Document rationale for Phase 7.0+ learnings

---

## POST-PHASE-6.2 ACTIONS

### If PASS → Phase 6.3 Planning
- [ ] Design gradient rollout:
  - Days 1–7: 10% of users default to D3
  - Days 8–14: 50% of users default to D3
  - Days 15+: 100% of users default to D3
- [ ] Prepare rollout communication
- [ ] Continue monitoring during gradient (revert rate, errors, complaints)

### If NO-GO → Keep Experimental
- [ ] Keep LayoutModeSelector visible (opt-in only)
- [ ] Document lessons for Phase 7.0+
- [ ] Decision: Deprioritize D3 or continue research?
- [ ] Archive Phase 6.2 metrics for future reference

---

## CRITICAL ESCALATION RULES (During Weeks 1–4)

### Immediate Rollback Triggers (Don't wait for weekly review)
- [ ] Error rate > 1% → Escalate to CTO within 30 minutes
- [ ] Correctness regression detected → Escalate to CTO immediately
- [ ] p95 convergence > 1000ms → Escalate to CTO within 2 hours
- [ ] Complaint rate > 10% → Escalate to PM + CTO within 4 hours

### Escalation Process
1. **Report finding:** Slack/email with metric, evidence, time
2. **CTO decision (5 min for blockers, 48 hr for holds):**
   - **ROLLBACK:** Execute immediately (env var or code revert, <5 min)
   - **HOLD:** Continue monitoring, investigate root cause
   - **PROCEED:** Continue measurement
3. **Document:** Log escalation in Phase 6.2 review notes

---

## WEEKLY REVIEW CADENCE

Every Friday (or designated review day):
1. Open PHASE-6.2-WEEKLY-REVIEW-TEMPLATE.md
2. Fill in 6 metrics from PostHog dashboard
3. Note any blockers or observations
4. Decision: **CONTINUE** or **ESCALATE**
5. Share with stakeholders
6. Archive filled template for Phase 6.2 final report

---

## SUCCESS CRITERIA (Phase 6.2 Complete)

- [ ] All 4 weeks of data collected
- [ ] Week 4 decision gate evaluated
- [ ] Final decision documented (PASS or NO-GO)
- [ ] Executive sign-off obtained
- [ ] Phase 6.3 or post-experimental plan decided
- [ ] Metrics archived for future phases

**Measurement Window Closed:** ________ (Day 29)

