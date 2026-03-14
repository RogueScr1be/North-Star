/**
 * GRAPHTRANSFORMS.TS
 * Transform raw graph response into renderable objects
 * Responsibilities:
 * - Build vertex lookup maps
 * - Resolve edges into renderable endpoints
 * - Expose unresolved edges for diagnostics
 */

import {
  GraphResponse,
  GraphNode,
  GraphProject,
  GraphEdge,
  ResolvedEdge,
  VertexMap,
} from './graphTypes';

/**
 * Build a lookup map: vertex ID → [x, y, z] position
 * Includes both nodes and projects
 */
export function buildVertexMap(data: GraphResponse): VertexMap {
  const map = new Map<string, [number, number, number]>();

  // Add all nodes
  for (const node of data.nodes) {
    map.set(node.id, [node.x, node.y, node.z]);
  }

  // Add all projects
  for (const proj of data.projects) {
    map.set(proj.id, [proj.x_derived, proj.y_derived, proj.z_derived]);
  }

  return map;
}

/**
 * Resolve a single edge to concrete 3D endpoints
 * Returns null if either endpoint cannot be resolved
 */
export function resolveSingleEdge(
  edge: GraphEdge,
  vertexMap: VertexMap
): ResolvedEdge | null {
  const source = vertexMap.get(edge.source_id);
  const target = vertexMap.get(edge.target_id);

  if (!source || !target) {
    return null;
  }

  return {
    id: edge.id,
    source,
    target,
    relationship_type: edge.relationship_type,
  };
}

/**
 * Resolve all edges, returning resolved list and diagnostics
 */
export interface ResolveEdgesResult {
  resolved: ResolvedEdge[];
  unresolved: Array<{
    edge_id: string;
    source_id: string;
    target_id: string;
    reason: string;
  }>;
}

export function resolveAllEdges(
  data: GraphResponse,
  vertexMap: VertexMap
): ResolveEdgesResult {
  const resolved: ResolvedEdge[] = [];
  const unresolved: ResolveEdgesResult['unresolved'] = [];

  for (const edge of data.edges) {
    const resolved_edge = resolveSingleEdge(edge, vertexMap);

    if (resolved_edge) {
      resolved.push(resolved_edge);
    } else {
      const source = vertexMap.has(edge.source_id);
      const target = vertexMap.has(edge.target_id);

      let reason = '';
      if (!source && !target) {
        reason = 'source and target not found';
      } else if (!source) {
        reason = `source "${edge.source_id}" not found`;
      } else {
        reason = `target "${edge.target_id}" not found`;
      }

      unresolved.push({
        edge_id: edge.id,
        source_id: edge.source_id,
        target_id: edge.target_id,
        reason,
      });
    }
  }

  return { resolved, unresolved };
}

/**
 * Transform graph response into renderable objects
 * Main entry point for scene consumption
 */
export interface RenderableGraph {
  nodes: Array<GraphNode & { position: [number, number, number] }>;
  projects: Array<GraphProject & { position: [number, number, number] }>;
  edges: ResolvedEdge[];
  unresolved_edges: ResolveEdgesResult['unresolved'];
}

export function transformGraphToRenderable(
  data: GraphResponse
): RenderableGraph {
  const vertexMap = buildVertexMap(data);
  const edgeResult = resolveAllEdges(data, vertexMap);

  const nodes = data.nodes.map((node) => ({
    ...node,
    position: [node.x, node.y, node.z] as [number, number, number],
  }));

  const projects = data.projects.map((proj) => ({
    ...proj,
    position: [proj.x_derived, proj.y_derived, proj.z_derived] as [number, number, number],
  }));

  return {
    nodes,
    projects,
    edges: edgeResult.resolved,
    unresolved_edges: edgeResult.unresolved,
  };
}

/**
 * Log unresolved edges and malformed records to console
 * Called in development for diagnostics
 */
export function logGraphDiagnostics(graph: RenderableGraph): void {
  if (graph.unresolved_edges.length > 0) {
    console.warn(
      `[Graph] ${graph.unresolved_edges.length} unresolved edges:`,
      graph.unresolved_edges
    );
  } else {
    console.log(`[Graph] All ${graph.edges.length} edges resolved`);
  }
}
