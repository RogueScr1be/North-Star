/**
 * USEASKTHEGRAPH.TS
 * React hook for Ask-the-Graph pipeline
 * Phase 4.0: Parse → Retrieve → Compose → Track
 */

import { useCallback, useState } from 'react';
import { GraphNode, GraphProject, GraphEdge } from '../lib/graph/graphTypes';
import { Answer } from '../lib/graph/answerComposer';
import {
  detectQuestionType,
  findEntityByTitle,
  findNodesByTag,
  findNodesInProject,
  findShortestPath,
  getConnectedNodes,
  getIncomingEdges,
  getOutgoingEdges,
  findCommonRelationships,
  extractDefinitionEvidence,
  extractRelationshipEvidence,
  extractEdgeEvidence,
  AnswerEvidence,
} from '../lib/graph/graphQueries';
import { composeAnswer } from '../lib/graph/answerComposer';
import {
  logSearchEvent,
  AskGraphSubmittedEvent,
  AskGraphAnsweredEvent,
  AskGraphNoAnswerEvent,
  AskGraphEvidenceClickedEvent,
} from '../lib/analytics/searchAnalytics';
import { sanitizeSearchQuery } from '../lib/analytics/queryRedaction';

// ============================================================================
// TYPES
// ============================================================================

export interface AskTheGraphState {
  query: string;
  loading: boolean;
  answer: Answer | null;
  error: string | null;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAskTheGraph(
  nodes: GraphNode[] | null,
  projects: GraphProject[] | null,
  edges: GraphEdge[] | null
) {
  const [state, setState] = useState<AskTheGraphState>({
    query: '',
    loading: false,
    answer: null,
    error: null,
  });

  /**
   * Main query execution function
   * Handles: parse → retrieve → compose → analytics
   */
  const askGraph = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setState({ query: '', loading: false, answer: null, error: null });
        return;
      }

      if (!nodes || !projects || !edges) {
        setState({
          query,
          loading: false,
          answer: null,
          error: 'Graph data not loaded',
        });
        return;
      }

      setState({ query, loading: true, answer: null, error: null });

      try {
        // Step 1: Parse intent
        const parsed = detectQuestionType(query);

        // Step 2: Retrieve evidence based on question type
        let evidence: AnswerEvidence;

        switch (parsed.type) {
          case 'definition': {
            const entity = findEntityByTitle(nodes, projects, parsed.primaryEntity || '');
            if (!entity) {
              evidence = { nodeIds: new Set(), projectIds: new Set(), edgeIds: new Set(), explanation: 'Not found' };
            } else {
              evidence = extractDefinitionEvidence(entity.data);
            }
            break;
          }

          case 'relationship': {
            const source = findEntityByTitle(nodes, projects, parsed.primaryEntity || '');
            const target = findEntityByTitle(nodes, projects, parsed.secondaryEntity || '');

            if (!source || !target) {
              evidence = { nodeIds: new Set(), projectIds: new Set(), edgeIds: new Set(), explanation: 'Entity not found' };
            } else {
              // Get IDs as strings
              const sourceId = source.data.id;
              const targetId = target.data.id;

              // Find path
              const path = findShortestPath(nodes, edges, sourceId, targetId, 3);
              evidence = extractRelationshipEvidence(path, nodes, projects);
            }
            break;
          }

          case 'scope': {
            const project = projects.find(p => p.title.toLowerCase().includes((parsed.primaryEntity || '').toLowerCase()));
            if (!project) {
              evidence = { nodeIds: new Set(), projectIds: new Set(), edgeIds: new Set(), explanation: 'Project not found' };
            } else {
              evidence = {
                nodeIds: new Set(findNodesInProject(nodes, project.id).map(n => n.id)),
                projectIds: new Set([project.id]),
                edgeIds: new Set(),
                explanation: `Nodes in ${project.title}`,
              };
            }
            break;
          }

          case 'patterns': {
            const commonRels = findCommonRelationships(edges);
            evidence = {
              nodeIds: new Set(),
              projectIds: new Set(),
              edgeIds: new Set(edges.map(e => e.id)),
              explanation: commonRels.slice(0, 3).map(r => `${r.type} (${r.percentage}%)`).join(', '),
            };
            break;
          }

          case 'causality_incoming': {
            const entity = findEntityByTitle(nodes, projects, parsed.primaryEntity || '');
            if (!entity) {
              evidence = { nodeIds: new Set(), projectIds: new Set(), edgeIds: new Set(), explanation: 'Entity not found' };
            } else {
              const incomingEdges = getIncomingEdges(edges, entity.data.id);
              const connected = getConnectedNodes(nodes, projects, incomingEdges, entity.data.id);
              evidence = extractEdgeEvidence(connected.inbound, 'incoming');
            }
            break;
          }

          case 'causality_outgoing': {
            const entity = findEntityByTitle(nodes, projects, parsed.primaryEntity || '');
            if (!entity) {
              evidence = { nodeIds: new Set(), projectIds: new Set(), edgeIds: new Set(), explanation: 'Entity not found' };
            } else {
              const outgoingEdges = getOutgoingEdges(edges, entity.data.id);
              const connected = getConnectedNodes(nodes, projects, outgoingEdges, entity.data.id);
              evidence = extractEdgeEvidence(connected.outbound, 'outgoing');
            }
            break;
          }

          case 'tag_search': {
            const tagNodes = findNodesByTag(nodes, parsed.tag || '');
            evidence = {
              nodeIds: new Set(tagNodes.map(n => n.id)),
              projectIds: new Set(),
              edgeIds: new Set(),
              explanation: `Nodes with tag "${parsed.tag}"`,
            };
            break;
          }

          case 'unknown':
          default: {
            evidence = { nodeIds: new Set(), projectIds: new Set(), edgeIds: new Set(), explanation: 'Query type unknown' };
            break;
          }
        }

        // Step 3: Compose answer
        const answer = composeAnswer(parsed, evidence, nodes, projects);

        setState({ query, loading: false, answer, error: null });

        // Step 4: Log analytics
        try {
          const { sanitizedQuery, queryHash } = sanitizeSearchQuery(query);

          if (answer.type === 'success') {
            logSearchEvent({
              type: 'ask_graph_answered',
              sanitizedQuery,
              queryHash,
              entity: parsed.primaryEntity || parsed.tag || '',
              questionType: parsed.type,
              answerLength: answer.text.length,
              citedNodeCount: answer.citedNodes.length,
              citedProjectCount: answer.citedProjects.length,
              answerConfidence: answer.confidence,
              timestamp: Date.now(),
            } as const as AskGraphAnsweredEvent);
          } else if (answer.type === 'no_data') {
            logSearchEvent({
              type: 'ask_graph_no_answer',
              sanitizedQuery,
              queryHash,
              entity: parsed.primaryEntity || parsed.tag || '',
              attemptedQuestionType: parsed.type,
              reason: 'no_data',
              timestamp: Date.now(),
            } as const as AskGraphNoAnswerEvent);
          } else {
            logSearchEvent({
              type: 'ask_graph_submitted',
              sanitizedQuery,
              queryHash,
              entity: parsed.primaryEntity || parsed.tag || '',
              questionType: parsed.type,
              timestamp: Date.now(),
            } as const as AskGraphSubmittedEvent);
          }
        } catch (analyticsErr) {
          console.error('[AskTheGraph] Analytics error:', analyticsErr);
          // Silently fail, don't break UX
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error processing query';
        setState({ query, loading: false, answer: null, error: errorMessage });
      }
    },
    [nodes, projects, edges]
  );

  /**
   * Clear state
   */
  const clear = useCallback(() => {
    setState({ query: '', loading: false, answer: null, error: null });
  }, []);

  /**
   * Log evidence click
   */
  const logEvidenceClick = useCallback(
    (itemId: string, itemType: 'node' | 'project', citationIndex: number) => {
      try {
        const { sanitizedQuery, queryHash } = sanitizeSearchQuery(state.query);
        logSearchEvent({
          type: 'ask_graph_evidence_clicked',
          sanitizedQuery,
          queryHash,
          itemId,
          itemType,
          citationIndex,
          timestamp: Date.now(),
        } as const as AskGraphEvidenceClickedEvent);
      } catch (err) {
        console.error('[AskTheGraph] Evidence click analytics error:', err);
      }
    },
    [state.query]
  );

  return {
    ...state,
    askGraph,
    clear,
    logEvidenceClick,
  };
}
