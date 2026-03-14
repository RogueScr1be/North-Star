/**
 * PROJECTLEDGER.TSX
 * Project catalog: all projects with gravity scores
 * Route: /projects
 */

import React, { useState } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { ProjectCard } from '../components/ProjectCard';
import { useProjects } from '../hooks/useProjects';

type SortBy = 'gravity' | 'name';

export const ProjectLedger: React.FC = () => {
  const { projects, loading, error } = useProjects();
  const [sortBy, setSortBy] = useState<SortBy>('gravity');

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error">
          <h2>Error loading projects</h2>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  const sorted = [...projects].sort((a, b) => {
    if (sortBy === 'gravity') {
      return b.gravity_score - a.gravity_score;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="page-container">
      <Breadcrumb items={[{ label: 'Projects' }]} />

      <section className="page-header">
        <h1>Project Ledger</h1>
        <p>All projects by {projects.length > 0 ? projects[0].profile_id : 'founder'}</p>
      </section>

      <section className="sort-controls">
        <label>
          Sort by:
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
            <option value="gravity">Gravity (High to Low)</option>
            <option value="name">Name (A to Z)</option>
          </select>
        </label>
      </section>

      <section className="project-grid">
        {sorted.length > 0 ? (
          sorted.map((project) => <ProjectCard key={project.id} project={project} />)
        ) : (
          <p>No projects found.</p>
        )}
      </section>

      <section className="projects-stats">
        <div className="stat">
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">Total Projects</div>
        </div>
        <div className="stat">
          <div className="stat-value">{projects.reduce((sum, p) => sum + p.node_count, 0)}</div>
          <div className="stat-label">Total Nodes</div>
        </div>
      </section>
    </div>
  );
};
