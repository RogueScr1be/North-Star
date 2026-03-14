/**
 * SEARCHINTENTHELPER.TS
 * Derive intent pattern names from ParsedQuery for analytics
 * Phase 3.6: Instrumentation helper to avoid duplicating parser logic
 */

import { ParsedQuery } from './queryParser';

/**
 * Intent pattern names (matching queryParser.ts patterns)
 * Used for analytics to categorize query patterns
 */
export type IntentPatternName =
  | 'explicit-type-qualified'  // "find decision nodes about X"
  | 'implicit-type-qualified'  // "X decision"
  | 'entity-filtered'          // "X projects"
  | 'type-only'                // "decision nodes" (no search term)
  | 'basic-search';            // "X" (no pattern matched)

/**
 * Derive pattern name from ParsedQuery
 * Pure function: no side effects
 *
 * Precedence matches queryParser.ts:
 * 1. explicit-type-qualified: has filterType + intent contains "find/show"
 * 2. implicit-type-qualified: has filterType + searchTerm not empty
 * 3. entity-filtered: has filterEntity but no filterType
 * 4. type-only: has filterType but searchTerm is empty
 * 5. basic-search: no filters (isLikelyIntent = false)
 */
export function deriveIntentPattern(parsed: ParsedQuery): IntentPatternName | null {
  // Not a parsed query (plain search)
  if (!parsed.isLikelyIntent) {
    return null;
  }

  // Explicit type + search term pattern (finds with intent message)
  if (parsed.filterType && parsed.searchTerm && parsed.intent) {
    // Check if intent message includes "find" or "show" to distinguish explicit vs implicit
    const intentLower = parsed.intent.toLowerCase();
    if (intentLower.includes('find') || intentLower.includes('show')) {
      return 'explicit-type-qualified';
    }
    // Otherwise, assume implicit (user typed "architecture decision")
    return 'implicit-type-qualified';
  }

  // Type filter with search term (implicit pattern: "X type")
  if (parsed.filterType && parsed.searchTerm) {
    return 'implicit-type-qualified';
  }

  // Entity filter (project filter)
  if (parsed.filterEntity && !parsed.filterType) {
    return 'entity-filtered';
  }

  // Type filter without search term ("show all [type] nodes")
  if (parsed.filterType && !parsed.searchTerm) {
    return 'type-only';
  }

  // Fallback (shouldn't reach here if isLikelyIntent is true)
  return null;
}

/**
 * Friendly description of intent pattern (for debugging/logging)
 * Example: "explicit-type-qualified" → "Type-qualified search (explicit)"
 */
export function describeIntentPattern(pattern: IntentPatternName | null): string {
  if (!pattern) return 'Basic search';

  const descriptions: Record<IntentPatternName, string> = {
    'explicit-type-qualified': 'Type-qualified search (explicit)',
    'implicit-type-qualified': 'Type-qualified search (implicit)',
    'entity-filtered': 'Entity-filtered search (projects)',
    'type-only': 'Type-only (show all)',
    'basic-search': 'Basic search',
  };

  return descriptions[pattern];
}

/**
 * Summary aggregation for Phase 3.6 questions
 * Useful for local debugging/analysis
 * Phase 3.7: Updated to reflect debounced event quality
 */
export interface SearchAnalyticsSummary {
  totalSearches: number; // Phase 3.7: Now canonical (debounced)
  parsedVsUnparsed: { parsed: number; unparsed: number; ratio: string }; // Phase 3.7: Directional
  emptyResultRate: string; // Phase 3.7: Now canonical (debounced)
  patternDistribution: Record<string, number>;
  topFailedQueries: Array<{ query: string; count: number }>;
  eventQualityNotes?: string;
}

/**
 * Metric quality classification (Phase 3.7)
 * Helps determine what metrics are ready for dashboards/decisions
 */
export type MetricTrustworthiness = 'canonical' | 'directional' | 'heuristic' | 'not-supported-yet';

/**
 * Get trustworthiness level for a specific metric
 * Useful for analytics integration in Phase 3.8+
 *
 * @internal
 */
export function getMetricTrustworthiness(metricName: string): MetricTrustworthiness {
  const trustMap: Record<string, MetricTrustworthiness> = {
    'total_searches': 'canonical', // Phase 3.7: Debounced, reliable
    'empty_result_rate': 'canonical', // Phase 3.7: Debounced, reliable
    'parsed_vs_unparsed_ratio': 'directional', // Good signal, but doesn't measure usefulness
    'search_result_ctr': 'directional', // Only covers search dropdown, not pinned/recent
    'avg_result_position': 'directional', // Correlates with ranking quality
    'search_abandonment_rate': 'heuristic', // Phase 3.7: Known false positives (~20-30%)
    'avg_session_duration': 'heuristic', // Not fully instrumented
    'search_to_action_conversion': 'not-supported-yet', // Requires downstream tracking
    'ranking_quality': 'not-supported-yet', // Requires labeled data
  };

  return trustMap[metricName] || 'not-supported-yet';
}

/**
 * Helper to aggregate analytics events (for local inspection)
 * Phase 3.7+: Can be extended to feed real analytics dashboard
 *
 * @internal
 */
export function summarizeSearchAnalytics(events: any[]): SearchAnalyticsSummary {
  const searchExecutedEvents = events.filter((e) => e.type === 'search_executed');
  // Note: resultSelectedEvents can be used for CTR analysis in Phase 3.7+

  // Count parsed vs unparsed
  const parsed = searchExecutedEvents.filter((e) => e.parsed).length;
  const unparsed = searchExecutedEvents.filter((e) => !e.parsed).length;
  const total = parsed + unparsed;

  // Empty result rate
  const emptyResults = searchExecutedEvents.filter((e) => e.emptyResult).length;
  const emptyRate = total > 0 ? ((emptyResults / total) * 100).toFixed(1) : '0.0';

  // Pattern distribution
  const patternCounts: Record<string, number> = {};
  searchExecutedEvents.forEach((e) => {
    const pattern = e.intentPattern || 'basic-search';
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  });

  // Top failed queries (queries that produced zero results)
  const failedQueries: Record<string, number> = {};
  searchExecutedEvents
    .filter((e) => e.emptyResult)
    .forEach((e) => {
      failedQueries[e.rawQuery] = (failedQueries[e.rawQuery] || 0) + 1;
    });

  const topFailed = Object.entries(failedQueries)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalSearches: total,
    parsedVsUnparsed: {
      parsed,
      unparsed,
      ratio: total > 0 ? `${((parsed / total) * 100).toFixed(1)}%` : '0%',
    },
    emptyResultRate: `${emptyRate}%`,
    patternDistribution: patternCounts,
    topFailedQueries: topFailed,
  };
}
