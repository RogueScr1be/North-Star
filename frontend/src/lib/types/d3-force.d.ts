/**
 * Type declaration for d3-force
 * Minimal bindings to satisfy TypeScript compilation
 */

declare module 'd3-force' {
  export interface SimulationNodeDatum {
    vx?: number;
    vy?: number;
    index?: number;
  }

  export interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> {
    source: NodeDatum | string | number;
    target: NodeDatum | string | number;
    index?: number;
  }

  export function forceSimulation<NodeDatum extends SimulationNodeDatum>(nodes?: NodeDatum[]): any;
  export function forceManyBody<NodeDatum extends SimulationNodeDatum>(): any;
  export function forceLink<NodeDatum extends SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum>>(links?: LinkDatum[]): any;
  export function forceCenter<NodeDatum extends SimulationNodeDatum>(x?: number, y?: number): any;
}
