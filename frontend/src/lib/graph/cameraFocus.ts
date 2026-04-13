/**
 * CAMERAFOCUS.TS
 * Utilities for dynamic camera focusing on graph entities
 * Phase 5.6: Answer evidence → camera animation
 */

import * as THREE from 'three';
import { GraphNode, GraphProject, GraphEdge } from './graphTypes';

/**
 * Phase 3.4: Enhanced framing with smart zoom calculation
 * Compute target camera position to frame multiple entities with appropriate zoom
 * Used for node/project selections, evidence highlighting, and multi-entity framing
 */
export function computeFocusTarget(
  positions: THREE.Vector3[],
  currentCameraZ: number = 50
): {
  targetPosition: [number, number, number];
  targetLookAt: [number, number, number];
  targetZoom?: number;
} {
  if (positions.length === 0) {
    // Default: origin with standard zoom
    return {
      targetPosition: [0, 0, currentCameraZ],
      targetLookAt: [0, 0, 0],
      targetZoom: 1.0,
    };
  }

  if (positions.length === 1) {
    // Single entity: center on it with standard zoom
    const [x, y] = positions[0];
    return {
      targetPosition: [x, y, currentCameraZ],
      targetLookAt: [x, y, 0],
      targetZoom: 1.0,
    };
  }

  // Multiple entities: compute centroid + smart zoom from bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const pos of positions) {
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Calculate bounding box dimensions
  const width = maxX - minX;
  const height = maxY - minY;

  // Compute zoom to fit all entities with 20% padding
  // Orthographic camera's visible width/height depends on camera height (Z) and aspect ratio
  // We need to zoom OUT (increase Z) to fit the bounding box
  // Heuristic: aspect ratio ~2.0 for typical landscape viewport, base zoom ~1.0 at Z=50
  // For large bounding boxes, scale up Z to frame everything comfortably
  const maxDim = Math.max(width, height, 1); // Avoid division by zero
  const padding = maxDim * 0.2; // 20% padding beyond bounds
  const requiredDim = maxDim + padding * 2;

  // Calculate zoom factor: larger bounding boxes need higher Z (zoomed out more)
  // Base: at Z=50, we can see ~100 units across (2:1 aspect ratio)
  // If requiredDim > 100, we need to zoom out proportionally
  const targetZoom = Math.max(1.0, requiredDim / 100);
  const targetZ = currentCameraZ * targetZoom;

  return {
    targetPosition: [centerX, centerY, targetZ],
    targetLookAt: [centerX, centerY, 0],
    targetZoom: targetZoom,
  };
}

/**
 * Smoothly animate camera to target
 * Returns cleanup function to cancel animation if needed
 */
export function animateCamera(
  camera: THREE.OrthographicCamera,
  controls: any, // OrbitControls instance
  targetPosition: [number, number, number],
  targetLookAt: [number, number, number],
  duration: number = 500
): () => void {
  const startPosition = [camera.position.x, camera.position.y, camera.position.z] as [number, number, number];
  const startTarget = [controls.target.x, controls.target.y, controls.target.z] as [number, number, number];
  const startTime = performance.now();
  let animationId: number | null = null;

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = easeInOutCubic(progress);

    // Interpolate position
    camera.position.x = startPosition[0] + (targetPosition[0] - startPosition[0]) * easeProgress;
    camera.position.y = startPosition[1] + (targetPosition[1] - startPosition[1]) * easeProgress;
    camera.position.z = startPosition[2] + (targetPosition[2] - startPosition[2]) * easeProgress;

    // Interpolate controls target
    controls.target.x = startTarget[0] + (targetLookAt[0] - startTarget[0]) * easeProgress;
    controls.target.y = startTarget[1] + (targetLookAt[1] - startTarget[1]) * easeProgress;
    controls.target.z = startTarget[2] + (targetLookAt[2] - startTarget[2]) * easeProgress;

    controls.update();

    if (progress < 1) {
      animationId = requestAnimationFrame(animate);
    }
  };

  animationId = requestAnimationFrame(animate);

  // Return cleanup function
  return () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
}

/**
 * Phase 3.4: Find connected projects for a node
 * Returns projects that have edges to this node
 */
export function findConnectedProjects(
  nodeId: string,
  edges: GraphEdge[],
  nodes: GraphNode[],
  projects: GraphProject[]
): GraphProject[] {
  const projectIds = new Set<string>();

  for (const edge of edges) {
    let connectedNodeId: string | null = null;

    // Find the OTHER node in this edge (the one that isn't the selected node)
    if (edge.source_id === nodeId) {
      connectedNodeId = edge.target_id;
    }
    if (edge.target_id === nodeId) {
      connectedNodeId = edge.source_id;
    }

    // If we found a connected node, get its project
    if (connectedNodeId) {
      const connectedNode = nodes.find(n => n.id === connectedNodeId);
      if (connectedNode && connectedNode.project_id) {
        projectIds.add(connectedNode.project_id);
      }
    }
  }

  return projects.filter(p => projectIds.has(p.id));
}

/**
 * Phase 3.4: Find highest-signal nodes for a project
 * Returns nodes in the project sorted by gravity (descending)
 */
export function findHighSignalNodes(
  projectId: string,
  nodes: GraphNode[],
  maxCount: number = 3
): GraphNode[] {
  return nodes
    .filter(n => n.project_id === projectId)
    .sort((a, b) => (b.gravity_score || 0) - (a.gravity_score || 0))
    .slice(0, maxCount);
}

/**
 * Phase 3.4: Build framing positions for entity selection
 * For nodes: include node + connected projects
 * For projects: include project + high-signal nodes
 */
export function buildFramingPositions(
  selectedId: string,
  selectedType: 'node' | 'project',
  nodes: GraphNode[],
  projects: GraphProject[],
  edges: GraphEdge[]
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];

  if (selectedType === 'node') {
    // Frame: selected node + its directly connected projects
    const selectedNode = nodes.find(n => n.id === selectedId);
    if (selectedNode) {
      positions.push(new THREE.Vector3(selectedNode.x, selectedNode.y, 0));

      // Add connected projects
      const connectedProjects = findConnectedProjects(selectedId, edges, nodes, projects);
      for (const project of connectedProjects) {
        positions.push(new THREE.Vector3(project.x_derived, project.y_derived, 0));
      }
    }
  } else {
    // Frame: selected project + high-signal nodes in it
    const selectedProject = projects.find(p => p.id === selectedId);
    if (selectedProject) {
      positions.push(new THREE.Vector3(selectedProject.x_derived, selectedProject.y_derived, 0));

      // Add high-signal nodes (up to 3)
      const highSignalNodes = findHighSignalNodes(selectedId, nodes, 3);
      for (const node of highSignalNodes) {
        positions.push(new THREE.Vector3(node.x, node.y, 0));
      }
    }
  }

  return positions;
}
