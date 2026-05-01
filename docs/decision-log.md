# Decision Log

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
