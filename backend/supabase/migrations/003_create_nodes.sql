-- MIGRATION 003: Create Nodes Table
-- Phase 1: 52 nodes (decisions, constraints, outcomes, skills, failures, experiments, projects)

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('project', 'decision', 'constraint', 'failure', 'metric', 'skill', 'outcome', 'experiment')),
  title TEXT NOT NULL,
  description TEXT,
  gravity_score DECIMAL(2,2) CHECK (gravity_score >= 0 AND gravity_score <= 1.0),
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  source_attribution TEXT CHECK (source_attribution IN ('explicit', 'strongly_inferred', 'weakly_inferred')),

  -- Reference back to project (optional; most nodes belong to a project)
  ref_table TEXT,
  ref_id TEXT,

  -- Metadata: evidence, evidence structure, custom fields
  metadata_json JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS Policies: Read-only
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view nodes" ON nodes
  FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nodes_profile_id ON nodes(profile_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_ref_id ON nodes(ref_id);
CREATE INDEX IF NOT EXISTS idx_nodes_gravity_score ON nodes(gravity_score DESC);
CREATE INDEX IF NOT EXISTS idx_nodes_is_featured ON nodes(is_featured);
CREATE INDEX IF NOT EXISTS idx_nodes_tags ON nodes USING GIN(tags);
