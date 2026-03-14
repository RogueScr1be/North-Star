/**
 * PROJECTCARD.TSX
 * Displays project summary with gravity score, status, and description
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ProjectWithCounts } from '../lib/types';

interface ProjectCardProps {
  project: ProjectWithCounts;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <Link to={`/projects/${project.id}`} className="project-card-link">
      <div className="project-card">
        <div className="project-header">
          <div>
            <h3 className="project-name">{project.name}</h3>
            <p className="project-status">{project.status}</p>
          </div>
          <div className="gravity-indicator">
            <div className="gravity-value">{(project.gravity_score * 100).toFixed(0)}%</div>
            <div className="gravity-bar" style={{ width: `${project.gravity_score * 100}%` }}></div>
          </div>
        </div>

        <p className="project-description">{project.short_desc}</p>

        <div className="project-meta">
          <span className="node-count">{project.node_count} nodes</span>
          {project.is_featured && <span className="featured-badge">Featured</span>}
        </div>
      </div>
    </Link>
  );
};
