/**
 * NODECARD.TSX
 * Displays minimal node representation with type, title, gravity, tags
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Node, NodeType } from '../lib/types';

interface NodeCardProps {
  node: Node;
  compact?: boolean;
}

const NODE_COLORS: Record<NodeType, string> = {
  project: '#FF6B9D',
  decision: '#4ECDC4',
  constraint: '#FFE66D',
  failure: '#FF6B6B',
  metric: '#95E1D3',
  skill: '#A8E6CF',
  outcome: '#B19CD9',
  experiment: '#FFB6C1',
};

export const NodeCard: React.FC<NodeCardProps> = ({ node, compact = false }) => {
  const color = NODE_COLORS[node.type];

  if (compact) {
    return (
      <Link to={`/nodes/${node.id}`} className="node-card-compact">
        <div className="node-icon" style={{ backgroundColor: color }}></div>
        <div className="node-info">
          <h4>{node.title}</h4>
          <p className="node-type">{node.type}</p>
        </div>
        <div className="gravity">{(node.gravity_score * 100).toFixed(0)}%</div>
      </Link>
    );
  }

  return (
    <Link to={`/nodes/${node.id}`} className="node-card">
      <div className="node-header">
        <div className="node-type-badge" style={{ backgroundColor: color }}>
          {node.type}
        </div>
        <div className="gravity-indicator">
          <div className="gravity-value">{(node.gravity_score * 100).toFixed(0)}%</div>
        </div>
      </div>

      <h3 className="node-title">{node.title}</h3>

      {node.description && <p className="node-description">{node.description.substring(0, 150)}...</p>}

      {node.tags && node.tags.length > 0 && (
        <div className="node-tags">
          {node.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
          {node.tags.length > 3 && <span className="tag-more">+{node.tags.length - 3}</span>}
        </div>
      )}
    </Link>
  );
};
