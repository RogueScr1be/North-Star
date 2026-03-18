-- MIGRATION 001: Create Profiles Table
-- Phase 1: Single founder profile (Prentiss)

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  headline TEXT NOT NULL,
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS Policies: Read-only (no auth Phase 1)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT USING (true);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
