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
import { computeFocusTarget, animateCamera, buildFramingPositions } from '../lib/graph/cameraFocus';
import { CanvasScene } from '../components/constellation/CanvasScene';
import { SelectionPanel } from '../components/constellation/SelectionPanel';
import { CSS3DPanelAnchor } from '../components/constellation/CSS3DPanelAnchor';
import { SearchUI, SearchUIHandle } from '../components/constellation/SearchUI';
import { AskTheGraphPanel } from '../components/constellation/AskTheGraphPanel';
import { SemanticFilters } from '../components/constellation/SemanticFilters';
import { LayoutModeSelector } from '../components/constellation/LayoutModeSelector';
import { DemoControls } from '../components/constellation/DemoControls';
import { ResetFrameButton } from '../components/constellation/ResetFrameButton';
import { HeroItem, findProjectItems, findNearestProject } from '../lib/graph/heroItems';
import { isEditableElement } from '../lib/keyboard/editableElementDetection';
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
  const [hoveredEvidenceNodeId, setHoveredEvidenceNodeId] = useState<string | null>(null);

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

  // Phase 3 (Current Session): Side panel state separated from selectedItem
  // Billboard visibility is controlled by selectedItem presence (canvas click deselect disabled)
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  // Phase 8.0: D3 shelved from active demo path (force API/Curated layout only)
  // D3 experimental mode remains dormant; hard-coded to 'api' for deterministic demo framing
  const layoutEngine = 'api' as const;

  // Phase 8.0: Panels hidden by default in demo mode (can be toggled by interaction)
  const [showSemanticFilters] = useState(false);

  // Phase D: Demo narrative control
  // FIXED: canonicalFraming is now a ref to avoid callback dependency changes
  // This prevents early returns from stale closures and race conditions
  const canonicalFramingRef = useRef<{
    position: THREE.Vector3;
    target: THREE.Vector3;
    zoom: number;
  } | null>(null);
  const activeAnimationCleanupRef = useRef<(() => void) | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // Phase D: Readiness flags for canonical framing capture (prevents circular dependency)
  const [controlsReady, setControlsReady] = useState(false);

  // Phase 4C: Gesture cancellation — stop animation when user interacts with controls
  useEffect(() => {
    if (!cameraControlsRef.current || !controlsReady) {
      return;
    }

    const controls = cameraControlsRef.current;

    // Handler: Cancel animation on user gesture (pointer, wheel, pan)
    const handleControlsChange = () => {
      if (isAnimatingRef.current && activeAnimationCleanupRef.current) {
        console.log('[ConstellationCanvas] User gesture detected, cancelling camera animation');
        activeAnimationCleanupRef.current();
        activeAnimationCleanupRef.current = null;
        isAnimatingRef.current = false;
        // Note: Do NOT clear selectedItem or close billboard — just stop animation
      }
    };

    // Attach listener to controls change event (fires on pointer down, wheel, pan)
    controls.addEventListener('change', handleControlsChange);

    // Cleanup: remove listener on unmount or controls reset
    return () => {
      controls.removeEventListener('change', handleControlsChange);
    };
  }, [controlsReady]);

  // Phase 3.3: Project focus controls - project cycling
  const [availableProjects, setAvailableProjects] = useState<HeroItem[]>([]);
  const [projectIndex, setProjectIndex] = useState(0);

  // Phase D: Expose OrbitControls from GraphCamera via callback
  const handleControlsReady = React.useCallback((controls: any) => {
    cameraControlsRef.current = controls;
    setControlsReady(true); // Signal that controls are ready
  }, []);

  // Phase D: Capture canonical framing once both camera and controls are ready
  // FIXED: Uses ref to avoid callback dependency changes
  useEffect(() => {
    // Readiness gate: only attempt capture if controls ready and not already captured
    if (!controlsReady || canonicalFramingRef.current) {
      return; // Skip if not ready or already captured
    }

    // Runtime null checks: ensure refs are populated before accessing properties
    if (!cameraRef.current?.position || !cameraControlsRef.current?.target) {
      return;
    }

    // Capture live camera state: position, controls target, and zoom
    const capturedFraming = {
      position: cameraRef.current.position.clone(),
      target: cameraControlsRef.current.target.clone(),
      zoom: (cameraRef.current as any).zoom,
    };

    canonicalFramingRef.current = capturedFraming;
  }, [controlsReady]); // FIXED: Only depends on controlsReady, not canonicalFraming

  // Phase 3 (Current Session): Explicit billboard close handler
  // Closes side panel and clears selection (which removes billboard by removing selectedItem)
  const handleCloseBillboard = React.useCallback(() => {
    console.log('[INSTRUMENT] Billboard close triggered');
    setSidePanelOpen(false);
    clearSelection();
  }, [clearSelection]);

  // Phase D: Cancel active animation on gesture (user pan/zoom/click)
  const handleCancelAnimation = React.useCallback(() => {
    if (activeAnimationCleanupRef.current) {
      activeAnimationCleanupRef.current();
      activeAnimationCleanupRef.current = null;
    }
  }, []);

  // Phase 5.4: Evidence card hover state handlers
  const handleEvidenceHover = React.useCallback((nodeId: string) => {
    setHoveredEvidenceNodeId(nodeId);
  }, []);

  const handleEvidenceLeave = React.useCallback(() => {
    setHoveredEvidenceNodeId(null);
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

  // ROBUST RESET: Compute fallback frame from graph bounds if canonical is missing
  // Used when canonical capture was delayed/skipped but reset is needed
  const computeGraphBoundsFrame = React.useCallback((): {
    position: THREE.Vector3;
    target: THREE.Vector3;
    zoom: number;
  } | null => {
    if (!renderableGraph || !cameraRef.current) return null;

    const allPositions = [
      ...renderableGraph.nodes.map(n => new THREE.Vector3(n.position[0], n.position[1], 0)),
      ...renderableGraph.projects.map(p => new THREE.Vector3(p.position[0], p.position[1], 0)),
    ];

    if (allPositions.length === 0) return null;

    // Compute centroid and bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const pos of allPositions) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const width = maxX - minX;
    const height = maxY - minY;
    const maxDim = Math.max(width, height, 1);
    const padding = maxDim * 0.2;
    const requiredDim = maxDim + padding * 2;
    const zoom = Math.max(1.0, requiredDim / 100);
    const z = 50 * zoom;

    return {
      position: new THREE.Vector3(centerX, centerY, z),
      target: new THREE.Vector3(centerX, centerY, 0),
      zoom: zoom,
    };
  }, [renderableGraph]);

  // Phase D: Reset to captured canonical framing (or fallback to graph bounds)
  // ROBUST: Uses canonical if available, otherwise computes from graph bounds
  const handleResetFrame = React.useCallback(() => {
    // Require camera and controls to be ready
    if (!cameraRef.current || !cameraControlsRef.current) {
      return;
    }

    // Use canonical if available, otherwise compute from graph bounds
    let targetFrame = canonicalFramingRef.current;
    if (!targetFrame) {
      targetFrame = computeGraphBoundsFrame();
      if (!targetFrame) {
        return; // Can't compute frame
      }
    }

    // Close billboard when resetting frame
    handleCloseBillboard();

    // Cancel any active animation
    if (activeAnimationCleanupRef.current) {
      activeAnimationCleanupRef.current();
      activeAnimationCleanupRef.current = null;
    }

    // Mark animation as active
    isAnimatingRef.current = true;

    // Animate back to target framing (canonical or fallback)
    const cleanup = animateCamera(
      cameraRef.current,
      cameraControlsRef.current,
      targetFrame.position.toArray() as [number, number, number],
      targetFrame.target.toArray() as [number, number, number],
      500
    );

    // Wrap cleanup to clear animation flag
    activeAnimationCleanupRef.current = () => {
      isAnimatingRef.current = false;
      cleanup();
    };
  }, [handleCloseBillboard, computeGraphBoundsFrame]); // Depends on both handlers

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

  // Phase 3 (Current Session): Callback wrappers for node/project selection
  // CRITICAL: These explicitly control side panel state and selection
  const handleSelectNode = React.useCallback((node: any) => {
    console.log('[INSTRUMENT] Node selected:', node.id);
    selectNode(node);
    setSidePanelOpen(false);
  }, [selectNode]);

  const handleEvidenceSelect = React.useCallback((nodeId: string) => {
    // Find the node from the node ID
    const node = data?.nodes?.find(n => n.id === nodeId);
    if (node) {
      handleSelectNode(node);
    }
  }, [data?.nodes, handleSelectNode]);

  const handleSelectProject = React.useCallback((project: any) => {
    console.log('[INSTRUMENT] Project selected:', project.id);
    selectProject(project);
    setSidePanelOpen(false);
  }, [selectProject]);

  // Handle person node selection (render-layer synthetic node at origin)
  const handlePersonClick = React.useCallback(() => {
    // Create synthetic person selection
    // Since person is a render-layer node, not a backend entity, we use a synthetic data object
    clearSelection(); // Clear existing selection first
    // Person node selection will be handled separately via dedicated state
    // For now, we frame the origin and update UI to show person context

    // Trigger camera focus on origin (0, 0, 0)
    if (!cameraRef.current || !cameraControlsRef.current) {
      return;
    }

    // Cancel any active animation
    if (activeAnimationCleanupRef.current) {
      activeAnimationCleanupRef.current();
      activeAnimationCleanupRef.current = null;
    }

    // Mark animation as active
    isAnimatingRef.current = true;

    // Compute focus target for origin (frame person node + surrounding context)
    // Origin position is [0, 0, 0]; we want to see it centered with some context
    const originPosition = new THREE.Vector3(0, 0, 0);
    const { targetPosition, targetLookAt } = computeFocusTarget(
      [originPosition],
      cameraRef.current.position.z
    );

    // Animate to origin
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

    console.log('[ConstellationCanvas] Person node selected, framing origin');
  }, []);

  // Phase 3.4: Auto-focus camera on selection with smart framing
  // Watches selectedItem and triggers smooth camera animation to focus on selected entity + connected entities
  // Phase 4C: Gated focus camera on selection (conditional on feature flag)
  useEffect(() => {
    // Gate: only run auto-focus if feature flag is enabled
    const focusCameraEnabled = import.meta.env.VITE_FOCUS_CAMERA_ON_SELECTION === 'true';
    if (!focusCameraEnabled) {
      return;
    }

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
    // Phase 5.0b: Use canonical rendered positions for camera focus alignment
    const framingPositions = buildFramingPositions(
      selectedItem.data.id,
      selectedItem.type,
      renderableGraph.nodes,
      renderableGraph.projects,
      data.edges,
      { applyExpansion: true }
    );

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

    console.log('[ConstellationCanvas] Auto-focus on selection (Phase 4C gated):', {
      selectedId: selectedItem.data.id,
      type: selectedItem.type,
      framingCount: framingPositions.length,
      focusCameraEnabled,
    });
  }, [selectedItem?.data.id, selectedItem?.type, renderableGraph, data]);

  // Phase 2: Reset camera on deselection (transition from selected → null)
  // Guard: Only fire on actual deselection, not on initial mount or URL hydration
  // FIXED: Uses canonicalFramingRef instead of state
  useEffect(() => {
    const prev = previousSelectedItemRef.current;
    const justDeselected = prev && !selectedItem;
    const canonical = canonicalFramingRef.current;

    console.log('[ConstellationCanvas] DESELECTION_EFFECT_RUN', {
      prev: prev?.data.id,
      now: selectedItem?.data.id,
      justDeselected,
      hasCanonicalFraming: !!canonical,
    });

    // Guard conditions: transition detected, canonical framing exists, refs ready
    if (justDeselected && canonical && cameraRef.current && cameraControlsRef.current) {
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
        canonical.position.toArray() as [number, number, number],
        canonical.target.toArray() as [number, number, number],
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
  }, [selectedItem]); // FIXED: Only depends on selectedItem, not canonicalFraming

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

      // Block if typing in non-search input/textarea/select/contenteditable/role=textbox etc
      const target = e.target as HTMLElement;
      const isSearchInput = target instanceof HTMLInputElement && target.getAttribute('data-search-input') === 'true';
      const isOtherEditableField = isEditableElement(target, isSearchInput);

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

      {/* Phase 5.3: Reset frame button enabled once controls are ready */}
      <ResetFrameButton
        onClick={() => {
          handleResetFrame();
        }}
        disabled={!controlsReady}
      />

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
        onNodeClick={handleSelectNode}
        onProjectClick={handleSelectProject}
        onPersonClick={handlePersonClick}
        onCanvasClick={undefined}
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
        selectedItem={selectedItem}
        onClearSelection={handleCloseBillboard}
        hoveredEvidenceNodeId={hoveredEvidenceNodeId}
        onEvidenceHover={handleEvidenceHover}
        onEvidenceLeave={handleEvidenceLeave}
        onEvidenceSelect={handleEvidenceSelect}
      />

      {/* Phase 3 (Current Session): Side panel only renders when explicitly opened via "More" button */}
      {sidePanelOpen && selectedItem && (
        <SelectionPanel
          selectedItem={selectedItem}
          onClose={() => setSidePanelOpen(false)}
          cameraRef={cameraRef}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}

      {/* Phase 3: Projected DOM Anchored Panels (Experimental, behind feature flag)
          Note: NOT using Three.js CSS3DRenderer; uses Drei <Html> component for 3D→2D projection.
          R3F automatically handles continuous position updates as camera moves (rotate, zoom, pan). */}
      {import.meta.env.VITE_CSS3D_PANELS_ENABLED === 'true' && (
        <CSS3DPanelAnchor
          selectedItem={selectedItem}
          onClose={handleCloseBillboard}
        />
      )}

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
