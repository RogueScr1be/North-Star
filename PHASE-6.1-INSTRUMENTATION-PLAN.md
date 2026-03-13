# PHASE 6.1 — D3 RUNTIME VALIDATION + INSTRUMENTATION PLAN

**Date:** 2026-03-13
**Status:** PLANNING
**Goal:** Validate D3 experimental layout path with minimal instrumentation
**Scope:** Analytics events, convergence measurement, runtime guards, feature flag support
**Blast Radius:** Minimal (<150 LOC net, 2-3 files modified)

---

## 1. ASSUMPTIONS

### Explicit Assumptions
- ✅ Phase 6.0 layout switching (Curated/Dynamic) fully implemented
- ✅ useD3Force hook returns positions correctly when enabled
- ✅ Semantic filters work independently of layout engine
- ✅ D3 positions are 2D [x, y], API positions are 3D [x, y, z]
- ✅ d3SimulationEngine.runD3Simulation() returns metrics (convergenceTimeMs, iterationCount, finalVelocity, converged)
- ✅ SearchAnalyticsLogger interface supports new event types
- ✅ All selection, search, URL sync, filtering work in both modes

### Unverified Assumptions (To Validate in Phase 6.1)
- ❓ D3 convergence is deterministic (same graph → ~same layout every run)
- ❓ Layout toggle is responsive (< 100ms perception)
- ❓ No data loss or state corruption on toggle
- ❓ Large graphs (100+ nodes) converge in acceptable time
- ❓ Picking/selection accuracy identical in both modes

### Required Validations
1. **Runtime correctness**: Toggle works, positions render, no crashes
2. **Analytics quality**: Events fire correctly, no data leakage
3. **Convergence metrics**: Timing/iteration counts accurate
4. **Regression surface**: Zero impact on prior phases (2.3–6.0)
5. **Fallback behavior**: Graceful revert if D3 fails

---

## 2. DISCOVERY FINDINGS

### Code Structure (Verified)

**Phase 6.0 Implementation:**
- `ConstellationCanvas.tsx`: Manages `layoutEngine` state, passes to CanvasScene
- `CanvasScene.tsx`: Branches `NodesPoints`, `ProjectsPoints` rendering by layoutEngine
- `useD3Force.ts`: Hook that calls `runD3Simulation()` with semantic visibility
- `d3SimulationEngine.ts`: Computes layout + metrics (convergenceTimeMs, iterationCount, finalVelocity, converged)
- `LayoutModeSelector.tsx`: UI toggle (Curated/Dynamic)
- `SearchAnalytics.ts`: Event types + logger interface (ready for new events)
- `ConstellationAnalytics.ts`: Helper functions for constellation events

**Analytics Ready:**
- Event type union in searchAnalytics.ts (can extend)
- Logger interface allows new event types without changes
- ConstellationAnalytics.ts can add new log functions

**D3 Metrics Available:**
- `convergenceTimeMs`: Wall-clock time (ms)
- `iterationCount`: Number of simulation ticks
- `finalVelocity`: Average velocity at convergence
- `converged`: Boolean (true = converged, false = hit maxIterations)

### Files Involved

**Files to Read (Understanding Phase 6.0):**
1. ✅ ConstellationCanvas.tsx (layoutEngine state, useD3Force hook call)
2. ✅ CanvasScene.tsx (position branching logic)
3. ✅ useD3Force.ts (hook, error handling)
4. ✅ d3SimulationEngine.ts (metrics computation)
5. ✅ searchAnalytics.ts (event types, logger interface)
6. ✅ constellationAnalytics.ts (helper functions)
7. ✅ LayoutModeSelector.tsx (UI)

**Files to Modify (Phase 6.1):**
1. `searchAnalytics.ts` — Add layout_mode_changed, layout_convergence event types
2. `constellationAnalytics.ts` — Add logLayoutModeChanged() and logLayoutConvergenceMeasured() functions
3. `ConstellationCanvas.tsx` — Fire events on layout toggle + pass convergence metrics

**Files to Create (Optional):**
- `layoutFlagConfig.ts` — Simple feature flag (if desired)

### Regression Surface

**Low-risk areas (no changes):**
- Selection/picking logic (unchanged, works in both modes)
- Search (unchanged, position-independent)
- Semantic filtering (unchanged, applies before layout)
- URL state (unchanged, selection restored in both modes)
- Camera/zoom (unchanged, works with any positions)

**Medium-risk areas (branching):**
- Position sourcing in CanvasScene (API vs D3) — already implemented in Phase 6.0
- Layout toggle behavior — already tested in Phase 6.0
- useD3Force hook error handling — already implemented

**Analytics surface (new):**
- New event types don't affect existing events
- Pluggable logger handles new types seamlessly
- No changes to event firing for prior phases

---

## 3. IMPLEMENTATION PLAN

### A. Analytics Events (4 types)

```typescript
// Add to searchAnalytics.ts union and interfaces

interface LayoutModeChangedEvent {
  type: 'layout_mode_changed';
  from_mode: 'api' | 'd3';
  to_mode: 'api' | 'd3';
  visible_node_count: number;      // Current semantic filter state
  visible_project_count: number;
  session_id?: string;             // Optional: user/session id if available
  timestamp: number;
}

interface LayoutConvergenceMeasuredEvent {
  type: 'layout_convergence_measured';
  layout_mode: 'd3';               // Only fired for D3 mode
  visible_node_count: number;
  visible_project_count: number;
  convergence_ms: number;          // Wall-clock time
  iteration_count: number;         // Ticks before convergence
  final_velocity: number;          // Average velocity at settle
  converged: boolean;              // Hit threshold vs maxIterations
  timestamp: number;
}

interface LayoutErrorEvent {
  type: 'layout_error';
  layout_mode: 'd3';
  error_message: string;           // E.g., "Simulation failed", "No positions returned"
  fallback_to: 'api';              // Always fallback to API
  timestamp: number;
}
```

**Event Payload Philosophy:**
- Only safe, non-sensitive fields (counts, timing, booleans)
- No graph topology (that's in graph data)
- No user query/selection data (separate event stream)
- Convergence metrics useful for performance decision gate (Phase 6.1)

### B. Convergence Measurement (Scope: Well-Defined)

**Definition of Convergence (from d3SimulationEngine.ts):**
```
Simulation converged = average node velocity < 0.01 (default threshold)
                       OR iteration count = 500 (max, arbitrary limit)
```

**Measurement points:**
- D3 layout computation starts: `useD3Force` hook enabled
- D3 layout computation ends: `runD3Simulation()` returns
- Metrics extracted from `D3SettledPositions.metrics`

**Availability:**
- Convergence metrics already in Phase 6.0 D3 output
- Just need to pass them up and fire event in ConstellationCanvas

### C. Runtime Guardrails (Already Mostly in Place)

**Phase 6.0 has:**
- ✅ useD3Force returns null if disabled or data unavailable
- ✅ useD3Force try/catch around runD3Simulation()
- ✅ CanvasScene fallback (if no D3 positions, use API)
- ✅ Manual position validation in NodesPoints (fallback if d3Pos not found)

**Phase 6.1 Adds:**
- Fire layout_error event if D3 fails
- Log reason (simulation error, no data, etc.)
- Ensure fallback to API is transparent to user

**No Changes Needed** (already robust):
- Error handling in useD3Force
- Fallback logic in CanvasScene

### D. Optional Feature Flag Support

**Simple pattern (no framework):**
```typescript
// layoutFlagConfig.ts (new, ~20 LOC)
export function isD3LayoutExperimentalAllowed(): boolean {
  // Check env var (development only)
  if (typeof window !== 'undefined' && (window as any).__D3_EXPERIMENT_ENABLED__) {
    return true;
  }
  // Check URL param (?d3-experiment=1)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.has('d3-experiment');
  }
  return false;
}
```

**Alternative: Just use state (Phase 6.0 already does this)**
- LayoutModeSelector is always visible
- User can toggle anytime
- Preference not persisted (localStorage deferred to Phase 6.2)

**Recommendation:** Skip feature flag in Phase 6.1
- Complexity not warranted yet
- LayoutModeSelector provides UI gating
- Phase 6.2 can add persistence + conditional visibility

### E. Verification Scope (Test Matrix)

**Manual test matrix (6 scenarios):**
1. Toggle Curated → Dynamic (should render D3 layout)
2. Toggle Dynamic → Curated (should return to API layout)
3. Node selection works in both modes
4. Search → selection works in both modes
5. Semantic filtering works in both modes
6. URL persistence works in both modes

**Metrics capture (Phase 6.1 only):**
- Convergence time (should be < 500ms for full graph)
- Iteration count (should be < 400 for full graph)
- Final velocity (should be < 0.01 for converged)
- Zero errors logged

**Regression checks:**
- All Phase 2.3–6.0 features still work
- Zero new TypeScript errors
- Build succeeds
- No performance degradation

---

## 4. Implementation Steps (Ordered)

**Step 1: Add event type interfaces to searchAnalytics.ts**
- LayoutModeChangedEvent
- LayoutConvergenceMeasuredEvent
- LayoutErrorEvent
- Update SearchAnalyticsEvent union type

**Step 2: Add helper functions to constellationAnalytics.ts**
- `logLayoutModeChanged(from, to, visibleNodeCount, visibleProjectCount)`
- `logLayoutConvergenceMeasured(metrics, visibleNodeCount, visibleProjectCount)`
- `logLayoutError(errorMessage, fallbackTo)`

**Step 3: Modify ConstellationCanvas.tsx**
- Fire `logLayoutModeChanged()` in setLayoutEngine callback
- Extract convergence metrics from d3PositionsResult
- Fire `logLayoutConvergenceMeasured()` when D3 layout complete
- Fire `logLayoutError()` if d3PositionsResult.error is set

**Step 4: Optional fallback logic (if not already robust)**
- Verify useD3Force error handling
- Verify CanvasScene fallback to API
- Add defensive null checks

**Step 5: Manual verification**
- Toggle layout modes
- Check console for events
- Check regressions

---

## 5. Expected Outcomes

### Files Modified
- `frontend/src/lib/analytics/searchAnalytics.ts` — +40 LOC (event interfaces)
- `frontend/src/lib/analytics/constellationAnalytics.ts` — +50 LOC (log functions)
- `frontend/src/pages/ConstellationCanvas.tsx` — +30 LOC (event firing)
- **Total: ~120 LOC net**

### New Analytics Events Fired
- `layout_mode_changed`: When user toggles (2–3 per session typical)
- `layout_convergence_measured`: When D3 layout completes (~1 per toggle to D3)
- `layout_error`: Only on D3 failure (should be 0 in stable builds)

### Metrics Available for Phase 6.1 Gate
- Adoption rate: % of toggles to D3 (from mode_changed event count)
- Convergence distribution: Timing data (Phase 6.1 success criterion)
- Revert rate: % of users who toggle back to Curated
- Error rate: % of layout_error events (should be 0)

### Rollback Cost
- <5 minutes (revert 3 files, delete any new files, rebuild)
- No schema/API changes
- No breaking changes to existing code

---

## 6. Risk Assessment

**Low Risk:**
- ✅ Event interfaces are additive (no breaking changes)
- ✅ Helper functions are pure (no side effects)
- ✅ Event firing is decoupled from rendering
- ✅ Pluggable logger handles new events seamlessly

**Medium Risk:**
- ⚠️ Convergence metrics timing accuracy (depends on performance.now() precision, usually fine)
- ⚠️ Event payload shape must match logger expectations (mitigated by type definitions)

**Mitigation:**
- Minimal code changes (only event firing)
- No changes to layout computation or rendering
- No new dependencies
- Phase 6.0 robustness carries forward

---

## 7. Decision Gates for Phase 6.2

**Proceed to broader rollout ONLY if ALL criteria pass:**

```
1. Adoption rate >= 10%          (At least some users trying D3)
   AND
2. Convergence p95 < 500ms       (Performance acceptable)
   AND
3. Error rate = 0%               (No crashes/failures)
   AND
4. Zero regressions              (All prior phases intact)
   AND
5. Revert rate <= 30%            (Users mostly staying)
```

If any fails: Keep D3 as experimental opt-in forever (acceptable outcome).

---

**Next:** Proceed to Step 4 (Implementation).
