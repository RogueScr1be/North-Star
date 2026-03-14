/**
 * LAYOUT.TSX
 * Main layout with header and navigation
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isHome = location.pathname === '/';

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="logo">
            <h1>North Star</h1>
            <p className="tagline">Founder Knowledge Graph</p>
          </Link>

          <nav className="main-nav">
            <ul>
              <li>
                <Link to="/constellation" className={location.pathname === '/constellation' ? 'active' : ''}>
                  Constellation
                </Link>
              </li>
              <li>
                <Link to="/" className={isHome ? 'active' : ''}>
                  Profile
                </Link>
              </li>
              <li>
                <Link to="/projects" className={location.pathname === '/projects' ? 'active' : ''}>
                  Projects
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <p>North Star MFP — Phase 1 | Static Knowledge Graph</p>
      </footer>
    </div>
  );
};
