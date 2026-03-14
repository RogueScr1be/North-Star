/**
 * GRAPHTYPES.TS
 * Typed contracts for constellation canvas API responses
 * Phase 2.2: Read-only graph rendering
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

/**
 * GraphNode from /api/graph response
 * Includes persisted x, y, z coordinates
 */
export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  gravity_score: number;
  tags: string[];
  is_featured: boolean;
  x: number;
  y: number;
  z: number;
  project_id?: string | null;
}

/**
 * GraphProject from /api/graph response
 * Uses x_derived, y_derived, z_derived (computed from child nodes)
 */
export interface GraphProject {
  id: string;
  title: string;
  description: string;
  gravity_score: number;
  is_featured: boolean;
  x_derived: number;
  y_derived: number;
  z_derived: number;
}

/**
 * GraphEdge from /api/graph response
 * Connects node IDs and/or project IDs
 */
export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: RelationshipType;
}

/**
 * Metadata from /api/graph response
 */
export interface GraphMetadata {
  node_count: number;
  project_count: number;
  edge_count: number;
  relationship_types: RelationshipType[];
  generated_at: string;
}

/**
 * Full response from GET /api/graph
 */
export interface GraphResponse {
  nodes: GraphNode[];
  projects: GraphProject[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

/**
 * Resolved edge with concrete 3D positions
 * Used internally by rendering pipeline
 */
export interface ResolvedEdge {
  id: string;
  source: [number, number, number];
  target: [number, number, number];
  relationship_type: RelationshipType;
}

/**
 * Vertex lookup: maps vertex ID to 3D position
 * Key: node ID or project ID
 * Value: [x, y, z]
 */
export type VertexMap = Map<string, [number, number, number]>;

/**
 * Graph bounds for camera framing
 */
export interface GraphBounds {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
}
