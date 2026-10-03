/**
 * GRAPHCAMERA.TSX
 * Orthographic camera configured for graph framing
 * Phase 2.2: Static, deterministic camera setup
 * Phase 5.1: Added OrbitControls for zoom/pan interaction
 */

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { CameraParams } from '../../lib/graph/graphBounds';

interface GraphCameraProps {
  params: CameraParams;
  cameraRef?: React.MutableRefObject<any | null>;  // Phase 8.0D: Accept parent-owned ref
  controlsRef?: React.MutableRefObject<any | null>; // Phase 8.0D: Accept parent-owned ref
  onCameraReady?: (camera: any) => void;            // Phase 8.0D: Callback when camera is ready
  onControlsReady?: (controls: any) => void;
  enableOrbit?: boolean;                             // Phase 2: Enable/disable orbit rotation (default: true for 3D)
  enableDamping?: boolean;                           // Phase 2: Enable damping for smooth momentum (default: true)
  dampingFactor?: number;                            // Phase 2: Damping factor for smooth momentum (default: 0.08)
  zoomSpeed?: number;                                // Phase 2: Zoom speed (default: 1.0 for smoother feel)
  /** When provided, the frustum is recomputed for the live canvas aspect on resize (see below). */
  computeParams?: (aspect: number) => CameraParams;
}

/**
 * GraphCamera component
 * Configures orthographic camera with graph bounds
 * Includes OrbitControls for user interaction (zoom/pan)
 * Phase 8.0D: Accept parent-owned refs for camera/controls, forward to Three.js components
 */
export function GraphCamera({
  params,
  cameraRef,
  controlsRef,
  onCameraReady,
  onControlsReady,
  enableOrbit = true,           // Phase 2: Default to true for 3D experience
  enableDamping = true,         // Phase 2: Enable damping for smooth momentum decay
  dampingFactor = 0.08,         // Phase 2: Smooth momentum decay strength
  zoomSpeed = 1.0,              // Phase 2: Reduced zoom speed for better control
  computeParams,
}: GraphCameraProps) {
  const { camera } = useThree();
  const size = useThree(state => state.size);

  // Resize handling. The frustum is a manual, world-unit fit of the graph computed once from the
  // mount-time aspect. On any later canvas resize (e.g. an installed web-app window resizing right
  // after launch) R3F silently rewrites a non-manual orthographic frustum to PIXEL dimensions, which
  // renders the graph as a tiny cluster (a much wider pullback). Mark the camera manual and recompute
  // the same graph fit for the new aspect so a resize frames exactly like a fresh load.
  useEffect(() => {
    if (computeParams) (camera as any).manual = true;
  }, [camera, computeParams]);

  useEffect(() => {
    if (!computeParams || !size.width || !size.height) return;
    const p = computeParams(size.width / size.height);
    const c = camera as any;
    c.left = p.left;
    c.right = p.right;
    c.top = p.top;
    c.bottom = p.bottom;
    c.near = p.near;
    c.far = p.far;
    c.updateProjectionMatrix();
  }, [camera, computeParams, size.width, size.height]);

  useEffect(() => {
    if (cameraRef?.current) {
      // Set initial camera position and orientation
      (camera as any).position.set(...params.position);
      (camera as any).lookAt(params.position[0], params.position[1], 0);

      // Update OrbitControls target to graph center
      if (controlsRef?.current) {
        (controlsRef.current as any).target.set(params.position[0], params.position[1], 0);
        (controlsRef.current as any).update();
      }
    }
  }, [camera, params, cameraRef, controlsRef]);

  // Phase 8.0D: Signal when camera is ready (via callback, not effect dependency)
  useEffect(() => {
    if (cameraRef?.current && onCameraReady) {
      onCameraReady(cameraRef.current);
    }
  }, [onCameraReady, cameraRef]);

  useEffect(() => {
    if (controlsRef?.current && onControlsReady) {
      controlsReportedRef.current = true;
      onControlsReady(controlsRef.current);
    }
  }, [onControlsReady, controlsRef]);

  // Production builds attach the drei OrbitControls ref after the effect above has run,
  // so readiness was never reported (reset stayed disabled). Retry on early frames, once.
  const controlsReportedRef = useRef(false);
  useFrame(() => {
    if (controlsReportedRef.current || !controlsRef?.current || !onControlsReady) return;
    controlsReportedRef.current = true;
    onControlsReady(controlsRef.current);
  });

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}  // Phase 8.0D: Forward parent-owned ref to OrthographicCamera
        makeDefault
        position={params.position}
        left={params.left}
        right={params.right}
        top={params.top}
        bottom={params.bottom}
        near={params.near}
        far={params.far}
      />
      <OrbitControls
        ref={controlsRef}  // Phase 8.0D: Forward parent-owned ref to OrbitControls
        camera={camera}
        enableRotate={enableOrbit}        // Phase 2: Enable orbit rotation for 3D experience
        enableZoom={true}
        enablePan={true}
        autoRotate={false}
        enableDamping={enableDamping}     // Phase 2: Enable damping for smooth momentum
        dampingFactor={dampingFactor}     // Phase 2: Damping strength (0.08 = smooth decay)
        zoomSpeed={zoomSpeed}             // Phase 2: Configurable zoom speed
        panSpeed={1.0}
      />
    </>
  );
}
