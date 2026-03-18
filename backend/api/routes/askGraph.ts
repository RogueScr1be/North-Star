/**
 * ASK_GRAPH.TS
 * Natural language query endpoint with Claude API synthesis
 * Phase 7.1: Claude API integration for improved answers with streaming
 */

import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../config';

const router = Router();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
 * Extract cited entities from Claude response using pattern matching
 * Claude may mention entities by name; we match mentioned titles to entities
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
 * Format graph data as context for Claude
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
// ROUTE: POST /api/ask-graph
// ============================================================================

/**
 * Ask a natural language question about the knowledge graph
 * Claude synthesizes an answer based on graph context
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { question, graph: clientGraph } = req.body as AskGraphRequest;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'question is required and must be a string',
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'ANTHROPIC_API_KEY is not set',
      });
    }

    // Fetch graph data if not provided
    const graph = clientGraph || (await fetchGraphData());

    // Format graph as context
    const graphContext = formatGraphContext(graph);

    console.log(`[AskGraph] Question: "${question}"`);
    console.log(`[AskGraph] Model: Claude 3.5 Sonnet`);

    // Call Claude API with graph context + question
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${graphContext}

User Question: ${question}

Please answer the question based on the knowledge graph provided above. Always ground your answers in the graph data provided. Cite specific nodes and projects from the graph when relevant. If you cannot answer based on the graph, say so clearly. Be concise and direct.`,
        },
      ],
      system: `You are an expert analyst of knowledge graphs. You answer questions about a specific knowledge graph provided below. Always ground your answers in the graph data provided. Cite specific nodes and projects from the graph when relevant. If you cannot answer based on the graph, say so clearly. Be concise and direct.`,
    });

    // Extract answer text from API response
    const answerText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('\n');

    if (!answerText) {
      return res.status(500).json({
        success: false,
        error: 'No response content from Claude',
      });
    }

    // Extract cited entities from the response
    const { nodeIds, projectIds } = extractCitedEntities(answerText, graph);

    // Determine confidence based on cited entities
    const citedCount = nodeIds.length + projectIds.length;
    const confidence: 'high' | 'medium' | 'low' =
      citedCount >= 3 ? 'high' : citedCount >= 1 ? 'medium' : 'low';

    console.log(`[AskGraph] Citations: ${citedCount} entities (${nodeIds.length} nodes, ${projectIds.length} projects)`);

    return res.json({
      success: true,
      answer: answerText,
      citedNodeIds: nodeIds,
      citedProjectIds: projectIds,
      confidence,
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
