/**
 * PULSARNODEGEOMETRY.TSX
 * Phase 2: Pulsar Node Design
 *
 * Renders nodes with additive glow rings + gentle breathing animation.
 * Replaces NodeGeometry when VITE_PULSAR_NODES_ENABLED=true.
 *
 * Visual design:
 * - Core sphere: Type-color IcosahedronGeometry, full opacity
 * - Ring 1: Inner torus, additive transparent, gentle rotation
 * - Ring 2: Outer torus, additive transparent, counter-rotation
 * - Animation: Shared Canvas frameloop, ref-based state
 * - Reduced motion: Skipped if user prefers reduced motion
 *
 * Props identical to NodeGeometry for drop-in replacement.
 * Preserves picking, selection states, citation highlighting.
 */

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { GraphNode } from '../../lib/graph/graphTypes';
import {
  HighlightRole,
  getNodeTypeColor,
  blendNodeColor,
} from '../../lib/graph/highlighting';
import { getNodeVisualSize } from '../../lib/rendering/nodeSizingConstants';

/**
 * Phase 10.1: Render-Layer Spatial Expansion (identical to NodeGeometry)
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

interface PulsarNodeGeometryProps {
  node: GraphNode;
  highlightRole: HighlightRole;
  isAnswerActive?: boolean;
  selectedNodeId?: string | null;
  onNodeClick?: (node: GraphNode) => void;
  isCited?: boolean;
}

/**
 * Compute node color with highlight role blending + citation/answer states
 * (Mirrors NodeGeometry.getNodeColor for consistency)
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
 * Compute node scale (Phase 5.3: Centralized sizing via getNodeVisualSize)
 */
function getNodeScale(node: GraphNode): number {
  // Phase 5.3: Use centralized sizing to enforce hierarchy (person > project > all others)
  return getNodeVisualSize(node.type, node.gravity_score);
}

/**
 * Shared animation state for all Pulsar nodes
 * Uses single ref to track elapsed time; all nodes driven by Canvas frameloop
 */
const sharedAnimationRef = { current: 0 };

/**
 * PulsarNodeGeometry: Render node with glow rings + animation
 */
export function PulsarNodeGeometry({
  node,
  highlightRole,
  isAnswerActive,
  selectedNodeId,
  onNodeClick,
  isCited,
}: PulsarNodeGeometryProps) {
  const meshGroupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  // Check for reduced motion preference (respects accessibility)
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Compute core color and scale
  const nodeColor = useMemo(
    () => getNodeColor(node, highlightRole, isCited, isAnswerActive),
    [node, highlightRole, isCited, isAnswerActive]
  );
  const scale = useMemo(() => getNodeScale(node), [node.gravity_score, node.type]);

  // Apply spatial expansion
  const expandedPosition = useMemo(
    () => applyRenderLayerSpacing([node.x, node.y, node.z], 1.2, 1.6),
    [node.x, node.y, node.z]
  );

  // Animation via Canvas frameloop
  useFrame(() => {
    if (prefersReducedMotion || !meshGroupRef.current) return;

    // Update shared time
    sharedAnimationRef.current += 0.01;

    // Ring 1: Slow rotation (0.5 rpm)
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = (sharedAnimationRef.current * 0.5 * Math.PI) / 30;
      // Opacity pulse: 0.3 → 0.5
      const baseMaterial = ring1Ref.current.material as THREE.MeshBasicMaterial;
      const pulseOpacity = 0.3 + 0.2 * Math.sin(sharedAnimationRef.current * Math.PI / 2);
      if (baseMaterial) baseMaterial.opacity = pulseOpacity;
    }

    // Ring 2: Counter-rotation (0.3 rpm) + faster pulse
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -(sharedAnimationRef.current * 0.3 * Math.PI) / 30;
      // Opacity pulse: 0.15 → 0.35
      const baseMaterial = ring2Ref.current.material as THREE.MeshBasicMaterial;
      const pulseOpacity = 0.15 + 0.2 * Math.sin(sharedAnimationRef.current * Math.PI / 3);
      if (baseMaterial) baseMaterial.opacity = pulseOpacity;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    onNodeClick?.(node);
  };

  const isSelected = selectedNodeId === node.id;

  return (
    <group key={node.id} ref={meshGroupRef} position={expandedPosition}>
      {/* Core sphere: IcosahedronGeometry with type color */}
      <mesh scale={scale} onClick={handleClick}>
        <icosahedronGeometry args={[1.0, 2]} />
        <meshBasicMaterial
          color={new THREE.Color(nodeColor[0], nodeColor[1], nodeColor[2])}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Ring 1: Inner torus, additive transparent */}
      <mesh ref={ring1Ref} scale={scale * 1.5}>
        <torusGeometry args={[1.5, 0.08, 16, 100]} />
        <meshBasicMaterial
          color={new THREE.Color(nodeColor[0], nodeColor[1], nodeColor[2])}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Ring 2: Outer torus, additive transparent */}
      <mesh ref={ring2Ref} scale={scale * 2.0}>
        <torusGeometry args={[2.0, 0.06, 16, 100]} />
        <meshBasicMaterial
          color={new THREE.Color(nodeColor[0], nodeColor[1], nodeColor[2])}
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Optional label for selected node (matches NodeGeometry behavior) */}
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
