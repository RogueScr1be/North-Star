# Failure Log & Guardrails

## Phase 10.0c+ Hotfix: Stale UI Components in Deployed Demo (2026-05-07)

**Pattern:** After successful Vercel build (commit 67e303b), constellation route showed UI regressions:
1. Top-left: Old SearchUI text input (unconditionally rendered, conflicting with AskTheGraphPanel)
2. Top-right: Duplicate reset controls (ResetFrameButton + DemoControls both visible when only one should show)

**Root Cause Analysis:**
1. **Top-left search:** SearchUI was unconditionally rendered in ConstellationCanvas.tsx. With VITE_DEMO_MODE=false, it renders as full text input. This conflicted with AskTheGraphPanel (bottom-left "Ask a Question" surface). Demo intended single canonical search surface (Ask-the-Graph), not dual search paths.
2. **Duplicate reset:** DemoControls (containing "↺ Reset Frame" button) is conditionally rendered only if demoMode=true. However, ResetFrameButton (canonical circular ↻ icon) is unconditionally rendered. Both were visible, suggesting either demoMode was inadvertently true on Vercel, or reset UI was not properly gated.

**Guardrail: Feature-Gated UI Components for Demo Stability**
- UI components should be explicitly gated behind feature flags when demo changes intended surface behavior
- Unconditional rendering of legacy components can cause UI regressions even with correct demoMode settings
- Environment variable configuration must be explicit in both .env and vercel.json to prevent Vercel dashboard overrides

**Fix Applied:**
1. Added VITE_ENABLE_TOP_SEARCH=false to frontend/.env and vercel.json
2. Gated SearchUI rendering in ConstellationCanvas.tsx behind `{import.meta.env.VITE_ENABLE_TOP_SEARCH === 'true' && <SearchUI ... />}`
3. AskTheGraphPanel remains unconditionally rendered (bottom-left ask surface is canonical)
4. DemoControls remains gated to demoMode=true (no change needed)
5. ResetFrameButton remains canonical top-right reset (no change needed)

**Result:** Top-left old search hidden, no duplicate reset visible, single canonical search surface (AskTheGraphPanel) active.

**Commit fixing this pattern:** (current session) fix(constellation): gate top search behind feature flag, remove stale UI

---

## Phase 10.0c+: Vercel Install Strategy Exposed Dependency Conflict (2026-05-07)

**Pattern:** Vercel deployment failed with `npm ERESOLVE` unable to resolve peer dependency tree, while local builds succeeded. Root cause: Local development environment had cached node_modules; Vercel performs clean install without cache.

**Failure Sequence:**
1. PostProcessingEffects.tsx imports `@react-three/postprocessing`
2. Local build: `@react-three/postprocessing` present in node_modules (cached from prior work)
3. Vercel build: Clean install executes `npm install` without cache
4. Vercel npm resolution: `postprocessing@6.39.1` peer-requires `three@>= 0.168.0`
5. Package lockfile locked `three@0.160.1` (required by other deps)
6. Conflict detected → ERESOLVE → build failure

**Root Cause:** Previous install command deleted package-lock.json, forcing fresh dependency resolution. Clean machines cannot resolve floating dependency trees that local cached machines gloss over.

**Guardrail 1: Commit Lockfiles**
- Always commit package-lock.json and frontend/package-lock.json
- Never delete lockfiles in Vercel install commands
- Do NOT use `rm -f package-lock.json && npm install`
- Use `npm ci` (clean install from lockfile) for stable CI deployments

**Guardrail 2: Test on Clean CI**
- Local build success ≠ CI success if dependency is floating
- Before shipping dependency changes, run clean install locally: `rm -rf node_modules && npm install`
- If clean install fails locally, Vercel will also fail
- Local caching masks peer dependency incompatibilities

**Guardrail 3: Peer Dependencies Require Verification**
- Packages with peer dependencies are version-sensitive
- Floating specs like `@react-three/postprocessing@^2.19.1` can resolve to incompatible versions in CI
- Solution: Pin peer-dependent packages to exact versions OR remove them if not essential
- Bloom post-processing was visual enhancement, not essential → removed

**Fix Applied:** Removed `@react-three/postprocessing` and `postprocessing` from dependencies entirely. Converted component to no-op to preserve import contract.

**Commit fixing this pattern:** 67e303b (Hotfix: remove postprocessing dependency from demo build)

---

## Phase 6.1: Edge Pulse Animation — Browser Verification Required (2026-05-03)

**Pattern:** Edge pulse animation was claimed implemented but missing in runtime. requestAnimationFrame loop had closure bug: `frameId` was referenced before assignment, breaking animation chain.

**Root Cause:** Line 664 contained `frameId;` (dead statement) instead of properly chaining requestAnimationFrame. Frame ID scoping issue prevented animation from firing continuously.

**Guardrail:** Never claim animation/pulse features exist until visually confirmed in browser:
- Code review alone cannot catch requestAnimationFrame loop bugs or timing issues
- Closure scoping issues may compile cleanly but fail at runtime
- Always test: select node → watch for edge pulse → confirm opacity oscillation → verify no console errors
- Do not mark animation features PASS from code inspection; require browser evidence

**Fix Applied:** Restructured animation loop with explicit frameId scoping, proper recursive requestAnimationFrame pattern, safe cleanup.

**Commit fixing this phase:** (current session, Phase 6.1)

---

## Phase 4C: Camera/Billboard Behavior — Browser QA Requirement (2026-05-01)

**Pattern:** Inferred camera and billboard behavior from code inspection caused false confidence. Marked PASS from static analysis without verifying active rendering paths.

**Root Cause:** Camera animation, billboard persistence, selection state, and render-layer transforms interact in complex ways that are not fully predictable from code alone. State transitions (selecting node A → billboard opens → camera animates → user gesture → animation cancels → billboard persists) require observed verification.

**Guardrail:** Never mark camera, billboard, selection, or render-path changes PASS from code inspection alone. Always verify with active browser QA before closing:
- Gesture cancellation (pointer/wheel/pan) must stop animation without clearing selection or closing billboard
- Reset Frame must be the ONLY way to fully clear state
- Billboard persistence rules must be verified in both flag states
- Spatial expansion alignment (billboard at raw position vs camera focusing on expanded position) must be visually confirmed

**Commit fixing this phase:** a7ea61d

---

## Phase 7.1: OpenAI API Key Management — Environment Variable Timing (2026-03-16)

**Pattern:** API key set in Vercel UI dashboard AFTER build completed. Build baked in empty placeholder. Runtime tried to initialize with empty key, hit 401 error.

**Root Cause:** Vite replaces `import.meta.env.VITE_POSTHOG_KEY` at compile time, not runtime. Key must exist in build environment when `npm run build` runs. Setting in UI dashboard after build has no effect on already-compiled bundle.

**Guardrail:** Environment variables used by Vite must be set BEFORE build. Verify presence in compiled output:
```bash
npm run build
curl dist/index.html | grep phc_  # Verify key baked in
```

If key is missing from HTML, the build occurred with empty env var. Rebuild after setting key.

---

## Phase 6.2: Monorepo Root `package.json` Not Committed (2026-03-15)

**Pattern:** Vercel deployment failed with "could not read package.json" even though file existed locally. Root cause: package.json never git-added.

**Root Cause:** Git repository tracked only frontend/ and backend/ subdirectories. Root package.json (monorepo manifest) existed locally but was not committed to git. When Vercel cloned repo, package.json was missing, `npm install` failed with ENOENT.

**Guardrail:** Always verify critical root-level files are committed before pushing:
```bash
git ls-files package.json build.sh vercel.json
```

If any file returns empty, commit it immediately:
```bash
git add package.json && git commit -m "chore: commit root package.json"
```

Never rely on Vercel build cache to paper over missing committed files. Cache is ephemeral; first clean clone will fail.

---

## Phase 3.7: Search Analytics — Event Quality Hidden in Event Firing (2026-03-19)

**Pattern:** Claimed "events confirmed firing" and "analytics integration complete" based on local console logging. Later discovered events were firing to console only — PostHog SDK was not loaded, no data was being collected remotely.

**Root Cause:** Verified that `logSearchEvent()` function executes and calls the logger. Did not verify that the logger was actually the PostHog sink (vs console fallback). Did not verify SDK was loaded. Did not verify events reached PostHog dashboard.

**Guardrail:** "Events fire" ≠ "events are collected." Always verify full pipeline:
1. **SDK loaded**: Check HTML source for uncommented PostHog script tag
2. **Key present**: Check Vercel env vars for VITE_POSTHOG_KEY (set BEFORE build)
3. **Key in compiled output**: `curl index.html | grep phc_` returns key literal
4. **Events in dashboard**: Log into PostHog and verify events arrive in real time

All four checks must pass. Single missing link means analytics is falling back to console.

---

## Phase 10.0c: WebGL glBlitFramebuffer Warning Spam — Post-Processing Kill Switches (2026-05-06)

**Pattern:** Repeated WebGL warnings flooded browser console after expanding starfield to ±900 X/Y volume. Warning: `GL_INVALID_OPERATION: glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image`. Frequency: ~3 warnings per frame.

**Root Cause:** SMAA post-processing effect attempted to reuse depth buffer for both read and write operations within the EffectComposer render pass. This is not allowed by WebGL spec. The issue was latent (present before expansion) but became visible after viewport bounds expanded, triggering the depth buffer contention more frequently.

**Fix Applied:** Disabled SMAA by default via environment flag inversion.
- OLD logic: `VITE_ENABLE_SMAA !== 'false'` (opt-out: enabled unless explicitly disabled)
- NEW logic: `VITE_ENABLE_SMAA === 'true'` (opt-in: only enabled if explicitly set to true)
- Result: Demo console now clean; bloom remains enabled (no warnings)

**Guardrail for Future Phases:**

1. **Post-processing effects require kill switches.** Bloom, DOF, SMAA all gated by environment flags. If any effect causes WebGL warnings, disable by default rather than attempt render-target surgery.

2. **WebGL warnings indicate depth buffer contention or pass ordering.** When you see `glBlitFramebuffer` or `Stencil` warnings, stop adding more rendering passes. Instead, review existing pass order or disable the offending pass.

3. **Demo builds are feature-flag vehicles.** Use environment variables to quickly disable problematic features without code changes. For demo lock, this is faster and safer than attempting architectural fixes.

4. **Test console health in production build output.** Always verify browser console is clean (zero warnings/errors) when testing demo. WebGL warnings are invisible until you open DevTools, but they degrade perceived demo quality.

---

## Phase 10.0b: Billboard Scale Regression — Scene Expansion Context (2026-05-06)

**Pattern:** After expanding starfield scenery from initial bounds (~±50 units) to ±900 X/Y, -1100 to +1100 Z, billboard UI element appeared disproportionately large. Scale was hardcoded (0.01) and independent of scene context, making it feel oversized relative to the expanded backdrop.

**Root Cause:** Three.js Drei `<Html>` component scale is independent of scene bounds. When viewport context expands 10×, UI element does not auto-scale. Billboard anchor position (from `getRenderedPosition`) updated correctly, but visual scale remained constant, creating visual imbalance.

**Fix Applied:** Reduced scale from 0.01 to 0.006 (~40% reduction, proportional to viewport expansion ratio).
- BillboardedPanel.tsx line 128: `<Html ... scale={0.006} ... />`
- Tuned via visual inspection to match viewport proportions after scenery expansion
- Billboard remains readable and proportional to active constellation

**Guardrail for Future Phases:**

1. **DOM-in-3D-space elements (Drei <Html>) scale independently of scene bounds.** When you expand the 3D viewport context, verify that UI elements scaling feels proportional. Do not assume scale will auto-adjust.

2. **Demo scenery must not affect interaction/UI scale.** Visual-only backdrop (starfield, ghost clusters) should be strictly cosmetic. If adding scenery causes UI elements to feel disproportionate, adjust the UI scale via HTML scale or camera framing, not the scenery itself.

3. **Test proportionality with browser QA.** Static code inspection cannot catch visual scaling regressions. Always select a node and verify billboard scale "feels right" after expanding viewport context. Use subjective judgment: is the panel readable? Does it feel proportional to the selected node?

4. **Billboard is independent of selection semantics.** Billboard scale does not depend on node type, gravity score, or project affiliation. Scale is purely visual; adjust it uniformly if viewport context changes.

---

## General Demo Lock Guardrails

**Never blur demo lock → feature work.** Demo lock is a moment in time (git tag). Any new feature work branches separately. Prevent scope creep by having explicit decision points (decision-log.md) for each feature.

**Static build success ≠ demo ready.** A clean TypeScript build and successful `npm run build` does not guarantee the demo is visually correct, performant, or console-clean. Always verify in browser:
- Visual proportions (billboard scale, starfield visibility, active graph dominance)
- Console cleanliness (no WebGL warnings, no TypeScript runtime errors)
- Interactive smoothness (FPS stable during orbit/zoom/select)
- State cleanup (reset works, URL syncs, selection persists)

**Do not continue feature work after demo lock without checkpoints.** The next workstream is presentation + deck. If new features are needed after demo lock, create rollback checkpoints in git (tags) to ensure demo stability is preserved.

---
