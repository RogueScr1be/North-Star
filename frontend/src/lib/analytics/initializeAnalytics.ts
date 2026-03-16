/**
 * INITIALIZE ANALYTICS
 * Phase 3.8: App-level analytics setup
 *
 * Purpose: Initialize analytics logger on app startup
 * - Check for PostHog API key in environment
 * - Set up remote or console logger accordingly
 * - Lazy-load PostHog SDK if key is present
 *
 * This is called once on app mount (see App.tsx)
 */

import { setSearchAnalyticsLogger, ConsoleSearchAnalyticsLogger } from './searchAnalytics';
import { createPostHogLogger } from './postHogSearchAnalyticsLogger';

/**
 * Initialize analytics system for the app
 * Call this once on app startup (in App component useEffect)
 *
 * Returns info about which logger was configured
 */
export function initializeAnalytics(): {
  isRemoteEnabled: boolean;
  loggerType: 'posthog' | 'console';
} {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;

  if (apiKey) {
    // PostHog key available: try to load PostHog and set up remote logger
    try {
      // PostHog SDK initialized via snippet in index.html before React mounts.
      // The snippet calls posthog.init(key) and queues events until array.js loads.
      // Here we only need to create the logger wrapper — init timing is handled.
      const logger = createPostHogLogger();
      if (logger) {
        setSearchAnalyticsLogger(logger);
        console.debug('[Analytics] PostHog logger initialized (remote)');
        return {
          isRemoteEnabled: true,
          loggerType: 'posthog',
        };
      }
    } catch (error) {
      console.error('[Analytics] Error initializing PostHog:', error);
    }
  }

  // Fallback: use console logger
  const consoleLogger = new ConsoleSearchAnalyticsLogger(true);
  setSearchAnalyticsLogger(consoleLogger);
  console.debug('[Analytics] Console logger initialized (local dev)');

  return {
    isRemoteEnabled: false,
    loggerType: 'console',
  };
}
