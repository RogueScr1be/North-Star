/**
 * API.TS
 * Frontend API client wrapper for Phase 1 endpoints
 * Base URL: http://localhost:3001/api (configurable)
 */

import {
  Profile,
  ProjectWithCounts,
  Node,
  NodeDetailResponse,
  ErrorResponse,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class APIError extends Error {
  constructor(public status: number, public message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = (await response.json()) as ErrorResponse;
    throw new APIError(response.status, error.message || 'Unknown error');
  }
  return response.json();
}

// ============================================================================
// PROFILES
// ============================================================================

export async function fetchProfile(slug: string): Promise<{ data: Profile; projects: ProjectWithCounts[] }> {
  const response = await fetch(`${API_BASE}/profiles/${slug}`);
  return handleResponse(response);
}

// ============================================================================
// PROJECTS
// ============================================================================

export async function fetchProjects(profileId = 'prentiss-frontier-operator'): Promise<{ data: ProjectWithCounts[] }> {
  const response = await fetch(`${API_BASE}/projects?profileId=${profileId}`);
  return handleResponse(response);
}

export async function fetchProject(projectId: string): Promise<ProjectWithCounts> {
  const response = await fetch(`${API_BASE}/projects/${projectId}`);
  return handleResponse(response);
}

export async function fetchProjectNodes(
  projectId: string,
  limit = 50,
  offset = 0
): Promise<{ data: Node[]; count: number; limit: number; offset: number }> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/nodes?limit=${limit}&offset=${offset}`);
  return handleResponse(response);
}

// ============================================================================
// NODES
// ============================================================================

export async function fetchNode(nodeId: string): Promise<NodeDetailResponse> {
  const response = await fetch(`${API_BASE}/nodes/${nodeId}`);
  return handleResponse(response);
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
