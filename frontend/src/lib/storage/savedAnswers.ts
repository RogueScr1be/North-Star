/**
 * SAVED ANSWERS STORAGE
 * Phase 14: Frontend-only persistence layer
 *
 * Manages answer storage in localStorage:
 * - Add/retrieve answers
 * - Deduplication by queryHash
 * - 25-item max cap
 * - Graceful error handling
 */

export interface SavedAnswer {
  id: string;               // queryHash (primary key for dedup)
  query: string;            // Original user query
  answer: string;           // Answer text
  timestamp: number;        // When saved (Date.now())
  queryHash: string;        // For dedup matching
}

const STORAGE_KEY = 'northstar_saved_answers';
const MAX_SAVED = 25;

/**
 * Get all saved answers from localStorage
 * Returns empty array if not found or parse fails
 */
export function getSavedAnswers(): SavedAnswer[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SavedAnswer[];
  } catch (e) {
    console.warn('[SavedAnswers] Failed to parse localStorage:', e);
    return [];
  }
}

/**
 * Save an answer to localStorage
 * - Deduplicates by queryHash (replaces if exists)
 * - Adds to front (newest first)
 * - Enforces 25-item max (trims oldest)
 */
export function saveAnswer(answer: SavedAnswer): void {
  try {
    const all = getSavedAnswers();

    // DEDUP: Remove if queryHash already exists
    const filtered = all.filter(a => a.queryHash !== answer.queryHash);

    // ADD: New answer at front (newest first)
    const updated = [answer, ...filtered];

    // TRIM: Enforce max 25 items
    const trimmed = updated.slice(0, MAX_SAVED);

    // PERSIST
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[SavedAnswers] Failed to save answer:', e);
  }
}

/**
 * Check if an answer is already saved by queryHash
 */
export function isSaved(queryHash: string): boolean {
  if (!queryHash) return false;
  const all = getSavedAnswers();
  return all.some(a => a.queryHash === queryHash);
}

/**
 * Delete a saved answer by id
 */
export function deleteAnswer(id: string): void {
  try {
    const all = getSavedAnswers();
    const filtered = all.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('[SavedAnswers] Failed to delete answer:', e);
  }
}

/**
 * Clear all saved answers
 */
export function clearAllSaved(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[SavedAnswers] Failed to clear:', e);
  }
}
