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
import { PersonNode } from './PersonNode';
import { PrimaryProjectSatellites } from './PrimaryProjectSatellites';
import { NodeGeometry } from './NodeGeometry';
import { PulsarNodeGeometry } from './PulsarNodeGeometry';
import { BillboardedPanel } from './BillboardedPanel';
import {
  HighlightState,
  CitedState,
  HighlightRole,
} from '../../lib/graph/highlighting';
import { GraphNode, GraphProject } from "../../lib/graph/graphTypes";
import { SelectedItem } from '../../hooks/useSelection';
import type { SemanticVisibility } from '../../lib/graph/graphSemantics';
import { logNodeSelected, logProjectSelected } from '../../lib/analytics/constellationAnalytics';

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
  onOpenMorePanel?: () => void; // Phase 3 (Current Session): Open side panel from billboard
  citedState?: CitedState; // Phase 5.6: Answer evidence highlighting
  cameraRef?: React.MutableRefObject<THREE.OrthographicCamera | null>; // Phase 5.6: Camera animation
  controlsRef?: React.MutableRefObject<any | null>; // Phase 8.0D: OrbitControls reference (drei component)
  onCameraReady?: (camera: any) => void;        // Phase 8.0D: Callback when OrthographicCamera is ready
  onControlsReady?: (controls: any) => void; // Phase 8.0D: Callback when OrbitControls is ready
  onCancelAnimation?: () => void; // Phase D: Cancel active camera animation on user gesture
  isAnimatingRef?: React.MutableRefObject<boolean>; // Phase D: Track if animation is active
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
}: {
  graph: RenderableGraph;
  onNodeClick?: (node: GraphNode) => void;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  selectedNodeId?: string | null;
  citedState?: CitedState;
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
      // STEP 2: Strong project anchor color (pure magenta for maximum saturation)
      let r = 1.0;
      let g = 0.0;
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

  // Create size array for visible projects (Phase A: premium anchor sizing for visibility)
  const sizes = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const sz = new Float32Array(visibleProjects.length);
    for (let i = 0; i < visibleProjects.length; i++) {
      // Phase 7.2: Scaled to 6 + gravity*9 for strong visual hierarchy (projects dominate)
      let baseSize = 6 + visibleProjects[i].gravity_score * 9;

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
              color={new THREE.Color(0.0, 1.0, 0.9)} // Cyan
              transparent
              opacity={0.5}
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

    // Draw radial gradient (pink center fade to transparent)
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 0, 200, 0.8)'); // Pink
    gradient.addColorStop(1, 'rgba(255, 0, 200, 0)'); // Transparent

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

        // Phase 7.1: Scale sprite by gravity: 3.5 + gravity*3.5 (enhanced luminous anchor halo)
        const spriteScale = 3.5 + (proj.gravity_score ?? 0) * 3.5;

        return (
          <sprite
            key={`glow-${proj.id}`}
            position={[pos[0], pos[1], pos[2] - 0.1]} // Slightly behind
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

      starList.push({
        x: (r1 - 0.5) * 200,             // -100 to +100 (equal distribution)
        y: (r2 - 0.5) * 200,             // -100 to +100 (equal distribution)
        z: -80 - r3 * 100,               // -180 to -80 (strongly background-biased for depth)
        size: 0.15 + r4 * 0.25,          // 0.15 to 0.40 (slight increase for variation)
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
  const colors = useMemo(() => {
    const col = new Float32Array(stars.length * 3);
    for (let i = 0; i < stars.length; i++) {
      const b = 0.7 + Math.random() * 0.3; // Base blue: 0.7 to 1.0
      const depthFade = 1.0 - Math.abs(stars[i].z) / 180; // Closer stars brighter, distant stars dimmer
      col[i * 3] = (b * 0.7) * depthFade;     // R: blue × 0.7, modulated by depth
      col[i * 3 + 1] = (b * 0.8) * depthFade; // G: blue × 0.8, modulated by depth
      col[i * 3 + 2] = b * depthFade;         // B: full blue, modulated by depth
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
      <pointsMaterial size={4} sizeAttenuation={true} vertexColors transparent opacity={0.35} />
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
    const focusDimmingEnabled = import.meta.env.VITE_FOCUS_DIMMING_ENABLED !== 'false';
    const selectedId = highlightState?.selectedId;

    for (let i = 0; i < visibleEdges.length; i++) {
      const edge = visibleEdges[i];
      const isConnected = highlightState?.connectedEdgeIds?.has(edge.id) ?? false;

      // Phase 5.4: Semantic color + opacity emphasis for edges (atmosphere refinement)
      // Connected edges (selected relationship): bright cyan to emphasize path connectivity
      // Unrelated edges: dim cyan-blue (atmospheric, not harsh gray)
      let [r, g, b] = isConnected
        ? [0.0, 1.0, 1.0] // Connected: bright cyan, clearly highlights active paths
        : [0.1, 0.3, 0.4]; // Unrelated: dim cyan-blue, atmospheric filament feel

      // Phase 4B: Focus dimming for edges
      // Connected edges: high visibility (0.95) to emphasize semantic connectivity
      // Unrelated edges: minimal visibility (0.16) normally, 0.08 when focus dimming active
      let opacity = isConnected ? 0.95 : 0.16;
      if (focusDimmingEnabled && selectedId && !isConnected) {
        opacity = 0.08; // Phase 4B: Dim unrelated edges when selection is active
      }

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

/**
 * NodeLabels: Render text labels for selected nodes only (Phase 5.3)
 * Reduces visual clutter while keeping important nodes readable
 * Phase 6.0: Support both API and D3 layout positions
 */
function NodeLabels({
  graph,
  selectedNodeId,
}: {
  graph: RenderableGraph;
  selectedNodeId?: string | null;
}) {
  // Only show label for selected node
  const selectedNode = selectedNodeId ? graph.nodes.find((n) => n.id === selectedNodeId) : null;

  if (!selectedNode) {
    return null;
  }

  // Phase 8.0A: D3 shelved, API-only positions
  const labelX = selectedNode.position[0];
  const labelY = selectedNode.position[1];
  const labelZ = selectedNode.position[2];

  // FIX (DEMO LOCK BUG #4): Offset label above and in front of node to avoid obscuring
  const labelOffsetX = 0; // Center horizontally on node
  const labelOffsetY = 1.5; // Position above node (was -1.0, now inverted and increased)
  const labelOffsetZ = 0.5; // Push slightly forward (away from camera)

  return (
    <Text
      key={`label-${selectedNode.id}`}
      position={[labelX + labelOffsetX, labelY + labelOffsetY, labelZ + labelOffsetZ]}
      fontSize={0.5}
      color={0xcccccc}
      maxWidth={2.0}
      textAlign="center"
      anchorX="center"
      anchorY="bottom"
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
  onOpenMorePanel,
  citedState,
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
  onPersonClick?: () => void;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
  selectedNodeId?: string | null;
  selectedProjectId?: string | null;
  selectedItem?: SelectedItem | null;
  onClearSelection?: () => void;
  onOpenMorePanel?: () => void;
  citedState?: CitedState;
  cameraRef?: React.MutableRefObject<THREE.OrthographicCamera | null>;
  controlsRef?: React.MutableRefObject<any | null>;
  onCameraReady?: (camera: any) => void;
  onControlsReady?: (controls: any) => void;
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

      {/* Origin constellation (Phase 10.0b: Central person node) */}
      <PersonNode />

      {/* Stage 1.5: Primary project satellites + origin filaments */}
      <PrimaryProjectSatellites graph={graph} />

      {/* Geometry */}
      <EdgesLineSegments graph={graph} highlightState={highlightState} semanticVisibility={semanticVisibility} citedState={citedState} />
      <NodesGeometries graph={graph} onNodeClick={onNodeClick} highlightState={highlightState} semanticVisibility={semanticVisibility} selectedNodeId={selectedNodeId} citedState={citedState} />
      <ProjectsPoints graph={graph} semanticVisibility={semanticVisibility} selectedProjectId={selectedProjectId} />

      {/* Phase A: Hybrid anchor rendering (torus rings + glow sprites) */}
      <ProjectTorusRings graph={graph} semanticVisibility={semanticVisibility} />
      <ProjectGlowSprites graph={graph} semanticVisibility={semanticVisibility} />

      {/* Labels */}
      <ProjectLabels graph={graph} selectedProjectId={selectedProjectId} />
      <NodeLabels graph={graph} selectedNodeId={selectedNodeId} />

      {/* Phase 3: Billboarded panel (quaternion-synced, always faces camera) */}
      {selectedItem && <BillboardedPanel selectedItem={selectedItem} onClose={onClearSelection ?? (() => {})} onOpenMorePanel={onOpenMorePanel} />}

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
  onOpenMorePanel,
  citedState,
  cameraRef,              // Phase 8.0D: Parent-owned camera ref
  controlsRef,            // Phase 8.0D: Parent-owned controls ref
  onCameraReady,          // Phase 8.0D: Callback when camera is ready
  onControlsReady,        // Phase 8.0D: Callback when controls are ready
  onCancelAnimation,
  isAnimatingRef,
}: CanvasSceneProps) {
  // Disable raycasting on background plane to allow clicks to pass through to nodes/projects
  const bgPlane2Ref = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (bgPlane2Ref.current) {
      bgPlane2Ref.current.raycast = () => {};
    }
  }, []);

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
        onOpenMorePanel={onOpenMorePanel}
      />

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
    </Canvas>
  );
}
