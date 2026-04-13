/**
 * HEROITEMS.TS
 * Utility to identify hero nodes and projects for demo narrative focus
 * Phase D: Demo Narrative Control
 */

import type { RenderableGraph } from './graphTransforms';
import type { GraphNode, GraphProject } from './graphTypes';

export interface HeroItem {
  type: 'node' | 'project';
  id: string;
  data: GraphNode | GraphProject;
}

/**
 * Find hero items: prioritize is_featured flag, fallback to top-3 by gravity_score
 */
export function findHeroItems(graph: RenderableGraph): HeroItem[] {
  // Collect featured items
  const heroes: HeroItem[] = [
    ...graph.nodes
      .filter(n => n.is_featured)
      .map(n => ({ type: 'node' as const, id: n.id, data: n })),
    ...graph.projects
      .filter(p => p.is_featured)
      .map(p => ({ type: 'project' as const, id: p.id, data: p }))
  ];

  // If featured items exist, return them
  if (heroes.length > 0) {
    return heroes;
  }

  // Fallback: top-3 by gravity_score across all entities
  const allByGravity = [
    ...graph.nodes.map(n => ({ type: 'node' as const, id: n.id, data: n })),
    ...graph.projects.map(p => ({ type: 'project' as const, id: p.id, data: p }))
  ].sort((a, b) => (b.data.gravity_score || 0) - (a.data.gravity_score || 0));

  return allByGravity.slice(0, 3);
}

/**
 * Get the first hero item (primary focus target)
 */
export function getFirstHeroItem(graph: RenderableGraph): HeroItem | null {
  const heroes = findHeroItems(graph);
  return heroes.length > 0 ? heroes[0] : null;
}

/**
 * Find project items only: prioritize is_featured flag, fallback to top-3 by gravity_score
 * Used for Phase 3.3 project-focused controls
 */
export function findProjectItems(graph: RenderableGraph): HeroItem[] {
  // Collect featured projects
  const projectHeroes: HeroItem[] = graph.projects
    .filter(p => p.is_featured)
    .map(p => ({ type: 'project' as const, id: p.id, data: p }));

  // If featured projects exist, return them
  if (projectHeroes.length > 0) {
    return projectHeroes;
  }

  // Fallback: top-3 projects by gravity_score
  const projectsByGravity = graph.projects
    .map(p => ({ type: 'project' as const, id: p.id, data: p }))
    .sort((a, b) => (b.data.gravity_score || 0) - (a.data.gravity_score || 0));

  return projectsByGravity.slice(0, 3);
}

/**
 * Get the first project item (primary focus target for projects)
 */
export function getFirstProjectItem(graph: RenderableGraph): HeroItem | null {
  const projects = findProjectItems(graph);
  return projects.length > 0 ? projects[0] : null;
}

/**
 * Find the project closest to a given position (e.g., screen center)
 * Used for Phase 3.3 "Focus Project" to find nearest visible project
 */
export function findNearestProject(
  graph: RenderableGraph,
  targetPosition: [number, number]
): HeroItem | null {
  const projects = findProjectItems(graph);
  if (projects.length === 0) return null;

  // Find the project with minimum distance to target position
  let nearestProject = projects[0];
  let minDistance = Infinity;

  for (const project of projects) {
    const projectData = graph.projects.find(p => p.id === project.id);
    if (!projectData?.position) continue;

    const dx = projectData.position[0] - targetPosition[0];
    const dy = projectData.position[1] - targetPosition[1];
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistance) {
      minDistance = distance;
      nearestProject = project;
    }
  }

  return nearestProject;
}
