/**
 * SELECTIONPANEL.TSX
 * Right-side detail panel for selected node or project
 * Phase 2.3: Display live selected item data
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { SelectedItem } from '../../hooks/useSelection';
import { GraphNode, GraphProject } from '../../lib/graph/graphTypes';
import { togglePinItem, isItemPinned } from '../../lib/search/navigationUtils';
import { computePanelPosition } from '../../lib/graph/highlighting';
import './SelectionPanel.css';

interface SelectionPanelProps {
  selectedItem: SelectedItem;
  onClose: () => void;
  cameraRef?: React.MutableRefObject<THREE.OrthographicCamera | null>; // FIX (DEMO LOCK BUG #7): For 3D-to-2D projection
  canvasWidth?: number; // Canvas width in pixels
  canvasHeight?: number; // Canvas height in pixels
}

/**
 * Format tags array as readable list
 */
function TagsList({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return <p className="selection-empty">No tags</p>;
  return (
    <ul className="selection-tags">
      {tags.map((tag) => (
        <li key={tag} className="selection-tag">
          {tag}
        </li>
      ))}
    </ul>
  );
}

/**
 * Format gravity score as percentage
 */
function GravityScore({ score }: { score: number }) {
  const percentage = Math.round((score ?? 0) * 100);
  return <span className="gravity-score">{percentage}%</span>;
}

/**
 * Node detail view
 */
function NodeDetails({ node }: { node: GraphNode }) {
  return (
    <>
      <div className="selection-field">
        <label>Type</label>
        <p className="selection-value">{node.type}</p>
      </div>

      {node.description && (
        <div className="selection-field">
          <label>Description</label>
          <p className="selection-value">{node.description}</p>
        </div>
      )}

      <div className="selection-field">
        <label>Gravity Score</label>
        <p className="selection-value">
          <GravityScore score={node.gravity_score} />
        </p>
      </div>

      {node.tags && node.tags.length > 0 && (
        <div className="selection-field">
          <label>Tags</label>
          <TagsList tags={node.tags} />
        </div>
      )}

      {node.project_id && (
        <div className="selection-field">
          <label>Project ID</label>
          <p className="selection-value selection-id">{node.project_id}</p>
        </div>
      )}

      <div className="selection-field">
        <label>Node ID</label>
        <p className="selection-value selection-id">{node.id}</p>
      </div>
    </>
  );
}

/**
 * Project detail view
 */
function ProjectDetails({ project }: { project: GraphProject }) {
  return (
    <>
      {project.description && (
        <div className="selection-field">
          <label>Description</label>
          <p className="selection-value">{project.description}</p>
        </div>
      )}

      <div className="selection-field">
        <label>Gravity Score</label>
        <p className="selection-value">
          <GravityScore score={project.gravity_score} />
        </p>
      </div>

      {project.is_featured && (
        <div className="selection-field">
          <label>Status</label>
          <p className="selection-value">Featured</p>
        </div>
      )}

      <div className="selection-field">
        <label>Project ID</label>
        <p className="selection-value selection-id">{project.id}</p>
      </div>
    </>
  );
}

/**
 * Main panel component
 * FIX (DEMO LOCK BUG #7): Calculate floating position near selected item
 */
export const SelectionPanel: React.FC<SelectionPanelProps> = ({ selectedItem, onClose, cameraRef, canvasWidth, canvasHeight }) => {
  const [isPinned, setIsPinned] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number } | null>(null);

  // FIX (DEMO LOCK BUG #7): Calculate panel position based on selected item's 3D coordinates
  // Memoized computation to avoid expensive recalculation on every render
  const memoizedPosition = useMemo(() => {
    if (!selectedItem || !cameraRef?.current || !canvasWidth || !canvasHeight) {
      return null;
    }

    // Get position from node (x, y, z) or project (x_derived, y_derived, z_derived)
    const item = selectedItem.data;
    const x = 'x' in item ? item.x : (item as any).x_derived || 0;
    const y = 'y' in item ? item.y : (item as any).y_derived || 0;
    const z = 'z' in item ? item.z : (item as any).z_derived || 0;

    // Use pure function to compute position
    return computePanelPosition(x, y, z, cameraRef.current, canvasWidth, canvasHeight);
  }, [selectedItem, cameraRef, canvasWidth, canvasHeight]);

  // Update state when memoized position changes
  useEffect(() => {
    setPanelPosition(memoizedPosition);
  }, [memoizedPosition]);

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

  // Update pin state when selection changes
  useEffect(() => {
    if (!selectedItem) {
      setIsPinned(false);
      return;
    }
    setIsPinned(isItemPinned(selectedItem.data.id, selectedItem.type));
  }, [selectedItem?.data.id, selectedItem?.type]);

  // Handle pin/unpin toggle
  const handleTogglePin = useCallback(() => {
    if (!selectedItem) return;
    const newState = togglePinItem(selectedItem.data.id, selectedItem.type, selectedItem.data.title);
    setIsPinned(newState);
  }, [selectedItem]);

  if (!selectedItem) {
    return null;
  }

  const isNode = selectedItem.type === 'node';
  const item = selectedItem.data;

  return (
    <div
      className="selection-panel"
      role="complementary"
      aria-label="Selection details"
      style={panelPosition ? {
        position: 'fixed',
        left: `${panelPosition.left}px`,
        top: `${panelPosition.top}px`,
        right: 'auto',
        bottom: 'auto'
      } : undefined}
    >
      {/* Header with pin and close buttons */}
      <div className="selection-header">
        <h2 className="selection-title">{item.title}</h2>
        <div className="selection-header-actions">
          <button
            className={`selection-pin ${isPinned ? 'pinned' : ''}`}
            onClick={handleTogglePin}
            aria-label={isPinned ? 'Unpin' : 'Pin'}
            title={isPinned ? 'Unpin (★)' : 'Pin (★)'}
          >
            {isPinned ? '★' : '☆'}
          </button>
          <button
            className="selection-close"
            onClick={onClose}
            aria-label="Close panel"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>
      </div>

      {/* Type badge */}
      <div className="selection-badge">
        {isNode ? (
          <span className={`badge badge-${(item as GraphNode).type}`}>
            {(item as GraphNode).type}
          </span>
        ) : (
          <span className="badge badge-project">Project</span>
        )}
      </div>

      {/* Content */}
      <div className="selection-content">
        {isNode ? (
          <NodeDetails node={item as GraphNode} />
        ) : (
          <ProjectDetails project={item as GraphProject} />
        )}
      </div>
    </div>
  );
};
