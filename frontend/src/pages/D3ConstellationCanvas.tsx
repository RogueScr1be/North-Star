/**
 * D3CONSTELLATIONCANVAS.TSX
 * Isolated experimental page for D3 force layout evaluation
 * Phase 5.8: Spike - evaluate force-directed layout
 *
 * Responsibilities:
 * - Load graph data (same as ConstellationCanvas)
 * - Compute D3 force layout
 * - Blend D3 x/y with API z positions
 * - Render using existing CanvasScene component
 * - Display debug metrics panel
 * - No changes to main ConstellationCanvas
 */

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useGraphData } from '../hooks/useGraphData';
import { useD3Force } from '../hooks/useD3Force';
import { useURLSelection } from '../hooks/useURLSelection';
import { useNavigationMemory } from '../hooks/useNavigationMemory';
import { useGraphSemantics } from '../hooks/useGraphSemantics';
import { transformGraphToRenderable } from '../lib/graph/graphTransforms';
import { computeHighlightState } from '../lib/graph/highlighting';
import { CanvasScene } from '../components/constellation/CanvasScene';
import { SelectionPanel } from '../components/constellation/SelectionPanel';
import { SearchUI, SearchUIHandle } from '../components/constellation/SearchUI';
import { AskTheGraphPanel } from '../components/constellation/AskTheGraphPanel';
import { SemanticFilters } from '../components/constellation/SemanticFilters';
import { GraphNode, GraphProject } from '../lib/graph/graphTypes';
import './ConstellationCanvas.css';

/**
 * Debug panel styles embedded
 */
const debugPanelStyles = `
.d3-debug-panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: #00ffc8;
  padding: 16px;
  border: 1px solid #00ffc8;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  max-width: 300px;
  z-index: 999;
  line-height: 1.5;
}

.d3-debug-label {
  font-weight: bold;
  color: #ff00c8;
  margin-top: 8px;
  margin-bottom: 4px;
}

.d3-debug-label:first-child {
  margin-top: 0;
}

.d3-debug-value {
  color: #00ffc8;
  margin-left: 12px;
}

.d3-debug-status {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 255, 200, 0.3);
}
`;

export const D3ConstellationCanvas: React.FC = () => {
  const { data, loading, error } = useGraphData();
  const searchUIRef = useRef<SearchUIHandle>(null);
  const cameraControlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.OrthographicCamera>(null);

  const { selectedItem, selectNode, selectProject, clearSelection } = useURLSelection({
    nodes: data?.nodes ?? null,
    projects: data?.projects ?? null,
  });

  // Auto-save selected items
  useNavigationMemory({ selectedItem });

  // Transform data to renderable format (API positions as fallback)
  const renderableGraph = React.useMemo(() => {
    if (!data) return null;
    return transformGraphToRenderable(data);
  }, [data]);

  // Memoize edges array to prevent new array creation on every render
  const edges = React.useMemo(() => data?.edges ?? [], [data?.edges]);

  // Memoize D3 config to prevent new object creation on every render
  const d3Config = React.useMemo(() => ({
    chargeStrength: -150,
    linkStrength: 0.3,
    linkDistance: 100,
    centerStrength: 0.1,
    maxIterations: 500,
    velocityThreshold: 0.01,
    bounds: [200, 200] as [number, number],
  }), []);

  // Semantic filtering
  const {
    filters: semanticFilters,
    visibility: semanticVisibility,
    setSubgraphNode,
    setProjectCluster,
    clearAllFilters,
    toggleNodeType,
    toggleTag,
    toggleRelationshipType,
    setGravityThreshold,
    getAvailableTags: getAvailableTagsFunc,
    getAvailableRelationshipTypes: getAvailableRelationshipTypesFunc,
  } = useGraphSemantics({
    graph: renderableGraph,
    edges: edges,
  });

  // Run D3 force simulation (enabled by default on this route)
  const d3Result = useD3Force({
    enabled: true,
    nodes: data?.nodes ?? null,
    projects: data?.projects ?? null,
    edges: edges,
    visibleNodeIds: semanticVisibility?.visibleNodeIds,
    visibleProjectIds: semanticVisibility?.visibleProjectIds,
    config: d3Config,
  });

  // Blend D3 x/y with API z positions
  const finalGraph = React.useMemo(() => {
    if (!renderableGraph || !d3Result.positions) {
      return renderableGraph; // Fallback to API positions if D3 not ready
    }

    // Clone nodes with D3 x/y, keep API z
    const finalNodes = renderableGraph.nodes.map(node => {
      const d3Pos = d3Result.positions!.nodePositions.get(node.id);
      if (!d3Pos) {
        return node; // Keep original if D3 position missing (shouldn't happen)
      }

      return {
        ...node,
        x: d3Pos[0],
        y: d3Pos[1],
        // Keep z from API
        position: [d3Pos[0], d3Pos[1], node.z] as [number, number, number],
      };
    });

    // Clone projects with D3 x/y, keep API z
    const finalProjects = renderableGraph.projects.map(proj => {
      const d3Pos = d3Result.positions!.projectPositions.get(proj.id);
      if (!d3Pos) {
        return proj; // Keep original if D3 position missing
      }

      return {
        ...proj,
        x_derived: d3Pos[0],
        y_derived: d3Pos[1],
        // Keep z_derived from API
        position: [d3Pos[0], d3Pos[1], proj.z_derived] as [number, number, number],
      };
    });

    return {
      ...renderableGraph,
      nodes: finalNodes,
      projects: finalProjects,
      // Edges unchanged (still use original source/target endpoints)
    };
  }, [renderableGraph, d3Result.positions]);

  // Highlight state
  const highlightState = React.useMemo(() => {
    if (!finalGraph || !data) return undefined;
    const selectedId = selectedItem?.data.id ?? null;
    return computeHighlightState(finalGraph, data.edges, selectedId);
  }, [finalGraph, data, selectedItem]);

  // Auto-enable subgraph on node selection (copied from main canvas)
  useEffect(() => {
    if (selectedItem?.type === 'node') {
      setSubgraphNode(selectedItem.data.id, 1);
    }
  }, [selectedItem?.data.id, selectedItem?.type, setSubgraphNode]);

  // Handlers
  const handleSelectNode = React.useCallback(
    (node: GraphNode) => {
      selectNode(node);
    },
    [selectNode]
  );

  const handleSelectProject = React.useCallback(
    (project: GraphProject) => {
      selectProject(project);
    },
    [selectProject]
  );

  const handleToggleNodeType = React.useCallback((type: string) => {
    toggleNodeType(type);
  }, [toggleNodeType]);

  const handleToggleTag = React.useCallback((tag: string) => {
    toggleTag(tag);
  }, [toggleTag]);

  const handleToggleRelationshipType = React.useCallback((relType: string) => {
    toggleRelationshipType(relType);
  }, [toggleRelationshipType]);

  const handleClearAllFilters = React.useCallback(() => {
    clearAllFilters();
  }, [clearAllFilters]);

  const handleSetSubgraphNode = React.useCallback((nodeId: string | undefined, hops?: number) => {
    if (nodeId !== undefined) {
      setSubgraphNode(nodeId, hops);
    }
  }, [setSubgraphNode]);

  const handleSetProjectCluster = React.useCallback((projectId: string | undefined) => {
    if (projectId !== undefined) {
      setProjectCluster(projectId);
    }
  }, [setProjectCluster]);

  const handleSetGravityThreshold = React.useCallback((threshold?: number) => {
    setGravityThreshold(threshold);
  }, [setGravityThreshold]);

  // Loading/error states
  if (loading) {
    return (
      <div className="constellation-canvas constellation-loading">
        <div className="loading-message">Loading graph data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="constellation-canvas constellation-error">
        <div className="error-message">
          <strong>Error loading graph:</strong>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data || !finalGraph) {
    return (
      <div className="constellation-canvas constellation-empty">
        <div className="empty-message">No graph data available</div>
      </div>
    );
  }

  return (
    <div className="constellation-canvas">
      <style>{debugPanelStyles}</style>

      {/* Canvas */}
      <CanvasScene
        graph={finalGraph}
        selectedNodeId={selectedItem?.type === 'node' ? selectedItem.data.id : null}
        highlightState={highlightState}
        onNodeClick={handleSelectNode}
        onProjectClick={handleSelectProject}
        onCanvasClick={clearSelection}
        cameraRef={cameraRef}
        controlsRef={cameraControlsRef}
        semanticVisibility={semanticVisibility}
      />

      {/* Search UI */}
      <SearchUI
        ref={searchUIRef}
        nodes={data.nodes}
        projects={data.projects}
        onNodeSelect={handleSelectNode}
        onProjectSelect={handleSelectProject}
      />

      {/* Selection Panel */}
      {selectedItem && (
        <SelectionPanel
          selectedItem={selectedItem}
          onClose={clearSelection}
        />
      )}

      {/* Ask-the-Graph */}
      <AskTheGraphPanel
        nodes={data.nodes}
        projects={data.projects}
        edges={data.edges}
        onNodeSelect={handleSelectNode}
        onProjectSelect={handleSelectProject}
      />

      {/* Semantic Filters */}
      <SemanticFilters
        graph={finalGraph}
        filters={semanticFilters}
        onSetSubgraphNode={handleSetSubgraphNode}
        onSetProjectCluster={handleSetProjectCluster}
        onToggleNodeType={handleToggleNodeType}
        onToggleTag={handleToggleTag}
        onToggleRelationshipType={handleToggleRelationshipType}
        onClearTypeFilters={handleClearAllFilters}
        onSetGravityThreshold={handleSetGravityThreshold}
        onClearAll={handleClearAllFilters}
        getAvailableTags={getAvailableTagsFunc}
        getAvailableRelationshipTypes={getAvailableRelationshipTypesFunc}
      />

      {/* D3 Debug Panel */}
      {d3Result.positions && (
        <div className="d3-debug-panel">
          <div className="d3-debug-label">D3 Layout (Spike)</div>
          <div className="d3-debug-value">
            Enabled: {d3Result.positions ? '✓' : '✗'}
          </div>
          <div className="d3-debug-label">Metrics</div>
          <div className="d3-debug-value">
            Convergence: {d3Result.positions.metrics.convergenceTimeMs.toFixed(0)}ms
          </div>
          <div className="d3-debug-value">
            Iterations: {d3Result.positions.metrics.iterationCount}
          </div>
          <div className="d3-debug-value">
            Converged: {d3Result.positions.metrics.converged ? 'Yes' : 'No (max iter)'}
          </div>
          <div className="d3-debug-value">
            Final velocity: {d3Result.positions.metrics.finalVelocity.toFixed(4)}
          </div>
          <div className="d3-debug-status">
            <div className="d3-debug-label">Nodes/Edges</div>
            <div className="d3-debug-value">
              Nodes: {finalGraph.nodes.length}
            </div>
            <div className="d3-debug-value">
              Projects: {finalGraph.projects.length}
            </div>
            <div className="d3-debug-value">
              Edges: {finalGraph.edges.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default D3ConstellationCanvas;
