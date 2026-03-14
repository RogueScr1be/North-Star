/**
 * D3 SIMULATIONENGINE.TS
 * D3-force based layout computation for knowledge graph
 * Phase 5.8: Spike - evaluate force-directed layout
 *
 * Responsibilities:
 * - Initialize D3 simulation with graph data
 * - Run bounded tick-based simulation until convergence
 * - Return settled 2D positions [x, y]
 * - Expose convergence metrics for evaluation
 */

import * as d3 from 'd3-force';
import { GraphNode, GraphProject, GraphEdge } from './graphTypes';

export interface D3SimulationConfig {
  /**
   * Charge force strength (negative = repulsion)
   * Default: -150 (spread nodes apart)
   */
  chargeStrength?: number;

  /**
   * Link force strength (spring constant)
   * Default: 0.3 (weaker = more flexible)
   */
  linkStrength?: number;

  /**
   * Distance links try to maintain (pixels)
   * Default: 100
   */
  linkDistance?: number;

  /**
   * Centering force strength
   * Default: 0.1 (gentle pull to center)
   */
  centerStrength?: number;

  /**
   * Maximum iterations before stopping
   * Default: 500 (usually converges much sooner)
   */
  maxIterations?: number;

  /**
   * Velocity threshold below which simulation is considered converged
   * Default: 0.01
   */
  velocityThreshold?: number;

  /**
   * Simulation bounds [width, height]
   * Default: [200, 200] (centered on origin)
   */
  bounds?: [number, number];
}

export interface D3SimulationMetrics {
  /**
   * Time taken to settle (milliseconds)
   */
  convergenceTimeMs: number;

  /**
   * Number of ticks before convergence
   */
  iterationCount: number;

  /**
   * Average velocity at convergence
   */
  finalVelocity: number;

  /**
   * Whether converged or hit max iterations
   */
  converged: boolean;
}

export interface D3SettledPositions {
  /**
   * Node ID → [x, y] settled position
   */
  nodePositions: Map<string, [number, number]>;

  /**
   * Project ID → [x, y] settled position
   */
  projectPositions: Map<string, [number, number]>;

  /**
   * Convergence metrics for evaluation
   */
  metrics: D3SimulationMetrics;
}

/**
 * Run D3 force simulation on graph nodes/projects
 * Returns settled 2D positions and metrics
 */
export function runD3Simulation(
  nodes: GraphNode[],
  projects: GraphProject[],
  edges: GraphEdge[],
  config: D3SimulationConfig = {}
): D3SettledPositions {
  const startTime = performance.now();

  // Defaults
  const chargeStrength = config.chargeStrength ?? -150;
  const linkStrength = config.linkStrength ?? 0.3;
  const linkDistance = config.linkDistance ?? 100;
  const centerStrength = config.centerStrength ?? 0.1;
  const maxIterations = config.maxIterations ?? 500;
  const velocityThreshold = config.velocityThreshold ?? 0.01;
  const [width, height] = config.bounds ?? [200, 200];

  // Build D3 nodes array (combines nodes + projects)
  interface D3Node extends d3.SimulationNodeDatum {
    id: string;
    type: 'node' | 'project';
    gravity_score?: number;
    x: number;
    y: number;
  }

  const d3Nodes: D3Node[] = [];
  const nodeIdMap = new Map<string, D3Node>();

  // Add graph nodes (seed with existing x, y)
  for (const node of nodes) {
    const d3Node: D3Node = {
      id: node.id,
      type: 'node',
      gravity_score: node.gravity_score,
      x: node.x,
      y: node.y,
    };
    d3Nodes.push(d3Node);
    nodeIdMap.set(node.id, d3Node);
  }

  // Add projects (seed with x_derived, y_derived)
  for (const project of projects) {
    const d3Node: D3Node = {
      id: project.id,
      type: 'project',
      gravity_score: project.gravity_score,
      x: project.x_derived,
      y: project.y_derived,
    };
    d3Nodes.push(d3Node);
    nodeIdMap.set(project.id, d3Node);
  }

  // Build D3 links array (filter for valid endpoints)
  interface D3Link extends d3.SimulationLinkDatum<D3Node> {
    source: D3Node;
    target: D3Node;
  }

  const d3Links: D3Link[] = [];
  for (const edge of edges) {
    const source = nodeIdMap.get(edge.source_id);
    const target = nodeIdMap.get(edge.target_id);

    if (source && target) {
      d3Links.push({ source, target });
    }
  }

  // Create simulation
  const simulation = d3
    .forceSimulation<D3Node>(d3Nodes)
    .force('charge', d3.forceManyBody().strength(chargeStrength))
    .force('link', d3.forceLink<D3Node, D3Link>(d3Links).distance(linkDistance).strength(linkStrength))
    .force('center', d3.forceCenter(0, 0).strength(centerStrength))
    .force('bounds', () => {
      // Manual boundary constraint: keep nodes within bounds
      for (const node of d3Nodes) {
        const hw = width / 2;
        const hh = height / 2;
        if (node.x !== undefined) {
          node.x = Math.max(-hw, Math.min(hw, node.x));
        }
        if (node.y !== undefined) {
          node.y = Math.max(-hh, Math.min(hh, node.y));
        }
      }
    })
    .stop(); // Don't auto-tick; we'll tick manually

  // Manual ticking with convergence detection
  let iterationCount = 0;
  let converged = false;

  for (let i = 0; i < maxIterations; i++) {
    simulation.tick();
    iterationCount++;

    // Compute average velocity to detect convergence
    let totalVelocity = 0;
    for (const node of d3Nodes) {
      const vx = node.vx ?? 0;
      const vy = node.vy ?? 0;
      totalVelocity += Math.sqrt(vx * vx + vy * vy);
    }
    const avgVelocity = totalVelocity / d3Nodes.length;

    if (avgVelocity < velocityThreshold) {
      converged = true;
      break;
    }
  }

  const endTime = performance.now();

  // Extract settled positions
  const nodePositions = new Map<string, [number, number]>();
  const projectPositions = new Map<string, [number, number]>();

  for (const d3Node of d3Nodes) {
    const pos: [number, number] = [d3Node.x ?? 0, d3Node.y ?? 0];

    if (d3Node.type === 'node') {
      nodePositions.set(d3Node.id, pos);
    } else {
      projectPositions.set(d3Node.id, pos);
    }
  }

  // Final velocity metric
  let finalVelocity = 0;
  for (const node of d3Nodes) {
    const vx = node.vx ?? 0;
    const vy = node.vy ?? 0;
    finalVelocity += Math.sqrt(vx * vx + vy * vy);
  }
  finalVelocity /= d3Nodes.length;

  return {
    nodePositions,
    projectPositions,
    metrics: {
      convergenceTimeMs: endTime - startTime,
      iterationCount,
      finalVelocity,
      converged,
    },
  };
}
