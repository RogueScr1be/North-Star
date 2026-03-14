/**
 * CONSTELLATIONANALYTICS.TS
 * Lightweight event firing for constellation interaction tracking
 * Phase 5.8: Release hardening instrumentation
 *
 * Purpose:
 * - Track node/project selection for release monitoring
 * - Track semantic filter usage for feature validation
 * - Track answer context lifecycle for answer feature telemetry
 * - All events logged locally; no remote transmission in v1
 *
 * Design:
 * - Pure functions, no side effects beyond event logging
 * - Events include context (source, type, count) for analysis
 * - Session tracking deferred to Phase 5.9+ (use Referer headers if needed)
 */

import { logSearchEvent } from './searchAnalytics';
import type {
  ConstellationNodeSelectedEvent,
  ConstellationProjectSelectedEvent,
  ConstellationSemanticFilterToggledEvent,
  ConstellationSemanticFiltersClearedEvent,
  ConstellationAnswerContextEnteredEvent,
  ConstellationAnswerContextExitedEvent,
  LayoutModeChangedEvent,
  LayoutConvergenceMeasuredEvent,
  LayoutErrorEvent,
} from './searchAnalytics';
import type { GraphNode, GraphProject } from '../graph/graphTypes';

/**
 * Fire event: Node selected on canvas, search result, or URL restoration
 */
export function logNodeSelected(
  node: GraphNode,
  selectionSource: 'canvas_click' | 'search_result' | 'evidence_click' | 'pinned_item' | 'url_restore'
): void {
  const event: ConstellationNodeSelectedEvent = {
    type: 'constellation_node_selected',
    nodeId: node.id,
    nodeLabel: node.title,
    nodeType: node.type,
    gravityScore: node.gravity_score,
    selectionSource,
    timestamp: Date.now(),
  };
  logSearchEvent(event);
}

/**
 * Fire event: Project selected on canvas, search result, or URL restoration
 */
export function logProjectSelected(
  project: GraphProject,
  nodeCountInProject: number,
  selectionSource: 'canvas_click' | 'search_result' | 'evidence_click' | 'pinned_item' | 'url_restore'
): void {
  const event: ConstellationProjectSelectedEvent = {
    type: 'constellation_project_selected',
    projectId: project.id,
    projectLabel: project.title,
    gravityScore: project.gravity_score,
    nodeCountInProject,
    selectionSource,
    timestamp: Date.now(),
  };
  logSearchEvent(event);
}

/**
 * Fire event: Semantic filter toggled (on or off)
 * Call this when any filter changes state (not on every keystroke, only on commit)
 */
export function logSemanticFilterToggled(
  filterType: 'subgraph' | 'project_cluster' | 'node_type' | 'tag' | 'relationship_type' | 'gravity_threshold',
  filterName: string | undefined,
  enabled: boolean,
  activeFilterCount: number
): void {
  const event: ConstellationSemanticFilterToggledEvent = {
    type: 'constellation_semantic_filter_toggled',
    filterType,
    filterName,
    enabled,
    activeFilterCount,
    timestamp: Date.now(),
  };
  logSearchEvent(event);
}

/**
 * Fire event: All semantic filters cleared at once (e.g., "Clear all filters" button)
 */
export function logSemanticFiltersCleared(filtersCleared: number): void {
  const event: ConstellationSemanticFiltersClearedEvent = {
    type: 'constellation_semantic_filters_cleared',
    filtersCleared,
    timestamp: Date.now(),
  };
  logSearchEvent(event);
}

/**
 * Fire event: User receives an answer from Ask-the-Graph
 * Call this when answer is rendered (not when question is submitted)
 */
export function logAnswerContextEntered(
  questionType: string,
  answerConfidence: 'high' | 'medium' | 'low',
  citedNodeCount: number,
  citedProjectCount: number
): void {
  const event: ConstellationAnswerContextEnteredEvent = {
    type: 'constellation_answer_context_entered',
    questionType,
    answerConfidence,
    citedNodeCount,
    citedProjectCount,
    timestamp: Date.now(),
  };
  logSearchEvent(event);
}

/**
 * Fire event: User exits answer context (dismisses answer)
 * Call this when answer panel closes or new question submitted
 *
 * @param sessionDurationMs - How long answer was visible (Date.now() - answerShownAt)
 * @param evidenceClicks - Track via event counting (inferred from ask_graph_evidence_clicked events)
 */
export function logAnswerContextExited(sessionDurationMs: number, evidenceClicks?: number): void {
  const event: ConstellationAnswerContextExitedEvent = {
    type: 'constellation_answer_context_exited',
    sessionDurationMs,
    evidenceClicks: evidenceClicks ?? 0,
    timestamp: Date.now(),
  };
  logSearchEvent(event);
}

/**
 * INTERNAL HELPERS: Event counting and session tracking
 * (For future integration with analytics dashboard)
 */

/**
 * Count active filters across all categories
 * Use when firing semantic_filter_toggled to include activeFilterCount
 *
 * @param semanticFilters - Filters state from useGraphSemantics
 * @returns Total count of enabled filters across all categories
 */
export function countActiveFilters(semanticFilters: any): number {
  let count = 0;
  if (semanticFilters.subgraphNodeId) count += 1;
  if (semanticFilters.projectClusterId) count += 1;
  if (semanticFilters.enabledNodeTypes?.size ?? 0 > 0) count += semanticFilters.enabledNodeTypes.size;
  if (semanticFilters.enabledTags?.size ?? 0 > 0) count += semanticFilters.enabledTags.size;
  if (semanticFilters.enabledRelationshipTypes?.size ?? 0 > 0) count += semanticFilters.enabledRelationshipTypes.size;
  if (semanticFilters.gravityThreshold !== undefined && semanticFilters.gravityThreshold > 0) count += 1;
  return count;
}

/**
 * Track answer session start time
 * Store in component state, use in logAnswerContextExited()
 *
 * @returns Timestamp to store in state
 */
export function getAnswerSessionStartTime(): number {
  return Date.now();
}

/**
 * Fire event: Layout mode changed (Curated/Dynamic toggle)
 * Phase 6.1: Track user preference for D3 experiment
 */
export function logLayoutModeChanged(
  fromMode: 'api' | 'd3',
  toMode: 'api' | 'd3',
  visibleNodeCount: number,
  visibleProjectCount: number
): void {
  const event: LayoutModeChangedEvent = {
    type: 'layout_mode_changed',
    from_mode: fromMode,
    to_mode: toMode,
    visible_node_count: visibleNodeCount,
    visible_project_count: visibleProjectCount,
    timestamp: Date.now(),
  };
  logSearchEvent(event);
}

/**
 * Fire event: D3 layout simulation converged
 * Phase 6.1: Measure performance for decision gate
 */
export function logLayoutConvergenceMeasured(
  visibleNodeCount: number,
  visibleProjectCount: number,
  convergenceMs: number,
  iterationCount: number,
  finalVelocity: number,
  converged: boolean
): void {
  const event: LayoutConvergenceMeasuredEvent = {
    type: 'layout_convergence_measured',
    visible_node_count: visibleNodeCount,
    visible_project_count: visibleProjectCount,
    convergence_ms: convergenceMs,
    iteration_count: iterationCount,
    final_velocity: finalVelocity,
    converged,
    timestamp: Date.now(),
  };
  logSearchEvent(event);
}

/**
 * Fire event: Layout computation failed, falling back to API
 * Phase 6.1: Track errors for stability validation
 */
export function logLayoutError(
  reason: string,
  visibleNodeCount?: number,
  visibleProjectCount?: number
): void {
  const event: LayoutErrorEvent = {
    type: 'layout_error',
    error_reason: reason,
    fallback_mode: 'api',
    visible_node_count: visibleNodeCount,
    visible_project_count: visibleProjectCount,
    timestamp: Date.now(),
  };
  logSearchEvent(event);
}

/**
 * DISABLE/ENABLE LOGGING: For testing or debugging
 * (Intended for use in test environments only)
 */
let loggingEnabled = true;

/**
 * Disable event logging (temporary, for testing)
 * @internal
 */
export function _disableConstellationLogging(): void {
  loggingEnabled = false;
}

/**
 * Re-enable event logging
 * @internal
 */
export function _enableConstellationLogging(): void {
  loggingEnabled = true;
}

/**
 * Check if logging is enabled
 * @internal
 */
export function _isConstellationLoggingEnabled(): boolean {
  return loggingEnabled;
}

// Note: Once logging disabled, above functions silently succeed but don't log.
// This is for testing; production should always log.
