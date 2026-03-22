/**
 * GRAPHSEMANTICS.TS
 * Semantic graph navigation: subgraph isolation, clustering, filtering
 * Phase 5.5: Intelligent exploration without new dependencies
 */

import type { RenderableGraph } from './graphTransforms';
import type { GraphEdge } from './graphTypes';

/**
 * Semantic visibility state: which nodes/edges to render
 */
export interface SemanticVisibility {
  // Nodes and projects to render (by ID)
  visibleNodeIds: Set<string>;
  visibleProjectIds: Set<string>;
  visibleEdgeIds: Set<string>;

  // Why nodes/edges are visible (for rendering feedback)
  reason: 'all' | 'subgraph' | 'project_cluster' | 'filtered';
}

/**
 * Semantic filter configuration
 */
export interface SemanticFilters {
  // Subgraph mode: isolate one node and its neighborhood
  subgraphNodeId?: string;
  subgraphHops?: number; // 1=direct neighbors, 2=neighbors of neighbors, etc.

  // Project cluster mode: show only this project's nodes
  projectClusterId?: string;

  // Node type filters: which types to show
  enabledNodeTypes: Set<string>;

  // Tag filters: show only nodes with these tags
  enabledTags: Set<string>; // empty = all tags enabled

  // Edge strength: show only edges where both endpoints have gravity >= threshold
  edgeGravityThreshold?: number; // 0.0 to 1.0, undefined = no filter

  // Relationship type filters: which relationships to show
  enabledRelationshipTypes: Set<string>; // empty = all types enabled
}

/**
 * Compute nodes reachable from a starting node within N hops
 * BFS with gravity weighting (closer nodes prioritized)
 */
export function computeSubgraph(
  _graph: RenderableGraph,
  edges: GraphEdge[],
  startNodeId: string,
  maxHops: number = 2
): Set<string> {
  const reachable = new Set<string>();
  const queue: Array<{ id: string; hops: number }> = [{ id: startNodeId, hops: 0 }];

  reachable.add(startNodeId);

  while (queue.length > 0) {
    const { id, hops } = queue.shift()!;

    if (hops >= maxHops) continue;

    // Find all edges touching this node
    for (const edge of edges) {
      let neighbor: string | null = null;

      if (edge.source_id === id) {
        neighbor = edge.target_id;
      } else if (edge.target_id === id) {
        neighbor = edge.source_id;
      }

      if (neighbor && !reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push({ id: neighbor, hops: hops + 1 });
      }
    }
  }

  return reachable;
}

/**
 * Compute all nodes in a project cluster (including transitive connections)
 */
export function computeProjectCluster(
  graph: RenderableGraph,
  projectId: string
): Set<string> {
  const cluster = new Set<string>();

  // All nodes with this project_id
  for (const node of graph.nodes) {
    if (node.project_id === projectId) {
      cluster.add(node.id);
    }
  }

  // Include the project itself
  cluster.add(projectId);

  return cluster;
}

/**
 * Filter nodes by type and tags
 */
export function filterNodesByAttributes(
  graph: RenderableGraph,
  enabledTypes: Set<string>,
  enabledTags: Set<string>
): Set<string> {
  const filtered = new Set<string>();

  for (const node of graph.nodes) {
    // Check type
    if (enabledTypes.size > 0 && !enabledTypes.has(node.type)) {
      continue;
    }

    // Check tags
    if (enabledTags.size > 0) {
      const hasEnabledTag = node.tags.some(tag => enabledTags.has(tag));
      if (!hasEnabledTag) {
        continue;
      }
    }

    filtered.add(node.id);
  }

  return filtered;
}

/**
 * Filter edges by relationship type and gravity threshold
 * Only includes edges where BOTH endpoints have gravity >= threshold
 */
export function filterEdgesByStrength(
  graph: RenderableGraph,
  edges: GraphEdge[],
  visibleNodeIds: Set<string>,
  visibleProjectIds: Set<string>,
  gravityThreshold?: number,
  enabledRelationshipTypes?: Set<string>
): Set<string> {
  const filtered = new Set<string>();

  // Build gravity map for quick lookup
  const gravityMap = new Map<string, number>();
  for (const node of graph.nodes) {
    gravityMap.set(node.id, node.gravity_score);
  }
  for (const project of graph.projects) {
    gravityMap.set(project.id, project.gravity_score);
  }

  for (const edge of edges) {
    // Skip if endpoints not visible
    const sourceVisible = visibleNodeIds.has(edge.source_id) || visibleProjectIds.has(edge.source_id);
    const targetVisible = visibleNodeIds.has(edge.target_id) || visibleProjectIds.has(edge.target_id);

    if (!sourceVisible || !targetVisible) {
      continue;
    }

    // Check relationship type
    if (enabledRelationshipTypes && enabledRelationshipTypes.size > 0) {
      if (!enabledRelationshipTypes.has(edge.relationship_type)) {
        continue;
      }
    }

    // Check gravity threshold
    if (gravityThreshold !== undefined) {
      const sourceGravity = gravityMap.get(edge.source_id) ?? 0;
      const targetGravity = gravityMap.get(edge.target_id) ?? 0;

      if (sourceGravity < gravityThreshold || targetGravity < gravityThreshold) {
        continue;
      }
    }

    filtered.add(edge.id);
  }

  return filtered;
}

/**
 * Compute shortest path between two nodes using BFS
 * Returns array of node IDs in order from source to target
 */
export function findShortestPath(
  edges: GraphEdge[],
  sourceId: string,
  targetId: string
): string[] | null {
  if (sourceId === targetId) {
    return [sourceId];
  }

  // Build adjacency map
  const adj = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adj.has(edge.source_id)) adj.set(edge.source_id, new Set());
    if (!adj.has(edge.target_id)) adj.set(edge.target_id, new Set());

    adj.get(edge.source_id)!.add(edge.target_id);
    adj.get(edge.target_id)!.add(edge.source_id);
  }

  // BFS
  const queue: Array<{ id: string; path: string[] }> = [{ id: sourceId, path: [sourceId] }];
  const visited = new Set<string>();
  visited.add(sourceId);

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;

    const neighbors = adj.get(id) || new Set();
    for (const neighbor of neighbors) {
      if (neighbor === targetId) {
        return [...path, targetId];
      }

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, path: [...path, neighbor] });
      }
    }
  }

  return null; // No path found
}

/**
 * Compute full semantic visibility based on filters
 */
export function computeSemanticVisibility(
  graph: RenderableGraph,
  edges: GraphEdge[],
  filters: SemanticFilters
): SemanticVisibility {
  let visibleNodeIds = new Set<string>();
  let visibleProjectIds = new Set<string>();
  let reason: SemanticVisibility['reason'] = 'all';

  // Start with all or filtered set
  if (filters.subgraphNodeId) {
    // Subgraph mode: isolate node + neighborhood
    const hops = filters.subgraphHops ?? 1;
    const subgraphIds = computeSubgraph(graph, edges, filters.subgraphNodeId, hops);

    // Add reachable nodes (projects aren't connected via edges, so won't appear in subgraph)
    for (const id of subgraphIds) {
      visibleNodeIds.add(id);
    }

    // Always preserve all projects as structural anchors (independent of subgraph topology)
    for (const project of graph.projects) {
      visibleProjectIds.add(project.id);
    }

    reason = 'subgraph';
  } else if (filters.projectClusterId) {
    // Project cluster mode: show only this project's nodes
    const cluster = computeProjectCluster(graph, filters.projectClusterId);

    for (const id of cluster) {
      if (graph.nodes.find(n => n.id === id)) {
        visibleNodeIds.add(id);
      } else if (graph.projects.find(p => p.id === id)) {
        visibleProjectIds.add(id);
      }
    }

    reason = 'project_cluster';
  } else {
    // All nodes and projects (may be filtered by type/tags below)
    for (const node of graph.nodes) {
      visibleNodeIds.add(node.id);
    }
    for (const project of graph.projects) {
      visibleProjectIds.add(project.id);
    }

    reason = 'all';
  }

  // Apply type/tag filtering (refines visible set)
  if (filters.enabledNodeTypes.size > 0 || filters.enabledTags.size > 0) {
    const attributeFiltered = filterNodesByAttributes(
      graph,
      filters.enabledNodeTypes,
      filters.enabledTags
    );

    visibleNodeIds = new Set(
      Array.from(visibleNodeIds).filter(id => attributeFiltered.has(id))
    );

    reason = 'filtered';
  }

  // Compute visible edges
  const visibleEdgeIds = filterEdgesByStrength(
    graph,
    edges,
    visibleNodeIds,
    visibleProjectIds,
    filters.edgeGravityThreshold,
    filters.enabledRelationshipTypes
  );

  return {
    visibleNodeIds,
    visibleProjectIds,
    visibleEdgeIds,
    reason
  };
}
