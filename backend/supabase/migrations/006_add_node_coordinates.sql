-- MIGRATION 006: Add Node Coordinates
-- Phase 2: Persist authored node positions for constellation rendering
--
-- NOTE: DEFAULT 0 is migration safety only. It does NOT satisfy coordinate authoring.
-- All nodes MUST have real authored (x, y, z) in the seed data.
-- Rows with zero coordinates are transitional and do not count as "ready for rendering."

-- UP
ALTER TABLE nodes
ADD COLUMN x DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN y DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN z DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DOWN
ALTER TABLE nodes
DROP COLUMN IF EXISTS z,
DROP COLUMN IF EXISTS y,
DROP COLUMN IF EXISTS x;
