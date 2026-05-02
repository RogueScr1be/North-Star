# FAILURE LOG — North Star Frontend

**Purpose:** Document bugs, regressions, and their fixes. This log preserves institutional memory for preventing recurring failures.

---

## PHASE 5.0C: PROJECT ANCHOR VISIBILITY REGRESSION — FIXED

**Date:** 2026-05-01
**Severity:** HIGH (user-facing, blocked canvas interaction)
**Status:** ✅ FIXED (commit `e06480a`)

### Symptom
Projects (structural navigation anchors) disappeared or dimmed to near-invisibility (0.18 opacity) when:
- Search UI was focused/used
- Any node was selected
- Selection state changed

User could not see project nodes to click them; navigation was severely impaired.

### Root Cause
`ProjectsPoints` component applied **ordinary focus dimming logic** to project anchors:
```typescript
if (focusDimmingEnabled && selectedId && projId !== selectedId) {
  if (highlightRole === 'adjacent') {
    opacity = 0.65;
  } else {
    opacity = 0.18;  // ← PROBLEM: Projects dimmed to near-invisible
  }
}
```

**Why this was wrong:**
- Projects are **structural landmarks** (always-visible reference frame)
- Ordinary nodes are **semantic entities** (can be deemphasized when not adjacent to selection)
- Treating projects like nodes broke the fundamental graph structure visibility guarantee

### Fix
Removed focus dimming logic from `ProjectsPoints` entirely (commit `e06480a`):
```typescript
// Before:
col[i * 4 + 3] = Math.max(0.12, opacity);  // Could be 0.18 (invisible)

// After:
col[i * 4 + 3] = 1.0;  // Always full opacity
```

**Files Modified:**
- `frontend/src/components/constellation/CanvasScene.tsx` (lines 198, 235–263, 1023)
- Removed `highlightState` parameter from `ProjectsPoints` function
- Removed focus dimming calculation loop
- Updated useMemo dependency array

**Verification:**
- 4 QA scenarios executed (Tests 1, 2, 3, 4 of 16-point checklist)
- All 4: ✅ PASS — projects remain visible at 1.0 opacity during search, selection, project focus
- Build: TypeScript 0 errors, Vite 3.08s
- Regressions: 0 (Phases 2.3–5.0a untouched)

### Guardrail for Future Phases

**RULE: Project anchors are structural landmarks. Do not apply ordinary focus dimming to them.**

**Why:**
- Projects provide persistent context (founder's initiative structure)
- Users must always see all projects to understand scope
- Dimming projects breaks fundamental visual grammar

**How to Apply:**
- If adding focus/selection dimming logic anywhere, explicitly **exclude ProjectsPoints**
- If adding new visibility filters (semantic filtering, subgraph isolation, etc.), ensure projects remain visible unless an explicit project-filter hides them
- Test: Manual verification that projects remain at 1.0 opacity during: search, selection, zoom, pan, any focus state

**When Not to Apply:**
- Ordinary nodes **can** dim (they're semantic entities, not landmarks)
- Edges **can** dim (they're relationships, not landmarks)
- Only preserve visibility for: Projects, selected items, items in search results

### Test Added
**Manual QA checklist item (Phase 5.0c):**
- Search interaction (open search, select result) → all 4 projects remain fully visible ✅
- Node selection → all 4 projects remain fully visible ✅
- Project focus → selected project prominent, other projects remain fully visible ✅

### Lesson for Future Phases
- Component state (selection, focus, semantic filter) is complex
- Always identify **what must remain visible** before applying dimming logic
- Projects are not just nodes; they're structural anchors
- Visual grammar must be consistent and intentional

---

## Guardrail Checklist

When adding selection/focus/filtering logic to the constellation:

- [ ] Verify projects remain at 1.0 opacity (or are explicitly filtered)
- [ ] Verify nodes/edges can still dim based on selection role
- [ ] Verify no OTHER components were accidentally dimmed
- [ ] Manual test: select node, verify 3 other projects visible
- [ ] Manual test: focus project, verify 3 other projects visible
- [ ] Manual test: search result, verify projects visible

---
