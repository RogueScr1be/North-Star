# Phase 3.9: Analytics Validation Workflow

**Purpose:** Minimal, reversible dev-only utilities for validating search analytics event quality

**For Phase 3.9 Validation:** Already completed via code review (see PHASE-3.9-METRICS-VALIDATION-AUDIT.md)

**For Future Phases:** Use these utilities if implementing Phase 3.10+ analytics expansion

---

## Dev-Only Validation Tools

### 1. AnalyticsValidator Utility

**Location:** `frontend/src/lib/analytics/analyticsValidator.ts`

**What it does:**
- Validates individual event payloads (checks required fields, data types)
- Computes metrics summary in real-time (canonical + directional metrics)
- Detects event quality issues (missing fields, malformed data, duplicates)
- Exports events as JSON for external analysis

**Usage (in browser console):**

```javascript
// View current metrics summary
window.__ANALYTICS_VALIDATOR__.printSummary();

// Get summary object programmatically
const summary = window.__ANALYTICS_VALIDATOR__.getSummary();
console.log(`Total searches: ${summary.canonicalMetrics.totalSearches}`);
console.log(`Empty result rate: ${summary.canonicalMetrics.emptyResultRate}%`);

// Export events for analysis
const json = window.__ANALYTICS_VALIDATOR__.exportJSON();
console.log(json); // Copy to external tool (Excel, Python, etc.)

// Check for quality issues
const summary = window.__ANALYTICS_VALIDATOR__.getSummary();
console.log(`Malformed events: ${summary.eventQualityIssues.malformedPayloads}`);
console.log(`Missing fields: ${summary.eventQualityIssues.missingFields}`);
```

**What it validates:**
- Required fields present and correctly typed
- search_executed: resultCount, emptyResult, parsed fields
- search_result_selected: selectedId, selectedKind, selectedRank fields
- search_abandoned: sessionDurationMs field
- Privacy: rawQuery present for debugging (not transmitted remotely)
- Phase 3.7 fields: sanitizedQuery and queryHash (warnings if missing)

---

### 2. ValidatingLogger Wrapper

**Location:** `frontend/src/lib/analytics/validatingLogger.ts`

**What it does:**
- Wraps any logger (ConsoleSearchAnalyticsLogger or PostHogSearchAnalyticsLogger)
- Validates events before passing to underlying logger
- Logs validation errors/warnings to console
- Feeds events to AnalyticsValidator for metrics

**Usage (enable during development):**

```typescript
// In App.tsx or analytics initialization:
import { ValidatingLogger } from '../lib/analytics/validatingLogger';
import { ConsoleSearchAnalyticsLogger, setSearchAnalyticsLogger } from '../lib/analytics/searchAnalytics';

// Wrap console logger with validation
const consoleLogger = new ConsoleSearchAnalyticsLogger();
const validatingLogger = new ValidatingLogger(consoleLogger);
setSearchAnalyticsLogger(validatingLogger);

// Now events are validated before logging
```

**Expected output (when event is malformed):**

```
[ValidatingLogger] Event validation FAILED for search_executed:
["Missing resultCount"] SearchExecutedEvent {...}
```

**When to use:**
- During development to catch event quality issues early
- When testing new features that fire analytics events
- When debugging why analytics aren't appearing in PostHog

---

## Validation Checklist (Phase 3.9)

Use this checklist to verify analytics quality:

### Pre-Release Validation

- [ ] Run app in development mode
- [ ] Open browser console
- [ ] Perform 5–10 search interactions:
  - Type "architecture" → check for search_executed event
  - Click result → check for search_result_selected event
  - Open search, press Escape → check for search_abandoned event
  - Type rapid queries → verify only final query fires event (debounce working)
- [ ] Run `window.__ANALYTICS_VALIDATOR__.printSummary()`
- [ ] Verify metrics:
  - totalSearches: Matches number of stable queries (not per keystroke)
  - emptyResultRate: 0% if graph has coverage
  - searchResultCTR: Non-zero if selections happened
  - eventQualityIssues.malformedPayloads: 0
  - eventQualityIssues.missingFields: 0

### Example Valid Summary

```javascript
{
  totalEvents: 15,
  searchExecuted: 5,
  searchResultSelected: 3,
  searchAbandoned: 2,
  canonicalMetrics: {
    totalSearches: 5,
    emptyResultRate: 0.0
  },
  directionalMetrics: {
    parsedVsUnparsedRatio: 60.0,
    searchResultCTR: 60.0,
    avgResultPosition: 1.33
  },
  eventQualityIssues: {
    missingFields: 0,
    malformedPayloads: 0,
    duplicateQueries: 0
  }
}
```

### Example Issues to Watch

**Issue 1: High missingFields count**
- Indicates optional Phase 3.7 fields (sanitizedQuery, queryHash) not being set
- If Phase 3.7 is enabled, this is a bug
- Validate in SearchUI.tsx that sanitizeSearchQuery() is being called

**Issue 2: Non-zero malformedPayloads**
- Indicates event has missing required fields
- Check browser console for [ValidatingLogger] validation errors
- Fix the event-firing code in SearchUI.tsx

**Issue 3: Duplicate queries firing multiple events**
- Check if debounce timer is being properly cleared
- Verify timer cleanup in useEffect (lines 168–171 of SearchUI.tsx)

**Issue 4: Low searchResultCTR with non-zero emptyResultRate**
- Indicates users can't find what they want
- Empty results = search gaps in graph
- Suggest adding more nodes or improving ranking

---

## Phase 3.10+ Analytics Expansion

If Phase 3.10 expands instrumentation, use these utilities to validate new events:

### Step 1: Validate New Event Type

```typescript
// In analyticsValidator.ts, add validation for new event type:
if (event.type === 'new_event_type') {
  if (!('required_field' in event)) {
    errors.push('new_event_type: Missing required_field');
  }
  // ... other validations
}
```

### Step 2: Monitor Quality

```javascript
// In browser console during testing:
const summary = window.__ANALYTICS_VALIDATOR__.getSummary();
console.log(`New event count: ${summary.newEventCount}`);
```

### Step 3: Export and Analyze

```javascript
// Export events for CSV/spreadsheet analysis
const json = JSON.parse(window.__ANALYTICS_VALIDATOR__.exportJSON());
console.log(json); // Copy to Excel for pivot tables
```

---

## Known Limitations & Future Work

### Phase 3.9 Validation (Current)
- ✅ Event schemas validated
- ✅ Field presence checked
- ✅ Privacy boundaries verified
- ✅ Metrics classification audited
- ❌ No real-time metrics dashboard (console-only)
- ❌ No historical analytics (events cleared on page reload)
- ❌ No aggregation across sessions

### Phase 3.10+ Opportunities
- Add optional metrics dashboard component (dev-only)
- Persist events to localStorage for cross-session analysis
- Add A/B testing framework for ranking experiments
- Implement user feedback loop ("Was this result helpful?")

---

## Privacy & Security Notes

### Safe (Console Logging)
- ✅ rawQuery logged to console (dev-only, visible in DevTools only)
- ✅ All validation happens locally
- ✅ No data leaves the browser

### Unsafe (Remove Before Commit)
- ❌ Do NOT log rawQuery to external analytics providers
- ❌ Do NOT export events to third-party tools without sanitization
- ❌ Do NOT commit rawQuery to version control

### Safe (Remote Analytics)
- ✅ sanitizedQuery sent to PostHog (truncated to 100 chars)
- ✅ queryHash sent to PostHog (deterministic, non-reversible)
- ✅ rawQuery filtered out by postHogSearchAnalyticsLogger.ts

---

## Troubleshooting

**Q: "window.__ANALYTICS_VALIDATOR__ is undefined"**
A: Validator only initialized in development. Check: `process.env.NODE_ENV === 'development'`

**Q: Metrics seem off; searches counted as multiple events**
A: Check if debounce is working. If events fire per keystroke, debounce timer might not be running. Verify timer setup in SearchUI.tsx lines 99–157.

**Q: Why is search_abandoned firing when I click the canvas?**
A: This is a known heuristic behavior (Phase 3.7). Canvas click closes search dropdown (blur event), which triggers the abandoned handler. Expected behavior for ~25% of abandoned events. Use intentional_close signal (Phase 3.10) to improve.

**Q: How do I know if my changes broke analytics?**
A: Before committing:
1. Enable ValidatingLogger (wrap logger with validation)
2. Perform 5+ search interactions
3. Run `window.__ANALYTICS_VALIDATOR__.printSummary()`
4. Verify: malformedPayloads = 0, missingFields = 0

---

## Summary

**Phase 3.9 Validation:** ✅ Complete (see audit report)

**For Developers:** Use these tools if extending analytics in Phase 3.10+

**For Production:** Keep validation utilities in codebase (dev-only, no runtime cost)

**Recommended Next Step:** Phase 3.10 (optional) or Phase 4 (feature expansion)
