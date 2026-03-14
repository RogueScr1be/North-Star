/**
 * USENAVIGATIONMEMORY.TS
 * Hook to auto-save selected items to recent navigation
 * Phase 3.4: Track visited nodes and projects
 */

import { useEffect } from 'react';
import { SelectedItem } from './useSelection';
import { saveRecentItem } from '../lib/search/navigationUtils';

interface UseNavigationMemoryProps {
  selectedItem: SelectedItem;
}

/**
 * Auto-save selected items to recent navigation
 * Debounced to avoid excessive localStorage writes on rapid selection changes
 */
export function useNavigationMemory({ selectedItem }: UseNavigationMemoryProps) {
  useEffect(() => {
    if (!selectedItem) return;

    // Debounce with short delay to handle rapid selections
    const timer = setTimeout(() => {
      const { type, data } = selectedItem;
      saveRecentItem(data.id, type, data.title);
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedItem?.data.id, selectedItem?.type]); // Depends on item identity, not full object
}
