/**
 * ANSWERCOMPOSER.TS
 * Deterministic template-based answer composition
 * Phase 4.0: No LLM, no hallucination, evidence-grounded only
 */

import { GraphNode, GraphProject } from './graphTypes';
import { AnswerEvidence, ParsedQuery } from './graphQueries';

// ============================================================================
// TYPES
// ============================================================================

export interface Answer {
  type: 'success' | 'no_data' | 'insufficient_evidence' | 'unparseable';
  text: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: AnswerEvidence;
  citedNodes: GraphNode[];
  citedProjects: GraphProject[];
  explanation: string; // Why this answer, what was searched
}

// ============================================================================
// ANSWER COMPOSITION
// ============================================================================

/**
 * Main composition function
 * Takes evidence + parsed query + graph data → Answer
 * Deterministic templates only; no hallucination
 */
export function composeAnswer(
  parsed: ParsedQuery,
  evidence: AnswerEvidence,
  nodes: GraphNode[],
  projects: GraphProject[]
): Answer {
  // Extract cited entities
  const citedNodes = Array.from(evidence.nodeIds)
    .map(id => nodes.find(n => n.id === id))
    .filter((n): n is GraphNode => n !== undefined);

  const citedProjects = Array.from(evidence.projectIds)
    .map(id => projects.find(p => p.id === id))
    .filter((p): p is GraphProject => p !== undefined);

  // Check if we have enough evidence
  const evidenceCount = citedNodes.length + citedProjects.length;
  const hasEvidence = evidenceCount > 0;

  if (!hasEvidence && parsed.type !== 'patterns') {
    return {
      type: 'no_data',
      text: `I couldn't find any information about "${parsed.primaryEntity || parsed.tag || 'that'}" in the current graph.`,
      confidence: 'low',
      evidence,
      citedNodes: [],
      citedProjects: [],
      explanation: 'No matching entities found in graph',
    };
  }

  // Compose answer based on type
  switch (parsed.type) {
    case 'definition':
      return composeDefinition(parsed, citedNodes, citedProjects, evidence);

    case 'relationship':
      return composeRelationship(parsed, citedNodes, citedProjects, evidence);

    case 'scope':
      return composeScope(parsed, citedNodes, citedProjects, evidence);

    case 'patterns':
      return composePatterns(parsed, citedNodes, citedProjects, evidence, nodes);

    case 'causality_incoming':
      return composeCausalityIncoming(parsed, citedNodes, citedProjects, evidence);

    case 'causality_outgoing':
      return composeCausalityOutgoing(parsed, citedNodes, citedProjects, evidence);

    case 'tag_search':
      return composeTagSearch(parsed, citedNodes, citedProjects, evidence);

    case 'unknown':
    default:
      return {
        type: 'unparseable',
        text: 'I didn\'t understand that question. Try asking about specific nodes, projects, or their connections.',
        confidence: 'low',
        evidence,
        citedNodes: [],
        citedProjects: [],
        explanation: 'Query intent could not be determined',
      };
  }
}

// ============================================================================
// COMPOSITION FUNCTIONS
// ============================================================================

function composeDefinition(
  parsed: ParsedQuery,
  citedNodes: GraphNode[],
  citedProjects: GraphProject[],
  evidence: AnswerEvidence
): Answer {
  if (citedProjects.length > 0) {
    const proj = citedProjects[0];
    return {
      type: 'success',
      text: proj.description || `${proj.title} is a project in this graph (no additional description available).`,
      confidence: 'high',
      evidence,
      citedNodes,
      citedProjects,
      explanation: `Found project "${proj.title}"`,
    };
  }

  if (citedNodes.length > 0) {
    const node = citedNodes[0];
    const desc = node.description || `A ${node.type} node in the graph.`;
    const tags = node.tags && node.tags.length > 0 ? ` Related topics: ${node.tags.join(', ')}.` : '';
    return {
      type: 'success',
      text: `${desc}${tags}`,
      confidence: 'high',
      evidence,
      citedNodes,
      citedProjects,
      explanation: `Found ${node.type} "${node.title}"`,
    };
  }

  return {
    type: 'no_data',
    text: `I couldn't find "${parsed.primaryEntity}" in the graph.`,
    confidence: 'low',
    evidence,
    citedNodes,
    citedProjects,
    explanation: 'Entity not found in graph',
  };
}

function composeRelationship(
  parsed: ParsedQuery,
  citedNodes: GraphNode[],
  citedProjects: GraphProject[],
  evidence: AnswerEvidence
): Answer {
  if (!evidence.path || evidence.path.length === 0) {
    return {
      type: 'insufficient_evidence',
      text: `I couldn't find a direct connection between "${parsed.primaryEntity}" and "${parsed.secondaryEntity}" in the current graph. They may be unrelated or connected through many intermediaries.`,
      confidence: 'low',
      evidence,
      citedNodes,
      citedProjects,
      explanation: 'No connection path found',
    };
  }

  const entities = evidence.path.map(p => p.title).join(' → ');
  const hopCount = evidence.path.length - 1;

  let text = `Yes, "${parsed.primaryEntity}" and "${parsed.secondaryEntity}" are connected.`;
  if (hopCount === 1) {
    text += ` They are directly linked.`;
  } else {
    text += ` They are connected through ${hopCount} intermediary relationship${hopCount > 1 ? 's' : ''}.`;
  }
  text += ` Path: ${entities}`;

  return {
    type: 'success',
    text,
    confidence: 'high',
    evidence,
    citedNodes,
    citedProjects,
    explanation: `Found ${hopCount}-hop connection`,
  };
}

function composeScope(
  parsed: ParsedQuery,
  citedNodes: GraphNode[],
  citedProjects: GraphProject[],
  evidence: AnswerEvidence
): Answer {
  if (citedProjects.length === 0) {
    return {
      type: 'no_data',
      text: `Project "${parsed.primaryEntity}" not found in graph.`,
      confidence: 'low',
      evidence,
      citedNodes,
      citedProjects,
      explanation: 'Project not found',
    };
  }

  const project = citedProjects[0];
  if (citedNodes.length === 0) {
    return {
      type: 'insufficient_evidence',
      text: `Project "${project.title}" exists, but contains no nodes${parsed.nodeType ? ` of type "${parsed.nodeType}"` : ''}.`,
      confidence: 'medium',
      evidence,
      citedNodes,
      citedProjects,
      explanation: 'Project found but no matching nodes',
    };
  }

  const typeFilter = parsed.nodeType ? ` ${parsed.nodeType}` : '';
  const text = `Project "${project.title}" contains ${citedNodes.length}${typeFilter} node${citedNodes.length > 1 ? 's' : ''}: ${citedNodes
    .slice(0, 5)
    .map(n => n.title)
    .join(', ')}${citedNodes.length > 5 ? `, and ${citedNodes.length - 5} more` : ''}.`;

  return {
    type: 'success',
    text,
    confidence: 'high',
    evidence,
    citedNodes,
    citedProjects,
    explanation: `Found ${citedNodes.length} nodes in project`,
  };
}

function composePatterns(
  _parsed: ParsedQuery,
  citedNodes: GraphNode[],
  citedProjects: GraphProject[],
  evidence: AnswerEvidence,
  allNodes: GraphNode[]
): Answer {
  // Find nodes with shared tags
  const tagCounts = new Map<string, number>();
  for (const node of allNodes) {
    if (node.tags) {
      for (const tag of node.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
  }

  const commonTags = Array.from(tagCounts.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const tagText = commonTags
    .map(([tag, count]) => `"${tag}" (${count} nodes)`)
    .join(', ');

  let text = 'The graph shows the following patterns:';
  if (commonTags.length > 0) {
    text += ` Shared topics across nodes: ${tagText}.`;
  }
  text += ` Total: ${allNodes.length} nodes, ${allNodes.filter(n => n.type === 'decision').length} decisions, ${allNodes.filter(n => n.type === 'project').length} projects.`;

  return {
    type: 'success',
    text,
    confidence: 'medium',
    evidence,
    citedNodes,
    citedProjects,
    explanation: 'Graph-wide pattern analysis',
  };
}

function composeCausalityIncoming(
  parsed: ParsedQuery,
  citedNodes: GraphNode[],
  citedProjects: GraphProject[],
  evidence: AnswerEvidence
): Answer {
  const sources = [...citedNodes, ...citedProjects];

  if (sources.length === 0) {
    return {
      type: 'insufficient_evidence',
      text: `No incoming influences found for "${parsed.primaryEntity}". It may be independent or a root concept.`,
      confidence: 'medium',
      evidence,
      citedNodes,
      citedProjects,
      explanation: 'No incoming edges',
    };
  }

  const text = `"${parsed.primaryEntity}" was influenced by: ${sources
    .slice(0, 5)
    .map(s => s.title)
    .join(', ')}${sources.length > 5 ? `, and ${sources.length - 5} more` : ''}.`;

  return {
    type: 'success',
    text,
    confidence: 'high',
    evidence,
    citedNodes,
    citedProjects,
    explanation: `Found ${sources.length} sources of influence`,
  };
}

function composeCausalityOutgoing(
  parsed: ParsedQuery,
  citedNodes: GraphNode[],
  citedProjects: GraphProject[],
  evidence: AnswerEvidence
): Answer {
  const targets = [...citedNodes, ...citedProjects];

  if (targets.length === 0) {
    return {
      type: 'insufficient_evidence',
      text: `No downstream results found for "${parsed.primaryEntity}". It may not influence other concepts in this graph.`,
      confidence: 'medium',
      evidence,
      citedNodes,
      citedProjects,
      explanation: 'No outgoing edges',
    };
  }

  const text = `"${parsed.primaryEntity}" produced/led to: ${targets
    .slice(0, 5)
    .map(t => t.title)
    .join(', ')}${targets.length > 5 ? `, and ${targets.length - 5} more` : ''}.`;

  return {
    type: 'success',
    text,
    confidence: 'high',
    evidence,
    citedNodes,
    citedProjects,
    explanation: `Found ${targets.length} downstream results`,
  };
}

function composeTagSearch(
  parsed: ParsedQuery,
  citedNodes: GraphNode[],
  citedProjects: GraphProject[],
  evidence: AnswerEvidence
): Answer {
  const allCited = [...citedNodes, ...citedProjects];

  if (allCited.length === 0) {
    return {
      type: 'no_data',
      text: `No nodes or projects found related to "${parsed.tag}".`,
      confidence: 'low',
      evidence,
      citedNodes,
      citedProjects,
      explanation: 'No matching tag found',
    };
  }

  const nodeCount = citedNodes.length;
  const projectCount = citedProjects.length;

  const text = `Found ${allCited.length} item${allCited.length > 1 ? 's' : ''} related to "${parsed.tag}": ${citedNodes
    .slice(0, 3)
    .map(n => n.title)
    .concat(citedProjects.slice(0, 2).map(p => p.title))
    .join(', ')}${allCited.length > 5 ? `, and ${allCited.length - 5} more` : ''}.`;

  return {
    type: 'success',
    text,
    confidence: 'medium',
    evidence,
    citedNodes,
    citedProjects,
    explanation: `Found ${nodeCount} nodes and ${projectCount} projects`,
  };
}
