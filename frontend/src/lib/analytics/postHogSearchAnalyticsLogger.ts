/**
 * POSTHOG SEARCH ANALYTICS LOGGER
 * Phase 3.8: Remote event sink integration
 *
 * Implements SearchAnalyticsLogger to send events to PostHog
 * Uses PostHog JS SDK for lightweight, event-based analytics
 *
 * Privacy model: Only sends Phase 3.7-approved fields
 * - rawQuery: NEVER sent (kept local only)
 * - sanitizedQuery: 100-char truncated, SENT
 * - queryHash: Deterministic fingerprint, SENT
 *
 * Event batching handled by PostHog SDK (automatic)
 * Offline support handled by PostHog SDK (queues locally)
 */

import { SearchAnalyticsEvent, SearchAnalyticsLogger } from './searchAnalytics';

/**
 * Safe event payload for remote transmission
 * Excludes rawQuery, includes only Phase 3.7-approved fields
 * Extends Record<string, unknown> for PostHog SDK compatibility
 */
interface SafeSearchAnalyticsEventPayload extends Record<string, unknown> {
  type: string;
  timestamp: number;
  sanitizedQuery?: string;
  queryHash?: string;
  normalizedQuery?: string;
  parsed?: boolean;
  intentPattern?: string | null;
  filterType?: string | null;
  filterEntity?: string | null;
  resultCount?: number;
  emptyResult?: boolean;
  selectedId?: string;
  selectedLabel?: string;
  selectedKind?: 'node' | 'project';
  selectedType?: string;
  selectedRank?: number;
  sessionDurationMs?: number;
  // Ask-the-Graph event fields
  entity?: string;
  questionType?: string;
  attemptedQuestionType?: string;
  reason?: string;
  answerLength?: number;
  citedNodeCount?: number;
  citedProjectCount?: number;
  answerConfidence?: 'high' | 'medium' | 'low';
  requestId?: string;
  model?: string;
  usedStreaming?: boolean;
  fallbackReason?: string;
  firstTokenLatencyMs?: number;
  totalStreamDurationMs?: number;
  chunkCount?: number;
  isCacheHit?: boolean;
  itemId?: string;
  itemType?: 'node' | 'project';
  citationIndex?: number;
}

/**
 * Type declaration for PostHog SDK
 * Allows usage without adding SDK as hard dependency (lazy load possible)
 */
interface PostHogInstance {
  capture(event: string, properties?: Record<string, unknown>): void;
  identify(distinctId: string, properties?: Record<string, unknown>): void;
  reset(): void;
}

/**
 * Check if PostHog SDK is available
 * Returns the global posthog instance if loaded, null otherwise
 */
function getPostHogInstance(): PostHogInstance | null {
  if (typeof window === 'undefined') return null;
  return (window as any).posthog ?? null;
}

/**
 * Extract safe fields from analytics event for remote transmission
 * Explicitly EXCLUDES rawQuery per Phase 3.7 privacy model
 */
function extractSafePayload(event: SearchAnalyticsEvent): SafeSearchAnalyticsEventPayload {
  // Always safe: never include rawQuery
  const safePayload: SafeSearchAnalyticsEventPayload = {
    type: event.type,
    timestamp: event.timestamp,
  };

  // Include sanitized query only if present
  if ('sanitizedQuery' in event && event.sanitizedQuery) {
    safePayload.sanitizedQuery = event.sanitizedQuery;
  }

  // Include query hash if present
  if ('queryHash' in event && event.queryHash) {
    safePayload.queryHash = event.queryHash;
  }

  // Type-specific safe fields
  if (event.type === 'search_executed') {
    safePayload.normalizedQuery = event.normalizedQuery;
    safePayload.parsed = event.parsed;
    safePayload.intentPattern = event.intentPattern;
    safePayload.filterType = event.filterType;
    safePayload.filterEntity = event.filterEntity;
    safePayload.resultCount = event.resultCount;
    safePayload.emptyResult = event.emptyResult;
  } else if (event.type === 'search_result_selected') {
    safePayload.parsed = event.parsed;
    safePayload.intentPattern = event.intentPattern;
    safePayload.selectedId = event.selectedId;
    safePayload.selectedLabel = event.selectedLabel;
    safePayload.selectedKind = event.selectedKind;
    safePayload.selectedType = event.selectedType;
    safePayload.selectedRank = event.selectedRank;
    safePayload.resultCount = event.resultCount;
  } else if (event.type === 'search_abandoned') {
    safePayload.normalizedQuery = event.normalizedQuery;
    safePayload.parsed = event.parsed;
    safePayload.intentPattern = event.intentPattern;
    safePayload.filterType = event.filterType;
    safePayload.filterEntity = event.filterEntity;
    safePayload.resultCount = event.resultCount;
    safePayload.sessionDurationMs = event.sessionDurationMs;
  } else if (event.type === 'ask_graph_submitted') {
    safePayload.entity = event.entity;
    safePayload.questionType = event.questionType;
  } else if (event.type === 'ask_graph_answered') {
    safePayload.entity = event.entity;
    safePayload.questionType = event.questionType;
    safePayload.answerLength = event.answerLength;
    safePayload.citedNodeCount = event.citedNodeCount;
    safePayload.citedProjectCount = event.citedProjectCount;
    safePayload.answerConfidence = event.answerConfidence;
    if ('requestId' in event && event.requestId) {
      safePayload.requestId = event.requestId;
    }
    if ('model' in event && event.model) {
      safePayload.model = event.model;
    }
    if ('usedStreaming' in event && event.usedStreaming !== undefined) {
      safePayload.usedStreaming = event.usedStreaming;
    }
    if ('fallbackReason' in event && event.fallbackReason) {
      safePayload.fallbackReason = event.fallbackReason;
    }
    if ('firstTokenLatencyMs' in event && event.firstTokenLatencyMs !== undefined) {
      safePayload.firstTokenLatencyMs = event.firstTokenLatencyMs;
    }
    if ('totalStreamDurationMs' in event && event.totalStreamDurationMs !== undefined) {
      safePayload.totalStreamDurationMs = event.totalStreamDurationMs;
    }
    if ('chunkCount' in event && event.chunkCount !== undefined) {
      safePayload.chunkCount = event.chunkCount;
    }
    if ('isCacheHit' in event && event.isCacheHit !== undefined) {
      safePayload.isCacheHit = event.isCacheHit;
    }
  } else if (event.type === 'ask_graph_no_answer') {
    safePayload.entity = event.entity;
    safePayload.attemptedQuestionType = event.attemptedQuestionType;
    safePayload.reason = event.reason;
  } else if (event.type === 'ask_graph_evidence_clicked') {
    safePayload.itemId = event.itemId;
    safePayload.itemType = event.itemType;
    safePayload.citationIndex = event.citationIndex;
  }

  return safePayload;
}

/**
 * PostHog Search Analytics Logger
 * Sends safe events to PostHog instance (if available)
 * Falls back gracefully if PostHog SDK not loaded
 */
export class PostHogSearchAnalyticsLogger implements SearchAnalyticsLogger {
  private enabled: boolean = false;
  private fallbackConsoleLog: boolean = true; // Log to console if PostHog unavailable

  constructor(enabled: boolean = false, fallbackConsoleLog: boolean = true) {
    this.enabled = enabled;
    this.fallbackConsoleLog = fallbackConsoleLog;
  }

  log(event: SearchAnalyticsEvent): void {
    if (!this.enabled) return;

    const posthog = getPostHogInstance();
    const safePayload = extractSafePayload(event);

    if (posthog) {
      // PostHog available: send remote event
      try {
        posthog.capture(event.type, safePayload);
      } catch (error) {
        console.error('[PostHogSearchAnalyticsLogger] Error capturing event:', error);
        // Don't suppress downstream effects even if logging fails
      }
    } else {
      // PostHog not available: fallback to console if enabled
      if (this.fallbackConsoleLog) {
        console.log(
          `[PostHogSearchAnalyticsLogger] PostHog not loaded. Event would be: ${event.type}`,
          safePayload
        );
      }
    }
  }

  /**
   * Enable/disable event sending
   * When disabled, events are not logged or sent
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set whether to log to console when PostHog unavailable
   * Useful for development debugging
   */
  setFallbackConsoleLog(enable: boolean): void {
    this.fallbackConsoleLog = enable;
  }

  /**
   * Force identify user (if using PostHog with user tracking)
   * Call from app init if you want to track specific users
   */
  identifyUser(userId: string): void {
    const posthog = getPostHogInstance();
    if (posthog) {
      try {
        posthog.identify(userId);
      } catch (error) {
        console.error('[PostHogSearchAnalyticsLogger] Error identifying user:', error);
      }
    }
  }
}

/**
 * Create a PostHog logger if API key is available, null otherwise
 * Caller must provide fallback (console logger) if needed
 */
export function createPostHogLogger(): PostHogSearchAnalyticsLogger | null {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;

  if (!apiKey) {
    return null;
  }

  return new PostHogSearchAnalyticsLogger(
    true, // enabled
    false // don't log to console if PostHog available (reduce noise)
  );
}
