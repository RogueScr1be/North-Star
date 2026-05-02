/**
 * BILLBOARDEDPANEL.TSX
 * Phase 3: True billboarded panel anchored to 3D world position
 *
 * Implementation:
 * - Places panel DOM in 3D world space using Drei <Html>
 * - Uses useFrame to sync quaternion with camera
 * - Result: Panel always faces camera (billboarded)
 * - Follows node position through rotate/orbit/zoom/pan
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { SelectedItem } from '../../hooks/useSelection';
import { getRenderedPosition } from '../../lib/graph/renderedPositions';
import * as THREE from 'three';
import './BillboardedPanel.css';

interface BillboardedPanelProps {
  selectedItem: SelectedItem | null;
  onClose: () => void;
  onOpenMorePanel?: () => void; // Phase 3 (Current Session): Open side panel without closing billboard
  position: [number, number, number];
  projectTitle?: string; // Phase 5.1: Parent context hint for nodes
  connectedCount?: number; // Phase 5.1: Relationship count for nodes
}

/**
 * Internal wrapper component that syncs quaternion with camera
 * Renders inside Canvas, uses useFrame hook for quaternion syncing
 */
function BillboardPanelContent({
  selectedItem,
  onClose,
  onOpenMorePanel,
  position: [posX, posY, posZ],
  projectTitle,
  connectedCount,
}: BillboardedPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Sync quaternion with camera on every frame
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!selectedItem) {
    return null;
  }

  const item = selectedItem.data as any;
  const type = selectedItem.type === 'node' ? item.type : 'project';
  const title = item.title || 'Unknown';
  const gravity = item.gravity_score ?? 0;
  const description = item.description ? item.description.slice(0, 150) : null;
  const tags = item.tags && Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];

  const handleGroupPointerEvent = (e: any) => {
    e.stopPropagation();
  };

  return (
    <group
      ref={groupRef}
      position={[posX, posY, posZ]}
      onPointerDown={handleGroupPointerEvent}
      onPointerUp={handleGroupPointerEvent}
      onClick={handleGroupPointerEvent}
    >
      <Html
        position={[2.0, 1.5, 0.5]}
        scale={0.01}
        occlude="blending"
        distanceFactor={1}
      >
        <div
          className={`billboarded-panel ${
            import.meta.env.VITE_LIQUID_PANEL_REVEAL_ENABLED !== 'false' ? 'billboarded-panel--reveal' : ''
          }`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            className="billboarded-panel-close"
            onClick={onClose}
            aria-label="Close panel"
            title="Close (Esc)"
            type="button"
          >
            ✕
          </button>

          {/* Header */}
          <div className="billboarded-panel-header">
            <span className="billboarded-panel-type">
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
            <h3 className="billboarded-panel-title">{title}</h3>
          </div>

          {/* Description (Phase 5.1) — only if present */}
          {description && (
            <p className="billboarded-panel-description">{description}</p>
          )}

          {/* Tags (Phase 5.1) — only if present */}
          {tags.length > 0 && (
            <div className="billboarded-panel-tags">
              {tags.map((tag: string) => (
                <span key={tag} className="billboarded-panel-tag">
                  {tag}
                </span>
              ))}
              {item.tags && item.tags.length > 3 && (
                <span className="billboarded-panel-tag-more">
                  +{item.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Metadata row (Phase 5.1) — gravity + context */}
          <div className="billboarded-panel-metadata">
            <span className="billboarded-panel-gravity">
              {Math.round((gravity ?? 0) * 100)}%
            </span>
            {selectedItem.type === 'node' && projectTitle && (
              <span className="billboarded-panel-context">
                Part of {projectTitle}
              </span>
            )}
            {selectedItem.type === 'node' && typeof connectedCount === 'number' && connectedCount > 0 && (
              <span className="billboarded-panel-connections">
                {connectedCount} {connectedCount === 1 ? 'connection' : 'connections'}
              </span>
            )}
            {selectedItem.type === 'project' && typeof connectedCount === 'number' && connectedCount > 0 && (
              <span className="billboarded-panel-connections">
                {connectedCount} {connectedCount === 1 ? 'node' : 'nodes'}
              </span>
            )}
          </div>

          {/* More / Details button (Phase 3 Current Session) */}
          {onOpenMorePanel && (
            <button
              className="billboarded-panel-more"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMorePanel();
              }}
              aria-label="Open details panel"
              title="Open details"
              type="button"
            >
              More →
            </button>
          )}

          {/* Item ID for reference */}
          {process.env.NODE_ENV === 'development' && (
            <div className="billboarded-panel-id">
              <code>{item.id}</code>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

/**
 * Billboarded Panel Component
 * Anchored to selected node/project position
 * Always faces camera (quaternion synced each frame)
 */
export function BillboardedPanel({
  selectedItem,
  onClose,
  onOpenMorePanel,
  projectTitle,
  connectedCount,
}: Omit<BillboardedPanelProps, 'position'>) {
  if (!selectedItem) {
    return null;
  }

  const item = selectedItem.data as any;

  // Get rendered position (accounts for spatial expansion)
  // Anchors billboard at the same position as visible geometry
  const itemType = selectedItem.type === 'node' ? 'node' : 'project';
  const renderedPosition = getRenderedPosition(item, itemType, { applyExpansion: true });

  if (!renderedPosition) {
    return null;
  }

  return (
    <BillboardPanelContent
      selectedItem={selectedItem}
      onClose={onClose}
      onOpenMorePanel={onOpenMorePanel}
      position={renderedPosition}
      projectTitle={projectTitle}
      connectedCount={connectedCount}
    />
  );
}
