# DELIVERABLE 4: RENDERING SPEC

**Status:** Phase 0 Specification (Hard values for Phase 2)
**Stack:** React Three Fiber + Three.js
**Updated:** 2025-03-07

---

## LOCKED FROM SOURCE

✅ **Stack:** React Three Fiber + Three.js
✅ **Node rendering:** Instanced geometry; curved edges
✅ **LOD transitions:** Exist and are explicit
✅ **Post-processing:** Bloom effect
✅ **Performance targets:**
  - First meaningful render: <2.0s
  - Frame rate target: 55–60 FPS
  - Frame rate floor: 45 FPS
  - Hover latency: <50ms
  - Click-to-panel latency: <150ms
✅ **Accessibility:** Reduced motion support required
✅ **Device strategy:** Desktop-first (mobile deferred or fallback)

---

## HARD VALUES (NO RANGES)

### Scene Setup

| Property | Value | Notes |
|----------|-------|-------|
| **Canvas BG** | `#000000` (pure black) | No star field in v0 |
| **Fog** | None (linear depth via shaders) | Avoid performance hit |
| **Clear color** | `0x000000` | Same as BG |
| **Pixel ratio** | `Math.min(window.devicePixelRatio, 2)` | Cap at 2x for performance |
| **Antialias** | `true` | Standard MSAA |
| **Tone mapping** | `THREE.ACESFilmicToneMapping` | Industry standard |
| **Exposure** | `1.0` | Default exposure |

---

### Camera Presets

#### **Founder Overview (Initial Load)**
- **Position:** `[0, 150, 100]` (units)
- **Target:** `[0, 0, 0]` (center)
- **FOV:** `50` degrees
- **Near:** `0.1`
- **Far:** `5000`
- **Animation:** Instant cut (no easing in v0)

#### **Project Node Detail**
- **Position:** Computed auto-focus
- **Target:** Selected project node
- **FOV:** `45` degrees
- **Distance:** `150` units from target
- **Animation:** 0.8s ease-in-out when clicked

#### **Skill Node Detail**
- **Position:** Similar to project
- **FOV:** `50` degrees
- **Distance:** `120` units from target
- **Animation:** 0.6s ease-in-out

#### **Reset to Overview**
- **Animation:** 1.0s ease-in-out back to founder overview

---

### Node Rendering

#### **Node Mesh Properties**

| Node Type | Geometry | Radius (px) | Color (hex) | Gravity Effect |
|-----------|----------|-------------|-------------|-----------------|
| project | Sphere | 40 | `#FF6B9D` (pink) | 1.0x scale |
| decision | Sphere | 30 | `#4ECDC4` (teal) | 0.85x scale |
| constraint | Sphere | 28 | `#FFE66D` (yellow) | 0.80x scale |
| failure | Sphere | 24 | `#FF6B6B` (red) | 0.70x scale |
| metric | Sphere | 26 | `#95E1D3` (mint) | 0.75x scale |
| skill | Sphere | 32 | `#A8E6CF` (green) | 0.90x scale |
| outcome | Sphere | 28 | `#B19CD9` (purple) | 0.80x scale |
| experiment | Sphere | 25 | `#FFB6C1` (light pink) | 0.65x scale |

**Size scaling formula:** `base_radius * (0.5 + gravity_score * 0.5)`
- Min: 50% of base
- Max: 150% of base

#### **Node Materials**

**Standard (unstressed):**
- Standard mesh + instanced buffer geometry
- Diffuse: node color
- Emissive: node color × 0.3
- Metalness: 0.6
- Roughness: 0.4

**Hover state:**
- Emissive: node color × 0.8 (brightened)
- Scale: 1.15x
- Transition: 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)

**Selected state:**
- Emissive: node color × 1.0 (full bright)
- Scale: 1.25x
- Glow layer: +0.3 bloom strength
- Halo ring: Fine line, node color, 0.5 opacity

**Highlighted (via Ask-the-Graph):**
- Outline: 0.5px, query color (#00FF00 default)
- Pulsing: 0.5–1.0 opacity, 1.5s cycle
- Z-offset: +0.1 to prevent z-fighting

---

### Edge Rendering

#### **Edge Properties**

| Property | Value | Notes |
|----------|-------|-------|
| **Geometry** | Curved line (quadratic Bézier) | No straight lines |
| **Width (thin)** | 1.5px | Low-stress edges |
| **Width (thick)** | 2.5px | High-weight edges (weight >0.7) |
| **Color (base)** | Source node color × 0.6 opacity | Subtle fallback |
| **Color (relationship)** | Inferred from type (TBD per rules) | Optional: custom per relation type |
| **Dashing** | None in v0 | Deferred to Phase 3+ |
| **Arrow heads** | None in v0 | Deferred |

**Weight encoding:**
- `weight < 0.3` → thin line, low opacity (0.3)
- `0.3 ≤ weight < 0.7` → medium line, med opacity (0.5)
- `weight ≥ 0.7` → thick line, high opacity (0.8)

**Hover state:**
- Opacity: full (1.0)
- Width: +1px
- Color: brighten by 0.2 on all channels
- Transition: 0.15s

**Highlighted:**
- Color: Query highlight color
- Opacity: 1.0
- Width: thick (2.5px)
- Z-offset: +0.05

---

### LOD (Level of Detail) Transitions

#### **Breakpoints**

| Distance (px) | Node Detail | Label | Edges | Performance |
|---------------|------------|-------|-------|-------------|
| 0–200 | Full geometry + label | Full text | 100% | Standard FPS |
| 200–600 | Scaled geometry + small label | Abbreviated (truncate >20 chars) | 50% opacity, thin | Target FPS |
| 600–2000 | Billboard sprite only | None | None (culled) | Optimized FPS |
| 2000+ | Culled entirely | — | — | Fast pan/zoom |

**Implementation:**
- Measure distance from camera to node center
- Update material, geometry, and label visibility per frame
- Use groups or layers for efficient culling
- Transition opacity 0.3s when switching LOD tiers

---

### Bloom Post-Processing

**Bloom settings (PROPOSED, REQUIRES CTO APPROVAL):**

| Property | Value | Notes |
|----------|-------|-------|
| **Strength** | 0.5 | Medium glow intensity |
| **Radius** | 0.8 | Blur kernel size (0–1) |
| **Threshold** | 0.8 | Emissive brightness threshold to trigger bloom |
| **Enabled** | Always | No toggle in v0 |
| **Render target resolution** | 0.5x canvas | Performance optimization |

**Visual intent:** Node emissive channels create soft halo; edges and labels unaffected.

---

### Performance Budget

**Baseline test machine:**
- MacBook Air M1
- Chrome (latest)
- 50–100 node graph (typical Prentiss constellation)
- No background tabs

**Target metrics:**
| Metric | Target | Floor | Measured At |
|--------|--------|-------|------------|
| LCP (Largest Contentful Paint) | <2.0s | <2.5s | First render |
| FPS (sustained) | 55–60 | 45 | Pan/zoom/hover |
| Hover latency | <50ms | <100ms | Hover state change |
| Click-to-panel | <150ms | <200ms | Open Node Expansion Panel |
| Memory (heap) | <100MB | <150MB | After 5min interaction |

**Stress test (150-node graph):**
- LCP: <2.5s acceptable
- FPS: 50+ acceptable
- Disable bloom if FPS <48

---

### Reduced Motion Support

**User preference detection:**
```javascript
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

**When enabled:**
- All animations: instant (no easing)
- Camera transitions: instant cut
- Hover transitions: opacity only (no scale)
- Hover latency cap: still <50ms
- No pulsing on highlighted nodes (static opacity)

**No visual degradation required; all content remains visible.**

---

### Mobile Strategy (Deferred)

**v0 approach (PROPOSED, REQUIRES CTO APPROVAL):**

Option A: **Redirect with friendly message**
```
User arrives on mobile
→ Detect viewport width < 768px
→ Show full-screen message:
   "North Star is optimized for desktop viewing.
    For the best experience, visit on a laptop or tablet."
→ Redirect to Profile Hub (fallback surface)
```

**Rationale:**
- Graph rendering fundamentally benefits from large viewport
- Touch interaction has separate UX (pan, zoom, tap)
- v0 scope is desktop-first proof of concept
- Mobile support deferred to Phase 2 or 3

---

## OPEN QUESTIONS

- [ ] Should node sizes scale with zoom, or remain fixed pixels?
  - **Recommendation:** Fixed pixels (better readability at zoom extremes)
- [ ] Should camera animate between presets with easing, or instant cut?
  - **Locked:** 0.8–1.0s easing (specified above)
- [ ] What color scheme for edge relationship types?
  - **Deferred:** Recommend after Ask-the-Graph rules locked
- [ ] Should bloom be user-toggleable for low-end devices?
  - **v0:** Always on; disable only if FPS < 48
- [ ] Should there be visual feedback for drag-to-pan (cursor change)?
  - **v0:** Standard pan cursor; no custom feedback
- [ ] How should search highlight animation differ from selection?
  - **Locked:** Pulsing color + outline (specified above)

---

## ACCEPTANCE CRITERIA

- [x] All numeric values specified (no ranges except performance bands)
- [x] All colors are hex codes with reference names
- [x] Camera presets include position, target, FOV
- [x] Performance budgets tied to specific test machine (M1 MacBook)
- [x] LOD breakpoints are exact pixel distances
- [x] Node size formula is explicit
- [x] Edge weight encoding is clear and measurable
- [x] Bloom parameters documented with rationale
- [x] Reduced motion behavior specified (no animation removal)
- [x] Mobile strategy deferred with clear rationale
- [ ] **CTO approval required before Phase 2 begins**

