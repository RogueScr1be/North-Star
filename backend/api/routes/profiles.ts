/**
 * PROFILES.TS
 * GET /api/profiles/:slug
 * Return founder profile with featured projects
 */

import { Router } from 'express';
import { getProfile, getProjects } from '../config';
import { ProfileResponse, ErrorResponse } from '../types';

const router = Router();

/**
 * GET /api/profiles/:slug
 * Return founder profile + featured projects
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Get profile by ID (slug is the profile ID in Phase 1)
    const profile = await getProfile(slug);

    if (!profile) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Profile "${slug}" not found`,
        status: 404,
      } as ErrorResponse);
    }

    // Get all projects for this profile
    const projects = await getProjects(profile.id);

    // Filter to featured projects only for this endpoint
    const featuredProjects = projects.filter((p) => p.is_featured);

    const response: ProfileResponse = {
      data: profile,
      projects: featuredProjects.map((p) => ({
        ...p,
        // Phase 2: node_count calculation from database query or cache
        // For now, clients should use GET /api/projects/:projectId to get node_count
        node_count: 0,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    } as ErrorResponse);
  }
});

export default router;
