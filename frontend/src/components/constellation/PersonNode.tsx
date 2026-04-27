/**
 * PERSONNODE.TSX
 * The central operator node at origin (0,0,0)
 * Prentiss - Frontier Operator
 *
 * Visual hierarchy anchor for the entire constellation.
 * Represents the human at the center of the system.
 */

import { useMemo, useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

/**
 * PersonNodeCore: Cyan sphere with pulsing glow animation
 * Represents Prentiss at the system origin
 */
function PersonNodeCore() {
  const sphereRef = useRef<THREE.Mesh>(null);

  // Pulsing animation: scale + emission intensity
  useEffect(() => {
    if (!sphereRef.current) return;

    let frameId: number;
    let time = 0;

    const animate = () => {
      time += 0.01;

      // Gentle pulse: scale 1.0 to 1.3, period 3s
      const scale = 1.0 + 0.3 * Math.sin(time * 2 * Math.PI / 3);
      if (sphereRef.current) {
        sphereRef.current.scale.set(scale, scale, scale);
      }

      frameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <mesh ref={sphereRef} position={[0, 0, 0]}>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshBasicMaterial
        color={new THREE.Color(0.0, 1.0, 0.8)} // Electric cyan
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

/**
 * PersonTorus: Cyan ring around person node
 * Echoes the ProjectTorusRings pattern
 */
function PersonTorus() {
  const torusGeometry = useMemo(
    () => new THREE.TorusGeometry(2.5, 0.25, 16, 100),
    []
  );

  return (
    <mesh position={[0, 0, 0]} scale={1.2}>
      <primitive object={torusGeometry} attach="geometry" />
      <meshBasicMaterial
        color={new THREE.Color(0.0, 1.0, 0.9)} // Cyan
        transparent
        opacity={0.6}
        wireframe={false}
      />
    </mesh>
  );
}

/**
 * PersonGlowSprite: Radial glow halo
 * Echoes the ProjectGlowSprites pattern
 */
function PersonGlowSprite() {
  // Create gradient texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw radial gradient (cyan center fade to transparent)
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(0, 255, 200, 1.0)'); // Bright cyan
    gradient.addColorStop(1, 'rgba(0, 255, 200, 0)'); // Transparent

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, []);

  if (!texture) return null;

  return (
    <sprite position={[0, 0, -0.1]} scale={6.0}>
      <spriteMaterial map={texture} transparent sizeAttenuation={true} />
    </sprite>
  );
}

/**
 * PersonLabel: Text label for the person node
 * Shows name and title
 */
function PersonLabel() {
  return (
    <>
      <Text
        position={[0, 3.0, 0.5]}
        fontSize={0.8}
        color={0x00FFCC}
        maxWidth={4.0}
        textAlign="center"
        anchorX="center"
        anchorY="bottom"
        letterSpacing={0.1}
      >
        Prentiss
      </Text>
      <Text
        position={[0, 2.3, 0.5]}
        fontSize={0.5}
        color={0x00BBAA}
        maxWidth={4.0}
        textAlign="center"
        anchorX="center"
        anchorY="top"
        letterSpacing={0.05}
      >
        Frontier Operator
      </Text>
    </>
  );
}

/**
 * PersonNode: Main export
 * Renders person at origin with all visual components
 */
export function PersonNode() {
  return (
    <>
      <PersonNodeCore />
      <PersonTorus />
      <PersonGlowSprite />
      <PersonLabel />
    </>
  );
}
