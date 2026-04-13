/**
 * FRONTEND TELEMETRY
 * Client-side event logging for Ask-the-Graph interactions
 * Events correlated via request_id for end-to-end tracing
 */

import { _getSearchAnalyticsLogger } from './analytics/searchAnalytics';

/**
 * Frontend event: Ask-the-Graph response rendered in UI
 * Fired when answer text appears in the panel after backend response
 */
export function logAskGraphResponseRendered(
  requestId: string,
  responseTimeMs: number,
  citedNodeCount: number,
  citedProjectCount: number,
  confidence: 'high' | 'medium' | 'low'
): void {
  _getSearchAnalyticsLogger().log({
    type: 'ask_graph_response_rendered',
    request_id: requestId,
    response_time_ms: responseTimeMs,
    cited_node_count: citedNodeCount,
    cited_project_count: citedProjectCount,
    confidence: confidence,
    timestamp: Date.now(),
  } as any);
}

/**
 * Frontend event: User clicked on evidence item (node/project)
 * Fired when user clicks a cited node or project to navigate
 */
export function logAskGraphEvidenceClicked(
  requestId: string,
  citedItemId: string,
  citedItemType: 'node' | 'project',
  citationIndex: number,
  totalCitations: number
): void {
  _getSearchAnalyticsLogger().log({
    type: 'ask_graph_evidence_clicked',
    request_id: requestId,
    cited_item_id: citedItemId,
    cited_item_type: citedItemType,
    citation_index: citationIndex,
    total_citations: totalCitations,
    timestamp: Date.now(),
  } as any);
}

/**
 * Frontend event: Ask-the-Graph panel closed
 * Fired when user dismisses the panel (clear button or escape key)
 */
export function logAskGraphPanelClosed(
  requestId: string,
  panelOpenDurationMs: number,
  evidenceClicked: boolean
): void {
  _getSearchAnalyticsLogger().log({
    type: 'ask_graph_panel_closed',
    request_id: requestId,
    panel_open_duration_ms: panelOpenDurationMs,
    evidence_clicked: evidenceClicked,
    timestamp: Date.now(),
  } as any);
}

/**
 * Frontend event: Ask-the-Graph error
 * Fired when response fails or panel encounters unexpected error
 */
export function logAskGraphFrontendError(
  requestId: string,
  errorMessage: string,
  errorType: string
): void {
  _getSearchAnalyticsLogger().log({
    type: 'ask_graph_frontend_error',
    request_id: requestId,
    error_message: errorMessage,
    error_type: errorType,
    timestamp: Date.now(),
  } as any);
}
