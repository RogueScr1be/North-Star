#!/usr/bin/env python3
"""
GENERATE-SEED.PY
Converts revised founder inventory JSON to Supabase seed SQL

Usage:
  python3 generate-seed.py ../../../deliverable-1.1-founder-node-inventory-revised.json > phase1-seed.sql
"""

import json
import sys
from datetime import datetime
from typing import Any

def escape_sql_string(s: str | None) -> str:
    """Escape string for SQL"""
    if s is None:
        return "NULL"
    # Replace single quotes with two single quotes
    escaped = s.replace("'", "''")
    return f"'{escaped}'"

def escape_json(data: Any) -> str:
    """Escape JSON for SQL"""
    json_str = json.dumps(data)
    escaped = json_str.replace("'", "''")
    return f"'{escaped}'"

def generate_seed_sql(inventory_file: str) -> str:
    """Generate seed SQL from inventory JSON"""

    with open(inventory_file, 'r') as f:
        inventory = json.load(f)

    lines = [
        "-- PHASE 1 SEED DATA",
        "-- Generated from deliverable-1.1-founder-node-inventory-revised.json",
        f"-- Generated at {datetime.now().isoformat()}",
        "",
        "-- ============================================================================",
        "-- PROFILES",
        "-- ============================================================================",
        "",
    ]

    # Insert profile
    profile = inventory['profile']
    focus_areas = ",".join([f"'{area.replace(chr(39), chr(39)+chr(39))}'" for area in profile['focus_areas']])
    lines.append(f"""INSERT INTO profiles (id, name, title, headline, focus_areas, created_at, updated_at)
VALUES (
  {escape_sql_string(profile['id'])},
  {escape_sql_string(profile['name'])},
  {escape_sql_string(profile['title'])},
  {escape_sql_string(profile['headline'])},
  ARRAY[{focus_areas}],
  {escape_sql_string(profile.get('created_at'))},
  {escape_sql_string(profile.get('updated_at'))}
) ON CONFLICT (id) DO NOTHING;
""")

    lines += [
        "",
        "-- ============================================================================",
        "-- PROJECTS",
        "-- ============================================================================",
        "",
    ]

    # Insert projects
    for project in inventory['projects']:
        project_profile_id = project.get('profile_id') or profile['id']
        lines.append(f"""INSERT INTO projects (id, profile_id, name, short_desc, system_design, status, gravity_score, is_featured, created_at, updated_at)
VALUES (
  {escape_sql_string(project['id'])},
  {escape_sql_string(project_profile_id)},
  {escape_sql_string(project['name'])},
  {escape_sql_string(project['short_desc'])},
  {escape_sql_string(project.get('system_design'))},
  {escape_sql_string(project.get('status', 'active'))},
  {project.get('gravity_score', 0.5)},
  {str(project.get('is_featured', False)).lower()},
  {escape_sql_string(project.get('created_at'))},
  {escape_sql_string(project.get('updated_at'))}
) ON CONFLICT (id) DO NOTHING;
""")

    lines += [
        "",
        "-- ============================================================================",
        "-- NODES",
        "-- ============================================================================",
        "",
    ]

    # Insert nodes
    for node in inventory['nodes']:
        tags = ",".join([f"'{tag.replace(chr(39), chr(39)+chr(39))}'" for tag in node.get('tags', [])])
        metadata = escape_json(node.get('metadata_json', {}))
        node_profile_id = node.get('profile_id') or profile['id']
        tag_array = f"ARRAY[{tags}]{'::text[]' if tags else ''}" if tags else "'{}'::text[]"

        # Extract coordinates (required)
        x = node.get('x')
        y = node.get('y')
        z = node.get('z')

        if x is None or y is None or z is None:
            raise ValueError(
                f"Node '{node['id']}' missing required coordinate. "
                f"All nodes must have x, y, z authored before seeding. "
                f"Found: x={x}, y={y}, z={z}"
            )

        lines.append(f"""INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  {escape_sql_string(node['id'])},
  {escape_sql_string(node_profile_id)},
  {escape_sql_string(node['type'])},
  {escape_sql_string(node['title'])},
  {escape_sql_string(node.get('description'))},
  {node.get('gravity_score', 0.5)},
  {tag_array},
  {str(node.get('is_featured', False)).lower()},
  {escape_sql_string(node.get('source_attribution', 'explicit'))},
  {escape_sql_string(node.get('ref_table'))},
  {escape_sql_string(node.get('ref_id'))},
  {metadata}::jsonb,
  {x},
  {y},
  {z},
  {escape_sql_string(node.get('created_at'))},
  {escape_sql_string(node.get('updated_at'))}
) ON CONFLICT (id) DO UPDATE SET
  profile_id = EXCLUDED.profile_id,
  type = EXCLUDED.type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  gravity_score = EXCLUDED.gravity_score,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  source_attribution = EXCLUDED.source_attribution,
  ref_table = EXCLUDED.ref_table,
  ref_id = EXCLUDED.ref_id,
  metadata_json = EXCLUDED.metadata_json,
  x = EXCLUDED.x,
  y = EXCLUDED.y,
  z = EXCLUDED.z,
  updated_at = EXCLUDED.updated_at;
""")

    lines += [
        "",
        "-- ============================================================================",
        "-- EDGES",
        "-- ============================================================================",
        "",
    ]

    # Insert edges
    for edge in inventory['edges']:
        # Handle both source_id/target_id and source_node_id/target_node_id naming
        source_id = edge.get('source_id') or edge.get('source_node_id')
        target_id = edge.get('target_id') or edge.get('target_node_id')

        lines.append(f"""INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  {escape_sql_string(edge['id'])},
  {escape_sql_string(edge.get('profile_id') or profile['id'])},
  {escape_sql_string(source_id)},
  {escape_sql_string(target_id)},
  {escape_sql_string(edge['relationship_type'])},
  {escape_sql_string(edge.get('created_at'))},
  {escape_sql_string(edge.get('updated_at'))}
) ON CONFLICT (id) DO NOTHING;
""")

    lines += [
        "",
        "-- ============================================================================",
        "-- VALIDATION",
        "-- ============================================================================",
        "",
        "-- Count records",
        "SELECT 'Profiles: ' || COUNT(*) FROM profiles;",
        "SELECT 'Projects: ' || COUNT(*) FROM projects;",
        "SELECT 'Nodes: ' || COUNT(*) FROM nodes;",
        "SELECT 'Edges: ' || COUNT(*) FROM edges;",
    ]

    return "\n".join(lines)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 generate-seed.py <inventory-json-file>", file=sys.stderr)
        sys.exit(1)

    sql = generate_seed_sql(sys.argv[1])
    print(sql)
