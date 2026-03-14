/**
 * PROJECTDETAIL.TSX
 * Single project detail: description + scoped nodes
 * Route: /projects/:projectId
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { NodeCard } from '../components/NodeCard';
import { APIError, fetchProject, fetchProjectNodes } from '../lib/api';
import { ProjectWithCounts, Node } from '../lib/types';

export const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectWithCounts | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);

  useEffect(() => {
    const loadProjectDetail = async () => {
      if (!projectId) return;

      setLoading(true);
      setError(null);

      try {
        const projectData = await fetchProject(projectId);
        setProject(projectData);

        const nodesData = await fetchProjectNodes(projectId);
        setNodes(nodesData.data);
      } catch (err) {
        setError(err instanceof APIError ? err : new APIError(500, 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadProjectDetail();
  }, [projectId]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading project...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page-container">
        <div className="error">
          <h2>Error loading project</h2>
          <p>{error?.message || 'Project not found'}</p>
          <button onClick={() => navigate('/projects')}>Back to Projects</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          { label: project.name },
        ]}
      />

      <section className="project-detail-header">
        <h1>{project.name}</h1>
        <p className="status-badge">{project.status}</p>
      </section>

      {project.system_design && (
        <section className="project-overview">
          <h2>Overview</h2>
          <p>{project.system_design}</p>
        </section>
      )}

      <section className="project-meta">
        <div className="meta-item">
          <span className="label">Gravity Score:</span>
          <span className="value">{(project.gravity_score * 100).toFixed(0)}%</span>
        </div>
        <div className="meta-item">
          <span className="label">Nodes:</span>
          <span className="value">{project.node_count}</span>
        </div>
        {project.is_featured && (
          <div className="meta-item">
            <span className="badge">Featured</span>
          </div>
        )}
      </section>

      <section className="project-nodes">
        <h2>Associated Nodes ({nodes.length})</h2>
        {nodes.length > 0 ? (
          <div className="node-grid">
            {nodes.map((node) => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>
        ) : (
          <p className="no-nodes">No nodes associated with this project.</p>
        )}
      </section>

      <section className="project-actions">
        <button onClick={() => navigate('/projects')} className="secondary-button">
          Back to Projects
        </button>
      </section>
    </div>
  );
};
