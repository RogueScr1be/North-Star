/**
 * SEMANTICFILTERS.TSX
 * UI for semantic graph navigation: subgraph, clustering, type/tag filters
 * Phase 5.5: Intelligent exploration controls
 */

import React from 'react';
import type { RenderableGraph } from '../../lib/graph/graphTransforms';
import type { SemanticFilters as SemanticFiltersState } from '../../lib/graph/graphSemantics';
import './SemanticFilters.css';

interface SemanticFiltersUIProps {
  graph: RenderableGraph | null;
  filters: SemanticFiltersState;

  // Subgraph controls
  onSetSubgraphNode: (nodeId: string | undefined, hops?: number) => void;

  // Project cluster controls
  onSetProjectCluster: (projectId: string | undefined) => void;

  // Filter controls
  onToggleNodeType: (type: string) => void;
  onToggleTag: (tag: string) => void;
  onToggleRelationshipType: (relType: string) => void;
  onClearTypeFilters: () => void;

  // Gravity threshold
  onSetGravityThreshold: (threshold?: number) => void;

  // Clear all
  onClearAll: () => void;

  // Utilities
  getAvailableTags: () => string[];
  getAvailableRelationshipTypes: () => string[];
}

export const SemanticFilters: React.FC<SemanticFiltersUIProps> = ({
  graph,
  filters,
  onSetSubgraphNode,
  onSetProjectCluster,
  onToggleNodeType,
  onToggleTag,
  onToggleRelationshipType,
  onClearTypeFilters,
  onSetGravityThreshold,
  onClearAll,
  getAvailableTags,
  getAvailableRelationshipTypes,
}) => {
  if (!graph) return null;

  const nodeTypes = Array.from(new Set(graph.nodes.map(n => n.type)));
  const availableTags = getAvailableTags();
  const relationshipTypes = getAvailableRelationshipTypes();

  return (
    <div className="semantic-filters-panel">
      <div className="filters-header">
        <h3>Graph Navigation</h3>
        {(filters.subgraphNodeId || filters.projectClusterId || filters.enabledNodeTypes.size > 0 || filters.enabledTags.size > 0 || filters.edgeGravityThreshold) && (
          <button className="filters-clear-all" onClick={onClearAll} title="Clear all filters">
            ✕ Clear
          </button>
        )}
      </div>

      {/* Subgraph Mode */}
      {graph.nodes.length > 0 && (
        <div className="filters-section">
          <label className="filters-section-title">Subgraph Isolation</label>
          {filters.subgraphNodeId ? (
            <div className="filters-active">
              <div className="active-filter">
                Isolating node + neighborhood
                <button className="filter-remove" onClick={() => onSetSubgraphNode(undefined)}>
                  ✕
                </button>
              </div>
              <div className="filters-sub-controls">
                <label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    value={filters.subgraphHops ?? 1}
                    onChange={e => onSetSubgraphNode(filters.subgraphNodeId, parseInt(e.target.value))}
                  />
                  Hops: {filters.subgraphHops ?? 1}
                </label>
              </div>
            </div>
          ) : (
            <p className="filters-hint">Click a node on canvas to isolate its neighborhood</p>
          )}
        </div>
      )}

      {/* Project Cluster Mode */}
      {graph.projects.length > 0 && (
        <div className="filters-section">
          <label className="filters-section-title">Project Cluster</label>
          {filters.projectClusterId ? (
            <div className="filters-active">
              <div className="active-filter">
                Isolating project
                <button className="filter-remove" onClick={() => onSetProjectCluster(undefined)}>
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="filters-options">
              {graph.projects.map(proj => (
                <button
                  key={proj.id}
                  className="filter-option"
                  onClick={() => onSetProjectCluster(proj.id)}
                  title={proj.description}
                >
                  {proj.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Node Type Filter */}
      {nodeTypes.length > 0 && (
        <div className="filters-section">
          <label className="filters-section-title">Node Types</label>
          <div className="filters-options">
            {nodeTypes.map(type => (
              <button
                key={type}
                className={`filter-option ${filters.enabledNodeTypes.has(type) ? 'active' : ''}`}
                onClick={() => onToggleNodeType(type)}
              >
                {type} {filters.enabledNodeTypes.has(type) ? '✓' : ''}
              </button>
            ))}
          </div>
          {filters.enabledNodeTypes.size > 0 && (
            <button className="filters-sub-clear" onClick={onClearTypeFilters}>
              Show all types
            </button>
          )}
        </div>
      )}

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <div className="filters-section">
          <label className="filters-section-title">Tags</label>
          <div className="filters-tags">
            {availableTags.slice(0, 8).map(tag => (
              <button
                key={tag}
                className={`filter-tag ${filters.enabledTags.has(tag) ? 'active' : ''}`}
                onClick={() => onToggleTag(tag)}
                title={`Filter by tag: ${tag}`}
              >
                {tag} {filters.enabledTags.has(tag) ? '✓' : ''}
              </button>
            ))}
            {availableTags.length > 8 && (
              <span className="filters-tag-overflow">+{availableTags.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      {/* Gravity Threshold */}
      <div className="filters-section">
        <label className="filters-section-title">Edge Strength</label>
        <div className="filters-gravity">
          <label>
            <input
              type="checkbox"
              checked={filters.edgeGravityThreshold !== undefined}
              onChange={e => {
                if (e.target.checked) {
                  onSetGravityThreshold(0.5);
                } else {
                  onSetGravityThreshold(undefined);
                }
              }}
            />
            Show only strong relationships
          </label>
          {filters.edgeGravityThreshold !== undefined && (
            <div className="filters-gravity-slider">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filters.edgeGravityThreshold}
                onChange={e => onSetGravityThreshold(parseFloat(e.target.value))}
              />
              <span>Threshold: {filters.edgeGravityThreshold.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Relationship Type Filter */}
      {relationshipTypes.length > 0 && (
        <div className="filters-section">
          <label className="filters-section-title">Relationship Types</label>
          <div className="filters-rel-types">
            {relationshipTypes.slice(0, 6).map(relType => (
              <button
                key={relType}
                className={`filter-rel-type ${filters.enabledRelationshipTypes.has(relType) ? 'active' : ''}`}
                onClick={() => onToggleRelationshipType(relType)}
                title={`Show ${relType} relationships`}
              >
                {relType.replace(/_/g, ' ')}
              </button>
            ))}
            {relationshipTypes.length > 6 && (
              <button className="filter-rel-type-more">
                +{relationshipTypes.length - 6}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
