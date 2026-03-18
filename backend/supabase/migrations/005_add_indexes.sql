-- MIGRATION 005: Add Indexes and Constraints
-- Optimize query performance for Phase 1 read-only operations

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_nodes_profile_type ON nodes(profile_id, type);
CREATE INDEX IF NOT EXISTS idx_nodes_profile_gravity ON nodes(profile_id, gravity_score DESC);
CREATE INDEX IF NOT EXISTS idx_edges_source_type ON edges(source_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_edges_target_type ON edges(target_id, relationship_type);

-- Full-text search index (future Phase 2+)
-- CREATE INDEX IF NOT EXISTS idx_nodes_title_search ON nodes USING GIN(to_tsvector('english', title));

-- View: Project node counts (for ProjectLedger)
CREATE OR REPLACE VIEW project_node_counts AS
SELECT
  p.id,
  p.name,
  COUNT(n.id) as node_count
FROM projects p
LEFT JOIN nodes n ON n.ref_id = p.id
GROUP BY p.id, p.name;

-- View: Node relationships (incoming/outgoing edges)
CREATE OR REPLACE VIEW node_edges_view AS
SELECT
  n.id,
  n.title,
  e.relationship_type,
  e.source_id,
  e.target_id,
  'outgoing'::TEXT as direction
FROM nodes n
JOIN edges e ON n.id = e.source_id

UNION ALL

SELECT
  n.id,
  n.title,
  e.relationship_type,
  e.source_id,
  e.target_id,
  'incoming'::TEXT as direction
FROM nodes n
JOIN edges e ON n.id = e.target_id;
