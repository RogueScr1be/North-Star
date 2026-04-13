/**
 * CONSTELLATION3D.TSX
 * Phase 1 Experimental: Enhanced visual presentation route
 * Parallel to ConstellationCanvas with richer lighting and colors
 * Uses Constellation3DScene instead of CanvasScene
 */

import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useGraphData } from '../hooks/useGraphData';
import { useURLSelection } from '../hooks/useURLSelection';
import { useNavigationMemory } from '../hooks/useNavigationMemory';
import { useGraphSemantics } from '../hooks/useGraphSemantics';
import { transformGraphToRenderable, logGraphDiagnostics } from '../lib/graph/graphTransforms';
import { computeHighlightState, CitedState } from '../lib/graph/highlighting';
import { computeFocusTarget, animateCamera } from '../lib/graph/cameraFocus';
import { Constellation3DScene } from '../components/constellation/Constellation3DScene';
import { SelectionPanel } from '../components/constellation/SelectionPanel';
import { SearchUI, SearchUIHandle } from '../components/constellation/SearchUI';
import { AskTheGraphPanel } from '../components/constellation/AskTheGraphPanel';
import './ConstellationCanvas.css';

export const Constellation3D: React.FC = () => {
  const { data, loading, error } = useGraphData();
  const [unresolvedEdgesCount, setUnresolvedEdgesCount] = useState(0);
  const searchUIRef = useRef<SearchUIHandle>(null);
  const cameraControlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const [citedState, setCitedState] = useState<CitedState>({ citedNodeIds: new Set(), citedProjectIds: new Set(), citedEdgeIds: new Set() });
  // Phase 3: Route-local state for search result hover highlighting
  const [highlightSearchResultId, setHighlightSearchResultId] = useState<string | null>(null);

  const { selectedItem, selectNode, selectProject, clearSelection } = useURLSelection({
    nodes: data?.nodes ?? null,
    projects: data?.projects ?? null,
  });

  useNavigationMemory({ selectedItem });

  // Phase 1: Static layout engine = 'api' (no D3)
  const layoutEngine = 'api' as const;

  const activeAnimationCleanupRef = useRef<(() => void) | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  const handleControlsReady = React.useCallback((controls: any) => {
    cameraControlsRef.current = controls;
  }, []);

  // Phase 3: Callback for search result hover
  const handleSearchResultHover = React.useCallback((resultId: string | null) => {
    setHighlightSearchResultId(resultId);
  }, []);

  // Transform data to renderable format
  const renderableGraph = React.useMemo(() => {
    if (!data) return null;

    const graph = transformGraphToRenderable(data);

    if (typeof window !== 'undefined' && (window as any).__DEV__) {
      logGraphDiagnostics(graph);
    }

    return graph;
  }, [data]);

  // Phase 1: Semantic filtering support (same as constellation)
  const {
    visibility: semanticVisibility,
  } = useGraphSemantics({
    graph: renderableGraph,
    edges: data?.edges ?? [],
  });

  // Auto-focus camera on selection (Phase 2: Smoother 800ms animation)
  useEffect(() => {
    if (!selectedItem || !renderableGraph || !cameraRef.current || !cameraControlsRef.current) {
      return;
    }

    const selectedEntity = selectedItem.type === 'node'
      ? renderableGraph.nodes.find(n => n.id === selectedItem.data.id)
      : renderableGraph.projects.find(p => p.id === selectedItem.data.id);

    if (!selectedEntity?.position) {
      console.log('[Constellation3D] Selected entity position not found:', selectedItem.data.id);
      return;
    }

    if (activeAnimationCleanupRef.current) {
      activeAnimationCleanupRef.current();
      activeAnimationCleanupRef.current = null;
    }

    isAnimatingRef.current = true;

    const selectedPosition = new THREE.Vector3(selectedEntity.position[0], selectedEntity.position[1], 0);
    const { targetPosition, targetLookAt } = computeFocusTarget(
      [selectedPosition],
      cameraRef.current.position.z
    );

    // Phase 2: Increased duration from 500ms to 800ms for smoother feel
    const cleanup = animateCamera(
      cameraRef.current,
      cameraControlsRef.current,
      targetPosition,
      targetLookAt,
      800
    );

    activeAnimationCleanupRef.current = () => {
      isAnimatingRef.current = false;
      cleanup();
    };

    console.log('[Constellation3D] Auto-focus on selection:', selectedItem.data.id);
  }, [selectedItem?.data.id, selectedItem?.type, renderableGraph]);

  // Compute highlight state
  const highlightState = React.useMemo(() => {
    if (!renderableGraph || !data) return undefined;
    const selectedId = selectedItem?.data.id ?? null;
    return computeHighlightState(renderableGraph, data.edges, selectedId);
  }, [renderableGraph, data, selectedItem]);

  // Handle evidence focus from Ask-the-Graph
  const handleEvidenceFocus = React.useCallback(
    (nodeIds: string[], projectIds: string[]) => {
      if (!renderableGraph) return;

      setCitedState({
        citedNodeIds: new Set(nodeIds),
        citedProjectIds: new Set(projectIds),
        citedEdgeIds: new Set(),
      });

      const positions: THREE.Vector3[] = [];

      for (const nodeId of nodeIds) {
        const node = renderableGraph.nodes.find(n => n.id === nodeId);
        if (node) {
          positions.push(new THREE.Vector3(node.position[0], node.position[1], 0));
        }
      }

      for (const projectId of projectIds) {
        const project = renderableGraph.projects.find(p => p.id === projectId);
        if (project) {
          positions.push(new THREE.Vector3(project.position[0], project.position[1], 0));
        }
      }

      if (positions.length > 0 && cameraRef.current && cameraControlsRef.current) {
        const { targetPosition, targetLookAt } = computeFocusTarget(positions, cameraRef.current.position.z);
        // Phase 2: Use 800ms animation for smooth evidence focus
        const cleanup = animateCamera(cameraRef.current, cameraControlsRef.current, targetPosition, targetLookAt, 800);
        return cleanup;
      }
    },
    [renderableGraph]
  );

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const isSearchShortcut = isMac ? e.metaKey && e.key === 'k' : e.ctrlKey && e.key === 'k';

      if (!isSearchShortcut) return;

      const target = e.target as HTMLElement;
      const isSearchInput = target instanceof HTMLInputElement && target.getAttribute('data-search-input') === 'true';
      const isOtherEditableField =
        (target instanceof HTMLInputElement && !isSearchInput) ||
        target instanceof HTMLTextAreaElement ||
        (target.contentEditable === 'true' && !isSearchInput);

      if (isOtherEditableField) {
        return;
      }

      e.preventDefault();
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
          <h2>Loading Constellation Canvas (3D)...</h2>
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
        demoMode={false}
        onSearchResultHover={handleSearchResultHover}
      />

      <Constellation3DScene
        graph={renderableGraph}
        onUnresolvedEdgesChange={setUnresolvedEdgesCount}
        onNodeClick={selectNode}
        onProjectClick={selectProject}
        onCanvasClick={clearSelection}
        highlightState={highlightState}
        semanticVisibility={semanticVisibility}
        selectedNodeId={selectedItem?.type === 'node' ? selectedItem.data.id : undefined}
        selectedProjectId={selectedItem?.type === 'project' ? selectedItem.data.id : undefined}
        citedState={citedState}
        cameraRef={cameraRef}
        controlsRef={cameraControlsRef}
        onControlsReady={handleControlsReady}
        layoutEngine={layoutEngine}
        d3Positions={null}
        isAnimatingRef={isAnimatingRef}
        onCancelAnimation={() => {
          if (activeAnimationCleanupRef.current) {
            activeAnimationCleanupRef.current();
            activeAnimationCleanupRef.current = null;
          }
        }}
        highlightSearchResultId={highlightSearchResultId}
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
            <h3>Graph Stats (3D)</h3>
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
