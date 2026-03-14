/**
 * USENODE.TS
 * Hook to fetch node data with edges
 */

import { useState, useEffect } from 'react';
import { Node, EdgeWithNodes } from '../lib/types';
import { fetchNode, APIError } from '../lib/api';

interface UseNodeResult {
  node: Node | null;
  incoming: EdgeWithNodes[];
  outgoing: EdgeWithNodes[];
  loading: boolean;
  error: APIError | null;
}

export function useNode(nodeId: string): UseNodeResult {
  const [node, setNode] = useState<Node | null>(null);
  const [incoming, setIncoming] = useState<EdgeWithNodes[]>([]);
  const [outgoing, setOutgoing] = useState<EdgeWithNodes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);

  useEffect(() => {
    const loadNode = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchNode(nodeId);
        setNode(data.data);
        setIncoming(data.edges.incoming);
        setOutgoing(data.edges.outgoing);
      } catch (err) {
        setError(err instanceof APIError ? err : new APIError(500, 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadNode();
  }, [nodeId]);

  return { node, incoming, outgoing, loading, error };
}
