/**
 * CONSTELLATIONCANVAS.TSX
 * Page shell for constellation graph visualization
 * Phase 2.2: Loading, error, and empty states
 * Phase 5.6: Answer evidence → camera focus + cited highlighting
 */

import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useGraphData } from '../hooks/useGraphData';
import { useURLSelection } from '../hooks/useURLSelection';
import { useNavigationMemory } from '../hooks/useNavigationMemory';
import { useGraphSemantics } from '../hooks/useGraphSemantics';
import { useD3Force } from '../hooks/useD3Force';
import { transformGraphToRenderable, logGraphDiagnostics } from '../lib/graph/graphTransforms';
import { computeHighlightState, CitedState } from '../lib/graph/highlighting';
import { computeFocusTarget, animateCamera } from '../lib/graph/cameraFocus';
import { CanvasScene } from '../components/constellation/CanvasScene';
import { SelectionPanel } from '../components/constellation/SelectionPanel';
import { SearchUI, SearchUIHandle } from '../components/constellation/SearchUI';
import { AskTheGraphPanel } from '../components/constellation/AskTheGraphPanel';
import { SemanticFilters } from '../components/constellation/SemanticFilters';
import { LayoutModeSelector } from '../components/constellation/LayoutModeSelector';
import {
  logSemanticFilterToggled,
  logSemanticFiltersCleared,
  countActiveFilters,
  logLayoutModeChanged,
  logLayoutConvergenceMeasured,
  logLayoutError,
} from '../lib/analytics/constellationAnalytics';
import './ConstellationCanvas.css';

export const ConstellationCanvas: React.FC = () => {
  const { data, loading, error } = useGraphData();
  const [unresolvedEdgesCount, setUnresolvedEdgesCount] = useState(0);
  const searchUIRef = useRef<SearchUIHandle>(null);
  const cameraControlsRef = useRef<any>(null); // Reference to OrbitControls for camera animation
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const [citedState, setCitedState] = useState<CitedState>({ citedNodeIds: new Set(), citedProjectIds: new Set(), citedEdgeIds: new Set() });

  // Phase 6.2B: Kill switch for Dynamic layout via environment variable
  const isD3Enabled = import.meta.env.VITE_LAYOUT_ENGINE_ENABLED === 'true';

  const { selectedItem, selectNode, selectProject, clearSelection } = useURLSelection({
    nodes: data?.nodes ?? null,
    projects: data?.projects ?? null,
  });

  // Auto-save selected items to recent navigation (Phase 3.4)
  useNavigationMemory({ selectedItem });

  // Phase 6.0: Layout engine mode (Curated API vs Dynamic D3)
  // Phase 6.2B: Force 'api' mode if D3 is disabled via env var
  // Phase 8.0A: Default to 'api' (Curated) always; D3 remains opt-in experimental
  const [layoutEngine, setLayoutEngine] = useState<'api' | 'd3'>('api');

  // Transform data to renderable format
  const renderableGraph = React.useMemo(() => {
    if (!data) return null;

    const graph = transformGraphToRenderable(data);

    // Log diagnostics in development
    if (typeof window !== 'undefined' && (window as any).__DEV__) {
      logGraphDiagnostics(graph);
    }

    return graph;
  }, [data]);

  // Semantic graph navigation (Phase 5.5)
  const {
    filters: semanticFilters,
    visibility: semanticVisibility,
    setSubgraphNode,
    setProjectCluster,
    clearAllFilters,
    toggleNodeType,
    toggleTag,
    toggleRelationshipType,
    clearTypeFilters,
    setGravityThreshold,
    getAvailableTags,
    getAvailableRelationshipTypes,
  } = useGraphSemantics({
    graph: renderableGraph,
    edges: data?.edges ?? [],
  });

  // Phase 6.0: D3 force layout (enabled when layoutEngine === 'd3')
  // Phase 6.2B: Also respect kill switch (isD3Enabled flag)
  const d3LayoutEnabled = layoutEngine === 'd3' && isD3Enabled;
  const d3PositionsResult = useD3Force({
    enabled: d3LayoutEnabled,
    nodes: data?.nodes ?? null,
    projects: data?.projects ?? null,
    edges: data?.edges ?? null,
    visibleNodeIds: semanticVisibility?.visibleNodeIds,
    visibleProjectIds: semanticVisibility?.visibleProjectIds,
  });

  // Phase 5.9: Wrapper handlers for semantic filter analytics
  const handleToggleNodeType = React.useCallback((type: string) => {
    const wasEnabled = semanticFilters.enabledNodeTypes?.has(type) ?? false;
    toggleNodeType(type);
    // Fire after state updates
    const activeCount = countActiveFilters({
      ...semanticFilters,
      enabledNodeTypes: wasEnabled
        ? new Set([...(semanticFilters.enabledNodeTypes || [])].filter(t => t !== type))
        : new Set([...(semanticFilters.enabledNodeTypes || []), type]),
    });
    logSemanticFilterToggled('node_type', type, !wasEnabled, activeCount);
  }, [semanticFilters]);

  const handleToggleTag = React.useCallback((tag: string) => {
    const wasEnabled = semanticFilters.enabledTags?.has(tag) ?? false;
    toggleTag(tag);
    const activeCount = countActiveFilters({
      ...semanticFilters,
      enabledTags: wasEnabled
        ? new Set([...(semanticFilters.enabledTags || [])].filter(t => t !== tag))
        : new Set([...(semanticFilters.enabledTags || []), tag]),
    });
    logSemanticFilterToggled('tag', tag, !wasEnabled, activeCount);
  }, [semanticFilters]);

  const handleToggleRelationshipType = React.useCallback((relType: string) => {
    const wasEnabled = semanticFilters.enabledRelationshipTypes?.has(relType) ?? false;
    toggleRelationshipType(relType);
    const activeCount = countActiveFilters({
      ...semanticFilters,
      enabledRelationshipTypes: wasEnabled
        ? new Set([...(semanticFilters.enabledRelationshipTypes || [])].filter(t => t !== relType))
        : new Set([...(semanticFilters.enabledRelationshipTypes || []), relType]),
    });
    logSemanticFilterToggled('relationship_type', relType, !wasEnabled, activeCount);
  }, [semanticFilters]);

  const handleClearAllFilters = React.useCallback(() => {
    const currentCount = countActiveFilters(semanticFilters);
    logSemanticFiltersCleared(currentCount);
    clearAllFilters();
  }, [semanticFilters]);

  // Phase 6.1: Layout mode change handler with analytics
  // Phase 6.2B: Block D3 mode if kill switch is active
  const handleLayoutModeChange = React.useCallback((newMode: 'api' | 'd3') => {
    // Prevent switching to D3 if disabled by env var
    if (newMode === 'd3' && !isD3Enabled) {
      return;
    }
    const visibleNodes = semanticVisibility?.visibleNodeIds.size ?? 0;
    const visibleProjects = semanticVisibility?.visibleProjectIds.size ?? 0;
    logLayoutModeChanged(layoutEngine, newMode, visibleNodes, visibleProjects);
    setLayoutEngine(newMode);
  }, [layoutEngine, semanticVisibility?.visibleNodeIds.size, semanticVisibility?.visibleProjectIds.size, isD3Enabled]);

  // Phase 6.1: Monitor D3 layout convergence and fire analytics
  useEffect(() => {
    if (layoutEngine === 'd3' && d3PositionsResult?.positions) {
      const metrics = d3PositionsResult.positions.metrics;
      const visibleNodes = semanticVisibility?.visibleNodeIds.size ?? 0;
      const visibleProjects = semanticVisibility?.visibleProjectIds.size ?? 0;
      logLayoutConvergenceMeasured(
        visibleNodes,
        visibleProjects,
        metrics.convergenceTimeMs,
        metrics.iterationCount,
        metrics.finalVelocity,
        metrics.converged
      );
    } else if (layoutEngine === 'd3' && d3PositionsResult?.error) {
      const visibleNodes = semanticVisibility?.visibleNodeIds.size ?? 0;
      const visibleProjects = semanticVisibility?.visibleProjectIds.size ?? 0;
      logLayoutError('simulation_failed', visibleNodes, visibleProjects);
    }
  }, [d3PositionsResult?.positions, d3PositionsResult?.error, layoutEngine, semanticVisibility?.visibleNodeIds.size, semanticVisibility?.visibleProjectIds.size]);

  // Track if this is initial mount (restoration from URL) vs user-driven selection
  const isInitialMount = useRef(true);

  // When a node is selected on canvas, optionally auto-enable subgraph mode
  // BUT: Only do this for user-driven selections, not URL restoration on mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // Skip auto-subgraph on initial URL restoration
    }

    if (selectedItem?.type === 'node') {
      // Auto-set subgraph mode when selecting a node (1 hop default)
      // BUT: Don't override project-cluster mode — respect user's intentional filter
      if (!semanticFilters.projectClusterId) {
        setSubgraphNode(selectedItem.data.id, 1);
      }
    }
  }, [selectedItem?.data.id, selectedItem?.type, setSubgraphNode, semanticFilters.projectClusterId]);

  // Compute highlight state for selected item (Phase 2.4)
  const highlightState = React.useMemo(() => {
    if (!renderableGraph || !data) return undefined;
    const selectedId = selectedItem?.data.id ?? null;
    return computeHighlightState(renderableGraph, data.edges, selectedId);
  }, [renderableGraph, data, selectedItem]);

  // Phase 5.6: Handle evidence focus callback from AskTheGraphPanel
  const handleEvidenceFocus = React.useCallback(
    (nodeIds: string[], projectIds: string[]) => {
      if (!renderableGraph) return;

      // Update cited state for highlighting
      setCitedState({
        citedNodeIds: new Set(nodeIds),
        citedProjectIds: new Set(projectIds),
        citedEdgeIds: new Set(), // Can enhance in Phase 5.7 to include connecting edges
      });

      // Compute camera focus target
      const positions: THREE.Vector3[] = [];

      // Add positions for cited nodes
      for (const nodeId of nodeIds) {
        const node = renderableGraph.nodes.find(n => n.id === nodeId);
        if (node) {
          positions.push(new THREE.Vector3(node.position[0], node.position[1], 0));
        }
      }

      // Add positions for cited projects
      for (const projectId of projectIds) {
        const project = renderableGraph.projects.find(p => p.id === projectId);
        if (project) {
          positions.push(new THREE.Vector3(project.position[0], project.position[1], 0));
        }
      }

      // If we have entities to focus on, animate camera
      if (positions.length > 0 && cameraRef.current && cameraControlsRef.current) {
        const { targetPosition, targetLookAt } = computeFocusTarget(positions, cameraRef.current.position.z);
        const cleanup = animateCamera(cameraRef.current, cameraControlsRef.current, targetPosition, targetLookAt, 500);

        // Cleanup animation on unmount or new focus call
        return cleanup;
      }
    },
    [renderableGraph]
  );

  // Global Cmd+K / Ctrl+K keyboard shortcut (Phase 3.2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (macOS) or Ctrl+K (Windows/Linux)
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const isSearchShortcut = isMac ? e.metaKey && e.key === 'k' : e.ctrlKey && e.key === 'k';

      if (!isSearchShortcut) return;

      // Block if typing in non-search input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const isSearchInput = target instanceof HTMLInputElement && target.getAttribute('data-search-input') === 'true';
      const isOtherEditableField =
        (target instanceof HTMLInputElement && !isSearchInput) ||
        target instanceof HTMLTextAreaElement ||
        (target.contentEditable === 'true' && !isSearchInput);

      if (isOtherEditableField) {
        return;
      }

      // Prevent default browser behavior (browser's search in some cases)
      e.preventDefault();

      // Focus search input
      searchUIRef.current?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="constellation-container constellation-state">
        <div className="state-content">
          <div className="spinner"></div>
          <h2>Loading Constellation Canvas...</h2>
          <p>Fetching graph from API</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="constellation-container constellation-state">
        <div className="state-content error">
          <h2>Error Loading Graph</h2>
          <p className="error-message">{error.message}</p>
          <pre className="error-stack">{error.stack}</pre>
          <button
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!renderableGraph || (renderableGraph.nodes.length === 0 && renderableGraph.projects.length === 0)) {
    return (
      <div className="constellation-container constellation-state">
        <div className="state-content">
          <h2>No Graph Data</h2>
          <p>The graph contains no nodes or projects to display.</p>
        </div>
      </div>
    );
  }

  // Render canvas
  return (
    <div className="constellation-container">
      <SearchUI
        ref={searchUIRef}
        nodes={data?.nodes ?? []}
        projects={data?.projects ?? []}
        onNodeSelect={selectNode}
        onProjectSelect={selectProject}
      />

      {/* Phase 6.2B: Only show LayoutModeSelector if D3 Dynamic layout is enabled */}
      {isD3Enabled && (
        <LayoutModeSelector
          layoutEngine={layoutEngine}
          onLayoutModeChange={handleLayoutModeChange}
        />
      )}

      <SemanticFilters
        graph={renderableGraph}
        filters={semanticFilters}
        onSetSubgraphNode={setSubgraphNode}
        onSetProjectCluster={setProjectCluster}
        onToggleNodeType={handleToggleNodeType}
        onToggleTag={handleToggleTag}
        onToggleRelationshipType={handleToggleRelationshipType}
        onClearTypeFilters={clearTypeFilters}
        onSetGravityThreshold={setGravityThreshold}
        onClearAll={handleClearAllFilters}
        getAvailableTags={getAvailableTags}
        getAvailableRelationshipTypes={getAvailableRelationshipTypes}
      />

      <CanvasScene
        graph={renderableGraph}
        onUnresolvedEdgesChange={setUnresolvedEdgesCount}
        onNodeClick={selectNode}
        onProjectClick={selectProject}
        onCanvasClick={clearSelection}
        highlightState={highlightState}
        semanticVisibility={semanticVisibility}
        selectedNodeId={selectedItem?.type === 'node' ? selectedItem.data.id : undefined}
        citedState={citedState}
        cameraRef={cameraRef}
        controlsRef={cameraControlsRef}
        layoutEngine={layoutEngine}
        d3Positions={d3PositionsResult.positions}
      />

      <SelectionPanel selectedItem={selectedItem} onClose={clearSelection} />

      <AskTheGraphPanel
        nodes={data?.nodes ?? []}
        projects={data?.projects ?? []}
        edges={data?.edges ?? []}
        onNodeSelect={selectNode}
        onProjectSelect={selectProject}
        onEvidenceFocus={handleEvidenceFocus}
      />

      {/* Dev diagnostics overlay */}
      {typeof window !== 'undefined' && (window as any).__DEV__ && (
        <div className="constellation-diagnostics">
          <div className="diagnostics-panel">
            <h3>Graph Stats</h3>
            <ul>
              <li>Nodes: {renderableGraph.nodes.length}</li>
              <li>Projects: {renderableGraph.projects.length}</li>
              <li>Edges: {renderableGraph.edges.length}</li>
              <li>Unresolved: {unresolvedEdgesCount}</li>
              <li>Cited: {citedState.citedNodeIds.size + citedState.citedProjectIds.size}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
