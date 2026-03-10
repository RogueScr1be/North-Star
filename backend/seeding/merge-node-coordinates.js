#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function main() {
    const draftPath = process.argv[2];
    const inventoryPath = process.argv[3];

    if (!draftPath || !inventoryPath) {
        throw new Error(
            'Usage: node merge-node-coordinates.js /path/to/coordinates-draft.json /path/to/inventory.json'
        );
    }

    const draft = readJson(draftPath);
    const inventory = readJson(inventoryPath);

    if (!Array.isArray(draft)) {
        throw new Error('Draft coordinates file must be a JSON array.');
    }

    if (!inventory || !Array.isArray(inventory.nodes)) {
        throw new Error('Inventory file must contain a "nodes" array.');
    }

    const nodeCoordsById = new Map(
        draft
            .filter((item) => item.kind === 'node')
            .map((item) => [item.id, { x: item.x, y: item.y, z: item.z }])
    );

    let updatedCount = 0;
    const missingDraftCoords = [];

    const updatedNodes = inventory.nodes.map((node) => {
        const coords = nodeCoordsById.get(node.id);

        if (!coords) {
            missingDraftCoords.push(node.id);
            return node;
        }

        updatedCount += 1;

        return {
            ...node,
            x: coords.x,
            y: coords.y,
            z: coords.z,
        };
    });

    if (missingDraftCoords.length > 0) {
        console.error('Missing draft coordinates for these inventory nodes:');
        for (const id of missingDraftCoords) {
            console.error(`- ${id}`);
        }
        throw new Error('Merge aborted because some inventory nodes have no matching draft coordinates.');
    }

    const result = {
        ...inventory,
        nodes: updatedNodes,
    };

    writeJson(inventoryPath, result);

    console.log(
        JSON.stringify(
            {
                ok: true,
                updated_nodes: updatedCount,
                inventory_file: path.resolve(inventoryPath),
            },
            null,
            2
        )
    );
}

main();