/**
 * URLURLSELECTION.TS
 * URL-aware selection hook for constellation canvas
 * Phase 2.6: Persist selection in URL, restore on page load, support browser navigation
 * Phase 5.9: Analytics wiring for URL restore
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { GraphNode, GraphProject } from '../lib/graph/graphTypes';
import { SelectedItem } from './useSelection';
import { logNodeSelected, logProjectSelected } from '../lib/analytics/constellationAnalytics';

interface UseURLSelectionProps {
  nodes: GraphNode[] | null;
  projects: GraphProject[] | null;
}

/**
 * Custom hook that syncs selection state with URL query parameters
 * - On mount with valid data: restores selection from URL if present
 * - On selectNode/selectProject: updates URL
 * - On clearSelection: removes URL param
 * - Browser back/forward automatically restore URL state via native history
 * - useEffect listens to window.location.search for URL changes (back/forward support)
 */
export function useURLSelection({ nodes, projects }: UseURLSelectionProps) {
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const previousSelectedIdRef = useRef<string | null>(null); // Phase 5.9: Track previous for duplicate-fire prevention

  // Helper function to restore selection from URL
  const restoreFromURL = (nodesList: GraphNode[], projectsList: GraphProject[]) => {
    const params = new URLSearchParams(window.location.search);
    const selected = params.get('selected');

    if (!selected) {
      setSelectedItem(null);
      previousSelectedIdRef.current = null;
      return;
    }

    if (selected.startsWith('node-')) {
      const nodeId = selected.substring(5); // Remove 'node-' prefix
      const node = nodesList.find(n => n.id === nodeId);
      if (node) {
        // Phase 5.9: Only fire if selection actually changed
        if (previousSelectedIdRef.current !== node.id) {
          logNodeSelected(node, 'url_restore');
          previousSelectedIdRef.current = node.id;
        }
        setSelectedItem({ type: 'node', data: node });
      } else {
        setSelectedItem(null); // Invalid URL, clear state
        previousSelectedIdRef.current = null;
      }
    } else if (selected.startsWith('project-')) {
      const projectId = selected.substring(8); // Remove 'project-' prefix
      const project = projectsList.find(p => p.id === projectId);
      if (project) {
        // Phase 5.9: Only fire if selection actually changed
        if (previousSelectedIdRef.current !== project.id) {
          const nodeCountInProject = nodesList.filter(n => n.project_id === project.id).length;
          logProjectSelected(project, nodeCountInProject, 'url_restore');
          previousSelectedIdRef.current = project.id;
        }
        setSelectedItem({ type: 'project', data: project });
      } else {
        setSelectedItem(null); // Invalid URL, clear state
        previousSelectedIdRef.current = null;
      }
    }
  };

  // On first load of valid data, restore selection from URL
  useEffect(() => {
    if (!nodes || !projects || hasInitialized) return;
    restoreFromURL(nodes, projects);
    setHasInitialized(true);
  }, [nodes, projects, hasInitialized]);

  // On URL change via back/forward, restore from new URL
  useEffect(() => {
    if (!nodes || !projects || !hasInitialized) return;

    const handlePopState = () => {
      restoreFromURL(nodes, projects);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [nodes, projects, hasInitialized]);

  const selectNode = useCallback((node: GraphNode) => {
    // Phase 5.9: Track selection to prevent duplicate-fire on URL restore
    previousSelectedIdRef.current = node.id;
    setSelectedItem({ type: 'node', data: node });
    const params = new URLSearchParams(window.location.search);
    params.set('selected', `node-${node.id}`);
    window.history.replaceState(
      { selected: `node-${node.id}` },
      '',
      `${window.location.pathname}?${params.toString()}`
    );
  }, []);

  const selectProject = useCallback((project: GraphProject) => {
    // Phase 5.9: Track selection to prevent duplicate-fire on URL restore
    previousSelectedIdRef.current = project.id;
    setSelectedItem({ type: 'project', data: project });
    const params = new URLSearchParams(window.location.search);
    params.set('selected', `project-${project.id}`);
    window.history.replaceState(
      { selected: `project-${project.id}` },
      '',
      `${window.location.pathname}?${params.toString()}`
    );
  }, []);

  const clearSelection = useCallback(() => {
    // Phase 5.9: Clear selection tracking ref
    previousSelectedIdRef.current = null;
    setSelectedItem(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('selected');
    const newSearch = params.toString();
    window.history.replaceState(
      { selected: null },
      '',
      newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname
    );
  }, []);

  return {
    selectedItem,
    selectNode,
    selectProject,
    clearSelection,
  };
}
