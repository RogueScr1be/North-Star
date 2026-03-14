/**
 * ANALYTICSVALIDATOR.TS
 * Dev-only utility for validating search analytics event quality
 * Phase 3.9: Minimal event inspection helpers for real-time validation
 *
 * Usage (in browser console):
 * 1. window.__ANALYTICS_DEBUG__ = true  (enable capture)
 * 2. User interacts with search
 * 3. window.__ANALYTICS_VALIDATOR__.getSummary() (view metrics)
 * 4. window.__ANALYTICS_VALIDATOR__.exportJSON() (export for analysis)
 *
 * Not included in production builds (dev-only)
 */

import { SearchAnalyticsEvent, BufferSearchAnalyticsLogger } from './searchAnalytics';

/**
 * Event validation result
 */
export interface EventValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Analytics metrics summary
 */
export interface AnalyticsSummary {
  totalEvents: number;
  searchExecuted: number;
  searchResultSelected: number;
  searchAbandoned: number;
  canonicalMetrics: {
    totalSearches: number;
    emptyResultRate: number;
  };
  directionalMetrics: {
    parsedVsUnparsedRatio: number;
    searchResultCTR: number;
    avgResultPosition: number;
  };
  eventQualityIssues: {
    missingFields: number;
    malformedPayloads: number;
    duplicateQueries: number;
  };
}

/**
 * Analytics validator utility (dev-only)
 */
export class AnalyticsValidator {
  private eventBuffer: BufferSearchAnalyticsLogger;
  private queryHashes: Set<string> = new Set();

  constructor() {
    this.eventBuffer = new BufferSearchAnalyticsLogger(1000);
  }

  /**
   * Validate individual event payload
   */
  validateEvent(event: SearchAnalyticsEvent): EventValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!event.type) errors.push('Missing type field');
    if (!event.timestamp) errors.push('Missing timestamp field');

    // Type-specific validation
    if (event.type === 'search_executed') {
      if (!('resultCount' in event) || typeof event.resultCount !== 'number') {
        errors.push('search_executed: Missing or invalid resultCount');
      }
      if (!('emptyResult' in event) || typeof event.emptyResult !== 'boolean') {
        errors.push('search_executed: Missing or invalid emptyResult');
      }
      if (!('parsed' in event) || typeof event.parsed !== 'boolean') {
        errors.push('search_executed: Missing or invalid parsed');
      }
      // Warnings for missing optional fields
      if (!event.sanitizedQuery) warnings.push('search_executed: Missing sanitizedQuery (Phase 3.7+)');
      if (!event.queryHash) warnings.push('search_executed: Missing queryHash (Phase 3.7+)');
    }

    if (event.type === 'search_result_selected') {
      if (!('selectedId' in event) || !event.selectedId) {
        errors.push('search_result_selected: Missing selectedId');
      }
      if (!('selectedKind' in event) || !['node', 'project'].includes(event.selectedKind)) {
        errors.push('search_result_selected: Invalid selectedKind');
      }
      if (!('selectedRank' in event) || typeof event.selectedRank !== 'number') {
        errors.push('search_result_selected: Missing or invalid selectedRank');
      }
      if (!event.sanitizedQuery) warnings.push('search_result_selected: Missing sanitizedQuery');
    }

    if (event.type === 'search_abandoned') {
      if (!('sessionDurationMs' in event) || typeof event.sessionDurationMs !== 'number') {
        errors.push('search_abandoned: Missing or invalid sessionDurationMs');
      }
      if (!event.sanitizedQuery) warnings.push('search_abandoned: Missing sanitizedQuery');
    }

    // Privacy check: rawQuery should be present locally but not transmitted remotely
    if (!('rawQuery' in event) || !event.rawQuery) {
      warnings.push(`${event.type}: Missing rawQuery (should be captured for debugging)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Add event to validation buffer
   */
  captureEvent(event: SearchAnalyticsEvent): void {
    const validation = this.validateEvent(event);

    if (!validation.isValid) {
      console.warn(`[AnalyticsValidator] Event validation failed:`, validation.errors, event);
    }

    if (validation.warnings.length > 0 && console.debug) {
      console.debug(`[AnalyticsValidator] Event warnings:`, validation.warnings);
    }

    // Track query hash for deduplication analysis
    if ('queryHash' in event && event.queryHash) {
      this.queryHashes.add(event.queryHash);
    }

    this.eventBuffer.log(event);
  }

  /**
   * Get metrics summary (what Phase 3.9 validates)
   */
  getSummary(): AnalyticsSummary {
    const events = this.eventBuffer.getEvents();
    const searchExecutedEvents = events.filter(e => e.type === 'search_executed');
    const searchSelectedEvents = events.filter(e => e.type === 'search_result_selected');
    const searchAbandonedEvents = events.filter(e => e.type === 'search_abandoned');

    // Count empty results
    const emptyResultCount = searchExecutedEvents.filter(
      e => e.type === 'search_executed' && e.emptyResult
    ).length;
    const emptyResultRate = searchExecutedEvents.length > 0
      ? (emptyResultCount / searchExecutedEvents.length) * 100
      : 0;

    // Count parsed events
    const parsedCount = searchExecutedEvents.filter(
      e => e.type === 'search_executed' && e.parsed
    ).length;
    const parsedVsUnparsedRatio = searchExecutedEvents.length > 0
      ? (parsedCount / searchExecutedEvents.length) * 100
      : 0;

    // Calculate CTR
    const ctr = searchExecutedEvents.length > 0
      ? (searchSelectedEvents.length / searchExecutedEvents.length) * 100
      : 0;

    // Calculate average result position (1-indexed, so rank 0 = position 1)
    const avgResultPosition = searchSelectedEvents.length > 0
      ? searchSelectedEvents.reduce((sum, e) => {
          return sum + (e.type === 'search_result_selected' ? e.selectedRank + 1 : 0);
        }, 0) / searchSelectedEvents.length
      : 0;

    // Event quality issues
    let missingFieldsCount = 0;
    let malformedPayloadsCount = 0;
    events.forEach(event => {
      const validation = this.validateEvent(event);
      if (validation.errors.length > 0) malformedPayloadsCount++;
      if (validation.warnings.length > 0) missingFieldsCount++;
    });

    // Duplicate queries (same hash appearing multiple times in short window)
    const duplicateQueries = this.queryHashes.size > 0
      ? events.length - this.queryHashes.size
      : 0;

    return {
      totalEvents: events.length,
      searchExecuted: searchExecutedEvents.length,
      searchResultSelected: searchSelectedEvents.length,
      searchAbandoned: searchAbandonedEvents.length,
      canonicalMetrics: {
        totalSearches: searchExecutedEvents.length,
        emptyResultRate: parseFloat(emptyResultRate.toFixed(2)),
      },
      directionalMetrics: {
        parsedVsUnparsedRatio: parseFloat(parsedVsUnparsedRatio.toFixed(2)),
        searchResultCTR: parseFloat(ctr.toFixed(2)),
        avgResultPosition: parseFloat(avgResultPosition.toFixed(2)),
      },
      eventQualityIssues: {
        missingFields: missingFieldsCount,
        malformedPayloads: malformedPayloadsCount,
        duplicateQueries,
      },
    };
  }

  /**
   * Export events as JSON for external analysis
   */
  exportJSON(): string {
    return this.eventBuffer.exportJSON();
  }

  /**
   * Clear captured events
   */
  clear(): void {
    this.eventBuffer.clear();
    this.queryHashes.clear();
  }

  /**
   * Get raw event buffer for inspection
   */
  getEvents(): SearchAnalyticsEvent[] {
    return this.eventBuffer.getEvents();
  }

  /**
   * Print summary to console (pretty-printed)
   */
  printSummary(): void {
    const summary = this.getSummary();
    console.group('[Analytics Validator] Summary');
    console.table(summary);
    console.groupEnd();
  }
}

/**
 * Global analytics validator instance (dev-only)
 * Accessible via window.__ANALYTICS_VALIDATOR__
 */
let globalValidator: AnalyticsValidator | null = null;

/**
 * Initialize validator (called by app startup)
 */
export function initializeAnalyticsValidator(): void {
  // Always initialize in browser (dev-only, no production cost)
  if (typeof window !== 'undefined') {
    globalValidator = new AnalyticsValidator();
    // @ts-ignore (dev-only global)
    window.__ANALYTICS_VALIDATOR__ = globalValidator;
    if (typeof console.debug === 'function') {
      console.debug('[Analytics Validator] Initialized. Use window.__ANALYTICS_VALIDATOR__ to inspect events.');
    }
  }
}

/**
 * Get global validator instance
 */
export function getGlobalValidator(): AnalyticsValidator | null {
  return globalValidator;
}
