/**
 * CONFIG.TS
 * Supabase client setup and environment configuration
 * Phase 1: Read-only, public data access
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjc3MDAwMDAwLCJleHAiOjE3MDg1MzYwMDB9.fake_key_for_dev';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// ============================================================================
// DATABASE QUERIES (Prepared helpers)
// ============================================================================

/**
 * Get profile by ID
 */
export async function getProfile(profileId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all projects for a profile
 */
export async function getProjects(profileId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('profile_id', profileId)
    .order('gravity_score', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get single project
 */
export async function getProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get nodes for a project (or all if no project)
 */
export async function getNodes(profileId: string, projectId?: string, limit = 50, offset = 0) {
  let query = supabase
    .from('nodes')
    .select('*', { count: 'exact' })
    .eq('profile_id', profileId);

  if (projectId) {
    query = query.eq('ref_id', projectId);
  }

  const { data, error, count } = await query
    .order('gravity_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
}

/**
 * Get single node
 */
export async function getNode(nodeId: string) {
  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', nodeId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get edges for a node (incoming and outgoing)
 */
export async function getNodeEdges(nodeId: string) {
  // Incoming edges (this node is the target)
  const { data: incoming, error: inError } = await supabase
    .from('edges')
    .select('*, source_node:source_id(id,type,title,gravity_score)')
    .eq('target_id', nodeId);

  // Outgoing edges (this node is the source)
  const { data: outgoing, error: outError } = await supabase
    .from('edges')
    .select('*, target_node:target_id(id,type,title,gravity_score)')
    .eq('source_id', nodeId);

  if (inError || outError) throw inError || outError;

  return {
    incoming: incoming || [],
    outgoing: outgoing || [],
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const VALID_NODE_TYPES = ['project', 'decision', 'constraint', 'failure', 'metric', 'skill', 'outcome', 'experiment'] as const;

export const VALID_RELATIONSHIP_TYPES = [
  'demonstrates',
  'produces',
  'shapes',
  'requires',
  'shares_pattern',
  'enables',
  'leads_to',
  'contains',
] as const;

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function healthCheck() {
  try {
    const { data } = await supabase.from('profiles').select('id').limit(1);
    return { status: 'healthy', data };
  } catch (error) {
    return { status: 'unhealthy', error };
  }
}
