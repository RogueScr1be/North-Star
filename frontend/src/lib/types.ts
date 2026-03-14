/**
 * TYPES.TS
 * Frontend type definitions (Phase 1 API contract)
 * Mirrors backend/api/types.ts for use in frontend
 */

export type NodeType = 'project' | 'decision' | 'constraint' | 'failure' | 'metric' | 'skill' | 'outcome' | 'experiment';

export type RelationshipType =
  | 'demonstrates'
  | 'produces'
  | 'shapes'
  | 'requires'
  | 'shares_pattern'
  | 'enables'
  | 'leads_to'
  | 'contains'
  | 'improves'
  | 'uses'
  | 'causes'
  | 'conflicts_with'
  | 'depends_on'
  | 'derived_from';

export type SourceAttribution = 'explicit' | 'strongly_inferred' | 'weakly_inferred';

export interface Profile {
  id: string;
  name: string;
  title: string;
  headline: string;
  focus_areas: string[];
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  profile_id: string;
  name: string;
  short_desc: string;
  system_design?: string;
  status: 'active' | 'archived' | 'planned';
  gravity_score: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithCounts extends Project {
  node_count: number;
}

export interface Evidence {
  source: string;
  detail: string;
  url?: string;
}

export interface NodeMetadata {
  status?: 'active' | 'archived' | 'planned' | 'gap';
  evidence?: Evidence[];
  [key: string]: any;
}

export interface Node {
  id: string;
  profile_id: string;
  type: NodeType;
  title: string;
  description?: string;
  gravity_score: number;
  tags: string[];
  is_featured: boolean;
  source_attribution: SourceAttribution;
  ref_table?: string;
  ref_id?: string;
  metadata_json: NodeMetadata;
  created_at: string;
  updated_at: string;
}

export interface Edge {
  id: string;
  profile_id: string;
  source_id: string;
  target_id: string;
  relationship_type: RelationshipType;
  created_at: string;
  updated_at: string;
}

export interface EdgeWithNodes extends Edge {
  source_node: Node;
  target_node: Node;
}

export interface ProfileResponse {
  data: Profile;
  projects: ProjectWithCounts[];
}

export interface ProjectsResponse {
  data: ProjectWithCounts[];
}

export interface NodesResponse {
  data: Node[];
  count: number;
}

export interface NodeDetailResponse {
  data: Node;
  edges: {
    incoming: EdgeWithNodes[];
    outgoing: EdgeWithNodes[];
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  status: number;
}
