/**
 * METRICSDEFINITIONS.TS
 * Formal classification of search analytics metrics
 * Phase 3.7: Clarify which metrics are canonical, directional, or not yet ready
 *
 * Purpose: Guide future analytics integration and set expectations
 * for what data is trustworthy at each phase
 */

/**
 * Metric classification for search analytics
 */
export type MetricTrustworthiness = 'canonical' | 'directional' | 'not-supported-yet' | 'heuristic';

/**
 * Formal definitions of each search metric
 * Updated as Phase 3.7+ instrumentation improves
 */
export interface SearchMetricDefinition {
  name: string;
  description: string;
  trustworthiness: MetricTrustworthiness;
  calculation: string;
  knownLimitations: string[];
  readyForDashboard: boolean;
  readyForRemoteLogging: boolean;
  readyForDecisionMaking: boolean;
  notes: string;
}

/**
 * Complete metric catalog
 * Reference for Phase 3.7+ analytics integration
 */
export const SEARCH_METRICS_CATALOG: Record<string, SearchMetricDefinition> = {
  // === Canonical Metrics (v1) ===

  'total_searches': {
    name: 'Total Searches',
    description: 'Count of unique search sessions where user submitted a query',
    trustworthiness: 'canonical',
    calculation: 'count(search_executed events) after debounce (Phase 3.7)',
    knownLimitations: [
      'Requires debounce of 300ms to avoid keystroke inflation',
      'Does not include navigation item selection (pinned/recent)',
    ],
    readyForDashboard: true,
    readyForRemoteLogging: true,
    readyForDecisionMaking: true,
    notes: 'One of the healthiest metrics. Phase 3.7 debounce makes this bulletproof.',
  },

  'empty_result_rate': {
    name: 'Empty Result Rate',
    description: 'Percentage of searches that returned zero results',
    trustworthiness: 'canonical',
    calculation: 'count(search_executed where emptyResult=true) / total_searches * 100',
    knownLimitations: [
      'Requires debounce like total_searches',
      'Does not indicate user dissatisfaction, just no match',
    ],
    readyForDashboard: true,
    readyForRemoteLogging: true,
    readyForDecisionMaking: true,
    notes: 'Healthy signal for search quality. Use as leading indicator for search gaps.',
  },

  // === Directional Metrics (good signal, but requires context) ===

  'parsed_vs_unparsed_ratio': {
    name: 'Parsed vs Unparsed Ratio',
    description: 'Percentage of searches using Ask-the-Graph intent patterns vs plain keyword search',
    trustworthiness: 'directional',
    calculation: 'count(parsed=true) / total_searches * 100',
    knownLimitations: [
      'Does not measure usefulness, only adoption',
      'Parsed intent might not be what user intended',
      'No UX feedback on whether intent match was correct',
    ],
    readyForDashboard: true,
    readyForRemoteLogging: true,
    readyForDecisionMaking: false,
    notes: 'Good for measuring Ask-the-Graph adoption. Do NOT use for search quality judgments.',
  },

  'search_result_ctr': {
    name: 'Search Result Click-Through Rate',
    description: 'Ratio of result selections to searches (search dropdown results only)',
    trustworthiness: 'directional',
    calculation: 'count(search_result_selected) / total_searches * 100',
    knownLimitations: [
      'Only counts search dropdown selections, NOT pinned/recent item selections',
      'Does NOT include graph canvas direct node clicks',
      'High CTR may indicate good ranking or user desperation',
      'Low CTR may indicate results irrelevant OR user found answer in top result',
    ],
    readyForDashboard: true,
    readyForRemoteLogging: true,
    readyForDecisionMaking: false,
    notes: 'Directional signal only. Use with intent pattern data. Phase 3.8 should expand instrumentation to pinned/recent.',
  },

  'avg_result_position': {
    name: 'Average Selected Result Position',
    description: 'Average rank of selected results (1 = first result)',
    trustworthiness: 'directional',
    calculation: 'avg(search_result_selected[selectedRank])',
    knownLimitations: [
      'Only search dropdown results',
      'Users might select first result they see, not "best" result',
      'No causal link to search quality',
    ],
    readyForDashboard: true,
    readyForRemoteLogging: true,
    readyForDecisionMaking: false,
    notes: 'Lower rank may indicate good ranking. Higher rank may indicate user persisting to find better match.',
  },

  // === Heuristic Metrics (reasonable but known false positives) ===

  'search_abandonment_rate': {
    name: 'Search Abandonment Rate',
    description: 'Percentage of searches where user did not select a result',
    trustworthiness: 'heuristic',
    calculation: 'count(search_abandoned) / (total_searches + count(search_abandoned)) * 100',
    knownLimitations: [
      'FALSE POSITIVES: Canvas click while search open fires abandoned even though user didn\'t abandon',
      'FALSE POSITIVES: ~20-30% of abandonment events are false (Phase 3.6 heuristic)',
      'Does not distinguish intentional close (Escape) from involuntary (blur)',
      'Does not account for users finding answer in top result without selecting',
    ],
    readyForDashboard: false,
    readyForRemoteLogging: false,
    readyForDecisionMaking: false,
    notes: 'Phase 3.7 assessment: directional only. High false positive rate makes it unsuitable for decisions. Phase 3.8 should improve abandonment detection.',
  },

  'avg_session_duration': {
    name: 'Average Search Session Duration',
    description: 'Average time user spent in search dropdown before closing or selecting',
    trustworthiness: 'heuristic',
    calculation: 'avg(search_abandoned[sessionDurationMs]) or avg(search_result_selected implied time)',
    knownLimitations: [
      'search_abandoned has duration field, but search_result_selected does not',
      'Duration doesn\'t indicate quality, just how long user looked',
      'Abandoned sessions skew long (users who couldn\'t find anything)',
    ],
    readyForDashboard: false,
    readyForRemoteLogging: false,
    readyForDecisionMaking: false,
    notes: 'Not implemented in Phase 3.6. Phase 3.8 should add selection timestamps if duration signals are needed.',
  },

  // === Not Supported Yet ===

  'search_to_action_conversion': {
    name: 'Search to Action Conversion',
    description: 'Percentage of searches followed by actual node/project interaction (beyond selection)',
    trustworthiness: 'not-supported-yet',
    calculation: 'Not yet defined',
    knownLimitations: [
      'Requires tracking downstream actions after search selection',
      'Currently no instrumentation for "what user did after selecting a node"',
    ],
    readyForDashboard: false,
    readyForRemoteLogging: false,
    readyForDecisionMaking: false,
    notes: 'Phase 3.8+: Requires instrumentation of panel interactions, edge traversal, etc.',
  },

  'ranking_quality': {
    name: 'Ranking Quality Score',
    description: 'Measure of whether search ranking puts relevant results at top',
    trustworthiness: 'not-supported-yet',
    calculation: 'Not yet defined',
    knownLimitations: [
      'Requires ground truth labels of "correct" results per query',
      'Requires A/B testing infrastructure',
      'Requires user feedback on result relevance',
    ],
    readyForDashboard: false,
    readyForRemoteLogging: false,
    readyForDecisionMaking: false,
    notes: 'Phase 3.9+: Requires user feedback loop and labeled dataset.',
  },

  'query_spelling_accuracy': {
    name: 'Query Spelling Accuracy',
    description: 'Percentage of queries with typos or misspellings (approximate)',
    trustworthiness: 'not-supported-yet',
    calculation: 'Not yet defined',
    knownLimitations: [
      'Requires spell-checking or fuzzy matching infrastructure',
      'False positives for intentional technical terms',
    ],
    readyForDashboard: false,
    readyForRemoteLogging: false,
    readyForDecisionMaking: false,
    notes: 'Phase 3.10+: Only if typo-tolerance search is added.',
  },
};

/**
 * Quick reference: Which metrics are safe for different purposes
 */
export const METRICS_BY_USE_CASE = {
  dashboard: [
    'total_searches',
    'empty_result_rate',
    'parsed_vs_unparsed_ratio',
    'search_result_ctr',
    'avg_result_position',
  ],
  remoteLogging: [
    'total_searches',
    'empty_result_rate',
    'parsed_vs_unparsed_ratio',
    'search_result_ctr',
    'avg_result_position',
  ],
  decisionMaking: [
    'total_searches',
    'empty_result_rate',
    // Note: do NOT use abandoned_rate, ctr, parsed_ratio for decisions
  ],
};

/**
 * Export metric definitions as JSON for analytics provider integration (Phase 3.8+)
 */
export function exportMetricSchemaAsJSON(): string {
  return JSON.stringify(SEARCH_METRICS_CATALOG, null, 2);
}
