/**
 * INTROCAMERA.TS
 * Camera helpers for the constellation intro. Orthographic "pull back" is a zoom change,
 * which the shared animateCamera() helper does not animate, so the intro owns its own.
 */

import * as THREE from 'three';

export interface CameraFrame {
  position: THREE.Vector3;
  target: THREE.Vector3;
  zoom: number;
}

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Extreme close-up on the person node composition (ring + "Prentiss" label stack).
 *
 * The orthographic frustum is defined in absolute world units around the GRAPH center
 * (left/right/top/bottom are not symmetric about 0), so the screen center maps to world
 *   x = cam.x + (left + right) / 2,  y = cam.y + (top + bottom) / 2.
 * (Verified against the projection matrix: Three's orthographic translation term is
 * -(left+right)/(right-left) * zoom, i.e. the frustum-center offset is in WORLD units and is
 * NOT divided by zoom.) To put the origin at screen center we offset the camera by the inverse.
 */
const PERSON_RING_RATIO = 2.15; // ring outer radius / person sphere radius (PersonNode torus)
const CLOSEUP_RING_VIEW_FRACTION = 0.44; // ring diameter as a fraction of viewport height
const COMPOSITION_CENTER_Y_RATIO = 0.15; // label stack sits above ring: shift view up slightly

export function computeCloseUpFrame(
  camera: THREE.OrthographicCamera,
  canonical: CameraFrame,
  personRadius: number
): CameraFrame {
  const viewHeight = camera.top - camera.bottom;
  const ringRadius = personRadius * PERSON_RING_RATIO;
  const zoom = Math.max(canonical.zoom, viewHeight / (ringRadius * 2 / CLOSEUP_RING_VIEW_FRACTION));
  const x = -(camera.left + camera.right) / 2;
  const y = -(camera.top + camera.bottom) / 2 + personRadius * COMPOSITION_CENTER_Y_RATIO;
  return {
    position: new THREE.Vector3(x, y, canonical.position.z),
    target: new THREE.Vector3(x, y, 0),
    zoom,
  };
}

export function applyFrame(camera: THREE.OrthographicCamera, controls: any, f: CameraFrame): void {
  camera.position.copy(f.position);
  camera.zoom = f.zoom;
  camera.updateProjectionMatrix();
  controls.target.copy(f.target);
  controls.update();
}

/** Animates position, target and zoom. Returns a cancel function. */
export function animateFrame(
  camera: THREE.OrthographicCamera,
  controls: any,
  from: CameraFrame,
  to: CameraFrame,
  durationMs: number,
  onDone: () => void
): () => void {
  const start = performance.now();
  let id: number | null = null;
  const tmp = new THREE.Vector3();

  const tick = (now: number) => {
    const t = Math.min((now - start) / durationMs, 1);
    const e = easeInOutCubic(t);
    camera.position.lerpVectors(from.position, to.position, e);
    controls.target.copy(tmp.lerpVectors(from.target, to.target, e));
    camera.zoom = from.zoom + (to.zoom - from.zoom) * e;
    camera.updateProjectionMatrix();
    controls.update();
    if (t < 1) {
      id = requestAnimationFrame(tick);
    } else {
      id = null;
      onDone();
    }
  };
  id = requestAnimationFrame(tick);
  return () => {
    if (id !== null) cancelAnimationFrame(id);
    id = null;
  };
}
