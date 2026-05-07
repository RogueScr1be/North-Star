# Failure Log & Guardrails

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
