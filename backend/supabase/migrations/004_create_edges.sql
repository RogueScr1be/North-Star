-- MIGRATION 004: Create Edges Table
-- Phase 1: 59 edges (relationships between nodes)
-- Using 8-verb core: demonstrates, produces, shapes, requires, shares_pattern, enables, leads_to, contains

CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'demonstrates',
    'produces',
    'shapes',
    'requires',
    'shares_pattern',
    'enables',
    'leads_to',
    'contains',
    -- Reserved for Phase 2+:
    'improves',
    'uses',
    'causes',
    'conflicts_with',
    'depends_on',
    'derived_from'
  )),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure no duplicate edges
  UNIQUE(source_id, target_id, relationship_type)
);

-- RLS Policies: Read-only
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view edges" ON edges
  FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_edges_profile_id ON edges(profile_id);
CREATE INDEX IF NOT EXISTS idx_edges_source_id ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target_id ON edges(target_id);
CREATE INDEX IF NOT EXISTS idx_edges_relationship_type ON edges(relationship_type);
