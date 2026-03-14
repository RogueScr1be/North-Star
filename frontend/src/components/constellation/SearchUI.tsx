/**
 * SEARCHUI.TSX
 * Lightweight search component for constellation canvas
 * Phase 2.7: Node/project search with dropdown results
 * Phase 3.0: Grouped results by entity type
 */

import React, { useState, useCallback, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { GraphNode, GraphProject } from '../../lib/graph/graphTypes';
import {
  searchGraphItems,
  SearchResult,
  highlightMatchedSubstring,
  getRecentSearches,
  saveRecentSearch,
  groupSearchResults,
  flattenGroupedResults,
  ResultGroup,
} from '../../lib/search/searchUtils';
import { getPinnedItems, getRecentItems, NavigationItem } from '../../lib/search/navigationUtils';
import { parseQuery, formatIntentMessage, ParsedQuery } from '../../lib/search/queryParser';
import { deriveIntentPattern } from '../../lib/search/searchIntentHelper';
import { logSearchEvent, SearchExecutedEvent, SearchResultSelectedEvent } from '../../lib/analytics/searchAnalytics';
import { logNodeSelected, logProjectSelected } from '../../lib/analytics/constellationAnalytics';
import { sanitizeSearchQuery } from '../../lib/analytics/queryRedaction';
import './SearchUI.css';

interface SearchUIProps {
  nodes: GraphNode[];
  projects: GraphProject[];
  onNodeSelect: (node: GraphNode) => void;
  onProjectSelect: (project: GraphProject) => void;
}

export interface SearchUIHandle {
  focus(): void;
}

const SearchUIComponent: React.ForwardRefRenderFunction<SearchUIHandle, SearchUIProps> = (
  {
    nodes,
    projects,
    onNodeSelect,
    onProjectSelect,
  },
  ref
) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecents, setShowRecents] = useState(false);
  const [pinnedItems, setPinnedItems] = useState<NavigationItem[]>([]);
  const [recentItems, setRecentItems] = useState<NavigationItem[]>([]);
  const [intentMessage, setIntentMessage] = useState<string | null>(null);
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track current search session for analytics (Phase 3.6)
  const searchSessionRef = useRef<{
    rawQuery: string;
    parsed: ParsedQuery;
    resultCount: number;
    openedAt: number;
    selectedInSession: boolean;
  } | null>(null);

  // Phase 3.7: Debounce timer for search_executed event
  // Fires only 300ms after user stops typing to reduce noise
  const searchExecutedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expose focus method to parent via forwardRef
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }), []);

  // Group results for structured display, preserving ranking within each group
  const groupedResults = useMemo<ResultGroup[]>(() => {
    return groupSearchResults(results);
  }, [results]);

  // Flatten for ref tracking (keyboard nav still uses flat index)
  const flatResults = useMemo<SearchResult[]>(() => {
    return flattenGroupedResults(groupedResults);
  }, [groupedResults]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Search on query change (Phase 3.5: parse query for NL intent)
  // Phase 3.6: Fire search_executed event for analytics
  // Phase 3.7: Debounce search_executed to reduce keystroke noise
  useEffect(() => {
    // Clear previous timer if user is typing again
    if (searchExecutedTimerRef.current) {
      clearTimeout(searchExecutedTimerRef.current);
    }

    if (query.trim()) {
      // Parse natural language query
      const parsed = parseQuery(query);
      const intent = formatIntentMessage(parsed);
      setIntentMessage(intent);

      // Search with optional filters from parser
      const searchResults = searchGraphItems(
        parsed.searchTerm,
        nodes,
        projects,
        {
          filterType: parsed.filterType,
          filterEntity: parsed.filterEntity,
        }
      );
      setResults(searchResults);
      setIsOpen(true); // Always open when typing, even if no results (shows empty state)
      setShowRecents(false);
      setHighlightedIndex(-1);
      // Reset refs when results change
      resultRefs.current = [];

      // Track search session for analytics (Phase 3.6)
      searchSessionRef.current = {
        rawQuery: query,
        parsed,
        resultCount: searchResults.length,
        openedAt: Date.now(),
        selectedInSession: false,
      };

      // Phase 3.7: Debounce search_executed event
      // Fire only 300ms after user stops typing to reduce noise (keystroke inflation)
      // Results display instantly; analytics event fires on stabilization
      searchExecutedTimerRef.current = setTimeout(() => {
        const intentPattern = deriveIntentPattern(parsed);
        const { sanitizedQuery, queryHash } = sanitizeSearchQuery(query);

        const event: SearchExecutedEvent = {
          type: 'search_executed',
          rawQuery: query,
          sanitizedQuery, // Phase 3.7: Truncated to 100 chars for safe logging
          queryHash, // Phase 3.7: Hash for deduplication
          normalizedQuery: parsed.searchTerm,
          parsed: parsed.isLikelyIntent,
          intentPattern,
          filterType: parsed.filterType || null,
          filterEntity: parsed.filterEntity || null,
          resultCount: searchResults.length,
          emptyResult: searchResults.length === 0,
          timestamp: Date.now(),
        };
        logSearchEvent(event);
      }, 300); // 300ms debounce
    } else {
      setResults([]);
      setShowRecents(false);
      setIsOpen(false);
      setIntentMessage(null);
      searchSessionRef.current = null;
    }

    // Cleanup timer on unmount
    return () => {
      if (searchExecutedTimerRef.current) {
        clearTimeout(searchExecutedTimerRef.current);
      }
    };
  }, [query, nodes, projects]);

  // Scroll highlighted result into view when keyboard navigates
  useEffect(() => {
    if (highlightedIndex >= 0 && resultRefs.current[highlightedIndex]) {
      const highlightedElement = resultRefs.current[highlightedIndex];
      highlightedElement?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [highlightedIndex]);

  // Handle result selection (from either keyboard or mouse)
  // Phase 3.6: Fire search_result_selected event for analytics
  const selectResult = useCallback(
    (result: SearchResult) => {
      // Mark selection for abandoned tracking (Phase 3.6)
      if (searchSessionRef.current) {
        searchSessionRef.current.selectedInSession = true;
      }

      // Fire search_result_selected event
      const session = searchSessionRef.current;
      if (session) {
        const selectedRank = flatResults.indexOf(result);
        const intentPattern = deriveIntentPattern(session.parsed);
        const label = result.type === 'node'
          ? `${result.data.title} (${result.data.type})`
          : result.data.title;

        // Phase 3.7: Include sanitized query and hash for consistency
        const { sanitizedQuery, queryHash } = sanitizeSearchQuery(session.rawQuery);

        const event: SearchResultSelectedEvent = {
          type: 'search_result_selected',
          rawQuery: session.rawQuery,
          sanitizedQuery, // Phase 3.7: Truncated to 100 chars for safe logging
          queryHash, // Phase 3.7: Hash for deduplication
          selectedId: result.data.id,
          selectedLabel: label,
          selectedKind: result.type,
          selectedType: result.type === 'node' ? result.data.type : undefined,
          selectedRank: selectedRank >= 0 ? selectedRank : 0,
          resultCount: session.resultCount,
          parsed: session.parsed.isLikelyIntent,
          intentPattern,
          timestamp: Date.now(),
        };
        logSearchEvent(event);
      }

      // Phase 5.9: Fire constellation analytics at source (search_result)
      if (result.type === 'node') {
        logNodeSelected(result.data, 'search_result');
      } else {
        // Count nodes in project for analytics
        const nodeCountInProject = nodes.filter(n => n.project_id === result.data.id).length;
        logProjectSelected(result.data, nodeCountInProject, 'search_result');
      }

      // Existing selection logic
      if (result.type === 'node') {
        onNodeSelect(result.data);
      } else {
        onProjectSelect(result.data);
      }
      // Save to recent searches
      saveRecentSearch(query);
      setRecentSearches(getRecentSearches());
      setQuery('');
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onNodeSelect, onProjectSelect, query, flatResults]
  );

  // Handle navigation item selection (pinned or recent)
  const selectNavigationItem = useCallback(
    (item: NavigationItem) => {
      if (item.type === 'node') {
        const node = nodes.find(n => n.id === item.entityId);
        if (node) onNodeSelect(node);
      } else {
        const project = projects.find(p => p.id === item.entityId);
        if (project) onProjectSelect(project);
      }
      setQuery('');
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [nodes, projects, onNodeSelect, onProjectSelect]
  );

  // Handle selection from keyboard (uses highlighted index on flat list)
  const selectFromKeyboard = useCallback(() => {
    if (highlightedIndex >= 0 && flatResults[highlightedIndex]) {
      selectResult(flatResults[highlightedIndex]);
    }
  }, [highlightedIndex, flatResults, selectResult]);

  // Handle keyboard navigation (both search results and recents)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const itemsToNavigate = showRecents ? recentSearches : flatResults;
      if (!isOpen || itemsToNavigate.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev < itemsToNavigate.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0) {
            if (showRecents && recentSearches[highlightedIndex]) {
              // For recent search, just populate the input and search
              setQuery(recentSearches[highlightedIndex]);
              setShowRecents(false);
              setHighlightedIndex(-1);
            } else {
              selectFromKeyboard();
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setShowRecents(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [isOpen, flatResults, recentSearches, showRecents, highlightedIndex, selectFromKeyboard]
  );

  // Close on blur
  const handleBlur = useCallback(() => {
    // Use setTimeout to allow click handlers to fire first
    setTimeout(() => {
      setIsOpen(false);
    }, 100);
  }, []);

  // Fire search_abandoned event when search closes without selection (Phase 3.6)
  // Phase 3.7: Include sanitized query and hash for consistency
  useEffect(() => {
    if (!isOpen && searchSessionRef.current && !searchSessionRef.current.selectedInSession) {
      const session = searchSessionRef.current;
      const intentPattern = deriveIntentPattern(session.parsed);
      const { sanitizedQuery, queryHash } = sanitizeSearchQuery(session.rawQuery);

      const event = {
        type: 'search_abandoned' as const,
        rawQuery: session.rawQuery,
        sanitizedQuery, // Phase 3.7: Truncated to 100 chars for safe logging
        queryHash, // Phase 3.7: Hash for deduplication
        normalizedQuery: session.parsed.searchTerm,
        parsed: session.parsed.isLikelyIntent,
        intentPattern,
        filterType: session.parsed.filterType || null,
        filterEntity: session.parsed.filterEntity || null,
        resultCount: session.resultCount,
        sessionDurationMs: Date.now() - session.openedAt,
        timestamp: Date.now(),
      };
      logSearchEvent(event);
    }

    // Clear session ref when closed
    if (!isOpen) {
      searchSessionRef.current = null;
    }
  }, [isOpen]);

  const getResultLabel = (result: SearchResult): string => {
    const item = result.data;
    if (result.type === 'node') {
      const node = item as GraphNode;
      return `${node.title} (${node.type})`;
    }
    return item.title;
  };

  // Get secondary metadata for result row
  const getResultMetadata = (result: SearchResult): string | null => {
    if (result.type === 'node') {
      const node = result.data as GraphNode;
      // Show first tag if available
      if (node.tags && node.tags.length > 0) {
        return node.tags[0];
      }
      return null;
    } else {
      // For projects, show first line of description (max 60 chars)
      const project = result.data as GraphProject;
      if (project.description) {
        const truncated = project.description.length > 60
          ? project.description.substring(0, 60) + '…'
          : project.description;
        return truncated;
      }
      return null;
    }
  };

  // Render highlighted substring in result label
  const renderHighlightedLabel = (result: SearchResult): React.ReactNode => {
    const label = getResultLabel(result);
    const parts = highlightMatchedSubstring(label, query, result.matchQuality);

    return parts.map((part, i) =>
      part.isMatch ? (
        <mark key={i} className="search-match">
          {part.text}
        </mark>
      ) : (
        <span key={i}>{part.text}</span>
      )
    );
  };

  return (
    <div className="search-ui">
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search nodes or projects..."
          data-search-input="true"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim()) {
              setIsOpen(results.length > 0);
              setShowRecents(false);
            } else {
              // Load navigation items and recent searches from localStorage
              const latestPinned = getPinnedItems();
              const latestRecent = getRecentItems();
              const latestRecents = getRecentSearches();

              setPinnedItems(latestPinned);
              setRecentItems(latestRecent);
              setRecentSearches(latestRecents);

              // Show if any content available
              if (latestPinned.length > 0 || latestRecent.length > 0 || latestRecents.length > 0) {
                setShowRecents(true);
                setIsOpen(true);
                setHighlightedIndex(-1);
              }
            }
          }}
          onBlur={handleBlur}
          aria-label="Search constellation"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={isOpen}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              setShowRecents(false);
            }}
            aria-label="Clear search"
            title="Clear (Ctrl+A, Delete)"
          >
            ×
          </button>
        )}
      </div>

      {/* Search results (grouped by type) */}
      {isOpen && results.length > 0 && !showRecents && (
        <div
          className="search-results"
          id="search-results"
          role="listbox"
        >
          {/* Intent hint (Phase 3.5) */}
          {intentMessage && (
            <div className="search-intent-hint">
              {intentMessage}
            </div>
          )}

          {groupedResults.map((group) => (
            <div key={group.type} className="search-result-group">
              {/* Section header */}
              <div className="search-group-header">
                {group.label}
              </div>
              {/* Group items */}
              {group.items.map((result) => {
                // Calculate flat index for keyboard navigation
                const flatIndex = flatResults.indexOf(result);
                const metadata = getResultMetadata(result);
                return (
                  <button
                    key={`${result.type}-${result.data.id}`}
                    ref={el => { resultRefs.current[flatIndex] = el; }}
                    className={`search-result ${
                      flatIndex === highlightedIndex ? 'highlighted' : ''
                    } search-result-${result.type}`}
                    onClick={() => selectResult(result)}
                    onMouseEnter={() => setHighlightedIndex(flatIndex)}
                    role="option"
                    aria-selected={flatIndex === highlightedIndex}
                  >
                    <div className="search-result-content">
                      <div className="search-result-label">
                        {renderHighlightedLabel(result)}
                      </div>
                      {metadata && (
                        <div className="search-result-metadata">
                          {metadata}
                        </div>
                      )}
                    </div>
                    {result.matchedField !== 'title' && (
                      <span className="search-result-hint">
                        ({result.matchedField})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Recent searches */}
      {isOpen && showRecents && recentSearches.length > 0 && (
        <div className="search-results" id="search-results" role="listbox">
          <div className="search-recents-header">Recent searches</div>
          {recentSearches.map((recentQuery, index) => (
            <button
              key={`recent-${index}`}
              ref={el => { resultRefs.current[index] = el; }}
              className={`search-result search-recent ${
                index === highlightedIndex ? 'highlighted' : ''
              }`}
              onClick={() => {
                setQuery(recentQuery);
                setShowRecents(false);
                setHighlightedIndex(-1);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={index === highlightedIndex}
            >
              <span className="search-result-label">{recentQuery}</span>
            </button>
          ))}
        </div>
      )}

      {/* Pinned and recent navigation items (Phase 3.4) */}
      {isOpen && !query.trim() && showRecents && (pinnedItems.length > 0 || recentItems.length > 0) && (
        <div className="search-results" id="search-results" role="listbox">
          {/* Pinned items section */}
          {pinnedItems.length > 0 && (
            <div className="search-result-group">
              <div className="search-group-header">Pinned</div>
              {pinnedItems.map((item) => (
                <button
                  key={item.id}
                  className="search-result search-navigation-item search-pinned"
                  onClick={() => selectNavigationItem(item)}
                  role="option"
                >
                  <div className="search-result-content">
                    <div className="search-result-label">
                      {item.title}
                      <span className="search-item-type"> ({item.type})</span>
                    </div>
                  </div>
                  <span className="search-pin-icon">📌</span>
                </button>
              ))}
            </div>
          )}

          {/* Recent items section */}
          {recentItems.length > 0 && (
            <div className="search-result-group">
              <div className="search-group-header">Recent</div>
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  className="search-result search-navigation-item search-recent-item"
                  onClick={() => selectNavigationItem(item)}
                  role="option"
                >
                  <div className="search-result-content">
                    <div className="search-result-label">
                      {item.title}
                      <span className="search-item-type"> ({item.type})</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state with guidance */}
      {query.trim() && results.length === 0 && isOpen && (
        <div className="search-no-results">
          <div className="search-no-results-title">
            No results for "{query}"
          </div>
          <div className="search-no-results-hint">
            Try a project name, node label, or shorter keyword
          </div>
        </div>
      )}
    </div>
  );
};

export const SearchUI = forwardRef<SearchUIHandle, SearchUIProps>(SearchUIComponent);
