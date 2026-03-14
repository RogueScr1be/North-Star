/**
 * HIGHLIGHTING.TS
 * Graph adjacency and selection highlight state computation
 * Phase 2.4: Visual feedback for selected nodes/projects
 */

import type { RenderableGraph } from './graphTransforms';
import type { GraphEdge } from './graphTypes';

/**
 * Role of an item in the graph relative to selection
 */
export type HighlightRole = 'selected' | 'adjacent' | 'default' | 'deemphasized';

/**
 * Highlight state for rendering
 */
export interface HighlightState {
  selectedId: string | null;
  selectedRole: Map<string, HighlightRole>; // node/project id → role
  connectedEdgeIds: Set<string>; // edges connected to selected item
}

/**
 * Build adjacency map: each node/project → set of directly connected ids
 */
function buildAdjacencyMap(graph: RenderableGraph, edges: GraphEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();

  // Initialize all node and project ids
  for (const node of graph.nodes) {
    adj.set(node.id, new Set());
  }
  for (const proj of graph.projects) {
    adj.set(proj.id, new Set());
  }

  // Add bidirectional edges (using original GraphEdge IDs)
  for (const edge of edges) {
    const sourceSet = adj.get(edge.source_id);
    const targetSet = adj.get(edge.target_id);

    if (sourceSet) sourceSet.add(edge.target_id);
    if (targetSet) targetSet.add(edge.source_id);
  }

  return adj;
}

/**
 * Compute highlight state for all nodes/projects given a selected item
 */
export function computeHighlightState(
  graph: RenderableGraph,
  edges: GraphEdge[],
  selectedId: string | null
): HighlightState {
  const selectedRole = new Map<string, HighlightRole>();
  const connectedEdgeIds = new Set<string>();

  // If nothing selected, everything is default (normal visibility)
  if (!selectedId) {
    for (const node of graph.nodes) {
      selectedRole.set(node.id, 'default');
    }
    for (const proj of graph.projects) {
      selectedRole.set(proj.id, 'default');
    }
    return { selectedId: null, selectedRole, connectedEdgeIds };
  }

  // Build adjacency once
  const adjacency = buildAdjacencyMap(graph, edges);
  const adjacentIds = adjacency.get(selectedId) || new Set();

  // Assign roles: selected, adjacent, or deemphasized
  for (const node of graph.nodes) {
    if (node.id === selectedId) {
      selectedRole.set(node.id, 'selected');
    } else if (adjacentIds.has(node.id)) {
      selectedRole.set(node.id, 'adjacent');
    } else {
      selectedRole.set(node.id, 'deemphasized');
    }
  }

  for (const proj of graph.projects) {
    if (proj.id === selectedId) {
      selectedRole.set(proj.id, 'selected');
    } else if (adjacentIds.has(proj.id)) {
      selectedRole.set(proj.id, 'adjacent');
    } else {
      selectedRole.set(proj.id, 'deemphasized');
    }
  }

  // Collect edges touching selected item (using original edge IDs)
  for (const edge of edges) {
    if (edge.source_id === selectedId || edge.target_id === selectedId) {
      connectedEdgeIds.add(edge.id);
    }
  }

  return { selectedId, selectedRole, connectedEdgeIds };
}

/**
 * Get RGB color for a node/project based on highlight role
 * selected: bright (0.9, 0.9, 0.9)
 * adjacent: medium (0.75, 0.75, 0.75)
 * default: normal (0.6, 0.6, 0.6) - used when nothing is selected
 * deemphasized: dim (0.35, 0.35, 0.35) - used when something is selected but this item is not adjacent
 */
export function getHighlightColor(role: HighlightRole): [number, number, number] {
  switch (role) {
    case 'selected':
      return [0.95, 0.95, 0.95];
    case 'adjacent':
      return [0.80, 0.80, 0.80];
    case 'default':
      return [0.75, 0.75, 0.75];
    case 'deemphasized':
      return [0.40, 0.40, 0.40];
  }
}

/**
 * Get RGB color for a project based on highlight role
 * Overlays the base pink with highlight role
 * selected: bright pink (1.0, 0.6, 0.8)
 * adjacent: medium pink (1.0, 0.5, 0.7)
 * default: normal pink (1.0, 0.412, 0.706) - used when nothing is selected
 * deemphasized: dim pink (0.8, 0.3, 0.55) - used when something is selected but this project is not adjacent
 */
export function getProjectHighlightColor(role: HighlightRole): [number, number, number] {
  switch (role) {
    case 'selected':
      return [1.0, 0.6, 0.8];
    case 'adjacent':
      return [1.0, 0.5, 0.7];
    case 'default':
      return [1.0, 0.412, 0.706];
    case 'deemphasized':
      return [0.8, 0.3, 0.55];
  }
}

/**
 * Get RGB color for an edge based on highlight state
 * connected: bright (1.0, 0.4, 0.4)
 * default: dim (0.4, 0.4, 0.4)
 */
export function getEdgeHighlightColor(
  isConnected: boolean
): [number, number, number] {
  return isConnected ? [1.0, 0.4, 0.4] : [0.4, 0.4, 0.4];
}

/**
 * Get edge opacity based on highlight state
 * connected: 0.8 (bright, fully visible)
 * default: 0.35 (dim, allows canvas to show through)
 * Used for context-aware edge readability
 */
export function getEdgeHighlightOpacity(
  isConnected: boolean,
  hasSelection: boolean
): number {
  // If nothing selected, all edges at moderate opacity
  if (!hasSelection) {
    return 0.6;
  }
  // If selected, connected edges bright, others dim
  return isConnected ? 0.8 : 0.35;
}

/**
 * Get base RGB color for a node by type (before highlight blending)
 * Palette:
 * - decision: teal (0.2, 0.8, 0.75)
 * - constraint: amber (0.95, 0.7, 0.2)
 * - failure: coral (0.9, 0.4, 0.3)
 * - metric: cyan (0.4, 0.85, 1.0)
 * - skill: lime (0.6, 0.95, 0.4)
 * - outcome: violet (0.8, 0.4, 0.9)
 * - experiment: orange (1.0, 0.55, 0.2)
 * - (default): gray (0.5, 0.5, 0.5)
 */
export function getNodeTypeColor(type: string): [number, number, number] {
  switch (type) {
    case 'decision':
      return [0.2, 0.8, 0.75]; // teal
    case 'constraint':
      return [0.95, 0.7, 0.2]; // amber
    case 'failure':
      return [0.9, 0.4, 0.3]; // coral
    case 'metric':
      return [0.4, 0.85, 1.0]; // cyan
    case 'skill':
      return [0.6, 0.95, 0.4]; // lime
    case 'outcome':
      return [0.8, 0.4, 0.9]; // violet
    case 'experiment':
      return [1.0, 0.55, 0.2]; // orange
    default:
      return [0.5, 0.5, 0.5]; // gray
  }
}

/**
 * Blend type color with highlight role color for final node color
 * Type provides base saturation/hue, highlight role provides brightness modulation
 */
export function blendNodeColor(
  typeColor: [number, number, number],
  highlightRole: HighlightRole
): [number, number, number] {
  // Apply highlight role brightness modulation to type color
  const modulate = (type: number): number => {
    if (highlightRole === 'selected') {
      // Selected: brighten the type color
      return Math.min(1.0, type * 1.3);
    } else if (highlightRole === 'adjacent') {
      // Adjacent: slightly brighten
      return Math.min(1.0, type * 1.15);
    } else if (highlightRole === 'deemphasized') {
      // Deemphasized: dim the type color
      return type * 0.5;
    } else {
      // Default: preserve type color as-is
      return type;
    }
  };

  return [
    modulate(typeColor[0]),
    modulate(typeColor[1]),
    modulate(typeColor[2]),
  ];
}

// ============================================================================
// PHASE 5.6: CITED ENTITY HIGHLIGHTING
// ============================================================================

/**
 * Cited state for Answer evidence highlighting
 * Separate layer from selection highlighting to keep both visible
 */
export interface CitedState {
  citedNodeIds: Set<string>;
  citedProjectIds: Set<string>;
  citedEdgeIds: Set<string>;
}

/**
 * Compute color adjustment for cited nodes
 * Cited nodes get a subtle glow effect (brighten type color)
 */
export function blendCitedNodeColor(typeColor: [number, number, number]): [number, number, number] {
  // Brighten by 1.2x, cap at 1.0
  return [
    Math.min(typeColor[0] * 1.2, 1.0),
    Math.min(typeColor[1] * 1.2, 1.0),
    Math.min(typeColor[2] * 1.2, 1.0),
  ];
}

/**
 * Compute color adjustment for cited projects
 */
export function blendCitedProjectColor(color: [number, number, number]): [number, number, number] {
  return blendCitedNodeColor(color);
}

/**
 * Get edge color for cited edges (brighter, more saturated)
 */
export function getCitedEdgeColor(): [number, number, number] {
  // Bright cyan for cited edges
  return [0.0, 1.0, 1.0];
}

/**
 * Get opacity for cited edges (more visible than default)
 */
export function getCitedEdgeOpacity(): number {
  return 0.85;
}

/**
 * Compute final node color considering both highlight role and cited state
 * Priority: selected > cited > adjacent > default > deemphasized
 * If selected, always use selected color (don't double-boost)
 * If cited (and not selected), brighten type color aggressively
 * If answer active but not cited, dim slightly
 */
export function computeFinalNodeColor(
  typeColor: [number, number, number],
  highlightRole: HighlightRole,
  isCited: boolean,
  isAnswerActive: boolean
): [number, number, number] {
  // If selected, use selected role (preserve highest priority)
  if (highlightRole === 'selected') {
    return blendNodeColor(typeColor, 'selected');
  }

  // If cited (and not selected), apply cited boost
  if (isCited) {
    // Brighten type color by 1.35x (between adjacent 1.15 and selected 1.3)
    return [
      Math.min(1.0, typeColor[0] * 1.35),
      Math.min(1.0, typeColor[1] * 1.35),
      Math.min(1.0, typeColor[2] * 1.35),
    ];
  }

  // If answer is active but this node not cited, dim slightly
  if (isAnswerActive) {
    return [
      typeColor[0] * 0.75,
      typeColor[1] * 0.75,
      typeColor[2] * 0.75,
    ];
  }

  // Otherwise use normal highlight role blending
  return blendNodeColor(typeColor, highlightRole);
}

/**
 * Compute final project color considering both highlight role and cited state
 */
export function computeFinalProjectColor(
  baseColor: [number, number, number],
  highlightRole: HighlightRole,
  isCited: boolean,
  isAnswerActive: boolean
): [number, number, number] {
  // If selected, preserve selected color
  if (highlightRole === 'selected') {
    return baseColor; // getProjectHighlightColor already applied in caller
  }

  // If cited, brighten base color
  if (isCited) {
    return [
      Math.min(1.0, baseColor[0] * 1.35),
      Math.min(1.0, baseColor[1] * 1.35),
      Math.min(1.0, baseColor[2] * 1.35),
    ];
  }

  // If answer active but not cited, dim
  if (isAnswerActive) {
    return [
      baseColor[0] * 0.75,
      baseColor[1] * 0.75,
      baseColor[2] * 0.75,
    ];
  }

  // Otherwise return as-is (caller handles role blending)
  return baseColor;
}

/**
 * Get edge opacity considering cited and answer state
 */
export function computeFinalEdgeOpacity(
  isConnected: boolean,
  isCited: boolean,
  isAnswerActive: boolean,
  hasSelection: boolean
): number {
  // If cited, always bright
  if (isCited) {
    return 0.85;
  }

  // If answer active but not cited, dim significantly
  if (isAnswerActive) {
    return 0.25;
  }

  // Otherwise use normal selection logic
  if (!hasSelection) {
    return 0.6;
  }
  return isConnected ? 0.8 : 0.35;
}
