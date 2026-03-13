# PHASE 6.1 SMOKE TEST REPORT

**Test Date:** ________
**Tester:** ________
**Environment:** ☐ Local Dev  ☐ Staging  ☐ Production
**Commit SHA:** ________

---

## BUILD VERIFICATION

- [ ] `npm run build` succeeds
- [ ] TypeScript: 0 errors, 0 warnings
- [ ] Vite output: 1,212–1,214 KB JS (expected range)
- [ ] No chunk warnings (500 KB threshold acceptable)

**Build Time:** ________ seconds

---

## UI COMPONENT VISIBILITY

- [ ] LayoutModeSelector is visible on page
- [ ] "Curated" button visible
- [ ] "Dynamic (Experimental)" button visible
- [ ] Default selection: Curated

---

## LAYOUT MODE SWITCHING

### Curated (API) Mode
- [ ] Click "Curated" button → no errors
- [ ] D3 positions NOT fetched (check Network tab)
- [ ] Nodes render at API positions (x, y, z)
- [ ] Layout stable (positions don't drift)

### Dynamic (Experimental) Mode
- [ ] Click "Dynamic (Experimental)" button → no errors
- [ ] D3 positions fetched and computed
- [ ] Convergence observed (check browser console or PostHog)
- [ ] Convergence time: ________ ms (expect 100–500 ms for full graph)
- [ ] Nodes relocate smoothly to D3 positions
- [ ] Layout converges (nodes stop moving)

---

## INTERACTION VERIFICATION (Both Modes)

### Node Selection & Picking
- [ ] Click node in Curated mode → panel opens, URL updates
- [ ] Click node in Dynamic mode → panel opens, URL updates
- [ ] Selection panel shows: title, type, description, gravity, tags, ID
- [ ] Clicking again deselects → URL cleared

### Search
- [ ] Type in search input (both modes) → results appear
- [ ] Results grouped by type (Projects | Nodes)
- [ ] Matched text highlighted
- [ ] Arrow keys navigate (both modes)
- [ ] Enter selects result (both modes)
- [ ] Escape closes search (both modes)

### Semantic Filters
- [ ] Toggle node type filters (both modes) → graph updates
- [ ] Toggle tag filters (both modes) → graph updates
- [ ] Clear all filters (both modes) → graph resets
- [ ] Subgraph isolation (click node) → neighborhood shows
- [ ] **Critical:** Switching modes while filter active → filtered layout persists

---

## ANALYTICS VERIFICATION

### Event Firing (if PostHog enabled)
- [ ] `layout_mode_changed` event observed
  - From: ________ To: ________ (e.g., "api" → "d3")
- [ ] `layout_convergence_measured` event observed
  - Convergence time: ________ ms
  - Iteration count: ________
  - Converged: ☐ Yes  ☐ No
- [ ] `layout_error` event NOT observed
  - Error count: ________ (expect 0)

### Console Warnings
- [ ] No TypeScript/compilation errors
- [ ] No 404s on assets
- [ ] D3 enable/disable warnings only if env var set to false

---

## CORRECTNESS REGRESSION CHECKS

### Phase 2.3–5.7 Features (spot-check)
- [ ] Phase 2.3 Picking: Click nodes/projects → selection works
- [ ] Phase 2.4 Highlighting: Select node → adjacent nodes highlight
- [ ] Phase 2.6 URL Sync: Reload page → selection restored
- [ ] Phase 2.8 Keyboard Nav: Arrow Up/Down in search → works
- [ ] Phase 2.9 Matched Terms: Search result text highlighted
- [ ] Phase 3.0 Grouped Results: Results show "Projects" and "Nodes" headers
- [ ] Phase 3.1 Metadata: Node tags and project descriptions visible in results
- [ ] Phase 3.2 Cmd+K: Cmd+K (macOS) or Ctrl+K (Windows) focuses search
- [ ] Phase 3.4 Pinned Items: Recent items list visible on search focus
- [ ] Phase 5.3 Labels: Selected node shows label on canvas
- [ ] Phase 5.5 Semantic Filters: Filter panel visible and functional
- [ ] Phase 5.6 Answer Highlighting: Ask-the-Graph panel works (cited nodes bright)

---

## OVERALL ASSESSMENT

### Critical Issues Found?
☐ Yes → **HOLD** (describe below)
☐ No → **PROCEED**

### Issue Description (if any)
_____________________________________________________________________________
_____________________________________________________________________________

### Recommended Action
- [ ] Proceed to Phase 6.2 monitoring
- [ ] One more smoke test round
- [ ] Hold and investigate
- [ ] Rollback and debug

---

## SIGN-OFF

**Smoke Test Status:** ☐ PASS  ☐ FAIL  ☐ INCONCLUSIVE

**Tester Sign-Off:** ________________ (Date/Time)

**Notes:**
_____________________________________________________________________________
_____________________________________________________________________________

