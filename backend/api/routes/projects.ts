/**
 * PROJECTS.TS
 * GET /api/projects
 * GET /api/projects/:projectId
 * Return project(s) with node counts
 */

import { Router } from 'express';
import { supabase, getProject, getProjects, getNodes } from '../config';
import { ProjectsResponse, ProjectWithCounts, ErrorResponse } from '../types';

const router = Router();

/**
 * GET /api/projects
 * Return all projects (for ProjectLedger)
 */
router.get('/', async (req, res) => {
  try {
    const { profileId = 'prentiss-frontier-operator' } = req.query;

    // Get all projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('profile_id', profileId as string)
      .order('gravity_score', { ascending: false });

    if (error) throw error;

    // Enrich with node counts
    const projectsWithCounts: ProjectWithCounts[] = await Promise.all(
      (projects || []).map(async (project) => {
        const { count } = await supabase
          .from('nodes')
          .select('id', { count: 'exact' })
          .eq('ref_id', project.id);

        return {
          ...project,
          node_count: count || 0,
        };
      })
    );

    const response: ProjectsResponse = {
      data: projectsWithCounts,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    } as ErrorResponse);
  }
});

/**
 * GET /api/projects/:projectId
 * Return single project with node count
 */
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await getProject(projectId);

    if (!project) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Project "${projectId}" not found`,
        status: 404,
      } as ErrorResponse);
    }

    // Get node count for this project
    const { count } = await supabase
      .from('nodes')
      .select('id', { count: 'exact' })
      .eq('ref_id', projectId);

    const response: ProjectWithCounts = {
      ...project,
      node_count: count || 0,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    } as ErrorResponse);
  }
});

/**
 * GET /api/projects/:projectId/nodes
 * Return nodes scoped to a project
 */
router.get('/:projectId/nodes', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // Phase 1: Single-founder mode (Prentiss)
    // Phase 2: Extract profileId from auth context/JWT
    const { data, count } = await getNodes(
      'prentiss-frontier-operator',
      projectId,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );

    res.status(200).json({
      data,
      count,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('Error fetching project nodes:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    } as ErrorResponse);
  }
});

export default router;
