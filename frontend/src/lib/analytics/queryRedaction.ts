/**
 * QUERYREDACTION.TS
 * Lightweight query sanitization for analytics payloads
 * Phase 3.7: Reduce privacy risk without over-engineering
 *
 * Goal: Preserve usefulness for product analysis while reducing exposure of:
 * - Internal project names (get-it, fast-food, anansi, north-star)
 * - Decision references (node IDs, constraint keywords)
 * - Query structure that might leak graph topology
 *
 * Approach: Length capping + hash-based fingerprinting
 * Does NOT: ML-based redaction, external service calls, lossy compression
 */

/**
 * Sanitize search query for analytics payloads
 *
 * Returns both sanitized and hash version:
 * - sanitizedQuery: Truncated to 100 chars, safe for logging
 * - queryHash: Deterministic hash for deduplication
 *
 * Does NOT remove sensitive terms (too specific, brittle).
 * Instead, caps length and provides hash for pattern matching.
 *
 * @param rawQuery - User's original search input
 * @returns Object with sanitized and hashed versions
 */
export function sanitizeSearchQuery(rawQuery: string): {
  sanitizedQuery: string;
  queryHash: string;
} {
  // Normalize: trim and limit to 100 chars
  const normalized = rawQuery.trim().substring(0, 100);

  // Create deterministic hash for deduplication
  // Simple approach: sum of char codes (fast, deterministic, sufficient for Phase 3.7)
  const queryHash = generateSimpleHash(normalized);

  return {
    sanitizedQuery: normalized,
    queryHash,
  };
}

/**
 * Generate a simple deterministic hash from a string
 * Not cryptographic, just for deduplication and pattern matching
 * Collision risk acceptable for 100-char strings
 *
 * @internal
 */
function generateSimpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash = ((hash << 5) - hash) + char;
    // eslint-disable-next-line no-bitwise
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Return as hex string for readability
  return Math.abs(hash).toString(16);
}

/**
 * Redaction strategy for Phase 3.7
 * Currently deferred, but here's the approach if needed:
 *
 * 1. Length-based: Truncate to 100 chars (prevents verbosity attacks)
 * 2. Hash-based: Provide fingerprint for analytics aggregation
 * 3. Pattern-based: If needed, mask common patterns:
 *    - Mask node IDs: "node-*" → "node-[REDACTED]"
 *    - Mask project names: Known projects → "[PROJECT]"
 *    - Mask emails: "user@domain.com" → "[EMAIL]"
 *
 * NOT implemented in Phase 3.7 (too specific to domain).
 * Phase 3.8+ can add pattern matching after gathering real usage patterns.
 */

/**
 * Check if sanitization is needed for a query
 * Heuristic: queries longer than 50 chars often contain internal references
 *
 * @internal (for analytics/monitoring, not for runtime logic)
 */
export function mightContainSensitiveTerms(rawQuery: string): boolean {
  return rawQuery.length > 50;
}
