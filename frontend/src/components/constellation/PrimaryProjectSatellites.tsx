/**
 * PRIMARYPROJECTSATELLITES.TSX
 * Stage 1.5: Primary project satellites emerging from Prentiss origin
 *
 * Four primary projects (GetIT, Fast Food, Anansi, North Star) rendered as major satellites
 * with soft filament connections from the origin, structured spatial layout, and elevated
 * visual treatment to establish hierarchy and narrative.
 *
 * Visual treatment:
 * - Box geometry (structured shape, distinct from regular nodes/projects)
 * - White/near-white color (elevated importance, focal treatment)
 * - Subtle glow sprite (luminous anchor presence)
 * - Readable labels
 * - Soft breathing animation (optional, low-risk)
 *
 * Filaments:
 * - Soft cyan-white connections from origin to each project
 * - Low opacity (0.15-0.25) for luminous appearance
 * - No raycasting interception (depthWrite:false)
 * - Curved or soft straight lines
 */

import { useMemo, useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { RenderableGraph } from '../../lib/graph/graphTransforms';

/**
 * Helper to identify primary projects by title (exact match)
 */
function getPrimaryProjects(graph: RenderableGraph) {
  const primaryTitles = new Set(['GetIT', 'Fast Food', 'Anansi', 'North Star']);
  return graph.projects.filter(p => primaryTitles.has(p.title));
}

/**
 * Helper to compute spatial position for each primary project
 * Creates structured constellation layout around origin
 */
function getSatellitePosition(projectTitle: string): [number, number, number] {
  // Structured spatial arrangement (user-facing coordinates, not expanded)
  const positions: Record<string, [number, number, number]> = {
    'GetIT': [-18, 0, 0],         // Left anchor
    'Fast Food': [0, 18, 0],      // Top anchor
    'Anansi': [15, 10, 5],        // Upper right, slightly forward
    'North Star': [0, -15, 0],    // Bottom anchor
  };
  return positions[projectTitle] || [0, 0, 0];
}

/**
 * Helper to apply Phase 10.1 render-layer spatial expansion
 * (Copied from CanvasScene to maintain consistency)
 */
function applyRenderLayerSpacing(
  position: [number, number, number],
  globalScale: number = 1.2,
  zAxisExpand: number = 1.6
): [number, number, number] {
  return [
    position[0] * globalScale,
    position[1] * globalScale,
    position[2] * zAxisExpand,
  ];
}

/**
 * PrimarySatelliteCore: Box geometry with white color and glow
 * Distinct visual treatment for primary projects
 */
function PrimarySatelliteCore({
  position,
}: {
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Subtle breathing animation (Phase 1.5: low-risk optional feature)
  // Amplitude 0.08, period 6s (slightly slower than Person Node for distinction)
  useEffect(() => {
    if (!meshRef.current) return;

    let frameId: number;
    let time = 0;

    const animate = () => {
      time += 0.01;

      // Breathing pulse: scale 1.0 to 1.08 over 6s period
      const scale = 1.0 + 0.08 * Math.sin(time * 2 * Math.PI / 6);
      if (meshRef.current) {
        meshRef.current.scale.set(scale, scale, scale);
      }

      frameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Apply spatial expansion for rendering consistency
  const [expandedX, expandedY, expandedZ] = applyRenderLayerSpacing(position, 1.2, 1.6);

  return (
    <mesh
      ref={meshRef}
      position={[expandedX, expandedY, expandedZ]}
      onPointerEnter={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerLeave={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Box geometry: structured shape distinct from points */}
      <boxGeometry args={[3.0, 3.0, 3.0]} />
      <meshBasicMaterial
        color={new THREE.Color(0.95, 0.95, 0.95)} // Near-white, slightly warm
        transparent
        opacity={0.95}
      />
    </mesh>
  );
}

/**
 * SatelliteGlowSprite: Radial glow halo around primary project
 * Luminous presence without harsh bloom
 */
function SatelliteGlowSprite({
  position,
}: {
  position: [number, number, number];
}) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const materialRef = useRef<THREE.SpriteMaterial>(null);

  // Create gradient texture for glow
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Radial gradient: white-ish center fade to transparent
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)'); // Soft white
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');   // Transparent

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, []);

  // Subtle opacity breathing: 0.25 → 0.4 over 6s (subtle presence)
  useEffect(() => {
    if (!materialRef.current) return;

    let frameId: number;
    let time = 0;

    const animate = () => {
      time += 0.01;

      // Glow breathes 0.25 → 0.4 over 6s
      const glowOpacity = 0.25 + 0.15 * Math.sin(time * 2 * Math.PI / 6 + 0.3);
      if (materialRef.current) {
        materialRef.current.opacity = glowOpacity;
      }

      frameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frameId);
  }, []);

  if (!texture) return null;

  // Apply spatial expansion
  const [expandedX, expandedY, expandedZ] = applyRenderLayerSpacing(position, 1.2, 1.6);

  return (
    <sprite
      ref={spriteRef}
      position={[expandedX, expandedY, expandedZ - 0.1]}
      scale={6.0} // Moderate glow, softer than Person Node
    >
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
 * SatelliteLabel: Text label for primary project
 * Positioned above project, readable and clear
 */
function SatelliteLabel({
  position,
  projectTitle,
}: {
  position: [number, number, number];
  projectTitle: string;
}) {
  // Apply spatial expansion
  const [expandedX, expandedY, expandedZ] = applyRenderLayerSpacing(position, 1.2, 1.6);

  return (
    <Text
      position={[expandedX, expandedY + 3.0, expandedZ + 0.5]}
      fontSize={1.2}
      color={0xFFFFFF}
      maxWidth={5.0}
      textAlign="center"
      anchorX="center"
      anchorY="bottom"
      letterSpacing={0.05}
    >
      {projectTitle}
    </Text>
  );
}

/**
 * OriginFilament: Soft connection from origin to satellite
 * Cyan-white, low opacity, luminous filament-like appearance
 *
 * Uses TubeGeometry for natural curve effect
 */
function OriginFilament({
  targetPosition,
}: {
  targetPosition: [number, number, number];
}) {
  // Apply spatial expansion to both origin and target
  const originExpanded = applyRenderLayerSpacing([0, 0, 0], 1.2, 1.6);
  const targetExpanded = applyRenderLayerSpacing(targetPosition, 1.2, 1.6);

  // Create curve using quadratic bezier (origin → midpoint → target)
  const midpoint: [number, number, number] = [
    (originExpanded[0] + targetExpanded[0]) / 2,
    (originExpanded[1] + targetExpanded[1]) / 2,
    (originExpanded[2] + targetExpanded[2]) / 2 + 8, // Curve upward for visual effect
  ];

  // Create curve points (quadratic bezier)
  const curvePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const steps = 30;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const t2 = t * t;
      const t1 = 1 - t;
      const t1_2 = t1 * t1;
      const mt2 = 2 * t * t1;

      // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
      const x = t1_2 * originExpanded[0] + mt2 * midpoint[0] + t2 * targetExpanded[0];
      const y = t1_2 * originExpanded[1] + mt2 * midpoint[1] + t2 * targetExpanded[1];
      const z = t1_2 * originExpanded[2] + mt2 * midpoint[2] + t2 * targetExpanded[2];

      points.push(new THREE.Vector3(x, y, z));
    }

    return points;
  }, [originExpanded, targetExpanded, midpoint]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array(curvePoints.flatMap(p => [p.x, p.y, p.z]))}
          count={curvePoints.length}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={new THREE.Color(0.3, 1.0, 1.0)} // Soft cyan-white blend
        transparent
        opacity={0.2} // Low opacity for luminous appearance
        linewidth={2}
        depthWrite={false}
      />
    </line>
  );
}

/**
 * PrimaryProjectSatellites: Main component
 * Renders four primary projects as satellites with filaments
 */
export function PrimaryProjectSatellites({
  graph,
}: {
  graph: RenderableGraph;
}) {
  const primaryProjects = useMemo(() => getPrimaryProjects(graph), [graph]);

  if (primaryProjects.length === 0) {
    return null;
  }

  return (
    <>
      {/* Filaments first (render behind satellites) */}
      {primaryProjects.map((proj) => {
        const satellitePos = getSatellitePosition(proj.title);
        return (
          <OriginFilament
            key={`filament-${proj.id}`}
            targetPosition={satellitePos}
          />
        );
      })}

      {/* Primary satellite cores */}
      {primaryProjects.map((proj) => {
        const satellitePos = getSatellitePosition(proj.title);
        return (
          <PrimarySatelliteCore
            key={`core-${proj.id}`}
            position={satellitePos}
          />
        );
      })}

      {/* Satellite glows */}
      {primaryProjects.map((proj) => {
        const satellitePos = getSatellitePosition(proj.title);
        return (
          <SatelliteGlowSprite
            key={`glow-${proj.id}`}
            position={satellitePos}
          />
        );
      })}

      {/* Satellite labels */}
      {primaryProjects.map((proj) => {
        const satellitePos = getSatellitePosition(proj.title);
        return (
          <SatelliteLabel
            key={`label-${proj.id}`}
            position={satellitePos}
            projectTitle={proj.title}
          />
        );
      })}
    </>
  );
}
