# North Star MFP — Failure & Recovery Log

## Phase 5.2: Billboard Evidence Mode — More Button Not Rendering

**Date:** 2026-05-02  
**Severity:** High (Feature blocking)  
**Status:** ✅ RESOLVED

### Root Cause

**Category:** Data-shape drift / Transformation loss

The graph data transformation pipeline (`graphTransforms.ts`) was converting API `GraphEdge` objects into `ResolvedEdge` objects for rendering. However, the `ResolvedEdge` type only preserved the 3D coordinate endpoints (`source: [x, y, z]`, `target: [x, y, z]`) and discarded the string ID endpoints (`source_id`, `target_id`).

Downstream UI logic (Evidence Mode in `CanvasScene.tsx`) depended on filtering edges by their endpoint IDs:
```typescript
const connectedEdges = (graph.edges ?? []).filter(
  e => e.source_id === item.id || e.target_id === item.id
);
```

Since `source_id` and `target_id` no longer existed on the transformed edges, the filter returned empty, so `relatedNodes` was always empty, so the More button never rendered.

### Impact

- Evidence Mode was implemented but non-functional
- Related nodes could not be computed
- More button was hidden (condition: `relatedNodes.length > 0` was always false)
- Users could select a node and see the billboard, but no way to expand to evidence

### Discovery

Identified during Phase 5.2 QA preparation. Root cause traced through:
1. Check if API provides edges with IDs ✓ (it does)
2. Check if ResolvedEdge type includes IDs ✗ (it doesn't)
3. Check if CanvasScene filtering logic uses IDs ✓ (it does)
4. Mismatch: transformation drops IDs, downstream expects them

### Fix

**File: graphTypes.ts**
- Added `source_id: string` field to ResolvedEdge interface
- Added `target_id: string` field to ResolvedEdge interface

**File: graphTransforms.ts**
- Updated `resolveSingleEdge()` to copy source_id and target_id from GraphEdge to ResolvedEdge

**File: CanvasScene.tsx**
- Removed unused `onOpenMorePanel` parameter (cleanup)
- relatedNodes computation filtering now works correctly

### Verification

✅ Build passes: 0 TypeScript errors, 2.47s vite build  
✅ API provides edges with source_id/target_id  
✅ ResolvedEdge type now includes those fields  
✅ resolveSingleEdge() copies those fields  
✅ CanvasScene filtering can now use them  
✅ BillboardedPanel receives properly populated relatedNodes  
✅ More button renders when relatedNodes.length > 0  
✅ No regressions to existing features  

### Guardrail Added

**For all future graph transformations:**

Graph transformation functions must preserve semantic identifiers that downstream UI depends on. Before designing a transformation:

1. Ask: "What does downstream logic need?"
2. If downstream filters on IDs, coordinates, or relationships → preserve them in the type
3. Even if a field isn't directly rendered, preserve it if it's needed for filtering/computation
4. Test end-to-end: API → transform → filter → UI outcome

---
