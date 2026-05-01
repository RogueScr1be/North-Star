/**
 * COMPACTNODEPANEL.TSX
 * Phase 3: Compact anchored detail panel for selected nodes/projects
 * Uses THREE Text meshes (same pattern as NodeLabels) for automatic camera tracking
 * Renders in 3D world space, follows camera rotation/zoom/pan automatically
 */

import { useMemo, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { SelectedItem } from '../../hooks/useSelection';

interface CompactNodePanelProps {
  selectedItem: SelectedItem | null;
  onClose: () => void;
}

/**
 * Get display information from selected item
 */
function getItemInfo(selectedItem: SelectedItem | null) {
  if (!selectedItem) return null;

  const item = selectedItem.data as any;
  const type = selectedItem.type === 'node' ? item.type : 'project';
  const title = item.title || 'Unknown';
  const gravity = item.gravity_score ?? 0;
  const position = item.position as [number, number, number];

  return {
    id: item.id,
    title,
    type: type.charAt(0).toUpperCase() + type.slice(1),
    gravity: Math.round((gravity ?? 0) * 100),
    position,
  };
}

/**
 * CompactNodePanel: Anchored detail panel in 3D world space
 * Renders at selected node/project position with offset
 * Moves automatically with camera rotation/zoom/pan (R3F handles projection)
 */
export function CompactNodePanel({ selectedItem, onClose }: CompactNodePanelProps) {
  const itemInfo = useMemo(() => getItemInfo(selectedItem), [selectedItem]);

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!itemInfo) {
    return null;
  }

  // Extract world position from graph data
  const [posX, posY, posZ] = itemInfo.position;

  // Panel offset: position to the right and above the node
  const panelOffsetX = 2.0; // Right of node
  const panelOffsetY = 1.5; // Above node
  const panelOffsetZ = 0.5; // Forward (toward camera)

  const panelX = posX + panelOffsetX;
  const panelY = posY + panelOffsetY;
  const panelZ = posZ + panelOffsetZ;

  // Title position (top of panel)
  const titleY = panelY + 0.8;

  // Type badge position (below title)
  const typeY = panelY + 0.4;

  // Gravity score position (below type)
  const gravityY = panelY;

  // Close button hint position (bottom)
  const hintY = panelY - 0.4;

  return (
    <>
      {/* Title */}
      <Text
        position={[panelX, titleY, panelZ]}
        fontSize={0.6}
        color={0xffffff}
        maxWidth={2.0}
        textAlign="left"
        anchorX="left"
        anchorY="top"
      >
        {itemInfo.title}
      </Text>

      {/* Type badge */}
      <Text
        position={[panelX, typeY, panelZ]}
        fontSize={0.35}
        color={0x00ffc8}
        maxWidth={2.0}
        textAlign="left"
        anchorX="left"
        anchorY="middle"
      >
        {itemInfo.type}
      </Text>

      {/* Gravity score */}
      <Text
        position={[panelX, gravityY, panelZ]}
        fontSize={0.35}
        color={0xcccccc}
        maxWidth={2.0}
        textAlign="left"
        anchorX="left"
        anchorY="middle"
      >
        {itemInfo.gravity}%
      </Text>

      {/* Close hint */}
      <Text
        position={[panelX, hintY, panelZ]}
        fontSize={0.25}
        color={0x888888}
        maxWidth={2.0}
        textAlign="left"
        anchorX="left"
        anchorY="middle"
      >
        [Esc to close]
      </Text>
    </>
  );
}
