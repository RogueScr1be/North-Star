-- MIGRATION 002: Create Projects Table
-- Phase 1: 4 founder projects (GetIT, Fast Food, Anansi, North Star)

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_desc TEXT NOT NULL,
  system_design TEXT,
  status TEXT CHECK (status IN ('active', 'archived', 'planned')) DEFAULT 'active',
  gravity_score DECIMAL(2,2) CHECK (gravity_score >= 0 AND gravity_score <= 1.0),
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS Policies: Read-only
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view projects" ON projects
  FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_profile_id ON projects(profile_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_featured ON projects(is_featured);
CREATE INDEX IF NOT EXISTS idx_projects_gravity_score ON projects(gravity_score DESC);
