/**
 * USEPROJECTS.TS
 * Hook to fetch all projects
 */

import { useState, useEffect } from 'react';
import { ProjectWithCounts } from '../lib/types';
import { fetchProjects, APIError } from '../lib/api';

interface UseProjectsResult {
  projects: ProjectWithCounts[];
  loading: boolean;
  error: APIError | null;
}

export function useProjects(profileId = 'prentiss-frontier-operator'): UseProjectsResult {
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchProjects(profileId);
        setProjects(data.data);
      } catch (err) {
        setError(err instanceof APIError ? err : new APIError(500, 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [profileId]);

  return { projects, loading, error };
}
