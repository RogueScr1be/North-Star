/**
 * PERSONNODE.TSX
 * The central operator node at origin (0,0,0)
 * Prentiss - Frontier Operator
 *
 * Visual hierarchy anchor for the entire constellation.
 * Represents the human at the center of the system.
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

/**
 * PersonNodeCore: Cyan sphere with pulsing glow animation + hover detection
 * Represents Prentiss at the system origin
 * Detects hover to reveal project context
 */
function PersonNodeCore({ onHoverStart, onHoverEnd }: { onHoverStart: () => void; onHoverEnd: () => void }) {
  const sphereRef = useRef<THREE.Mesh>(null);

  // Slow breathing animation: subtle scale pulse (1.0 to 1.15)
  // Phase 10.0b: Increased period to 5s and reduced amplitude for calm, intentional feel
  useEffect(() => {
    if (!sphereRef.current) return;

    let frameId: number;
    let time = 0;

    const animate = () => {
      time += 0.01;

      // Slow, calm breathing: scale 1.0 to 1.15, period 5s (vs 3s), amplitude 0.15 (vs 0.3)
      // Creates ambient motion without energy, feels "living" not "pulsing"
      const scale = 1.0 + 0.15 * Math.sin(time * 2 * Math.PI / 5);
      if (sphereRef.current) {
        sphereRef.current.scale.set(scale, scale, scale);
      }

      frameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <mesh
      ref={sphereRef}
      position={[0, 0, 0]}
      onPointerEnter={onHoverStart}
      onPointerLeave={onHoverEnd}
    >
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshBasicMaterial
        color={new THREE.Color(0.2, 1.0, 1.0)} // Brighter electric cyan (more saturated, more present)
        transparent
        opacity={1.0}
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
 * PersonGlowSprite: Radial glow halo with breathing opacity
 * Echoes the ProjectGlowSprites pattern
 * Pulsing opacity creates layered depth with core sphere
 */
function PersonGlowSprite() {
  const spriteRef = useRef<THREE.Sprite>(null);
  const materialRef = useRef<THREE.SpriteMaterial>(null);

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

  // Opacity breathing: 0.4 → 0.8, synced with core pulse (5s period)
  // Creates layered glow effect without harshness
  useEffect(() => {
    if (!materialRef.current) return;

    let frameId: number;
    let time = 0;

    const animate = () => {
      time += 0.01;

      // Glow breathes from 0.4 → 0.8 over 5s, offset slightly from core for depth
      const glowOpacity = 0.4 + 0.2 * Math.sin(time * 2 * Math.PI / 5 + 0.5);
      if (materialRef.current) {
        materialRef.current.opacity = glowOpacity;
      }

      frameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frameId);
  }, []);

  if (!texture) return null;

  return (
    <sprite ref={spriteRef} position={[0, 0, -0.1]} scale={9.0}>
      <spriteMaterial
        ref={materialRef}
        map={texture}
        transparent
        sizeAttenuation={true}
        depthWrite={false}
      />
    </sprite>
  );
}

/**
 * PersonLabel: Text label for the person node
 * Shows name and title (always visible)
 */
function PersonLabel() {
  return (
    <>
      <Text
        position={[0, 3.0, 1.5]}
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
        position={[0, 2.3, 1.5]}
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
 * ProjectListLabel: Project context revealed on hover
 * Shows the four founding projects that emerge from Prentiss
 */
function ProjectListLabel({ isVisible }: { isVisible: boolean }) {
  const projects = ['GetIT', 'Fast Food', 'Anansi', 'North Star'];

  if (!isVisible) return null;

  return (
    <>
      {projects.map((project, index) => (
        <Text
          key={project}
          position={[0, 1.5 - index * 0.4, 1.5]}
          fontSize={0.35}
          color={0x00FFCC}
          maxWidth={3.0}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.05}
        >
          {project}
        </Text>
      ))}
    </>
  );
}

/**
 * PersonNode: Main export
 * Renders person at origin with all visual components
 * Manages hover state to reveal project context
 */
export function PersonNode() {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <>
      <PersonNodeCore
        onHoverStart={() => setIsHovering(true)}
        onHoverEnd={() => setIsHovering(false)}
      />
      <PersonTorus />
      <PersonGlowSprite />
      <PersonLabel />
      <ProjectListLabel isVisible={isHovering} />
    </>
  );
}
