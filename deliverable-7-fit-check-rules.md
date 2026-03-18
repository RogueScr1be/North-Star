# DELIVERABLE 7: FIT CHECK RULES

**Status:** Phase 0 Specification (Implementation in Phase 2)
**Principle:** Rule-based evaluation, NO ML/LLM, NO hidden scoring
**Updated:** 2025-03-07

---

## LOCKED FROM SOURCE

✅ **Rule-based** (NOT ML/LLM scoring)
✅ **Explainable** with evidence links to graph nodes
✅ **Output format:** Verdict + evidence + risks + questions + 30-day plan
✅ **Scoped to Prentiss only** (no cross-founder evaluation in v0)

---

## CRITICAL RULE: EXPLAINABILITY

**Every fit decision must be traceable to:**
1. Specific graph nodes cited as evidence
2. Explicit scoring rules (formula, not fuzzy)
3. Defined risk patterns
4. Hard thresholds (not judgment calls)

**If a verdict or risk cannot be traced back to a rule and evidence in the graph, it is not allowed in MFP.**

---

## FIT VERDICT SCALE (LOCKED)

| Verdict | Score | Meaning |
|---------|-------|---------|
| **HIGH FIT** | 75–100% | Strong alignment with Prentiss domains, decisions, and lessons |
| **MEDIUM FIT** | 40–74% | Partial alignment; key gaps but addressable with leverage |
| **LOW FIT** | 0–39% | Weak alignment; fundamental domain mismatch or high risk |
| **OUT OF SCOPE** | N/A | Problem domain outside Prentiss's declared expertise |

---

## SCORING ALGORITHM (EXPLICIT FORMULA)

**Input:** Problem statement from user

**Output:** Score [0, 10] → convert to percentage

### Step 1: Domain Classification

**Rule:** Classify problem into one or more Prentiss domains

**Prentiss domains (locked from identity layer):**
- AI-native operating systems
- Coordination layers
- Decision compression systems
- Knowledge acquisition platforms
- Marketplace systems (from GetIT)
- Local-first architecture (from Fast Food)
- Educational games (from Anansi)
- Constellation/graph visualization (from North Star)

**Scoring:**
- Problem matches 1+ domain: +2.0 points (per domain)
- Domain is emergent/adjacent: +1.0 points
- Domain is new/unknown: +0 points

**Max from this rule: 2.0 (single domain) to 4.0 (multi-domain)**

---

### Step 2: Key Decision Matching

**Rule:** Search graph for decisions that directly apply to problem

**Example:**
```
Problem: "How do we reduce complexity in a multi-agent system?"

Search graph for decisions related to "decision compression" or "coordination"

Matches found:
  1. node-northstar-decision-single-profile
     (scope lock: start simple, don't boil the ocean)
  2. node-fastfood-decision-localfirst
     (reduce server dependencies, increase clarity)
  3. node-anansi-constraint-three-audiences
     (simplify by satisfying constraints simultaneously)

Scoring:
  - 1st match: +1.0
  - 2nd match: +1.0
  - 3rd match: +0.5 (constraint, not decision)

Total: +2.5 points (max 3–4 per problem)
```

---

### Step 3: Constraint Matching

**Rule:** Find constraints Prentiss operates under that apply to problem

**Example:**
```
Problem: "Build a marketplace with high trust requirements"

Matching constraints:
  1. node-getit-constraint-trust (Marketplace trust + transparency)
  2. node-fastfood-constraint-simple (Simplicity constraint)
  3. node-anansi-constraint-three-audiences (Multi-audience design)

Scoring:
  - Each constraint match: +0.5 points
  - Directly applicable: full credit
  - Tangentially applicable: 0.25 points

Total: +1.5 points (max 2–3 per problem)
```

---

### Step 4: Relevant Failures/Lessons

**Rule:** Find failures or gaps in graph relevant to problem

**Example:**
```
Problem: "How do we measure success in an AI product?"

Matching failures:
  1. node-getit-failure-metrics-sparse
     (GetIT doesn't have formal business metrics documented)
  2. node-fastfood-outcome-philosophy
     (Product philosophy documented, but no user outcomes)

Scoring:
  - Each relevant failure: +0.5 points
  - Each relevant outcome/learning: +0.5 points

Total: +1.0 points (max 2–3 per problem)
```

---

### Step 5: Capability Gap Detection

**Rule:** Identify domains/capabilities required for problem that Prentiss has NOT demonstrated

**Example:**
```
Problem: "Build a mobile-first app for iOS"

Capability gap:
  - Mobile app development: NOT in Prentiss graph
  - iOS-specific constraints: NOT demonstrated
  - Performance optimization for mobile: NOT in outcomes

Scoring:
  - Each major gap: -2.0 points
  - Each minor gap: -1.0 points

Total: -2.0 points (domain gap penalty)
```

---

### Step 6: Domain Rarity / Overlap

**Rule:** Reward problems that leverage unique, hard-to-find expertise

**Example:**
```
Problem: "Design coordination layer for decentralized systems"

Rarity score:
  - "Coordination layers" is rare expertise: +1.0 bonus
  - Prentiss is one of few with this focus: +0.5 bonus
  - Problem is not commoditized: +0.5 bonus

Total: +2.0 bonus points
```

---

## SCORING FORMULA (EXPLICIT)

```
BASE_SCORE = (
    (domain_matches * 2.0) +
    (decision_matches * 1.0, max 3.0) +
    (constraint_matches * 0.5, max 2.0) +
    (relevant_lessons * 0.5, max 2.0) +
    (capability_gap_penalty) +
    (domain_rarity_bonus, max 2.0)
)

CLAMPED_SCORE = max(0.0, min(10.0, BASE_SCORE))

PERCENTAGE = (CLAMPED_SCORE / 10.0) * 100

VERDICT = {
  >= 75: HIGH FIT
  40-74: MEDIUM FIT
  0-39: LOW FIT
}
```

---

## EVALUATION RULES (SIX RULES)

### Rule 1: Problem Domain Classification

**Condition:** Classify problem into one or more Prentiss domains

**Process:**
1. User presents problem statement
2. Extract domain keywords
3. Match against frozen domain list
4. Assign domain tags and confidence (0.0–1.0)

**Example:**
```
Problem: "How do we make local-first work at scale?"

Domain match: local-first architecture (confidence: 0.95)
Domain match: infrastructure (confidence: 0.8)

Scoring: +2.0 (primary domain) + 0 (secondary doesn't multiply)
```

---

### Rule 2: Key Decision Matching

**Condition:** Find decisions in graph applicable to problem

**Process:**
1. Extract problem's core decision points
2. Search graph for similar decisions
3. Rate applicability (direct, tangential, analogous)
4. Include evidence from decision descriptions

**Example:**
```
Problem statement: "We don't know whether to build desktop-first or mobile-first."

Graph search: "first" + "scope" + "phased"

Matching decisions:
  - node-northstar-decision-single-profile (start simple, not broad)
  - node-fastfood-decision-naiveexpo (chose specific tech path)
  - node-fastfood-decision-localfirst (chose specific arch)

Applicability:
  - Single profile: DIRECTLY applicable (scope lock principle)
  - NaiveExpo: Tangentially applicable (tech choice pattern)
  - Local-first: Tangentially applicable (architecture pattern)

Scoring: 1.0 (direct) + 0.5 (tangential) + 0.5 (tangential) = 2.0
```

---

### Rule 3: Constraint Matching

**Condition:** Find constraints Prentiss navigates that apply to problem

**Process:**
1. Extract problem's constraints (time, resources, users, etc.)
2. Search graph for relevant constraints
3. Compare constraint patterns
4. Score overlap

**Example:**
```
Problem constraint: "Must serve multiple user types simultaneously"

Graph constraints:
  - node-anansi-constraint-three-audiences (kids, teachers, parents)
  - node-getit-constraint-trust (users, vendors, platform)

Overlap: HIGH (multiple stakeholders, conflicting interests)

Scoring: 0.5 + 0.5 = 1.0
```

---

### Rule 4: Relevant Failures/Lessons

**Condition:** Find failures or learning outcomes applicable to problem

**Process:**
1. Identify likely failure modes from problem domain
2. Search graph for documented failures or gaps
3. Extract lessons (what didn't work, what to avoid)
4. Include evidence links

**Example:**
```
Problem: "How do we ensure metrics actually reflect product health?"

Relevant failures:
  - node-getit-failure-metrics-sparse (metrics not formally documented)
    Lesson: "Don't skip metrics foundation; they matter early"

Relevant lessons:
  - node-fastfood-outcome-philosophy (strong product philosophy enables metrics)
    Lesson: "Philosophy first, then metrics align"

Scoring: 0.5 + 0.5 = 1.0
```

---

### Rule 5: Capability Gap Detection

**Condition:** Identify required capabilities Prentiss has NOT demonstrated

**Process:**
1. List all required capabilities for problem
2. Cross-reference against Prentiss skills
3. Identify gaps (missing nodes, missing edges)
4. Rate gap severity (critical, important, nice-to-have)

**Example:**
```
Problem: "Build iOS app"

Required capabilities:
  - iOS development: NOT in graph
  - Mobile UX patterns: NOT demonstrated
  - App store deployment: NOT documented
  - Touch interaction design: MINIMAL (graph optimized for desktop)

Gap severity:
  - iOS dev: CRITICAL (core platform)
  - Mobile UX: CRITICAL
  - App store: IMPORTANT
  - Touch design: IMPORTANT

Scoring penalty: -2.0 (critical) -2.0 (critical) = -4.0
```

---

### Rule 6: Domain Rarity / Overlap

**Condition:** Reward problems requiring rare expertise

**Process:**
1. Assess how rare/commoditized the domain is
2. Check if Prentiss has unique positioning
3. Check for cross-domain synergies
4. Award rarity bonus

**Example:**
```
Problem: "Design coordination layer for multi-agent AI systems"

Rarity factors:
  - "Coordination layers" is a Prentiss focus: RARE (few experts)
  - Cross-domain synergy: AI + coordination = high value
  - Overlap with North Star (knowledge graph patterns): +0.5

Rarity bonus: +1.0 (rare) + 0.5 (synergy) + 0.5 (overlap) = +2.0
```

---

## FIT VERDICT OUTPUT FORMAT

```json
{
  "problem_statement": "User's problem description",
  "verdict": "HIGH FIT",
  "score_percentage": 82,
  "score_breakdown": {
    "domain_match": 2.0,
    "decision_match": 1.5,
    "constraint_match": 1.0,
    "lessons": 0.5,
    "capability_gaps": -2.0,
    "domain_rarity_bonus": 1.0,
    "total": 8.2,
    "percentage": 82
  },
  "evidence_mapping": {
    "domain_matches": [
      {
        "domain": "marketplace systems",
        "confidence": 0.9,
        "evidence_nodes": ["proj-getit", "node-getit-constraint-trust"]
      }
    ],
    "decision_matches": [
      {
        "decision": "Invite-only phased launch",
        "node": "node-getit-decision-invite-only",
        "applicability": "DIRECTLY applicable",
        "explanation": "Phased, trust-building approach reduces risk in complex markets"
      }
    ],
    "constraint_matches": [
      {
        "constraint": "Trust and transparency matter",
        "node": "node-getit-constraint-trust",
        "explanation": "Your marketplace faces similar trust architecture challenges"
      }
    ],
    "lessons": [
      {
        "lesson": "Marketplace clarity reduces complexity",
        "source": "GetIT: Transparency constraint shapes invite-only strategy",
        "applicable_to": "Your problem"
      }
    ],
    "gaps": [
      {
        "gap": "Mobile-first expertise",
        "severity": "CRITICAL",
        "impact": "Your app is primarily mobile; Prentiss designed for desktop"
      }
    ]
  },
  "risks": [
    {
      "risk": "Gap in mobile interaction patterns",
      "probability": "HIGH",
      "mitigation": "Hire mobile specialist or defer mobile to Phase 2"
    },
    {
      "risk": "Unknown metrics at launch",
      "probability": "MEDIUM",
      "mitigation": "Reference GetIT's measurement setup from the graph"
    }
  ],
  "questions_for_user": [
    "Is mobile required for launch, or could desktop proof of concept work?",
    "Do you have trust as a core constraint like GetIT did?",
    "What is your GTM timeline (phased like GetIT, or launch broad)?"
  ],
  "thirty_day_plan": {
    "days_1_3": {
      "phase": "Framing & Strategy",
      "tasks": [
        "Map problem to Prentiss domains and decisions",
        "Identify constraints (trust, simplicity, multi-audience?)",
        "Draft Go/No-Go decision criteria"
      ]
    },
    "days_4_10": {
      "phase": "Model & Economics",
      "tasks": [
        "Build financial model (unit economics, CAC, LTV)",
        "Validate key assumptions against Prentiss patterns",
        "Assess resource requirements vs. available skills"
      ]
    },
    "days_11_20": {
      "phase": "Execution & Testing",
      "tasks": [
        "Prototype core hypothesis (marketplace trust? AI integration?)",
        "Test with early users (focus on strongest cluster from fit check)",
        "Measure against Prentiss's documented metrics"
      ]
    },
    "days_21_30": {
      "phase": "Iterate & Prove",
      "tasks": [
        "Refine based on user feedback",
        "Address identified capability gaps (hire, partner, defer)",
        "Final Go/No-Go recommendation with evidence"
      ]
    }
  },
  "recommendation": "HIGH FIT. Problem aligns strongly with marketplace expertise (GetIT). Key risk: mobile scope. Recommend desktop-first proof of concept, then mobile Phase 2. Estimated 4-week evaluation before commitment."
}
```

---

## TEMPLATE-BASED 30-DAY PLAN

**Note:** Plan structure is fixed; content is Prentiss-specific but template-driven (NOT LLM-generated).

```markdown
# 30-Day Plan: [Problem Title]

## Days 1–3: Framing & Strategy
- Map problem domains to Prentiss's capability graph
- Identify core constraints (use graph evidence)
- Define Go/No-Go decision criteria
- Decision point: Is this a Prentiss problem or not?

## Days 4–10: Model & Economics
- Build financial model using Prentiss pattern analogies (e.g., GetIT unit economics)
- Identify capability gaps that affect timeline/resources
- Validate key assumptions against documented decisions and outcomes
- Assess whether gaps are addressable (hire, partner, learn, defer)

## Days 11–20: Execution & Testing
- Prototype core hypothesis (focus on strongest fit cluster)
- Run customer conversations (align with constraints from graph)
- Measure outcomes against relevant metrics from Prentiss projects
- Document successes and failures

## Days 21–30: Iterate & Prove
- Refine based on learnings
- Address capability gaps (explicit decision per gap)
- Gather enough signal for Go/No-Go decision
- Final recommendation with evidence

## Go/No-Go Criteria
- [Custom per problem, drawn from graph analysis]
```

---

## NON-GOALS (OUT OF SCOPE FOR V0)

❌ General hiring recommendations (use graph for capability, not talent sourcing)
❌ Multi-founder evaluation (Prentiss only in v0)
❌ Venture/investor suitability (not a due diligence tool)
❌ Competitive analysis (market research beyond graph patterns)
❌ Detailed financial modeling (frame only, not full pro forma)
❌ ML-powered fit scoring (explicit formula only)
❌ Real-time personalization (static plan template)

---

## OPEN QUESTIONS

- [ ] Should Fit Check support "no verdict yet, need more info" outcome?
  - **Recommendation:** If score is within ±5% of threshold, return "borderline" instead of hard verdict
- [ ] Should 30-day plan be customized per problem, or generic template?
  - **Locked:** Template structure; content pulled from graph (not generated)
- [ ] Should Fit Check recommend specific Prentiss decisions/skills to adopt?
  - **Recommendation:** Yes, embed decision node IDs in plan for drill-down
- [ ] Should risks be ranked by impact × probability, or just listed?
  - **Recommendation:** List in descending order of (impact × probability), show calculation

---

## ACCEPTANCE CRITERIA

- [x] Scoring algorithm is explicit (formula with clamped bounds)
- [x] Six evaluation rules are specified with if-then logic
- [x] Every match is traceable to graph nodes (evidence_mapping)
- [x] Every verdict is explainable from rules + evidence
- [x] Output format includes risks, questions, 30-day plan
- [x] Plan is template-based (not generated by LLM)
- [x] Non-goals listed and deferred
- [x] No hidden scoring or black-box logic
- [ ] **CTO approval required before Phase 2 begins**

