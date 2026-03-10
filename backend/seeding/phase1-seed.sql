-- PHASE 1 SEED DATA
-- Generated from deliverable-1.1-founder-node-inventory-revised.json
-- Generated at 2026-03-09T20:32:40.629475

-- ============================================================================
-- PROFILES
-- ============================================================================

INSERT INTO profiles (id, name, title, headline, focus_areas, created_at, updated_at)
VALUES (
  'prentiss-frontier-operator',
  'Prentiss',
  'Frontier Operator',
  'Building AI-native operating systems and coordination layers',
  ARRAY['AI-native operating systems','Coordination layers','Decision compression systems','Knowledge acquisition platforms'],
  '2025-01-01T00:00:00Z',
  '2025-03-07T00:00:00Z'
) ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- PROJECTS
-- ============================================================================

INSERT INTO projects (id, profile_id, name, short_desc, system_design, status, gravity_score, is_featured, created_at, updated_at)
VALUES (
  'proj-getit',
  'prentiss-frontier-operator',
  'GetIT',
  'Video-first transactional local services marketplace',
  'Video-first transactional local services marketplace. Core documented MVP includes h-app editing, high-quality video playback, real-time notifications, payments, brief recommendations, AI-based tagging/transcription. Longer-term direction: geo-boosting, video insight, contextual personalization, voice, offline-on-device, and ambient layers.',
  'active',
  0.9,
  true,
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, profile_id, name, short_desc, system_design, status, gravity_score, is_featured, created_at, updated_at)
VALUES (
  'proj-fastfood',
  'prentiss-frontier-operator',
  'Fast Food',
  'AI-native family meal-planning / dinner-decision OS',
  'AI-native family meal-planning and dinner-decision operating system. Local-first intelligence with biometric learning stored in Supabase. Context-aware inputs including living geography. NaiveExpo path established for navigation tooling. Expansion UX intended to stay short by default.',
  'active',
  0.75,
  true,
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, profile_id, name, short_desc, system_design, status, gravity_score, is_featured, created_at, updated_at)
VALUES (
  'proj-anansi',
  'prentiss-frontier-operator',
  'Anansi',
  'AI-native platform converting lessons into playable educational games',
  'AI-native platform that tunes lessons into playable indie-grade educational games. Concept is lesson-to-game generation positioned between serious edtech and fun-but-shallow learning products. Targets three audiences simultaneously: kids (engagement), teachers (results + evidence), parents (simple, engaging experience).',
  'active',
  0.65,
  true,
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, profile_id, name, short_desc, system_design, status, gravity_score, is_featured, created_at, updated_at)
VALUES (
  'proj-northstar',
  'prentiss-frontier-operator',
  'North Star',
  'Knowledge graph constellation rendering founder capability',
  'Knowledge graph / constellation-style product centered on a single founder profile. Three core surfaces: Constellation Canvas (force-directed graph visualization), Node Expansion Panel (drill-down detail), Ask-the-Graph interface (semantic query layer). Graph engine renders people/projects/skills/decisions/work with clustering, node expansion, and graph querying as core interaction patterns. Initial scope: Single Profile v0 with stable rendering, performance budgets, zoom levels, and clarity acceptance criteria.',
  'active',
  0.85,
  true,
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- NODES
-- ============================================================================

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-getit-constraint-trust',
  'prentiss-frontier-operator',
  'constraint',
  'Marketplace Trust & Recommendation Transparency',
  'Marketplace trust and recommendation transparency matter. Expansion into ambient platform materiality requires explicitly noting ethical issues around material requirements.',
  0.85,
  ARRAY['marketplace','trust','ethics','transparency']::text[],
  true,
  'explicit',
  'projects',
  'proj-getit',
  '{}'::jsonb,
  70,
  14,
  24,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-getit-constraint-realtime-scale',
  'prentiss-frontier-operator',
  'constraint',
  'Real-Time Notifications Must Scale',
  'Real-time notifications in marketplace context require reliable infrastructure and user experience at scale. Implicit in MVP design.',
  0.7,
  ARRAY['marketplace','infrastructure','real-time','scale']::text[],
  false,
  'strongly_inferred',
  'projects',
  'proj-getit',
  '{}'::jsonb,
  74,
  19,
  22,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-getit-constraint-material-ethics',
  'prentiss-frontier-operator',
  'constraint',
  'Ambient Platform Materiality Raises Ethical Questions',
  'Ethical issues around material requirements and ambient platform behavior are explicitly noted as a separate constraint from marketplace trust.',
  0.75,
  ARRAY['ethics','materiality','ambient','constraints']::text[],
  true,
  'explicit',
  'projects',
  'proj-getit',
  '{}'::jsonb,
  77,
  11,
  27,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-getit-decision-invite-only',
  'prentiss-frontier-operator',
  'decision',
  'Invite-Only Controlled Launch Strategy',
  'Launch first with invite-only controlled access. Phased expansion with trust-building as part of GTM logic, rather than attempting full marketplace launch in one month.',
  0.9,
  ARRAY['marketplace','gtm','go-to-market','trust-building']::text[],
  true,
  'explicit',
  'projects',
  'proj-getit',
  '{}'::jsonb,
  46,
  16.66,
  34,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-getit-decision-video-first',
  'prentiss-frontier-operator',
  'decision',
  'Prioritize Video-First Interaction',
  'Make video the primary medium for service discovery, transactions, and user interaction. Core architectural choice.',
  0.95,
  ARRAY['video','ux','marketplace','core-decision']::text[],
  true,
  'explicit',
  'projects',
  'proj-getit',
  '{}'::jsonb,
  44.54,
  10.23,
  31,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-getit-decision-mvp-scope',
  'prentiss-frontier-operator',
  'decision',
  'MVP Scope: H-app, Playback, Notifications, Payments, Recommendations',
  'Define minimal viable product to include h-app editing, high-quality video playback, real-time notifications, payments integration, and AI-powered recommendations. Deliberately bounded scope.',
  0.9,
  ARRAY['mvp','scope','feature-prioritization']::text[],
  true,
  'explicit',
  'projects',
  'proj-getit',
  '{}'::jsonb,
  50.12,
  10.33,
  27,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-getit-decision-ai-tagging',
  'prentiss-frontier-operator',
  'decision',
  'Use AI-Based Tagging and Transcription',
  'Leverage AI models for automatic metadata generation (tagging, transcription) to reduce editorial overhead and improve searchability.',
  0.8,
  ARRAY['ai','metadata','automation']::text[],
  false,
  'explicit',
  'projects',
  'proj-getit',
  '{}'::jsonb,
  51,
  17,
  38.67,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-getit-metric-watchthrough',
  'prentiss-frontier-operator',
  'metric',
  'Watch-Through Rate (Primary KPI)',
  'Watch-through rates on GetIT, clicks, and ASR buffer response. MVP capabilities are descriptive rather than prescriptive; testing and UX iteration ongoing.',
  0.8,
  ARRAY['metrics','engagement','video']::text[],
  false,
  'explicit',
  'projects',
  'proj-getit',
  '{}'::jsonb,
  45,
  -8,
  33,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-getit-failure-metrics-sparse',
  'prentiss-frontier-operator',
  'failure',
  'No Formal Business Metrics Documented',
  'GetIT lacks formal business metrics (GMV, CAC, retention, vendor density). Focus has been on MVP capabilities and testing, not yet on business model measurement.',
  0.5,
  ARRAY['testing','learning','risk','metrics-gap']::text[],
  false,
  'explicit',
  'projects',
  'proj-getit',
  '{}'::jsonb,
  60,
  -11,
  30,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-getit-outcome-mvp-capabilities',
  'prentiss-frontier-operator',
  'outcome',
  'MVP Capabilities Established and Documented',
  'Sufficient progress on MVP capabilities for founder networking, iteration, and booster testing. Product philosophy and UX direction coherent.',
  0.8,
  ARRAY['product','mvp','delivery']::text[],
  true,
  'explicit',
  'projects',
  'proj-getit',
  '{}'::jsonb,
  74,
  -6,
  35,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-fastfood-constraint-simple',
  'prentiss-frontier-operator',
  'constraint',
  'Must Remain Simple, Calm, Mature',
  'Product must remain simple, calm, mature, and low-friction for mentally-consumed users. Local-first is an architectural constraint. Weather integration and accessibility treated as first-pass areas.',
  0.8,
  ARRAY['design','ux','simplicity','local-first']::text[],
  true,
  'explicit',
  'projects',
  'proj-fastfood',
  '{}'::jsonb,
  18,
  70,
  -14,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-fastfood-constraint-accessibility',
  'prentiss-frontier-operator',
  'constraint',
  'Accessibility Must Be First-Pass',
  'Accessibility is treated as a first-pass design constraint, not an afterthought. Affects interaction design and scope decisions.',
  0.8,
  ARRAY['accessibility','design','constraints']::text[],
  true,
  'explicit',
  'projects',
  'proj-fastfood',
  '{}'::jsonb,
  13.5,
  73.5,
  -16,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-fastfood-decision-localfirst',
  'prentiss-frontier-operator',
  'decision',
  'Local-First Architecture (Over Cloud-First)',
  'Chose local-first over cloud-first design. Data stored in Supabase with context-aware inputs. Supports offline capability and user agency over remote synchronization.',
  0.9,
  ARRAY['architecture','local-first','data','offline']::text[],
  true,
  'explicit',
  'projects',
  'proj-fastfood',
  '{}'::jsonb,
  -11,
  70,
  -12,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-fastfood-decision-meal-planning-os',
  'prentiss-frontier-operator',
  'decision',
  'Position as AI-Native Meal-Planning Operating System',
  'Frame Fast Food as an AI-native family meal-planning and dinner-decision operating system, not just a recipe app. OS framing implies systematic, extensible approach.',
  0.95,
  ARRAY['positioning','ai','product-strategy']::text[],
  true,
  'explicit',
  'projects',
  'proj-fastfood',
  '{}'::jsonb,
  -9,
  66,
  -19,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-fastfood-decision-biometric',
  'prentiss-frontier-operator',
  'decision',
  'Integrate Biometric Learning for Personalization',
  'Use biometric learning (stored in Supabase) to personalize meal and dinner suggestions. Context-aware inputs include geography and user preferences.',
  0.8,
  ARRAY['technology','personalization','biometric']::text[],
  false,
  'explicit',
  'projects',
  'proj-fastfood',
  '{}'::jsonb,
  -14,
  64,
  -21,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-fastfood-decision-naiveexpo',
  'prentiss-frontier-operator',
  'decision',
  'NaiveExpo Chosen for Navigation',
  'NaiveExpo path established for navigation tooling. One-line decision explanation. Baseline UX intent is to stay short by default during expansion.',
  0.7,
  ARRAY['technology','navigation','ux']::text[],
  false,
  'explicit',
  'projects',
  'proj-fastfood',
  '{}'::jsonb,
  -17.56,
  67,
  -17,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-fastfood-decision-expansion-ux-short',
  'prentiss-frontier-operator',
  'decision',
  'Keep Expansion UX Short by Default',
  'As Fast Food expands features, maintain the constraint that new UX paths stay short. Do not accumulate complexity over time.',
  0.75,
  ARRAY['ux','simplicity','discipline']::text[],
  true,
  'explicit',
  'projects',
  'proj-fastfood',
  '{}'::jsonb,
  -16,
  -71,
  -20,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-fastfood-outcome-philosophy',
  'prentiss-frontier-operator',
  'outcome',
  'Strongly Developed Product Philosophy',
  'Fast Food has developed a strong product philosophy and interaction design approach. Initial interaction design documented and coherent. Expansion UX intent is clear (stay short).',
  0.75,
  ARRAY['product','design','philosophy']::text[],
  true,
  'explicit',
  'projects',
  'proj-fastfood',
  '{}'::jsonb,
  23,
  56,
  -12,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-fastfood-outcome-expansion-ux',
  'prentiss-frontier-operator',
  'outcome',
  'Expansion UX Approach Designed to Preserve Simplicity',
  'Through constraint navigation, developed a clear expansion UX strategy that keeps complexity low and interaction paths short as Fast Food grows.',
  0.8,
  ARRAY['product','ux','scalability']::text[],
  true,
  'explicit',
  'projects',
  'proj-fastfood',
  '{}'::jsonb,
  15,
  57,
  -14,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-fastfood-outcome-biometric-integration',
  'prentiss-frontier-operator',
  'outcome',
  'Biometric Learning Path Established',
  'Biometric learning architecture designed and integrated with Supabase storage. Feature realization demonstrates AI-product integration at scale.',
  0.75,
  ARRAY['product','ai','personalization']::text[],
  false,
  'explicit',
  'projects',
  'proj-fastfood',
  '{}'::jsonb,
  18,
  52,
  -17,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-anansi-constraint-three-audiences',
  'prentiss-frontier-operator',
  'constraint',
  'Must Satisfy Three Audiences Simultaneously',
  'Product must satisfy three distinct audiences at once: kids (need engagement), teachers (need results and evidence), parents (need simplicity and engagement). Cannot optimize for one at expense of others.',
  0.85,
  ARRAY['edtech','product','design','market']::text[],
  true,
  'explicit',
  'projects',
  'proj-anansi',
  '{}'::jsonb,
  -47,
  18,
  -26,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-anansi-decision-ai-native-wedge',
  'prentiss-frontier-operator',
  'decision',
  'AI-Native Lesson-to-Game Generation as Wedge',
  'Positioning Anansi as AI-native platform with lesson-to-game generation as the core wedge. Concept positioned between serious edtech and fun-but-shallow learning products. Rather than generic quiz or software approach.',
  0.85,
  ARRAY['ai','edtech','positioning','product-market-fit']::text[],
  true,
  'explicit',
  'projects',
  'proj-anansi',
  '{}'::jsonb,
  -65,
  16,
  -34,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-anansi-decision-lesson-to-game',
  'prentiss-frontier-operator',
  'decision',
  'Core Algorithm: Lesson-to-Game Transformation',
  'Build core capability to transform educational lessons into playable, engaging indie-grade games. This is the primary differentiation vs. traditional edtech.',
  0.9,
  ARRAY['ai','algorithm','edtech','game-design']::text[],
  true,
  'explicit',
  'projects',
  'proj-anansi',
  '{}'::jsonb,
  -71,
  9.3,
  -36,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-anansi-outcome-opportunity',
  'prentiss-frontier-operator',
  'outcome',
  'Strong Opportunity Framing & Strategic Story',
  'Anansi has developed strong opportunity framing and strategic narrative. Concept occupies clear position in edtech spectrum. Tech approach aligned with market timing and audience needs.',
  0.7,
  ARRAY['edtech','strategy','positioning']::text[],
  true,
  'explicit',
  'projects',
  'proj-anansi',
  '{}'::jsonb,
  -50,
  2,
  -26,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-anansi-outcome-lesson-to-game-model',
  'prentiss-frontier-operator',
  'outcome',
  'Lesson-to-Game Generation Model Established',
  'Core lesson-to-game transformation model conceptually established and positioned as the market differentiator. Validates AI-native approach to educational game design.',
  0.8,
  ARRAY['product','ai','edtech']::text[],
  true,
  'explicit',
  'projects',
  'proj-anansi',
  '{}'::jsonb,
  -47,
  5.7,
  -24,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-decision-single-profile',
  'prentiss-frontier-operator',
  'decision',
  'Start with Single Profile v0 (Not Multi-User)',
  'Explicit decision to begin with single founder profile rendering, not multi-user network. Scope locked from source. Necessary for proof of concept before expanding to broader universe.',
  0.95,
  ARRAY['scope','mvp','prioritization','product-strategy']::text[],
  true,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  -18,
  -48,
  22,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-decision-three-surfaces',
  'prentiss-frontier-operator',
  'decision',
  'Three Core Surfaces: Canvas, Panel, Ask-the-Graph',
  'Define exactly three primary UX surfaces: Constellation Canvas (graph visualization), Node Expansion Panel (detail view), Ask-the-Graph interface (query layer). Bounded scope prevents feature creep.',
  0.95,
  ARRAY['architecture','ux','scope']::text[],
  true,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  -16.3,
  -50.66,
  24,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-decision-forceDirectedLayout',
  'prentiss-frontier-operator',
  'decision',
  'Force-Directed Layout with Stored Positions',
  'Use force-directed algorithm (d3-force) to compute initial node positions. Store positions in database for stability and repeatability. No runtime recomputation unless content changes.',
  0.9,
  ARRAY['rendering','architecture','performance']::text[],
  true,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  -18,
  -55,
  20,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-decision-performance-budgets',
  'prentiss-frontier-operator',
  'decision',
  'Define Hard Performance Targets',
  'Lock explicit performance budgets: LCP <2.0s, 55-60 FPS target, <50ms hover latency, <150ms click-to-panel. No vague ''fast enough'' — measure against M1 MacBook baseline.',
  0.95,
  ARRAY['performance','engineering','discipline']::text[],
  true,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  -13,
  -55,
  18,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-decision-bloom-postprocessing',
  'prentiss-frontier-operator',
  'decision',
  'Enable Bloom Post-Processing',
  'Use Three.js bloom effect for visual clarity and glow. Settings: strength 0.5, radius 0.8, threshold 0.8. Improves visual feedback without overwhelming the interface.',
  0.8,
  ARRAY['rendering','visual-design']::text[],
  false,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  -20,
  -51,
  27,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-decision-reduced-motion',
  'prentiss-frontier-operator',
  'decision',
  'Accessibility: Reduced Motion Support Required',
  'Detect and respect prefers-reduced-motion media query. Disable all animations (instant transitions instead) for users with motion sensitivity.',
  0.85,
  ARRAY['accessibility','design']::text[],
  true,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  -22,
  -54.66,
  22,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-constraint-immersive-clarity',
  'prentiss-frontier-operator',
  'constraint',
  'Must Feel Immersive & Beautiful Without Visual Heaviness',
  'Interface must feel immersive and beautiful without becoming visually heavy or cluttered. Current phase focuses on maintaining clarity. Document spec direction for single profile v0. Interface integrity depends on clear information hierarchy and avoiding over-rendering.',
  0.9,
  ARRAY['design','ux','clarity','aesthetics']::text[],
  true,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  7,
  -46,
  16,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-constraint-desktop-first',
  'prentiss-frontier-operator',
  'constraint',
  'Desktop-First Rendering; Mobile Deferred',
  'Optimize rendering for desktop viewports first. Mobile support deferred to Phase 2+. Initial v0 targets laptop/desktop screens (1280px+).',
  0.9,
  ARRAY['scope','ux','device']::text[],
  true,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  11,
  -42,
  12,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-constraint-three-surfaces-integrity',
  'prentiss-frontier-operator',
  'constraint',
  'Three Core Surfaces Must Maintain Interaction Integrity',
  'Constellation Canvas, Node Expansion Panel, and Ask-the-Graph interface must work flawlessly together. Navigation between surfaces must be seamless and predictable.',
  0.8,
  ARRAY['architecture','ux','integration']::text[],
  true,
  'strongly_inferred',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  9,
  -50,
  15,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-failure-graph-model',
  'prentiss-frontier-operator',
  'failure',
  'Graph Model Mistakes & UX Dead Ends (Early)',
  'One clear failure already surfaced: drifted into premature graph-model mistakes and UX dead ends. Recovered by restructuring scope to single profile v0 with explicit performance budgets and clarity criteria. Learning: lock content and rendering spec before code.',
  0.7,
  ARRAY['learning','scope-creep','architecture']::text[],
  true,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  -10,
  -63,
  17,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-outcome-concept-model',
  'prentiss-frontier-operator',
  'outcome',
  'Product Concept Model & Spec Direction Documented',
  'North Star has already produced meaningful outputs including product concept model, specification direction, and reference implementation targets. Constellation Canvas, Node Expansion Panel, and Ask-the-Graph interface models established. Three-screen interface architecture clear.',
  0.9,
  ARRAY['product','design','specification','architecture']::text[],
  true,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  8,
  -64,
  20,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-outcome-rendering-spec',
  'prentiss-frontier-operator',
  'outcome',
  'Rendering Specification Locked',
  'Complete rendering spec with hard values: node sizes, colors, camera presets, bloom settings, LOD breakpoints, performance budgets. Ready for Phase 2 implementation.',
  0.9,
  ARRAY['specification','rendering','delivery']::text[],
  true,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  16,
  -67,
  23,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'node-northstar-outcome-api-contract',
  'prentiss-frontier-operator',
  'outcome',
  'API Contract Specified (OpenAPI 3.0)',
  'Four endpoints specified in OpenAPI 3.0: GET /graph/profile/:id, GET /graph/node/:id, POST /graph/query, POST /graph/layout/recompute. Ready for backend implementation.',
  0.9,
  ARRAY['specification','api','delivery']::text[],
  true,
  'explicit',
  'projects',
  'proj-northstar',
  '{}'::jsonb,
  5.8,
  70,
  26,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-marketplace-design',
  'prentiss-frontier-operator',
  'skill',
  'Marketplace System Design',
  'Demonstrated expertise in designing transactional marketplaces with trust, transparency, and recommendation systems. Applied across GetIT (video services) and broader platform thinking.',
  0.85,
  ARRAY['marketplace','design','systems']::text[],
  true,
  'explicit',
  NULL,
  NULL,
  '{}'::jsonb,
  20,
  -30,
  24,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-local-first-architecture',
  'prentiss-frontier-operator',
  'skill',
  'Local-First Architecture & Offline Capability',
  'Deep expertise in designing systems that prioritize local data storage, offline-first operation, and user agency. Applied in Fast Food and ambient layer thinking for GetIT.',
  0.85,
  ARRAY['architecture','local-first','offline','data']::text[],
  true,
  'explicit',
  NULL,
  NULL,
  '{}'::jsonb,
  30,
  30,
  -14,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-ai-product-integration',
  'prentiss-frontier-operator',
  'skill',
  'AI-Native Product Integration',
  'Expertise in integrating AI models into consumer-facing products. Demonstrated in GetIT (AI tagging, transcription), Fast Food (meal planning), Anansi (lesson-to-game generation). Comfortable with constraints and tradeoffs of language models in production.',
  0.9,
  ARRAY['ai','product','integration']::text[],
  true,
  'explicit',
  NULL,
  NULL,
  '{}'::jsonb,
  0,
  20,
  8,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-constraint-navigation',
  'prentiss-frontier-operator',
  'skill',
  'Operating Under Hard Constraints',
  'Demonstrated ability to define and operate within hard constraints (marketplace trust, simplicity, three-audience design, single profile scope). Uses constraints as design force, not obstacle. Explicitly notes ethical and material constraints.',
  0.8,
  ARRAY['design','strategy','constraints']::text[],
  true,
  'explicit',
  NULL,
  NULL,
  '{}'::jsonb,
  0,
  -25,
  -9,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-graph-design',
  'prentiss-frontier-operator',
  'skill',
  'Knowledge Graph & Constellation Design',
  'Expertise in designing knowledge graph systems that render capability and decision-making patterns visually. Clear thinking on visualization, query semantics, and progressive disclosure. North Star demonstrates mature understanding of graph-as-interface.',
  0.85,
  ARRAY['graph','visualization','design']::text[],
  true,
  'explicit',
  NULL,
  NULL,
  '{}'::jsonb,
  -40,
  -45,
  12,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-video-product-design',
  'prentiss-frontier-operator',
  'skill',
  'Video-Product User Experience',
  'Expertise in designing products centered on video interaction, playback quality, and video-first marketplaces. GetIT demonstrates deep understanding of video UX, transcription, and video-driven transactions.',
  0.85,
  ARRAY['video','product','ux']::text[],
  true,
  'explicit',
  NULL,
  NULL,
  '{}'::jsonb,
  70,
  34,
  9,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-ai-native-os-design',
  'prentiss-frontier-operator',
  'skill',
  'AI-Native Operating System Design',
  'Pattern across all three projects: GetIT as ''ambient OS'', Fast Food as ''meal-planning OS'', Anansi as ''game OS''. Demonstrates thinking about software as operating systems (extensible, ambient, context-aware) rather than individual apps.',
  0.9,
  ARRAY['ai','os','design','systems-thinking']::text[],
  true,
  'strongly_inferred',
  NULL,
  NULL,
  '{}'::jsonb,
  40,
  50,
  -10,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-realtime-systems',
  'prentiss-frontier-operator',
  'skill',
  'Real-Time Interaction & Notification Systems',
  'Expertise in designing real-time systems with <50ms latency targets. Demonstrated in GetIT (real-time notifications) and North Star (performance budgets <50ms hover, <150ms click-to-panel).',
  0.85,
  ARRAY['real-time','performance','infrastructure']::text[],
  true,
  'explicit',
  NULL,
  NULL,
  '{}'::jsonb,
  40,
  -40,
  21,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-accessibility-first-design',
  'prentiss-frontier-operator',
  'skill',
  'Accessibility-First UX Design',
  'Deep commitment to accessibility as a first-pass constraint (not afterthought). Demonstrated in Fast Food (accessibility first-pass area) and North Star (reduced-motion support required).',
  0.85,
  ARRAY['accessibility','design','ux']::text[],
  true,
  'explicit',
  NULL,
  NULL,
  '{}'::jsonb,
  -50,
  39,
  -20,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-educational-product-design',
  'prentiss-frontier-operator',
  'skill',
  'Educational Game & Learning Product Design',
  'Expertise in designing educational products that engage multiple stakeholders (students, educators, parents). Anansi demonstrates deep understanding of lesson-to-game transformation and audience-appropriate game design.',
  0.8,
  ARRAY['edtech','game-design','education']::text[],
  true,
  'explicit',
  NULL,
  NULL,
  '{}'::jsonb,
  -54,
  -15,
  -19,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-simplicity-discipline',
  'prentiss-frontier-operator',
  'skill',
  'Maintaining Simplicity as Design Discipline',
  'Rare ability to enforce simplicity constraints across product evolution. Fast Food demonstrates this through ''simple, calm, mature'' constraint enforced across multiple decisions (local-first, accessibility, expansion UX short).',
  0.85,
  ARRAY['design','simplicity','discipline']::text[],
  true,
  'strongly_inferred',
  NULL,
  NULL,
  '{}'::jsonb,
  -28,
  58,
  -20,
  NULL,
  NULL
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

INSERT INTO nodes (id, profile_id, type, title, description, gravity_score, tags, is_featured, source_attribution, ref_table, ref_id, metadata_json, x, y, z, created_at, updated_at)
VALUES (
  'skill-long-horizon-thinking',
  'prentiss-frontier-operator',
  'skill',
  'Long-Horizon Architecture Planning',
  'All projects mention future vision and ambient layers. Demonstrates ability to design for long-term extensibility (ambient layers, expansion, universe scaling) while shipping focused v0.',
  0.8,
  ARRAY['strategy','architecture','vision']::text[],
  true,
  'strongly_inferred',
  NULL,
  NULL,
  '{}'::jsonb,
  -25,
  -25,
  9,
  NULL,
  NULL
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


-- ============================================================================
-- EDGES
-- ============================================================================

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-getit-constraint-decision',
  'prentiss-frontier-operator',
  'node-getit-constraint-trust',
  'node-getit-decision-invite-only',
  'shapes',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-getit-decision-metric',
  'prentiss-frontier-operator',
  'node-getit-decision-invite-only',
  'node-getit-metric-watchthrough',
  'drives',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-getit-skill-marketplace',
  'prentiss-frontier-operator',
  'proj-getit',
  'skill-marketplace-design',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-getit-videofirst-decision',
  'prentiss-frontier-operator',
  'node-getit-decision-video-first',
  'skill-video-product-design',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-getit-mvpscope-outcomes',
  'prentiss-frontier-operator',
  'node-getit-decision-mvp-scope',
  'node-getit-outcome-mvp-capabilities',
  'produces',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-getit-aitagging-skill',
  'prentiss-frontier-operator',
  'node-getit-decision-ai-tagging',
  'skill-ai-product-integration',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-getit-realtime-constraint',
  'prentiss-frontier-operator',
  'node-getit-constraint-realtime-scale',
  'skill-realtime-systems',
  'requires',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-getit-ethics-constraint',
  'prentiss-frontier-operator',
  'node-getit-constraint-material-ethics',
  'node-getit-constraint-trust',
  'refines',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-constraint-decision',
  'prentiss-frontier-operator',
  'node-fastfood-constraint-simple',
  'node-fastfood-decision-localfirst',
  'enables',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-localfirst-skill',
  'prentiss-frontier-operator',
  'node-fastfood-decision-localfirst',
  'skill-local-first-architecture',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-positioning-decision',
  'prentiss-frontier-operator',
  'node-fastfood-decision-meal-planning-os',
  'skill-ai-native-os-design',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-biometric-ai-skill',
  'prentiss-frontier-operator',
  'node-fastfood-decision-biometric',
  'skill-ai-product-integration',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-simplicity-ux',
  'prentiss-frontier-operator',
  'node-fastfood-decision-expansion-ux-short',
  'skill-simplicity-discipline',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-outcome-philosophy',
  'prentiss-frontier-operator',
  'node-fastfood-constraint-simple',
  'node-fastfood-outcome-philosophy',
  'produces',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-outcome-expansion',
  'prentiss-frontier-operator',
  'node-fastfood-decision-expansion-ux-short',
  'node-fastfood-outcome-expansion-ux',
  'produces',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-biometric-outcome',
  'prentiss-frontier-operator',
  'node-fastfood-decision-biometric',
  'node-fastfood-outcome-biometric-integration',
  'produces',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-accessibility-constraint',
  'prentiss-frontier-operator',
  'node-fastfood-constraint-accessibility',
  'skill-accessibility-first-design',
  'requires',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-anansi-constraint-decision',
  'prentiss-frontier-operator',
  'node-anansi-constraint-three-audiences',
  'node-anansi-decision-ai-native-wedge',
  'shapes',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-anansi-ai-skill',
  'prentiss-frontier-operator',
  'node-anansi-decision-ai-native-wedge',
  'skill-ai-product-integration',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-anansi-lesson-to-game-decision',
  'prentiss-frontier-operator',
  'node-anansi-decision-lesson-to-game',
  'skill-educational-product-design',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-anansi-os-design',
  'prentiss-frontier-operator',
  'proj-anansi',
  'skill-ai-native-os-design',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-anansi-outcome',
  'prentiss-frontier-operator',
  'node-anansi-decision-lesson-to-game',
  'node-anansi-outcome-lesson-to-game-model',
  'produces',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-scope-decision',
  'prentiss-frontier-operator',
  'proj-northstar',
  'node-northstar-decision-single-profile',
  'defines',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-constraint-clarity',
  'prentiss-frontier-operator',
  'node-northstar-decision-single-profile',
  'node-northstar-constraint-immersive-clarity',
  'requires',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-surfaces-decision',
  'prentiss-frontier-operator',
  'node-northstar-decision-three-surfaces',
  'node-northstar-constraint-three-surfaces-integrity',
  'addresses',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-forceDirected-graph-skill',
  'prentiss-frontier-operator',
  'node-northstar-decision-forceDirectedLayout',
  'skill-graph-design',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-performance-skill',
  'prentiss-frontier-operator',
  'node-northstar-decision-performance-budgets',
  'skill-realtime-systems',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-accessibility-decision',
  'prentiss-frontier-operator',
  'node-northstar-decision-reduced-motion',
  'skill-accessibility-first-design',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-desktop-constraint',
  'prentiss-frontier-operator',
  'node-northstar-constraint-desktop-first',
  'node-northstar-decision-single-profile',
  'shapes',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-failure-learning',
  'prentiss-frontier-operator',
  'node-northstar-failure-graph-model',
  'node-northstar-decision-single-profile',
  'led_to',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-outcome-concept',
  'prentiss-frontier-operator',
  'node-northstar-constraint-immersive-clarity',
  'node-northstar-outcome-concept-model',
  'produces',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-rendering-outcome',
  'prentiss-frontier-operator',
  'node-northstar-decision-performance-budgets',
  'node-northstar-outcome-rendering-spec',
  'produces',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-api-outcome',
  'prentiss-frontier-operator',
  'node-northstar-decision-three-surfaces',
  'node-northstar-outcome-api-contract',
  'produces',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-graph-skill',
  'prentiss-frontier-operator',
  'proj-northstar',
  'skill-graph-design',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-getit-fastfood-pattern',
  'prentiss-frontier-operator',
  'proj-getit',
  'proj-fastfood',
  'shares_pattern',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-anansi-pattern',
  'prentiss-frontier-operator',
  'proj-fastfood',
  'proj-anansi',
  'shares_pattern',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-getit-anansi-os-pattern',
  'prentiss-frontier-operator',
  'proj-getit',
  'proj-anansi',
  'shares_pattern',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-all-projects-constraint-navigation',
  'prentiss-frontier-operator',
  'proj-getit',
  'skill-constraint-navigation',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-constraint-navigation',
  'prentiss-frontier-operator',
  'proj-fastfood',
  'skill-constraint-navigation',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-anansi-constraint-navigation',
  'prentiss-frontier-operator',
  'proj-anansi',
  'skill-constraint-navigation',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-constraint-navigation',
  'prentiss-frontier-operator',
  'proj-northstar',
  'skill-constraint-navigation',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-all-projects-longhorizon',
  'prentiss-frontier-operator',
  'proj-getit',
  'skill-long-horizon-thinking',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-fastfood-longhorizon',
  'prentiss-frontier-operator',
  'proj-fastfood',
  'skill-long-horizon-thinking',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-anansi-longhorizon',
  'prentiss-frontier-operator',
  'proj-anansi',
  'skill-long-horizon-thinking',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (id, profile_id, source_id, target_id, relationship_type, created_at, updated_at)
VALUES (
  'edge-northstar-longhorizon',
  'prentiss-frontier-operator',
  'proj-northstar',
  'skill-long-horizon-thinking',
  'demonstrates',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Count records
SELECT 'Profiles: ' || COUNT(*) FROM profiles;
SELECT 'Projects: ' || COUNT(*) FROM projects;
SELECT 'Nodes: ' || COUNT(*) FROM nodes;
SELECT 'Edges: ' || COUNT(*) FROM edges;
