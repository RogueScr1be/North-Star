/**
 * EVIDENCEHOVERLINE.TSX
 * Phase 6.1: Animated neon connection line between selected node and hovered evidence node
 *
 * Implementation:
 * - Renders cyan neon line with emissive material (interacts with bloom)
 * - Animates with traveling wave effect
 * - Only visible when evidence card hovered
 * - Applies spatial expansion to align with visual geometry
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphNode } from '../../lib/graph/graphTypes';
import { SelectedItem } from '../../hooks/useSelection';

interface EvidenceHoverLineProps {
  selectedItem: SelectedItem | null | undefined;
  hoveredEvidenceNodeId: string | null | undefined;
  nodes: GraphNode[];
}

// Phase 10.1: Apply spatial expansion for alignment with visual geometry
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

export function EvidenceHoverLine({ selectedItem, hoveredEvidenceNodeId, nodes }: EvidenceHoverLineProps) {
  const lineRef = useRef<any>(null);
  const colorTimeRef = useRef(0);

  // Determine if we should render the line
  const shouldRender = selectedItem && hoveredEvidenceNodeId && selectedItem.type === 'node';

  // Get the positions of the selected node and hovered evidence node
  const { selectedNodePos, hoveredNodePos } = useMemo(() => {
    if (!shouldRender) return { selectedNodePos: null, hoveredNodePos: null };

    const selectedNode = selectedItem.data as GraphNode;
    const selectedPos = applyRenderLayerSpacing([selectedNode.x, selectedNode.y, selectedNode.z], 1.2, 1.6);

    const hoveredNode = nodes.find(n => n.id === hoveredEvidenceNodeId);
    if (!hoveredNode) return { selectedNodePos: selectedPos, hoveredNodePos: null };

    const hoveredPos = applyRenderLayerSpacing([hoveredNode.x, hoveredNode.y, hoveredNode.z], 1.2, 1.6);
    return { selectedNodePos: selectedPos, hoveredNodePos: hoveredPos };
  }, [selectedItem, hoveredEvidenceNodeId, nodes, shouldRender]);

  // Create geometry with positions
  const geometry = useMemo(() => {
    if (!selectedNodePos || !hoveredNodePos) return null;

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array([
      selectedNodePos[0], selectedNodePos[1], selectedNodePos[2],
      hoveredNodePos[0], hoveredNodePos[1], hoveredNodePos[2],
    ]);

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [selectedNodePos, hoveredNodePos]);

  // Animate the traveling wave effect on the line
  useFrame(() => {
    if (!lineRef.current || !geometry) return;

    colorTimeRef.current = (colorTimeRef.current + 0.08) % (Math.PI * 2);

    // Update material to create wave effect
    const material = lineRef.current.material as THREE.LineBasicMaterial;
    if (material) {
      // Pulse opacity for traveling effect - much stronger and faster
      const wave = Math.sin(colorTimeRef.current);
      material.opacity = 0.75 + wave * 0.25; // Oscillate between 0.5 and 1.0, much more visible
    }
  });

  if (!shouldRender || !geometry || !selectedNodePos || !hoveredNodePos) {
    return null;
  }

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color="#00FFC8"
        linewidth={3}
        transparent
        opacity={0.7}
        fog={false}
      />
    </lineSegments>
  );
}
