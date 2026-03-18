#!/usr/bin/env node
/**
 * GENERATE-COORDINATES.JS
 *
 * First-pass coordinate generation using force-directed layout (d3-force).
 * Output is a draft only; manual tuning required before persisting to inventory.
 *
 * Usage:
 *   node generate-coordinates.js /path/to/inventory.json > coordinates-draft.json
 */

const fs = require('fs');
const { forceSimulation, forceLink, forceManyBody, forceCenter } = require('d3-force');

function generateCoordinates(inventoryFile) {
  if (!inventoryFile) {
    throw new Error('Missing inventory file path. Usage: node generate-coordinates.js /path/to/inventory.json');
  }

  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));

  if (!Array.isArray(inventory.nodes)) {
    throw new Error('Inventory is missing a valid "nodes" array.');
  }

  if (!Array.isArray(inventory.edges)) {
    throw new Error('Inventory is missing a valid "edges" array.');
  }

  if (!Array.isArray(inventory.projects)) {
    throw new Error('Inventory is missing a valid "projects" array.');
  }

  const simEntities = [
    ...inventory.projects.map((p) => ({
      id: p.id,
      kind: 'project',
      label: p.name || p.title || p.id,
    })),
    ...inventory.nodes.map((n) => ({
      id: n.id,
      kind: 'node',
      label: n.title || n.id,
    })),
  ];

  const simNodes = simEntities.map((e, i) => ({
    id: e.id,
    kind: e.kind,
    label: e.label,
    index: i,
  }));

  const nodeIndexById = new Map(simNodes.map((node, index) => [node.id, index]));

  const links = inventory.edges.map((e) => {
    const sourceId = e.source_node_id;
    const targetId = e.target_node_id;

    const sourceIndex = nodeIndexById.get(sourceId);
    const targetIndex = nodeIndexById.get(targetId);

    if (sourceIndex === undefined || targetIndex === undefined) {
      throw new Error(
        `Edge references missing vertex: edge=${e.id || 'unknown'} source_node_id=${sourceId} target_node_id=${targetId}`
      );
    }

    return {
      source: sourceIndex,
      target: targetIndex,
    };
  });

  const simulation = forceSimulation(simNodes)
    .force('link', forceLink(links).distance(80))
    .force('charge', forceManyBody().strength(-220))
    .force('center', forceCenter(0, 0))
    .stop();

  for (let i = 0; i < 300; ++i) simulation.tick();

  const xs = simNodes.map((n) => n.x ?? 0);
  const ys = simNodes.map((n) => n.y ?? 0);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const coords = simNodes.map((n) => ({
    id: n.id,
    kind: n.kind,
    x: Number((((n.x - xMin) / xRange - 0.5) * 200).toFixed(2)),
    y: Number((((n.y - yMin) / yRange - 0.5) * 200).toFixed(2)),
    z: 0,
  }));

  console.log(JSON.stringify(coords, null, 2));
}

generateCoordinates(process.argv[2]);
