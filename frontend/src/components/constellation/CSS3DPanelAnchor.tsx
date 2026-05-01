/**
 * PROJECTED_DOM_ANCHORED_PANELS.TSX
 * Phase 3: DOM anchored panels using Drei <Html> (3D world space anchoring)
 *
 * Implementation: Reuses the same mechanism as NodeLabels
 * - Pass 3D world coordinates [x,y,z] to Drei <Html> component
 * - React Three Fiber automatically handles:
 *   * Camera projection (3D → 2D screen space)
 *   * Continuous position updates on camera movement (rotate, zoom, pan)
 *   * Perspective scaling (closer = larger, farther = smaller)
 *   * Occlusion and depth ordering
 * - No manual camera.project() math needed
 * - Panel follows node exactly like NodeLabels do
 *
 * Drei <Html> is the correct pattern for anchoring DOM to 3D coordinates.
 */

import { useState, useCallback, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { GraphNode, GraphProject } from '../../lib/graph/graphTypes';
import './CSS3DPanelAnchor.css';

interface CSS3DPanelAnchorProps {
  selectedItem: {
    type: 'node' | 'project';
    data: GraphNode | GraphProject;
  } | null;
  onClose: () => void;
}

/**
 * Get item position in 3D world space
 */
function getItemWorldPosition(item: GraphNode | GraphProject): [number, number, number] {
  const x = 'x' in item ? item.x : 0;
  const y = 'y' in item ? item.y : 0;
  const z = 'z' in item ? item.z : 0;
  return [x, y, z];
}

/**
 * Get item display title
 */
function getItemTitle(item: GraphNode | GraphProject): string {
  return (item as any).title || 'Unknown';
}

/**
 * Get item type label
 */
function getItemTypeLabel(item: GraphNode | GraphProject, itemType: 'node' | 'project'): string {
  if (itemType === 'project') return 'PROJECT';
  return (item as GraphNode).type?.toUpperCase() || 'NODE';
}

/**
 * Get item description
 */
function getItemDescription(item: GraphNode | GraphProject): string | null {
  const desc = 'description' in item ? (item as any).description : undefined;
  return desc || null;
}

/**
 * Get item tags
 */
function getItemTags(item: GraphNode | GraphProject): string[] {
  return 'tags' in item ? item.tags || [] : [];
}

/**
 * Projected DOM Anchored Panel Component
 * Uses Drei <Html> for 3D world space anchoring (same pattern as NodeLabels)
 */
export function CSS3DPanelAnchor({
  selectedItem,
  onClose,
}: CSS3DPanelAnchorProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (selectedItem) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedItem]);

  // Handle close button and Escape key
  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose();
  }, [onClose]);

  // Don't render if no item selected or panel closed
  if (!selectedItem || !isOpen) {
    return null;
  }

  const item = selectedItem.data;
  const itemType = selectedItem.type;
  const [x, y, z] = getItemWorldPosition(item);
  const title = getItemTitle(item);
  const typeLabel = getItemTypeLabel(item, itemType);
  const description = getItemDescription(item);
  const tags = getItemTags(item);

  // Offset position slightly above and to the side of the node/project
  // Same pattern as NodeLabels offset
  const offsetX = 2.0; // Offset to the right
  const offsetY = 1.5; // Offset above
  const offsetZ = 0.5; // Offset forward (toward camera)

  return (
    <Html
      position={[x + offsetX, y + offsetY, z + offsetZ]}
      distanceFactor={1.0}
      scale={1.0}
      occlude="blending"
    >
      <div
        className="css3d-panel"
        role="article"
        aria-label={`${itemType} details: ${title}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Backdrop (pointer-events: none) */}
        <div className="css3d-panel-backdrop" />

        {/* Content container (pointer-events: auto only for interactive elements) */}
        <div className="css3d-panel-content">
          {/* Header with close button */}
          <div className="css3d-panel-header">
            <div className="css3d-panel-title-section">
              <span className="css3d-panel-type-badge">{typeLabel}</span>
              <h3 className="css3d-panel-title">{title}</h3>
            </div>
            <button
              className="css3d-panel-close"
              onClick={handleClose}
              aria-label="Close panel"
              title="Close (Esc)"
              type="button"
            >
              ✕
            </button>
          </div>

          {/* Description */}
          {description && (
            <div className="css3d-panel-description">
              <p>{description}</p>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="css3d-panel-tags">
              <div className="css3d-panel-tags-label">Tags:</div>
              <div className="css3d-panel-tags-list">
                {tags.map((tag) => (
                  <span key={tag} className="css3d-panel-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Item ID (for debugging/reference) - only show in dev mode */}
          {process.env.NODE_ENV === 'development' && (
            <div className="css3d-panel-id">
              <code>{item.id}</code>
            </div>
          )}
        </div>
      </div>
    </Html>
  );
}
