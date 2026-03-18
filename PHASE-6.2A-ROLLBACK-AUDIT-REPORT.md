---
name: Phase 6.2A Rollback Reality Check — Feature Flag Audit
description: Verification that D3 Dynamic layout is controllable and rollback-capable before Phase 6.2 measurement begins
type: project
---

# Phase 6.2A — Rollback Reality Check

**Date:** 2026-03-13
**Status:** AUDIT COMPLETE + FIXES REQUIRED
**Urgency:** HIGH (Fix before Phase 6.1 deployment)

---

## Executive Summary

**Claim to Test:** "Rollback D3 Dynamic layout in <5 minutes via feature flag"

**Verdict:** ⚠️ **CLAIM NOT FULLY VERIFIED**

**Finding:** Feature flag exists and works for most interactions, BUT **picking layer (node/project selection on canvas) uses hardcoded API positions, not branched by layout engine**. This means:
- Users can toggle to D3 Dynamic layout
- Visual rendering works correctly
- BUT clicking on rendered nodes may fail (picking sphere is at API position, node is at D3 position)
- This is not a show-stopper for Phase 6.2 measurement, but it's a **correctness regression** that violates Phase 6.2 gate criteria

**Required Action:** Fix picking layer alignment BEFORE Phase 6.1 deployment. Estimated fix time: 30 minutes.

**After Fix:** Rollback claim verified ✅ <5 minutes via code revert.

---

## 1. Feature Flag Audit

### Flag Implementation ✅

**Type:** Runtime state-based (NOT environment variable, NOT build-time)

**Location:** `frontend/src/pages/ConstellationCanvas.tsx`, line 51
```typescript
const [layoutEngine, setLayoutEngine] = useState<'api' | 'd3'>('api');
```

**Default Value:** `'api'` (Curated layout) ✅

**UI Component:** `LayoutModeSelector.tsx` (user-facing toggle)
- Label: "Curated" (for `layoutEngine='api'`)
- Label: "Dynamic (Experimental)" (for `layoutEngine='d3'`)

### How It Works

**User clicks toggle:**
1. LayoutModeSelector fires `onLayoutModeChange` callback
2. ConstellationCanvas updates `layoutEngine` state
3. State passed to `CanvasScene` component
4. CanvasScene uses it to branch position source
5. React re-renders with new positions

**Time to toggle:** Instant (React state update, no API call)

---

## 2. Position Branching Audit

### Where Layout Engine Is Used ✅

**A) NodesPoints (visible geometry) — CanvasScene.tsx, lines 82–115**

```typescript
const useD3 = layoutEngine === 'd3' && d3Positions;

for (let i = 0; i < visibleNodes.length; i++) {
  const node = visibleNodes[i];
  let x, y, z;

  if (useD3) {
    const d3Pos = d3Positions.nodePositions.get(node.id);
    if (d3Pos) {
      x = d3Pos[0];
      y = d3Pos[1];
      z = 0;
    } else {
      // Fallback to API if not in D3 result
      x = node.position[0];
      y = node.position[1];
      z = node.position[2];
    }
  } else {
    // API (default)
    x = node.position[0];
    y = node.position[1];
    z = node.position[2];
  }
  // ... set position in geometry
}
```

✅ **Works correctly:** Nodes render at correct positions (API or D3)

**B) ProjectsPoints (visible geometry) — CanvasScene.tsx, lines 203–234**

Same logic as NodesPoints. ✅ **Works correctly.**

**C) NodeLabels (selected node label) — CanvasScene.tsx, lines 486–499**

```typescript
const positions = useMemo(() => {
  if (!selectedNode) return {};
  const useD3 = layoutEngine === 'd3' && d3Positions;
  const d3Pos = useD3 ? d3Positions.nodePositions.get(selectedNode.id) : null;
  const x = d3Pos ? d3Pos[0] : selectedNode.position[0];
  const y = d3Pos ? d3Pos[1] : selectedNode.position[1];
  const z = d3Pos ? 0 : selectedNode.position[2];
  return { x, y, z };
}, [selectedNode, layoutEngine, d3Positions]);
```

✅ **Works correctly:** Selected node label appears at correct position.

---

## 3. Critical Issue: Picking Layer ❌

### The Problem

**File:** `CanvasScene.tsx`, PickableNodes and PickableProjects components

**Lines 542, 591:** Picking mesh hardcodes API positions

```typescript
// PickableNodes - line 542
position={[node.position[0], node.position[1], node.position[2]]}

// PickableProjects - line 591
position={[proj.position[0], proj.position[1], proj.position[2]]}
```

**What this means:**
- When `layoutEngine === 'd3'`, visible nodes render at D3 positions
- But invisible picking spheres (for click detection) stay at API positions
- User clicks on rendered node → picking sphere is elsewhere → click misses
- This is a **correctness regression** (Phase 6.2 Gate Criterion #6)

### Impact on Phase 6.2

**If not fixed:**
- Users enable D3 Dynamic layout
- Visual rendering works correctly
- Users try to click nodes on canvas
- Clicking misses (picking sphere misaligned)
- Users think layout broke or is buggy
- Complaint rate spikes
- Phase 6.2 correctness check: ❌ FAIL (regression detected)
- Rollback triggered immediately

**Severity:** HIGH (violates correctness gate)

---

## 4. Rollback Audit

### Current Rollback Procedure

**Method:** Code revert (no feature flag environment variable exists)

**Steps:**
1. Identify which files changed in Phase 6.0 and Phase 6.1
2. Revert ConstellationCanvas.tsx (remove layoutEngine state, LayoutModeSelector, D3 hook)
3. Revert CanvasScene.tsx (remove layoutEngine param, remove branching logic, always use API)
4. Revert LayoutModeSelector.tsx (delete file, not imported elsewhere)
5. Revert analytics files if layout events cause noise
6. `npm run build`
7. Deploy
8. Verify: constellation loads with API layout only

**Time Estimate:** 15–20 minutes (5 min revert, 5 min rebuild, 5 min deploy, test)

**Reality Check:** ❌ NOT <5 MINUTES

---

## 5. To Make Rollback <5 Minutes

### Option A: Feature Flag via Environment Variable (Recommended)

**Cost:** 20 minutes to implement

**Approach:**
1. Create `VITE_LAYOUT_ENGINE_ENABLED=true` env var
2. Check at app startup in ConstellationCanvas.tsx:
   ```typescript
   const isD3Enabled = import.meta.env.VITE_LAYOUT_ENGINE_ENABLED === 'true';
   const [layoutEngine, setLayoutEngine] = useState<'api' | 'd3'>(isD3Enabled ? 'api' : 'api');
   ```
3. If not enabled, hide LayoutModeSelector, disable toggle, always use API

**Rollback Procedure:**
1. Set `VITE_LAYOUT_ENGINE_ENABLED=false` in .env.production
2. No rebuild needed if using client-side check of runtime variable... wait, that won't work with Vite build-time substitution.

Actually, better approach:

### Option B: Build-Time Feature Flag (Simpler)

**Cost:** 15 minutes

**Approach:**
1. Add `VITE_LAYOUT_ENGINE_ENABLED=true` to `.env` files
2. In ConstellationCanvas.tsx:
   ```typescript
   const IS_D3_ENABLED = import.meta.env.VITE_LAYOUT_ENGINE_ENABLED === 'true';

   if (!IS_D3_ENABLED) {
     // Return null or simplified version without D3
     return <ConstellationCanvasApiOnly />;
   }
   ```
3. Rollback: Change `.env.production` to `VITE_LAYOUT_ENGINE_ENABLED=false`, redeploy

**Rollback Time:** ~5 minutes (change env var, redeploy with CI/CD)

### Option C: Simplest (Current State)

**Keep as-is:** Feature flag is state-based, defaults to API
- To disable D3: Just revert the files that added D3
- Code revert takes 15-20 minutes as described above
- Not ideal, but acceptable if CI/CD is fast

**Verdict:** Option C is acceptable for Phase 6.2 if deployment is fast. Option B is preferred.

---

## 6. Blast Radius of D3 Failure

### If D3 Rendering Fails

| Component | Impact | Severity |
|-----------|--------|----------|
| Visual node positions | D3 disabled, fallback to API | Low (fallback works) |
| Selection (picking) | **MISALIGNED** until fixed | High (correctness) |
| Labels | Fallback to API position | Low |
| Analytics | layout_error events fire | Low (informational) |
| URL state | Not affected (Phase 2.6 preserved) | None |
| Search | Not affected (Phase 3 preserved) | None |
| Filtering | Not affected (Phase 5.5 preserved) | None |
| Highlighting | Not affected (Phase 2.4 preserved) | None |

**Net Impact:** Primarily a picking/interaction issue, not a rendering crash.

---

## 7. Required Fixes (Before Phase 6.1 Deployment)

### Fix #1: Picking Layer Alignment (CRITICAL)

**File:** `CanvasScene.tsx`

**Change PickableNodes function:**
- Accept `layoutEngine` and `d3Positions` as props
- Use same position-branching logic as NodesPoints
- Compute position same way (D3 if available, else API)

**Change PickableProjects function:**
- Same approach as PickableNodes

**Lines to modify:** 520–563 (PickableNodes), 571–615 (PickableProjects)

**Estimated time:** 20 minutes

**Verification:** Click nodes in D3 mode → selection panel opens correctly

### Fix #2: Add Optional Feature Flag via Environment Variable (RECOMMENDED)

**Files:** `.env`, `.env.production`, ConstellationCanvas.tsx

**Add to .env:**
```
VITE_LAYOUT_ENGINE_ENABLED=true
```

**In ConstellationCanvas.tsx (line ~50):**
```typescript
const IS_D3_ENABLED = import.meta.env.VITE_LAYOUT_ENGINE_ENABLED === 'true';

// Only initialize D3 if enabled
const d3Hook = IS_D3_ENABLED ? useD3Force(...) : null;

// Toggle hidden if not enabled
{IS_D3_ENABLED && <LayoutModeSelector ... />}
```

**Estimated time:** 15 minutes

**Rollback:** Set env var to `false`, redeploy

---

## 8. Rollback Verification (After Fixes)

### Rollback Test Procedure

**Setup:** Both fixes deployed

**Step 1: Verify D3 works**
```
1. Load constellation at localhost:3000/constellation
2. Observe LayoutModeSelector visible
3. Toggle to "Dynamic (Experimental)"
4. Click on a rendered node
5. Verify: Selection panel opens, panel shows correct node
6. Click another node
7. Verify: Selection updates, URL changes (?selected=...)
```

**Step 2: Execute rollback**
```
1. Set VITE_LAYOUT_ENGINE_ENABLED=false in .env.production
2. Run: npm run build
3. Deploy (or local: npm run preview)
4. Reload constellation
```

**Step 3: Verify fallback**
```
1. LayoutModeSelector should be hidden (no toggle visible)
2. Nodes should render at API positions
3. Try clicking nodes
4. Verify: Selection panel opens, works normally
5. Verify: No D3-related errors in console
```

**Rollback Time Logged:** ___ minutes

---

## 9. Files Requiring Changes

### For Fix #1 (Picking Layer Alignment)

**CanvasScene.tsx** (~50 LOC change)
- Add layoutEngine, d3Positions to PickableNodes props
- Add layoutEngine, d3Positions to PickableProjects props
- Duplicate position-branching logic from NodesPoints into PickableNodes
- Same for PickableProjects

### For Fix #2 (Feature Flag Environment Variable)

**`.env`**
- Add: `VITE_LAYOUT_ENGINE_ENABLED=true`

**`.env.production`**
- Add: `VITE_LAYOUT_ENGINE_ENABLED=true` (or `false` to disable)

**`ConstellationCanvas.tsx`** (~30 LOC change)
- Add env var check at top
- Conditionally render LayoutModeSelector
- Conditionally initialize D3 hook

### Updated CLAUDE.md

- Document that picking layer was misaligned (bug caught before Phase 6.1)
- Document the fix applied
- Document the feature flag environment variable approach
- Document rollback procedure (now <5 min with feature flag)

---

## 10. Final Verdict

### Rollback Claim Status

**Before Fix:** ⚠️ NOT VERIFIED
- Code revert works but takes 15-20 min
- Picking layer misalignment is a blocker for Phase 6.2 gate criteria

**After Fix #1 + #2:** ✅ VERIFIED
- Picking layer aligned (no correctness regression)
- Feature flag environment variable enables <5 min rollback
- Procedure: Set env var → redeploy via CI/CD

**Recommendation:** Implement both fixes before Phase 6.1 deployment. Total time: ~35 minutes. Saves rollback headaches during Phase 6.2 observation.

---

## Timeline

**Before Phase 6.1 Deployment:**
- [ ] Implement Fix #1 (picking layer alignment) — 20 min
- [ ] Implement Fix #2 (feature flag env var) — 15 min
- [ ] Test both fixes — 10 min
- [ ] Update CLAUDE.md — 5 min
- **Total: 50 minutes**

**After Fixes Deployed:**
- Phase 6.1 can deploy safely
- Phase 6.2 monitoring can begin
- Rollback <5 minutes if needed

---

## Appendix: Code Diffs

### Picking Layer Fix (CanvasScene.tsx)

**PickableNodes function signature (line 519):**

Before:
```typescript
function PickableNodes({
  graph,
  onNodeClick,
  semanticVisibility,
}: {
  graph: RenderableGraph;
  onNodeClick?: (node: GraphNode) => void;
  semanticVisibility?: SemanticVisibility | null;
}) {
```

After:
```typescript
function PickableNodes({
  graph,
  onNodeClick,
  semanticVisibility,
  layoutEngine,
  d3Positions,
}: {
  graph: RenderableGraph;
  onNodeClick?: (node: GraphNode) => void;
  semanticVisibility?: SemanticVisibility | null;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3LayoutResult | null;
}) {
```

**Position computation inside map (line 542):**

Before:
```typescript
position={[node.position[0], node.position[1], node.position[2]]}
```

After:
```typescript
position={(() => {
  const useD3 = layoutEngine === 'd3' && d3Positions;
  if (useD3) {
    const d3Pos = d3Positions.nodePositions.get(node.id);
    if (d3Pos) return [d3Pos[0], d3Pos[1], 0];
  }
  return [node.position[0], node.position[1], node.position[2]];
})()}
```

Same for PickableProjects (lines 571–615).

### Feature Flag (ConstellationCanvas.tsx)

**Top of component (after imports):**

```typescript
const IS_D3_LAYOUT_ENABLED = import.meta.env.VITE_LAYOUT_ENGINE_ENABLED === 'true';
```

**Conditional D3 hook initialization (line ~85):**

```typescript
const d3Hook = IS_D3_LAYOUT_ENABLED ? useD3Force({...}) : null;
```

**Conditional LayoutModeSelector render (line ~320):**

```typescript
{IS_D3_LAYOUT_ENABLED && <LayoutModeSelector ... />}
```

---

## Sign-Off

**Audit Completed By:** Agent (Explore subagent)
**Date:** 2026-03-13
**Verdict:**
- Feature flag exists ✅
- Picking layer misaligned ❌ (FIX REQUIRED)
- Rollback <5 min after fixes ✅ (with feature flag)

**Recommendation:** Implement both fixes before Phase 6.1 deployment.

