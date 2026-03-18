# PHASE 6.1 — DEPLOYMENT CHECKLIST

**Deployment Date:** ________
**Deployed By:** ________
**Reviewed By:** ________

---

## PRE-DEPLOYMENT VERIFICATION

### Code & Build
- [ ] TypeScript build: `npm run build` in frontend → 0 errors, 0 warnings
- [ ] Vite build output > 1,200 KB JS (expected ~1,213 KB)
- [ ] No chunk size warnings (500 KB threshold acceptable for R3F + Three.js)
- [ ] Git status clean: all Phase 6.2A and 6.2B changes committed

### Environment Variable State
- [ ] `frontend/.env` has `VITE_LAYOUT_ENGINE_ENABLED=true`
- [ ] `.env.production` (if exists) also has `VITE_LAYOUT_ENGINE_ENABLED=true`
- [ ] PostHog key configured if remote analytics enabled: `VITE_POSTHOG_KEY=<key>`

### Feature Verification (local dev)
- [ ] Start dev server: `npm run dev:full`
- [ ] Page loads without errors (browser console clean)
- [ ] Constellation canvas visible
- [ ] LayoutModeSelector visible in top-right corner
- [ ] LayoutModeSelector shows "Curated" and "Dynamic (Experimental)" buttons
- [ ] Curated mode selected by default

### Analytics Pre-Check
- [ ] PostHog dashboard accessible (if remote enabled)
- [ ] No old analytics events from previous deployments cluttering real-time view
- [ ] Analytics sink confirmed ready

---

## DEPLOYMENT EXECUTION

### Steps
1. **Verify build artifacts exist:**
   ```bash
   ls -lh frontend/dist/assets/ | wc -l  # Should show 3+ files
   ```

2. **Deploy to production:**
   - Push `frontend/dist/` to CDN or production server
   - Update environment variables in production
   - Verify `VITE_LAYOUT_ENGINE_ENABLED=true` is set

3. **Verify deployment succeeded:**
   - Page loads at production URL
   - No 404 errors on assets
   - Console clean (no JS errors)

---

## POST-DEPLOYMENT VALIDATION (First 24 Hours)

### Immediate (within 1 hour)
- [ ] Page loads at production URL
- [ ] LayoutModeSelector is visible
- [ ] Click "Curated" button → no errors, D3 positions not fetched
- [ ] Click "Dynamic (Experimental)" → no errors, D3 layout initiates
- [ ] Selection panel opens on node click (both modes)
- [ ] Search input works (both modes)
- [ ] Semantic filters function (both modes)
- [ ] Browser console: 0 errors
- [ ] Network tab: `layout_mode_changed` event fired (check PostHog if enabled)

### First Analytics Events (within 4 hours)
- [ ] PostHog dashboard shows events flowing:
  - [ ] `layout_mode_changed` observed (proof users toggling modes)
  - [ ] `layout_convergence_measured` observed (proof D3 running)
  - [ ] `layout_error` NOT observed (no failures)
- [ ] Event count > 0 (at least one user tried D3)

### Correctness Regression Check (end of day)
- [ ] No reports of broken picking/selection
- [ ] No reports of broken search
- [ ] No reports of broken semantic filters
- [ ] No reports of broken URL state sync
- [ ] All Phase 2.3–5.7 features intact

---

## GO/NO-GO DECISION

**Checklist Status:** All items checked? → **GO** for Phase 6.2 measurement
**Any item unchecked?** → **HOLD** and investigate before Phase 6.2

---

## ROLLBACK PROCEDURE (if needed)

If ANY critical issue:

### Option 1: Env Var Rollback (<5 min)
```bash
# 1. Change env var
VITE_LAYOUT_ENGINE_ENABLED=false

# 2. Rebuild
npm run build

# 3. Redeploy
# Push dist/ to production
```

**Total time:** ~4 minutes

### Option 2: Code Revert (15-20 min)
```bash
# 1. Revert changes
git revert <commit-sha-6.2B>
git revert <commit-sha-6.2A>

# 2. Rebuild
npm run build

# 3. Redeploy
# Push dist/ to production
```

**Effect of rollback:**
- LayoutModeSelector hidden
- All users see Curated (API) layout
- D3 disabled entirely
- All Phase 2.3–5.7 features restored

---

## SIGN-OFF

**Pre-Deployment Verification:** __________ (Date/Time)
**Deployment Completed:** __________ (Date/Time)
**Post-Deployment Validation:** __________ (Date/Time)

**Final Status:** ☐ GO for Phase 6.2  ☐ HOLD (reason: _______________)

