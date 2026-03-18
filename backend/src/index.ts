/**
 * INDEX.TS
 * North Star Backend Server
 * Phase 1: Read-only REST API for static knowledge graph
 */

import 'dotenv/config';

import express, { Request, Response } from 'express';
import cors from 'cors';

import profilesRouter from '../api/routes/profiles';
import graphRouter from '../api/routes/graph';
import projectsRouter from '../api/routes/projects';
import nodesRouter from '../api/routes/nodes';
import askGraphRouter from '../api/routes/askGraph';
import { healthCheck } from '../api/config';

// ============================================================================
// EXPRESS SETUP
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================================
// ROUTES
// ============================================================================

app.use('/api/profiles', profilesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/nodes', nodesRouter);
app.use('/api/graph', graphRouter);
app.use('/api/ask-graph', askGraphRouter);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', async (req: Request, res: Response) => {
  try {
    const check = await healthCheck();
    if (check.status === 'healthy') {
      res.status(200).json({ status: 'healthy', message: 'API is running' });
    } else {
      res.status(503).json({ status: 'unhealthy', message: 'Database connection failed' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    status: 404,
  });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((error: any, req: Request, res: Response) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: error.message || 'Unknown error',
    status: 500,
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`✅ North Star Backend running on port ${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

export default app;
