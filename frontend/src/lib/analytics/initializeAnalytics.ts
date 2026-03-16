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
      // Check if PostHog SDK is already loaded (via script tag in index.html)
      const posthog = (window as any).posthog;

      if (posthog) {
        // PostHog SDK loaded (or stub present): initialize with project key if not already done
        if (typeof posthog.init === 'function' && !posthog.__loaded) {
          const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.posthog.com';
          posthog.init(apiKey, {
            api_host: host,
            capture_pageview: false, // Manual control — we track our own events
            autocapture: false,      // No auto-clicks; only our custom events
            persistence: 'memory',   // No localStorage tracking; privacy-first
          });
        }
        // Create logger and activate remote analytics
        const logger = createPostHogLogger();
        if (logger) {
          setSearchAnalyticsLogger(logger);
          console.debug('[Analytics] PostHog logger initialized (remote)');
          return {
            isRemoteEnabled: true,
            loggerType: 'posthog',
          };
        }
      } else {
        // PostHog SDK not loaded: warn and fall back to console
        console.warn(
          '[Analytics] PostHog API key provided but SDK not loaded. ' +
          'Make sure to include PostHog JS SDK in index.html. ' +
          'Falling back to console logging.'
        );
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
