/**
 * DEMOLAYOUTTRANSFORM.TS
 * Demo-mode-only anchor position adjustments
 *
 * This module handles visual adjustments specific to the investor demo,
 * ensuring all 4 project anchors are unmistakably visible and balanced.
 *
 * IMPORTANT: This is demo-only. Production rendering uses raw API positions.
 * This transform is applied AFTER bounds computation, not during bounds math.
 */

import { RenderableGraph } from './graphTransforms';
import { GraphNode, GraphProject } from './graphTypes';

export interface DemoLayoutResult {
  projects: Array<GraphProject & { position: [number, number, number] }>;
  nodes: Array<GraphNode & { position: [number, number, number] }>;
}

/**
 * Apply demo-mode layout corrections to improve anchor visibility
 *
 * Rules:
 * 1. Detect unbalanced clusters (max project distance > 2× min project distance)
 * 2. If unbalanced, nudge outlier projects toward graph center by 8% of width
 * 3. Expand Z-axis by 1.5× to fill more vertical space (FIX: DEMO LOCK BUG #3)
 * 4. Preserve all other node/edge positions
 *
 * This is a curated, intentional adjustment for demo presentation.
 * Not algorithmic or procedural — purely visual improvement.
 */
export function applyDemoLayoutTransform(
  graph: RenderableGraph,
  bounds: { size: [number, number] },
  centerX: number,
  centerY: number
): DemoLayoutResult {
  // Compute distances from each project to graph center
  const projectDistances = graph.projects.map(proj => {
    const dx = proj.position[0] - centerX;
    const dy = proj.position[1] - centerY;
    return Math.sqrt(dx * dx + dy * dy);
  });

  const maxDistance = Math.max(...projectDistances);
  const minDistance = Math.min(...projectDistances);

  // Check if clusters are unbalanced
  const isUnbalanced = maxDistance > 2 * minDistance && minDistance > 0;

  let adjustedProjects = graph.projects;

  if (isUnbalanced) {
    // Find outlier (project with maximum distance)
    const outlierIndex = projectDistances.indexOf(maxDistance);

    // Compute nudge offset: 8% of graph width toward center
    const graphWidth = bounds.size[0];
    const nudgeDistance = graphWidth * 0.08;

    // Direction from outlier toward center
    const outlierProj = graph.projects[outlierIndex];
    const dx = centerX - outlierProj.position[0];
    const dy = centerY - outlierProj.position[1];
    const currentDistance = Math.sqrt(dx * dx + dy * dy);

    if (currentDistance !== 0) {
      // Normalize direction and apply nudge
      const dirX = dx / currentDistance;
      const dirY = dy / currentDistance;

      adjustedProjects = graph.projects.map((proj, idx) => {
        if (idx !== outlierIndex) {
          return proj; // No change to non-outlier projects
        }

        // Nudge outlier toward center
        const newX = proj.position[0] + dirX * nudgeDistance;
        const newY = proj.position[1] + dirY * nudgeDistance;
        const newZ = proj.position[2]; // Z unchanged (for now)

        return {
          ...proj,
          position: [newX, newY, newZ] as [number, number, number],
        };
      });
    }
  }

  // FIX (DEMO LOCK BUG #3): Expand Z-axis by 1.5× to fill more vertical space
  const Z_EXPANSION = 1.5;
  const expandedProjects = adjustedProjects.map(proj => ({
    ...proj,
    position: [proj.position[0], proj.position[1], proj.position[2] * Z_EXPANSION] as [
      number,
      number,
      number,
    ],
  }));

  const expandedNodes = graph.nodes.map(node => ({
    ...node,
    position: [node.position[0], node.position[1], node.position[2] * Z_EXPANSION] as [
      number,
      number,
      number,
    ],
  }));

  return {
    projects: expandedProjects,
    nodes: expandedNodes,
  };
}

/**
 * Check if demo layout transform would make a meaningful difference
 * (Used for logging / debugging)
 */
export function shouldApplyDemoTransform(
  projects: Array<GraphProject & { position: [number, number, number] }>,
  centerX: number,
  centerY: number
): boolean {
  if (projects.length < 2) return false;

  const distances = projects.map(proj => {
    const dx = proj.position[0] - centerX;
    const dy = proj.position[1] - centerY;
    return Math.sqrt(dx * dx + dy * dy);
  });

  const maxDistance = Math.max(...distances);
  const minDistance = Math.min(...distances);

  return maxDistance > 2 * minDistance && minDistance > 0;
}
