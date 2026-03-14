/**
 * USESELECTION.TS
 * Local state hook for constellation canvas selection
 * Manages single selected item (node or project)
 */

import { useState, useCallback } from 'react';
import { GraphNode, GraphProject } from '../lib/graph/graphTypes';

export type SelectedItem =
  | { type: 'node'; data: GraphNode }
  | { type: 'project'; data: GraphProject }
  | null;

export function useSelection() {
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);

  const selectNode = useCallback((node: GraphNode) => {
    setSelectedItem({ type: 'node', data: node });
  }, []);

  const selectProject = useCallback((project: GraphProject) => {
    setSelectedItem({ type: 'project', data: project });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
  }, []);

  return {
    selectedItem,
    selectNode,
    selectProject,
    clearSelection,
  };
}
