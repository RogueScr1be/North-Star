/**
 * CAMERAFOCUS.TS
 * Utilities for dynamic camera focusing on graph entities
 * Phase 5.6: Answer evidence → camera animation
 */

import * as THREE from 'three';

/**
 * Compute target camera position to frame multiple entities
 * Used when focusing on answer evidence (nodes/projects)
 */
export function computeFocusTarget(
  positions: THREE.Vector3[],
  currentCameraZ: number = 50
): {
  targetPosition: [number, number, number];
  targetLookAt: [number, number, number];
} {
  if (positions.length === 0) {
    // Default: origin
    return {
      targetPosition: [0, 0, currentCameraZ],
      targetLookAt: [0, 0, 0],
    };
  }

  if (positions.length === 1) {
    // Single entity: center on it
    const [x, y] = positions[0];
    return {
      targetPosition: [x, y, currentCameraZ],
      targetLookAt: [x, y, 0],
    };
  }

  // Multiple entities: compute centroid + frame with padding
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

  // Padding: 20% beyond bounds
  // const width = maxX - minX;
  // const height = maxY - minY;

  return {
    targetPosition: [centerX, centerY, currentCameraZ],
    targetLookAt: [centerX, centerY, 0],
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
