# Decision Log

## Phase 6.1: Post-Processing Effects — Conservative Tuning with Environment Toggles (2026-05-03)

**Decision:** Bloom, SMAA, and DOF effects controlled by environment variables. Bloom parameters tuned conservatively. SMAA used instead of FXAA. DOF disabled by default.

**Bloom Final Parameters:**
- intensity: 0.35 (restrained glow, no geometry smearing)
- luminanceThreshold: 0.80 (allows type-colored nodes to bloom; emissive Y~0.8 triggers effect)
- luminanceSmoothing: 0.18 (soft falloff)
- mipmapBlur: true (quality)
- radius: 0.30 (tight halo, preserves shape edges)

**Why:** luminanceThreshold=0.88 (original Phase 6.0) was too high—nodes with emissive ~0.8 barely glowed. Lowering to 0.80 improves shape definition while remaining selective. Radius 0.30 (vs 0.35) keeps glow tight, preserving node silhouettes.

**SMAA vs FXAA:**
- Chosen: SMAA (Subpixel Morphological Anti-Aliasing)
- Reason: Superior edge preservation for sharp UI borders; no full-screen blur; proven quality
- FXAA deferred (would blur text/edges unacceptably)

**Edge Pulse Animation:**
- Selected/connected edges pulse opacity 0.75–1.0 at frequency ~1.5 cycles/second
- No selection → all edges invisible (opacity 0.0)
- Unrelated edges remain invisible (opacity 0.0)
- Fixed closure bug in requestAnimationFrame loop (Phase 6.1)
- Subtle, not strobing; adds life without visual noise

**Depth of Field:**
- DepthOfField component integrated
- Behind VITE_ENABLE_DOF=true flag (default: false)
- Deferred activation; disabled by default for Phase 6.1 production
- Parameters if enabled: focusDistance=0.025, focalLength=0.015, bokehScale=0.6

**Commit:** (current session, Phase 6.1 tuning)

---

## Phase 4C: Focus Camera Animation — Feature Flag Default (2026-05-01)

**Decision:** Focus camera animation on selection is feature-flagged (`VITE_FOCUS_CAMERA_ON_SELECTION`), default **false**.

**Why:** Camera behavior is high-blast-radius and must remain reversible. With flag false, selection opens billboard with zero camera motion. With flag true, selection triggers smooth 500ms camera animation. Gesture cancellation (pointer/wheel/pan) stops animation without clearing selection or closing billboard. Reset Frame remains authoritative full reset.

**Refactor Trigger:** Enable by default only after stable demo QA demonstrates:
- No false positive gesture cancellations
- Animation timing acceptable to users
- No performance degradation at scale
- Spatial expansion alignment verified (see failure-log.md)

**Commit:** a7ea61d (feat: gate focus camera animation behind selection flag)

---

## Phase 7.1: OpenAI API Integration — Model Routing by Question Complexity (2026-03-21)

**Decision:** Use OpenAI Responses API with selective model escalation. Default model: gpt-5.4-mini (cost-efficient). Escalation model: gpt-5.4 (for multi-project scope, strategy/synthesis questions).

**Why:** Cost optimization. Simple queries use cheap model; complex synthesis uses expensive model only when needed. Keyword-based escalation is deterministic and has low false-positive rate.

**Keywords triggering escalation:**
- Multi-project: "between", "relationship", "all projects", "across", "connect", "relate", "integration", "dependency", "flow", "architecture", "holistic", "overall"
- Strategy/synthesis: "should", "recommend", "strategy", "best", "next", "priority", "next step", "roadmap", "approach", "plan", "synthesis", "summary", "overview"

---

## Phase 6.2: D3 Layout Experimental Feature — Measurement-Driven Rollout (2026-03-13)

**Decision:** D3 force-directed layout shipped as opt-in experimental feature behind `VITE_LAYOUT_ENGINE_ENABLED` flag. Default: false (curated layout). Rollout to default only if Phase 6.2 metrics pass all 6 criteria.

**Why:** D3 is a significant architectural change. Requiring evidence (adoption ≥10%, revert ≤30%, p95 convergence ≤500ms, error rate 0%, correctness verified, design judgment positive) before default-shift prevents premature optimization and enables fast rollback.

**Gate:** All 6 must pass. If any fails, D3 stays experimental forever (acceptable outcome; some users benefit, no forced migration).

---

## Phase 10.0c: Demo Lock — WebGL Stability + Visual Scaling (2026-05-06)

**Decision:** North Star demo build locked. Three critical adjustments:

### 1. SMAA Disabled by Default

**Original issue:** SMAA post-processing pass caused repeated `glBlitFramebuffer` WebGL warnings after starfield expansion.
- Error: `GL_INVALID_OPERATION: glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image`
- Frequency: Multiple warnings per frame, visual console noise during demo

**Fix applied:** Changed SMAA from opt-out (default enabled) to opt-in (default disabled).
- OLD: `VITE_ENABLE_SMAA !== 'false'` (enabled unless explicitly set to false)
- NEW: `VITE_ENABLE_SMAA === 'true'` (only enabled if explicitly set to true)
- Result: Demo console now clean; bloom remains enabled (no warnings)

**Why:** Disabling SMAA is a demo-safe toggle. Root cause (depth buffer contention) could require complex render-target refactoring; feature toggle is simpler and fully reversible. SMAA is optional post-processing; demo visual quality is preserved with bloom alone.

### 2. Billboard Scale Proportional to Active Constellation

**Original regression:** After starfield expanded to ±900 X/Y, -1100 to +1100 Z, billboard appeared disproportionately large.
- Scale was hardcoded to 0.01, independent of scene bounds
- With expanded backdrop context (5× volume increase), UI element dominated canvas

**Fix applied:** Reduced scale from 0.01 to 0.006 (~40% reduction).
- BillboardedPanel.tsx line 128: `<Html ... scale={0.006} ... />`
- Rationale: Billboard position still anchors to selected node via `getRenderedPosition()`, but scale is now tuned to feel proportional after expanded backdrop
- Result: Billboard readable but not oversized; proportional to active graph

**Why:** Visual hierarchy must be preserved. Scene expansion requires UI scale adjustment to maintain perceptual balance.

### 3. Universe Backdrop Final State

**Starfield:** 300 deterministic points spanning ±900 X/Y, -1100 to +1100 Z, 150-unit thickness
**Ghost clusters:** 15 clusters at 420–900 unit distance with 8-120 nodes each, 20% edge connection density
**Rendering:** Points (opacity 0.32, size 2.3), edges (opacity 0.032), AdditiveBlending for glow effect
**Animation:** Slow Y/Z rotation (0.0002, 0.0001 rad/frame) for parallax drift
**Non-interactive:** No picking, no selection, pure visual scenery

**Demo purpose:** Suggest "larger universe of builders coming" without product complexity or interaction confusion.

### Durable Guardrails for Future Phases

1. **Demo scenery must not affect UI/interaction scale.** Expand backdrop independently; adjust UI elements if context changes.
2. **Post-processing effects require kill switches.** SMAA now opt-in by default to prevent WebGL warnings in production builds.
3. **Do not continue feature work after demo lock without rollback checkpoint.** Demo lock is a git tag. Branch for new work separately.
4. **Static/code QA ≠ browser QA.** Always verify interactivity, FPS, and console cleanliness in the actual runtime environment.

**Commit:** Lock North Star demo build (this session)

---
