/**
 * GRAPHQUERIES.TS
 * Deterministic graph query utilities for Ask-the-Graph
 * Phase 4.0: Pure functions for intent detection, entity matching, traversal
 * No dependencies, fully testable, zero side effects
 */

import { GraphNode, GraphProject, GraphEdge, NodeType } from './graphTypes';

// ============================================================================
// TYPES
// ============================================================================

export type QuestionType =
  | 'definition'             // "What is {entity}?"
  | 'relationship'           // "How are {A} and {B} connected?"
  | 'scope'                  // "What nodes are in {project}?"
  | 'patterns'               // "What patterns appear?"
  | 'causality_incoming'     // "What caused/shaped {entity}?"
  | 'causality_outgoing'     // "What did {entity} produce/lead to?"
  | 'tag_search'             // "Show nodes about {tag}"
  | 'unknown'                // Cannot parse
;

export interface ParsedQuery {
  type: QuestionType;
  primaryEntity?: string;    // Main noun (node/project title or ID)
  secondaryEntity?: string;  // For relationship queries
  tag?: string;              // For tag searches
  nodeType?: NodeType;       // For type-filtered searches
  confidence: 'high' | 'medium' | 'low';
}

export interface AnswerEvidence {
  nodeIds: Set<string>;
  projectIds: Set<string>;
  edgeIds: Set<string>;
  path?: Array<{ id: string; title: string; type: string }>;
  explanation: string;
}

// ============================================================================
// INTENT DETECTION
// ============================================================================

/**
 * Detect question type and extract entities
 * Returns parsed query with extracted entities and confidence level
 */
export function detectQuestionType(query: string): ParsedQuery {
  if (!query || query.trim().length === 0) {
    return { type: 'unknown', confidence: 'low' };
  }

  const q = query.toLowerCase().trim();

  // "What is {entity}?" or "What is {entity}?"
  const whatIsMatch = q.match(/^what\s+(?:is|are)\s+(.+?)\??$/);
  if (whatIsMatch) {
    return {
      type: 'definition',
      primaryEntity: whatIsMatch[1].trim(),
      confidence: 'high',
    };
  }

  // "How are {A} and {B} connected?"
  const howConnectedMatch = q.match(/how\s+(?:are|is)\s+(.+?)\s+and\s+(.+?)\s*connected\??/);
  if (howConnectedMatch) {
    return {
      type: 'relationship',
      primaryEntity: howConnectedMatch[1].trim(),
      secondaryEntity: howConnectedMatch[2].trim(),
      confidence: 'high',
    };
  }

  // "What {type} nodes are in {project}?" or "What nodes are in {project}?"
  const scopeMatch = q.match(/what\s+(?:(\w+)\s+)?nodes?\s+(?:are\s+)?in\s+(.+?)\??$/);
  if (scopeMatch) {
    return {
      type: 'scope',
      primaryEntity: scopeMatch[2].trim(),
      nodeType: scopeMatch[1] ? (scopeMatch[1] as NodeType) : undefined,
      confidence: 'high',
    };
  }

  // "What patterns appear?" or "What patterns exist?"
  if (q.match(/what\s+patterns?\s+(?:appear|exist)/)) {
    return {
      type: 'patterns',
      confidence: 'high',
    };
  }

  // "What caused/shaped {entity}?" or "What influenced {entity}?"
  const incomingMatch = q.match(/what\s+(?:caused|shaped|influenced|drives?|affects?)\s+(.+?)\??$/);
  if (incomingMatch) {
    return {
      type: 'causality_incoming',
      primaryEntity: incomingMatch[1].trim(),
      confidence: 'high',
    };
  }

  // "What did {entity} produce/lead to/create?"
  const outgoingMatch = q.match(/what\s+(?:did|does)\s+(.+?)\s+(?:produce|lead|create|enable|generate|result in)\s*\??$/);
  if (outgoingMatch) {
    return {
      type: 'causality_outgoing',
      primaryEntity: outgoingMatch[1].trim(),
      confidence: 'high',
    };
  }

  // "Show nodes about {tag}" or "nodes related to {tag}"
  const tagMatch = q.match(/(?:show|find|nodes?)\s+(?:about|related\s+to|concerning)\s+(.+?)\??$/);
  if (tagMatch) {
    return {
      type: 'tag_search',
      tag: tagMatch[1].trim(),
      confidence: 'medium',
    };
  }

  // Fallback: treat as tag search (generic query)
  if (q.length > 2) {
    return {
      type: 'tag_search',
      tag: q,
      confidence: 'low',
    };
  }

  return { type: 'unknown', confidence: 'low' };
}

// ============================================================================
// ENTITY MATCHING
// ============================================================================

/**
 * Find a single node by title or ID
 * Returns best match or null
 * Priority: exact title > exact ID > prefix title > prefix ID
 */
export function findNodeByTitle(
  nodes: GraphNode[],
  query: string
): GraphNode | null {
  if (!query || !nodes.length) return null;

  const q = query.toLowerCase();

  // Exact title match (highest priority)
  for (const node of nodes) {
    if (node.title.toLowerCase() === q) return node;
  }

  // Exact ID match
  for (const node of nodes) {
    if (node.id.toLowerCase() === q) return node;
  }

  // Prefix title match
  for (const node of nodes) {
    if (node.title.toLowerCase().startsWith(q)) return node;
  }

  // Prefix ID match
  for (const node of nodes) {
    if (node.id.toLowerCase().startsWith(q)) return node;
  }

  // Loose title match (contains)
  for (const node of nodes) {
    if (node.title.toLowerCase().includes(q)) return node;
  }

  return null;
}

/**
 * Find a single project by title or ID
 */
export function findProjectByTitle(
  projects: GraphProject[],
  query: string
): GraphProject | null {
  if (!query || !projects.length) return null;

  const q = query.toLowerCase();

  // Exact title match
  for (const proj of projects) {
    if (proj.title.toLowerCase() === q) return proj;
  }

  // Exact ID match
  for (const proj of projects) {
    if (proj.id.toLowerCase() === q) return proj;
  }

  // Prefix title match
  for (const proj of projects) {
    if (proj.title.toLowerCase().startsWith(q)) return proj;
  }

  // Prefix ID match
  for (const proj of projects) {
    if (proj.id.toLowerCase().startsWith(q)) return proj;
  }

  // Loose match
  for (const proj of projects) {
    if (proj.title.toLowerCase().includes(q)) return proj;
  }

  return null;
}

/**
 * Find nodes or projects by either
 */
export function findEntityByTitle(
  nodes: GraphNode[],
  projects: GraphProject[],
  query: string
): { type: 'node'; data: GraphNode } | { type: 'project'; data: GraphProject } | null {
  // Try project first (usually what "is" refers to)
  const proj = findProjectByTitle(projects, query);
  if (proj) return { type: 'project', data: proj };

  const node = findNodeByTitle(nodes, query);
  if (node) return { type: 'node', data: node };

  return null;
}

// ============================================================================
// GRAPH TRAVERSAL
// ============================================================================

/**
 * Build adjacency map from edges
 * Returns Map<nodeId, Set<connectedNodeIds>>
 * Bidirectional: if A→B exists, both A and B are neighbors
 */
export function buildAdjacencyMap(edges: GraphEdge[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  for (const edge of edges) {
    // Add both directions
    if (!adjacency.has(edge.source_id)) {
      adjacency.set(edge.source_id, new Set());
    }
    adjacency.get(edge.source_id)!.add(edge.target_id);

    if (!adjacency.has(edge.target_id)) {
      adjacency.set(edge.target_id, new Set());
    }
    adjacency.get(edge.target_id)!.add(edge.source_id);
  }

  return adjacency;
}

/**
 * Get incoming edges to a node
 * Returns edges where target_id === nodeId
 */
export function getIncomingEdges(edges: GraphEdge[], nodeId: string): GraphEdge[] {
  return edges.filter(e => e.target_id === nodeId);
}

/**
 * Get outgoing edges from a node
 * Returns edges where source_id === nodeId
 */
export function getOutgoingEdges(edges: GraphEdge[], nodeId: string): GraphEdge[] {
  return edges.filter(e => e.source_id === nodeId);
}

/**
 * Find all neighbors of a node (1-hop)
 * Returns { inbound: source nodes, outbound: target nodes, edges }
 */
export function getConnectedNodes(
  nodes: GraphNode[],
  projects: GraphProject[],
  edges: GraphEdge[],
  nodeId: string
): {
  inbound: Array<{ type: 'node' | 'project'; data: GraphNode | GraphProject; edge: GraphEdge }>;
  outbound: Array<{ type: 'node' | 'project'; data: GraphNode | GraphProject; edge: GraphEdge }>;
} {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const projectMap = new Map(projects.map(p => [p.id, p]));

  const inbound: typeof getConnectedNodes.prototype.inbound = [];
  const outbound: typeof getConnectedNodes.prototype.outbound = [];

  for (const edge of edges) {
    if (edge.target_id === nodeId) {
      // Incoming edge
      const sourceNode = nodeMap.get(edge.source_id);
      if (sourceNode) {
        inbound.push({ type: 'node', data: sourceNode, edge });
      } else {
        const sourceProject = projectMap.get(edge.source_id);
        if (sourceProject) {
          inbound.push({ type: 'project', data: sourceProject, edge });
        }
      }
    }

    if (edge.source_id === nodeId) {
      // Outgoing edge
      const targetNode = nodeMap.get(edge.target_id);
      if (targetNode) {
        outbound.push({ type: 'node', data: targetNode, edge });
      } else {
        const targetProject = projectMap.get(edge.target_id);
        if (targetProject) {
          outbound.push({ type: 'project', data: targetProject, edge });
        }
      }
    }
  }

  return { inbound, outbound };
}

/**
 * Find shortest path between two nodes (BFS, max 3 hops)
 * Returns path as array of node IDs and connecting edges
 */
export function findShortestPath(
  _nodes: GraphNode[],
  edges: GraphEdge[],
  sourceId: string,
  targetId: string,
  maxHops: number = 3
): { path: string[]; edges: GraphEdge[] } | null {
  if (sourceId === targetId) {
    return { path: [sourceId], edges: [] };
  }

  const adjacency = buildAdjacencyMap(edges);
  const visited = new Set<string>();
  const queue: Array<{ id: string; path: string[] }> = [{ id: sourceId, path: [sourceId] }];
  const edgeMap = new Map<string, GraphEdge>();

  // Build edge lookup for quick access
  for (const edge of edges) {
    const key = `${edge.source_id}→${edge.target_id}`;
    edgeMap.set(key, edge);
  }

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;

    if (path.length > maxHops + 1) continue;
    if (visited.has(id)) continue;
    visited.add(id);

    if (id === targetId) {
      // Reconstruct edges
      const pathEdges: GraphEdge[] = [];
      for (let i = 0; i < path.length - 1; i++) {
        const edge = edgeMap.get(`${path[i]}→${path[i + 1]}`);
        if (edge) {
          pathEdges.push(edge);
        }
      }
      return { path, edges: pathEdges };
    }

    const neighbors = adjacency.get(id) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({ id: neighbor, path: [...path, neighbor] });
      }
    }
  }

  return null;
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

/**
 * Find most common relationship types across edges
 */
export function findCommonRelationships(
  edges: GraphEdge[]
): Array<{ type: string; count: number; percentage: number }> {
  const counts = new Map<string, number>();

  for (const edge of edges) {
    counts.set(edge.relationship_type, (counts.get(edge.relationship_type) ?? 0) + 1);
  }

  const total = edges.length || 1;
  const results = Array.from(counts.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return results;
}

/**
 * Find nodes sharing a common tag
 */
export function findNodesByTag(nodes: GraphNode[], tag: string): GraphNode[] {
  const q = tag.toLowerCase();
  return nodes.filter(node =>
    node.tags && node.tags.some(t => t.toLowerCase().includes(q))
  );
}

/**
 * Find nodes within a project
 */
export function findNodesInProject(nodes: GraphNode[], projectId: string): GraphNode[] {
  return nodes.filter(n => n.project_id === projectId);
}

/**
 * Find nodes by type
 */
export function findNodesByType(nodes: GraphNode[], type: NodeType): GraphNode[] {
  return nodes.filter(n => n.type === type);
}

// ============================================================================
// EVIDENCE EXTRACTION
// ============================================================================

/**
 * Extract evidence set from a definition query result
 */
export function extractDefinitionEvidence(
  entity: GraphNode | GraphProject
): AnswerEvidence {
  if ('project_id' in entity) {
    // It's a node
    const node = entity as GraphNode;
    return {
      nodeIds: new Set([node.id]),
      projectIds: new Set(),
      edgeIds: new Set(),
      explanation: `Definition of "${node.title}"`,
    };
  } else {
    // It's a project
    const project = entity as GraphProject;
    return {
      nodeIds: new Set(),
      projectIds: new Set([project.id]),
      edgeIds: new Set(),
      explanation: `Definition of "${project.title}"`,
    };
  }
}

/**
 * Extract evidence from relationship query
 */
export function extractRelationshipEvidence(
  path: { path: string[]; edges: GraphEdge[] } | null,
  nodes: GraphNode[],
  projects: GraphProject[]
): AnswerEvidence {
  if (!path) {
    return {
      nodeIds: new Set(),
      projectIds: new Set(),
      edgeIds: new Set(),
      explanation: 'No connection found',
    };
  }

  const nodeIds = new Set<string>();
  const projectIds = new Set<string>();
  const edgeIds = new Set<string>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const projectMap = new Map(projects.map(p => [p.id, p]));

  // Add all path nodes/projects
  for (const id of path.path) {
    if (nodeMap.has(id)) nodeIds.add(id);
    if (projectMap.has(id)) projectIds.add(id);
  }

  // Add edges
  for (const edge of path.edges) {
    edgeIds.add(edge.id);
  }

  // Build path explanation
  const pathLabels = path.path.map(id => {
    const node = nodeMap.get(id);
    if (node) return node.title;
    const project = projectMap.get(id);
    if (project) return project.title;
    return id;
  });

  const explanation = `Path: ${pathLabels.join(' → ')}`;

  return {
    nodeIds,
    projectIds,
    edgeIds,
    path: path.path.map(id => {
      const node = nodeMap.get(id);
      if (node) return { id, title: node.title, type: 'node' };
      const project = projectMap.get(id);
      if (project) return { id, title: project.title, type: 'project' };
      return { id, title: id, type: 'unknown' };
    }),
    explanation,
  };
}

/**
 * Extract evidence from incoming/outgoing edges
 */
export function extractEdgeEvidence(
  edges: Array<{ type: 'node' | 'project'; data: GraphNode | GraphProject; edge: GraphEdge }>,
  direction: 'incoming' | 'outgoing'
): AnswerEvidence {
  const nodeIds = new Set<string>();
  const projectIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const item of edges) {
    if (item.type === 'node') {
      nodeIds.add(item.data.id);
    } else {
      projectIds.add(item.data.id);
    }
    edgeIds.add(item.edge.id);
  }

  return {
    nodeIds,
    projectIds,
    edgeIds,
    explanation: `${direction === 'incoming' ? 'Sources of influence' : 'Results of influence'}: ${edges
      .map(e => e.data.title)
      .join(', ')}`,
  };
}
