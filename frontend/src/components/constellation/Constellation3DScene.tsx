/**
 * CONSTELLATION3DSCENE.TSX
 * Phase 1 Experimental: Enhanced visual presentation of constellation graph
 * Cloned from CanvasScene.tsx with Phase 1 visual enhancements only
 * Preserves all current logic: membership-signature keys, picking, semantic filtering, citation highlighting, edge pulse
 *
 * Phase 1 Visual Enhancements:
 * - Richer node type colors (enhanced saturation)
 * - Tuned opacity values for better visual hierarchy
 * - Enhanced project anchor emphasis
 * - Brighter atmospheric elements (StarField)
 * - Point-cloud-safe rendering (no emissive/lighting assumptions on PointsMaterial)
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
} from '../../lib/graph/highlighting';
import { GraphNode, GraphProject } from "../../lib/graph/graphTypes";
import type { SemanticVisibility } from '../../lib/graph/graphSemantics';
import { D3SettledPositions } from '../../lib/graph/d3SimulationEngine';
import { logNodeSelected, logProjectSelected } from '../../lib/analytics/constellationAnalytics';

interface Constellation3DSceneProps {
  graph: RenderableGraph;
  onUnresolvedEdgesChange?: (count: number) => void;
  onNodeClick?: (node: GraphNode) => void;
  onProjectClick?: (project: GraphProject) => void;
  onCanvasClick?: () => void;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  selectedNodeId?: string | null;
  selectedProjectId?: string | null;
  citedState?: CitedState;
  cameraRef?: React.MutableRefObject<THREE.OrthographicCamera | null>;
  controlsRef?: React.MutableRefObject<any | null>;
  onCameraReady?: (camera: any) => void;
  onControlsReady?: (controls: any) => void;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
  onCancelAnimation?: () => void;
  isAnimatingRef?: React.MutableRefObject<boolean>;
  highlightSearchResultId?: string | null;
}

/**
 * Phase 1: Enhanced color palette for node types
 * Increases saturation and brightness compared to base colors
 * Preserves type-to-color mapping but makes colors more vibrant
 */
function getEnhancedNodeTypeColor(type: string): [number, number, number] {
  const baseColor = getNodeTypeColor(type);

  // Phase 1 Enhancement: Boost saturation and brightness
  // Multiply R, G, B by enhancement factors (max 1.0 to stay within color space)
  const enhance = (channel: number, boost: number) => Math.min(1.0, channel * boost);

  return [
    enhance(baseColor[0], 1.2),  // Slightly brighter reds
    enhance(baseColor[1], 1.15), // Brighten greens (more restrained to avoid oversaturation)
    enhance(baseColor[2], 1.1),  // Subtle blue boost
  ];
}

function getMembershipSignature<T extends { id: string }>(items: T[]): string {
  if (items.length === 0) return 'empty';
  return items
    .map(item => item.id)
    .sort()
    .join(',');
}

/**
 * Phase 1: NodesPoints with enhanced colors and refined opacity
 */
function NodesPoints({
  graph,
  highlightState,
  semanticVisibility,
  layoutEngine,
  d3Positions,
  highlightSearchResultId,
  citedState,
}: {
  graph: RenderableGraph;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
  highlightSearchResultId?: string | null;
  citedState?: CitedState;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const visibleNodes = useMemo(() => {
    if (!semanticVisibility) return graph.nodes;
    return graph.nodes.filter(node => semanticVisibility.visibleNodeIds.has(node.id));
  }, [graph.nodes, semanticVisibility]);

  if (visibleNodes.length === 0) {
    return null;
  }

  const positions = useMemo(() => {
    const pos = new Float32Array(visibleNodes.length * 3);
    const useD3 = layoutEngine === 'd3' && d3Positions;

    for (let i = 0; i < visibleNodes.length; i++) {
      const node = visibleNodes[i];
      let x, y, z;

      if (useD3) {
        const d3Pos = d3Positions.nodePositions.get(node.id);
        if (d3Pos) {
          x = d3Pos[0];
          y = d3Pos[1];
          z = 0;
        } else {
          x = node.position[0];
          y = node.position[1];
          z = node.position[2];
        }
      } else {
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

  const colors = useMemo(() => {
    const col = new Float32Array(visibleNodes.length * 4);
    const hasSemanticFilter = semanticVisibility && semanticVisibility.reason !== 'all';
    const selectedId = highlightState?.selectedId;
    const isSubgraphMode = semanticVisibility?.reason === 'subgraph';

    // Phase 4: Detect if any evidence is active (for non-cited de-emphasis)
    const hasAnyCitation = citedState && (citedState.citedNodeIds.size > 0 || citedState.citedProjectIds.size > 0);

    for (let i = 0; i < visibleNodes.length; i++) {
      const node = visibleNodes[i];
      // Phase 1: Use enhanced colors instead of base colors
      const typeColor = getEnhancedNodeTypeColor(node.type);

      // Phase 3: Apply search result hover highlight
      let finalColor = [...typeColor];
      if (highlightSearchResultId && node.id === highlightSearchResultId) {
        // Brighten hovered search result: multiply by 1.3x
        finalColor = finalColor.map(c => Math.min(1.0, c * 1.3));
      }

      // Phase 4: Apply citation brightness (cited evidence nodes brighter)
      const isCited = citedState && citedState.citedNodeIds.has(node.id);
      if (isCited) {
        // Brighten cited evidence nodes: multiply by 1.3x (clamped to 1.0)
        finalColor = finalColor.map(c => Math.min(1.0, c * 1.3));
      } else if (hasAnyCitation) {
        // Phase 4: De-emphasize non-cited nodes when evidence is active (dim to 0.75x)
        finalColor = finalColor.map(c => c * 0.75);
      }

      col[i * 4] = finalColor[0];
      col[i * 4 + 1] = finalColor[1];
      col[i * 4 + 2] = finalColor[2];

      // Phase 1: Refined opacity values (slightly higher for better visibility)
      let opacity = 1.0;
      if (hasSemanticFilter && !selectedId) {
        opacity = isSubgraphMode ? 0.65 : 1.0; // Slightly less dim in subgraph mode
      } else if (hasSemanticFilter && selectedId && node.id !== selectedId) {
        opacity = 0.55; // Slightly higher non-selected opacity
      }

      col[i * 4 + 3] = Math.max(0.35, opacity);
    }
    return col;
  }, [visibleNodes, semanticVisibility, highlightState, highlightSearchResultId, citedState]);

  const sizes = useMemo(() => {
    const sz = new Float32Array(visibleNodes.length);
    for (let i = 0; i < visibleNodes.length; i++) {
      sz[i] = 2 + visibleNodes[i].gravity_score * 5;
    }
    return sz;
  }, [visibleNodes]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry key={`nodes-membership-${getMembershipSignature(visibleNodes)}`}>
        <bufferAttribute attach="attributes-position" array={positions} count={visibleNodes.length} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={visibleNodes.length} itemSize={4} />
        <bufferAttribute attach="attributes-size" array={sizes} count={visibleNodes.length} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial size={10} vertexColors sizeAttenuation={false} transparent />
    </points>
  );
}

/**
 * Phase 1: ProjectsPoints with enhanced anchor emphasis
 */
function ProjectsPoints({
  graph,
  highlightState,
  semanticVisibility,
  layoutEngine,
  d3Positions,
  highlightSearchResultId,
  citedState,
}: {
  graph: RenderableGraph;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
  highlightSearchResultId?: string | null;
  citedState?: CitedState;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const visibleProjects = useMemo(() => {
    if (!semanticVisibility) {
      return graph.projects;
    }
    const filtered = graph.projects.filter(proj => semanticVisibility.visibleProjectIds.has(proj.id));
    return filtered;
  }, [graph.projects, semanticVisibility]);

  const positions = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const pos = new Float32Array(visibleProjects.length * 3);
    const useD3 = layoutEngine === 'd3' && d3Positions;

    for (let i = 0; i < visibleProjects.length; i++) {
      const proj = visibleProjects[i];
      let x, y, z;

      if (useD3) {
        const d3Pos = d3Positions.projectPositions.get(proj.id);
        if (d3Pos) {
          x = d3Pos[0];
          y = d3Pos[1];
          z = 0;
        } else {
          x = proj.position[0];
          y = proj.position[1];
          z = proj.position[2];
        }
      } else {
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

  const colors = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const col = new Float32Array(visibleProjects.length * 4);
    const hasSemanticFilter = semanticVisibility && semanticVisibility.reason !== 'all';
    const selectedId = highlightState?.selectedId;

    // Phase 4: Detect if any evidence is active (for non-cited de-emphasis)
    const hasAnyCitation = citedState && (citedState.citedNodeIds.size > 0 || citedState.citedProjectIds.size > 0);

    for (let i = 0; i < visibleProjects.length; i++) {
      // Phase 1: Keep magenta bright and saturated (no enhancement needed)
      let r = 1.0;
      let g = 0.0;
      let b = 1.0;

      // Phase 3: Apply search result hover highlight
      if (highlightSearchResultId && visibleProjects[i].id === highlightSearchResultId) {
        // Brighten hovered search result: multiply by 1.3x (clamped to 1.0)
        r = Math.min(1.0, r * 1.3);
        g = Math.min(1.0, g * 1.3);
        b = Math.min(1.0, b * 1.3);
      }

      // Phase 4: Apply citation brightness (cited evidence projects brighter)
      const isCited = citedState && citedState.citedProjectIds.has(visibleProjects[i].id);
      if (isCited) {
        // Brighten cited evidence projects: multiply by 1.3x (clamped to 1.0)
        r = Math.min(1.0, r * 1.3);
        g = Math.min(1.0, g * 1.3);
        b = Math.min(1.0, b * 1.3);
      } else if (hasAnyCitation) {
        // Phase 4: De-emphasize non-cited projects when evidence is active (dim to 0.75x)
        r = r * 0.75;
        g = g * 0.75;
        b = b * 0.75;
      }

      col[i * 4] = r;
      col[i * 4 + 1] = g;
      col[i * 4 + 2] = b;

      let opacity = 1.0;
      if (hasSemanticFilter && !selectedId) {
        opacity = 1.0;
      } else if (hasSemanticFilter && selectedId && visibleProjects[i].id !== selectedId) {
        opacity = 0.55; // Slightly higher opacity for better anchor visibility
      }

      col[i * 4 + 3] = Math.max(0.35, opacity);
    }
    return col;
  }, [visibleProjects, semanticVisibility, highlightState, highlightSearchResultId, citedState]);

  const sizes = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const sz = new Float32Array(visibleProjects.length);
    for (let i = 0; i < visibleProjects.length; i++) {
      sz[i] = 6 + visibleProjects[i].gravity_score * 9;
    }
    return sz;
  }, [visibleProjects]);

  if (visibleProjects.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry key={`projects-membership-${getMembershipSignature(visibleProjects)}`}>
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

/**
 * ProjectTorusRings: Enhanced scale for better visual prominence
 */
function ProjectTorusRings({
  graph,
  semanticVisibility,
  layoutEngine,
  d3Positions,
}: {
  graph: RenderableGraph;
  semanticVisibility?: SemanticVisibility | null;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
}): JSX.Element {
  const visibleProjects = useMemo(() => {
    if (!semanticVisibility) return graph.projects;
    return graph.projects.filter(proj => semanticVisibility.visibleProjectIds.has(proj.id));
  }, [graph.projects, semanticVisibility]);

  const torusGeometry = useMemo(
    () => new THREE.TorusGeometry(1.0, 0.2, 16, 100),
    []
  );

  return (
    <>
      {visibleProjects.map((proj) => {
        const rawPos =
          (layoutEngine === 'd3' && d3Positions
            ? d3Positions.projectPositions.get(proj.id)
            : undefined) ?? proj.position;

        const pos: [number, number, number] =
          rawPos.length === 3
            ? [rawPos[0], rawPos[1], rawPos[2]]
            : [rawPos[0], rawPos[1], 0];

        // Phase 1: Enhanced scale (2.0 + gravity*2.2 for more prominent rings)
        const ringScale = 2.0 + (proj.gravity_score ?? 0) * 2.2;

        return (
          <mesh
            key={`torus-${proj.id}`}
            position={[pos[0], pos[1], pos[2]]}
            scale={ringScale}
          >
            <primitive object={torusGeometry} attach="geometry" />
            <meshBasicMaterial
              color={new THREE.Color(0.0, 1.0, 0.9)}
              transparent
              opacity={0.55}
              wireframe={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * ProjectGlowSprites: Enhanced glow for ambient luminosity
 */
function ProjectGlowSprites({
  graph,
  semanticVisibility,
  layoutEngine,
  d3Positions,
}: {
  graph: RenderableGraph;
  semanticVisibility?: SemanticVisibility | null;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
}) {
  const visibleProjects = useMemo(() => {
    if (!semanticVisibility) return graph.projects;
    return graph.projects.filter(proj => semanticVisibility.visibleProjectIds.has(proj.id));
  }, [graph.projects, semanticVisibility]);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    // Phase 1: Brighter gradient for more luminous effect
    gradient.addColorStop(0, 'rgba(255, 0, 200, 0.95)');
    gradient.addColorStop(1, 'rgba(255, 0, 200, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, []);

  if (!texture) return null;

  return (
    <>
      {visibleProjects.map((proj) => {
        const rawPos =
          (layoutEngine === 'd3' && d3Positions
            ? d3Positions.projectPositions.get(proj.id)
            : undefined) ?? proj.position;

        const pos: [number, number, number] =
          rawPos.length === 3
            ? [rawPos[0], rawPos[1], rawPos[2]]
            : [rawPos[0], rawPos[1], 0];

        // Phase 1: Enhanced scale (4.0 + gravity*4.0 for more prominent glow)
        const spriteScale = 4.0 + (proj.gravity_score ?? 0) * 4.0;

        return (
          <sprite
            key={`glow-${proj.id}`}
            position={[pos[0], pos[1], pos[2] - 0.1]}
            scale={spriteScale}
          >
            <spriteMaterial map={texture} transparent sizeAttenuation={true} />
          </sprite>
        );
      })}
    </>
  );
}

/**
 * StarField: Enhanced brightness for deeper atmosphere
 */
function StarField() {
  const stars = useMemo(() => {
    const starList: { x: number; y: number; z: number; size: number }[] = [];
    const seed = 42;

    let rng = seed;
    const next = () => {
      rng = (rng * 1103515245 + 12345) % (2 ** 31);
      return Math.abs(rng) / (2 ** 31);
    };

    for (let i = 0; i < 150; i++) {
      starList.push({
        x: (next() - 0.5) * 200,
        y: (next() - 0.5) * 200,
        z: -120 - next() * 30,
        size: 0.15 + next() * 0.2,
      });
    }
    return starList;
  }, []);

  const positions = useMemo(() => {
    const pos = new Float32Array(stars.length * 3);
    for (let i = 0; i < stars.length; i++) {
      pos[i * 3] = stars[i].x;
      pos[i * 3 + 1] = stars[i].y;
      pos[i * 3 + 2] = stars[i].z;
    }
    return pos;
  }, [stars]);

  const sizes = useMemo(() => {
    const sz = new Float32Array(stars.length);
    for (let i = 0; i < stars.length; i++) {
      sz[i] = stars[i].size;
    }
    return sz;
  }, [stars]);

  const colors = useMemo(() => {
    const col = new Float32Array(stars.length * 3);
    for (let i = 0; i < stars.length; i++) {
      const b = 0.7 + Math.random() * 0.3;
      col[i * 3] = b * 0.7;
      col[i * 3 + 1] = b * 0.8;
      col[i * 3 + 2] = b;
    }
    return col;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={stars.length} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={stars.length} itemSize={3} />
        <bufferAttribute attach="attributes-size" array={sizes} count={stars.length} itemSize={1} />
      </bufferGeometry>
      {/* Phase 1: Enhanced opacity (0.35 → 0.45) for more visible stars */}
      <pointsMaterial size={4} sizeAttenuation={true} vertexColors transparent opacity={0.45} />
    </points>
  );
}

/**
 * EdgesLineSegments: Preserved from CanvasScene (no visual changes)
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

  const visibleEdges = useMemo(() => {
    if (!semanticVisibility) return graph.edges;
    return graph.edges.filter(edge => semanticVisibility.visibleEdgeIds.has(edge.id));
  }, [graph.edges, semanticVisibility]);

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

  const colors = useMemo(() => {
    if (visibleEdges.length === 0) return new Float32Array();

    const col = new Float32Array(visibleEdges.length * 8);

    // Phase 4: Detect if any evidence is active
    const hasAnyCitation = citedState && (citedState.citedNodeIds.size > 0 || citedState.citedProjectIds.size > 0);

    for (let i = 0; i < visibleEdges.length; i++) {
      const edge = visibleEdges[i];
      const isConnected = highlightState?.connectedEdgeIds?.has(edge.id) ?? false;

      let [r, g, b] = isConnected
        ? [0.0, 1.0, 1.0]
        : [0.2, 0.2, 0.2];

      let opacity = isConnected ? 0.95 : 0.16;

      // Phase 4: De-emphasize non-connected edges when evidence is active
      if (hasAnyCitation && !isConnected) {
        opacity = 0.08;
      }

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

  useEffect(() => {
    const animate = () => {
      if (!lineRef.current || !baseColorsRef.current || !highlightState?.connectedEdgeIds.size) {
        pulseTimeRef.current = 0;
        return;
      }

      pulseTimeRef.current = (pulseTimeRef.current + 0.02) % (Math.PI * 2);
      const colorAttr = lineRef.current.geometry.attributes.color as THREE.BufferAttribute;
      const newColors = new Float32Array(baseColorsRef.current);

      if (newColors.length !== colorAttr.array.length) {
        return;
      }

      for (let i = 0; i < visibleEdges.length; i++) {
        const edge = visibleEdges[i];
        if (highlightState.connectedEdgeIds.has(edge.id)) {
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
      <bufferGeometry key={`edges-membership-${getMembershipSignature(visibleEdges)}`}>
        <bufferAttribute attach="attributes-position" array={positions} count={visibleEdges.length * 2} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={visibleEdges.length * 2} itemSize={4} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent />
    </lineSegments>
  );
}

/**
 * ProjectLabels: Unchanged from CanvasScene
 */
function ProjectLabels({ graph, selectedProjectId: _selectedProjectId }: { graph: RenderableGraph; selectedProjectId?: string | null }) {
  return (
    <>
      {graph.projects.map((project) => (
        <Text
          key={`label-${project.id}`}
          position={[project.position[0], project.position[1] - 0.2, project.position[2]]}
          fontSize={2.6}
          color={0xFFFFFF}
          maxWidth={6.5}
          textAlign="center"
          anchorX="center"
          anchorY="top"
          letterSpacing={0.05}
        >
          {project.title}
        </Text>
      ))}
    </>
  );
}

/**
 * NodeLabels: Unchanged from CanvasScene
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
  const selectedNode = selectedNodeId ? graph.nodes.find((n) => n.id === selectedNodeId) : null;

  if (!selectedNode) {
    return null;
  }

  const useD3 = layoutEngine === 'd3' && d3Positions;
  let labelX = selectedNode.position[0];
  let labelY = selectedNode.position[1];
  let labelZ = selectedNode.position[2];

  if (useD3) {
    const d3Pos = d3Positions.nodePositions.get(selectedNode.id);
    if (d3Pos) {
      labelX = d3Pos[0];
      labelY = d3Pos[1];
      labelZ = 0;
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
 * PickableNodes: Unchanged from CanvasScene
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
  const visibleNodes = useMemo(() => {
    if (!semanticVisibility) return graph.nodes;
    return graph.nodes.filter(node => semanticVisibility.visibleNodeIds.has(node.id));
  }, [graph.nodes, semanticVisibility]);

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
            logNodeSelected(node, 'canvas_click');
            onNodeClick?.(node);
          }}
        >
          <sphereGeometry args={[2.5 + node.gravity_score * 5, 8, 8]} />
          <meshBasicMaterial colorWrite={false} depthTest={false} />
        </mesh>
      ))}
    </>
  );
}

/**
 * PickableProjects: Unchanged from CanvasScene
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
  const visibleProjects = useMemo(() => {
    if (!semanticVisibility) {
      return graph.projects;
    }
    const filtered = graph.projects.filter(proj => semanticVisibility.visibleProjectIds.has(proj.id));
    return filtered;
  }, [graph.projects, semanticVisibility]);

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
            const nodeCountInProject = graph.nodes.filter(n => n.project_id === proj.id).length;
            logProjectSelected(proj, nodeCountInProject, 'canvas_click');
            onProjectClick?.(proj);
          }}
        >
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
  selectedProjectId,
  citedState,
  layoutEngine,
  d3Positions,
  cameraRef,
  controlsRef,
  onCameraReady,
  onControlsReady,
}: {
  graph: RenderableGraph;
  cameraParams: CameraParams;
  onUnresolvedEdgesChange?: (count: number) => void;
  onNodeClick?: (node: GraphNode) => void;
  onProjectClick?: (project: GraphProject) => void;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  selectedNodeId?: string | null;
  selectedProjectId?: string | null;
  citedState?: CitedState;
  layoutEngine?: 'api' | 'd3';
  d3Positions?: D3SettledPositions | null;
  cameraRef?: React.MutableRefObject<THREE.OrthographicCamera | null>;
  controlsRef?: React.MutableRefObject<any | null>;
  onCameraReady?: (camera: any) => void;
  onControlsReady?: (controls: any) => void;
}) {
  useEffect(() => {
    onUnresolvedEdgesChange?.(graph.unresolved_edges.length);
  }, [graph, onUnresolvedEdgesChange]);

  return (
    <>
      <GraphCamera
        params={cameraParams}
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        onCameraReady={onCameraReady}
        onControlsReady={onControlsReady}
        enableOrbit={true}           // Phase 2: Enable orbit for 3D experience
        enableDamping={true}         // Phase 2: Enable damping for smooth momentum
        dampingFactor={0.08}         // Phase 2: Smooth momentum decay strength
        zoomSpeed={1.0}              // Phase 2: Reduced from 1.2 for smoother zoom feel
      />

      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={0.5} />

      <StarField />

      <EdgesLineSegments graph={graph} highlightState={highlightState} semanticVisibility={semanticVisibility} citedState={citedState} />
      <NodesPoints graph={graph} highlightState={highlightState} semanticVisibility={semanticVisibility} layoutEngine={layoutEngine} d3Positions={d3Positions} citedState={citedState} />
      <ProjectsPoints graph={graph} highlightState={highlightState} semanticVisibility={semanticVisibility} layoutEngine={layoutEngine} d3Positions={d3Positions} citedState={citedState} />

      <ProjectTorusRings graph={graph} semanticVisibility={semanticVisibility} layoutEngine={layoutEngine} d3Positions={d3Positions} />
      <ProjectGlowSprites graph={graph} semanticVisibility={semanticVisibility} layoutEngine={layoutEngine} d3Positions={d3Positions} />

      <ProjectLabels graph={graph} selectedProjectId={selectedProjectId} />
      <NodeLabels graph={graph} selectedNodeId={selectedNodeId} layoutEngine={layoutEngine} d3Positions={d3Positions} />

      <PickableNodes graph={graph} onNodeClick={onNodeClick} semanticVisibility={semanticVisibility} layoutEngine={layoutEngine} d3Positions={d3Positions} />
      <PickableProjects graph={graph} onProjectClick={onProjectClick} semanticVisibility={semanticVisibility} layoutEngine={layoutEngine} d3Positions={d3Positions} />

      <mesh position={[0, 0, -10]} scale={[10000, 10000, 1]} onPointerUp={(e) => e.stopPropagation()}>
        <planeGeometry />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}

/**
 * Constellation3DScene: Main 3D scene component with enhanced visuals
 */
export function Constellation3DScene({
  graph,
  onUnresolvedEdgesChange,
  onNodeClick,
  onProjectClick,
  onCanvasClick,
  highlightState,
  semanticVisibility,
  selectedNodeId,
  selectedProjectId,
  citedState,
  cameraRef,
  controlsRef,
  onCameraReady,
  onControlsReady,
  layoutEngine,
  d3Positions,
  onCancelAnimation,
  isAnimatingRef,
}: Constellation3DSceneProps) {
  const { cameraParams } = useMemo(() => {
    const b = computeGraphBounds(graph);
    const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1.6;
    const cp = computeCameraParams(b, aspect, 0.1);
    return { bounds: b, cameraParams: cp };
  }, [graph]);

  useEffect(() => {
    if (!onCancelAnimation || !isAnimatingRef) return;

    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;

    const handlePointerDown = () => {
      if (isAnimatingRef.current === true) {
        onCancelAnimation();
      }
    };

    const handleWheel = () => {
      if (isAnimatingRef.current === true) {
        onCancelAnimation();
      }
    };

    canvasElement.addEventListener('pointerdown', handlePointerDown);
    canvasElement.addEventListener('wheel', handleWheel);

    return () => {
      canvasElement.removeEventListener('pointerdown', handlePointerDown);
      canvasElement.removeEventListener('wheel', handleWheel);
    };
  }, [onCancelAnimation, isAnimatingRef]);

  return (
    <Canvas
      orthographic
      frameloop="always"
      gl={{
        antialias: true,
        stencil: false,
        depth: true,
      }}
      style={{ width: '100%', height: '100%', background: '#000000' }}
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
        selectedProjectId={selectedProjectId}
        citedState={citedState}
        layoutEngine={layoutEngine}
        d3Positions={d3Positions}
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        onCameraReady={onCameraReady}
        onControlsReady={onControlsReady}
      />

      {onCanvasClick && (
        <mesh position={[0, 0, -100]} scale={[10000, 10000, 1]} onPointerUp={onCanvasClick}>
          <planeGeometry />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </Canvas>
  );
}
