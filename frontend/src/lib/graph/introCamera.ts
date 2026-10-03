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

/** Extreme close-up on the origin (person node): person fills ~1/3 of viewport height. */
export function computeCloseUpFrame(
  camera: THREE.OrthographicCamera,
  canonical: CameraFrame,
  personRadius: number
): CameraFrame {
  const viewHeight = camera.top - camera.bottom;
  const zoom = Math.max(canonical.zoom, viewHeight / (personRadius * 2 * 3));
  return {
    position: new THREE.Vector3(0, 0, canonical.position.z),
    target: new THREE.Vector3(0, 0, 0),
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
