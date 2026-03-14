/**
 * USEGRAPHSEMANTICS.TS
 * Hook for managing semantic filter state
 * Phase 5.5: Intelligent graph navigation
 */

import { useState, useMemo } from 'react';
import type { RenderableGraph } from '../lib/graph/graphTransforms';
import type { GraphEdge } from '../lib/graph/graphTypes';
import type { SemanticFilters, SemanticVisibility } from '../lib/graph/graphSemantics';
import { computeSemanticVisibility } from '../lib/graph/graphSemantics';

interface UseGraphSemanticsProps {
  graph: RenderableGraph | null;
  edges: GraphEdge[];
}

interface UseGraphSemanticsReturn {
  // Current filters
  filters: SemanticFilters;

  // Computed visibility
  visibility: SemanticVisibility | null;

  // Filter controls
  setSubgraphNode: (nodeId: string | undefined, hops?: number) => void;
  setProjectCluster: (projectId: string | undefined) => void;
  clearAllFilters: () => void;

  // Type/tag/relationship filters
  toggleNodeType: (type: string) => void;
  toggleTag: (tag: string) => void;
  toggleRelationshipType: (relType: string) => void;
  clearTypeFilters: () => void;

  // Gravity threshold
  setGravityThreshold: (threshold?: number) => void;

  // Utility: get all available tags from graph
  getAvailableTags: () => string[];

  // Utility: get all available relationship types
  getAvailableRelationshipTypes: () => string[];
}

const defaultFilters: SemanticFilters = {
  enabledNodeTypes: new Set(), // empty = all enabled
  enabledTags: new Set(),
  enabledRelationshipTypes: new Set(),
};

export function useGraphSemantics({ graph, edges }: UseGraphSemanticsProps): UseGraphSemanticsReturn {
  const [filters, setFilters] = useState<SemanticFilters>({ ...defaultFilters });

  // Compute visibility based on filters and graph
  const visibility = useMemo(() => {
    if (!graph) return null;
    return computeSemanticVisibility(graph, edges, filters);
  }, [graph, edges, filters]);

  // Subgraph controls
  const setSubgraphNode = (nodeId: string | undefined, hops: number = 1) => {
    setFilters(prev => ({
      ...prev,
      subgraphNodeId: nodeId,
      subgraphHops: hops,
      projectClusterId: undefined, // Clear project cluster when setting subgraph
    }));
  };

  // Project cluster control
  const setProjectCluster = (projectId: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      projectClusterId: projectId,
      subgraphNodeId: undefined, // Clear subgraph when setting project cluster
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({ ...defaultFilters });
  };

  // Toggle node type
  const toggleNodeType = (type: string) => {
    setFilters(prev => {
      const newTypes = new Set(prev.enabledNodeTypes);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return { ...prev, enabledNodeTypes: newTypes };
    });
  };

  // Toggle tag
  const toggleTag = (tag: string) => {
    setFilters(prev => {
      const newTags = new Set(prev.enabledTags);
      if (newTags.has(tag)) {
        newTags.delete(tag);
      } else {
        newTags.add(tag);
      }
      return { ...prev, enabledTags: newTags };
    });
  };

  // Toggle relationship type
  const toggleRelationshipType = (relType: string) => {
    setFilters(prev => {
      const newRelTypes = new Set(prev.enabledRelationshipTypes);
      if (newRelTypes.has(relType)) {
        newRelTypes.delete(relType);
      } else {
        newRelTypes.add(relType);
      }
      return { ...prev, enabledRelationshipTypes: newRelTypes };
    });
  };

  // Clear type filters (show all types)
  const clearTypeFilters = () => {
    setFilters(prev => ({
      ...prev,
      enabledNodeTypes: new Set(),
      enabledTags: new Set(),
      enabledRelationshipTypes: new Set(),
    }));
  };

  // Set gravity threshold
  const setGravityThreshold = (threshold?: number) => {
    setFilters(prev => ({
      ...prev,
      edgeGravityThreshold: threshold,
    }));
  };

  // Get unique tags from graph
  const getAvailableTags = (): string[] => {
    if (!graph) return [];
    const tags = new Set<string>();
    for (const node of graph.nodes) {
      for (const tag of node.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  };

  // Get unique relationship types
  const getAvailableRelationshipTypes = (): string[] => {
    const types = new Set<string>();
    for (const edge of edges) {
      types.add(edge.relationship_type);
    }
    return Array.from(types).sort();
  };

  return {
    filters,
    visibility,
    setSubgraphNode,
    setProjectCluster,
    clearAllFilters,
    toggleNodeType,
    toggleTag,
    toggleRelationshipType,
    clearTypeFilters,
    setGravityThreshold,
    getAvailableTags,
    getAvailableRelationshipTypes,
  };
}
