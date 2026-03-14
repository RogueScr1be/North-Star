# CONSTELLATION INTERACTION SMOKE TESTS

**Version:** 5.8.1 (Release Hardening Prep)
**Last Updated:** 2026-03-12
**Status:** Ready for manual/automated execution

---

## TEST ENVIRONMENT SETUP

**Prerequisites:**
- Frontend server running (npm run dev:frontend)
- Backend server running (port 3001)
- Browser console open (DevTools)
- Check for errors with: `window.__ERRORS__` (if error tracking enabled)

**Test Data:**
- 50 nodes, 4 projects, 45 edges (fixed inventory)
- Known node: `node-getit-decision-video-first` (Prioritize Video-First Interaction)
- Known project: `proj-getit` (GetIT)

---

## SMOKE TEST SUITE: DURABILITY

### **TEST CATEGORY 1: RELOAD WITH SELECTION PERSISTED**

#### Test 1.1: Reload with node selected
```
Steps:
1. Navigate to /constellation
2. Click on any node (e.g., "Prioritize Video-First Interaction")
   Expected: Selection panel opens, URL shows ?selected=node-XXX
3. Observe URL query parameter (copy it)
4. Press Cmd+R (reload page)
5. Wait for graph to load (3 seconds)

Pass Criteria:
- ✅ Same node selected after reload
- ✅ Selection panel shows same node data
- ✅ URL unchanged (?selected=node-XXX)
- ✅ Graph highlighting shows selected + adjacent nodes
- ✅ No console errors
- ✅ Panel data complete (type, description, gravity, tags, IDs)

Evidence:
- Screenshot of selected panel post-reload
- Browser console: no errors
- URL matches pre-reload value
```

#### Test 1.2: Reload with project selected
```
Steps:
1. Navigate to /constellation
2. Click on a project name in selection panel OR search for "GetIT"
3. Click project result (e.g., "GetIT")
   Expected: Selection panel opens, URL shows ?selected=project-proj-getit
4. Press Cmd+R (reload page)
5. Wait for graph to load

Pass Criteria:
- ✅ Same project selected after reload
- ✅ Selection panel shows project data
- ✅ URL shows ?selected=project-proj-getit
- ✅ No stale node selection visible
- ✅ No console errors

Evidence:
- Screenshot of selected project panel post-reload
- Console clean
```

#### Test 1.3: Reload with cleared selection (no query param)
```
Steps:
1. Navigate to /constellation?selected=node-XXX
2. Close selection panel (click X button)
   Expected: URL changes to clean ?constellation (no selected param)
3. Press Cmd+R (reload page)
4. Wait for graph to load

Pass Criteria:
- ✅ No selection panel visible
- ✅ URL is clean (no ?selected)
- ✅ All nodes same color (no highlighting)
- ✅ No console errors

Evidence:
- Screenshot of empty state post-reload
- URL is clean
```

---

### **TEST CATEGORY 2: BROWSER BACK/FORWARD NAVIGATION**

#### Test 2.1: Back navigation restores previous selection
```
Steps:
1. Navigate to /constellation
2. Click node A (e.g., "Prioritize Video-First Interaction")
   URL: ?selected=node-getit-decision-video-first
3. Click node B (different node)
   URL: ?selected=node-XXX-different
4. Click browser back button
   Expected: Selection returns to node A

Pass Criteria:
- ✅ Node A selected after back
- ✅ URL shows node A ID (?selected=node-getit-decision-video-first)
- ✅ Selection panel shows node A data
- ✅ No console errors
- ✅ Animation smooth (no flicker)

Evidence:
- Screenshots of: node B selected → back → node A selected
- Network tab shows no API calls (pure client-side history)
```

#### Test 2.2: Forward navigation restores next selection
```
Steps:
1. From Test 2.1 state (node A selected via back)
2. Click browser forward button
   Expected: Selection returns to node B

Pass Criteria:
- ✅ Node B selected after forward
- ✅ URL shows node B ID
- ✅ Selection panel shows node B data
- ✅ No console errors

Evidence:
- Screenshots of: node A selected → forward → node B selected
```

#### Test 2.3: Back after clearing selection
```
Steps:
1. Navigate to /constellation?selected=node-XXX
2. Close selection panel (click X)
   URL: /constellation (no param)
3. Click back button
   Expected: Node selection restored

Pass Criteria:
- ✅ Selection restored from history
- ✅ URL shows ?selected=node-XXX
- ✅ Selection panel opens with node data
- ✅ No console errors

Evidence:
- Screenshots of: empty state → back → selection restored
```

---

### **TEST CATEGORY 3: RAPID SELECT/DESELECT**

#### Test 3.1: Rapid select → deselect → reselect
```
Steps:
1. Navigate to /constellation
2. Click node A (instant)
3. Click close button on panel (instant)
4. Click node B (instant)
5. Observe final state

Pass Criteria:
- ✅ Final selection shows node B (correct item)
- ✅ No color flashing or artifacts
- ✅ Panel data shows node B (not B and A mixed)
- ✅ URL shows node B ID (not node A)
- ✅ No console errors
- ✅ No lag or jank (60 FPS preferred)

Evidence:
- Screenshots of before/during/after
- Browser DevTools Performance tab shows no CPU spikes
```

#### Test 3.2: Click same node twice (dedup test)
```
Steps:
1. Navigate to /constellation
2. Click node A
   Panel opens, URL: ?selected=node-A
3. Click node A again (while selected)
   Expected: State unchanged

Pass Criteria:
- ✅ Panel stays open (no close/reopen)
- ✅ URL unchanged
- ✅ No duplicate history entries (back button doesn't step through duplicates)
- ✅ No console errors

Evidence:
- URL remains ?selected=node-A
- History length same before/after second click
```

#### Test 3.3: Select → clear selection rapidly (10x)
```
Steps:
1. Navigate to /constellation
2. Rapidly: click node A, click close, click node B, click close, ... (10x)
3. Observe final state after 5 seconds

Pass Criteria:
- ✅ Final selection is correct (last selected node)
- ✅ URL shows last selected (or empty if last action was clear)
- ✅ No visual artifacts or leftover colors
- ✅ No console errors
- ✅ No performance degradation (still 60 FPS)

Evidence:
- Screenshot of final state
- Performance profile shows no lag
```

---

### **TEST CATEGORY 4: SEMANTIC FILTERS ON/OFF**

#### Test 4.1: Enable subgraph mode, verify nodes hidden
```
Steps:
1. Navigate to /constellation
2. Select a node (e.g., "Prioritize Video-First Interaction")
   Expected: Subgraph mode auto-enables (1 hop)
3. Observe graph canvas
4. Note how many nodes visible

Pass Criteria:
- ✅ Subgraph panel shows "Isolating node + neighborhood"
- ✅ Visible nodes reduced (subgraph shows only 1-hop neighbors + selected)
- ✅ Non-subgraph nodes are dimmed or hidden
- ✅ Edge rendering reduced to neighborhood edges only
- ✅ No console errors
- ✅ Search results filtered to subgraph only

Evidence:
- Screenshot of full graph vs subgraph (node count visible)
- Canvas shows fewer points/edges
```

#### Test 4.2: Clear subgraph mode, verify all nodes visible
```
Steps:
1. From Test 4.1 state (subgraph active)
2. Click X button next to "Isolating node + neighborhood"
   Expected: Subgraph mode disables, all nodes visible
3. Observe graph canvas

Pass Criteria:
- ✅ Subgraph panel text gone (no "Isolating" message)
- ✅ All 50 nodes visible again (full graph)
- ✅ All edges visible again
- ✅ Search results show full graph results
- ✅ No console errors

Evidence:
- Screenshot of canvas with full node count
- Node visibility increased from subgraph to full
```

#### Test 4.3: Toggle node type filter
```
Steps:
1. Navigate to /constellation (subgraph cleared or inactive)
2. Find "NODE TYPES" section in filters panel
3. Click "decision" button to toggle off
   Expected: All decision nodes disappear
4. Click "decision" again to toggle on
   Expected: Decision nodes reappear

Pass Criteria:
- ✅ Decision nodes disappear when toggled off
- ✅ Graph still renders (non-decision nodes visible)
- ✅ Search results filtered (no decision results while toggled off)
- ✅ Decision nodes reappear when toggled on
- ✅ No console errors
- ✅ Smooth transitions (no lag)

Evidence:
- Screenshots: all types → decision off → decision on
```

#### Test 4.4: Project cluster mode (mutual exclusivity)
```
Steps:
1. Navigate to /constellation
2. Select a node (subgraph mode auto-enables)
3. Click "GetIT" project button in "PROJECT CLUSTER" section
   Expected: Subgraph mode clears, only GetIT nodes visible

Pass Criteria:
- ✅ Subgraph mode disabled (X button gone, message cleared)
- ✅ Project cluster shows "GetIT" selection
- ✅ Only GetIT nodes visible (dimmed all other projects)
- ✅ No subgraph text present
- ✅ No console errors

Evidence:
- Screenshot showing project cluster active, subgraph disabled
```

---

### **TEST CATEGORY 5: ANSWER CONTEXT + SELECTION COEXISTENCE**

#### Test 5.1: Ask question, answer shows cited nodes
```
Steps:
1. Navigate to /constellation
2. Click search bar (or Cmd+K to open search)
3. Type "What is North Star?"
   Expected: Ask-the-Graph panel shows (below filters)
4. Press Enter (or click answer if shown)
   Expected: Answer appears with cited nodes

Pass Criteria:
- ✅ Ask-the-Graph panel renders answer
- ✅ Answer lists cited nodes/projects
- ✅ Cited nodes highlighted on canvas (bright color)
- ✅ Non-cited nodes dimmed (0.75x brightness)
- ✅ Selection panel still works (click evidence → updates selection)
- ✅ No console errors

Evidence:
- Screenshot of answer with cited highlighting
- Canvas shows bright cited nodes, dim context
```

#### Test 5.2: Select node, then ask question (coexist)
```
Steps:
1. Navigate to /constellation
2. Click node A (selection panel opens)
3. Scroll down to Ask-the-Graph panel
4. Type "What is North Star?" and press Enter
   Expected: Answer shown WITH selection panel still open

Pass Criteria:
- ✅ Selection panel remains visible (not replaced)
- ✅ Answer panel shows below selection panel
- ✅ Both panels interactive (click evidence, click selection close)
- ✅ Canvas shows selection highlighting + answer highlighting (both)
- ✅ Selected node is bright (selected > cited)
- ✅ Other cited nodes are bright (but not selected)
- ✅ Non-cited, non-selected nodes are dim
- ✅ No console errors

Evidence:
- Screenshot showing both panels open
- Canvas shows correct color hierarchy
```

#### Test 5.3: Click evidence from answer, selection updates
```
Steps:
1. From Test 5.2 state (answer + selection visible)
2. In answer panel, find cited nodes/projects list
3. Click on a cited node (e.g., "GetIT" project in evidence)
   Expected: Selection panel updates to show that item

Pass Criteria:
- ✅ Selection panel updates (shows clicked item)
- ✅ URL updates (?selected=project-proj-getit)
- ✅ Selection highlighting updated on canvas
- ✅ Answer remains visible (not dismissed)
- ✅ Cited highlighting remains visible
- ✅ No console errors

Evidence:
- Screenshots of before/after click
- URL shows new selection
```

#### Test 5.4: Exit answer context, selection persists
```
Steps:
1. From Test 5.3 state (answer active, selection updated)
2. Close the answer panel (click X or click canvas outside panel)
   Expected: Answer dismissed, selection remains

Pass Criteria:
- ✅ Answer panel gone
- ✅ Selection panel still shows selected item
- ✅ Selection highlighting remains on canvas
- ✅ Cited dimming/highlighting removed (normal graph colors return)
- ✅ URL unchanged (?selected=...)
- ✅ No console errors

Evidence:
- Screenshot showing answer gone, selection intact
```

---

## SMOKE TEST EXECUTION LOG

### How to Run These Tests:

**Manual Execution (5 minutes per category):**
1. Print this document
2. For each test, follow "Steps"
3. Mark Pass/Fail in "Pass Criteria" checkboxes
4. Capture screenshots for evidence
5. Note any console errors

**Automated Execution (Future):**
```bash
# Placeholder for automated test runner (Playwright/Cypress)
npm run test:smoke-constellation
```

**Reporting:**
- Screenshot evidence folder: `/frontend/evidence/smoke-tests/`
- Test results: `SMOKE-TEST-RESULTS-[DATE].md`
- Failures: File bug with evidence attached

---

## EXPECTED RESULTS

**Total Tests:** 13
**Expected Pass Rate:** 100% (13/13)
**Acceptable Pass Rate:** 95% (12/13, with minor non-blocking issues)
**Critical Failures:** 0 (block release)

**Success Criteria:**
- ✅ All durability tests pass (reload, back/forward, rapid transitions)
- ✅ All filter tests pass (isolation, coexistence)
- ✅ All coexistence tests pass (answer + selection)
- ✅ No console errors across all tests
- ✅ No visual artifacts or lag

---

## KNOWN LIMITATIONS

### **Out of Scope for Smoke Tests:**
- Performance benchmarks (use Lighthouse)
- Mobile responsiveness (separate RWD audit)
- Accessibility (WCAG audit separate)
- Browser-specific quirks (cross-browser test plan separate)

### **Deferred to Integration Tests:**
- API error handling (offline, 500 errors)
- Network latency (slow 3G simulation)
- Concurrent user scenarios (not applicable v1)

---

## TEST SIGN-OFF

**Smoke Test Suite Version:** 5.8.1
**Last Reviewed:** 2026-03-12
**Next Review:** After Phase 5.9 or before production deployment

---

**END OF SMOKE TEST SUITE**
