# Phase 3.1: Search Result Metadata Audit

## Available Metadata

### GraphNode Fields
```
id, type (NodeType), title, description, gravity_score, tags[], 
is_featured, x, y, z, project_id
```

### GraphProject Fields
```
id, title, description, gravity_score, is_featured, x_derived, y_derived, z_derived
```

### Current Search Result Structure
```
SearchResult = {
  type: 'node' | 'project'
  data: GraphNode | GraphProject
  matchedField: 'title' | 'id' | 'tag'
  matchQuality: 'exact' | 'prefix' | 'loose'
}
```

## Proposed Minimum Metadata Surface

### For Nodes (Secondary Line)
- **Field**: `tags` (first tag if available)
- **Reasoning**: 
  - Already in SearchResult.data
  - Compact rendering (single tag or "no tags")
  - Helps users understand node context before clicking
  - Avoids verbose descriptions
- **Visual**: Muted color, smaller font, secondary line below title

### For Projects (Secondary Line)
- **Field**: `description` (first ~60 characters)
- **Reasoning**:
  - Already in SearchResult.data
  - Provides context about project purpose
  - Users can tell why project matters at a glance
  - No joins or expensive computation
- **Visual**: Muted color, smaller font, truncated with ellipsis

## What NOT Including

- ✗ is_featured badge (adds clutter, not critical for search)
- ✗ gravity_score (too technical, users care about relevance not scores)
- ✗ node_count (would require counting nodes by project_id, mild overhead)
- ✗ Full descriptions (verbose, search results need density)
- ✗ All tags (could exceed space, multiple tags clutter)

## Blast Radius
- **Files Modified**: SearchUI.tsx, SearchUI.css
- **New Dependencies**: None
- **API Changes**: None
- **Keyboard Navigation**: Unchanged (metadata is secondary visual only)
- **Rollback Path**: <2 min (revert 2 files)

## Success Criteria
- Secondary metadata is visible but not dominant
- Similar result names become distinguishable
- Keyboard nav unchanged (Arrow Up/Down, Enter, Escape work exactly as before)
- Grouped results rendering unchanged
- All Phase 2.3–3.0 features intact
- Build passes with 0 errors
