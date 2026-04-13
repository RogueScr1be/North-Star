/**
 * USEGRAPHDATA.TS
 * Fetch and validate graph data from /api/graph
 * Phase 2.2: Single responsibility - data loading with validation
 */

import { useEffect, useState } from 'react';
import { GraphResponse } from '../lib/graph/graphTypes';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface UseGraphDataState {
  data: GraphResponse | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Validate that required fields exist in GraphResponse
 * Fails fast on malformed payloads
 */
function validateGraphResponse(payload: unknown): GraphResponse {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Graph response is not an object');
  }

  const resp = payload as Record<string, unknown>;

  // Validate top-level structure
  if (!Array.isArray(resp.nodes)) {
    throw new Error('nodes is not an array');
  }
  if (!Array.isArray(resp.projects)) {
    throw new Error('projects is not an array');
  }
  if (!Array.isArray(resp.edges)) {
    throw new Error('edges is not an array');
  }
  if (!resp.metadata || typeof resp.metadata !== 'object') {
    throw new Error('metadata is missing or not an object');
  }

  const meta = resp.metadata as Record<string, unknown>;
  if (typeof meta.node_count !== 'number') {
    throw new Error('metadata.node_count is not a number');
  }
  if (typeof meta.project_count !== 'number') {
    throw new Error('metadata.project_count is not a number');
  }
  if (typeof meta.edge_count !== 'number') {
    throw new Error('metadata.edge_count is not a number');
  }

  // Validate node records
  for (const node of resp.nodes) {
    const n = node as Record<string, unknown>;
    if (!n.id || typeof n.id !== 'string') {
      throw new Error('node missing or invalid id');
    }
    if (!n.type || typeof n.type !== 'string') {
      throw new Error(`node ${n.id} missing or invalid type`);
    }
    if (typeof n.x !== 'number') {
      throw new Error(`node ${n.id} missing or invalid x`);
    }
    if (typeof n.y !== 'number') {
      throw new Error(`node ${n.id} missing or invalid y`);
    }
    if (typeof n.z !== 'number') {
      throw new Error(`node ${n.id} missing or invalid z`);
    }
    if (typeof n.gravity_score !== 'number') {
      throw new Error(`node ${n.id} missing or invalid gravity_score`);
    }
  }

  // Validate project records
  for (const proj of resp.projects) {
    const p = proj as Record<string, unknown>;
    if (!p.id || typeof p.id !== 'string') {
      throw new Error('project missing or invalid id');
    }
    if (typeof p.x_derived !== 'number') {
      throw new Error(`project ${p.id} missing or invalid x_derived`);
    }
    if (typeof p.y_derived !== 'number') {
      throw new Error(`project ${p.id} missing or invalid y_derived`);
    }
    if (typeof p.z_derived !== 'number') {
      throw new Error(`project ${p.id} missing or invalid z_derived`);
    }
    if (typeof p.gravity_score !== 'number') {
      throw new Error(`project ${p.id} missing or invalid gravity_score`);
    }
  }

  // Validate edge records
  for (const edge of resp.edges) {
    const e = edge as Record<string, unknown>;
    if (!e.id || typeof e.id !== 'string') {
      throw new Error('edge missing or invalid id');
    }
    if (!e.source_id || typeof e.source_id !== 'string') {
      throw new Error(`edge ${e.id} missing or invalid source_id`);
    }
    if (!e.target_id || typeof e.target_id !== 'string') {
      throw new Error(`edge ${e.id} missing or invalid target_id`);
    }
    if (!e.relationship_type || typeof e.relationship_type !== 'string') {
      throw new Error(`edge ${e.id} missing or invalid relationship_type`);
    }
  }

  return resp as unknown as GraphResponse;
}

/**
 * useGraphData
 * Fetches /api/graph and exposes state with validation
 * Phase 8.0C: Added 5-second timeout to prevent hanging
 */
export function useGraphData() {
  const [state, setState] = useState<UseGraphDataState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetch() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const res = await globalThis.fetch(`${API_BASE}/graph`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorPayload = await res.json();
          throw new Error(
            errorPayload.error || `HTTP ${res.status}: ${res.statusText}`
          );
        }

        const payload = await res.json();
        const validated = validateGraphResponse(payload);

        if (isMounted) {
          setState({
            data: validated,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (isMounted) {
          const errorMsg = err instanceof Error
            ? err.message.includes('abort')
              ? 'Graph fetch timed out after 5 seconds. Please check your connection and refresh.'
              : err.message
            : String(err);
          setState({
            data: null,
            loading: false,
            error: new Error(errorMsg),
          });
        }
      }
    }

    fetch();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetch = async () => {
    setState((prev) => ({ ...prev, loading: true }));

    const isMounted = true;

    try {
      const res = await globalThis.fetch(`${API_BASE}/graph`);

      if (!res.ok) {
        const errorPayload = await res.json();
        throw new Error(
          errorPayload.error || `HTTP ${res.status}: ${res.statusText}`
        );
      }

      const payload = await res.json();
      const validated = validateGraphResponse(payload);

      if (isMounted) {
        setState({
          data: validated,
          loading: false,
          error: null,
        });
      }
    } catch (err) {
      if (isMounted) {
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }
  };

  return {
    ...state,
    refetch,
  };
}
