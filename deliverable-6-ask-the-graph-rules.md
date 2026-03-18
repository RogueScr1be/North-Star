# DELIVERABLE 6: ASK-THE-GRAPH RULES

**Status:** Phase 0 Specification (Implementation in Phase 2)
**Principle:** NO semantic search, NO LLM synthesis, NO hidden scoring
**Updated:** 2025-03-07

---

## LOCKED FROM SOURCE

✅ **Narrow retrieval:** Keyword + tag matching only
✅ **Rule-based highlighting:** Deterministic rule engine (NOT ML)
✅ **Output format:** Matching nodes + highlight rules + explanation
✅ **No LLM synthesis:** All results grounded in graph structure

---

## CRITICAL RULE: EXPLAINABILITY

**Every match, every highlight, every result must be traceable to:**
1. Node tags
2. Explicit if-then rules (documented below)
3. Node properties (type, gravity_score)
4. Edge relationships

**If a query result cannot be traced to a rule and evidence in the graph, it is not allowed in MFP.**

---

## TAG TAXONOMY (CLOSED LIST)

**All tags used in inventory must be from this frozen taxonomy:**

### Domain Tags
```
marketplace
infrastructure
ai
coordination
edtech
video
local-first
decision-compression
knowledge-acquisition
```

### Capability Tags
```
marketplace-design
local-first-architecture
ai-product-integration
constraint-navigation
graph-design
product-philosophy
ux-design
systems-thinking
```

### Status Tags
```
active
archived
planned
gap
learning
```

### Meta Tags
```
testing
metrics
risk
evidence
pattern
success
failure
```

**No free-text tags; all tags must be explicitly assigned during seeding.**

---

## QUERY INPUT FORMAT

```json
{
  "profile_id": "prentiss-frontier-operator",
  "query": "marketplace trust",
  "tags": ["marketplace"],
  "limit": 20
}
```

- `query`: Free-text keyword search string
- `tags`: Optional array of tags (AND logic: ALL must be present on node)
- `limit`: Max results (default 20, max 100)

---

## QUERY MATCHING RULES

### Rule 1: Keyword Matching (Direct)

**Condition:** Node title or description contains query keywords (case-insensitive)

**Example:**
```
Query: "marketplace trust"
Keywords: ["marketplace", "trust"]

Node: "Marketplace Trust & Recommendation Transparency"
→ MATCH (title contains "marketplace" AND "trust")

Match reason: "title contains query keywords"
```

**SQL equivalent:**
```sql
SELECT nodes.*
FROM nodes
WHERE profile_id = $1
  AND (
    LOWER(title) LIKE '%marketplace%' AND LOWER(title) LIKE '%trust%'
    OR LOWER(description) LIKE '%marketplace%' AND LOWER(description) LIKE '%trust%'
  )
```

---

### Rule 2: Tag Intersection (AND Logic)

**Condition:** Node has ALL tags specified in query

**Example:**
```
Query tags: ["marketplace", "ai"]

Node tags: ["marketplace", "ai", "design"]
→ MATCH (has both required tags)

Node tags: ["marketplace", "video"]
→ NO MATCH (missing "ai" tag)

Match reason: "tags match exactly"
```

**SQL equivalent:**
```sql
SELECT nodes.id, nodes.title, COUNT(tags.tag) as matching_tags
FROM nodes
CROSS JOIN LATERAL jsonb_array_elements_text(metadata_json -> 'tags') AS tags(tag)
WHERE profile_id = $1
  AND tags.tag = ANY($2::text[])
GROUP BY nodes.id
HAVING COUNT(tags.tag) = array_length($2::text[], 1)
```

---

### Rule 3: Direct Edge Traversal

**Condition:** Match nodes connected (1-hop) to direct keyword matches

**Example:**
```
Query: "marketplace trust"

Primary match: node-getit-constraint-trust
  (type: constraint, title contains "marketplace trust")

Secondary matches (1-hop outbound):
  - node-getit-decision-invite-only
    (edge: constraint -[shapes]→ decision)

Result:
  - node-getit-constraint-trust (primary)
  - node-getit-decision-invite-only (secondary)

Highlight rules:
  - Nodes: [constraint, decision]
  - Edges: [constraint -[shapes]→ decision]
```

**Logic:**
1. Find all nodes matching Rule 1 or 2
2. For each match, find all outbound and inbound edges
3. Include those target nodes in results
4. Mark edges for highlighting

---

### Rule 4: Project-Level Scoping

**Condition:** If query matches a project, include all child nodes (decision, constraint, failure, metric, outcome)

**Example:**
```
Query: "GetIT"

Direct match: proj-getit (type: project, title: "GetIT")

Scoped matches (all children of proj-getit):
  - node-getit-constraint-trust
  - node-getit-decision-invite-only
  - node-getit-metric-watchthrough
  - node-getit-failure-metrics-sparse

Explanation: "Found project GetIT. Including all project decisions, constraints, failures, and metrics."
```

**Logic:**
1. If a project node matches
2. Include ALL nodes with ref_table = 'projects' AND ref_id = project_id
3. Highlight all edges within project cluster

---

### Rule 5: Pattern Cluster Matching

**Condition:** Query matches a documented pattern; return all nodes tagged with that pattern

**Example:**
```
Query: "density-first marketplace"

Pattern detected: "Density-first marketplaces" (tagged pattern)

Matched nodes:
  - proj-getit (tags: ["marketplace", "density-first"])
  - skill-marketplace-design (tags: ["marketplace", "design", "systems"])

Cross-project pattern:
  - proj-fastfood (shares pattern with GetIT via shared parent "Prentiss")

Explanation: "Found pattern: density-first marketplaces. Detected in GetIT, Fast Food via Prentiss. Included skill bridge."
```

**Logic:**
1. Detect if query matches known patterns (from Pattern Detection layer)
2. Return all nodes tagged with that pattern across projects
3. Include skill nodes that demonstrate pattern
4. Highlight pattern-related edges

---

### Rule 6: Inverse Matching (What causes a problem?)

**Condition:** Query asks about causes/risks; return failure nodes and their constraints

**Example:**
```
Query: "what went wrong with metrics"

Direct match: node-getit-failure-metrics-sparse (title contains "failure" + "metrics")

Inverse traversal (inbound edges):
  - node-getit-decision-invite-only -[drives]→ metric (outbound)
  - Find decisions that expect metrics but metrics are sparse

Result:
  - Failure node
  - Related decision nodes
  - Constraint nodes

Explanation: "Found failure node about sparse metrics. GetIT phased launch doesn't yet have business metrics (GMV, CAC, retention)."
```

---

## MATCHING ALGORITHM (PSEUDOCODE)

```python
def ask_the_graph(profile_id, query, tags=None, limit=20):
    """
    Core query execution. All results must be traceable to rules above.
    """

    results = []
    explanation_parts = []

    # RULE 1: Keyword matching
    keyword_matches = find_nodes_by_keyword(profile_id, query)
    results.extend(keyword_matches)
    if keyword_matches:
        explanation_parts.append(
            f"Found {len(keyword_matches)} nodes matching keywords '{query}'"
        )

    # RULE 2: Tag matching
    if tags:
        tag_matches = find_nodes_by_tags(profile_id, tags)
        results.extend(tag_matches)
        explanation_parts.append(
            f"Found nodes with tags {tags}"
        )

    # RULE 3: Edge traversal
    direct_matches = set([n.id for n in results])
    edge_matches = traverse_edges_1hop(profile_id, direct_matches)
    results.extend(edge_matches)
    explanation_parts.append(
        f"Connected {len(edge_matches)} nodes via 1-hop edges"
    )

    # RULE 4: Project scoping
    project_matches = results.filter(lambda n: n.type == 'project')
    for project in project_matches:
        children = find_project_children(profile_id, project.id)
        results.extend(children)
    explanation_parts.append(
        f"Scoped {len(project_matches)} projects; included children"
    )

    # Deduplicate and sort by gravity
    results = deduplicate(results)
    results = sort_by_gravity(results, reverse=True)
    results = results[:limit]

    # Highlight rules
    highlight_nodes = [r.id for r in results]
    highlight_edges = find_edges_between_nodes(profile_id, highlight_nodes)

    return {
        "matched_nodes": results,
        "highlight_rules": {
            "node_ids": highlight_nodes,
            "edge_ids": [e.id for e in highlight_edges]
        },
        "explanation": ". ".join(explanation_parts)
    }
```

---

## EXAMPLE QUERIES AND RESULTS

### Example 1: Simple Keyword Query

**Input:**
```json
{
  "profile_id": "prentiss-frontier-operator",
  "query": "marketplace trust",
  "tags": null,
  "limit": 20
}
```

**Execution:**
- Rule 1: Find nodes with "marketplace" AND "trust" in title/description
  - Match: node-getit-constraint-trust (gravity: 0.85)
- Rule 3: Traverse edges from constraint
  - Match: node-getit-decision-invite-only (outbound via "shapes")
- Rule 4: Check if any matches are projects
  - No project matches in this query
- Sort by gravity: [constraint (0.85), decision (0.9)]

**Output:**
```json
{
  "matched_nodes": [
    {
      "id": "node-getit-decision-invite-only",
      "type": "decision",
      "title": "Invite-Only Controlled Launch Strategy",
      "gravity_score": 0.9,
      "match_reason": "connected via 'shapes' edge from constraint node"
    },
    {
      "id": "node-getit-constraint-trust",
      "type": "constraint",
      "title": "Marketplace Trust & Recommendation Transparency",
      "gravity_score": 0.85,
      "match_reason": "title contains query keywords 'marketplace' and 'trust'"
    }
  ],
  "highlight_rules": {
    "node_ids": [
      "node-getit-constraint-trust",
      "node-getit-decision-invite-only"
    ],
    "edge_ids": [
      "edge-getit-constraint-decision"
    ]
  },
  "explanation": "Found 1 node matching keywords 'marketplace trust'. Connected 1 node via 1-hop edges."
}
```

---

### Example 2: Tag-Based Query

**Input:**
```json
{
  "profile_id": "prentiss-frontier-operator",
  "query": "",
  "tags": ["ai", "product"],
  "limit": 20
}
```

**Execution:**
- Rule 1: No keywords, skip
- Rule 2: Find nodes with BOTH tags "ai" AND "product"
  - Match: node-anansi-decision-ai-native-wedge (tags: ["ai", "edtech", "positioning", "product-market-fit"])
  - Match: skill-ai-product-integration (tags: ["ai", "product", "integration"])

**Output:**
```json
{
  "matched_nodes": [
    {
      "id": "skill-ai-product-integration",
      "type": "skill",
      "title": "AI-Native Product Integration",
      "gravity_score": 0.9,
      "match_reason": "tags ['ai', 'product'] match query"
    },
    {
      "id": "node-anansi-decision-ai-native-wedge",
      "type": "decision",
      "title": "AI-Native Lesson-to-Game Generation as Wedge",
      "gravity_score": 0.85,
      "match_reason": "tags match query"
    }
  ],
  "highlight_rules": {
    "node_ids": [
      "skill-ai-product-integration",
      "node-anansi-decision-ai-native-wedge"
    ],
    "edge_ids": [
      "edge-anansi-ai-skill"
    ]
  },
  "explanation": "Found nodes with tags ['ai', 'product']. Connected 0 nodes via 1-hop edges."
}
```

---

## NON-GOALS (EXPLICITLY OUT OF SCOPE FOR V0)

❌ Semantic search (embeddings, cosine similarity)
❌ LLM-powered synthesis or rephrasing
❌ Cross-founder querying (multi-profile graph)
❌ Fuzzy matching or typo tolerance
❌ Query suggestions or autocomplete
❌ Temporal queries ("what changed since...?")
❌ Complex boolean queries (NOT, OR, parentheses)
❌ Full-text search with ranking
❌ User-generated patterns

**Reason:** Keep Ask-the-Graph narrow, explicit, and interpretable. These features deferred to Phase 3+.

---

## OPEN QUESTIONS

- [ ] Should free-text queries be case-sensitive or insensitive?
  - **Recommendation:** Case-insensitive for UX simplicity
- [ ] Should tag matching be OR (any tag) or AND (all tags)?
  - **Locked:** AND logic (all specified tags required)
- [ ] Should query results be ranked by gravity_score or by match specificity?
  - **Recommendation:** gravity_score (explicit intent)
- [ ] Should query cache results? If so, TTL?
  - **Deferred:** No caching in v0; profile-level cache invalidation in Phase 1
- [ ] Should queries be logged for analysis?
  - **Recommendation:** Yes, log all queries (profile_id, query, result_count, timestamp)

---

## ACCEPTANCE CRITERIA

- [x] Tag taxonomy is closed list (frozen)
- [x] Six matching rules are explicit with if-then logic
- [x] Each rule is traceable to specific nodes/edges
- [x] Every match is explainable (no hidden logic)
- [x] Pseudocode algorithm provided
- [x] Example queries with full output
- [x] Non-goals listed and deferred
- [x] All tags in inventory are from frozen taxonomy
- [ ] **CTO approval required before Phase 2 begins**

