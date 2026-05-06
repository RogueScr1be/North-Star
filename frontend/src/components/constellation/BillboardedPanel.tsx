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

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { SelectedItem } from '../../hooks/useSelection';
import { getRenderedPosition } from '../../lib/graph/renderedPositions';
import * as THREE from 'three';
import './BillboardedPanel.css';

interface RelatedNode {
  id: string;
  title: string;
  type: string;
  gravity_score: number;
  relationshipType?: string;
}

interface BillboardedPanelProps {
  selectedItem: SelectedItem | null;
  onClose: () => void;
  position: [number, number, number];
  projectTitle?: string; // Phase 5.1: Parent context hint for nodes
  connectedCount?: number; // Phase 5.1: Relationship count for nodes
  relatedNodes?: RelatedNode[]; // Phase 5.2: Connected nodes for Evidence Mode
  onEvidenceHover?: (nodeId: string) => void; // Phase 5.4: Evidence card hover callback
  onEvidenceLeave?: () => void; // Phase 5.4: Evidence card leave callback
  onEvidenceSelect?: (nodeId: string) => void; // Phase 6.1: Evidence card selection callback
}

/**
 * Internal wrapper component that syncs quaternion with camera
 * Renders inside Canvas, uses useFrame hook for quaternion syncing
 */
function BillboardPanelContent({
  selectedItem,
  onClose,
  position: [posX, posY, posZ],
  projectTitle,
  connectedCount,
  relatedNodes,
  onEvidenceHover,
  onEvidenceLeave,
  onEvidenceSelect,
}: BillboardedPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Phase 5.2: Internal billboard mode state ('compact' | 'evidence')
  const [billboardMode, setBillboardMode] = useState<'compact' | 'evidence'>('compact');
  // Phase 5.2: Local glow state for path/id trace link
  const [pathIdGlowing, setPathIdGlowing] = useState(false);

  // Sync quaternion with camera on every frame
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  // Handle Escape key or selection change → reset mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Reset billboard mode when selection changes (selectedItem switched)
  useEffect(() => {
    setBillboardMode('compact');
    setPathIdGlowing(false);
  }, [selectedItem?.data.id]);

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

  // Phase 5.2: Handler to toggle Evidence Mode (not side panel)
  const handleExpandEvidence = () => {
    setBillboardMode(billboardMode === 'compact' ? 'evidence' : 'compact');
  };

  // Phase 5.2: Handler for path/id glow toggle
  const handlePathIdClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPathIdGlowing(!pathIdGlowing);
  };

  // Phase 5.2: Limit related nodes to first 5 for compact Evidence Mode
  const displayedRelatedNodes = (relatedNodes ?? []).slice(0, 5);
  const hiddenRelatedCount = Math.max(0, (relatedNodes ?? []).length - 5);

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
          className={`billboarded-panel billboarded-panel--${billboardMode} ${
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

          {/* Compact Mode Content (Phase 5.1) */}
          {billboardMode === 'compact' && (
            <>
              {/* Description — only if present */}
              {description && (
                <p className="billboarded-panel-description">{description}</p>
              )}

              {/* Tags — only if present */}
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

              {/* Metadata row — gravity + context */}
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

              {/* More / Evidence Mode toggle (Phase 5.2) */}
              {(relatedNodes ?? []).length > 0 && (
                <button
                  className="billboarded-panel-more"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpandEvidence();
                  }}
                  aria-label="View related signals"
                  title="View related signals"
                  type="button"
                >
                  More →
                </button>
              )}

              {/* Item ID for reference */}
              {process.env.NODE_ENV === 'development' && (
                <div className="billboarded-panel-id">
                  <code
                    className={pathIdGlowing ? 'glowing' : ''}
                    onClick={handlePathIdClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {item.id}
                  </code>
                </div>
              )}
            </>
          )}

          {/* Evidence Mode Content (Phase 5.2) */}
          {billboardMode === 'evidence' && (
            <>
              <div className="billboarded-panel-evidence-header">
                <button
                  className="billboarded-panel-back"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpandEvidence();
                  }}
                  aria-label="Back to compact view"
                  type="button"
                >
                  ← Back
                </button>
              </div>

              <div className="billboarded-panel-evidence-container">
                {displayedRelatedNodes.length > 0 ? (
                  <>
                    {displayedRelatedNodes.map((node) => (
                      <div
                        key={node.id}
                        className="billboarded-panel-evidence-card"
                        data-testid="billboard-evidence-card"
                        data-node-id={node.id}
                        data-node-title={node.title}
                        onMouseEnter={() => {
                          onEvidenceHover?.(node.id);
                        }}
                        onMouseLeave={() => {
                          onEvidenceLeave?.();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEvidenceSelect?.(node.id);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="evidence-card-header">
                          <span className="evidence-card-type">{node.type}</span>
                        </div>
                        <h4 className="evidence-card-title">{node.title}</h4>
                        <div className="evidence-card-meta">
                          <span className="evidence-card-gravity">
                            {Math.round((node.gravity_score ?? 0) * 100)}%
                          </span>
                          {node.relationshipType && (
                            <span className="evidence-card-relation">{node.relationshipType}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {hiddenRelatedCount > 0 && (
                      <div className="billboarded-panel-evidence-more">
                        +{hiddenRelatedCount} more signals
                      </div>
                    )}
                  </>
                ) : (
                  <div className="billboarded-panel-evidence-empty">
                    No related signals
                  </div>
                )}
              </div>

              {/* Item ID in Evidence Mode */}
              {process.env.NODE_ENV === 'development' && (
                <div className="billboarded-panel-id">
                  <code
                    className={pathIdGlowing ? 'glowing' : ''}
                    onClick={handlePathIdClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {item.id}
                  </code>
                </div>
              )}
            </>
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
  projectTitle,
  connectedCount,
  relatedNodes,
  onEvidenceHover,
  onEvidenceLeave,
  onEvidenceSelect,
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
      position={renderedPosition}
      projectTitle={projectTitle}
      connectedCount={connectedCount}
      relatedNodes={relatedNodes}
      onEvidenceHover={onEvidenceHover}
      onEvidenceLeave={onEvidenceLeave}
      onEvidenceSelect={onEvidenceSelect}
    />
  );
}
