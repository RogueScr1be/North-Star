/**
 * NODEDETAIL.TSX
 * Single node detail: content + evidence + edges
 * Route: /nodes/:nodeId
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { EvidenceDisplay } from '../components/EvidenceDisplay';
import { EdgeList } from '../components/EdgeList';
import { useNode } from '../hooks/useNode';

const NODE_COLORS_MAP: Record<string, string> = {
  project: '#FF6B9D',
  decision: '#4ECDC4',
  constraint: '#FFE66D',
  failure: '#FF6B6B',
  metric: '#95E1D3',
  skill: '#A8E6CF',
  outcome: '#B19CD9',
  experiment: '#FFB6C1',
};

export const NodeDetail: React.FC = () => {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const { node, incoming, outgoing, loading, error } = useNode(nodeId || '');

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading node...</div>
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="page-container">
        <div className="error">
          <h2>Error loading node</h2>
          <p>{error?.message || 'Node not found'}</p>
          <button onClick={() => navigate('/projects')}>Back to Projects</button>
        </div>
      </div>
    );
  }

  const color = NODE_COLORS_MAP[node.type] || '#999999';
  const evidence = node.metadata_json?.evidence || [];

  return (
    <div className="page-container">
      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          { label: node.title },
        ]}
      />

      <section className="node-detail-header">
        <div className="node-type-icon" style={{ backgroundColor: color }}>
          {node.type.substring(0, 1).toUpperCase()}
        </div>
        <div>
          <h1>{node.title}</h1>
          <div className="node-metadata">
            <span className="type-badge" style={{ borderColor: color }}>
              {node.type}
            </span>
            <span className="gravity-badge">{(node.gravity_score * 100).toFixed(0)}% Gravity</span>
            {node.is_featured && <span className="featured-badge">Featured</span>}
          </div>
        </div>
      </section>

      {node.description && (
        <section className="node-description">
          <h2>Description</h2>
          <p>{node.description}</p>
        </section>
      )}

      {node.tags && node.tags.length > 0 && (
        <section className="node-tags">
          <h3>Tags</h3>
          <div className="tags-list">
            {node.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {evidence.length > 0 && <EvidenceDisplay evidence={evidence} />}

      {(incoming.length > 0 || outgoing.length > 0) && (
        <EdgeList incoming={incoming} outgoing={outgoing} />
      )}

      <section className="node-metadata-section">
        <h3>Metadata</h3>
        <div className="metadata-grid">
          <div className="metadata-item">
            <span className="label">Source Attribution:</span>
            <span className="value">{node.source_attribution}</span>
          </div>
          {node.ref_table && (
            <div className="metadata-item">
              <span className="label">Referenced From:</span>
              <span className="value">
                {node.ref_table} → {node.ref_id}
              </span>
            </div>
          )}
          <div className="metadata-item">
            <span className="label">Created:</span>
            <span className="value">{new Date(node.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </section>

      <section className="node-actions">
        <button onClick={() => navigate('/projects')} className="secondary-button">
          Back to Projects
        </button>
      </section>
    </div>
  );
};
