/**
 * PROFILEHUB.TSX
 * Main profile page: founder context + featured projects
 * Route: /
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { ProfileCard } from '../components/ProfileCard';
import { ProjectCard } from '../components/ProjectCard';
import { useProfile } from '../hooks/useProfile';

export const ProfileHub: React.FC = () => {
  const { profile, projects, loading, error } = useProfile('prentiss-frontier-operator');
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-container">
        <div className="error">
          <h2>Error loading profile</h2>
          <p>{error?.message || 'Profile not found'}</p>
          <button onClick={() => navigate('/projects')}>View Projects Instead</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Breadcrumb items={[]} />

      <section className="profile-section">
        <ProfileCard profile={profile} />
      </section>

      <section className="featured-projects-section">
        <h2>Featured Projects</h2>
        <div className="project-grid">
          {projects.length > 0 ? (
            projects.map((project) => <ProjectCard key={project.id} project={project} />)
          ) : (
            <p>No featured projects.</p>
          )}
        </div>
      </section>

      <section className="cta-section">
        <h3>Explore All Projects</h3>
        <button onClick={() => navigate('/projects')} className="primary-button">
          View Project Ledger
        </button>
      </section>
    </div>
  );
};
