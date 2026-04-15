/**
 * SEARCHANALYTICS.TS
 * Lightweight, pluggable analytics for Ask-the-Graph search
 * Phase 3.6: Measure search behavior without backend changes
 *
 * Event types:
 * - search_executed: User performed a search (typed query, got results)
 * - search_result_selected: User clicked or keyboard-selected a result
 * - search_abandoned: User entered search but closed without selecting (Phase 3.7+)
 */

/**
 * search_executed: Fired when a search query produces results (or zero results)
 * Includes parsed vs unparsed distinction and intent pattern info
 * Phase 3.7: Added queryHash and sanitizedQuery for privacy and deduplication
 */
export interface SearchExecutedEvent {
  type: 'search_executed';
  rawQuery: string;           // User's original input
  sanitizedQuery?: string;    // Phase 3.7: Truncated to 100 chars for logging
  queryHash?: string;         // Phase 3.7: Deterministic hash for deduplication
  normalizedQuery: string;    // Normalized search term from parser
  parsed: boolean;            // Whether parser detected a pattern (isLikelyIntent)
  intentPattern: string | null; // Pattern name: 'type-qualified', 'entity-filtered', etc.
  filterType: string | null;  // Applied node type filter (decision, skill, etc.)
  filterEntity: string | null; // Applied entity filter ('project' or 'node')
  resultCount: number;        // How many results returned
  emptyResult: boolean;       // True if resultCount === 0
  timestamp: number;          // Unix ms when search executed
}

/**
 * search_result_selected: Fired when user selects a search result
 * Tracks which result was clicked and what the query was
 * Phase 3.7: Added queryHash and sanitizedQuery for consistency
 */
export interface SearchResultSelectedEvent {
  type: 'search_result_selected';
  rawQuery: string;           // Query that produced this result
  sanitizedQuery?: string;    // Phase 3.7: Truncated to 100 chars for logging
  queryHash?: string;         // Phase 3.7: Deterministic hash for deduplication
  selectedId: string;         // Node or project ID
  selectedLabel: string;      // Display label (title + type for nodes)
  selectedKind: 'node' | 'project';
  selectedType?: string;      // Node type (decision, skill, etc.) if node
  selectedRank: number;       // Position in flat results list
  resultCount: number;        // Total results in that search
  parsed: boolean;            // Whether search was parsed query
  intentPattern: string | null;
  timestamp: number;
}

/**
 * search_abandoned: Fired when user closes search without selecting
 * Phase 3.7: Added queryHash and sanitizedQuery for consistency
 * Note: Abandonment is heuristic (see metricsDefinitions.ts for known false positives)
 */
export interface SearchAbandonedEvent {
  type: 'search_abandoned';
  rawQuery: string;
  sanitizedQuery?: string;    // Phase 3.7: Truncated to 100 chars for logging
  queryHash?: string;         // Phase 3.7: Deterministic hash for deduplication
  normalizedQuery: string;
  parsed: boolean;
  intentPattern: string | null;
  filterType: string | null;
  filterEntity: string | null;
  resultCount: number;
  sessionDurationMs: number;
  timestamp: number;
}

/**
 * ask_graph_submitted: Fired when user submits a question to Ask-the-Graph
 * Phase 4.0: Track natural-language query submissions
 */
export interface AskGraphSubmittedEvent {
  type: 'ask_graph_submitted';
  rawQuery?: string;          // User's original question (local only, not transmitted)
  sanitizedQuery: string;     // Truncated to 100 chars for safe logging
  queryHash: string;          // Deterministic hash for deduplication
  entity: string;             // Extracted entity name
  questionType: string;       // Type of question (definition, relationship, etc.)
  timestamp: number;
}

/**
 * ask_graph_answered: Fired when Ask-the-Graph successfully generates an answer
 * Phase 4.0: Track successful answers with evidence metrics
 * Phase 8.2: Added enriched instrumentation fields for streaming/fallback behavior
 */
export interface AskGraphAnsweredEvent {
  type: 'ask_graph_answered';
  rawQuery?: string;          // User's original question (local only)
  sanitizedQuery: string;
  queryHash: string;
  entity: string;
  questionType: string;
  answerLength: number;       // Character count of answer text
  citedNodeCount: number;     // How many nodes cited as evidence
  citedProjectCount: number;  // How many projects cited as evidence
  answerConfidence: 'high' | 'medium' | 'low';
  // Phase 8.2: Enriched instrumentation fields
  requestId?: string;         // Backend request ID for correlation
  model?: string;             // LLM model used (gpt-5.4-mini-2026-03-17, gpt-5.4-2026-03-05, etc.)
  usedStreaming?: boolean;    // True if response was streamed, false if fallback
  fallbackReason?: string;    // Reason for fallback (if usedStreaming=false)
  firstTokenLatencyMs?: number; // Time from request to first token (streaming only)
  totalStreamDurationMs?: number; // Total time for response generation
  chunkCount?: number;        // Number of SSE chunks (streaming only)
  timestamp: number;
}

/**
 * ask_graph_no_answer: Fired when Ask-the-Graph cannot answer a question
 * Phase 4.0: Track queries that fail to find supporting evidence
 */
export interface AskGraphNoAnswerEvent {
  type: 'ask_graph_no_answer';
  rawQuery?: string;          // User's original question (local only)
  sanitizedQuery: string;
  queryHash: string;
  entity: string;
  attemptedQuestionType: string;
  reason: string;             // Why answer couldn't be generated (no_data, insufficient_evidence, etc.)
  timestamp: number;
}

/**
 * ask_graph_evidence_clicked: Fired when user clicks a cited item from an answer
 * Phase 4.0: Track navigation from answer evidence back to canvas/selection
 */
export interface AskGraphEvidenceClickedEvent {
  type: 'ask_graph_evidence_clicked';
  rawQuery?: string;          // Original question (local only)
  sanitizedQuery: string;
  queryHash: string;
  itemId: string;             // Node or project ID that was clicked
  itemType: 'node' | 'project';
  citationIndex: number;      // Position in evidence list (0-based)
  timestamp: number;
}

/**
 * constellation_node_selected: Fired when user selects a node on the graph
 * Phase 5.8: Track node selection for release hardening
 */
export interface ConstellationNodeSelectedEvent {
  type: 'constellation_node_selected';
  nodeId: string;             // Selected node ID
  nodeLabel: string;          // Display label
  nodeType: string;           // decision, skill, constraint, etc.
  gravityScore: number;       // Importance (0-1)
  selectionSource: 'canvas_click' | 'search_result' | 'evidence_click' | 'pinned_item' | 'url_restore';
  timestamp: number;
}

/**
 * constellation_project_selected: Fired when user selects a project on the graph
 * Phase 5.8: Track project selection for release hardening
 */
export interface ConstellationProjectSelectedEvent {
  type: 'constellation_project_selected';
  projectId: string;          // Selected project ID
  projectLabel: string;       // Display label
  gravityScore: number;       // Importance (0-1)
  nodeCountInProject: number; // How many nodes in this project
  selectionSource: 'canvas_click' | 'search_result' | 'evidence_click' | 'pinned_item' | 'url_restore';
  timestamp: number;
}

/**
 * constellation_semantic_filter_toggled: Fired when semantic filter state changes
 * Phase 5.8: Track filter usage for release hardening
 */
export interface ConstellationSemanticFilterToggledEvent {
  type: 'constellation_semantic_filter_toggled';
  filterType: 'subgraph' | 'project_cluster' | 'node_type' | 'tag' | 'relationship_type' | 'gravity_threshold';
  filterName?: string;        // e.g., 'decision' for node_type, 'GetIT' for project_cluster
  enabled: boolean;           // True if enabled, false if cleared
  activeFilterCount: number;  // Total active filters after this change
  timestamp: number;
}

/**
 * constellation_semantic_filters_cleared: Fired when all semantic filters cleared
 * Phase 5.8: Track full reset behavior for release hardening
 */
export interface ConstellationSemanticFiltersClearedEvent {
  type: 'constellation_semantic_filters_cleared';
  filtersCleared: number;     // How many filters were active before clear
  timestamp: number;
}

/**
 * constellation_answer_context_entered: Fired when user gets an answer from Ask-the-Graph
 * Phase 5.8: Track answer context entry for release hardening
 */
export interface ConstellationAnswerContextEnteredEvent {
  type: 'constellation_answer_context_entered';
  questionType: string;       // definition, relationship, scope, patterns, etc.
  answerConfidence: 'high' | 'medium' | 'low';
  citedNodeCount: number;     // Evidence nodes
  citedProjectCount: number;  // Evidence projects
  timestamp: number;
}

/**
 * constellation_answer_context_exited: Fired when user dismisses an answer
 * Phase 5.8: Track answer context exit for release hardening
 */
export interface ConstellationAnswerContextExitedEvent {
  type: 'constellation_answer_context_exited';
  sessionDurationMs: number;  // How long answer was displayed
  evidenceClicks: number;     // How many evidence items clicked (inferred from event count)
  timestamp: number;
}

/**
 * layout_mode_changed: Fired when user toggles layout engine (Curated/Dynamic)
 * Phase 6.1: Track layout mode preference for experiment validation
 */
export interface LayoutModeChangedEvent {
  type: 'layout_mode_changed';
  from_mode: 'api' | 'd3';
  to_mode: 'api' | 'd3';
  visible_node_count: number;      // Nodes visible (semantic filter state)
  visible_project_count: number;   // Projects visible
  timestamp: number;
}

/**
 * layout_convergence_measured: Fired when D3 layout simulation completes
 * Phase 6.1: Measure convergence timing and quality for performance gate
 */
export interface LayoutConvergenceMeasuredEvent {
  type: 'layout_convergence_measured';
  visible_node_count: number;      // Nodes in simulation
  visible_project_count: number;   // Projects in simulation
  convergence_ms: number;          // Wall-clock time to settle (milliseconds)
  iteration_count: number;         // Simulation ticks until convergence
  final_velocity: number;          // Average velocity at settlement
  converged: boolean;              // true = below threshold, false = max iterations
  timestamp: number;
}

/**
 * layout_error: Fired when D3 layout computation fails
 * Phase 6.1: Track errors for stability monitoring and fallback validation
 */
export interface LayoutErrorEvent {
  type: 'layout_error';
  error_reason: string;            // 'simulation_failed' | 'no_positions' | 'data_unavailable'
  fallback_mode: 'api';            // Always fall back to API on error
  visible_node_count?: number;     // Visible count at failure (if available)
  visible_project_count?: number;
  timestamp: number;
}

/**
 * Union of all analytics events
 */
export type SearchAnalyticsEvent =
  | SearchExecutedEvent
  | SearchResultSelectedEvent
  | SearchAbandonedEvent
  | AskGraphSubmittedEvent
  | AskGraphAnsweredEvent
  | AskGraphNoAnswerEvent
  | AskGraphEvidenceClickedEvent
  | ConstellationNodeSelectedEvent
  | ConstellationProjectSelectedEvent
  | ConstellationSemanticFilterToggledEvent
  | ConstellationSemanticFiltersClearedEvent
  | ConstellationAnswerContextEnteredEvent
  | ConstellationAnswerContextExitedEvent
  | LayoutModeChangedEvent
  | LayoutConvergenceMeasuredEvent
  | LayoutErrorEvent;

/**
 * Pluggable logger interface
 * Allows swapping implementations (console, in-memory buffer, real analytics provider)
 */
export interface SearchAnalyticsLogger {
  log(event: SearchAnalyticsEvent): void;
}

/**
 * Default logger: logs to console (development-friendly)
 * Can be configured to suppress output or capture events
 */
export class ConsoleSearchAnalyticsLogger implements SearchAnalyticsLogger {
  private enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  log(event: SearchAnalyticsEvent): void {
    if (!this.enabled) return;

    // Log to console (visible in DevTools; safe in production)
    console.group(`[SearchAnalytics] ${event.type}`);
    console.table(event);
    console.groupEnd();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

/**
 * In-memory buffer logger
 * Useful for Phase 3.7+ when integrating real analytics provider
 * Collects events and allows bulk export
 */
export class BufferSearchAnalyticsLogger implements SearchAnalyticsLogger {
  private events: SearchAnalyticsEvent[] = [];
  private maxSize: number = 500;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  log(event: SearchAnalyticsEvent): void {
    this.events.push(event);
    // Maintain max size (FIFO removal if exceeded)
    if (this.events.length > this.maxSize) {
      this.events.shift();
    }
  }

  getEvents(): SearchAnalyticsEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }

  exportJSON(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

/**
 * Global logger instance (pluggable)
 * Default: console logger (development-friendly)
 */
let globalLogger: SearchAnalyticsLogger = new ConsoleSearchAnalyticsLogger();

/**
 * Set the global analytics logger (for integration with real analytics provider)
 */
export function setSearchAnalyticsLogger(logger: SearchAnalyticsLogger): void {
  globalLogger = logger;
}

/**
 * Fire a search analytics event
 * Sole public API for logging events
 */
export function logSearchEvent(event: SearchAnalyticsEvent): void {
  globalLogger.log(event);
}

/**
 * Get current logger (for debugging, testing)
 * @internal
 */
export function _getSearchAnalyticsLogger(): SearchAnalyticsLogger {
  return globalLogger;
}
