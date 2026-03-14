/**
 * NAVIGATIONUTILS.TS
 * Local navigation memory for pinned and recent items
 * Phase 3.4: Quick access to frequently visited nodes/projects
 * No dependencies, localStorage-based persistence
 */

/**
 * Navigation memory item
 * Supports both pinned items (by explicit user action)
 * and recent items (by automatic tracking)
 */
export interface NavigationItem {
  id: string;        // Unique identifier (node-{id} or project-{id})
  type: 'node' | 'project';
  title: string;     // Cached title for display
  entityId: string;  // Raw entity ID (without prefix)
  pinnedAt?: number; // Timestamp when pinned (only for pinned items)
  visitedAt?: number; // Timestamp when last visited (only for recent items)
}

const PINNED_ITEMS_KEY = 'north-star-pinned-items';
const RECENT_ITEMS_KEY = 'north-star-recent-items';
const MAX_PINNED = 10;
const MAX_RECENT = 10;

/**
 * Get all pinned items, newest pins first
 */
export function getPinnedItems(): NavigationItem[] {
  try {
    const stored = localStorage.getItem(PINNED_ITEMS_KEY);
    if (!stored) return [];
    const items = JSON.parse(stored) as NavigationItem[];
    // Sort by pinnedAt descending (newest first)
    return items.sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
  } catch {
    return [];
  }
}

/**
 * Get all recent items, newest visits first
 */
export function getRecentItems(): NavigationItem[] {
  try {
    const stored = localStorage.getItem(RECENT_ITEMS_KEY);
    if (!stored) return [];
    const items = JSON.parse(stored) as NavigationItem[];
    // Sort by visitedAt descending (newest first)
    return items.sort((a, b) => (b.visitedAt ?? 0) - (a.visitedAt ?? 0));
  } catch {
    return [];
  }
}

/**
 * Toggle pin status for a node or project
 * If pinned, unpin it. If unpinned, pin it.
 * Returns new pin state (true = now pinned, false = now unpinned)
 */
export function togglePinItem(
  entityId: string,
  type: 'node' | 'project',
  title: string
): boolean {
  try {
    let pinned = getPinnedItems();
    const itemId = `${type}-${entityId}`;
    const existing = pinned.find(item => item.id === itemId);

    if (existing) {
      // Unpin: remove from pinned
      pinned = pinned.filter(item => item.id !== itemId);
      localStorage.setItem(PINNED_ITEMS_KEY, JSON.stringify(pinned));
      return false;
    } else {
      // Pin: add to pinned
      const newItem: NavigationItem = {
        id: itemId,
        type,
        title,
        entityId,
        pinnedAt: Date.now(),
      };
      pinned.unshift(newItem);
      // Keep only most recent MAX_PINNED
      pinned = pinned.slice(0, MAX_PINNED);
      localStorage.setItem(PINNED_ITEMS_KEY, JSON.stringify(pinned));
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Check if an item is pinned
 */
export function isItemPinned(entityId: string, type: 'node' | 'project'): boolean {
  const itemId = `${type}-${entityId}`;
  return getPinnedItems().some(item => item.id === itemId);
}

/**
 * Save item to recent navigation
 * Automatically deduplicates and maintains time order
 */
export function saveRecentItem(
  entityId: string,
  type: 'node' | 'project',
  title: string
): void {
  try {
    let recent = getRecentItems();
    const itemId = `${type}-${entityId}`;

    // Remove if already exists (we'll add at front)
    recent = recent.filter(item => item.id !== itemId);

    // Add to front with current timestamp
    const newItem: NavigationItem = {
      id: itemId,
      type,
      title,
      entityId,
      visitedAt: Date.now(),
    };
    recent.unshift(newItem);

    // Keep only most recent MAX_RECENT
    recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(recent));
  } catch {
    // Silently fail if localStorage unavailable
  }
}

/**
 * Clear all recent items
 */
export function clearRecentItems(): void {
  try {
    localStorage.removeItem(RECENT_ITEMS_KEY);
  } catch {
    // Silently fail
  }
}

/**
 * Unpin a specific item
 */
export function unpinItem(entityId: string, type: 'node' | 'project'): void {
  try {
    let pinned = getPinnedItems();
    const itemId = `${type}-${entityId}`;
    pinned = pinned.filter(item => item.id !== itemId);
    localStorage.setItem(PINNED_ITEMS_KEY, JSON.stringify(pinned));
  } catch {
    // Silently fail
  }
}
