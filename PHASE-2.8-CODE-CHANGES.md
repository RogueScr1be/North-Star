# PHASE 2.8 — EXACT CODE CHANGES

## File 1: `frontend/src/lib/search/searchUtils.ts`

### Key Addition: Match Quality Function

```typescript
/**
 * Rank match quality: exact > prefix > loose
 */
function getMatchQuality(text: string, query: string): 'exact' | 'prefix' | 'loose' | null {
  const normalized = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (normalized === normalizedQuery) return 'exact';
  if (normalized.startsWith(normalizedQuery)) return 'prefix';
  if (normalized.includes(normalizedQuery)) return 'loose';
  return null;
}
```

### Key Change: SearchResult Type

**Before:**
```typescript
export type SearchResult =
  | { type: 'node'; data: GraphNode; matchedField: 'title' | 'id' | 'tag' }
  | { type: 'project'; data: GraphProject; matchedField: 'title' | 'id' };
```

**After:**
```typescript
export type SearchResult =
  | { type: 'node'; data: GraphNode; matchedField: 'title' | 'id' | 'tag'; matchQuality: 'exact' | 'prefix' | 'loose' }
  | { type: 'project'; data: GraphProject; matchedField: 'title' | 'id'; matchQuality: 'exact' | 'prefix' | 'loose' };
```

### Key Change: Search and Sort Logic

**Before (naive matching):**
```typescript
// Search nodes
for (const node of nodes) {
  // Title match (highest priority)
  if (node.title.toLowerCase().includes(normalizedQuery)) {
    results.push({
      type: 'node',
      data: node,
      matchedField: 'title',
    });
    continue;
  }
  // ... ID match, tag match ...
}

// Simple sort
const priority = { title: 0, id: 1, tag: 2 };
results.sort((a, b) => {
  const aPriority = priority[a.matchedField];
  const bPriority = priority[b.matchedField];
  if (aPriority !== bPriority) return aPriority - bPriority;
  return a.data.title.length - b.data.title.length;
});
```

**After (quality-aware matching):**
```typescript
// Search nodes with quality ranking
for (const node of nodes) {
  // Title match with quality
  const titleQuality = getMatchQuality(node.title, query);
  if (titleQuality) {
    results.push({
      type: 'node',
      data: node,
      matchedField: 'title',
      matchQuality: titleQuality,  // NEW
    });
    continue;
  }
  // ... ID match (exact only), tag match ...
}

// Enhanced sort: field > quality > length
const fieldPriority = { title: 0, id: 1, tag: 2 };
const qualityPriority = { exact: 0, prefix: 1, loose: 2 };

results.sort((a, b) => {
  // First: field priority (title > id > tag)
  const aFieldPriority = fieldPriority[a.matchedField];
  const bFieldPriority = fieldPriority[b.matchedField];
  if (aFieldPriority !== bFieldPriority) {
    return aFieldPriority - bFieldPriority;
  }

  // Second: match quality (exact > prefix > loose)
  const aQualityPriority = qualityPriority[a.matchQuality];
  const bQualityPriority = qualityPriority[b.matchQuality];
  if (aQualityPriority !== bQualityPriority) {
    return aQualityPriority - bQualityPriority;
  }

  // Third: shorter title is more likely what user wants
  return a.data.title.length - b.data.title.length;
});
```

---

## File 2: `frontend/src/components/constellation/SearchUI.tsx`

### Key Addition: Import useRef

**Before:**
```typescript
import React, { useState, useCallback, useEffect } from 'react';
```

**After:**
```typescript
import React, { useState, useCallback, useEffect, useRef } from 'react';
```

### Key Addition: Track Result Refs

**Before:**
```typescript
const [query, setQuery] = useState('');
const [results, setResults] = useState<SearchResult[]>([]);
const [isOpen, setIsOpen] = useState(false);
const [highlightedIndex, setHighlightedIndex] = useState(-1);
```

**After:**
```typescript
const [query, setQuery] = useState('');
const [results, setResults] = useState<SearchResult[]>([]);
const [isOpen, setIsOpen] = useState(false);
const [highlightedIndex, setHighlightedIndex] = useState(-1);
const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);  // NEW
```

### Key Addition: Scroll-Into-View Effect

**NEW useEffect (added after search effect):**
```typescript
// Scroll highlighted result into view when keyboard navigates
useEffect(() => {
  if (highlightedIndex >= 0 && resultRefs.current[highlightedIndex]) {
    const highlightedElement = resultRefs.current[highlightedIndex];
    highlightedElement?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'nearest',
    });
  }
}, [highlightedIndex]);
```

### Key Change: Attach Refs to Result Buttons

**Before:**
```typescript
{results.map((result, index) => (
  <button
    key={`${result.type}-${result.data.id}`}
    className={`search-result ${
      index === highlightedIndex ? 'highlighted' : ''
    } search-result-${result.type}`}
    onClick={() => selectResult(result)}
    onMouseEnter={() => setHighlightedIndex(index)}
    role="option"
    aria-selected={index === highlightedIndex}
  >
```

**After:**
```typescript
{results.map((result, index) => (
  <button
    key={`${result.type}-${result.data.id}`}
    ref={el => { resultRefs.current[index] = el; }}  // NEW
    className={`search-result ${
      index === highlightedIndex ? 'highlighted' : ''
    } search-result-${result.type}`}
    onClick={() => selectResult(result)}
    onMouseEnter={() => setHighlightedIndex(index)}
    role="option"
    aria-selected={index === highlightedIndex}
  >
```

---

## Summary of Changes

| File | Change Type | LOC | Impact |
|------|-------------|-----|--------|
| searchUtils.ts | New function | ~15 | Match quality ranking |
| searchUtils.ts | Type extension | ~2 | matchQuality field |
| searchUtils.ts | Updated sorting | ~20 | Enhanced ranking logic |
| SearchUI.tsx | Import | 1 | useRef hook |
| SearchUI.tsx | New ref | 1 | resultRefs state |
| SearchUI.tsx | New effect | ~10 | Scroll-into-view |
| SearchUI.tsx | Ref callback | 1 | Attach ref to button |
| **TOTAL** | | **~50 LOC** | **Keyboard-friendly search** |

---

## Testing the Changes

### Test 1: Match Quality Ranking
```bash
# In browser console, search for "node"
# Expected result order:
# 1. "node" (exact match)
# 2. "node detail" (prefix match)
# 3. "my node" (loose match)
```

### Test 2: Scroll-Into-View
```bash
# Type a query that returns >10 results
# Press ArrowDown multiple times
# Expected: Highlighted item scrolls smoothly into view
```

### Test 3: Keyboard Selection State Sync
```bash
# Type "fast" → ArrowDown → ArrowDown → Enter
# Expected:
#   - URL updates (?selected=node-xxx)
#   - SelectionPanel shows selected item
#   - Highlighting colors selected + adjacency
#   - Same as if clicked with mouse
```

---

## No Changes To

- `SearchUI.css` — styling unchanged
- `ConstellationCanvas.tsx` — integration unchanged
- `useURLSelection()` hook — fully compatible
- `SelectionPanel` component — receives same data
- Highlighting system — works with keyboard selections
- Any other files

