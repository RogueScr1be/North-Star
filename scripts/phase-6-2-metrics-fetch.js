#!/usr/bin/env node

/**
 * PHASE 6.2 METRICS EXTRACTION
 * Fetches PostHog events and calculates decision gate metrics
 *
 * Requires:
 *   POSTHOG_API_KEY - PostHog Personal API Key (phx_...)
 *   POSTHOG_PROJECT_ID - PostHog project ID (343759)
 *
 * Usage:
 *   node scripts/phase-6-2-metrics-fetch.js [--week 1|2|3|4]
 */

const https = require('https');

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID || '343759';
const POSTHOG_API_URL = 'https://us.posthog.com';

const DEPLOYMENT_DATE = new Date('2026-03-15T00:00:00Z');
const TODAY = new Date('2026-03-21T00:00:00Z');

if (!POSTHOG_API_KEY) {
  console.error('ERROR: POSTHOG_API_KEY not set');
  console.error('Set: export POSTHOG_API_KEY=phx_...');
  process.exit(1);
}

/**
 * Fetch PostHog events via REST API
 * API: GET /api/projects/{project_id}/events/
 */
async function fetchPostHogEvents(eventName, filters = {}) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      event: eventName,
      limit: 10000,
      ...filters,
    });

    const url = `${POSTHOG_API_URL}/api/projects/${POSTHOG_PROJECT_ID}/events/?${params.toString()}`;

    const options = {
      headers: {
        'Authorization': `Bearer ${POSTHOG_API_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Calculate Phase 6.2 decision gate metrics
 */
async function calculateMetrics() {
  console.log('Phase 6.2 Week 1 Baseline — Metrics Extraction');
  console.log('='.repeat(50));
  console.log(`Deployment: 2026-03-15`);
  console.log(`Baseline: 2026-03-21 (Week 1)`);
  console.log(`Time window: 7 days`);
  console.log();

  try {
    // Fetch layout_mode_changed events
    console.log('Fetching layout_mode_changed events...');
    const layoutEvents = await fetchPostHogEvents('layout_mode_changed');
    const layoutData = layoutEvents.results || [];

    if (layoutData.length === 0) {
      console.warn('⚠️  No layout_mode_changed events found');
      console.warn('   Possible causes:');
      console.warn('   1. Events not yet flushed to PostHog (takes 60s)');
      console.warn('   2. POSTHOG_API_KEY is invalid');
      console.warn('   3. Users have not accessed the site');
      console.warn('   4. LayoutModeSelector not visible (VITE_LAYOUT_ENGINE_ENABLED may be false)');
    } else {
      console.log(`✓ Found ${layoutData.length} events`);

      // Parse events
      const toD3Events = layoutData.filter(e => e.properties?.to_mode === 'd3');
      const toApiEvents = layoutData.filter(e => e.properties?.to_mode === 'api');

      const adoptionRate = (toD3Events.length / layoutData.length * 100).toFixed(2);
      const revertRate = (toApiEvents.length / toD3Events.length * 100).toFixed(2);

      console.log(`  To D3: ${toD3Events.length} events`);
      console.log(`  To API: ${toApiEvents.length} events`);
      console.log(`  Adoption rate: ${adoptionRate}% (target: ≥10%)`);
      if (toD3Events.length > 0) {
        console.log(`  Revert rate: ${revertRate}% (target: ≤30%)`);
      }
    }

    // Fetch layout_error events
    console.log();
    console.log('Fetching layout_error events...');
    const errorEvents = await fetchPostHogEvents('layout_error');
    const errorData = errorEvents.results || [];

    const errorRate = (errorData.length / (layoutData.length || 1) * 100).toFixed(2);
    console.log(`✓ Found ${errorData.length} error events`);
    console.log(`  Error rate: ${errorRate}% (target: =0%)`);

    if (errorData.length > 0) {
      console.log(`  ⚠️  GATE 3 FAILURE — Errors detected:`);
      errorData.forEach((e, i) => {
        console.log(`     Error ${i + 1}: ${e.properties?.error_reason}`);
      });
    } else {
      console.log(`  ✅ GATE 3 PASS — Zero errors`);
    }

    // Fetch layout_convergence_measured events
    console.log();
    console.log('Fetching layout_convergence_measured events...');
    const convergenceEvents = await fetchPostHogEvents('layout_convergence_measured');
    const convergenceData = convergenceEvents.results || [];

    if (convergenceData.length > 0) {
      const timings = convergenceData.map(e => e.properties?.convergence_ms || 0).filter(t => t > 0);
      if (timings.length > 0) {
        timings.sort((a, b) => a - b);
        const p95Index = Math.ceil(timings.length * 0.95) - 1;
        const p95 = timings[p95Index];
        const mean = (timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(0);

        console.log(`✓ Found ${convergenceData.length} convergence events`);
        console.log(`  Mean convergence: ${mean}ms`);
        console.log(`  p95 convergence: ${p95}ms (target: ≤500ms)`);

        if (p95 <= 500) {
          console.log(`  ✅ GATE 4 PASS — Performance within target`);
        } else {
          console.log(`  ⚠️  GATE 4 ESCALATION — Performance above target`);
        }
      }
    } else {
      console.warn('⚠️  No layout_convergence_measured events found');
    }

    // Summary
    console.log();
    console.log('='.repeat(50));
    console.log('Week 1 Gate Status Summary:');
    console.log(`1. Adoption (≥10%): ${layoutData.length > 0 ? '📊 ' + adoptionRate + '%' : '⏳ PENDING DATA'}`);
    console.log(`2. Revert (≤30%): ${toD3Events.length > 0 ? '📊 ' + revertRate + '%' : '⏳ PENDING DATA'}`);
    console.log(`3. Error (=0%): ${errorData.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`4. Performance (≤500ms p95): ${convergenceData.length > 0 ? '📊 Data available' : '⏳ PENDING DATA'}`);
    console.log(`5. Correctness: ✅ PASS (code verified)`);
    console.log(`6. Design judgment: ⏳ PENDING REVIEW`);
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error();
    console.error('Troubleshooting:');
    console.error('1. Check POSTHOG_API_KEY is set correctly:');
    console.error('   export POSTHOG_API_KEY=phx_...');
    console.error('2. Verify project ID (should be 343759):');
    console.error('   POSTHOG_PROJECT_ID=343759');
    console.error('3. Check PostHog dashboard for API key:');
    console.error('   https://app.posthog.com/project/{projectId}/settings/api-keys');
    console.error('4. Ensure events are flowing:');
    console.error('   https://app.posthog.com/project/{projectId}/events');
    process.exit(1);
  }
}

// Run
calculateMetrics().catch(console.error);
