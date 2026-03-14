/**
 * USED3FORCE.TS
 * React hook for D3 force layout computation
 * Phase 5.8: Spike - evaluate force-directed layout
 *
 * Responsibilities:
 * - Manage D3 simulation state and lifecycle
 * - Run simulation only when graph/filter inputs change
 * - Prevent infinite loops and memory leaks
 * - Expose settled positions and metrics for rendering
 */

import { useMemo } from 'react';
import { GraphNode, GraphProject, GraphEdge } from '../lib/graph/graphTypes';
import { runD3Simulation, D3SimulationConfig, D3SettledPositions } from '../lib/graph/d3SimulationEngine';

interface UseD3ForceInput {
  /**
   * Enable D3 layout (if false, returns null positions)
   */
  enabled: boolean;

  /**
   * Graph nodes (from API)
   */
  nodes: GraphNode[] | null;

  /**
   * Graph projects (from API)
   */
  projects: GraphProject[] | null;

  /**
   * Graph edges (from API)
   */
  edges: GraphEdge[] | null;

  /**
   * Visible node IDs (from semantic filters)
   * If set, only these nodes influence simulation
   */
  visibleNodeIds?: Set<string> | null;

  /**
   * Visible project IDs (from semantic filters)
   */
  visibleProjectIds?: Set<string> | null;

  /**
   * D3 simulation configuration
   */
  config?: D3SimulationConfig;
}

interface UseD3ForceOutput {
  /**
   * Settled 2D positions after simulation
   * null if disabled or data not ready
   */
  positions: D3SettledPositions | null;

  /**
   * Whether simulation is currently running
   * (Always false in bounded v1; no live loop)
   */
  simulating: boolean;

  /**
   * Whether simulation encountered an error
   */
  error: Error | null;
}

/**
 * useD3Force
 * Computes D3 force layout positions for graph
 * Recomputes only when graph/filter inputs materially change
 */
export function useD3Force(input: UseD3ForceInput): UseD3ForceOutput {
  // Filter nodes/projects/edges by visibility (always call, even if data missing)
  const filteredData = useMemo(() => {
    if (!input.nodes || !input.projects || !input.edges) {
      return { nodes: [], projects: [], edges: [] };
    }

    const nodes = input.visibleNodeIds
      ? input.nodes.filter(n => input.visibleNodeIds!.has(n.id))
      : input.nodes;

    const projects = input.visibleProjectIds
      ? input.projects.filter(p => input.visibleProjectIds!.has(p.id))
      : input.projects;

    // Only include edges where both endpoints are visible
    const edges = input.edges.filter(e => {
      const sourceVisible = input.visibleNodeIds ? input.visibleNodeIds.has(e.source_id) : true;
      const targetVisible = input.visibleProjectIds ? input.visibleProjectIds.has(e.target_id) : true;

      // Edge is visible if both endpoints are visible (or if no filter on that type)
      if (input.visibleNodeIds && input.visibleProjectIds) {
        return (
          (input.visibleNodeIds.has(e.source_id) || input.visibleProjectIds.has(e.source_id)) &&
          (input.visibleNodeIds.has(e.target_id) || input.visibleProjectIds.has(e.target_id))
        );
      } else if (input.visibleNodeIds) {
        return sourceVisible && input.visibleNodeIds.has(e.target_id);
      } else if (input.visibleProjectIds) {
        return input.visibleProjectIds.has(e.source_id) && targetVisible;
      }
      return true;
    });

    return { nodes, projects, edges };
  }, [input.nodes, input.projects, input.edges, input.visibleNodeIds, input.visibleProjectIds]);

  // Compute positions via D3 simulation (always call, condition checked in return)
  const positions = useMemo(() => {
    // Return null if disabled or data missing
    if (
      !input.enabled ||
      !input.nodes ||
      !input.projects ||
      !input.edges ||
      filteredData.nodes.length === 0
    ) {
      return null;
    }

    try {
      return runD3Simulation(filteredData.nodes, filteredData.projects, filteredData.edges, input.config);
    } catch (err) {
      console.error('[useD3Force] Simulation failed:', err);
      return null;
    }
  }, [input.enabled, input.nodes, input.projects, input.edges, filteredData, input.config]);

  return {
    positions,
    simulating: false, // No live loop in v1
    error: positions ? null : new Error('Simulation failed or data unavailable'),
  };
}
