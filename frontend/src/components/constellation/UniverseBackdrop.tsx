/**
 * UniverseBackdrop.tsx
 * Visual-only scenery component suggesting a larger universe of builders
 * Phase 10.0b (v2): Demo polish — "more builders coming soon" atmosphere
 *
 * REVISED ARCHITECTURE:
 * - Direct Three.js instanced geometry (LineSegments + Points)
 * - 15 distant clusters (8 points each) at 1500+ unit distance
 * - Three color-coded groups: Violet, Cyan, White
 * - AdditiveBlending for glowing overlapping effect
 * - Slow Y/Z rotation (0.0002, 0.0001 rad/frame) for parallax drift
 * - Hollywood set design: matte painting backdrop, zero interaction
 *
 * CRITICAL CONSTRAINTS:
 * - No picking, no selection, no interaction
 * - No graph data, no real nodes/edges
 * - Pure visual scenery behind main constellation
 * - Deterministic positioning (same every frame)
 * - Very dim and distant (doesn't distract from active graph)
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface UniverseBackdropProps {
  enabled?: boolean;
}

/**
 * Deterministic pseudo-random generator (seeded)
 * Same seed → same sequence
 * Used for cluster and node positioning
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate 15 distant clusters with deterministic positions
 * Each cluster: 8 nodes in spherical distribution
 * Returns arrays for points and line geometry
 */
function generateDistantClusters() {
  const clusterCount = 15;
  const pointsPerCluster = 8;
  const distanceBase = 1500;

  const allPoints: number[] = [];
  const allLines: number[] = [];
  const allColors: number[] = [];

  // Three color groups: Violet, Cyan, White
  const colorGroups = [
    { color: new THREE.Color(0x8b5cf6), opacityMult: 1.0 }, // Violet
    { color: new THREE.Color(0x06b6d4), opacityMult: 1.0 }, // Cyan
    { color: new THREE.Color(0xffffff), opacityMult: 1.5 }, // White (brighter)
  ];

  for (let c = 0; c < clusterCount; c++) {
    const colorGroup = colorGroups[c % colorGroups.length];
    const baseSeed = c * 10000;

    // Cluster center in spherical distribution at distanceBase
    const clusterTheta = seededRandom(baseSeed) * Math.PI * 2;
    const clusterPhi = seededRandom(baseSeed + 1) * Math.PI;
    const clusterR = distanceBase + seededRandom(baseSeed + 2) * 300; // Small variance in distance

    const centerX = clusterR * Math.sin(clusterPhi) * Math.cos(clusterTheta);
    const centerY = clusterR * Math.sin(clusterPhi) * Math.sin(clusterTheta);
    const centerZ = clusterR * Math.cos(clusterPhi);

    const clusterRadius = 40 + seededRandom(baseSeed + 3) * 30;

    const clusterPoints: Array<[number, number, number]> = [];

    // Generate 8 nodes in this cluster
    for (let i = 0; i < pointsPerCluster; i++) {
      const nodeSeed = baseSeed + i * 100;
      const theta = seededRandom(nodeSeed) * Math.PI * 2;
      const phi = seededRandom(nodeSeed + 1000) * Math.PI;
      const r = seededRandom(nodeSeed + 2000) * clusterRadius;

      const x = centerX + r * Math.sin(phi) * Math.cos(theta);
      const y = centerY + r * Math.sin(phi) * Math.sin(theta);
      const z = centerZ + r * Math.cos(phi);

      clusterPoints.push([x, y, z]);

      // Add point position
      allPoints.push(x, y, z);

      // Add color (RGB)
      allColors.push(colorGroup.color.r, colorGroup.color.g, colorGroup.color.b);
    }

    // Generate some connections between nodes (sparse, ~30% density)
    for (let i = 0; i < pointsPerCluster; i++) {
      for (let j = i + 1; j < pointsPerCluster; j++) {
        const connectionSeed = baseSeed + i * 100 + j;
        if (seededRandom(connectionSeed) < 0.3) {
          const p1 = clusterPoints[i];
          const p2 = clusterPoints[j];
          allLines.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
        }
      }
    }
  }

  return { allPoints, allLines, allColors };
}

/**
 * DistantUniverseGeometry: Instanced geometry for all distant clusters
 * Uses THREE.Points for nodes, THREE.LineSegments for edges
 * AdditiveBlending creates glowing overlapping effect
 */
function DistantUniverseGeometry({ enabled = true }: UniverseBackdropProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { pointsGeometry, linesGeometry, pointsColors, linesColors } = useMemo(() => {
    const { allPoints, allLines, allColors } = generateDistantClusters();

    // Points geometry
    const ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allPoints), 3));

    // Colors for points (corresponding to positions)
    const ptsColors = new Float32Array(allColors);
    ptsGeo.setAttribute('color', new THREE.BufferAttribute(ptsColors, 3));

    // Lines geometry
    const lnsGeo = new THREE.BufferGeometry();
    lnsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allLines), 3));

    // Colors for lines (sample from point colors, interpolated)
    const linesColorsArray = new Float32Array((allLines.length / 3) * 3);
    for (let i = 0; i < allLines.length / 3; i++) {
      const colorIdx = (i % (allColors.length / 3)) * 3;
      linesColorsArray[i * 3] = allColors[colorIdx];
      linesColorsArray[i * 3 + 1] = allColors[colorIdx + 1];
      linesColorsArray[i * 3 + 2] = allColors[colorIdx + 2];
    }
    lnsGeo.setAttribute('color', new THREE.BufferAttribute(linesColorsArray, 3));

    return {
      pointsGeometry: ptsGeo,
      linesGeometry: lnsGeo,
      pointsColors: ptsColors,
      linesColors: linesColorsArray,
    };
  }, []);

  // Slow rotation for parallax drift effect
  useFrame(() => {
    if (groupRef.current && enabled) {
      groupRef.current.rotation.y += 0.0002;
      groupRef.current.rotation.z += 0.0001;
    }
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      {/* Distant ghost points */}
      <points geometry={pointsGeometry}>
        <pointsMaterial
          size={1.5}
          sizeAttenuation={true}
          vertexColors={true}
          transparent={true}
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Distant ghost edges */}
      <lineSegments geometry={linesGeometry}>
        <lineBasicMaterial
          vertexColors={true}
          transparent={true}
          opacity={0.05}
          linewidth={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

/**
 * UniverseBackdrop
 * Main component: renders distant universe scenery
 * Non-interactive, purely visual
 */
export function UniverseBackdrop({ enabled = true }: UniverseBackdropProps) {
  return <DistantUniverseGeometry enabled={enabled} />;
}
