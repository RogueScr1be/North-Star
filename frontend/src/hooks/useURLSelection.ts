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
    const urlParams = new URLSearchParams(window.location.search);
    const urlSelected = urlParams.get('selected');

    console.log('[STEP_1_1] restoreFromURL entry:', JSON.stringify({
      totalNodes: nodesList?.length,
      totalProjects: projectsList?.length,
      urlSelected: urlSelected,
      timestamp: new Date().toISOString(),
    }, null, 2));

    if (!urlSelected) {
      console.log('[STEP_1_1] no selected param in URL, clearing selection');
      setSelectedItem(null);
      previousSelectedIdRef.current = null;
      return;
    }

    if (urlSelected.startsWith('node-')) {
      const allNodeIds = nodesList.map(n => n.id);
      console.log('[STEP_1_1] node lookup starting:', JSON.stringify({
        targetId: urlSelected,
        totalNodeCount: nodesList.length,
        allNodeIds: allNodeIds,
        targetFoundInList: allNodeIds.includes(urlSelected),
      }, null, 2));

      const node = nodesList.find(n => n.id === urlSelected);

      if (node) {
        console.log('[STEP_1_1] node found:', JSON.stringify({ nodeId: node.id, title: node.title }));
        // Phase 5.9: Only fire if selection actually changed
        if (previousSelectedIdRef.current !== node.id) {
          logNodeSelected(node, 'url_restore');
          previousSelectedIdRef.current = node.id;
        }
        console.log('[STEP_1_1] calling setSelectedItem with node:', JSON.stringify({ type: 'node', nodeId: node.id, title: node.title }));
        setSelectedItem({ type: 'node', data: node });
      } else {
        console.log('[STEP_1_1] node NOT found in list, clearing selection:', JSON.stringify({ targetId: urlSelected, availableNodeCount: nodesList.length, availableNodeIds: allNodeIds }));
        setSelectedItem(null);
        previousSelectedIdRef.current = null;
      }
    } else if (urlSelected.startsWith('proj-')) {
      const allProjectIds = projectsList.map(p => p.id);
      console.log('[STEP_1_1] project lookup starting:', {
        targetId: urlSelected,
        totalProjectCount: projectsList.length,
        allProjectIds: allProjectIds,
        targetFoundInList: allProjectIds.includes(urlSelected),
      });

      const project = projectsList.find(p => p.id === urlSelected);

      if (project) {
        console.log('[STEP_1_1] project found:', { projectId: project.id, title: project.title });
        // Phase 5.9: Only fire if selection actually changed
        if (previousSelectedIdRef.current !== project.id) {
          const nodeCountInProject = nodesList.filter(n => n.project_id === project.id).length;
          logProjectSelected(project, nodeCountInProject, 'url_restore');
          previousSelectedIdRef.current = project.id;
        }
        console.log('[STEP_1_1] calling setSelectedItem with project:', { type: 'project', projectId: project.id, title: project.title });
        setSelectedItem({ type: 'project', data: project });
      } else {
        console.log('[STEP_1_1] project NOT found in list, clearing selection:', { targetId: urlSelected, availableProjectCount: projectsList.length });
        setSelectedItem(null);
        previousSelectedIdRef.current = null;
      }
    } else {
      console.log('[STEP_1_1] selected param has unknown prefix, clearing:', { urlSelected });
      setSelectedItem(null);
      previousSelectedIdRef.current = null;
    }
  };

  // On first load of valid data, restore selection from URL
  // FIXED: Removed hasInitialized from dependency array
  // Reason: Effect should run only once when nodes/projects become available (when data loads)
  // Without hasInitialized in deps, the effect won't re-run after setHasInitialized(true) is called
  useEffect(() => {
    console.log('[STEP_1_1] initial load effect running:', { hasNodes: !!nodes, hasProjects: !!projects, hasInitialized });
    if (!nodes || !projects || hasInitialized) {
      console.log('[STEP_1_1] initial load effect early exit:', { reason: !nodes ? 'no nodes' : !projects ? 'no projects' : 'already initialized' });
      return;
    }
    console.log('[STEP_1_1] calling restoreFromURL from initial load effect');
    restoreFromURL(nodes, projects);
    console.log('[STEP_1_1] calling setHasInitialized(true)');
    setHasInitialized(true);
  }, [nodes, projects]);

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
    console.log('[INSTRUMENT] selectNode called:', { nodeId: node.id, title: node.title });
    // Phase 5.9: Track selection to prevent duplicate-fire on URL restore
    previousSelectedIdRef.current = node.id;
    console.log('[INSTRUMENT] calling setSelectedItem from selectNode:', { type: 'node', id: node.id });
    setSelectedItem({ type: 'node', data: node });
    const params = new URLSearchParams(window.location.search);
    params.set('selected', node.id);
    console.log('[INSTRUMENT] replaceState:', { newUrl: `${window.location.pathname}?${params.toString()}` });
    window.history.replaceState(
      { selected: node.id },
      '',
      `${window.location.pathname}?${params.toString()}`
    );
  }, [nodes, projects]);

  const selectProject = useCallback((project: GraphProject) => {
    console.log('[INSTRUMENT] selectProject called:', { projectId: project.id, title: project.title });
    // Phase 5.9: Track selection to prevent duplicate-fire on URL restore
    previousSelectedIdRef.current = project.id;
    console.log('[INSTRUMENT] calling setSelectedItem from selectProject:', { type: 'project', id: project.id });
    setSelectedItem({ type: 'project', data: project });
    const params = new URLSearchParams(window.location.search);
    params.set('selected', project.id);
    console.log('[INSTRUMENT] replaceState:', { newUrl: `${window.location.pathname}?${params.toString()}` });
    window.history.replaceState(
      { selected: project.id },
      '',
      `${window.location.pathname}?${params.toString()}`
    );
  }, [nodes, projects]);

  const clearSelection = useCallback(() => {
    console.log('[INSTRUMENT] clearSelection called');
    console.trace('[INSTRUMENT] clearSelection stack trace');
    // Phase 5.9: Clear selection tracking ref
    previousSelectedIdRef.current = null;
    console.log('[INSTRUMENT] calling setSelectedItem(null) from clearSelection');
    setSelectedItem(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('selected');
    const newSearch = params.toString();
    console.log('[INSTRUMENT] replaceState to clear selected:', { newUrl: newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname });
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
