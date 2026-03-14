/**
 * USEPROFILE.TS
 * Hook to fetch founder profile data
 */

import { useState, useEffect } from 'react';
import { Profile, ProjectWithCounts } from '../lib/types';
import { fetchProfile, APIError } from '../lib/api';

interface UseProfileResult {
  profile: Profile | null;
  projects: ProjectWithCounts[];
  loading: boolean;
  error: APIError | null;
}

export function useProfile(slug: string): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchProfile(slug);
        setProfile(data.data);
        setProjects(data.projects);
      } catch (err) {
        setError(err instanceof APIError ? err : new APIError(500, 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [slug]);

  return { profile, projects, loading, error };
}
