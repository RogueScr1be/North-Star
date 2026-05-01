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
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode } from '../../lib/graph/graphTypes';
import {
  HighlightRole,
  getNodeTypeColor,
  blendNodeColor,
} from '../../lib/graph/highlighting';

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
  isAnswerActive?: boolean
): [number, number, number] {
  const typeColor = getNodeTypeColor(node.type);
  const highlighted = blendNodeColor(typeColor, highlightRole);

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
 * Different types have different size profiles to reinforce visual distinction
 */
function getNodeScale(node: GraphNode): number {
  // Base size from gravity
  const baseSize = 1.5 + node.gravity_score * 2.0;

  // Type-specific scaling (matches point cloud logic)
  const typeScales: Record<string, number> = {
    decision: 1.2,
    constraint: 0.9,
    metric: 1.1,
    skill: 1.1,
    outcome: 1.0,
    failure: 1.1,
    experiment: 1.0,
  };

  return baseSize * (typeScales[node.type] || 1.0);
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
}: NodeGeometryProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => getGeometryForNodeType(node.type), [node.type]);
  const scale = useMemo(() => getNodeScale(node), [node.gravity_score, node.type]);
  const nodeColor = useMemo(
    () => getNodeColor(node, highlightRole, isCited, isAnswerActive),
    [node, highlightRole, isCited, isAnswerActive]
  );

  // Phase 10.1: Apply render-layer spatial expansion to ensure visual/picking alignment
  const expandedPosition = useMemo(
    () => applyRenderLayerSpacing([node.x, node.y, node.z], 1.2, 1.6),
    [node.x, node.y, node.z]
  );

  const handleClick = (e: any) => {
    e.stopPropagation();
    onNodeClick?.(node);
  };

  const isSelected = selectedNodeId === node.id;

  return (
    <group key={node.id}>
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

      {/* Optional label for selected node (matches Phase 5.3 behavior) */}
      {isSelected && (
        <Text
          position={[expandedPosition[0], expandedPosition[1] + 3, expandedPosition[2]]}
          fontSize={0.8}
          color={new THREE.Color(nodeColor[0], nodeColor[1], nodeColor[2])}
          maxWidth={5}
          textAlign="center"
          anchorX="center"
          anchorY="bottom"
        >
          {node.title}
        </Text>
      )}
    </group>
  );
}
