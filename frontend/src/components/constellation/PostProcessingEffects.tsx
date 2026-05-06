/**
 * PostProcessingEffects.tsx
 * Post-processing pipeline for constellation visualization (Phase 6.0+)
 *
 * Implements:
 * - Bloom: Glow effect on bright elements (nodes, edges, project anchors)
 * - SMAA: Subpixel anti-aliasing for crisp geometric edges (superior to FXAA)
 *
 * Architectural constraints (CRITICAL):
 * 1. Bloom luminanceThreshold=0.8 requires emissive materials (see below)
 * 2. StarField brightness clamped <0.8 to prevent background washout
 * 3. SMAA chosen over FXAA to preserve sharp UI borders (no full-screen blur)
 */

import { EffectComposer, Bloom, SMAA, DepthOfField } from '@react-three/postprocessing';

/**
 * PostProcessingEffects Component
 * Encapsulates all post-processing passes in a declarative React component.
 * Phase 6.1: All effects controlled by environment-based kill switches.
 *
 * CRITICAL ARCHITECTURAL NOTE ON BLOOM:
 * The Bloom effect responds to luminance in the rendered frame. For Bloom to work correctly:
 *
 * 1. EMISSIVE MATERIALS REQUIRED:
 *    Nodes intended to glow must use MeshStandardMaterial with:
 *    - emissive property set to color (e.g., node type color)
 *    - emissiveIntensity > 1.0 (ensures luminance > threshold)
 *
 *    Example:
 *    <meshStandardMaterial
 *      color={[0.2, 0.8, 0.75]}      // Teal
 *      emissive={[0.2, 0.8, 0.75]}   // Same teal for glow
 *      emissiveIntensity={1.5}       // Bright enough to exceed threshold
 *    />
 *
 * 2. BACKGROUND STARS CLAMPED:
 *    StarField component is responsible for ensuring star colors/opacity
 *    never exceed 0.6 luminance to prevent halo washout.
 *
 * 3. EDGE COLORS (Edges, Highlights):
 *    Bright cyan/magenta colors already exceed threshold naturally.
 */
export function PostProcessingEffects() {
  // Phase 6.1: Environment-based kill switches for all effects
  const POST_PROCESSING_ENABLED =
    import.meta.env.VITE_ENABLE_POST_PROCESSING !== 'false';
  const BLOOM_ENABLED =
    import.meta.env.VITE_ENABLE_BLOOM !== 'false';
  const SMAA_ENABLED =
    import.meta.env.VITE_ENABLE_SMAA !== 'false';
  const DOF_ENABLED =
    import.meta.env.VITE_ENABLE_DOF === 'true';

  // If master toggle is off, render nothing
  if (!POST_PROCESSING_ENABLED) {
    return null;
  }

  // Build children array only with enabled effects
  const effectsComponents: (React.ReactElement | null)[] = [];

  if (BLOOM_ENABLED) {
    effectsComponents.push(
      // Bloom Effect: Glow on high-luminance elements (Phase 6.1: Tuned)
      // Conservative parameters to accentuate without smearing geometry
      // luminanceThreshold=0.80 allows type-colored nodes to bloom (emissive Y~0.8)
      // radius=0.3 keeps glow tight, preserving shape definition
      <Bloom
        key="bloom"
        intensity={0.35}
        luminanceThreshold={0.80}
        luminanceSmoothing={0.18}
        mipmapBlur={true}
        radius={0.30}
      />
    );
  }

  if (SMAA_ENABLED) {
    effectsComponents.push(
      // SMAA: Subpixel Morphological Anti-Aliasing (Phase 6.1: Verified)
      // Chosen over FXAA for sharp UI preservation and superior visual quality
      <SMAA key="smaa" />
    );
  }

  if (DOF_ENABLED) {
    effectsComponents.push(
      // EXPERIMENTAL: Depth of Field (Phase 6.1: Optional, disabled by default)
      // Behind VITE_ENABLE_DOF=true flag (default: false)
      <DepthOfField
        key="dof"
        focusDistance={0.025}
        focalLength={0.015}
        bokehScale={0.6}
        height={360}
      />
    );
  }

  return <EffectComposer>{effectsComponents as any}</EffectComposer>;
}

export default PostProcessingEffects;
