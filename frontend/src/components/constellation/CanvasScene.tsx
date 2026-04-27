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
import {
  HighlightState,
  CitedState,
  getNodeTypeColor,
} from '../../lib/graph/highlighting';
import { GraphNode, GraphProject } from "../../lib/graph/graphTypes";
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
 * NodesPoints: Render visible nodes as point cloud (Phase 5.5: semantic filtering)
 * Phase 5.3: Node type colors with gravity-scaled sizes
 * Phase 5.4: Highlight role modulation + North Star treatment
 * Phase 5.7: Cited state highlighting + FIX for empty visibility
 * Phase 6.0: Layout engine branching (API vs D3 positions)
 * Phase 8.0a: Membership-signature key for stable remounting
 * FIX (DEMO LOCK BUG #6): Node shape differentiation via size scaling by type
 *
 * FIX (Phase 5.7): Return null if visibleNodes is empty to prevent uniform binding error
 * FIX (Phase 8.0a): Use membership signature key instead of cardinality to handle repeated transitions
 * FIX (DEMO LOCK BUG #6): Vary size multipliers by node type to create visual shape distinction
 */
function NodesPoints({
  graph,
  highlightState,
  semanticVisibility,
}: {
  graph: RenderableGraph;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  // Filter nodes by semantic visibility
  const visibleNodes = useMemo(() => {
    if (!semanticVisibility) return graph.nodes;
    return graph.nodes.filter(node => semanticVisibility.visibleNodeIds.has(node.id));
  }, [graph.nodes, semanticVisibility]);

  // FIX: Return null if no visible nodes (prevents uniform binding error)
  if (visibleNodes.length === 0) {
    return null;
  }

  // FIX (DEMO LOCK BUG #6): Helper to get size multiplier by node type
  const getNodeTypeSizeMultiplier = (nodeType: string): number => {
    // Different size profiles create visual shape distinction:
    // decision: 1.2 (taller)
    // constraint: 0.9 (wider/compact)
    // skill: 1.1 (balanced)
    // outcome: 1.0 (neutral)
    // others: 1.0 (default)
    const multipliers: Record<string, number> = {
      decision: 1.2,
      constraint: 0.9,
      skill: 1.1,
      outcome: 1.0,
    };
    return multipliers[nodeType] || 1.0;
  };

  // Create position array for visible nodes (Phase 8.0: API positions only)
  const positions = useMemo(() => {
    if (typeof window !== 'undefined' && (window as any).__DEV__) {
      console.log('[NodesPoints] Creating position array:', { visibleNodeCount: visibleNodes.length, arraySize: visibleNodes.length * 3 });
    }
    const pos = new Float32Array(visibleNodes.length * 3);

    for (let i = 0; i < visibleNodes.length; i++) {
      const node = visibleNodes[i];
      pos[i * 3] = node.position[0];
      pos[i * 3 + 1] = node.position[1];
      pos[i * 3 + 2] = node.position[2];
    }
    return pos;
  }, [visibleNodes]);

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

  // Create size array (Phase A: node sizing with FIX DEMO LOCK BUG #6: type-based multiplier)
  const sizes = useMemo(() => {
    const sz = new Float32Array(visibleNodes.length);
    for (let i = 0; i < visibleNodes.length; i++) {
      const baseSize = 2 + visibleNodes[i].gravity_score * 5;
      const typeMultiplier = getNodeTypeSizeMultiplier(visibleNodes[i].type);
      sz[i] = baseSize * typeMultiplier;
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
 * ProjectsPoints: Render visible projects as larger point cloud (Phase 5.5: semantic filtering)
 * Phase 5.4: North Star focal treatment for highest-gravity project
 */
function ProjectsPoints({
  graph,
  highlightState,
  semanticVisibility,
}: {
  graph: RenderableGraph;
  highlightState?: HighlightState;
  semanticVisibility?: SemanticVisibility | null;
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

  // Create position array for visible projects (Phase 8.0A: D3 shelved, API-only)
  const positions = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const pos = new Float32Array(visibleProjects.length * 3);

    for (let i = 0; i < visibleProjects.length; i++) {
      const proj = visibleProjects[i];
      pos[i * 3] = proj.position[0];
      pos[i * 3 + 1] = proj.position[1];
      pos[i * 3 + 2] = proj.position[2];
    }
    return pos;
  }, [visibleProjects]);

  // STEP 4: Create color array with RGBA (adding opacity for semantic dimming)
  const colors = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const col = new Float32Array(visibleProjects.length * 4);
    const hasSemanticFilter = semanticVisibility && semanticVisibility.reason !== 'all';
    const selectedId = highlightState?.selectedId;

    for (let i = 0; i < visibleProjects.length; i++) {
      // STEP 2: Strong project anchor color (pure magenta for maximum saturation)
      col[i * 4] = 1.0;      // R
      col[i * 4 + 1] = 0.0;  // G
      col[i * 4 + 2] = 1.0;  // B (pure magenta = red + blue, no green, full saturation)

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

  // Create size array for visible projects (Phase A: premium anchor sizing for visibility)
  const sizes = useMemo(() => {
    if (visibleProjects.length === 0) return new Float32Array();

    const sz = new Float32Array(visibleProjects.length);
    for (let i = 0; i < visibleProjects.length; i++) {
      // Phase 7.2: Scaled to 6 + gravity*9 for strong visual hierarchy (projects dominate)
      sz[i] = 6 + visibleProjects[i].gravity_score * 9;
    }
    return sz;
  }, [visibleProjects]);

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
        const pos: [number, number, number] = [
          proj.position[0],
          proj.position[1],
          proj.position[2],
        ];

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
        const pos: [number, number, number] = [
          proj.position[0],
          proj.position[1],
          proj.position[2],
        ];

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

    // Generate 150 stars
    for (let i = 0; i < 150; i++) {
      starList.push({
        x: (next() - 0.5) * 200,         // -100 to +100
        y: (next() - 0.5) * 200,         // -100 to +100
        z: (next() - 0.5) * 200,         // -100 to +100 (full 3D cube, not just background)
        size: 0.15 + next() * 0.2,       // 0.15 to 0.35
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

  // Create color array with blue-biased colors
  const colors = useMemo(() => {
    const col = new Float32Array(stars.length * 3);
    for (let i = 0; i < stars.length; i++) {
      const b = 0.7 + Math.random() * 0.3; // Base blue: 0.7 to 1.0
      col[i * 3] = b * 0.7;     // R: blue × 0.7
      col[i * 3 + 1] = b * 0.8; // G: blue × 0.8
      col[i * 3 + 2] = b;       // B: full blue
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

  // Create position array for visible edges
  const positions = useMemo(() => {
    if (visibleEdges.length === 0) return new Float32Array();

    if (typeof window !== 'undefined' && (window as any).__DEV__) {
      console.log('[EdgesLineSegments] Creating position array:', { visibleEdgeCount: visibleEdges.length, arraySize: visibleEdges.length * 6 });
    }
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

    for (let i = 0; i < visibleEdges.length; i++) {
      const edge = visibleEdges[i];
      const isConnected = highlightState?.connectedEdgeIds?.has(edge.id) ?? false;

      // Phase 7.2: Semantic color + opacity emphasis for edges
      // Connected edges (selected relationship): bright cyan to emphasize path connectivity
      // Unrelated edges: dim gray (background structure only)
      let [r, g, b] = isConnected
        ? [0.0, 1.0, 1.0] // Connected: bright cyan, clearly highlights active paths
        : [0.2, 0.2, 0.2]; // Unrelated: dark gray, subtle background

      // Phase 7.2: Increased opacity for connected edges
      // Connected edges: high visibility (0.95) to emphasize semantic connectivity
      // Unrelated edges: minimal visibility (0.16) for structure only
      let opacity = isConnected ? 0.95 : 0.16;

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
      <lineBasicMaterial vertexColors transparent />
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

  // Compute position from API-only node data
  const getPickerPosition = (node: GraphNode) => {
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

  // Compute position from API-only project data
  const getPickerPosition = (proj: GraphProject) => {
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
  citedState?: CitedState;
  cameraRef?: React.MutableRefObject<THREE.OrthographicCamera | null>;
  controlsRef?: React.MutableRefObject<any | null>;
  onCameraReady?: (camera: any) => void;
  onControlsReady?: (controls: any) => void;
}) {
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

    // Target: Frame the project with ~2.5× zoom from default view
    // Position camera above and slightly behind the project
    const targetX = selectedProject.position[0];
    const targetY = selectedProject.position[1] + 8; // Above project
    const targetZ = selectedProject.position[2] + 12; // Behind project

    // Store initial camera state
    const initialX = camera.position.x;
    const initialY = camera.position.y;
    const initialZ = camera.position.z;
    const initialZoom = camera.zoom;
    const targetZoom = initialZoom * 2.5; // 2.5× zoom

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

      {/* Geometry */}
      <EdgesLineSegments graph={graph} highlightState={highlightState} semanticVisibility={semanticVisibility} citedState={citedState} />
      <NodesPoints graph={graph} highlightState={highlightState} semanticVisibility={semanticVisibility} />
      <ProjectsPoints graph={graph} highlightState={highlightState} semanticVisibility={semanticVisibility} />

      {/* Phase A: Hybrid anchor rendering (torus rings + glow sprites) */}
      <ProjectTorusRings graph={graph} semanticVisibility={semanticVisibility} />
      <ProjectGlowSprites graph={graph} semanticVisibility={semanticVisibility} />

      {/* Labels */}
      <ProjectLabels graph={graph} selectedProjectId={selectedProjectId} />
      <NodeLabels graph={graph} selectedNodeId={selectedNodeId} />

      {/* Interactive picking layer */}
      <PickablePerson onPersonClick={onPersonClick} />
      <PickableNodes graph={graph} onNodeClick={onNodeClick} semanticVisibility={semanticVisibility} />
      <PickableProjects graph={graph} onProjectClick={onProjectClick} semanticVisibility={semanticVisibility} />

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
  onPersonClick,
  onCanvasClick,
  highlightState,
  semanticVisibility,
  selectedNodeId,
  selectedProjectId,
  citedState,
  cameraRef,              // Phase 8.0D: Parent-owned camera ref
  controlsRef,            // Phase 8.0D: Parent-owned controls ref
  onCameraReady,          // Phase 8.0D: Callback when camera is ready
  onControlsReady,        // Phase 8.0D: Callback when controls are ready
  onCancelAnimation,
  isAnimatingRef,
}: CanvasSceneProps) {
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
