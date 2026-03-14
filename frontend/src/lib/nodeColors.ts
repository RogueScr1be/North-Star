/**
 * NODECOLORS.TS
 * Node type color mappings (from Deliverable 4)
 */

export const NODE_COLORS: Record<string, string> = {
  project: '#FF6B9D',      // pink
  decision: '#4ECDC4',     // teal
  constraint: '#FFE66D',   // yellow
  failure: '#FF6B6B',      // red
  metric: '#95E1D3',       // mint
  skill: '#A8E6CF',        // green
  outcome: '#B19CD9',      // purple
  experiment: '#FFB6C1',   // light pink
};

export function getNodeColor(nodeType: string): string {
  return NODE_COLORS[nodeType] || '#999999';
}
