/**
 * QUERYPARSER.TS
 * Natural language query parsing for "Ask the Graph"
 * Phase 3.5: Lightweight intent recognition without ML
 *
 * Supports patterns:
 * - Type-qualified: "find decision nodes about X", "constraint nodes", "X decision"
 * - Entity-filtered: "projects about X", "X project"
 * - Basic: "X" (existing behavior)
 *
 * No dependencies, no backend changes, fully reversible.
 */

import { NodeType } from '../graph/graphTypes';

/**
 * Parsed query result
 * Includes normalized search term and optional filters
 */
export interface ParsedQuery {
  searchTerm: string;           // The actual search query
  filterType?: NodeType;        // Optional node type filter (decision, skill, etc)
  filterEntity?: 'project' | 'node'; // Optional entity type filter
  intent?: string;              // Human-readable interpretation for UI hint
  isLikelyIntent: boolean;      // True if parser detected a pattern (vs plain search)
}

/**
 * Node types that users might reference in queries
 * Maps common aliases and plurals to canonical node types
 */
const NODE_TYPE_ALIASES: Record<string, NodeType> = {
  // Canonical forms
  'decision': 'decision',
  'constraint': 'constraint',
  'failure': 'failure',
  'metric': 'metric',
  'skill': 'skill',
  'outcome': 'outcome',
  'experiment': 'experiment',

  // Plurals
  'decisions': 'decision',
  'constraints': 'constraint',
  'failures': 'failure',
  'metrics': 'metric',
  'skills': 'skill',
  'outcomes': 'outcome',
  'experiments': 'experiment',

  // Friendly aliases
  'problem': 'constraint',     // "find problems about X" → constraints
  'problems': 'constraint',
  'issue': 'failure',          // "find issues" → failures
  'issues': 'failure',
  'lesson': 'outcome',         // "find lessons" → outcomes
  'lessons': 'outcome',
  'capability': 'skill',       // "find capabilities" → skills
  'capabilities': 'skill',
  'test': 'experiment',        // "find tests" → experiments
  'tests': 'experiment',
};

/**
 * Extract node type from a token (e.g., "decision" → "decision")
 * Case-insensitive, handles plurals and aliases
 */
function extractNodeType(token: string): NodeType | null {
  const normalized = token.toLowerCase().trim();
  return NODE_TYPE_ALIASES[normalized] ?? null;
}

/**
 * Parse natural language query patterns
 *
 * Patterns (in precedence order):
 * 1. "find/show [type] nodes about [search]" → filter by type, search term
 * 2. "[search] [type]" → filter by type, search term
 * 3. "[search] project(s)" → filter to projects, search term
 * 4. "[type] nodes" → filter by type, no search term (match all of type)
 * 5. "[search]" → basic search (no filters)
 *
 * Examples:
 * - "find decision nodes about architecture" → type=decision, search="architecture"
 * - "architecture decision" → type=decision, search="architecture"
 * - "fast food projects" → entity=project, search="fast food"
 * - "skill nodes" → type=skill, no search (all skills)
 * - "fast food" → no filters, search="fast food"
 */
export function parseQuery(rawQuery: string): ParsedQuery {
  const trimmed = rawQuery.trim();

  // Empty query → no intent
  if (!trimmed) {
    return {
      searchTerm: '',
      isLikelyIntent: false,
    };
  }

  // Tokenize: split by whitespace
  const tokens = trimmed.toLowerCase().split(/\s+/);

  // Pattern 1: "find/show [type] nodes about [search]"
  // Example: "find decision nodes about architecture"
  if ((tokens[0] === 'find' || tokens[0] === 'show') && tokens.length >= 4) {
    const typeToken = tokens[1];
    const nodeType = extractNodeType(typeToken);
    if (nodeType && tokens[2] === 'nodes' && tokens[3] === 'about') {
      const searchTerm = tokens.slice(4).join(' ');
      return {
        searchTerm,
        filterType: nodeType,
        intent: `Show ${nodeType} nodes about "${searchTerm}"`,
        isLikelyIntent: true,
      };
    }
  }

  // Pattern 2: "[search] [type]" (type at end)
  // Example: "architecture decision", "team-building skill"
  if (tokens.length >= 2) {
    const lastToken = tokens[tokens.length - 1];
    const nodeType = extractNodeType(lastToken);
    if (nodeType) {
      const searchTerm = tokens.slice(0, -1).join(' ');
      return {
        searchTerm,
        filterType: nodeType,
        intent: `Show ${nodeType} nodes about "${searchTerm}"`,
        isLikelyIntent: true,
      };
    }
  }

  // Pattern 3: "[search] project(s)" (project entity filter)
  // Example: "fast food projects", "recruiting project"
  if (tokens.length >= 2 && (tokens[tokens.length - 1] === 'project' || tokens[tokens.length - 1] === 'projects')) {
    const searchTerm = tokens.slice(0, -1).join(' ');
    return {
      searchTerm,
      filterEntity: 'project',
      intent: `Show projects about "${searchTerm}"`,
      isLikelyIntent: true,
    };
  }

  // Pattern 4: "[type] nodes" (show all of type, no search)
  // Example: "decision nodes", "skill nodes"
  if (tokens.length >= 2 && tokens[tokens.length - 1] === 'nodes') {
    const typeToken = tokens.slice(0, -1).join(' ');
    const nodeType = extractNodeType(typeToken);
    if (nodeType) {
      return {
        searchTerm: '', // Match all nodes of this type
        filterType: nodeType,
        intent: `Show all ${nodeType} nodes`,
        isLikelyIntent: true,
      };
    }
  }

  // Pattern 5: Basic search (no filters detected)
  return {
    searchTerm: trimmed,
    isLikelyIntent: false,
  };
}

/**
 * Format intent message for UI display
 * Called by SearchUI to show user what their query was interpreted as
 */
export function formatIntentMessage(parsed: ParsedQuery): string | null {
  if (!parsed.isLikelyIntent || !parsed.intent) {
    return null;
  }
  return parsed.intent;
}

/**
 * Test helper: verify parser matches expected patterns
 */
export function testParseQuery(
  input: string,
  expectedTerm: string,
  expectedType?: NodeType,
  expectedEntity?: 'project' | 'node'
): boolean {
  const parsed = parseQuery(input);
  return (
    parsed.searchTerm === expectedTerm &&
    parsed.filterType === expectedType &&
    parsed.filterEntity === expectedEntity
  );
}
