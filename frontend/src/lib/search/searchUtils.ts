/**
 * SEARCHUTILS.TS
 * Lightweight search utilities for nodes and projects
 * No dependencies, smart string matching with ranking by match quality
 * Phase 2.8: Keyboard navigation + better match ranking
 * Phase 2.9: Match highlighting + recent searches
 * Phase 3.0: Grouped results by entity type
 */

import { GraphNode, GraphProject, NodeType } from '../graph/graphTypes';

export type SearchResult =
  | { type: 'node'; data: GraphNode; matchedField: 'title' | 'id' | 'tag'; matchQuality: 'exact' | 'prefix' | 'loose' }
  | { type: 'project'; data: GraphProject; matchedField: 'title' | 'id'; matchQuality: 'exact' | 'prefix' | 'loose' };

/**
 * Grouped search results for structured navigation
 * Groups preserve ranking within each group; groups ordered: projects, nodes
 */
export interface ResultGroup {
  type: 'project' | 'node';
  label: string;
  items: SearchResult[];
}

interface SearchOptions {
  maxResults?: number;
  filterType?: NodeType;         // Optional: filter nodes by type (from query parser)
  filterEntity?: 'project' | 'node'; // Optional: limit to projects or nodes only
}

/**
 * Rank match quality: exact > prefix > loose (loose = contains but not at start)
 */
function getMatchQuality(text: string, query: string): 'exact' | 'prefix' | 'loose' | null {
  const normalized = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (normalized === normalizedQuery) return 'exact';
  if (normalized.startsWith(normalizedQuery)) return 'prefix';
  if (normalized.includes(normalizedQuery)) return 'loose';
  return null;
}

/**
 * Lightweight search across nodes and projects
 * Matches by:
 * - Title (case-insensitive, ranked: exact > prefix > loose)
 * - ID (case-insensitive exact match only)
 * - Tags (case-insensitive, ranked: exact > prefix > loose)
 *
 * Results are ranked by:
 * 1. Match field priority (title > id > tag)
 * 2. Match quality (exact > prefix > loose)
 * 3. Length (shorter = more likely match)
 *
 * Phase 3.5 addition: Optional filtering by node type or entity type
 * filterType: Only include nodes of specific type (decision, skill, etc)
 * filterEntity: Only include nodes OR projects (not both)
 */
export function searchGraphItems(
  query: string,
  nodes: GraphNode[],
  projects: GraphProject[],
  options: SearchOptions = {}
): SearchResult[] {
  const { maxResults = 20, filterType, filterEntity } = options;

  // Apply entity filter if specified
  let nodesToSearch = nodes;
  let projectsToSearch = projects;

  if (filterEntity === 'node') {
    projectsToSearch = [];
  } else if (filterEntity === 'project') {
    nodesToSearch = [];
  }

  // Apply type filter to nodes (if specified)
  if (filterType) {
    nodesToSearch = nodesToSearch.filter(n => n.type === filterType);
  }

  // If no query provided, return all filtered items (for "show all [type] nodes" pattern)
  if (!query.trim()) {
    const results: SearchResult[] = [];
    for (const node of nodesToSearch) {
      results.push({
        type: 'node',
        data: node,
        matchedField: 'title',
        matchQuality: 'exact',
      });
    }
    for (const project of projectsToSearch) {
      results.push({
        type: 'project',
        data: project,
        matchedField: 'title',
        matchQuality: 'exact',
      });
    }
    return results.slice(0, maxResults);
  }

  const normalizedQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search nodes (filtered)
  for (const node of nodesToSearch) {
    // Title match (highest priority)
    const titleQuality = getMatchQuality(node.title, query);
    if (titleQuality) {
      results.push({
        type: 'node',
        data: node,
        matchedField: 'title',
        matchQuality: titleQuality,
      });
      continue; // Don't add same node twice
    }

    // ID match (exact only, case-insensitive)
    if (node.id.toLowerCase() === normalizedQuery) {
      results.push({
        type: 'node',
        data: node,
        matchedField: 'id',
        matchQuality: 'exact',
      });
      continue;
    }

    // Tag match
    if (node.tags) {
      for (const tag of node.tags) {
        const tagQuality = getMatchQuality(tag, query);
        if (tagQuality) {
          results.push({
            type: 'node',
            data: node,
            matchedField: 'tag',
            matchQuality: tagQuality,
          });
          break; // Only add once per node
        }
      }
    }
  }

  // Search projects (filtered)
  for (const project of projectsToSearch) {
    // Title match
    const titleQuality = getMatchQuality(project.title, query);
    if (titleQuality) {
      results.push({
        type: 'project',
        data: project,
        matchedField: 'title',
        matchQuality: titleQuality,
      });
      continue;
    }

    // ID match (exact only)
    if (project.id.toLowerCase() === normalizedQuery) {
      results.push({
        type: 'project',
        data: project,
        matchedField: 'id',
        matchQuality: 'exact',
      });
    }
  }

  // Sort by match field priority, then match quality, then length
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

  return results.slice(0, maxResults);
}

/**
 * Group search results by entity type for structured navigation
 * Returns groups in order: projects, then nodes
 * Only includes groups that have items
 */
export function groupSearchResults(results: SearchResult[]): ResultGroup[] {
  const groups: ResultGroup[] = [];

  // Group by type, preserving order within each group
  const projectResults = results.filter(r => r.type === 'project');
  const nodeResults = results.filter(r => r.type === 'node');

  // Add projects group if it has items
  if (projectResults.length > 0) {
    groups.push({
      type: 'project',
      label: 'Projects',
      items: projectResults,
    });
  }

  // Add nodes group if it has items
  if (nodeResults.length > 0) {
    groups.push({
      type: 'node',
      label: 'Nodes',
      items: nodeResults,
    });
  }

  return groups;
}

/**
 * Flatten grouped results back to a single array for ref tracking
 * Preserves the order of groups and items within groups
 */
export function flattenGroupedResults(groups: ResultGroup[]): SearchResult[] {
  return groups.flatMap(group => group.items);
}

/**
 * Highlight the substring that matched in the original text
 * Returns array of {text, isMatch} for safe rendering
 * Case-insensitive matching, preserves original casing
 */
export interface HighlightPart {
  text: string;
  isMatch: boolean;
}

export function highlightMatchedSubstring(
  originalText: string,
  query: string,
  matchQuality: 'exact' | 'prefix' | 'loose'
): HighlightPart[] {
  if (!query.trim()) {
    return [{ text: originalText, isMatch: false }];
  }

  const normalized = originalText.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  // For exact match, highlight entire text
  if (matchQuality === 'exact') {
    return [{ text: originalText, isMatch: true }];
  }

  // For prefix and loose, find the matched substring position
  const matchIndex = normalized.indexOf(normalizedQuery);
  if (matchIndex === -1) {
    // Fallback: no match found (shouldn't happen)
    return [{ text: originalText, isMatch: false }];
  }

  const matchLength = normalizedQuery.length;
  const parts: HighlightPart[] = [];

  // Before match
  if (matchIndex > 0) {
    parts.push({
      text: originalText.slice(0, matchIndex),
      isMatch: false,
    });
  }

  // Matched part (preserve original casing)
  parts.push({
    text: originalText.slice(matchIndex, matchIndex + matchLength),
    isMatch: true,
  });

  // After match
  if (matchIndex + matchLength < originalText.length) {
    parts.push({
      text: originalText.slice(matchIndex + matchLength),
      isMatch: false,
    });
  }

  return parts;
}

/**
 * Lightweight local storage for recent searches
 * Stores up to 5 most recent queries
 */
const RECENT_SEARCHES_KEY = 'north-star-recent-searches';
const MAX_RECENT = 5;

export function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): void {
  try {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;

    let recents = getRecentSearches();
    // Remove if already exists (we'll add at front)
    recents = recents.filter(q => q.toLowerCase() !== normalized);
    // Add to front
    recents.unshift(query.trim());
    // Keep only most recent MAX_RECENT
    recents = recents.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recents));
  } catch {
    // Silently fail if localStorage unavailable
  }
}
