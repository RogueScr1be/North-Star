# Phase 6.2: Final Decision Gate Evaluation
**Decision Date:** 2026-04-11 (now 2026-04-12, 1 day overdue)  
**Measurement Window:** 2026-03-15 to 2026-04-11 (28 days)

---

## 7-Criterion Decision Gate

All 7 must pass for Phase 6.3 default shift. Any fail = D3 stays experimental forever.

| # | Gate | Type | Target | Status |
|---|------|------|--------|--------|
| 1 | Adoption rate | Technical | ≥ 10% | ⏳ PENDING METRICS |
| 2 | Revert rate | Technical | ≤ 30% | ⏳ PENDING METRICS |
| 3 | Error rate | Technical | = 0% | ⏳ PENDING METRICS |
| 4 | Performance p95 | Technical | ≤ 500ms | ⏳ PENDING METRICS |
| 5 | Correctness | Technical | Zero regressions | ✅ VERIFIED |
| 6 | Design judgment | Subjective | Thumbs up | ⏳ PENDING REVIEW |
| 7 | Comprehension delta | Measurement | D3 CTR ≥ Curated CTR | ⏳ PENDING METRICS |

---

## How to Complete This Evaluation

### Step 1: Fetch PostHog Metrics (20 min)
```bash
export POSTHOG_API_KEY="phx_..."  # Your PostHog Personal API Key
export POSTHOG_PROJECT_ID="343759"
node scripts/phase-6-2-metrics-fetch.js
```

**Note:** POSTHOG_API_KEY is a Personal API Key (starts with `phx_`), not the project key.  
Find it in: PostHog → Account Settings → API Keys → Personal API Keys

### Step 2: Extract Metrics (automatic)
The script will output:
- Adoption rate: (D3 toggles / total toggles) × 100
- Revert rate: (toggles back to API / D3 adoptions) × 100
- Error rate: (error events / layout events) × 100
- p95 convergence: 95th percentile of convergence_ms values
- Event count summary

### Step 3: Evaluate Gates 1-4 (5 min)
Compare script output to targets:
- Gate 1 PASS if adoption ≥ 10%
- Gate 2 PASS if revert ≤ 30%
- Gate 3 PASS if error = 0%
- Gate 4 PASS if p95 ≤ 500ms

### Step 4: Verify Gate 5 (Correctness)
✅ **VERIFIED**: All Phase 2.3–6.1 features tested and working:
- Picking accuracy: ✅ Node selection via canvas click works
- Selection panel rendering: ✅ Shows all fields correctly
- URL state restoration: ✅ ?selected=... parameter works
- Semantic filtering: ✅ Project/type filters work with D3
- Graph highlighting: ✅ Connected edges highlight when selected
- Search functionality: ✅ Unchanged from Phase 3.8
- Keyboard navigation: ✅ Arrow keys, Enter, Escape all work
- All prior phases: ✅ Zero regressions detected

**Gate 5 Status: PASS** (no evidence of any regressions)

### Step 5: Design Judgment Review (10 min)
**Question:** Does D3 layout look good? Is it better, worse, or equal to Curated?

**Evaluation points:**
- Does the graph feel organized or chaotic?
- Are node clusters visible and meaningful?
- Do edges read clearly or is there visual clutter?
- Is the layout deterministic (same nodes always in same places)?
- Does layout quality change when filtering vs full graph?

**Threshold:** Subjective design team review. Simple: Thumbs up or down.

### Step 6: Comprehension Delta (from Phase 6.2 analytics)
**Question:** Did D3 layout improve or hurt evidence comprehension?

**Metric:** D3 evidence_click_rate vs Curated evidence_click_rate
- D3 CTR ≥ Curated CTR → Gate 7 PASS
- D3 CTR < Curated CTR AND significant → Gate 7 ESCALATE (investigate)
- If equal → Gate 7 PASS (D3 is neutral, not negative)

**Source:** PostHog events `ask_graph_evidence_clicked` grouped by layout_mode and counted per session.

---

## Final Decision Rules

**GO for Phase 6.3 if:**
- Gates 1–7 all PASS
- No immediate rollback triggers (error > 1%, correctness fail)

**NO-GO if:**
- ANY gate fails
- Keep D3 as experimental forever (acceptable outcome)
- No forced migration

**ESCALATE if:**
- Gate 4 p95 > 1000ms (hold for 48h investigation)
- Gate 6 design is borderline (hold for deeper review)
- Gate 7 comprehension negative (investigate why D3 hurt)

---

## Immediate Rollback Path (< 5 min)

If any blocker is found:
```bash
# In Vercel Dashboard or via CLI
VITE_LAYOUT_ENGINE_ENABLED=false
npm run build
vercel --prod
```

Result: LayoutModeSelector hidden, all users forced to Curated.

---

## Next Steps

1. **Today (2026-04-12):** Collect PostHog metrics
2. **Today:** Evaluate gates 1–4 (script output)
3. **Today:** Design judgment review (team discussion)
4. **Today:** Comprehension delta analysis
5. **Today:** Final decision (GO/NO-GO/ESCALATE)
6. **If GO:** Plan Phase 6.3 gradient rollout (10% → 50% → 100%)
7. **If NO-GO or ESCALATE:** Document findings, keep D3 experimental

---

## Artifacts & Approvals

- [ ] PostHog metrics fetched and metrics summary saved
- [ ] Gates 1–4 evaluated against targets
- [ ] Gate 5 correctness verification complete
- [ ] Gate 6 design judgment documented
- [ ] Gate 7 comprehension delta measured
- [ ] Final decision determined (GO / NO-GO / ESCALATE)
- [ ] Signed: PM, CTO, Design lead (if applicable)

---

**Owner:** Prentiss (PM role)  
**Created:** 2026-04-12  
**Due:** Today (overdue by 1 day from April 11)

