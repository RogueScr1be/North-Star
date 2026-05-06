/**
 * CANVASSCENE.TSX
 * React Three Fiber scene for constellation graph
 * Phase 2.2: Read-only rendering with Points geometries
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { OverviewScene, ViewModeToggle } from './SemanticOverviewMode';
import * as THREE from 'three';
import { RenderableGraph } from '../../lib/graph/graphTransforms';
import { computeGraphBounds, computeCameraParams, CameraParams } from '../../lib/graph/graphBounds';
import { GraphCamera } from './GraphCamera';
import { PersonNode } from './PersonNode';
import { NodeGeometry } from './NodeGeometry';
import { PulsarNodeGeometry } from './PulsarNodeGeometry';
import { BillboardedPanel } from './BillboardedPanel';
import { UniverseBackdrop } from './UniverseBackdrop';
import { EvidenceHoverLine } from './EvidenceHoverLine';
import {
  HighlightState,
  CitedState,
  HighlightRole,
} from '../../lib/graph/highlighting';
import { GraphNode, GraphProject } from "../../lib/graph/graphTypes";
import { SelectedItem } from '../../hooks/useSelection';
import type { SemanticVisibility } from '../../lib/graph/graphSemantics';
import { logNodeSelected, logProjectSelected } from '../../lib/analytics/constellationAnalytics';
import { getNodeVisualSize, getNodePickingSize } from '../../lib/rendering/nodeSizingConstants';
import PostProcessingEffects from './PostProcessingEffects';

interface CanvasSceneProps {
  graph: RenderableGraph;
  onUnresolvedEdgesChange?: (count: number) => void;
  onNodeClick?: (node: GraphNode) => void;
  onProjectClick?: (project: GraphProject) => void;
  onPersonClick?: () => void; // Person node at origin selection (render-layer synthetic)
  onCanvasClick?: () => void; // Deselect on empty canvas click
  highlightState?: HighlightState; // Phase 2.4: selection highlight state
  semanticVisibility?: SemanticVisibility | null; // Phase 5.5: semantic filtering
  selectedNodeId?: string | null; // Phase 5.3: for smart label visibility
  selectedProjectId?: string | null; // Phase C: for selection-based project labels
  selectedItem?: SelectedItem | null; // Phase 3: Selected item for anchored panel
  onClearSelection?: () => void; // Phase 3: Clear selection callback
  citedState?: CitedState; // Phase 5.6: Answer evidence highlighting
  cameraRef?: React.MutableRefObject<THREE.OrthographicCamera | null>; // Phase 5.6: Camera animation
  controlsRef?: React.MutableRefObject<any | null>; // Phase 8.0D: OrbitControls reference (drei component)
  onCameraReady?: (camera: any) => void;        // Phase 8.0D: Callback when OrthographicCamera is ready
  onControlsReady?: (controls: any) => void; // Phase 8.0D: Callback when OrbitControls is ready
  onCancelAnimation?: () => void; // Phase D: Cancel active camera animation on user gesture
  isAnimatingRef?: React.MutableRefObject<boolean>; // Phase D: Track if animation is active
  hoveredEvidenceNodeId?: string | null; // Phase 5.4: Evidence card hover state
  onEvidenceHover?: (nodeId: string) => void; // Phase 5.4: Evidence card hover callback
  onEvidenceLeave?: () => void; // Phase 5.4: Evidence card leave callback
  onEvidenceSelect?: (nodeId: string) => void; // Phase 6.1: Evidence card selection callback
  setProjectCluster?: (projectId: string) => void; // Phase 6.4: Project cluster filter handler
  toggleNodeType?: (type: string) => void; // Phase 6.4: Node type toggle handler
  clearAllFilters?: () => void; // Phase 6.4: Clear all filters handler
}

/**
 * Phase 8.0a: Membership-Signature Helper
 * Generate stable, deterministic membership signature for visible sets.
 *
 * Used as React key to force geometry remount when membership changes,
 * not just cardinality (count) changes.
 *
 * Why: Two different searches can return same node count (e.g., 7 nodes each).
 * If we key only on cardinality, React won't remount → buffer reuse attempted → crash.
 * Membership signature captures actual node IDs in sorted order → unique per distinct set.
 *
 * Example:
 *   visibleNodes: [{ id: 'n3' }, { id: 'n1' }, { id: 'n2' }]
 *   signature: 'n1,n2,n3' (IDs sorted for stability)
 *
 * Cost: O(n log n) for sorting, but only computed on cardinality change, cached in useMemo.
 */
function getMembershipSignature<T extends { id: string }>(items: T[]): string {
  if (items.length === 0) return 'empty';
  return items
    .map(item => item.id)
    .sort()
    .join(',');
}

/**
 * Phase 10.1: Render-Layer Spatial Expansion (CANONICAL TRANSFORM)
 * Apply modest global scaling + strong Z-axis expansion to make graph more spacious
 * and reduce Z-stacking occlusion.
 *
 * CRITICAL: This is the CANONICAL transform used by BOTH visual layers AND picking layers.
 * Usage: Call on all render positions AND all picking positions (nodes, projects, labels, pick targets, edges)
 * to ensure visual glyphs and click targets are spatially aligned.
 *
 * Parameters:
 *   position: [x, y, z] coordinates from API
 *   globalScale: 1.15–1.35 (modest overall expansion)
 *   zAxisExpand: 1.4–1.8 (strong Z separation to reduce stacking)
 *
 * Example:
 *   original: [10, 5, 2]
 *   globalScale: 1.2, zAxisExpand: 1.6
 *   result: [12, 6, 3.2]
 */
function applyRenderLayerSpacing(
  position: [number, number, number],
  globalScale: number = 1.2,
  zAxisExpand: number = 1.6
): [number, number, number] {
  return [
    position[0] * globalScale,
    position[1] * globalScale,
    position[2] * zAxisExpand,
  ];
}

/**
 * NodesGeometries: Render visible nodes with type-specific geometries (Stage 2: Phase 10.1)
 * Replaces NodesPoints (point cloud) with individual Three.js meshes for visual type distinction.
 *
 * Each node renders with:
 * - Type-specific geometry (decision: octahedron, metric: torus, failure: tetrahedron, default: sphere)
 * - Type-based color from highlighting.ts (decision: teal, metric: amber, etc.)
 * - Gravity-scaled size (base 1.5–9.5 range with type modifiers)
 * - Highlight role modulation (selected: bright, adjacent: medium, deemphasized: dim)
 * - Phase 10.1: Spatial expansion applied to all positions for visual/picking alignment
 * - Semantic visibility filtering (subgraph, project cluster, type filter, tag filter)
 *
 * Phase 5.5: Semantic filtering
 * Phase 5.6: Citation highlighting for answer evidence
 */
function NodesGeometries({
  graph,
  onNodeClick,
  highlightState,
  semanticVisibility,
  selectedNodeId,
  citedState,
  hoveredEvidenceNodeId,
}: {
  graph: RenderableGraph;
  onNodeClick?: (node: GraphNode) => void;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  selectedNodeId?: string | null;
  citedState?: CitedState;
  hoveredEvidenceNodeId?: string | null;
}) {
  // Phase 2: Check if Pulsar mode is enabled
  const pulsarEnabled = import.meta.env.VITE_PULSAR_NODES_ENABLED === 'true';

  // Filter nodes by semantic visibility
  const visibleNodes = useMemo(() => {
    if (!semanticVisibility) return graph.nodes;
    return graph.nodes.filter(node => semanticVisibility.visibleNodeIds.has(node.id));
  }, [graph.nodes, semanticVisibility]);

  // Return null if no visible nodes (prevents empty render)
  if (visibleNodes.length === 0) {
    return null;
  }

  // Helper to get highlight role for a node from computed state
  const getNodeHighlightRole = (nodeId: string): HighlightRole => {
    if (!highlightState) return 'default';
    return highlightState.selectedRole.get(nodeId) ?? 'default';
  };

  // Helper to check if node is cited in answer
  const isNodeCited = (nodeId: string): boolean => {
    return citedState?.citedNodeIds?.has(nodeId) ?? false;
  };

  return (
    <>
      {visibleNodes.map((node) => (
        pulsarEnabled ? (
          <PulsarNodeGeometry
            key={`node-geom-${node.id}`}
            node={node}
            highlightRole={getNodeHighlightRole(node.id)}
            isAnswerActive={citedState ? true : false}
            selectedNodeId={selectedNodeId}
            onNodeClick={onNodeClick}
            isCited={isNodeCited(node.id)}
          />
        ) : (
          <NodeGeometry
            key={`node-geom-${node.id}`}
            node={node}
            highlightRole={getNodeHighlightRole(node.id)}
            isAnswerActive={citedState ? true : false}
            selectedNodeId={selectedNodeId}
            onNodeClick={onNodeClick}
            isCited={isNodeCited(node.id)}
            hoveredForEvidence={hoveredEvidenceNodeId === node.id}
          />
        )
      ))}
    </>
  );
}

/**
 * ProjectsPoints: Render visible projects as larger point cloud (Phase 5.5: semantic filtering)
 * Phase 5.4: North Star focal treatment for highest-gravity project
 */
function ProjectsPoints({
  graph,
  semanticVisibility,
  selectedProjectId,
}: {
  graph: RenderableGraph;
  semanticVisibility?: SemanticVisibility | null;
  selectedProjectId?: string | null;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  // Filter projects by semantic visibility
  const visibleProjects = useMemo(() => {
    if (!semanticVisibility) {
      return graph.projects;
    }
    const filtered = graph.projects.filter(proj => semanticVisibility.visibleProjectIds.has(proj.id));
    return filtered;
  }, [graph.projects, semanticVisibility]);

  // Create position array for visible projects (Phase 8.0A: D3 shelved, API-only; Phase 10.1: spatial expansion)
  const positions = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const pos = new Float32Array(visibleProjects.length * 3);

    for (let i = 0; i < visibleProjects.length; i++) {
      const proj = visibleProjects[i];
      // Phase 10.1: Apply render-layer spatial expansion to reduce Z-stacking and expand graph
      const [expandedX, expandedY, expandedZ] = applyRenderLayerSpacing(proj.position, 1.2, 1.6);
      pos[i * 3] = expandedX;
      pos[i * 3 + 1] = expandedY;
      pos[i * 3 + 2] = expandedZ;
    }
    return pos;
  }, [visibleProjects]);

  // STEP 4: Create color array with RGBA (projects always remain visible as structural anchors)
  const colors = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const col = new Float32Array(visibleProjects.length * 4);

    for (let i = 0; i < visibleProjects.length; i++) {
      // STEP 2: Strong project anchor color (vibrant magenta-cyan blend for premium luminance)
      let r = 1.0;
      let g = 0.1;
      let b = 1.0;

      // Brighten selected project (Part B: visual isolation)
      if (selectedProjectId && visibleProjects[i].id === selectedProjectId) {
        r = Math.min(1.0, r * 1.3);
        g = Math.min(1.0, g * 1.3);
        b = Math.min(1.0, b * 1.3);
      }

      col[i * 4] = r;
      col[i * 4 + 1] = g;
      col[i * 4 + 2] = b;

      // STEP 4: Projects are structural anchors — always keep them at full opacity
      // Phase 5.0c: Removed focus dimming for projects; they should never disappear
      // when nodes are selected (unlike content nodes which can be dimmed)
      col[i * 4 + 3] = 1.0;
    }
    return col;
  }, [visibleProjects, selectedProjectId]);

  // Create size array for visible projects (Phase 5.3: centralized hierarchy via nodeSizingConstants)
  const sizes = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const sz = new Float32Array(visibleProjects.length);
    for (let i = 0; i < visibleProjects.length; i++) {
      // Phase 5.3: Use centralized nodeSizingConstants to enforce hierarchy
      let baseSize = getNodeVisualSize('project', visibleProjects[i].gravity_score);

      // Part B: Increase selected project size by 1.15× for visual emphasis
      if (selectedProjectId && visibleProjects[i].id === selectedProjectId) {
        baseSize *= 1.15;
      }

      sz[i] = baseSize;
    }
    return sz;
  }, [visibleProjects, selectedProjectId]);

  // Phase 7.0: Log buffer values to diagnose rendering issue
  useEffect(() => {
    if (visibleProjects.length === 0) return;
    
    // Buffer diagnostics removed (production cleanup 8.0A)
  }, [visibleProjects, positions, colors, sizes]);

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
        depthWrite={false}
      />
    </points>
  );
}

/**
 * ProjectTorus: Cyan ring around each project (Phase A: premium anchor visual)
 * Reusable torus geometry scaled per-project gravity
 */
function ProjectTorusRings({
  graph,
  semanticVisibility,
}: {
  graph: RenderableGraph;
  semanticVisibility?: SemanticVisibility | null;
}): JSX.Element {
  // Filter visible projects
  const visibleProjects = useMemo(() => {
    if (!semanticVisibility) return graph.projects;
    return graph.projects.filter(proj => semanticVisibility.visibleProjectIds.has(proj.id));
  }, [graph.projects, semanticVisibility]);

  // Reuse single torus geometry for all instances
  const torusGeometry = useMemo(
    () => new THREE.TorusGeometry(1.0, 0.2, 16, 100),
    []
  );

  return (
    <>
      {visibleProjects.map((proj) => {
        // Phase 10.1: Apply render-layer spatial expansion to torus rings
        const [expandedX, expandedY, expandedZ] = applyRenderLayerSpacing(proj.position, 1.2, 1.6);
        const pos: [number, number, number] = [expandedX, expandedY, expandedZ];

        // Phase A: Scale ring by gravity: 1.8 + gravity*2.0 (enhanced anchor aura)
        const ringScale = 1.8 + (proj.gravity_score ?? 0) * 2.0;

        return (
          <mesh
            key={`torus-${proj.id}`}
            position={[pos[0], pos[1], pos[2]]}
            scale={ringScale}
          >
            <primitive object={torusGeometry} attach="geometry" />
            <meshBasicMaterial
              color={new THREE.Color(0.0, 1.0, 0.95)} // Bright cyan
              transparent
              opacity={0.9}
              wireframe={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * ProjectGlowSprite: Billboard glow around projects (Phase A: luminous anchor)
 * Canvas-based gradient sprite, always faces camera
 */
function ProjectGlowSprites({
  graph,
  semanticVisibility,
}: {
  graph: RenderableGraph;
  semanticVisibility?: SemanticVisibility | null;
}) {
  // Filter visible projects
  const visibleProjects = useMemo(() => {
    if (!semanticVisibility) return graph.projects;
    return graph.projects.filter(proj => semanticVisibility.visibleProjectIds.has(proj.id));
  }, [graph.projects, semanticVisibility]);

  // Create gradient texture once
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Phase 5.4.3: Draw radial gradient (enhanced luminous center fade to transparent)
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 0, 220, 1.0)'); // Luminous magenta-cyan blend, max opacity
    gradient.addColorStop(1, 'rgba(255, 0, 220, 0)'); // Transparent

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
        // Phase 10.1: Apply render-layer spatial expansion to glow sprites
        const [expandedX, expandedY, expandedZ] = applyRenderLayerSpacing(proj.position, 1.2, 1.6);
        const pos: [number, number, number] = [expandedX, expandedY, expandedZ];

        // Phase 5.3: Scale sprite proportional to project visual size via nodeSizingConstants
        const projectVisualSize = getNodeVisualSize('project', proj.gravity_score ?? 0);
        const spriteScale = projectVisualSize * 4.0; // Halo scale increased for premium anchor luminance

        return (
          <sprite
            key={`glow-${proj.id}`}
            position={[pos[0], pos[1], pos[2] - 0.1]} // Slightly behind
            scale={spriteScale}
            renderOrder={-1}
          >
            <spriteMaterial
              map={texture}
              transparent
              sizeAttenuation={true}
              depthWrite={false}
            />
          </sprite>
        );
      })}
    </>
  );
}

/**
 * StarField: Background depth with sparse stars (Phase 7.1)
 * Creates subtle atmospheric depth without visual clutter
 * 150 deterministic points at far Z (-100 to -80), blue-biased colors, 0.35 opacity
 */
function StarField() {
  // Generate deterministic star positions (same every load for consistency)
  const stars = useMemo(() => {
    const starList: { x: number; y: number; z: number; size: number }[] = [];
    const seed = 42; // Fixed seed for determinism

    // PRNG: deterministic linear congruential generator
    let rng = seed;
    const next = () => {
      rng = (rng * 1103515245 + 12345) % (2 ** 31);
      return Math.abs(rng) / (2 ** 31);
    };

    // Generate 150 stars with dimensional depth distribution
    for (let i = 0; i < 150; i++) {
      const r1 = next();
      const r2 = next();
      const r3 = next();
      const r4 = next();

      // Part 5: Volumetric starfield - 3D scatter with depth layers
      // Distribute stars throughout a volumetric cube around the graph
      // Z range: -200 to +150 (deep background to far foreground, enveloping the scene)
      starList.push({
        x: (r1 - 0.5) * 240,             // -120 to +120 (wider XY for volumetric feel)
        y: (r2 - 0.5) * 240,             // -120 to +120 (wider XY for volumetric feel)
        z: -200 + r3 * 350,              // -200 to +150 (true 3D volumetric distribution, depth layering)
        size: 0.12 + r4 * 0.28,          // 0.12 to 0.40 (maintain variation)
      });
    }
    return starList;
  }, []);

  // Create points geometry for stars
  const positions = useMemo(() => {
    const pos = new Float32Array(stars.length * 3);
    for (let i = 0; i < stars.length; i++) {
      pos[i * 3] = stars[i].x;
      pos[i * 3 + 1] = stars[i].y;
      pos[i * 3 + 2] = stars[i].z;
    }
    return pos;
  }, [stars]);

  // Create size array
  const sizes = useMemo(() => {
    const sz = new Float32Array(stars.length);
    for (let i = 0; i < stars.length; i++) {
      sz[i] = stars[i].size;
    }
    return sz;
  }, [stars]);

  // Create color array with blue-biased colors and depth-based opacity variation
  // Part 5: Updated depth calculation for volumetric starfield (-200 to +150 Z range)
  // Phase 6.0: CRITICAL: Clamp star luminance <0.8 to prevent bloom washout
  // Stars at max will be (0.49, 0.56, 0.7) = 0.58 max luminance, well below 0.8 bloom threshold
  const colors = useMemo(() => {
    const col = new Float32Array(stars.length * 3);
    for (let i = 0; i < stars.length; i++) {
      // Clamped blue: 0.5 to 0.7 (was 0.7 to 1.0) to stay below bloom threshold
      const b = 0.5 + Math.random() * 0.2;
      // Depth fade: stars closer to camera (near z=0) are brighter, distant stars are dimmer
      // Clamp depth calculation: graph occupies roughly -10 to +10 in Z, stars extend -200 to +150
      const depthFade = 1.0 - Math.abs(stars[i].z) / 200; // Normalize to volumetric range
      const clampedFade = Math.max(0.2, Math.min(1.0, depthFade)); // Clamp to maintain visibility
      // Phase 6.0: Reduced multipliers to ensure max luminance < 0.8
      // Max luminance: (0.35, 0.392, 0.56) = 0.56 (well below 0.8 threshold)
      col[i * 3] = (b * 0.5) * clampedFade;     // R: blue × 0.5, modulated by depth
      col[i * 3 + 1] = (b * 0.56) * clampedFade; // G: blue × 0.56, modulated by depth
      col[i * 3 + 2] = b * clampedFade;         // B: full blue, modulated by depth
    }
    return col;
  }, [stars]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={stars.length} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={stars.length} itemSize={3} />
        <bufferAttribute attach="attributes-size" array={sizes} count={stars.length} itemSize={1} />
      </bufferGeometry>
      {/* Phase 6.0: Reduced opacity from 0.35 to 0.25 to ensure luminance stays well below 0.8 bloom threshold */}
      <pointsMaterial size={4} sizeAttenuation={true} vertexColors transparent opacity={0.25} />
    </points>
  );
}

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

  // Create position array for visible edges (Phase 10.1: spatial expansion)
  const positions = useMemo(() => {
    if (visibleEdges.length === 0) return new Float32Array();

    if (typeof window !== 'undefined' && (window as any).__DEV__) {
      console.log('[EdgesLineSegments] Creating position array:', { visibleEdgeCount: visibleEdges.length, arraySize: visibleEdges.length * 6 });
    }
    const pos = new Float32Array(visibleEdges.length * 6);
    for (let i = 0; i < visibleEdges.length; i++) {
      const edge = visibleEdges[i];
      // Phase 10.1: Apply render-layer spatial expansion to edges (source and target)
      const [srcX, srcY, srcZ] = applyRenderLayerSpacing(edge.source, 1.2, 1.6);
      const [tgtX, tgtY, tgtZ] = applyRenderLayerSpacing(edge.target, 1.2, 1.6);
      pos[i * 6] = srcX;
      pos[i * 6 + 1] = srcY;
      pos[i * 6 + 2] = srcZ;
      pos[i * 6 + 3] = tgtX;
      pos[i * 6 + 4] = tgtY;
      pos[i * 6 + 5] = tgtZ;
    }
    return pos;
  }, [visibleEdges]);

  // STEP 3 & 4: Create base color array for visible edges with role-based colors and semantic dimming
  const colors = useMemo(() => {
    if (visibleEdges.length === 0) return new Float32Array();

    const col = new Float32Array(visibleEdges.length * 8); // 2 vertices × 4 components (RGBA)
    const selectedId = highlightState?.selectedId;

    for (let i = 0; i < visibleEdges.length; i++) {
      const edge = visibleEdges[i];
      const isConnected = highlightState?.connectedEdgeIds?.has(edge.id) ?? false;

      // Part 4: Edge visibility strategy - only show edges when node selected
      // When NO selection: all edges invisible (opacity 0)
      // When selection active:
      //   - Connected edges: bright cyan (0.85 opacity) to show path connectivity
      //   - Unrelated edges: completely invisible (0 opacity)

      // If no node is selected, hide all edges completely
      let opacity = selectedId ? (isConnected ? 0.85 : 0.0) : 0.0;

      // Set color based on connection status (only used when opacity > 0)
      let [r, g, b] = isConnected
        ? [0.0, 1.0, 0.9] // Connected: bright cyan-blue when visible
        : [0.1, 0.3, 0.5]; // Unrelated: not visible (opacity 0)

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

  // Animate connected edge pulse (Phase 6.1: visible shimmer on active paths)
  useEffect(() => {
    let frameId: number | null = null;

    const animate = () => {
      if (!lineRef.current || !baseColorsRef.current || !highlightState?.connectedEdgeIds.size) {
        pulseTimeRef.current = 0;
        return;
      }

      pulseTimeRef.current = (pulseTimeRef.current + 0.02) % (Math.PI * 2);
      const colorAttr = lineRef.current.geometry.attributes.color as THREE.BufferAttribute;
      const newColors = new Float32Array(baseColorsRef.current);

      // Safety check: ensure array sizes match (prevents Three.js buffer resize error)
      if (newColors.length !== colorAttr.array.length) {
        if (typeof window !== 'undefined' && (window as any).__DEV__) {
          console.warn('[EdgesLineSegments] Buffer size mismatch detected:', {
            expectedSize: colorAttr.array.length,
            actualSize: newColors.length,
            visibleEdgesCount: visibleEdges.length,
          });
        }
        return; // Skip this frame to prevent crash
      }

      // Pulse only connected edges (using visible edge indices)
      for (let i = 0; i < visibleEdges.length; i++) {
        const edge = visibleEdges[i];
        if (highlightState.connectedEdgeIds.has(edge.id)) {
          // Subtle pulse: 0.75 to 1.0 opacity modulation (alive but restrained)
          const pulse = 0.85 + Math.sin(pulseTimeRef.current) * 0.15;
          newColors[i * 8 + 3] = Math.max(0.75, newColors[i * 8 + 3] * pulse);
          newColors[i * 8 + 7] = Math.max(0.75, newColors[i * 8 + 7] * pulse);
        }
      }

      colorAttr.array = newColors;
      colorAttr.needsUpdate = true;

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [visibleEdges, highlightState]);

  if (visibleEdges.length === 0) return null;

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry key={`edges-membership-${getMembershipSignature(visibleEdges)}`}>
        <bufferAttribute attach="attributes-position" array={positions} count={visibleEdges.length * 2} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={visibleEdges.length * 2} itemSize={4} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent depthWrite={false} />
    </lineSegments>
  );
}

/**
 * ProjectLabels: Render text labels for ALL projects (Phase 7.1: always-visible anchors)
 * Makes project names unmissable without requiring selection
 * Critical for investor demo: immediate visual hierarchy
 */
function ProjectLabels({ graph, selectedProjectId: _selectedProjectId }: { graph: RenderableGraph; selectedProjectId?: string | null }) {
  return (
    <>
      {graph.projects.map((project) => {
        // Phase 10.1: Apply render-layer spatial expansion to project labels
        const [expandedX, expandedY, expandedZ] = applyRenderLayerSpacing(project.position, 1.2, 1.6);
        return (
          <Text
            key={`label-${project.id}`}
            position={[expandedX, expandedY + 2.5, expandedZ + 3.5]}
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
        );
      })}
    </>
  );
}

// NodeLabels function removed - label rendering now handled by Constellation3DScene.tsx NodeLabels component
// (semantic multi-tier system with zoom-aware opacity, single source of truth)

/**
 * PickableNodes: Invisible mesh layer for visible node click detection (Phase 5.5: semantic filtering)
 * Phase 5.2: Increased hit areas by 2.5x for reliable interaction
 * Phase 5.3: Centralized sizing via getNodePickingSize() to enforce hierarchy (person > project > all others)
 * Provides cursor feedback on hover
 * Phase 5.9: Analytics wiring for node selection
 * Phase 6.2A: Position aligned with layout engine (D3 or API) to fix picking misalignment
 */
function PickableNodes({
  graph,
  onNodeClick,
  semanticVisibility,
}: {
  graph: RenderableGraph;
  onNodeClick?: (node: GraphNode) => void;
  semanticVisibility?: SemanticVisibility | null;
}) {
  // Filter nodes by semantic visibility
  const visibleNodes = useMemo(() => {
    if (!semanticVisibility) return graph.nodes;
    return graph.nodes.filter(node => semanticVisibility.visibleNodeIds.has(node.id));
  }, [graph.nodes, semanticVisibility]);

  // Phase 10.1b: Apply spatial expansion to picking layer to align with visual NodesPoints
  // CRITICAL: This must match the transformation applied to visual node positions
  const getPickerPosition = (node: GraphNode) => {
    return applyRenderLayerSpacing([node.x, node.y, node.z], 1.2, 1.6);
  };

  return (
    <>
      {visibleNodes.map((node) => {
        // Phase 5.3: Use centralized sizing to enforce hierarchy
        const pickingSize = getNodePickingSize(node.type, node.gravity_score);
        return (
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
            {/* Phase 5.3: Centralized picking sizes via getNodePickingSize() */}
            <sphereGeometry args={[pickingSize, 8, 8]} />
            <meshBasicMaterial colorWrite={false} depthTest={false} />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * PickableProjects: Invisible mesh layer for visible project click detection (Phase 5.5: semantic filtering)
 * Phase 5.2: Increased hit areas by 2.5x for reliable interaction
 * Phase 5.3: Centralized sizing via getNodePickingSize() to enforce hierarchy (person > project > all others)
 * Provides cursor feedback on hover
 * Phase 5.9: Analytics wiring for project selection
 * Phase 6.2A: Position aligned with layout engine (D3 or API) to fix picking misalignment
 */
function PickableProjects({
  graph,
  onProjectClick,
  semanticVisibility,
}: {
  graph: RenderableGraph;
  onProjectClick?: (project: GraphProject) => void;
  semanticVisibility?: SemanticVisibility | null;
}) {
  // Filter projects by semantic visibility
  const visibleProjects = useMemo(() => {
    if (!semanticVisibility) {
      return graph.projects;
    }
    const filtered = graph.projects.filter(proj => semanticVisibility.visibleProjectIds.has(proj.id));
    return filtered;
  }, [graph.projects, semanticVisibility]);

  // Phase 10.1b: Apply spatial expansion to picking layer to align with visual ProjectsPoints
  // CRITICAL: This must match the transformation applied to visual project positions
  const getPickerPosition = (proj: GraphProject) => {
    return applyRenderLayerSpacing([proj.x_derived, proj.y_derived, proj.z_derived], 1.2, 1.6);
  };

  return (
    <>
      {visibleProjects.map((proj) => {
        // Phase 5.3: Use centralized sizing to enforce hierarchy
        const pickingSize = getNodePickingSize('project', proj.gravity_score);
        return (
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
            {/* Phase 5.3: Centralized picking sizes via getNodePickingSize() */}
            <sphereGeometry args={[pickingSize, 8, 8]} />
            <meshBasicMaterial colorWrite={false} depthTest={false} />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * PickablePerson: Invisible mesh layer for person node click detection (Phase 10.0b: Origin Constellation)
 * Makes the central person node clickable and selectable
 * Provides cursor feedback on hover
 * Routes through existing selection system
 */
function PickablePerson({
  onPersonClick,
}: {
  onPersonClick?: () => void;
}) {
  return (
    <mesh
      position={[0, 0, 0]}
      onPointerEnter={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerLeave={() => {
        document.body.style.cursor = 'auto';
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onPersonClick?.();
      }}
    >
      {/* Hit sphere: 3.0 + buffer for comfort */}
      <sphereGeometry args={[3.5, 8, 8]} />
      <meshBasicMaterial colorWrite={false} depthTest={false} />
    </mesh>
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
  onPersonClick,
  highlightState,
  semanticVisibility,
  selectedNodeId,
  selectedProjectId,
  selectedItem,
  onClearSelection,
  citedState,
  cameraRef,
  controlsRef,
  onCameraReady,
  onControlsReady,
  hoveredEvidenceNodeId,
  onEvidenceHover,
  onEvidenceLeave,
  onEvidenceSelect,
}: {
  graph: RenderableGraph;
  cameraParams: CameraParams;
  onUnresolvedEdgesChange?: (count: number) => void;
  onNodeClick?: (node: GraphNode) => void;
  onProjectClick?: (project: GraphProject) => void;
  onPersonClick?: () => void;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  selectedNodeId?: string | null;
  selectedProjectId?: string | null;
  selectedItem?: SelectedItem | null;
  onClearSelection?: () => void;
  citedState?: CitedState;
  cameraRef?: React.MutableRefObject<THREE.OrthographicCamera | null>;
  controlsRef?: React.MutableRefObject<any | null>;
  onCameraReady?: (camera: any) => void;
  onControlsReady?: (controls: any) => void;
  hoveredEvidenceNodeId?: string | null;
  onEvidenceHover?: (nodeId: string) => void;
  onEvidenceLeave?: () => void;
  onEvidenceSelect?: (nodeId: string) => void;
}) {
  // Disable raycasting on background planes to allow clicks to pass through to nodes/projects
  const bgPlane1Ref = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (bgPlane1Ref.current) {
      bgPlane1Ref.current.raycast = () => {};
    }
  }, []);

  useEffect(() => {
    onUnresolvedEdgesChange?.(graph.unresolved_edges.length);

    if (typeof window !== 'undefined' && (window as any).__DEV__) {
      // Development diagnostics available if needed
    }
  }, [graph, onUnresolvedEdgesChange]);

  // Phase 5.1: Derive projectTitle and connectedCount for billboarded panel
  // Phase 5.2: Derive relatedNodes for Evidence Mode
  // Compute these values once per selection change; pass as simple props to BillboardedPanel
  const { projectTitle, connectedCount, relatedNodes } = useMemo(() => {
    if (!selectedItem) return { projectTitle: undefined, connectedCount: undefined, relatedNodes: undefined };

    const item = selectedItem.data as any;

    // Compute projectTitle: find project containing this node (if node)
    let title: string | undefined;
    if (selectedItem.type === 'node') {
      const project = graph.projects.find(p => p.id === item.project_id);
      title = project?.title;
    }

    // Compute connectedCount: count edges connected to this item
    let count = 0;
    if (selectedItem.type === 'node') {
      // Fix: edges use source_id/target_id, not source/target
      count = (graph.edges ?? []).filter(
        e => e.source_id === item.id || e.target_id === item.id
      ).length;
    } else if (selectedItem.type === 'project') {
      // For projects, count nodes in the project
      count = (graph.nodes ?? []).filter(n => n.project_id === item.id).length;
    }

    // Compute relatedNodes: Phase 5.2: Find nodes connected to selected item
    let related: any[] = [];
    if (selectedItem.type === 'node') {
      // Fix: edges use source_id/target_id, not source/target
      const connectedEdges = (graph.edges ?? []).filter(
        e => e.source_id === item.id || e.target_id === item.id
      );
      const connectedNodeIds = new Set<string>();
      connectedEdges.forEach(edge => {
        if (edge.source_id === item.id) connectedNodeIds.add(edge.target_id);
        if (edge.target_id === item.id) connectedNodeIds.add(edge.source_id);
      });
      related = Array.from(connectedNodeIds)
        .map(nodeId => {
          const node = graph.nodes.find(n => n.id === nodeId);
          const edge = connectedEdges.find(e =>
            (e.source_id === item.id && e.target_id === nodeId) ||
            (e.target_id === item.id && e.source_id === nodeId)
          );
          return node ? {
            id: node.id,
            title: node.title,
            type: node.type,
            gravity_score: node.gravity_score,
            relationshipType: edge?.relationship_type,
          } : null;
        })
        .filter(Boolean);
    } else if (selectedItem.type === 'project') {
      // For projects, related nodes are the nodes in that project
      related = (graph.nodes ?? [])
        .filter(n => n.project_id === item.id)
        .map(node => ({
          id: node.id,
          title: node.title,
          type: node.type,
          gravity_score: node.gravity_score,
        }));
    }

    return { projectTitle: title, connectedCount: count, relatedNodes: related };
  }, [selectedItem, graph.nodes, graph.projects, graph.edges]);

  // FIX (DEMO LOCK BUG #5): Animate camera to frame selected project as hero shot
  useEffect(() => {
    if (!selectedProjectId || !cameraRef?.current) return;

    const selectedProject = graph.projects.find(p => p.id === selectedProjectId);
    if (!selectedProject) return;

    const camera = cameraRef.current;
    const animationDuration = 600; // milliseconds
    const startTime = Date.now();

    // Phase 10.1: Apply spatial expansion to project position so camera targets the correct rendered geometry
    const [expandedX, expandedY, expandedZ] = applyRenderLayerSpacing(selectedProject.position, 1.2, 1.6);

    // Target: Frame the project with ~1.3× zoom from default view (reduced from 1.8× to maintain visibility in dense clusters)
    // Position camera well above and far behind the project (increased offsets to keep selected project visible)
    const targetX = expandedX;
    const targetY = expandedY + 20; // Above project (increased from +13 for hero distance)
    const targetZ = expandedZ + 60; // Behind project (Phase 10.0b: doubled from 30 to prevent near-plane clipping of glow/torus geometry)

    // Store initial camera state
    const initialX = camera.position.x;
    const initialY = camera.position.y;
    const initialZ = camera.position.z;
    const initialZoom = camera.zoom;
    // Phase 10.1: Increased zoom to 1.5× to make hero focus feel more cinematic and intentional
    const targetZoom = initialZoom * 1.5;

    // Animation loop
    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Easing function: ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      // Interpolate position and zoom
      camera.position.x = initialX + (targetX - initialX) * easeProgress;
      camera.position.y = initialY + (targetY - initialY) * easeProgress;
      camera.position.z = initialZ + (targetZ - initialZ) * easeProgress;
      camera.zoom = initialZoom + (targetZoom - initialZoom) * easeProgress;
      camera.updateProjectionMatrix();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };

    animateCamera();
  }, [selectedProjectId, graph.projects, cameraRef]);

  return (
    <>
      {/* Camera */}
      <GraphCamera
        params={cameraParams}
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        onCameraReady={onCameraReady}
        onControlsReady={onControlsReady}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={0.5} />

      {/* Atmospheric depth (Phase 7.1: fog DISABLED temporarily for visibility debug) */}
      {/* <fog attach="fog" args={['#000000', 20, 150]} /> */}
      <StarField />

      {/* Phase 10.0b: Universe Backdrop (demo polish — distant ghost constellations) */}
      <UniverseBackdrop enabled={import.meta.env.VITE_ENABLE_UNIVERSE_BACKDROP !== 'false'} />

      {/* Origin constellation (Phase 10.0b: Central person node) */}
      <PersonNode />

      {/* Geometry */}
      <EdgesLineSegments graph={graph} highlightState={highlightState} semanticVisibility={semanticVisibility} citedState={citedState} />
      {selectedItem && hoveredEvidenceNodeId && <EvidenceHoverLine selectedItem={selectedItem} hoveredEvidenceNodeId={hoveredEvidenceNodeId} nodes={graph.nodes} />}
      <NodesGeometries graph={graph} onNodeClick={onNodeClick} highlightState={highlightState} semanticVisibility={semanticVisibility} selectedNodeId={selectedNodeId} citedState={citedState} hoveredEvidenceNodeId={hoveredEvidenceNodeId} />
      <ProjectsPoints graph={graph} semanticVisibility={semanticVisibility} selectedProjectId={selectedProjectId} />

      {/* Phase A: Hybrid anchor rendering (torus rings + glow sprites) */}
      <ProjectTorusRings graph={graph} semanticVisibility={semanticVisibility} />
      <ProjectGlowSprites graph={graph} semanticVisibility={semanticVisibility} />

      {/* Labels */}
      <ProjectLabels graph={graph} selectedProjectId={selectedProjectId} />
      {/* NodeLabels moved to Constellation3DScene.tsx (semantic multi-tier system) - single source of truth */}

      {/* Phase 3: Billboarded panel (quaternion-synced, always faces camera) */}
      {selectedItem && <BillboardedPanel selectedItem={selectedItem} onClose={onClearSelection ?? (() => {})} projectTitle={projectTitle} connectedCount={connectedCount} relatedNodes={relatedNodes} onEvidenceHover={onEvidenceHover} onEvidenceLeave={onEvidenceLeave} onEvidenceSelect={onEvidenceSelect} />}

      {/* Interactive picking layer */}
      <PickablePerson onPersonClick={onPersonClick} />
      <PickableNodes graph={graph} onNodeClick={onNodeClick} semanticVisibility={semanticVisibility} />
      <PickableProjects graph={graph} onProjectClick={onProjectClick} semanticVisibility={semanticVisibility} />

      {/* Canvas background for click detection */}
      <mesh ref={bgPlane1Ref} position={[0, 0, -10]} scale={[10000, 10000, 1]} onPointerUp={(e) => e.stopPropagation()}>
        <planeGeometry />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
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
  onPersonClick,
  onCanvasClick,
  highlightState,
  semanticVisibility,
  selectedNodeId,
  selectedProjectId,
  selectedItem,
  onClearSelection,
  citedState,
  cameraRef,              // Phase 8.0D: Parent-owned camera ref
  controlsRef,            // Phase 8.0D: Parent-owned controls ref
  onCameraReady,          // Phase 8.0D: Callback when camera is ready
  onControlsReady,        // Phase 8.0D: Callback when controls are ready
  onCancelAnimation,
  isAnimatingRef,
  hoveredEvidenceNodeId,  // Phase 5.4: Evidence card hover state
  onEvidenceHover,        // Phase 5.4: Evidence card hover callback
  onEvidenceLeave,        // Phase 5.4: Evidence card leave callback
  onEvidenceSelect,       // Phase 5.4: Evidence card selection callback
  setProjectCluster,      // Phase 6.4: Project cluster filter handler
  toggleNodeType,         // Phase 6.4: Node type toggle handler
  // Phase 6.4: clearAllFilters reserved for future use, intentionally unused
}: CanvasSceneProps) {
  // Disable raycasting on background plane to allow clicks to pass through to nodes/projects
  const bgPlane2Ref = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (bgPlane2Ref.current) {
      bgPlane2Ref.current.raycast = () => {};
    }
  }, []);

  // Phase 6.4: Semantic Overview Mode feature flag and view state
  const SEMANTIC_OVERVIEW_ENABLED = import.meta.env.VITE_ENABLE_SEMANTIC_OVERVIEW === 'true';
  const [viewMode, setViewMode] = useState<'detailed' | 'overview'>('detailed');

  // Compute bounds and camera parameters once from graph
  const { cameraParams } = useMemo(() => {
    const b = computeGraphBounds(graph);
    const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1.6;
    const cp = computeCameraParams(b, aspect, 0.1);
    return { bounds: b, cameraParams: cp };
  }, [graph]);

  // Phase D: Gesture interrupt - bind manual input handlers to canvas for demo control
  // Detects user pans (pointerdown) and zooms (wheel) to interrupt active animations
  useEffect(() => {
    if (!onCancelAnimation || !isAnimatingRef) return;

    // Get the canvas element from the R3F canvas
    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;

    // Handler for pointer down (pan/click detection)
    const handlePointerDown = () => {
      if (isAnimatingRef.current === true) {
        onCancelAnimation();
      }
    };

    // Handler for wheel (zoom detection)
    const handleWheel = () => {
      if (isAnimatingRef.current === true) {
        onCancelAnimation();
      }
    };

    // Attach listeners
    canvasElement.addEventListener('pointerdown', handlePointerDown);
    canvasElement.addEventListener('wheel', handleWheel);

    // Cleanup on unmount
    return () => {
      canvasElement.removeEventListener('pointerdown', handlePointerDown);
      canvasElement.removeEventListener('wheel', handleWheel);
    };
  }, [onCancelAnimation, isAnimatingRef]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
        {viewMode === 'detailed' ? (
          <SceneContent
            graph={graph}
            cameraParams={cameraParams}
            onUnresolvedEdgesChange={onUnresolvedEdgesChange}
            onNodeClick={onNodeClick}
            onProjectClick={onProjectClick}
            onPersonClick={onPersonClick}
            highlightState={highlightState}
            semanticVisibility={semanticVisibility}
            selectedNodeId={selectedNodeId}
            selectedProjectId={selectedProjectId}
            citedState={citedState}
            cameraRef={cameraRef}
            controlsRef={controlsRef}
            onCameraReady={onCameraReady}
            onControlsReady={onControlsReady}
            selectedItem={selectedItem}
            onClearSelection={onClearSelection}
            hoveredEvidenceNodeId={hoveredEvidenceNodeId}
            onEvidenceHover={onEvidenceHover}
            onEvidenceLeave={onEvidenceLeave}
            onEvidenceSelect={onEvidenceSelect}
          />
        ) : (
          <OverviewScene
            graph={graph}
            visibleNodeIds={semanticVisibility?.visibleNodeIds}
            semanticVisibility={semanticVisibility}
            onProjectClick={(projectId) => {
              const project = graph.projects.find((p) => p.id === projectId);
              if (project && onProjectClick) {
                onProjectClick(project);
              }
              if (setProjectCluster) {
                setProjectCluster(projectId);
              }
              setViewMode('detailed');
            }}
            onTypeClick={(type) => {
              if (toggleNodeType) {
                toggleNodeType(type);
              }
              setViewMode('detailed');
            }}
          />
        )}

        {/* Background mesh for canvas deselect clicks */}
        {onCanvasClick && (
          <mesh
            ref={bgPlane2Ref}
            position={[0, 0, -100]}
            scale={[10000, 10000, 1]}
            onPointerUp={(e) => {
              // Only deselect if click is directly on the background plane
              // Clicks on other objects (nodes, billboards) are stopped via stopPropagation()
              if (e.object === bgPlane2Ref.current) {
                e.stopPropagation();
                onCanvasClick();
              }
            }}
          >
            <planeGeometry />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}

        {/* Phase 6.0: Post-processing effects (Bloom + SMAA) */}
        <PostProcessingEffects />
      </Canvas>

      {/* Phase 6.4: View mode toggle button (gated by feature flag) */}
      {SEMANTIC_OVERVIEW_ENABLED && (
        <ViewModeToggle currentMode={viewMode} onToggle={setViewMode} />
      )}
    </div>
  );
}
