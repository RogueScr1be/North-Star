/**
 * NODEGEOMETRY.TSX
 * Stage 2: Node type geometry mapping
 *
 * Maps node types to distinct Three.js geometries:
 * - decision: octahedron (diamond shape, magenta)
 * - metric: torus (ring, amber)
 * - failure: tetrahedron (shard, red-orange)
 * - default (constraint, skill, outcome, experiment): small sphere (soft cyan/white)
 *
 * All geometries scaled by gravity_score and highlight state.
 * Phase 10.1: Positions apply render-layer spatial expansion (applyRenderLayerSpacing)
 * to align visual meshes with picking layer.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphNode } from '../../lib/graph/graphTypes';
import {
  HighlightRole,
  getNodeTypeColor,
  blendNodeColor,
} from '../../lib/graph/highlighting';
import { getNodeVisualSize } from '../../lib/rendering/nodeSizingConstants';

/**
 * Phase 5.4.2: Create color-based radial gradient texture for node glow
 * Takes RGB color and creates a 64×64 canvas texture with radial gradient
 * from center (color at 0.7 opacity) to transparent edge
 */
function createGlowTexture(
  r: number,
  g: number,
  b: number
): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Radial gradient: center opaque, edge transparent
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  const centerColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.95)`;
  const transparentColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0)`;

  gradient.addColorStop(0, centerColor);
  gradient.addColorStop(1, transparentColor);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/**
 * Phase 10.1: Render-Layer Spatial Expansion
 * Apply modest global scaling + strong Z-axis expansion to make graph spacious
 * and reduce Z-stacking occlusion.
 *
 * CRITICAL: This is the same transform used by PickableNodes.
 * Visual positions and picking targets must use identical spatial expansion
 * to ensure alignment.
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

interface NodeGeometryProps {
  node: GraphNode;
  highlightRole: HighlightRole;
  isAnswerActive?: boolean;
  selectedNodeId?: string | null;
  onNodeClick?: (node: GraphNode) => void;
  isCited?: boolean;
  hoveredForEvidence?: boolean;
}

/**
 * Helper: Get geometry for node type
 * Returns a pre-created Three.js geometry suitable for the node's semantic meaning
 */
function getGeometryForNodeType(type: string): THREE.BufferGeometry {
  switch (type) {
    case 'decision':
      // Diamond / octahedron: sharp, decisive
      return new THREE.OctahedronGeometry(1.0, 0);

    case 'metric':
      // Ring / torus: circular, measurement-oriented
      return new THREE.TorusGeometry(1.0, 0.4, 16, 32);

    case 'failure':
      // Shard / tetrahedron: sharp, warns of risk
      return new THREE.TetrahedronGeometry(1.0);

    default:
      // Sphere: neutral, all other types (constraint, skill, outcome, experiment)
      return new THREE.IcosahedronGeometry(1.0, 2);
  }
}

/**
 * Compute final color considering highlight role and cited state
 * (Mirrors logic from CanvasScene for consistency)
 */
function getNodeColor(
  node: GraphNode,
  highlightRole: HighlightRole,
  isCited?: boolean,
  isAnswerActive?: boolean,
  hoveredForEvidence?: boolean
): [number, number, number] {
  const typeColor = getNodeTypeColor(node.type);
  let highlighted = blendNodeColor(typeColor, highlightRole);

  // Evidence hover highlight: brighten strongly when hovering over evidence card
  if (hoveredForEvidence) {
    // Significantly brighter than normal (1.8× instead of 1.55×) to make evidence bridge obvious
    highlighted = [
      Math.min(highlighted[0] * 1.8, 1.0),
      Math.min(highlighted[1] * 1.8, 1.0),
      Math.min(highlighted[2] * 1.8, 1.0),
    ];
  }

  if (isAnswerActive && isCited) {
    // Cited in active answer: brighten
    return [
      Math.min(highlighted[0] * 1.35, 1.0),
      Math.min(highlighted[1] * 1.35, 1.0),
      Math.min(highlighted[2] * 1.35, 1.0),
    ];
  } else if (isAnswerActive && !isCited) {
    // Answer active but not cited: dim
    return [highlighted[0] * 0.75, highlighted[1] * 0.75, highlighted[2] * 0.75];
  }

  return highlighted;
}

/**
 * Compute size scale based on gravity and node type
 * Phase 5.3: Centralized sizing via getNodeVisualSize() to enforce hierarchy
 */
function getNodeScale(node: GraphNode): number {
  // Phase 5.3: Use centralized sizing to enforce hierarchy (person > project > all others)
  return getNodeVisualSize(node.type, node.gravity_score);
}

/**
 * NodeGeometry: Render a single node with geometry matching its type
 */
export function NodeGeometry({
  node,
  highlightRole,
  isAnswerActive,
  selectedNodeId,
  onNodeClick,
  isCited,
  hoveredForEvidence,
}: NodeGeometryProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const spriteRef = useRef<THREE.Sprite>(null);
  const geometry = useMemo(() => getGeometryForNodeType(node.type), [node.type]);
  const scale = useMemo(() => getNodeScale(node), [node.gravity_score, node.type]);
  const nodeColor = useMemo(
    () => getNodeColor(node, highlightRole, isCited, isAnswerActive, hoveredForEvidence),
    [node, highlightRole, isCited, isAnswerActive, hoveredForEvidence]
  );

  // Phase 10.1: Apply render-layer spatial expansion to ensure visual/picking alignment
  const expandedPosition = useMemo(
    () => applyRenderLayerSpacing([node.x, node.y, node.z], 1.2, 1.6),
    [node.x, node.y, node.z]
  );

  // Phase 5.4.2: Create glow texture matching node color
  const glowTexture = useMemo(
    () => createGlowTexture(nodeColor[0], nodeColor[1], nodeColor[2]),
    [nodeColor]
  );

  // Phase 5.4.2: Compute glow scale proportional to node size
  const glowScale = useMemo(
    () => {
      const baseScale = getNodeVisualSize(node.type, node.gravity_score) * 3.5;
      // Much stronger glow when evidence-hovered (2.2× instead of 1.4×) to make bridge obvious
      return hoveredForEvidence ? baseScale * 2.2 : baseScale;
    },
    [node.type, node.gravity_score, hoveredForEvidence]
  );

  const handleClick = (e: any) => {
    e.stopPropagation();
    onNodeClick?.(node);
  };

  const isSelected = selectedNodeId === node.id;

  // Phase 6.1: Animate node and glow scale with pulse when selected or evidence-hovered
  useFrame(({ clock }) => {
    const shouldPulse = isSelected || hoveredForEvidence;

    if (!shouldPulse) {
      // Not pulsing: use base scale
      if (meshRef.current) {
        meshRef.current.scale.set(scale, scale, scale);
      }
      if (spriteRef.current) {
        spriteRef.current.scale.set(glowScale, glowScale, 1);
      }
      return;
    }

    // Pulse: stronger modulation when evidence-hovered (25% vs 12%)
    const pulseStrength = hoveredForEvidence ? 0.25 : 0.12;
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 4.0) * pulseStrength;
    if (meshRef.current) {
      meshRef.current.scale.set(scale * pulse, scale * pulse, scale * pulse);
    }
    if (spriteRef.current) {
      spriteRef.current.scale.set(glowScale * pulse, glowScale * pulse, 1);
    }
  });

  return (
    <group key={node.id}>
      {/* Phase 5.4.2: Stellar glow halo (positioned behind main geometry) */}
      {glowTexture && (
        <sprite
          ref={spriteRef}
          position={[expandedPosition[0], expandedPosition[1], expandedPosition[2] - 0.1]}
          scale={glowScale}
          renderOrder={-1}
        >
          <spriteMaterial
            map={glowTexture}
            transparent
            sizeAttenuation={true}
            depthWrite={false}
          />
        </sprite>
      )}

      {/* Main geometry mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={expandedPosition}
        scale={scale}
        onClick={handleClick}
        onPointerEnter={() => {
          if (meshRef.current) meshRef.current.scale.multiplyScalar(1.1);
        }}
        onPointerLeave={() => {
          if (meshRef.current) meshRef.current.scale.divideScalar(1.1);
        }}
      >
        <meshBasicMaterial
          color={new THREE.Color(nodeColor[0], nodeColor[1], nodeColor[2])}
          wireframe={false}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Node labels now handled by Constellation3DScene.tsx NodeLabels component (single source of truth) */}
    </group>
  );
}
