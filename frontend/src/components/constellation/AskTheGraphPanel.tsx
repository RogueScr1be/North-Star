/**
 * ASKTHEGRAPHPANEL.TSX
 * Ask-the-Graph UI component
 * Phase 4.0: Input + answer display + evidence navigation
 * Phase 5.6: Follow-ups + recent queries + camera focus
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { GraphNode, GraphProject } from '../../lib/graph/graphTypes';
import { useAskTheGraph } from '../../hooks/useAskTheGraph';
import { generateFollowUps, FollowUpSuggestion }from '../../lib/graph/followUpQuestions';
import { logAnswerContextEntered, logAnswerContextExited } from '../../lib/analytics/constellationAnalytics';
import {
  logAskGraphResponseRendered,
  logAskGraphEvidenceClicked,
  logAskGraphPanelClosed,
  logAskGraphFrontendError,
} from '../../lib/frontend-telemetry';
import { saveAnswer, isSaved as checkIsSaved, getSavedAnswers, deleteAnswer } from '../../lib/storage/savedAnswers';
import type { SavedAnswer } from '../../lib/storage/savedAnswers';
import { sanitizeSearchQuery } from '../../lib/analytics/queryRedaction';
import './AskTheGraphPanel.css';

// ============================================================================
// TYPES
// ============================================================================

interface AskTheGraphPanelProps {
  nodes: GraphNode[];
  projects: GraphProject[];
  edges?: any[]; // Kept for backward compatibility but not used in Phase 7.1
  onNodeSelect: (node: GraphNode) => void;
  onProjectSelect: (project: GraphProject) => void;
  onEvidenceFocus?: (nodeIds: string[], projectIds: string[]) => void; // Phase 5.6: camera focus callback
}

// ============================================================================
// RECENT QUERIES MANAGEMENT
// ============================================================================

const RECENT_QUERIES_STORAGE_KEY = 'ask-the-graph-recent-queries';
const MAX_RECENT_QUERIES = 5;

function getRecentQueries(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_QUERIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentQuery(query: string) {
  try {
    const queries = getRecentQueries();
    // Remove duplicate if exists
    const filtered = queries.filter(q => q !== query);
    // Add to front
    const updated = [query, ...filtered].slice(0, MAX_RECENT_QUERIES);
    localStorage.setItem(RECENT_QUERIES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail
  }
}

// ============================================================================
// ANSWER CHUNKING (Phase 13)
// ============================================================================

/**
 * Split answer text into readable blocks by paragraph breaks
 * Preserves single-paragraph answers as-is
 * Enables future heading detection (## prefix)
 */
function chunkAnswerText(text: string): { type: 'text' | 'heading'; content: string }[] {
  const blocks: { type: 'text' | 'heading'; content: string }[] = [];

  // Split on double newlines (paragraph breaks)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

  if (paragraphs.length === 0) {
    return [{ type: 'text', content: text }];
  }

  // Process each paragraph
  for (const para of paragraphs) {
    // Optional: detect heading markers (## prefix for future use)
    if (para.trim().startsWith('##')) {
      blocks.push({
        type: 'heading',
        content: para.trim().substring(2).trim(),
      });
    } else {
      blocks.push({
        type: 'text',
        content: para.trim(),
      });
    }
  }

  return blocks.length > 0 ? blocks : [{ type: 'text', content: text }];
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Evidence item renderer (Phase 5.7: enriched with gravity score)
 */
function EvidenceItem({
  item,
  itemType,
  onSelect,
  onEvidenceClick,
}: {
  item: GraphNode | GraphProject;
  itemType: 'node' | 'project';
  onSelect: () => void;
  onEvidenceClick: () => void;
}) {
  const typeBadge = itemType === 'node' ? (item as GraphNode).type : 'project';
  const title = item.title || item.id;
  const gravityPercent = Math.round((item.gravity_score || 0) * 100);

  return (
    <button
      className="ask-evidence-item"
      onClick={() => {
        onEvidenceClick();
        onSelect();
      }}
      title={`Click to select and navigate to ${title}`}
    >
      <div className="ask-evidence-header">
        <span className={`ask-evidence-badge ask-badge-${typeBadge}`}>{typeBadge}</span>
        <span className="ask-evidence-title">{title}</span>
        <span className="ask-evidence-gravity" title="Importance / gravity">{gravityPercent}%</span>
      </div>
      {itemType === 'node' && (item as GraphNode).description && (
        <p className="ask-evidence-desc">{(item as GraphNode).description}</p>
      )}
    </button>
  );
}

/**
 * Follow-up suggestion button
 */
function FollowUpButton({
  suggestion,
  onSelect,
}: {
  suggestion: FollowUpSuggestion;
  onSelect: (text: string) => void;
}) {
  return (
    <button
      className="ask-followup-button"
      onClick={() => onSelect(suggestion.text)}
      title={suggestion.reason}
    >
      {suggestion.text}
    </button>
  );
}

/**
 * Recent query button
 */
function RecentQueryButton({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (text: string) => void;
}) {
  return (
    <button
      className="ask-recent-button"
      onClick={() => onSelect(query)}
      title={`Re-run: ${query}`}
    >
      {query}
    </button>
  );
}

/**
 * Preset question button (Phase 12A)
 */
function PresetQuestionButton({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (text: string) => void;
}) {
  return (
    <button
      className="ask-preset-button"
      onClick={() => onSelect(query)}
      title={`Ask: ${query}`}
    >
      {query}
    </button>
  );
}

/**
 * Saved answer item (Phase 15)
 */
function SavedAnswerItem({
  savedAnswer,
  onSelect,
  onDelete,
}: {
  savedAnswer: SavedAnswer;
  onSelect: (query: string) => void;
  onDelete: (id: string) => void;
}) {
  const timestamp = new Date(savedAnswer.timestamp);
  const formattedTime = timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Preview: first 1-2 lines of answer
  const previewText = savedAnswer.answer
    .split('\n')
    .slice(0, 2)
    .join(' ')
    .substring(0, 120);

  return (
    <div className="ask-saved-item">
      <button
        className="ask-saved-item-content"
        onClick={() => onSelect(savedAnswer.query)}
        title={`Re-open: ${savedAnswer.query}`}
      >
        <div className="ask-saved-query">{savedAnswer.query}</div>
        <div className="ask-saved-preview">{previewText}…</div>
        <div className="ask-saved-timestamp">{formattedTime}</div>
      </button>
      <button
        className="ask-saved-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(savedAnswer.id);
        }}
        title="Delete saved answer"
        aria-label="Delete"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Main panel component
 */
export const AskTheGraphPanel: React.FC<AskTheGraphPanelProps> = ({
  nodes,
  projects,
  onNodeSelect,
  onProjectSelect,
  onEvidenceFocus,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const { loading, answer, error, askGraph, clear, logEvidenceClick } = useAskTheGraph(nodes, projects);

  // Phase 5.9: Answer context lifecycle tracking
  const answerSessionStartTimeRef = useRef<number | null>(null);
  const previousAnswerRef = useRef<any>(null);
  const evidenceClickCountRef = useRef<number>(0);

  // Step 5: Frontend telemetry tracking
  const panelOpenTimeRef = useRef<number | null>(null);
  const currentRequestIdRef = useRef<string>('');

  // Load recent queries and saved answers on mount (Phase 15)
  useEffect(() => {
    setRecentQueries(getRecentQueries());
    setSavedAnswers(getSavedAnswers());
  }, []);

  // Compute follow-ups from answer (Phase 5.6)
  const followUps = useMemo(() => {
    if (!answer || answer.type !== 'success') return [];
    return generateFollowUps(answer, answer.citedNodes[0]?.title, answer.citedNodes[1]?.title);
  }, [answer]);

  // Phase 14: Check if answer is saved when answer changes
  useEffect(() => {
    if (answer && inputValue.trim()) {
      const { queryHash } = sanitizeSearchQuery(inputValue);
      setIsSaved(checkIsSaved(queryHash));
    } else {
      setIsSaved(false);
    }
  }, [answer, inputValue]);

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    setInputValue(newValue);
  };

  /**
   * Handle form submit
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setIsOpen(true);
      saveRecentQuery(inputValue);
      setRecentQueries(getRecentQueries());
      askGraph(inputValue);
    }
  };

  /**
   * Handle focus
   */
  const handleFocus = () => {
    if (!panelOpenTimeRef.current) {
      panelOpenTimeRef.current = Date.now(); // Step 5: Track panel open time
    }
    setIsOpen(true);
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    // Step 5: Emit panel closed event (always-fired when user closes)
    if (currentRequestIdRef.current && panelOpenTimeRef.current) {
      try {
        const panelOpenDurationMs = Date.now() - panelOpenTimeRef.current;
        const evidenceClicked = evidenceClickCountRef.current > 0;
        logAskGraphPanelClosed(
          currentRequestIdRef.current,
          panelOpenDurationMs,
          evidenceClicked
        );
      } catch (err) {
        console.error('[AskTheGraphPanel] Panel close telemetry error:', err);
      }
    }

    setIsOpen(false);
    clear();
    setInputValue('');
    panelOpenTimeRef.current = null; // Reset for next session
    currentRequestIdRef.current = '';
  };

  /**
   * Handle evidence click
   */
  const handleEvidenceClick = (
    item: GraphNode | GraphProject,
    itemType: 'node' | 'project',
    index: number
  ) => {
    // Phase 5.9: Track evidence click within answer session
    if (answerSessionStartTimeRef.current) {
      evidenceClickCountRef.current += 1;
    }

    // Step 5: Emit evidence clicked event (conditional, only if answer exists)
    if (currentRequestIdRef.current && answer) {
      try {
        const totalCitations = answer.citedNodes.length + answer.citedProjects.length;
        logAskGraphEvidenceClicked(
          currentRequestIdRef.current,
          item.id,
          itemType,
          index,
          totalCitations
        );
      } catch (err) {
        console.error('[AskTheGraphPanel] Evidence click telemetry error:', err);
      }
    }

    logEvidenceClick(item.id, itemType, index);

    if (itemType === 'node') {
      onNodeSelect(item as GraphNode);
    } else {
      onProjectSelect(item as GraphProject);
    }

    // Phase 5.6: Trigger camera focus on cited entities
    if (onEvidenceFocus && answer) {
      const nodeIds = answer.citedNodes.map(n => n.id);
      const projectIds = answer.citedProjects.map(p => p.id);
      onEvidenceFocus(nodeIds, projectIds);
    }

    // Keep panel open, but user can see their selection in the graph
  };

  /**
   * Handle follow-up click (Phase 5.6)
   */
  const handleFollowUp = (text: string) => {
    setInputValue(text);
    setIsOpen(true);
    saveRecentQuery(text);
    setRecentQueries(getRecentQueries());
    askGraph(text);
  };

  /**
   * Handle recent query click (Phase 5.6)
   */
  const handleRecentQuery = (query: string) => {
    setInputValue(query);
    setIsOpen(true);
    askGraph(query);
  };

  /**
   * Handle preset question click (Phase 12A)
   */
  const handlePresetQuestion = (query: string) => {
    setInputValue(query);
    setIsOpen(true);
    saveRecentQuery(query);
    setRecentQueries(getRecentQueries());
    askGraph(query);
  };

  /**
   * Phase 14: Save answer to memory
   */
  const handleSaveAnswer = useCallback(() => {
    // Guard: require answer text
    if (!answer?.text) {
      console.warn('[AskTheGraphPanel] Cannot save: missing answer text');
      return;
    }

    // Compute queryHash from input
    const { queryHash } = sanitizeSearchQuery(inputValue);

    const savedAnswer: SavedAnswer = {
      id: queryHash,
      query: inputValue,
      answer: answer.text,
      timestamp: Date.now(),
      queryHash: queryHash,
    };

    saveAnswer(savedAnswer);
    setIsSaved(true);
  }, [answer, inputValue]);

  /**
   * Phase 15: Load a saved answer into Ask-the-Graph
   */
  const handleLoadSavedAnswer = useCallback((query: string) => {
    setInputValue(query);
    setIsOpen(true);
    askGraph(query);
  }, [askGraph]);

  /**
   * Phase 15: Delete a saved answer
   */
  const handleDeleteSavedAnswer = useCallback((id: string) => {
    deleteAnswer(id);
    setSavedAnswers(getSavedAnswers());
  }, []);

  // Step 5: Emit error event on error (conditional, only if error exists)
  useEffect(() => {
    if (error && currentRequestIdRef.current) {
      try {
        logAskGraphFrontendError(
          currentRequestIdRef.current,
          error,
          'response_error'
        );
      } catch (err) {
        console.error('[AskTheGraphPanel] Error telemetry error:', err);
      }
    }
  }, [error]);

  // Phase 5.9: Track answer context lifecycle for analytics
  useEffect(() => {
    // Check if answer entered context (success answer)
    if (answer?.type === 'success' && !answerSessionStartTimeRef.current) {
      answerSessionStartTimeRef.current = Date.now();
      evidenceClickCountRef.current = 0;

      // Step 5: Emit response rendered event (always-fired for success answers)
      if (answer.requestId && answer.renderLatencyMs !== undefined) {
        try {
          logAskGraphResponseRendered(
            answer.requestId,
            answer.renderLatencyMs,
            answer.citedNodes.length,
            answer.citedProjects.length,
            answer.confidence
          );
          currentRequestIdRef.current = answer.requestId;
        } catch (err) {
          console.error('[AskTheGraphPanel] Telemetry error:', err);
        }
      }

      logAnswerContextEntered(
        answer.type,
        answer.confidence,
        answer.citedNodes.length,
        answer.citedProjects.length
      );
    }

    // Check if answer exited context (answer became null or changed)
    if (!answer && answerSessionStartTimeRef.current) {
      // Answer was shown, now hidden
      const duration = Date.now() - answerSessionStartTimeRef.current;
      logAnswerContextExited(duration, evidenceClickCountRef.current);
      answerSessionStartTimeRef.current = null;
      evidenceClickCountRef.current = 0;
    } else if (answer && previousAnswerRef.current && answer.type === 'success' && previousAnswerRef.current.type === 'success') {
      // Answer changed from one success to another success (replacement)
      if (previousAnswerRef.current.text !== answer.text) {
        const duration = Date.now() - (answerSessionStartTimeRef.current || Date.now());
        logAnswerContextExited(duration, evidenceClickCountRef.current);
        // Start new session
        answerSessionStartTimeRef.current = Date.now();
        evidenceClickCountRef.current = 0;
        logAnswerContextEntered(
          answer.type,
          answer.confidence,
          answer.citedNodes.length,
          answer.citedProjects.length
        );
      }
    }

    previousAnswerRef.current = answer;
  }, [answer]);

  // Render nothing if not open and no active query
  if (!isOpen && !answer) {
    return (
      <div className="ask-graph-trigger">
        <form onSubmit={handleSubmit} className="ask-graph-input-wrapper">
          <div className="ask-input-container">
            <input
              type="text"
              placeholder="Ask a Question"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              className="ask-graph-input-compact"
              aria-label="Ask a Question"
            />
          </div>
          {inputValue.trim() && <button type="submit" className="ask-submit-button">Ask</button>}
        </form>
      </div>
    );
  }

  return (
    <div className="ask-graph-panel">
      {/* Header */}
      <div className="ask-header">
        <h3>Explore</h3>
        <button className="ask-close-button" onClick={handleClose} aria-label="Close exploration panel">
          ✕
        </button>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="ask-graph-input-wrapper-expanded">
        <div className="ask-input-container">
          <input
            type="text"
            placeholder="Ask a Question"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            className="ask-graph-input-expanded"
            aria-label="Ask a Question"
          />
        </div>
        {inputValue.trim() && <button type="submit" className="ask-submit-button">Ask</button>}
      </form>

      {/* Phase 15: Saved answers section (shown when no query, before answer) */}
      {!inputValue.trim() && !answer && savedAnswers.length > 0 && (
        <div className="ask-saved-section">
          <div className="ask-saved-header">Memory</div>
          <div className="ask-saved-list">
            {savedAnswers.map((saved) => (
              <SavedAnswerItem
                key={saved.id}
                savedAnswer={saved}
                onSelect={handleLoadSavedAnswer}
                onDelete={handleDeleteSavedAnswer}
              />
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="ask-state ask-loading">
          <div className="ask-spinner"></div>
          <p>Analyzing graph...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="ask-state ask-error">
          <p className="ask-error-text">Error: {error}</p>
        </div>
      )}

      {/* Answer state */}
      {answer && !loading && (
        <div className="ask-answer-container">
          {/* Answer text (Phase 13: chunked for readability) */}
          <div className="ask-answer">
            <div className="ask-answer-header">
              <div className="ask-answer-meta">
                <span className={`ask-confidence ask-confidence-${answer.confidence}`}>
                  {answer.confidence.toUpperCase()}
                </span>
                <span className={`ask-type ask-type-${answer.type}`}>{answer.type}</span>
              </div>
              {/* Phase 14: Save button */}
              <button
                className={`ask-save-button ${isSaved ? 'saved' : ''}`}
                onClick={handleSaveAnswer}
                title={isSaved ? 'Saved to memory' : 'Save to memory'}
              >
                {isSaved ? '★' : '☆'}
              </button>
            </div>
            <div className="ask-answer-blocks">
              {chunkAnswerText(answer.text).map((block, idx) =>
                block.type === 'heading' ? (
                  <h4 key={idx} className="ask-answer-heading">{block.content}</h4>
                ) : (
                  <p key={idx} className="ask-answer-block">{block.content}</p>
                )
              )}
            </div>
            <p className="ask-explanation">{answer.explanation}</p>
          </div>

          {/* Evidence list */}
          {(answer.citedNodes.length > 0 || answer.citedProjects.length > 0) && (
            <div className="ask-evidence-section">
              <h4>Supporting Evidence</h4>
              <div className="ask-evidence-list">
                {answer.citedProjects.map((proj, idx) => (
                  <EvidenceItem
                    key={proj.id}
                    item={proj}
                    itemType="project"
                    onSelect={() => onProjectSelect(proj)}
                    onEvidenceClick={() => handleEvidenceClick(proj, 'project', idx)}
                  />
                ))}
                {answer.citedNodes.map((node, idx) => (
                  <EvidenceItem
                    key={node.id}
                    item={node}
                    itemType="node"
                    onSelect={() => onNodeSelect(node)}
                    onEvidenceClick={() => handleEvidenceClick(node, 'node', idx)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Follow-up suggestions (Phase 5.6) */}
          {followUps.length > 0 && (
            <div className="ask-followup-section">
              <h4>Continue Exploring</h4>
              <div className="ask-followup-list">
                {followUps.map((followUp, idx) => (
                  <FollowUpButton
                    key={idx}
                    suggestion={followUp}
                    onSelect={handleFollowUp}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No answer state */}
          {answer.type === 'no_data' && (
            <div className="ask-no-answer">
              <p>The graph doesn't contain enough information to answer this question. Try asking about something else.</p>
            </div>
          )}

          {answer.type === 'insufficient_evidence' && (
            <div className="ask-insufficient">
              <p>The graph has limited information about this. The answer above is based on what is available.</p>
            </div>
          )}

          {answer.type === 'unparseable' && (
            <div className="ask-unparseable">
              <p>I couldn't understand that question. Try rephrasing or ask about specific items in the graph.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state when open but no query */}
      {isOpen && !answer && !loading && !error && (
        <div className="ask-state ask-empty">
          {/* Preset questions (Phase 12A) */}
          <div className="ask-preset-section">
            <p className="ask-preset-label">Try</p>
            <div className="ask-preset-list">
              <PresetQuestionButton
                query="What is North Star?"
                onSelect={handlePresetQuestion}
              />
              <PresetQuestionButton
                query="How are GetIT and Fast Food connected?"
                onSelect={handlePresetQuestion}
              />
              <PresetQuestionButton
                query="What should I work on next?"
                onSelect={handlePresetQuestion}
              />
            </div>
          </div>

          {/* Recent queries (Phase 5.6) */}
          {recentQueries.length > 0 && (
            <div className="ask-recent-section">
              <p className="ask-recent-label">Recent</p>
              <div className="ask-recent-list">
                {recentQueries.slice(0, 3).map((query, idx) => (
                  <RecentQueryButton
                    key={idx}
                    query={query}
                    onSelect={handleRecentQuery}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="ask-empty-hint">Ask about nodes, projects, connections, or patterns in the graph.</p>
          <p className="ask-example">Examples:</p>
          <ul className="ask-examples">
            <li>"What is North Star?"</li>
            <li>"How are GetIT and Fast Food connected?"</li>
            <li>"What decisions shaped this project?"</li>
            <li>"What patterns appear across projects?"</li>
          </ul>
        </div>
      )}
    </div>
  );
};
