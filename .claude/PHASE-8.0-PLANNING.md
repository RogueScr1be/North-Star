# Phase 8.0: Ask-the-Graph Streaming + Token Tracking
**Status:** PLANNING  
**Dependency:** Phase 7.1 complete ✅  
**Blocker:** Phase 6.2 decision gate (due 2026-04-11, evaluating 2026-04-12)  
**Estimated Duration:** 2–3 weeks

---

## Goals

1. **Streaming Responses:** Real-time answer text rendering (improve UX for long answers)
2. **Token Tracking:** Monitor OpenAI token usage per query (cost optimization signal)
3. **Response Caching:** Cache identical questions (reduce redundant API calls)
4. **Cost Analysis:** Dashboard showing token spend, model distribution, cache hit rate

---

## Phase 8.0 Scope: What's Included

### 1. Streaming Implementation
- **Technology:** OpenAI streaming API (stream=true parameter)
- **Frontend:** Real-time answer text appending in AskTheGraphPanel
- **UX:** Show "thinking..." → real-time text → citations loaded
- **Estimated work:** 3–4 days

**Files to modify:**
- `backend/api/routes/askGraph.ts` — Add stream: true to OpenAI request
- `frontend/src/hooks/useAskTheGraph.ts` — Handle streaming response chunks
- `frontend/src/components/constellation/AskTheGraphPanel.tsx` — Real-time rendering

### 2. Token Tracking
- **Capture:** completion_tokens, prompt_tokens from OpenAI response
- **Log:** New analytics event `ask_graph_tokens_used` with token breakdown
- **Monitor:** Average tokens per query type (definition vs synthesis)
- **Estimated work:** 2 days

**Files to modify:**
- `backend/api/routes/askGraph.ts` — Extract token counts
- `frontend/src/lib/analytics/searchAnalytics.ts` — Add token event type
- `constellationAnalytics.ts` — Log token usage

### 3. Response Caching
- **Storage:** In-memory cache with 24h TTL (can upgrade to Redis if needed)
- **Key:** Hash of (question, graph_version, model_routing_decision)
- **Benefits:** Identical questions answered instantly, cost savings
- **Estimated work:** 2–3 days

**Files to modify:**
- `backend/api/routes/askGraph.ts` — Cache check before API call
- `backend/api/config.ts` — Cache initialization and cleanup
- Analytics: Track cache hit rate

### 4. Cost Analysis Dashboard
- **Metrics:** Total tokens, cost projection, model distribution, cache hit rate
- **Frequency:** Daily summary (email or dashboard)
- **Estimated work:** 3–4 days (requires analytics pipeline)

**Files to create:**
- `backend/scripts/daily-cost-report.js` — Aggregate token events
- `frontend/src/pages/CostAnalysisDashboard.tsx` — (Optional; can defer to Phase 8.1)

---

## Phase 8.0 Scope: What's Excluded

- ❌ Real-time graph edits (stay within Phase 7 constraint: static graph)
- ❌ Custom model selection UI (keep automatic routing only)
- ❌ Persistent question history (ephemeral cache only)
- ❌ Advanced caching strategies (stay simple: in-memory with TTL)
- ❌ Cost billing/invoicing (analytics only, no user-facing cost)
- ❌ A/B testing streaming vs non-streaming (measure, don't test)

---

## Implementation Strategy

### Phase 8.0a: Streaming + Token Tracking (Days 1–7)
1. Add streaming support to backend (2 days)
2. Wire streaming into frontend (2 days)
3. Implement token tracking events (1 day)
4. Test end-to-end streaming flow (1 day)
5. Build + verify (1 day)

**Deliverable:** Streaming works, tokens tracked, events flow to PostHog

### Phase 8.0b: Response Caching (Days 8–11)
1. Design cache key strategy (1 day)
2. Implement in-memory cache (1 day)
3. Add cache hit/miss events (1 day)
4. Test cache eviction + TTL (1 day)

**Deliverable:** Identical questions answered from cache, metrics visible

### Phase 8.0c: Cost Analysis (Days 12–14 or Phase 8.1)
1. Aggregate token events from PostHog (1 day)
2. Calculate daily cost projection (1 day)
3. Build dashboard (deferred if time pressure)

**Deliverable:** Daily cost summary, model distribution visible

---

## Technical Decisions

### Streaming Implementation
**Choice:** Native OpenAI streaming (stream=true parameter)
**Why:** No additional dependencies, natural fit with Chat Completions API
**Alternative:** Server-Sent Events (SSE) — more complex, not needed for initial MVP

### Cache Strategy
**Choice:** In-memory cache with deterministic hash key
**Why:** Simple, fast, sufficient for single-instance backend
**TTL:** 24 hours (query answer relevance degrades over time)
**Key format:** `hash(question + graph_version + model_routing_decision)`
**Upgrade path:** Switch to Redis if/when scaling to multiple instances

### Cost Tracking
**Choice:** Aggregate token events post-hoc from PostHog
**Why:** No new infrastructure, works with existing analytics pipeline
**Alternative:** Real-time cost tracking — unnecessary complexity for Phase 8
**Refresh rate:** Daily summary (real-time tracking in Phase 9+)

---

## Metrics & Success Criteria

### Phase 8.0 is Successful if:

| Metric | Target | Why |
|--------|--------|-----|
| Streaming works end-to-end | 100% of answers stream | Core UX improvement |
| Token tracking captured | 100% of queries logged | Visibility for cost optimization |
| Cache hit rate | ≥ 20% (typical prod) | Shows cache is useful |
| Streaming latency | First token < 500ms | Perceived responsiveness |
| No new regressions | 0 Phase 2.3–7.1 issues | Preserve stability |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Streaming breaks on slow networks | Low | Medium | Test on 3G, add fallback to non-streaming |
| Token counts wrong in events | Low | Low | Verify against OpenAI dashboard |
| Cache key collisions | Very low | High | Use deterministic hash + graph_version |
| Phase 6.2 goes NO-GO | Medium | High | Phase 8 can proceed independently |

---

## Dependency Tree

```
Phase 8.0 (Streaming + Tokens + Cache)
├─ DEPENDS ON: Phase 7.1 complete ✅
├─ BLOCKS: Phase 8.1 (Advanced caching / fallbacks)
├─ INDEPENDENT OF: Phase 6.2 decision (D3 layout is orthogonal)
└─ PARALLELIZABLE WITH: Phase 6.3 (gradient rollout, if GO)
```

---

## Phase 8.1 Roadmap (Deferred)

- **Advanced caching:** Redis integration, distributed cache
- **Fallback strategies:** If OpenAI unavailable, use cached answer
- **Cost optimization:** Temperature tuning, token prediction
- **Real-time cost tracking:** Per-user spend, budget alerts
- **A/B testing:** Streaming vs non-streaming CTR comparison

---

## Git Commit Strategy

**Phase 8.0a:** "Phase 8.0a: Streaming responses + token tracking"
- Streaming implementation
- Token event types
- End-to-end tests

**Phase 8.0b:** "Phase 8.0b: Response caching with deterministic TTL"
- In-memory cache
- Cache hit/miss metrics
- TTL eviction

**Phase 8.0c:** "Phase 8.0c: Daily cost analysis report"
- Token aggregation script
- Cost dashboard (or deferred)

---

## Next Steps (If Phase 6.2 Goes GO)

If Phase 6.2 decision is GO for Phase 6.3:
1. Phase 6.3 gradient rollout begins (parallel with Phase 8)
2. Monitor D3 adoption metrics weekly (Phase 6.3 weeks 1–2)
3. Proceed with Phase 8.0a streaming (non-blocking work)

If Phase 6.2 decision is NO-GO or ESCALATE:
1. D3 stays experimental forever (no change to Phase 8 planning)
2. Proceed with Phase 8.0 on schedule
3. Focus on core Ask-the-Graph improvements

---

**Status:** Ready to begin once Phase 6.2 decision gate is complete.  
**Owner:** Prentiss + Claude  
**Created:** 2026-04-12

