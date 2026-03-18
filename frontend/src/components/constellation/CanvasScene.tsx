/**
 * CANVASSCENE.TSX
 * React Three Fiber scene for constellation graph
 * Phase 2.2: Read-only rendering with Points geometries
 */

import { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { RenderableGraph } from '../../lib/graph/graphTransforms';
import { computeGraphBounds, computeCameraParams, CameraParams } from '../../lib/graph/graphBounds';
import { GraphCamera } from './GraphCamera';
import {
  HighlightState,
  CitedState,
  getNodeTypeColor,
  getEdgeHighlightColor,
  getCitedEdgeColor,
  computeFinalEdgeOpacity,
} from '../../lib/graph/highlighting';
import { GraphNode, GraphProject } from "../../lib/graph/graphTypes";
import type { SemanticVisibility } from '../../lib/graph/graphSemantics';
import { D3SettledPositions } from '../../lib/graph/d3SimulationEngine';
import { logNodeSelected, logProjectSelected } from '../../lib/analytics/constellationAnalytics';

interface CanvasSceneProps {
  graph: RenderableGraph;
  onUnresolvedEdgesChange?: (count: number) => void;
  onNodeClick?: (node: GraphNode) => void;
  onProjectClick?: (project: GraphProject) => void;
  onCanvasClick?: () => void; // Deselect on empty canvas click
  highlightState?: HighlightState; // Phase 2.4: selection highlight state
  semanticVisibility?: SemanticVisibility | null; // Phase 5.5: semantic filtering
  selectedNodeId?: string | null; // Phase 5.3: for smart label visibility
  citedState?: CitedState; // Phase 5.6: Answer evidence highlighting
  cameraRef?: React.MutableRefObject<THREE.OrthographicCamera | null>; // Phase 5.6: Camera animation
  controlsRef?: React.MutableRefObject<any | null>; // Phase 5.6: OrbitControls reference
  layoutEngine?: 'api' | 'd3'; // Phase 6.0: Layout mode selector
  d3Positions?: D3SettledPositions | null; // Phase 6.0: D3 computed positions
}

/**
 * NodesPoints: Render visible nodes as point cloud (Phase 5.5: semantic filtering)
 * Phase 5.3: Node type colors with gravity-scaled sizes
 * Phase 5.4: Highlight role modulation + North Star treatment
 * Phase 5.7: Cited state highlighting + FIX for empty visibility
 * Phase 6.0: Layout engine branching (API vs D3 positions)
 *
 * FIX (Phase 5.7): Return null if visibleNodes is empty to prevent uniform binding error
 */
function NodesPoints({
  graph,
  highlightState,
  semanticVisibility,
  layoutEngine,
  d3Positions,
}: {
  graph: RenderableGraph;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  // Filter nodes by semantic visibility
  const visibleNodes = useMemo(() => {
    if (!semanticVisibility) return graph.nodes;
    return graph.nodes.filter(node => semanticVisibility.visibleNodeIds.has(node.id));
  }, [graph.nodes, semanticVisibility]);

  // FIX: Return null if no visible nodes (prevents uniform binding error)
  if (visibleNodes.length === 0) {
    console.log('[NodesPoints] No visible nodes, returning null');
    return null;
  }

  console.log('[NodesPoints] Rendering ' + visibleNodes.length + ' visible nodes');

  // Create position array for visible nodes (Phase 6.0: branch by layoutEngine)
  const positions = useMemo(() => {
    const pos = new Float32Array(visibleNodes.length * 3);
    const useD3 = layoutEngine === 'd3' && d3Positions;

    for (let i = 0; i < visibleNodes.length; i++) {
      const node = visibleNodes[i];
      let x, y, z;

      if (useD3) {
        // Phase 6.0: Use D3-computed positions
        const d3Pos = d3Positions.nodePositions.get(node.id);
        if (d3Pos) {
          x = d3Pos[0];
          y = d3Pos[1];
          z = 0; // D3 positions are 2D [x, y]
        } else {
          // Fallback to API position if not in D3 result (shouldn't happen)
          x = node.position[0];
          y = node.position[1];
          z = node.position[2];
        }
      } else {
        // API positions (default)
        x = node.position[0];
        y = node.position[1];
        z = node.position[2];
      }

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    return pos;
  }, [visibleNodes, layoutEngine, d3Positions]);

  // STEP 4: Create color array with RGBA (adding opacity for semantic dimming)
  const colors = useMemo(() => {
    const col = new Float32Array(visibleNodes.length * 4);
    const hasSemanticFilter = semanticVisibility && semanticVisibility.reason !== 'all';
    const selectedId = highlightState?.selectedId;
    const isSubgraphMode = semanticVisibility?.reason === 'subgraph';

    for (let i = 0; i < visibleNodes.length; i++) {
      const node = visibleNodes[i];
      const typeColor = getNodeTypeColor(node.type);
      col[i * 4] = typeColor[0];      // R
      col[i * 4 + 1] = typeColor[1];  // G
      col[i * 4 + 2] = typeColor[2];  // B

      // STEP 4: Determine opacity based on semantic filter and selection
      let opacity = 1.0;
      if (hasSemanticFilter && !selectedId) {
        // Semantic filter active with no selection
        if (isSubgraphMode) {
          // In subgraph mode, non-center nodes are dimmed (but above floor 0.35)
          opacity = 0.6;
        } else {
          // For other filter modes, all visible items are equally in focus
          opacity = 1.0;
        }
      } else if (hasSemanticFilter && selectedId && node.id !== selectedId) {
        // Selection with semantic filter: only selected node is full opacity
        opacity = 0.5; // Supporting items dimmed but above floor 0.35
      }

      col[i * 4 + 3] = Math.max(0.35, opacity); // STEP 4: Opacity floor 0.35
    }
    return col;
  }, [visibleNodes, semanticVisibility, highlightState]);

  // Create size array (enhanced gravity scaling)
  const sizes = useMemo(() => {
    const sz = new Float32Array(visibleNodes.length);
    for (let i = 0; i < visibleNodes.length; i++) {
      sz[i] = 15 + visibleNodes[i].gravity_score * 80;
    }
    return sz;
  }, [visibleNodes]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={visibleNodes.length} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={visibleNodes.length} itemSize={4} />
        <bufferAttribute attach="attributes-size" array={sizes} count={visibleNodes.length} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial size={10} vertexColors sizeAttenuation={false} transparent />
    </points>
  );
}

/**
 * ProjectsPoints: Render visible projects as larger point cloud (Phase 5.5: semantic filtering)
 * Phase 5.4: North Star focal treatment for highest-gravity project
 */
function ProjectsPoints({
  graph,
  highlightState,
  semanticVisibility,
  layoutEngine,
  d3Positions,
}: {
  graph: RenderableGraph;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  // Filter projects by semantic visibility
  const visibleProjects = useMemo(() => {
    if (!semanticVisibility) {
      console.log('[ProjectsPoints] No semantic visibility - showing all', graph.projects.length, 'projects:', graph.projects.map(p => p.id));
      return graph.projects;
    }
    const filtered = graph.projects.filter(proj => semanticVisibility.visibleProjectIds.has(proj.id));
    console.log('[ProjectsPoints] Filtered projects: input=', graph.projects.length, 'visibleIds.size=', semanticVisibility.visibleProjectIds.size, 'output=', filtered.length, 'ids=', filtered.map(p => p.id), 'visibleIds=', Array.from(semanticVisibility.visibleProjectIds));
    return filtered;
  }, [graph.projects, semanticVisibility]);

  // Create position array for visible projects (Phase 6.0: branch by layoutEngine)
  const positions = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const pos = new Float32Array(visibleProjects.length * 3);
    const useD3 = layoutEngine === 'd3' && d3Positions;

    for (let i = 0; i < visibleProjects.length; i++) {
      const proj = visibleProjects[i];
      let x, y, z;

      if (useD3) {
        // Phase 6.0: Use D3-computed positions
        const d3Pos = d3Positions.projectPositions.get(proj.id);
        if (d3Pos) {
          x = d3Pos[0];
          y = d3Pos[1];
          z = 0; // D3 positions are 2D [x, y]
        } else {
          // Fallback to API position if not in D3 result (shouldn't happen)
          x = proj.position[0];
          y = proj.position[1];
          z = proj.position[2];
        }
      } else {
        // API positions (default)
        x = proj.position[0];
        y = proj.position[1];
        z = proj.position[2];
      }

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    return pos;
  }, [visibleProjects, layoutEngine, d3Positions]);

  // STEP 4: Create color array with RGBA (adding opacity for semantic dimming)
  const colors = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const col = new Float32Array(visibleProjects.length * 4);
    const hasSemanticFilter = semanticVisibility && semanticVisibility.reason !== 'all';
    const selectedId = highlightState?.selectedId;

    for (let i = 0; i < visibleProjects.length; i++) {
      // STEP 2: Restore project anchor color (pink)
      col[i * 4] = 1.0;      // R
      col[i * 4 + 1] = 0.0;  // G
      col[i * 4 + 2] = 0.8;  // B (pink = red + blue, no green)

      // STEP 4: Determine opacity based on semantic filter and selection
      let opacity = 1.0;
      if (hasSemanticFilter && !selectedId) {
        // For projects, dimming is less aggressive (all visible projects are important)
        opacity = 1.0; // Projects remain full opacity even with semantic filters
      } else if (hasSemanticFilter && selectedId && visibleProjects[i].id !== selectedId) {
        // Selection with semantic filter: only selected project is full opacity
        opacity = 0.5; // Other projects dimmed
      }

      col[i * 4 + 3] = Math.max(0.35, opacity); // STEP 4: Opacity floor 0.35
    }
    return col;
  }, [visibleProjects, semanticVisibility, highlightState]);

  // Create size array for visible projects (enhanced gravity scaling for anchor visibility)
  const sizes = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const sz = new Float32Array(visibleProjects.length);
    for (let i = 0; i < visibleProjects.length; i++) {
      // Phase 5.3: 50 + gravity*80 makes projects significantly more visually dominant
      sz[i] = 50 + visibleProjects[i].gravity_score * 80;
    }
    return sz;
  }, [visibleProjects]);

  if (visibleProjects.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={visibleProjects.length} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={visibleProjects.length} itemSize={4} />
        <bufferAttribute attach="attributes-size" array={sizes} count={visibleProjects.length} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        size={10}
        vertexColors
        sizeAttenuation={false}
        transparent
      />
    </points>
  );
}

/*
 * StarField: Background depth with sparse stars (Phase 5.4) - DISABLED FOR DEBUG MODE
 * Creates subtle atmospheric depth without visual clutter
 */
// function StarField() { ... }

/**
 * EdgesLineSegments: Render visible edges as line segments (Phase 5.5: semantic filtering)
 * Connected edges: 0.8 opacity when selected, 0.6 normally
 * Unconnected edges: 0.35 opacity when something selected, 0.6 normally
 * Phase 5.4: Animated pulse on connected edges for depth feedback
 */
function EdgesLineSegments({
  graph,
  highlightState,
  semanticVisibility,
  citedState,
}: {
  graph: RenderableGraph;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  citedState?: CitedState;
}) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const baseColorsRef = useRef<Float32Array | null>(null);
  const pulseTimeRef = useRef(0);

  // Filter edges by semantic visibility
  const visibleEdges = useMemo(() => {
    if (!semanticVisibility) return graph.edges;
    return graph.edges.filter(edge => semanticVisibility.visibleEdgeIds.has(edge.id));
  }, [graph.edges, semanticVisibility]);

  // Create position array for visible edges
  const positions = useMemo(() => {
    if (visibleEdges.length === 0) return new Float32Array();

    const pos = new Float32Array(visibleEdges.length * 6);
    for (let i = 0; i < visibleEdges.length; i++) {
      const edge = visibleEdges[i];
      pos[i * 6] = edge.source[0];
      pos[i * 6 + 1] = edge.source[1];
      pos[i * 6 + 2] = edge.source[2];
      pos[i * 6 + 3] = edge.target[0];
      pos[i * 6 + 4] = edge.target[1];
      pos[i * 6 + 5] = edge.target[2];
    }
    return pos;
  }, [visibleEdges]);

  // STEP 3 & 4: Create base color array for visible edges with role-based colors and semantic dimming
  const colors = useMemo(() => {
    if (visibleEdges.length === 0) return new Float32Array();

    const col = new Float32Array(visibleEdges.length * 8); // 2 vertices × 4 components (RGBA)
    const hasSelection = !!highlightState?.selectedId;
    const isAnswerActive = !!citedState?.citedNodeIds;
    const hasSemanticFilter = semanticVisibility && semanticVisibility.reason !== 'all';

    for (let i = 0; i < visibleEdges.length; i++) {
      const edge = visibleEdges[i];
      const isConnected = highlightState?.connectedEdgeIds?.has(edge.id) ?? false;
      const isCited = citedState?.citedEdgeIds?.has(edge.id) ?? false;

      // STEP 3: Determine edge color based on cited and selection state
      let [r, g, b] = isCited
        ? getCitedEdgeColor() // Bright cyan if cited
        : getEdgeHighlightColor(isConnected); // Red if connected, gray otherwise

      // STEP 3: Determine opacity based on multiple factors
      let opacity = computeFinalEdgeOpacity(isConnected, isCited, isAnswerActive ?? false, hasSelection);

      // STEP 4: Apply semantic dimming for edges (floor: 0.18)
      if (hasSemanticFilter && !isConnected && !isCited) {
        // Non-connected, non-cited edges are dimmed more in semantic filter mode
        opacity *= 0.5; // Reduce opacity when semantic filter active
      }
      opacity = Math.max(0.18, opacity); // STEP 4: Opacity floor 0.18 for edges

      // Both vertices get same color with opacity
      col[i * 8] = r;
      col[i * 8 + 1] = g;
      col[i * 8 + 2] = b;
      col[i * 8 + 3] = opacity;
      col[i * 8 + 4] = r;
      col[i * 8 + 5] = g;
      col[i * 8 + 6] = b;
      col[i * 8 + 7] = opacity;
    }
    baseColorsRef.current = col;
    return col;
  }, [visibleEdges, highlightState, citedState, semanticVisibility]);

  // Animate connected edge pulse (Phase 5.4: subtle shimmer on active paths)
  useEffect(() => {
    const animate = () => {
      if (!lineRef.current || !baseColorsRef.current || !highlightState?.connectedEdgeIds.size) {
        pulseTimeRef.current = 0;
        return;
      }

      pulseTimeRef.current = (pulseTimeRef.current + 0.02) % (Math.PI * 2);
      const colorAttr = lineRef.current.geometry.attributes.color as THREE.BufferAttribute;
      const newColors = new Float32Array(baseColorsRef.current);

      // Pulse only connected edges (using visible edge indices)
      for (let i = 0; i < visibleEdges.length; i++) {
        const edge = visibleEdges[i];
        if (highlightState.connectedEdgeIds.has(edge.id)) {
          // Gentle pulse: 0.7 to 1.0 opacity modulation
          const pulse = 0.85 + Math.sin(pulseTimeRef.current) * 0.15;
          newColors[i * 8 + 3] *= pulse;
          newColors[i * 8 + 7] *= pulse;
        }
      }

      colorAttr.array = newColors;
      colorAttr.needsUpdate = true;
    };

    const frameId = requestAnimationFrame(function update() {
      animate();
      frameId;
      requestAnimationFrame(update);
    });

    return () => cancelAnimationFrame(frameId);
  }, [visibleEdges, highlightState]);

  if (visibleEdges.length === 0) return null;

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={visibleEdges.length * 2} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={visibleEdges.length * 2} itemSize={4} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent />
    </lineSegments>
  );
}

/**
 * ProjectLabels: Render text labels for projects only
 */
function ProjectLabels({ graph }: { graph: RenderableGraph }) {
  return (
    <>
      {graph.projects.map((proj) => (
        <Text
          key={proj.id}
          position={[proj.position[0], proj.position[1] - 1.5, proj.position[2]]}
          fontSize={0.6}
          color={0x333333}
          maxWidth={2.5}
          textAlign="center"
          anchorX="center"
          anchorY="top"
        >
          {proj.title}
        </Text>
      ))}
    </>
  );
}

/**
 * NodeLabels: Render text labels for selected nodes only (Phase 5.3)
 * Reduces visual clutter while keeping important nodes readable
 * Phase 6.0: Support both API and D3 layout positions
 */
function NodeLabels({
  graph,
  selectedNodeId,
  layoutEngine,
  d3Positions,
}: {
  graph: RenderableGraph;
  selectedNodeId?: string | null;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
}) {
  // Only show label for selected node
  const selectedNode = selectedNodeId ? graph.nodes.find((n) => n.id === selectedNodeId) : null;

  if (!selectedNode) {
    return null;
  }

  // Phase 6.0: Branch position source by layout engine
  const useD3 = layoutEngine === 'd3' && d3Positions;
  let labelX = selectedNode.position[0];
  let labelY = selectedNode.position[1];
  let labelZ = selectedNode.position[2];

  if (useD3) {
    const d3Pos = d3Positions.nodePositions.get(selectedNode.id);
    if (d3Pos) {
      labelX = d3Pos[0];
      labelY = d3Pos[1];
      labelZ = 0; // D3 positions are 2D [x, y]
    }
  }

  return (
    <Text
      key={`label-${selectedNode.id}`}
      position={[labelX, labelY - 1.0, labelZ]}
      fontSize={0.5}
      color={0xcccccc}
      maxWidth={2.0}
      textAlign="center"
      anchorX="center"
      anchorY="top"
    >
      {selectedNode.title}
    </Text>
  );
}

/**
 * PickableNodes: Invisible mesh layer for visible node click detection (Phase 5.5: semantic filtering)
 * Phase 5.2: Increased hit areas by 2.5x for reliable interaction
 * Provides cursor feedback on hover
 * Phase 5.9: Analytics wiring for node selection
 * Phase 6.2A: Position aligned with layout engine (D3 or API) to fix picking misalignment
 */
function PickableNodes({
  graph,
  onNodeClick,
  semanticVisibility,
  layoutEngine,
  d3Positions,
}: {
  graph: RenderableGraph;
  onNodeClick?: (node: GraphNode) => void;
  semanticVisibility?: SemanticVisibility | null;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
}) {
  // Filter nodes by semantic visibility
  const visibleNodes = useMemo(() => {
    if (!semanticVisibility) return graph.nodes;
    return graph.nodes.filter(node => semanticVisibility.visibleNodeIds.has(node.id));
  }, [graph.nodes, semanticVisibility]);

  // Phase 6.2A: Compute position with same branching logic as visible nodes (NodesPoints)
  const getPickerPosition = (node: GraphNode) => {
    const useD3 = layoutEngine === 'd3' && d3Positions;
    if (useD3) {
      const d3Pos = d3Positions.nodePositions.get(node.id);
      if (d3Pos) {
        return [d3Pos[0], d3Pos[1], 0] as [number, number, number];
      }
    }
    return [node.x, node.y, node.z] as [number, number, number];
  };

  return (
    <>
      {visibleNodes.map((node) => (
        <mesh
          key={`picker-node-${node.id}`}
          position={getPickerPosition(node)}
          onPointerEnter={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerLeave={() => {
            document.body.style.cursor = 'auto';
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            // Phase 5.9: Fire analytics event at source (canvas click)
            logNodeSelected(node, 'canvas_click');
            onNodeClick?.(node);
          }}
        >
          {/* Phase 5.2: Increased from 1.0 + gravity*2 to (2.5 + gravity*5) for forgiving hit areas */}
          <sphereGeometry args={[2.5 + node.gravity_score * 5, 8, 8]} />
          <meshBasicMaterial colorWrite={false} depthTest={false} />
        </mesh>
      ))}
    </>
  );
}

/**
 * PickableProjects: Invisible mesh layer for visible project click detection (Phase 5.5: semantic filtering)
 * Phase 5.2: Increased hit areas by 2.5x for reliable interaction
 * Provides cursor feedback on hover
 * Phase 5.9: Analytics wiring for project selection
 * Phase 6.2A: Position aligned with layout engine (D3 or API) to fix picking misalignment
 */
function PickableProjects({
  graph,
  onProjectClick,
  semanticVisibility,
  layoutEngine,
  d3Positions,
}: {
  graph: RenderableGraph;
  onProjectClick?: (project: GraphProject) => void;
  semanticVisibility?: SemanticVisibility | null;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
}) {
  // Filter projects by semantic visibility
  const visibleProjects = useMemo(() => {
    if (!semanticVisibility) {
      console.log('[PickableProjects] No semantic visibility - showing all', graph.projects.length, 'projects:', graph.projects.map(p => p.id));
      return graph.projects;
    }
    const filtered = graph.projects.filter(proj => semanticVisibility.visibleProjectIds.has(proj.id));
    console.log('[PickableProjects] Filtered projects: input=', graph.projects.length, 'visibleIds.size=', semanticVisibility.visibleProjectIds.size, 'output=', filtered.length, 'ids=', filtered.map(p => p.id));
    return filtered;
  }, [graph.projects, semanticVisibility]);

  // Phase 6.2A: Compute position with same branching logic as visible projects (ProjectsPoints)
  const getPickerPosition = (proj: GraphProject) => {
    const useD3 = layoutEngine === 'd3' && d3Positions;
    if (useD3) {
      const d3Pos = d3Positions.projectPositions.get(proj.id);
      if (d3Pos) {
        return [d3Pos[0], d3Pos[1], 0] as [number, number, number];
      }
    }
    return [proj.x_derived, proj.y_derived, proj.z_derived] as [number, number, number];
  };

  return (
    <>
      {visibleProjects.map((proj) => (
        <mesh
          key={`picker-project-${proj.id}`}
          position={getPickerPosition(proj)}
          onPointerEnter={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerLeave={() => {
            document.body.style.cursor = 'auto';
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            // Phase 5.9: Fire analytics event at source (canvas click), count nodes in project
            const nodeCountInProject = graph.nodes.filter(n => n.project_id === proj.id).length;
            logProjectSelected(proj, nodeCountInProject, 'canvas_click');
            onProjectClick?.(proj);
          }}
        >
          {/* Phase 5.2: Increased from 1.5 + gravity*3 to (3.75 + gravity*7.5) for forgiving hit areas */}
          <sphereGeometry args={[3.75 + proj.gravity_score * 7.5, 8, 8]} />
          <meshBasicMaterial colorWrite={false} depthTest={false} />
        </mesh>
      ))}
    </>
  );
}


/**
 * SceneContent: Inner scene with all graph geometry
 */
function SceneContent({
  graph,
  cameraParams,
  onUnresolvedEdgesChange,
  onNodeClick,
  onProjectClick,
  highlightState,
  semanticVisibility,
  selectedNodeId,
  citedState,
  layoutEngine,
  d3Positions,
}: {
  graph: RenderableGraph;
  cameraParams: CameraParams;
  onUnresolvedEdgesChange?: (count: number) => void;
  onNodeClick?: (node: GraphNode) => void;
  onProjectClick?: (project: GraphProject) => void;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  selectedNodeId?: string | null;
  citedState?: CitedState;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
}) {
  useEffect(() => {
    onUnresolvedEdgesChange?.(graph.unresolved_edges.length);

    if (typeof window !== 'undefined' && (window as any).__DEV__) {
      if (graph.unresolved_edges.length > 0) {
        console.warn(
          `[CanvasScene] ${graph.unresolved_edges.length} unresolved edges:`,
          graph.unresolved_edges
        );
      } else {
        console.log(`[CanvasScene] All ${graph.edges.length} edges resolved`);
      }
    }
  }, [graph, onUnresolvedEdgesChange]);

  return (
    <>
      {/* Camera */}
      <GraphCamera params={cameraParams} />

      {/* Lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 10]} intensity={0.5} />

      {/* DEBUG MODE: Disable fog for visibility testing */}
      {/* <fog attach="fog" args={['#000000', 20, 150]} /> */}
      {/* <StarField /> */}

      {/* Geometry */}
      <EdgesLineSegments graph={graph} highlightState={highlightState} semanticVisibility={semanticVisibility} citedState={citedState} />
      <NodesPoints graph={graph} highlightState={highlightState} semanticVisibility={semanticVisibility} layoutEngine={layoutEngine} d3Positions={d3Positions} />
      <ProjectsPoints graph={graph} highlightState={highlightState} semanticVisibility={semanticVisibility} layoutEngine={layoutEngine} d3Positions={d3Positions} />

      {/* Labels */}
      <ProjectLabels graph={graph} />
      <NodeLabels graph={graph} selectedNodeId={selectedNodeId} layoutEngine={layoutEngine} d3Positions={d3Positions} />

      {/* Interactive picking layer */}
      <PickableNodes graph={graph} onNodeClick={onNodeClick} semanticVisibility={semanticVisibility} layoutEngine={layoutEngine} d3Positions={d3Positions} />
      <PickableProjects graph={graph} onProjectClick={onProjectClick} semanticVisibility={semanticVisibility} layoutEngine={layoutEngine} d3Positions={d3Positions} />

      {/* Canvas background for click detection */}
      <mesh position={[0, 0, -10]} scale={[10000, 10000, 1]} onPointerUp={(e) => e.stopPropagation()}>
        <planeGeometry />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}

/**
 * CanvasScene
 * Main canvas component with static framing and background for deselection
 */
export function CanvasScene({
  graph,
  onUnresolvedEdgesChange,
  onNodeClick,
  onProjectClick,
  onCanvasClick,
  highlightState,
  semanticVisibility,
  selectedNodeId,
  citedState,
  layoutEngine,
  d3Positions,
}: CanvasSceneProps) {
  // Compute bounds and camera parameters once from graph
  const { cameraParams } = useMemo(() => {
    const b = computeGraphBounds(graph);
    const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1.6;
    const cp = computeCameraParams(b, aspect, 0.1);
    return { bounds: b, cameraParams: cp };
  }, [graph]);


  return (
    <Canvas
      orthographic
      frameloop="always"
      gl={{
        antialias: true,
        stencil: false,
        depth: true,
      }}
      style={{ width: '100%', height: '100%', background: '#333333' }}
    >
      <SceneContent
        graph={graph}
        cameraParams={cameraParams}
        onUnresolvedEdgesChange={onUnresolvedEdgesChange}
        onNodeClick={onNodeClick}
        onProjectClick={onProjectClick}
        highlightState={highlightState}
        semanticVisibility={semanticVisibility}
        selectedNodeId={selectedNodeId}
        citedState={citedState}
        layoutEngine={layoutEngine}
        d3Positions={d3Positions}
      />

      {/* Background mesh for canvas deselect clicks */}
      {onCanvasClick && (
        <mesh position={[0, 0, -100]} scale={[10000, 10000, 1]} onPointerUp={onCanvasClick}>
          <planeGeometry />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </Canvas>
  );
}
