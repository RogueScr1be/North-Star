/**
 * NODESIZINGCONSTANTS.TS
 * Centralized node sizing hierarchy
 * Maintains visual and picking layer consistency
 * Enforces: Person > Project > Skill > Decision > Outcome > Metric > Constraint > Failure
 */

import { NodeType } from '../graph/graphTypes';

/**
 * Visual size hierarchy (base + gravity modulation)
 * Ensures Person > Project > all others with strong visual separation
 * Ratios (relative to person=2.0):
 *   - person: 2.0 (central mass / sun)
 *   - project: 1.4 (70% major planet / anchor)
 *   - skill: 0.9 (45% subordinate body)
 *   - decision: 0.75 (37.5%)
 *   - outcome: 0.65 (32.5%)
 *   - metric: 0.55 (27.5%)
 *   - constraint: 0.45 (22.5%)
 *   - failure: 0.38 (19%)
 */
export const VISUAL_NODE_SIZES: Record<NodeType | 'person', { base: number; gravityMultiplier: number }> = {
  person: { base: 2.0, gravityMultiplier: 0 }, // Fixed, no gravity modulation, unmistakably largest
  project: { base: 1.4, gravityMultiplier: 2.8 }, // 1.4–4.2 range (70% person baseline)
  skill: { base: 0.9, gravityMultiplier: 1.5 }, // 0.9–2.4 range (45% person)
  decision: { base: 0.75, gravityMultiplier: 1.4 }, // 0.75–2.15 range (37.5% person)
  outcome: { base: 0.65, gravityMultiplier: 1.2 }, // 0.65–1.85 range (32.5% person)
  metric: { base: 0.55, gravityMultiplier: 1.0 }, // 0.55–1.55 range (27.5% person)
  constraint: { base: 0.45, gravityMultiplier: 0.8 }, // 0.45–1.25 range (22.5% person)
  failure: { base: 0.38, gravityMultiplier: 0.6 }, // 0.38–0.98 range (19% person)
  experiment: { base: 0.75, gravityMultiplier: 1.4 }, // Treat as decision-like
};

/**
 * Picking layer sizes (2.5× visual for forgiving hit areas)
 * Ensures hitting a node is comfortable but not ambiguous
 * Each base and multiplier = visual × 2.5 for consistency
 */
export const PICKING_NODE_SIZES: Record<NodeType | 'person', { base: number; gravityMultiplier: number }> = {
  person: { base: 5.0, gravityMultiplier: 0 }, // 2.0 × 2.5
  project: { base: 3.5, gravityMultiplier: 7.0 }, // 1.4 × 2.5
  skill: { base: 2.25, gravityMultiplier: 3.75 }, // 0.9 × 2.5
  decision: { base: 1.875, gravityMultiplier: 3.5 }, // 0.75 × 2.5
  outcome: { base: 1.625, gravityMultiplier: 3.0 }, // 0.65 × 2.5
  metric: { base: 1.375, gravityMultiplier: 2.5 }, // 0.55 × 2.5
  constraint: { base: 1.125, gravityMultiplier: 2.0 }, // 0.45 × 2.5
  failure: { base: 0.95, gravityMultiplier: 1.5 }, // 0.38 × 2.5
  experiment: { base: 1.875, gravityMultiplier: 3.5 }, // 0.75 × 2.5
};

/**
 * Billboard/label offset above node (allows room for labels without collision)
 */
export const LABEL_OFFSET_Y = 1.5;

/**
 * Get visual size for a node type + gravity score
 * @param type Node semantic type
 * @param gravityScore Optional gravity [0.0, 1.0]; defaults to 0
 * @returns Size for rendering geometry
 */
export function getNodeVisualSize(type: NodeType | 'person', gravityScore: number = 0): number {
  const config = VISUAL_NODE_SIZES[type];
  if (!config) {
    return VISUAL_NODE_SIZES.skill.base; // Safe fallback
  }
  return config.base + gravityScore * config.gravityMultiplier;
}

/**
 * Get picking sphere radius for a node type + gravity score
 * Must match or exceed visual size for reliable interaction
 * @param type Node semantic type
 * @param gravityScore Optional gravity [0.0, 1.0]; defaults to 0
 * @returns Picking sphere radius
 */
export function getNodePickingSize(type: NodeType | 'person', gravityScore: number = 0): number {
  const config = PICKING_NODE_SIZES[type];
  if (!config) {
    return PICKING_NODE_SIZES.skill.base; // Safe fallback
  }
  return config.base + gravityScore * config.gravityMultiplier;
}

/**
 * Verify hierarchy is maintained (debug utility)
 * Returns true if types maintain expected size ordering
 */
export function verifyHierarchy(): boolean {
  const types: (NodeType | 'person')[] = [
    'person',
    'project',
    'skill',
    'decision',
    'outcome',
    'metric',
    'constraint',
    'failure',
  ];

  for (let i = 0; i < types.length - 1; i++) {
    const current = getNodeVisualSize(types[i], 1.0); // Max gravity
    const next = getNodeVisualSize(types[i + 1], 1.0);
    if (current <= next) {
      console.warn(`[nodeSizingConstants] Hierarchy violation: ${types[i]} (${current}) <= ${types[i + 1]} (${next})`);
      return false;
    }
  }

  return true;
}
