/**
 * ASK_GRAPH.TS
 * Natural language query endpoint with OpenAI Responses API synthesis
 * Phase 7.1: OpenAI Responses API integration with model routing (gpt-5.4-mini / gpt-5.4)
 * Phase 8.2: Enriched instrumentation fields for streaming/fallback behavior measurement
 */

import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { supabase } from '../config';
import { randomUUID } from 'crypto';

const router = Router();

// ============================================================================
// TYPES
// ============================================================================

interface GraphData {
  nodes: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    gravity_score: number;
    tags: string[];
    project_id: string | null;
  }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    gravity_score: number;
  }>;
  edges: Array<{
    id: string;
    source_id: string;
    target_id: string;
    relationship_type: string;
  }>;
}

interface AskGraphRequest {
  question: string;
  graph?: GraphData; // Optional: client can pass graph data; if not, we fetch it
}

interface AskGraphResponse {
  success: boolean;
  answer: string;
  citedNodeIds: string[];
  citedProjectIds: string[];
  confidence: 'high' | 'medium' | 'low';
  requestId?: string; // Phase 7.1: Frontend telemetry correlation
  // Phase 8.2: Enriched instrumentation fields
  model?: string; // e.g., 'gpt-5.4-mini-2026-03-17' or 'gpt-5.4-2026-03-05'
  usedStreaming?: boolean; // true if streamed response, false if fallback
  fallbackReason?: string; // Reason for fallback if usedStreaming=false
  firstTokenLatencyMs?: number; // Time from request to first token
  totalStreamDurationMs?: number; // Total time for streaming/response
  chunkCount?: number; // Number of SSE chunks for streaming
  citedNodeCount?: number; // Count of cited nodes
  citedProjectCount?: number; // Count of cited projects
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fetch graph data from database
 */
async function fetchGraphData(): Promise<GraphData> {
  const { data: nodesData, error: nodesError } = await supabase
    .from('nodes')
    .select('*')
    .not('x', 'is', null)
    .not('y', 'is', null)
    .not('z', 'is', null);

  if (nodesError) throw nodesError;
  if (!nodesData) throw new Error('No nodes returned from database');

  const { data: projectsData, error: projectsError } = await supabase
    .from('projects')
    .select('*');

  if (projectsError) throw projectsError;
  if (!projectsData) throw new Error('No projects returned from database');

  const { data: edgesData, error: edgesError } = await supabase
    .from('edges')
    .select('*');

  if (edgesError) throw edgesError;
  if (!edgesData) throw new Error('No edges returned from database');

  const nodes = nodesData.map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    description: n.description,
    gravity_score: n.gravity_score,
    tags: n.tags || [],
    project_id: n.ref_table === 'projects' ? n.ref_id : null,
  }));

  const projects = projectsData.map((p: any) => ({
    id: p.id,
    title: p.name,
    description: p.short_desc || '',
    gravity_score: p.gravity_score,
  }));

  const edges = edgesData.map((e: any) => ({
    id: e.id,
    source_id: e.source_id,
    target_id: e.target_id,
    relationship_type: e.relationship_type,
  }));

  return { nodes, projects, edges };
}

/**
 * Extract cited entities from OpenAI response using pattern matching
 * Response may mention entities by name; we match mentioned titles to entities
 */
function extractCitedEntities(
  answer: string,
  graph: GraphData
): { nodeIds: string[]; projectIds: string[] } {
  const citedNodeIds = new Set<string>();
  const citedProjectIds = new Set<string>();

  // Check for node mentions (case-insensitive partial matching)
  for (const node of graph.nodes) {
    if (answer.toLowerCase().includes(node.title.toLowerCase())) {
      citedNodeIds.add(node.id);
    }
  }

  // Check for project mentions
  for (const project of graph.projects) {
    if (answer.toLowerCase().includes(project.title.toLowerCase())) {
      citedProjectIds.add(project.id);
    }
  }

  return {
    nodeIds: Array.from(citedNodeIds),
    projectIds: Array.from(citedProjectIds),
  };
}

/**
 * Format graph data as context for OpenAI model
 * Includes summaries of nodes, projects, and relationships
 */
function formatGraphContext(graph: GraphData): string {
  const nodesSummary = graph.nodes
    .map(
      (n) =>
        `- ${n.title} (${n.type}, gravity: ${(n.gravity_score * 100).toFixed(0)}%): ${n.description}`
    )
    .join('\n');

  const projectsSummary = graph.projects
    .map(
      (p) =>
        `- ${p.title} (gravity: ${(p.gravity_score * 100).toFixed(0)}%): ${p.description}`
    )
    .join('\n');

  const relationshipsSummary = graph.edges
    .slice(0, 20) // Limit to first 20 relationships for brevity
    .map((e) => {
      const source = graph.nodes.find((n) => n.id === e.source_id) ||
        graph.projects.find((p) => p.id === e.source_id) || { title: 'Unknown' };
      const target = graph.nodes.find((n) => n.id === e.target_id) ||
        graph.projects.find((p) => p.id === e.target_id) || { title: 'Unknown' };
      return `- ${source.title} ${e.relationship_type} ${target.title}`;
    })
    .join('\n');

  return `
KNOWLEDGE GRAPH CONTEXT
=======================

NODES (${graph.nodes.length} total):
${nodesSummary}

PROJECTS (${graph.projects.length} total):
${projectsSummary}

KEY RELATIONSHIPS (showing first 20 of ${graph.edges.length}):
${relationshipsSummary}
`;
}

// ============================================================================
// ROUTE: POST /api/ask-graph-stream (SSE Streaming)
// ============================================================================

/**
 * Ask a question with Server-Sent Events (SSE) streaming response
 * Streams answer text chunks in real-time, sends citations at end
 * Phase 8.0a: Real-time streaming with progressive text rendering
 */
router.post('/stream', async (req: Request, res: Response) => {
  const requestId = randomUUID();
  const startTime = Date.now();

  try {
    const { question, graph: clientGraph } = req.body as AskGraphRequest;

    if (!question || typeof question !== 'string') {
      res.status(400).json({
        success: false,
        error: 'question is required and must be a string',
      });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'OPENAI_API_KEY is not set',
      });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Model routing (same as non-streaming)
    const shouldEscalate = /between|relationship|all projects|across|connect|relate|integration|dependency|flow|architecture|holistic|overall|should|recommend|strategy|best|next|priority|roadmap|approach|plan|synthesis|summary|overview/i.test(question);
    const model = shouldEscalate ? 'gpt-5.4-2026-03-05' : 'gpt-5.4-mini-2026-03-17';

    const graph = clientGraph || (await fetchGraphData());
    const graphContext = formatGraphContext(graph);

    const sanitizedQuestion = question.length > 100 ? question.substring(0, 100) + '...' : question;
    console.log(`[AskGraph-Stream] Question: ${sanitizedQuestion}`);
    console.log(`[AskGraph-Stream] Model: ${model} (escalated: ${shouldEscalate})`);

    // Use OpenAI streaming API
    const stream = await openai.chat.completions.create({
      model: model,
      max_completion_tokens: 1024,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are an expert analyst of knowledge graphs. You answer questions about a specific knowledge graph provided below. Always ground your answers in the graph data provided. Cite specific nodes and projects from the graph when relevant. If you cannot answer based on the graph, say so clearly. Be concise and direct.`,
        },
        {
          role: 'user',
          content: `${graphContext}

User Question: ${question}

Please answer the question based on the knowledge graph provided above. Always ground your answers in the graph data provided. Cite specific nodes and projects from the graph when relevant. If you cannot answer based on the graph, say so clearly. Be concise and direct.`,
        },
      ],
    });

    // Buffer the full answer for citation extraction
    let fullAnswer = '';
    let chunkCount = 0;
    let firstTokenTime: number | null = null;

    // Stream chunks to client
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        // Track first token latency (Phase 8.2)
        if (firstTokenTime === null) {
          firstTokenTime = Date.now();
        }
        chunkCount++;
        fullAnswer += delta;
        // Send chunk via SSE
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: delta })}\n\n`);
      }
    }

    // Extract citations from full answer
    const { nodeIds, projectIds } = extractCitedEntities(fullAnswer, graph);
    const citedCount = nodeIds.length + projectIds.length;
    const confidence: 'high' | 'medium' | 'low' =
      citedCount >= 3 ? 'high' : citedCount >= 1 ? 'medium' : 'low';

    // Phase 8.2: Calculate streaming metrics
    const totalStreamDurationMs = Date.now() - startTime;
    const firstTokenLatencyMs = firstTokenTime !== null ? firstTokenTime - startTime : 0;

    console.log(`[AskGraph-Stream] Citations: ${citedCount} entities`);
    console.log(`[AskGraph-Stream] Metrics: firstToken=${firstTokenLatencyMs}ms, totalDuration=${totalStreamDurationMs}ms, chunks=${chunkCount}`);

    // Send citations as final message
    res.write(`data: ${JSON.stringify({
      type: 'citations',
      nodeIds,
      projectIds,
      confidence,
      // Phase 8.2: Include enriched instrumentation
      model,
      usedStreaming: true,
      firstTokenLatencyMs,
      totalStreamDurationMs,
      chunkCount,
      citedNodeCount: nodeIds.length,
      citedProjectCount: projectIds.length,
      requestId,
    })}\n\n`);

    // Send completion signal
    res.write(`data: ${JSON.stringify({ type: 'complete', requestId })}\n\n`);
    res.end();
  } catch (error) {
    console.error('[AskGraph-Stream] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
    res.end();
  }
});

// ============================================================================
// ROUTE: POST /api/ask-graph
// ============================================================================

/**
 * Ask a natural language question about the knowledge graph
 * OpenAI model synthesizes an answer based on graph context
 * Non-streaming fallback for clients that don't support SSE
 */
router.post('/', async (req: Request, res: Response) => {
  // Telemetry: Initialize request correlation IDs (available to both try and catch)
  const requestId = randomUUID();
  const sessionId = req.headers['x-session-id'] as string | undefined;
  const startTime = Date.now();

  try {
    const { question, graph: clientGraph } = req.body as AskGraphRequest;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'question is required and must be a string',
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OPENAI_API_KEY is not set',
      });
    }


    // Lazy-initialize OpenAI client (required because SDK throws at init time if key missing)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Model routing: escalate complex queries to gpt-5.4, use gpt-5.4-mini by default
    const shouldEscalate = /between|relationship|all projects|across|connect|relate|integration|dependency|flow|architecture|holistic|overall|should|recommend|strategy|best|next|priority|roadmap|approach|plan|synthesis|summary|overview/i.test(question);
    const model = shouldEscalate ? 'gpt-5.4-2026-03-05' : 'gpt-5.4-mini-2026-03-17';

    // Fetch graph data if not provided
    const graph = clientGraph || (await fetchGraphData());

    // Format graph as context
    const graphContext = formatGraphContext(graph);

    const sanitizedQuestion = question.length > 100 ? question.substring(0, 100) + '...' : question;
    console.log(`[AskGraph] Question: ${sanitizedQuestion}`);
    console.log(`[AskGraph] Model: ${model} (escalated: ${shouldEscalate})`);

    // Call OpenAI Chat Completions API with graph context + question using direct HTTP call
    const responsesResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        max_completion_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: `You are an expert analyst of knowledge graphs. You answer questions about a specific knowledge graph provided below. Always ground your answers in the graph data provided. Cite specific nodes and projects from the graph when relevant. If you cannot answer based on the graph, say so clearly. Be concise and direct.`,
          },
          {
            role: 'user',
            content: `${graphContext}

User Question: ${question}

Please answer the question based on the knowledge graph provided above. Always ground your answers in the graph data provided. Cite specific nodes and projects from the graph when relevant. If you cannot answer based on the graph, say so clearly. Be concise and direct.`,
          },
        ],
      }),
    });

    if (!responsesResponse.ok) {
      const errorData = await responsesResponse.json();
      throw new Error(`OpenAI API error: ${responsesResponse.status} ${JSON.stringify(errorData)}`);
    }

    const response = (await responsesResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    // Extract answer text from OpenAI Chat Completions response
    const answerText = response.choices?.[0]?.message?.content?.trim();

    if (!answerText) {
      return res.status(500).json({
        success: false,
        error: 'No response content from OpenAI',
      });
    }

    // Extract cited entities from the response
    const { nodeIds, projectIds } = extractCitedEntities(answerText, graph);

    // Determine confidence based on cited entities
    const citedCount = nodeIds.length + projectIds.length;
    const confidence: 'high' | 'medium' | 'low' =
      citedCount >= 3 ? 'high' : citedCount >= 1 ? 'medium' : 'low';

    console.log(`[AskGraph] Citations: ${citedCount} entities (${nodeIds.length} nodes, ${projectIds.length} projects)`);

    // Phase 8.2: Calculate response metrics
    const totalStreamDurationMs = Date.now() - startTime;
    console.log(`[AskGraph] Metrics: totalDuration=${totalStreamDurationMs}ms, model=${model}, usedStreaming=false`);

    return res.json({
      success: true,
      answer: answerText,
      citedNodeIds: nodeIds,
      citedProjectIds: projectIds,
      confidence,
      requestId, // Phase 7.1: Expose requestId for frontend telemetry correlation
      // Phase 8.2: Enriched instrumentation fields
      model,
      usedStreaming: false,
      totalStreamDurationMs,
      citedNodeCount: nodeIds.length,
      citedProjectCount: projectIds.length,
    } as AskGraphResponse);
  } catch (error) {
    console.error('[AskGraph] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;
