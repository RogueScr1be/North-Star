/**
 * USEASKTHEGRAPH.TS
 * React hook for Ask-the-Graph pipeline
 * Phase 8.0a: Real-time streaming with progressive text rendering
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
   * Handle streaming response from SSE endpoint
   * Real-time text rendering with citation extraction on completion
   * Phase 8.0a: Real-time streaming with progressive text rendering
   */
  const handleStreamingResponse = useCallback(
    async (query: string, API_BASE: string, requestSubmissionTime: number) => {
      const response = await fetch(`${API_BASE}/ask-graph/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body unavailable (streaming not supported)');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let citedNodeIds: string[] = [];
      let citedProjectIds: string[] = [];
      let confidence: 'high' | 'medium' | 'low' = 'medium';
      let requestId: string | undefined;

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split('\n');
          buffer = lines[lines.length - 1]; // Keep incomplete line in buffer

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();

            // SSE format: "data: {json}"
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6); // Remove "data: " prefix
              try {
                const message = JSON.parse(jsonStr);

                // Type: chunk — progressive text rendering
                if (message.type === 'chunk' && message.text) {
                  accumulatedText += message.text;
                  setState((prev) => ({
                    ...prev,
                    answer: prev.answer
                      ? { ...prev.answer, text: accumulatedText }
                      : {
                          type: 'success',
                          text: accumulatedText,
                          confidence: 'medium',
                          evidence: {
                            nodeIds: new Set(),
                            projectIds: new Set(),
                            edgeIds: new Set(),
                            explanation: 'OpenAI-synthesized answer based on graph context',
                          },
                          citedNodes: [],
                          citedProjects: [],
                          explanation: 'OpenAI-synthesized answer based on graph context',
                          requestId: requestId,
                          renderLatencyMs: Date.now() - requestSubmissionTime,
                        },
                  }));
                }

                // Type: citations — extract cited entities
                if (message.type === 'citations') {
                  citedNodeIds = message.nodeIds || [];
                  citedProjectIds = message.projectIds || [];
                  confidence = message.confidence || 'medium';
                }

                // Type: complete — final state with requestId
                if (message.type === 'complete') {
                  requestId = message.requestId;
                }

                // Type: error — stream encountered error
                if (message.type === 'error') {
                  throw new Error(message.error || 'Streaming error');
                }
              } catch (parseErr) {
                console.warn('[AskTheGraph] SSE parse error:', parseErr);
                // Continue processing; don't fail on malformed SSE message
              }
            }
          }
        }

        // Final flush of buffer
        if (buffer.trim().startsWith('data: ')) {
          try {
            const message = JSON.parse(buffer.trim().slice(6));
            if (message.type === 'citations') {
              citedNodeIds = message.nodeIds || [];
              citedProjectIds = message.projectIds || [];
              confidence = message.confidence || 'medium';
            }
            if (message.type === 'complete') {
              requestId = message.requestId;
            }
          } catch (parseErr) {
            console.warn('[AskTheGraph] Final SSE parse error:', parseErr);
          }
        }

        // Map cited IDs to graph entities
        const citedNodes = citedNodeIds
          .map((id: string) => {
            const node = nodes?.find((n) => n.id === id);
            return node || { id, type: 'unknown', title: id, description: '' };
          })
          .filter(Boolean) as GraphNode[];

        const citedProjects = citedProjectIds
          .map((id: string) => {
            const proj = projects?.find((p) => p.id === id);
            return proj || { id, title: id, description: '', gravity_score: 0 };
          })
          .filter(Boolean) as GraphProject[];

        // Final answer state with streaming-delivered citations
        const answer: Answer = {
          type: 'success',
          text: accumulatedText,
          confidence,
          evidence: {
            nodeIds: new Set(citedNodeIds),
            projectIds: new Set(citedProjectIds),
            edgeIds: new Set(),
            explanation: 'OpenAI-synthesized answer based on graph context',
          },
          citedNodes,
          citedProjects,
          explanation: 'OpenAI-synthesized answer based on graph context',
          requestId,
          renderLatencyMs: Date.now() - requestSubmissionTime,
        };

        setState({ query, loading: false, answer, error: null });

        // Log analytics
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
        }
      } catch (err) {
        // Stream error or parse failure — will trigger fallback in askGraph
        const errorMessage = err instanceof Error ? err.message : 'Streaming error';
        throw new Error(errorMessage);
      } finally {
        reader.releaseLock();
      }
    },
    [nodes, projects]
  );

  /**
   * Main query execution function
   * Tries streaming first (SSE), falls back to non-streaming if unavailable
   * Phase 8.0a: Real-time streaming with progressive text rendering
   */
  const askGraph = useCallback(
    (query: string, useStreaming: boolean = true) => {
      if (!query.trim()) {
        setState({ query: '', loading: false, answer: null, error: null });
        return;
      }

      const requestSubmissionTime = Date.now();
      setState({ query, loading: true, answer: null, error: null });

      (async () => {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

          // Try streaming path first if enabled
          if (useStreaming) {
            try {
              await handleStreamingResponse(query, API_BASE, requestSubmissionTime);
              return;
            } catch (streamErr) {
              console.warn('[AskTheGraph] Streaming failed, falling back to non-streaming:', streamErr);
              // Fall through to non-streaming
            }
          }

          // Fallback: non-streaming endpoint
          const response = await fetch(`${API_BASE}/ask-graph`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: query }),
          });

          if (!response.ok) {
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
              const node = nodes?.find((n) => n.id === id);
              return node || { id, type: 'unknown', title: id, description: '' };
            })
            .filter(Boolean) as GraphNode[];

          const citedProjects = citedProjectIds
            .map((id: string) => {
              const proj = projects?.find((p) => p.id === id);
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
    [nodes, projects, handleStreamingResponse]
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
