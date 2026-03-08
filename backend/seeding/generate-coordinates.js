#!/usr/bin/env node
/**
 * GENERATE-COORDINATES.JS
 *
 * First-pass coordinate generation using force-directed layout (d3-force).
 * Output is a draft only; manual tuning required before persisting to inventory.
 *
 * Usage:
 *   npm install d3-force
 *   node generate-coordinates.js /path/to/inventory.json > coordinates-draft.json
 */

const fs = require('fs');
const { forceSimulation, forceLink, forceManyBody, forceCenter } = require('d3-force');

function generateCoordinates(inventoryFile) {
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
  const nodes = inventory.nodes.map((n, i) => ({ id: n.id, index: i }));
  const edges = inventory.edges.map(e => ({
    source: nodes.find(n => n.id === e.source_id).index,
    target: nodes.find(n => n.id === e.target_id).index
  }));

  // Force simulation
  const simulation = forceSimulation(nodes)
    .force('link', forceLink(edges).distance(80))
    .force('charge', forceManyBody().strength(-200))
    .force('center', forceCenter(0, 0))
    .stop();

  // Run 300 iterations
  for (let i = 0; i < 300; ++i) simulation.tick();

  // Normalize to [-100, 100] range
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const coords = nodes.map((n, i) => ({
    id: inventory.nodes[i].id,
    x: ((n.x - xMin) / xRange - 0.5) * 200,
    y: ((n.y - yMin) / yRange - 0.5) * 200,
    z: 0
  }));

  console.log(JSON.stringify(coords, null, 2));
}

generateCoordinates(process.argv[2]);
