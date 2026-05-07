/**
 * PostProcessingEffects.tsx — Demo Build (No-Op)
 *
 * Phase 10.0c+: Post-processing effects removed from demo build for deployment stability.
 * Vercel encountered peer dependency conflicts with @react-three/postprocessing.
 *
 * Visual polish retained via:
 * - Node type color encoding (Phase 5.3)
 * - Universe backdrop (Phase 10.0b)
 * - Starfield (Phase 5.4)
 * - Neon evidence bridge (Phase 3.5)
 * - Node glow via emissive materials
 *
 * This component is a no-op to preserve existing imports and usage without
 * introducing dependency conflicts. Bloom, SMAA, and DOF are deferred.
 */

export function PostProcessingEffects() {
  return null;
}

export default PostProcessingEffects;
