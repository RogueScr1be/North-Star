/**
 * RENDEREDPOSITIONS.TS
 * Canonical source for rendered graph coordinates.
 *
 * All systems (geometry, billboards, camera, picking, labels) use this helper
 * to compute final on-screen positions. This ensures spatial consistency.
 *
 * Expands graph space by:
 * - XY: 1.2× global scale
 * - Z: 1.6× to reduce occlusion
 */

import { GraphNode, GraphProject } from './graphTypes';

const GLOBAL_SCALE = 1.2;
const Z_AXIS_EXPAND = 1.6;

/**
 * Get the rendered position for a node or project.
 * Applies spatial expansion transform consistently.
 *
 * @param entity - GraphNode or GraphProject (or null)
 * @param type - 'node' or 'project'
 * @param options - { applyExpansion?, d3Positions? }
 * @returns [x, y, z] or null if entity missing
 */
export function getRenderedPosition(
  entity: GraphNode | GraphProject | null,
  type: 'node' | 'project',
  options: {
    applyExpansion?: boolean;
    d3Positions?: Map<string, [number, number]>;
  } = {}
): [number, number, number] | null {
  if (!entity) return null;

  const { applyExpansion = true, d3Positions } = options;

  // Step 1: Determine base position (D3 or raw)
  let basePosition: [number, number, number];

  if (d3Positions) {
    const d3Pos = d3Positions.get(entity.id);
    if (d3Pos) {
      // D3 provides 2D layout; Z is implicit 0
      basePosition = [d3Pos[0], d3Pos[1], 0];
    } else {
      // D3 fallback: use raw coordinates
      basePosition = type === 'node'
        ? [(entity as GraphNode).x, (entity as GraphNode).y, (entity as GraphNode).z]
        : [(entity as GraphProject).x_derived, (entity as GraphProject).y_derived, (entity as GraphProject).z_derived];
    }
  } else {
    // No D3: use raw coordinates directly
    basePosition = type === 'node'
      ? [(entity as GraphNode).x, (entity as GraphNode).y, (entity as GraphNode).z]
      : [(entity as GraphProject).x_derived, (entity as GraphProject).y_derived, (entity as GraphProject).z_derived];
  }

  // Step 2: Apply spatial expansion (if requested)
  if (applyExpansion) {
    return [
      basePosition[0] * GLOBAL_SCALE,
      basePosition[1] * GLOBAL_SCALE,
      basePosition[2] * Z_AXIS_EXPAND
    ];
  }

  return basePosition;
}
