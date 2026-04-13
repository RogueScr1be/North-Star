/**
 * USEASKTHEGRAPH.TS
 * React hook for Ask-the-Graph pipeline
 * Phase 4.0: Parse → Retrieve → Compose → Track
 */

import { useCallback, useState } from 'react';
import { GraphNode, GraphProject } from '../lib/graph/graphTypes';
import { Answer } from '../lib/graph/answerComposer';
import {
  AskGraphAnsweredEvent,
  AskGraphNoAnswerEvent,
  AskGraphEvidenceClickedEvent,
  logSearchEvent,
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
  projects: GraphProject[] | null
) {
  const [state, setState] = useState<AskTheGraphState>({
    query: '',
    loading: false,
    answer: null,
    error: null,
  });

  /**
   * Main query execution function
   * Calls backend /api/ask-graph endpoint for OpenAI-powered answers
   * Phase 7.1: OpenAI API integration with model routing for improved synthesis
   */
  const askGraph = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setState({ query: '', loading: false, answer: null, error: null });
        return;
      }

      // Step 5: Capture request submission time for render latency measurement
      const requestSubmissionTime = Date.now();
      setState({ query, loading: true, answer: null, error: null });

      // Call backend endpoint
      (async () => {
        try {
          // Prefer explicit env var, otherwise use root-relative path (works in dev via Vite proxy and in prod on same domain)
          const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

          const response = await fetch(`${API_BASE}/ask-graph`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: query }),
          });

          if (!response.ok) {
            // Try to extract real error message from backend response
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorBody = await response.json();
              if (errorBody.error) {
                errorMessage = errorBody.error;
              }
            } catch {
              // If response body is not JSON, use HTTP status message
            }
            throw new Error(errorMessage);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Unknown error from backend');
          }

          // Step 5: Calculate render latency (time from submit to response received)
          const renderLatencyMs = Date.now() - requestSubmissionTime;

          // Transform backend response to Answer format
          const citedNodeIds = result.citedNodeIds || [];
          const citedProjectIds = result.citedProjectIds || [];

          const citedNodes = citedNodeIds
            .map((id: string) => {
              const node = nodes?.find(n => n.id === id);
              return node || { id, type: 'unknown', title: id, description: '' };
            })
            .filter(Boolean) as GraphNode[];

          const citedProjects = citedProjectIds
            .map((id: string) => {
              const proj = projects?.find(p => p.id === id);
              return proj || { id, title: id, description: '', gravity_score: 0 };
            })
            .filter(Boolean) as GraphProject[];

          const answer: Answer = {
            type: 'success',
            text: result.answer,
            confidence: result.confidence || 'medium',
            evidence: {
              nodeIds: new Set(citedNodeIds),
              projectIds: new Set(citedProjectIds),
              edgeIds: new Set(),
              explanation: 'OpenAI-synthesized answer based on graph context',
            },
            citedNodes,
            citedProjects,
            explanation: 'OpenAI-synthesized answer based on graph context',
            requestId: result.requestId, // Phase 7.1: Correlation with backend events
            renderLatencyMs, // Step 5: Render latency for monitoring
          };

          setState({ query, loading: false, answer, error: null });

          // Step 4: Log analytics
          try {
            const { sanitizedQuery, queryHash } = sanitizeSearchQuery(query);

            logSearchEvent({
              type: 'ask_graph_answered',
              sanitizedQuery,
              queryHash,
              entity: '',
              questionType: 'openai_synthesis',
              answerLength: answer.text.length,
              citedNodeCount: answer.citedNodes.length,
              citedProjectCount: answer.citedProjects.length,
              answerConfidence: answer.confidence,
              timestamp: Date.now(),
            } as const as AskGraphAnsweredEvent);
          } catch (analyticsErr) {
            console.error('[AskTheGraph] Analytics error:', analyticsErr);
            // Silently fail, don't break UX
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setState({ query, loading: false, answer: null, error: errorMessage });

          // Log error analytics
          try {
            const { sanitizedQuery, queryHash } = sanitizeSearchQuery(query);
            logSearchEvent({
              type: 'ask_graph_no_answer',
              sanitizedQuery,
              queryHash,
              entity: '',
              attemptedQuestionType: 'openai_synthesis',
              reason: 'backend_error',
              timestamp: Date.now(),
            } as const as AskGraphNoAnswerEvent);
          } catch (analyticsErr) {
            console.error('[AskTheGraph] Error analytics error:', analyticsErr);
          }
        }
      })();
    },
    [nodes, projects]
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
