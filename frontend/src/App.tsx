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
          {/* Phase 2.2: Constellation Canvas (full screen, no Layout) */}
          <Route path="/constellation" element={<ConstellationCanvas />} />

          {/* Phase 5.8: D3 Force Layout Spike (isolated experimental route) */}
          <Route path="/constellation/d3-spike" element={<D3ConstellationCanvas />} />

          {/* Phase 1: Standard layout pages */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<ProfileHub />} />
                  <Route path="/projects" element={<ProjectLedger />} />
                  <Route path="/projects/:projectId" element={<ProjectDetail />} />
                  <Route path="/nodes/:nodeId" element={<NodeDetail />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
