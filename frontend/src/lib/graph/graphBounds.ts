/**
 * GRAPHBOUNDS.TS
 * Compute graph bounding box and camera framing
 * Responsibilities:
 * - Compute min/max bounds
 * - Compute center
 * - Compute orthographic camera frustum
 */

import { GraphBounds } from './graphTypes';
import { RenderableGraph } from './graphTransforms';

/**
 * Compute axis-aligned bounding box from all vertices
 * Handles degenerate cases (all nodes at single point)
 */
export function computeGraphBounds(graph: RenderableGraph): GraphBounds {
  const allVertices: Array<[number, number, number]> = [];

  // Collect all node positions
  for (const node of graph.nodes) {
    allVertices.push(node.position);
  }

  // Collect all project positions
  for (const proj of graph.projects) {
    allVertices.push(proj.position);
  }

  if (allVertices.length === 0) {
    // Empty graph: center at origin with unit bounds
    return {
      min: [0, 0, 0],
      max: [1, 1, 1],
      center: [0.5, 0.5, 0.5],
      size: [1, 1, 1],
    };
  }

  // Initialize bounds
  const min: [number, number, number] = [
    allVertices[0][0],
    allVertices[0][1],
    allVertices[0][2],
  ];
  const max: [number, number, number] = [
    allVertices[0][0],
    allVertices[0][1],
    allVertices[0][2],
  ];

  // Find min/max
  for (let i = 1; i < allVertices.length; i++) {
    const v = allVertices[i];
    min[0] = Math.min(min[0], v[0]);
    min[1] = Math.min(min[1], v[1]);
    min[2] = Math.min(min[2], v[2]);
    max[0] = Math.max(max[0], v[0]);
    max[1] = Math.max(max[1], v[1]);
    max[2] = Math.max(max[2], v[2]);
  }

  // Handle degenerate case: all vertices on a line or point
  if (min[0] === max[0]) {
    min[0] -= 1;
    max[0] += 1;
  }
  if (min[1] === max[1]) {
    min[1] -= 1;
    max[1] += 1;
  }
  if (min[2] === max[2]) {
    min[2] -= 1;
    max[2] += 1;
  }

  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];

  const size: [number, number, number] = [
    max[0] - min[0],
    max[1] - min[1],
    max[2] - min[2],
  ];

  return { min, max, center, size };
}

/**
 * Compute orthographic camera parameters for framing the graph
 * Returns: { left, right, top, bottom, near, far, position }
 */
export interface CameraParams {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
  position: [number, number, number];
}

export function computeCameraParams(
  bounds: GraphBounds,
  viewportAspect: number,
  paddingFraction = 0.05
): CameraParams {
  const { center, size } = bounds;

  // Add padding to bounds
  const paddedSize = [
    size[0] * (1 + paddingFraction * 2),
    size[1] * (1 + paddingFraction * 2),
    size[2],
  ];

  // Compute frustum based on aspect ratio
  // If viewport is wider than graph, expand left/right
  // If viewport is taller than graph, expand top/bottom
  const graphAspect = paddedSize[0] / paddedSize[1];
  let frustumWidth = paddedSize[0];
  let frustumHeight = paddedSize[1];

  if (viewportAspect > graphAspect) {
    // Viewport is wider: expand width
    frustumWidth = frustumHeight * viewportAspect;
  } else {
    // Viewport is taller: expand height
    frustumHeight = frustumWidth / viewportAspect;
  }

  const left = center[0] - frustumWidth / 2;
  const right = center[0] + frustumWidth / 2;
  const top = center[1] + frustumHeight / 2;
  const bottom = center[1] - frustumHeight / 2;

  // Position camera closer to see graph larger (1.3x instead of 2x)
  // This makes the graph occupy more of the viewport
  const distance = Math.max(size[0], size[1], size[2]) * 1.3;
  const position: [number, number, number] = [center[0], center[1], center[2] + distance];

  // Near/far planes: must account for actual Z range of geometry
  // The near plane must be BEFORE the minimum Z of the geometry
  // For safety, place near plane at (center.z - size.z) to include all geometry
  const geometryMinZ = center[2] - (size[2] / 2);
  const cameraToGeometryDistance = position[2] - geometryMinZ;

  const near = Math.max(0.1, cameraToGeometryDistance * 0.5); // Buffer before geometry
  const far = cameraToGeometryDistance * 2; // Buffer after geometry

  return { left, right, top, bottom, near, far, position };
}
