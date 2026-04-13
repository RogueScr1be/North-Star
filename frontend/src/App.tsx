/**
 * APP.TSX
 * Root component with routing setup
 * Phase 1: 4 read-only pages
 * Phase 3.8: Analytics initialization
 */

import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initializeAnalytics } from './lib/analytics/initializeAnalytics';
import { Layout } from './components/Layout';
import { ProfileHub } from './pages/ProfileHub';
import { ProjectLedger } from './pages/ProjectLedger';
import { ProjectDetail } from './pages/ProjectDetail';
import { NodeDetail } from './pages/NodeDetail';
import { ConstellationCanvas } from './pages/ConstellationCanvas';
import { Constellation3D } from './pages/Constellation3D';
import { D3ConstellationCanvas } from './pages/D3ConstellationCanvas';
import './App.css';

export const App: React.FC = () => {
  // Initialize analytics on app startup (Phase 3.8)
  useEffect(() => {
    const result = initializeAnalytics();
    console.debug(`[App] Analytics initialized: ${result.loggerType} (remote: ${result.isRemoteEnabled})`);
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Routes>
          {/* FINAL LOCK MODE: Single-surface demo root → constellation */}
          <Route path="/" element={<Navigate to="/constellation" replace />} />

          {/* Phase 1: Constellation 3D (enhanced visuals variant, full screen, no Layout) */}
          <Route path="/constellation-3d" element={<Constellation3D />} />

          {/* Phase 2.2: Constellation Canvas (full screen, no Layout) — FALLBACK ROUTE */}
          <Route path="/constellation" element={<ConstellationCanvas />} />

          {/* Phase 5.8: D3 Force Layout Spike (isolated experimental route) — FALLBACK ROUTE */}
          <Route path="/constellation/d3-spike" element={<D3ConstellationCanvas />} />

          {/* Phase 1: Standard layout pages — FALLBACK ROUTES (preserved for rollback safety) */}
          <Route
            path="/legacy/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<ProfileHub />} />
                  <Route path="/projects" element={<ProjectLedger />} />
                  <Route path="/projects/:projectId" element={<ProjectDetail />} />
                  <Route path="/nodes/:nodeId" element={<NodeDetail />} />
                  <Route path="*" element={<Navigate to="/constellation-3d" replace />} />
                </Routes>
              </Layout>
            }
          />

          {/* Catch-all: redirect unknown routes to constellation-3d */}
          <Route path="*" element={<Navigate to="/constellation-3d" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
