/**
 * CONSTELLATIONCANVAS.TSX
 * Page shell for constellation graph visualization
 * Phase 2.2: Loading, error, and empty states
 * Phase 5.6: Answer evidence → camera focus + cited highlighting
 */

import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useGraphData } from '../hooks/useGraphData';
import { useURLSelection } from '../hooks/useURLSelection';
import { useNavigationMemory } from '../hooks/useNavigationMemory';
import { useGraphSemantics } from '../hooks/useGraphSemantics';
// import { useD3Force } from '../hooks/useD3Force'; // Phase 8.0: D3 shelved, moved to dormant state
import { transformGraphToRenderable, logGraphDiagnostics } from '../lib/graph/graphTransforms';
import { computeHighlightState, CitedState } from '../lib/graph/highlighting';
import { computeFocusTarget, animateCamera } from '../lib/graph/cameraFocus';
import { CanvasScene } from '../components/constellation/CanvasScene';
import { SelectionPanel } from '../components/constellation/SelectionPanel';
import { SearchUI, SearchUIHandle } from '../components/constellation/SearchUI';
import { AskTheGraphPanel } from '../components/constellation/AskTheGraphPanel';
import { SemanticFilters } from '../components/constellation/SemanticFilters';
import { LayoutModeSelector } from '../components/constellation/LayoutModeSelector';
import { DemoControls } from '../components/constellation/DemoControls';
import { HeroItem, findProjectItems, findNearestProject } from '../lib/graph/heroItems';
import {
  logSemanticFilterToggled,
  logSemanticFiltersCleared,
  countActiveFilters,
} from '../lib/analytics/constellationAnalytics';
import './ConstellationCanvas.css';

export const ConstellationCanvas: React.FC = () => {
  const { data, loading, error } = useGraphData();
  const [unresolvedEdgesCount, setUnresolvedEdgesCount] = useState(0);
  const searchUIRef = useRef<SearchUIHandle>(null);
  const cameraControlsRef = useRef<any>(null); // Reference to OrbitControls for camera animation
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const [citedState, setCitedState] = useState<CitedState>({ citedNodeIds: new Set(), citedProjectIds: new Set(), citedEdgeIds: new Set() });

  // Phase B: Demo mode environment flag for constellation-first UI
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  // Phase 3: Canvas dimensions for SelectionPanel positioning (remove DOM coupling)
  const [canvasWidth, setCanvasWidth] = useState<number | undefined>(undefined);
  const [canvasHeight, setCanvasHeight] = useState<number | undefined>(undefined);

  // Phase 3: Extract canvas dimensions to pass to SelectionPanel (pure props, no DOM coupling)
  useEffect(() => {
    const updateCanvasDimensions = () => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        setCanvasWidth(canvas.clientWidth);
        setCanvasHeight(canvas.clientHeight);
      } else {
        // Fallback to window dimensions if canvas not found
        setCanvasWidth(window.innerWidth);
        setCanvasHeight(window.innerHeight);
      }
    };

    // Initial dimension capture
    updateCanvasDimensions();

    // Listen for window resize to update dimensions
    window.addEventListener('resize', updateCanvasDimensions);

    // Cleanup: remove event listener on unmount
    return () => {
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, []);

  const { selectedItem, selectNode, selectProject, clearSelection } = useURLSelection({
    nodes: data?.nodes ?? null,
    projects: data?.projects ?? null,
  });

  // Auto-save selected items to recent navigation (Phase 3.4)
  useNavigationMemory({ selectedItem });

  // Phase 8.0: D3 shelved from active demo path (force API/Curated layout only)
  // D3 experimental mode remains dormant; hard-coded to 'api' for deterministic demo framing
  const layoutEngine = 'api' as const;

  // Phase 8.0: Panels hidden by default in demo mode (can be toggled by interaction)
  const [showSemanticFilters] = useState(false);

  // Phase D: Demo narrative control
  const [canonicalFraming, setCanonicalFraming] = useState<{
    position: THREE.Vector3;
    target: THREE.Vector3;
    zoom: number;
  } | null>(null);
  const activeAnimationCleanupRef = useRef<(() => void) | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // Phase D: Readiness flags for canonical framing capture (prevents circular dependency)
  const [controlsReady, setControlsReady] = useState(false);

  // Phase 3.3: Project focus controls - project cycling
  const [availableProjects, setAvailableProjects] = useState<HeroItem[]>([]);
  const [projectIndex, setProjectIndex] = useState(0);

  // Phase D: Expose OrbitControls from GraphCamera via callback
  const handleControlsReady = React.useCallback((controls: any) => {
    cameraControlsRef.current = controls;
    setControlsReady(true); // Signal that controls are ready
  }, []);

  // Phase D: Capture canonical framing once both camera and controls are ready
  useEffect(() => {
    // Readiness gate: only attempt capture if both systems are ready
    if (!controlsReady || canonicalFraming) {
      console.log('[CAPTURE_EFFECT] early return: controlsReady=', controlsReady, 'already captured=', !!canonicalFraming);
      return; // Skip if not ready or already captured
    }

    // Runtime null checks: ensure refs are populated before accessing properties
    if (!cameraRef.current?.position || !cameraControlsRef.current?.target) {
      console.log('[CAPTURE_EFFECT] refs not fully initialized: camera.position=', !!cameraRef.current?.position, 'controls.target=', !!cameraControlsRef.current?.target);
      return;
    }

    // Capture live camera state: position, controls target, and zoom
    const capturedFraming = {
      position: cameraRef.current.position.clone(),
      target: cameraControlsRef.current.target.clone(),
      zoom: (cameraRef.current as any).zoom,
    };

    console.log('[CAPTURE_EFFECT] capturing canonical framing:', capturedFraming);
    setCanonicalFraming(capturedFraming);
    console.log('[ConstellationCanvas] Captured canonical demo framing:', capturedFraming);
  }, [controlsReady, canonicalFraming]); // FIXED: Updated dependency array

  // Phase D: Reset to captured canonical framing
  const handleResetFrame = React.useCallback(() => {
    console.log('[RESET_FRAME] handler called at', new Date().toISOString());
    console.log('[RESET_FRAME] canonicalFraming:', canonicalFraming);
    console.log('[RESET_FRAME] cameraRef.current:', cameraRef.current);
    console.log('[RESET_FRAME] cameraControlsRef.current:', cameraControlsRef.current);
    console.log('[RESET_FRAME] isAnimatingRef.current (before):', isAnimatingRef.current);

    if (!canonicalFraming || !cameraRef.current || !cameraControlsRef.current) {
      console.log('[RESET_FRAME] early return triggered');
      return;
    }

    // Cancel any active animation
    if (activeAnimationCleanupRef.current) {
      activeAnimationCleanupRef.current();
      activeAnimationCleanupRef.current = null;
    }

    // Mark animation as active
    isAnimatingRef.current = true;

    // Animate back to canonical framing
    console.log('[RESET_FRAME] target position:', canonicalFraming.position);
    console.log('[RESET_FRAME] target target:', canonicalFraming.target);
    console.log('[RESET_FRAME] target zoom:', canonicalFraming.zoom);
    console.log('[RESET_FRAME] animateCamera about to run');
    const cleanup = animateCamera(
      cameraRef.current,
      cameraControlsRef.current,
      canonicalFraming.position.toArray() as [number, number, number],
      canonicalFraming.target.toArray() as [number, number, number],
      500
    );

    // Wrap cleanup to clear animation flag and recapture canonical framing
    activeAnimationCleanupRef.current = () => {
      isAnimatingRef.current = false;
      cleanup();

      // Recapture canonical framing after reset animation completes
      if (cameraRef.current?.position && cameraControlsRef.current?.target) {
        const newCanonical = {
          position: cameraRef.current.position.clone(),
          target: cameraControlsRef.current.target.clone(),
          zoom: (cameraRef.current as any).zoom,
        };
        setCanonicalFraming(newCanonical);
        console.log('[RESET_FRAME] Recaptured canonical framing after animation:', newCanonical);
      }
    };
    console.log('[ConstellationCanvas] Reset to canonical framing');
  }, [canonicalFraming]);

  // Phase D: Cancel active animation on gesture (user pan/zoom/click)
  const handleCancelAnimation = React.useCallback(() => {
    if (activeAnimationCleanupRef.current) {
      activeAnimationCleanupRef.current();
      activeAnimationCleanupRef.current = null;
    }
  }, []);

  // Transform data to renderable format
  const renderableGraph = React.useMemo(() => {
    if (!data) return null;

    const graph = transformGraphToRenderable(data);

    // Compute available projects for cycling (Phase 3.3)
    const projects = findProjectItems(graph);
    setAvailableProjects(projects);
    setProjectIndex(0); // Reset index when graph changes

    // Log diagnostics in development
    if (typeof window !== 'undefined' && (window as any).__DEV__) {
      logGraphDiagnostics(graph);
    }

    return graph;
  }, [data]);

  // Phase 3.3: Focus on nearest project with adaptive zoom
  // MUST be defined AFTER renderableGraph (used in dependency array)
  const handleFocusProject = React.useCallback(() => {
    if (!renderableGraph || !cameraRef.current || !cameraControlsRef.current) {
      return;
    }

    // Find project closest to current screen center
    // Screen center in 2D: calculate from camera and controls target
    const screenCenterPos: [number, number] = [
      cameraControlsRef.current.target.x,
      cameraControlsRef.current.target.y
    ];

    const project = findNearestProject(renderableGraph, screenCenterPos);
    if (!project) {
      console.log('[ConstellationCanvas] No project found');
      return;
    }

    // Resolve project to renderable entity with position property
    const projectEntity = renderableGraph.projects.find(p => p.id === project.id);

    if (!projectEntity?.position) {
      console.log('[ConstellationCanvas] Project entity position not found');
      return;
    }

    // Cancel any active animation
    if (activeAnimationCleanupRef.current) {
      activeAnimationCleanupRef.current();
      activeAnimationCleanupRef.current = null;
    }

    // Mark animation as active
    isAnimatingRef.current = true;

    // Compute adaptive focus target relative to current camera state
    const projectPosition = new THREE.Vector3(projectEntity.position[0], projectEntity.position[1], 0);
    const { targetPosition, targetLookAt } = computeFocusTarget(
      [projectPosition],
      cameraRef.current.position.z
    );

    // Animate to project
    const cleanup = animateCamera(
      cameraRef.current,
      cameraControlsRef.current,
      targetPosition,
      targetLookAt,
      500
    );

    // Wrap cleanup to clear animation flag
    activeAnimationCleanupRef.current = () => {
      isAnimatingRef.current = false;
      cleanup();
    };
    console.log('[ConstellationCanvas] Focus project:', project.id);
  }, [renderableGraph]);

  // Phase 3.3: Cycle to next project
  const handleNextProject = React.useCallback(() => {
    if (availableProjects.length === 0) return;

    // Advance to next project
    const nextIndex = (projectIndex + 1) % availableProjects.length;
    setProjectIndex(nextIndex);

    // Immediately focus the next project
    if (!renderableGraph || !cameraRef.current || !cameraControlsRef.current) {
      return;
    }

    const nextProject = availableProjects[nextIndex];
    if (!nextProject) {
      console.log('[ConstellationCanvas] No next project found');
      return;
    }

    // Resolve project to renderable entity with position property
    const projectEntity = renderableGraph.projects.find(p => p.id === nextProject.id);

    if (!projectEntity?.position) {
      console.log('[ConstellationCanvas] Next project entity position not found');
      return;
    }

    // Cancel any active animation
    if (activeAnimationCleanupRef.current) {
      activeAnimationCleanupRef.current();
      activeAnimationCleanupRef.current = null;
    }

    // Mark animation as active
    isAnimatingRef.current = true;

    // Compute adaptive focus target relative to current camera state
    const projectPosition = new THREE.Vector3(projectEntity.position[0], projectEntity.position[1], 0);
    const { targetPosition, targetLookAt } = computeFocusTarget(
      [projectPosition],
      cameraRef.current.position.z
    );

    // Animate to next project
    const cleanup = animateCamera(
      cameraRef.current,
      cameraControlsRef.current,
      targetPosition,
      targetLookAt,
      500
    );

    // Wrap cleanup to clear animation flag
    activeAnimationCleanupRef.current = () => {
      isAnimatingRef.current = false;
      cleanup();
    };
    console.log('[ConstellationCanvas] Focus next project:', nextProject.id);
  }, [availableProjects, projectIndex, renderableGraph]);

  // Semantic graph navigation (Phase 5.5)
  const {
    filters: semanticFilters,
    visibility: semanticVisibility,
    setSubgraphNode,
    setProjectCluster,
    clearAllFilters,
    toggleNodeType,
    toggleTag,
    toggleRelationshipType,
    clearTypeFilters,
    setGravityThreshold,
    getAvailableTags,
    getAvailableRelationshipTypes,
  } = useGraphSemantics({
    graph: renderableGraph,
    edges: data?.edges ?? [],
  });

  // Phase 8.0: D3 SHELVED (moved to dormant state)
  // D3 layout hook and positions are no longer computed in the active runtime path
  // Phase 5.9: Wrapper handlers for semantic filter analytics
  const handleToggleNodeType = React.useCallback((type: string) => {
    const wasEnabled = semanticFilters.enabledNodeTypes?.has(type) ?? false;
    toggleNodeType(type);
    // Fire after state updates
    const activeCount = countActiveFilters({
      ...semanticFilters,
      enabledNodeTypes: wasEnabled
        ? new Set([...(semanticFilters.enabledNodeTypes || [])].filter(t => t !== type))
        : new Set([...(semanticFilters.enabledNodeTypes || []), type]),
    });
    logSemanticFilterToggled('node_type', type, !wasEnabled, activeCount);
  }, [semanticFilters]);

  const handleToggleTag = React.useCallback((tag: string) => {
    const wasEnabled = semanticFilters.enabledTags?.has(tag) ?? false;
    toggleTag(tag);
    const activeCount = countActiveFilters({
      ...semanticFilters,
      enabledTags: wasEnabled
        ? new Set([...(semanticFilters.enabledTags || [])].filter(t => t !== tag))
        : new Set([...(semanticFilters.enabledTags || []), tag]),
    });
    logSemanticFilterToggled('tag', tag, !wasEnabled, activeCount);
  }, [semanticFilters]);

  const handleToggleRelationshipType = React.useCallback((relType: string) => {
    const wasEnabled = semanticFilters.enabledRelationshipTypes?.has(relType) ?? false;
    toggleRelationshipType(relType);
    const activeCount = countActiveFilters({
      ...semanticFilters,
      enabledRelationshipTypes: wasEnabled
        ? new Set([...(semanticFilters.enabledRelationshipTypes || [])].filter(t => t !== relType))
        : new Set([...(semanticFilters.enabledRelationshipTypes || []), relType]),
    });
    logSemanticFilterToggled('relationship_type', relType, !wasEnabled, activeCount);
  }, [semanticFilters]);

  const handleClearAllFilters = React.useCallback(() => {
    const currentCount = countActiveFilters(semanticFilters);
    logSemanticFiltersCleared(currentCount);
    clearAllFilters();
  }, [semanticFilters]);

  // Phase 6.1: Layout mode change handler with analytics
  // Phase 8.0: Layout mode selection shelved (D3 experimental remains dormant)
  // handleLayoutModeChange removed; layoutEngine is hard-coded to 'api'
  // Analytics event imports (logLayoutModeChanged, etc.) remain dormant for Phase 7.0 resurrection

  // Track if this is initial mount (restoration from URL) vs user-driven selection
  const isInitialMount = useRef(true);

  // Phase 2: Track previous selected item to detect deselection (transition selected → null)
  const previousSelectedItemRef = useRef<typeof selectedItem>(null);

  // STEP_1_1 INSTRUMENTATION: Mount log
  useEffect(() => {
    console.log('[STEP_1_1] ConstellationCanvas instrumentation mounted at', new Date().toISOString());
    console.trace('[STEP_1_1] ConstellationCanvas mount stack trace');
  }, []);

  // STEP_1_1 INSTRUMENTATION: selectedItem transition monitor (UNCONDITIONAL, logs every run)
  useEffect(() => {
    const prev = previousSelectedItemRef.current;
    const now = selectedItem;

    console.log('[STEP_1_1] selectedItem effect running (UNCONDITIONAL)', {
      prevId: prev?.data.id ?? null,
      prevType: prev?.type ?? null,
      nowId: now?.data.id ?? null,
      nowType: now?.type ?? null,
      url: window.location.search,
      timestamp: new Date().toISOString(),
      idChanged: prev?.data.id !== now?.data.id,
    });
    console.trace('[STEP_1_1] selectedItem effect stack trace');

    previousSelectedItemRef.current = selectedItem;
  }, [selectedItem]);

  // STEP 1 INSTRUMENTATION: handleClearSelection wrapper with trace
  const handleClearSelection = React.useCallback(() => {
    console.trace('[STEP_1_INSTRUMENTATION] clearSelection called from:', {
      url: window.location.search,
      timestamp: new Date().toISOString(),
      previousSelection: previousSelectedItemRef.current?.data.id ?? null,
    });
    clearSelection();
  }, [clearSelection]);

  // Phase 3.4: Auto-focus camera on selection with smart framing
  // Watches selectedItem and triggers smooth camera animation to focus on selected entity + connected entities
  useEffect(() => {
    if (!selectedItem || !renderableGraph || !data || !cameraRef.current || !cameraControlsRef.current) {
      return;
    }

    // Cancel any active animation before starting new one
    if (activeAnimationCleanupRef.current) {
      activeAnimationCleanupRef.current();
      activeAnimationCleanupRef.current = null;
    }

    // Mark animation as active
    isAnimatingRef.current = true;

    // Phase 3.4: Build framing positions (selected entity + connected entities)
    // For nodes: include connected projects
    // For projects: include high-signal nodes
    const framingPositions: THREE.Vector3[] = [];

    if (selectedItem.type === 'node') {
      const selectedNode = renderableGraph.nodes.find(n => n.id === selectedItem.data.id);
      if (selectedNode) {
        framingPositions.push(new THREE.Vector3(selectedNode.x, selectedNode.y, 0));

        // Find and add connected projects
        const connectedProjectIds = new Set<string>();
        for (const edge of data.edges) {
          let connectedNodeId: string | null = null;

          if (edge.source_id === selectedNode.id) {
            connectedNodeId = edge.target_id;
          }
          if (edge.target_id === selectedNode.id) {
            connectedNodeId = edge.source_id;
          }

          if (connectedNodeId) {
            const connectedNode = renderableGraph.nodes.find(n => n.id === connectedNodeId);
            if (connectedNode && connectedNode.project_id) {
              connectedProjectIds.add(connectedNode.project_id);
            }
          }
        }

        for (const project of renderableGraph.projects) {
          if (connectedProjectIds.has(project.id)) {
            framingPositions.push(new THREE.Vector3(project.x_derived, project.y_derived, 0));
          }
        }
      }
    } else {
      // Project selection
      const selectedProject = renderableGraph.projects.find(p => p.id === selectedItem.data.id);
      if (selectedProject) {
        framingPositions.push(new THREE.Vector3(selectedProject.x_derived, selectedProject.y_derived, 0));

        // Add high-signal nodes in this project (up to 3)
        const projectNodes = renderableGraph.nodes
          .filter(n => n.project_id === selectedProject.id)
          .sort((a, b) => (b.gravity_score || 0) - (a.gravity_score || 0))
          .slice(0, 3);

        for (const node of projectNodes) {
          framingPositions.push(new THREE.Vector3(node.position[0], node.position[1], 0));
        }
      }
    }

    // If no positions found, abort
    if (framingPositions.length === 0) {
      console.log('[ConstellationCanvas] No positions to frame for selection:', selectedItem.data.id);
      return;
    }

    // Compute camera target from framing positions (single or multi-entity)
    const { targetPosition, targetLookAt } = computeFocusTarget(
      framingPositions,
      cameraRef.current.position.z
    );

    // Animate to selected entity (with connected context)
    const cleanup = animateCamera(
      cameraRef.current,
      cameraControlsRef.current,
      targetPosition,
      targetLookAt,
      500
    );

    // Wrap cleanup to clear animation flag
    activeAnimationCleanupRef.current = () => {
      isAnimatingRef.current = false;
      cleanup();
    };

    console.log('[ConstellationCanvas] Auto-focus on selection (Phase 3.4 framing):', {
      selectedId: selectedItem.data.id,
      type: selectedItem.type,
      framingCount: framingPositions.length,
    });
  }, [selectedItem?.data.id, selectedItem?.type, renderableGraph, data]);

  // Phase 2: Reset camera on deselection (transition from selected → null)
  // Guard: Only fire on actual deselection, not on initial mount or URL hydration
  useEffect(() => {
    const prev = previousSelectedItemRef.current;
    const justDeselected = prev && !selectedItem;

    console.log('[ConstellationCanvas] DESELECTION_EFFECT_RUN', {
      prev: prev?.data.id,
      now: selectedItem?.data.id,
      justDeselected,
      hasCanonicalFraming: !!canonicalFraming,
    });

    // Guard conditions: transition detected, canonical framing exists, refs ready
    if (justDeselected && canonicalFraming && cameraRef.current && cameraControlsRef.current) {
      console.log('[ConstellationCanvas] Deselection detected, resetting camera to canonical framing');

      // Cancel any active animation
      if (activeAnimationCleanupRef.current) {
        activeAnimationCleanupRef.current();
        activeAnimationCleanupRef.current = null;
      }

      // Mark animation as active
      isAnimatingRef.current = true;

      // Animate back to canonical framing
      const cleanup = animateCamera(
        cameraRef.current,
        cameraControlsRef.current,
        canonicalFraming.position.toArray() as [number, number, number],
        canonicalFraming.target.toArray() as [number, number, number],
        500
      );

      // Wrap cleanup to clear animation flag
      activeAnimationCleanupRef.current = () => {
        isAnimatingRef.current = false;
        cleanup();
      };

      console.log('[ConstellationCanvas] Camera reset animation started');
    }

    // Update ref for next effect run
    previousSelectedItemRef.current = selectedItem;
  }, [selectedItem, canonicalFraming]);

  // When a node is selected on canvas, optionally auto-enable subgraph mode
  // BUT: Only do this for user-driven selections, not URL restoration on mount
  // FIX (DEMO LOCK BUG #1): Clear subgraph when selectedItem is cleared (deselection)
  useEffect(() => {
    console.log('[ConstellationCanvas] AUTO_ENABLE_SUBGRAPH_EFFECT_RUN', {
      isInitialMount: isInitialMount.current,
      selectedItemType: selectedItem?.type,
      selectedItemId: selectedItem?.data.id,
      currentSemanticFilters: {
        subgraphNodeId: semanticFilters.subgraphNodeId,
        projectClusterId: semanticFilters.projectClusterId,
      },
    });

    if (isInitialMount.current) {
      isInitialMount.current = false;
      console.log('[ConstellationCanvas] AUTO_ENABLE_SUBGRAPH_EFFECT_SKIP (initial mount)');
      return; // Skip auto-subgraph on initial URL restoration
    }

    if (selectedItem?.type === 'node') {
      // Auto-set subgraph mode when selecting a node (1 hop default)
      // BUT: Don't override project-cluster mode — respect user's intentional filter
      if (!semanticFilters.projectClusterId) {
        console.log('[ConstellationCanvas] AUTO_ENABLE_SUBGRAPH_EFFECT_CALLING_SETSUBGRAPHNODE', {
          nodeId: selectedItem.data.id,
          hops: 1,
        });
        setSubgraphNode(selectedItem.data.id, 1);
      } else {
        console.log('[ConstellationCanvas] AUTO_ENABLE_SUBGRAPH_EFFECT_SKIPPED (project cluster active)', {
          projectClusterId: semanticFilters.projectClusterId,
        });
      }
    } else if (!selectedItem) {
      // FIX (DEMO LOCK BUG #1): When deselecting, clear the subgraph filter so nodes reappear
      console.log('[ConstellationCanvas] AUTO_ENABLE_SUBGRAPH_EFFECT_CLEARING (deselection)');
      setSubgraphNode(undefined);
      clearAllFilters();
    } else {
      console.log('[ConstellationCanvas] AUTO_ENABLE_SUBGRAPH_EFFECT_SKIPPED (not a node selection)', {
        selectedItemType: selectedItem?.type,
      });
    }
  }, [selectedItem?.data.id, selectedItem?.type, setSubgraphNode]);

  // Compute highlight state for selected item (Phase 2.4)
  const highlightState = React.useMemo(() => {
    if (!renderableGraph || !data) return undefined;
    const selectedId = selectedItem?.data.id ?? null;
    return computeHighlightState(renderableGraph, data.edges, selectedId);
  }, [renderableGraph, data, selectedItem]);

  // Phase 5.6: Handle evidence focus callback from AskTheGraphPanel
  const handleEvidenceFocus = React.useCallback(
    (nodeIds: string[], projectIds: string[]) => {
      if (!renderableGraph) return;

      // Update cited state for highlighting
      setCitedState({
        citedNodeIds: new Set(nodeIds),
        citedProjectIds: new Set(projectIds),
        citedEdgeIds: new Set(), // Can enhance in Phase 5.7 to include connecting edges
      });

      // Compute camera focus target
      const positions: THREE.Vector3[] = [];

      // Add positions for cited nodes
      for (const nodeId of nodeIds) {
        const node = renderableGraph.nodes.find(n => n.id === nodeId);
        if (node) {
          positions.push(new THREE.Vector3(node.position[0], node.position[1], 0));
        }
      }

      // Add positions for cited projects
      for (const projectId of projectIds) {
        const project = renderableGraph.projects.find(p => p.id === projectId);
        if (project) {
          positions.push(new THREE.Vector3(project.position[0], project.position[1], 0));
        }
      }

      // If we have entities to focus on, animate camera
      if (positions.length > 0 && cameraRef.current && cameraControlsRef.current) {
        const { targetPosition, targetLookAt } = computeFocusTarget(positions, cameraRef.current.position.z);
        const cleanup = animateCamera(cameraRef.current, cameraControlsRef.current, targetPosition, targetLookAt, 500);

        // Cleanup animation on unmount or new focus call
        return cleanup;
      }
    },
    [renderableGraph]
  );

  // Global Cmd+K / Ctrl+K keyboard shortcut (Phase 3.2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (macOS) or Ctrl+K (Windows/Linux)
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const isSearchShortcut = isMac ? e.metaKey && e.key === 'k' : e.ctrlKey && e.key === 'k';

      if (!isSearchShortcut) return;

      // Block if typing in non-search input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const isSearchInput = target instanceof HTMLInputElement && target.getAttribute('data-search-input') === 'true';
      const isOtherEditableField =
        (target instanceof HTMLInputElement && !isSearchInput) ||
        target instanceof HTMLTextAreaElement ||
        (target.contentEditable === 'true' && !isSearchInput);

      if (isOtherEditableField) {
        return;
      }

      // Prevent default browser behavior (browser's search in some cases)
      e.preventDefault();

      // Focus search input
      searchUIRef.current?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="constellation-container constellation-state">
        <div className="state-content">
          <div className="spinner"></div>
          <h2>Loading Constellation Canvas...</h2>
          <p>Fetching graph from API</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="constellation-container constellation-state">
        <div className="state-content error">
          <h2>Error Loading Graph</h2>
          <p className="error-message">{error.message}</p>
          <pre className="error-stack">{error.stack}</pre>
          <button
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!renderableGraph || (renderableGraph.nodes.length === 0 && renderableGraph.projects.length === 0)) {
    return (
      <div className="constellation-container constellation-state">
        <div className="state-content">
          <h2>No Graph Data</h2>
          <p>The graph contains no nodes or projects to display.</p>
        </div>
      </div>
    );
  }

  // Render canvas
  return (
    <div className="constellation-container">
      <SearchUI
        ref={searchUIRef}
        nodes={data?.nodes ?? []}
        projects={data?.projects ?? []}
        onNodeSelect={selectNode}
        onProjectSelect={selectProject}
        demoMode={demoMode}
      />

      {/* Phase 8.0: Layout toggle hidden in demo mode (D3 remains experimental, never default) */}
      {false && (
        <LayoutModeSelector
          layoutEngine={layoutEngine}
          onLayoutModeChange={() => {}}
        />
      )}

      {/* Phase 3.3: Project focus controls visible only in demo mode */}
      {demoMode && (
        <DemoControls
          onResetFrame={() => {
            console.log('[RESET_FRAME_BUTTON] clicked at', new Date().toISOString());
            handleResetFrame();
          }}
          onFocusProject={handleFocusProject}
          onNextProject={handleNextProject}
        />
      )}

      {/* Phase 8.0: Semantic filters hidden by default (collapsible, enable when needed) */}
      {showSemanticFilters && (
        <SemanticFilters
          graph={renderableGraph}
          filters={semanticFilters}
          onSetSubgraphNode={setSubgraphNode}
          onSetProjectCluster={setProjectCluster}
          onToggleNodeType={handleToggleNodeType}
          onToggleTag={handleToggleTag}
          onToggleRelationshipType={handleToggleRelationshipType}
          onClearTypeFilters={clearTypeFilters}
          onSetGravityThreshold={setGravityThreshold}
          onClearAll={handleClearAllFilters}
          getAvailableTags={getAvailableTags}
          getAvailableRelationshipTypes={getAvailableRelationshipTypes}
        />
      )}

      <CanvasScene
        graph={renderableGraph}
        onUnresolvedEdgesChange={setUnresolvedEdgesCount}
        onNodeClick={selectNode}
        onProjectClick={selectProject}
        onCanvasClick={handleClearSelection}
        highlightState={highlightState}
        semanticVisibility={semanticVisibility}
        selectedNodeId={selectedItem?.type === 'node' ? selectedItem.data.id : undefined}
        selectedProjectId={selectedItem?.type === 'project' ? selectedItem.data.id : undefined}
        citedState={citedState}
        cameraRef={cameraRef}
        controlsRef={cameraControlsRef}
        onControlsReady={handleControlsReady}
        isAnimatingRef={isAnimatingRef}
        onCancelAnimation={handleCancelAnimation}
      />

      <SelectionPanel
        selectedItem={selectedItem}
        onClose={handleClearSelection}
        cameraRef={cameraRef}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />

      <AskTheGraphPanel
        nodes={data?.nodes ?? []}
        projects={data?.projects ?? []}
        edges={data?.edges ?? []}
        onNodeSelect={selectNode}
        onProjectSelect={selectProject}
        onEvidenceFocus={handleEvidenceFocus}
      />

      {/* Dev diagnostics overlay */}
      {typeof window !== 'undefined' && (window as any).__DEV__ && (
        <div className="constellation-diagnostics">
          <div className="diagnostics-panel">
            <h3>Graph Stats</h3>
            <ul>
              <li>Nodes: {renderableGraph.nodes.length}</li>
              <li>Projects: {renderableGraph.projects.length}</li>
              <li>Edges: {renderableGraph.edges.length}</li>
              <li>Unresolved: {unresolvedEdgesCount}</li>
              <li>Cited: {citedState.citedNodeIds.size + citedState.citedProjectIds.size}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
