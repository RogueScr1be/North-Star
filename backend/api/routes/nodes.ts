/**
 * NODES.TS
 * GET /api/nodes/:nodeId
 * Return node with edges (incoming and outgoing)
 */

import { Router } from 'express';
import { supabase, getNode, getNodeEdges } from '../config';
import { NodeDetailResponse, ErrorResponse } from '../types';

const router = Router();

/**
 * GET /api/nodes/:nodeId
 * Return single node with edges + evidence
 */
router.get('/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;

    const node = await getNode(nodeId);

    if (!node) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Node "${nodeId}" not found`,
        status: 404,
      } as ErrorResponse);
    }

    // Get incoming and outgoing edges
    const edgesRaw = await getNodeEdges(nodeId);

    // Transform edges to include full node details
    const { data: incomingEdgesData, error: inError } = await supabase
      .from('edges')
      .select(
        `
        *,
        source_node:source_id (
          id, type, title, gravity_score, tags
        )
      `
      )
      .eq('target_id', nodeId);

    const { data: outgoingEdgesData, error: outError } = await supabase
      .from('edges')
      .select(
        `
        *,
        target_node:target_id (
          id, type, title, gravity_score, tags
        )
      `
      )
      .eq('source_id', nodeId);

    if (inError || outError) throw inError || outError;

    const response: NodeDetailResponse = {
      data: node,
      edges: {
        incoming: incomingEdgesData || [],
        outgoing: outgoingEdgesData || [],
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching node:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    } as ErrorResponse);
  }
});

export default router;
