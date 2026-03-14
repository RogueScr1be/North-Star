/**
 * GRAPHCAMERA.TSX
 * Orthographic camera configured for graph framing
 * Phase 2.2: Static, deterministic camera setup
 * Phase 5.1: Added OrbitControls for zoom/pan interaction
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { CameraParams } from '../../lib/graph/graphBounds';

interface GraphCameraProps {
  params: CameraParams;
}

/**
 * GraphCamera component
 * Configures orthographic camera with graph bounds
 * Includes OrbitControls for user interaction (zoom/pan)
 */
export function GraphCamera({ params }: GraphCameraProps) {
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const { camera } = useThree();

  useEffect(() => {
    // TEST 2 DEBUG: Log camera params to console
    console.log('[GraphCamera] Camera params: position=' + JSON.stringify(params.position) +
                ' left=' + params.left.toFixed(2) +
                ' right=' + params.right.toFixed(2) +
                ' top=' + params.top.toFixed(2) +
                ' bottom=' + params.bottom.toFixed(2) +
                ' near=' + params.near.toFixed(2) +
                ' far=' + params.far.toFixed(2));

    if (cameraRef.current) {
      // Set initial camera position and orientation
      (camera as any).position.set(...params.position);
      (camera as any).lookAt(params.position[0], params.position[1], 0);

      // Update OrbitControls target to graph center
      if (controlsRef.current) {
        (controlsRef.current as any).target.set(params.position[0], params.position[1], 0);
        (controlsRef.current as any).update();
      }
    }
  }, [camera, params]);

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
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
        ref={controlsRef}
        camera={camera}
        enableRotate={false}
        enableZoom={true}
        enablePan={true}
        autoRotate={false}
        zoomSpeed={1.2}
        panSpeed={1.0}
      />
    </>
  );
}
