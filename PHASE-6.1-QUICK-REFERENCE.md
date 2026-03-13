# PHASE 6.1 — QUICK REFERENCE GUIDE

**Status:** ✅ CODE COMPLETE (Build Verified, Runtime Validation Pending)
**Build:** ✅ PASS (TypeScript 0 errors, Vite 3.34s)
**Release Status:** 🔴 STAGING-READY (Pending Runtime Matrix Execution)
**Files Modified:** 3
**LOC Added:** ~125
**Risk Level:** LOW
**Rollback Time:** <5 minutes

---

## What Changed

### 1. **searchAnalytics.ts** (+40 LOC)
Added three event type interfaces:
- `LayoutModeChangedEvent`
- `LayoutConvergenceMeasuredEvent`
- `LayoutErrorEvent`

Updated `SearchAnalyticsEvent` union to include all three.

**No changes to existing events.**

### 2. **constellationAnalytics.ts** (+65 LOC)
Added three new logging functions:
- `logLayoutModeChanged(fromMode, toMode, visibleNodeCount, visibleProjectCount)`
- `logLayoutConvergenceMeasured(visibleNodeCount, visibleProjectCount, convergenceMs, iterationCount, finalVelocity, converged)`
- `logLayoutError(reason, visibleNodeCount?, visibleProjectCount?)`

Updated imports to include new event types.

**No changes to existing functions.**

### 3. **ConstellationCanvas.tsx** (+45 LOC)
Added:
- New import: Three layout logging functions
- New callback: `handleLayoutModeChange()` — fires layout_mode_changed event before toggling
- New useEffect: Monitors d3PositionsResult and fires convergence/error events
- Updated JSX: LayoutModeSelector now calls handleLayoutModeChange instead of setLayoutEngine

**No changes to existing rendering or state logic.**

---

## Event Payloads

### layout_mode_changed
```typescript
{
  type: 'layout_mode_changed',
  from_mode: 'api' | 'd3',
  to_mode: 'api' | 'd3',
  visible_node_count: number,      // Semantic filter state
  visible_project_count: number,
  timestamp: number
}
```

### layout_convergence_measured
```typescript
{
  type: 'layout_convergence_measured',
  visible_node_count: number,
  visible_project_count: number,
  convergence_ms: number,          // Wall-clock time
  iteration_count: number,         // Simulation ticks
  final_velocity: number,          // Avg velocity at convergence
  converged: boolean,              // Threshold vs maxiter
  timestamp: number
}
```

### layout_error
```typescript
{
  type: 'layout_error',
  error_reason: string,            // 'simulation_failed' | etc
  fallback_mode: 'api',            // Always falls back
  visible_node_count?: number,
  visible_project_count?: number,
  timestamp: number
}
```

---

## Events Fired When

| Event | Fires When | Fired By |
|-------|-----------|----------|
| layout_mode_changed | User toggles Curated/Dynamic | handleLayoutModeChange callback |
| layout_convergence_measured | D3 layout completes | useEffect monitoring d3PositionsResult |
| layout_error | D3 simulation fails | useEffect on error condition |

---

## Testing Checklist

**Quick Smoke Test (< 5 minutes):**
1. npm run dev:full
2. Toggle to Dynamic mode → See event in console
3. Wait for layout → See convergence_measured event
4. Toggle back to Curated → See mode_changed event
5. No TypeScript errors in console

**Full Matrix (15–20 minutes):**
- See PHASE-6.1-VERIFICATION-MATRIX.md

---

## Rollback Steps

If issues found:

```bash
git checkout frontend/src/lib/analytics/searchAnalytics.ts
git checkout frontend/src/lib/analytics/constellationAnalytics.ts
git checkout frontend/src/pages/ConstellationCanvas.tsx
cd frontend && npm run build
```

Done. Phase 6.0 restored, no data loss.

---

## Phase 6.2 Metrics Gate

Phase 6.2 proceeds **ONLY if:**

```
adoption_rate >= 10%        (Users enable Dynamic)
AND
convergence_p95_ms < 500    (Full graph < 500ms)
AND
error_rate = 0%             (No crashes)
AND
zero_regressions            (All prior phases intact)
AND
revert_rate <= 30%          (Users staying)
```

All 5 must pass. If any fails, D3 stays experimental.

---

## Key Files for Reference

| File | Purpose |
|------|---------|
| PHASE-6.1-INSTRUMENTATION-PLAN.md | Technical plan (assumptions, discovery, implementation approach) |
| PHASE-6.1-VERIFICATION-MATRIX.md | Manual test cases (8 scenarios, regression checks) |
| PHASE-6.1-IMPLEMENTATION-REPORT.md | Technical report (changes, metrics, risk assessment, rollback) |
| .claude/CLAUDE.md | Updated with Phase 6.1 summary and lessons learned |

---

## No Changes Needed For:

- ✅ Layout computation (Phase 5.8 d3SimulationEngine untouched)
- ✅ Position rendering (Phase 6.0 CanvasScene logic untouched)
- ✅ Selection/picking (Phase 2.3 mechanics unchanged)
- ✅ Search (Phase 2.8–3.5 unchanged)
- ✅ Semantic filtering (Phase 5.5 unchanged)
- ✅ URL state (Phase 2.6 unchanged)
- ✅ Ask-the-Graph (Phase 4.0 unchanged)
- ✅ Answer citing (Phase 5.7 unchanged)

---

## Console Output Example

After toggling Curated → Dynamic:

```
[SearchAnalytics] layout_mode_changed
{ type: 'layout_mode_changed', from_mode: 'api', to_mode: 'd3', visible_node_count: 50, visible_project_count: 4, timestamp: 1710358800000 }

[SearchAnalytics] layout_convergence_measured
{ type: 'layout_convergence_measured', visible_node_count: 50, visible_project_count: 4, convergence_ms: 267, iteration_count: 381, final_velocity: 0.0089, converged: true, timestamp: 1710358800267 }
```

---

**Ready to test. Questions?** See PHASE-6.1-IMPLEMENTATION-REPORT.md for full details.
