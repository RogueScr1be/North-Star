/**
 * SELECTIONPANEL.TSX
 * Right-side detail panel for selected node or project
 * Phase 2.3: Display live selected item data
 */

import React, { useEffect, useState, useCallback } from 'react';
import { SelectedItem } from '../../hooks/useSelection';
import { GraphNode, GraphProject } from '../../lib/graph/graphTypes';
import { togglePinItem, isItemPinned } from '../../lib/search/navigationUtils';
import './SelectionPanel.css';

interface SelectionPanelProps {
  selectedItem: SelectedItem;
  onClose: () => void;
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
 */
export const SelectionPanel: React.FC<SelectionPanelProps> = ({ selectedItem, onClose }) => {
  const [isPinned, setIsPinned] = useState(false);

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
    <div className="selection-panel" role="complementary" aria-label="Selection details">
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
