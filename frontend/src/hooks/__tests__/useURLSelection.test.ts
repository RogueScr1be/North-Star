/**
 * useURLSelection.test.ts
 * Regression enforcement for Phase 2.6: URL restoration with correct proj- prefix
 *
 * CRITICAL REGRESSION PROTECTION - Do NOT remove or modify without CTO approval
 *
 * Bug: Line 75 checked urlSelected.startsWith('project-') but selectProject writes 'proj-'
 * Fix: Changed line 75 to check urlSelected.startsWith('proj-')
 * This test enforces the fix and prevents accidental regression to incorrect prefix
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useURLSelection } from '../useURLSelection';
import type { GraphNode, GraphProject } from '../../lib/graph/graphTypes';

// Mock data with all required fields
const mockNodes: GraphNode[] = [
  {
    id: 'node-test-decision-001',
    title: 'Test Decision',
    type: 'decision',
    description: 'A test decision',
    project_id: 'proj-fastfood',
    tags: ['test'],
    gravity_score: 0.8,
    is_featured: false,
    x: 10,
    y: 20,
    z: 0,
  } as GraphNode,
  {
    id: 'node-test-skill-002',
    title: 'Test Skill',
    type: 'skill',
    description: 'A test skill',
    project_id: 'proj-getit',
    tags: ['test'],
    gravity_score: 0.6,
    is_featured: false,
    x: 30,
    y: 40,
    z: 0,
  } as GraphNode,
];

const mockProjects: GraphProject[] = [
  {
    id: 'proj-fastfood',
    title: 'Fast Food',
    description: 'Fast food project',
    gravity_score: 0.9,
    is_featured: true,
    x_derived: 0,
    y_derived: 0,
    z_derived: 0,
  } as GraphProject,
  {
    id: 'proj-getit',
    title: 'GetIT',
    description: 'GetIT project',
    gravity_score: 0.85,
    is_featured: true,
    x_derived: 50,
    y_derived: 50,
    z_derived: 0,
  } as GraphProject,
];

describe('useURLSelection - Phase 2.6 Regression Coverage', () => {
  beforeEach(() => {
    // Reset URL to clean state before each test
    delete (window as any).location;
    (window as any).location = { href: '', search: '', pathname: '/constellation' };
  });

  test('Project restoration: ?selected=proj-fastfood restores correct project', () => {
    // Setup: Set URL with correct project prefix (proj-)
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/constellation?selected=proj-fastfood',
        search: '?selected=proj-fastfood',
        pathname: '/constellation',
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useURLSelection({ nodes: mockNodes, projects: mockProjects }));

    // Verify: Selected item should be the Fast Food project
    expect(result.current.selectedItem).not.toBeNull();
    expect(result.current.selectedItem?.type).toBe('project');
    expect(result.current.selectedItem?.data.id).toBe('proj-fastfood');
    expect(result.current.selectedItem?.data.title).toBe('Fast Food');
  });

  test('Node restoration: ?selected=node-test-decision-001 restores correct node', () => {
    // Setup: Set URL with node selection
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/constellation?selected=node-test-decision-001',
        search: '?selected=node-test-decision-001',
        pathname: '/constellation',
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useURLSelection({ nodes: mockNodes, projects: mockProjects }));

    // Verify: Selected item should be the Test Decision node
    expect(result.current.selectedItem).not.toBeNull();
    expect(result.current.selectedItem?.type).toBe('node');
    expect(result.current.selectedItem?.data.id).toBe('node-test-decision-001');
    expect(result.current.selectedItem?.data.title).toBe('Test Decision');
  });

  test('Invalid param: ?selected=invalid-xyz does not crash and results in no selection', () => {
    // Setup: Set URL with invalid selection parameter
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/constellation?selected=invalid-xyz',
        search: '?selected=invalid-xyz',
        pathname: '/constellation',
      },
      writable: true,
      configurable: true,
    });

    // This should not throw an error
    const { result } = renderHook(() => useURLSelection({ nodes: mockNodes, projects: mockProjects }));

    // Verify: Selected item should be null (no match found)
    expect(result.current.selectedItem).toBeNull();
  });

  test('Empty URL: no selected param leaves graph in default unselected state', () => {
    // Setup: Clean URL with no selection parameter
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/constellation',
        search: '',
        pathname: '/constellation',
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useURLSelection({ nodes: mockNodes, projects: mockProjects }));

    // Verify: Selected item should be null (default state)
    expect(result.current.selectedItem).toBeNull();
  });

  test('[CRITICAL] Project prefix is proj- NOT project- (Phase 2.6 fix verification)', () => {
    // This test explicitly verifies the critical fix at line 75 of useURLSelection.ts
    // The bug: checked for 'project-' prefix
    // The fix: now checks for 'proj-' prefix

    // Test 1: Correct prefix (proj-) should restore the project
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/constellation?selected=proj-fastfood',
        search: '?selected=proj-fastfood',
        pathname: '/constellation',
      },
      writable: true,
      configurable: true,
    });

    const { result: result1 } = renderHook(() => useURLSelection({ nodes: mockNodes, projects: mockProjects }));

    expect(result1.current.selectedItem).not.toBeNull();
    expect(result1.current.selectedItem?.type).toBe('project');
    expect(result1.current.selectedItem?.data.id).toBe('proj-fastfood');

    // Test 2: Wrong prefix (project-) should NOT restore (would trigger unknown prefix path)
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/constellation?selected=project-fastfood',
        search: '?selected=project-fastfood',
        pathname: '/constellation',
      },
      writable: true,
      configurable: true,
    });

    const { result: result2 } = renderHook(() => useURLSelection({ nodes: mockNodes, projects: mockProjects }));

    // The wrong prefix should NOT restore selection (treated as unknown prefix)
    expect(result2.current.selectedItem).toBeNull();
  });
});
