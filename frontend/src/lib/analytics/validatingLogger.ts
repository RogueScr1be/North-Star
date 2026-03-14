/**
 * VALIDATINGLOGGER.TS
 * Wrapper logger that validates events before passing to underlying logger
 * Phase 3.9: Minimal event quality assurance in development
 *
 * Usage: Swap in as logger during development to catch event quality issues
 */

import { SearchAnalyticsEvent, SearchAnalyticsLogger } from './searchAnalytics';
import { AnalyticsValidator } from './analyticsValidator';

/**
 * Logger that wraps another logger and validates events before logging
 * Does NOT modify events, just validates and warns
 */
export class ValidatingLogger implements SearchAnalyticsLogger {
  private validator: AnalyticsValidator;
  private underlyingLogger: SearchAnalyticsLogger;

  constructor(underlyingLogger: SearchAnalyticsLogger) {
    this.validator = new AnalyticsValidator();
    this.underlyingLogger = underlyingLogger;
  }

  log(event: SearchAnalyticsEvent): void {
    // Validate event before logging
    const validation = this.validator.validateEvent(event);

    if (!validation.isValid) {
      console.error(
        `[ValidatingLogger] Event validation FAILED for ${event.type}:`,
        validation.errors,
        event
      );
    }

    if (validation.warnings.length > 0) {
      console.warn(
        `[ValidatingLogger] Event validation WARNINGS for ${event.type}:`,
        validation.warnings,
        event
      );
    }

    // Capture to validator for analysis
    this.validator.captureEvent(event);

    // Pass to underlying logger (either console or PostHog)
    this.underlyingLogger.log(event);
  }

  /**
   * Get validator for metrics inspection
   */
  getValidator(): AnalyticsValidator {
    return this.validator;
  }
}
