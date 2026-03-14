/**
 * EDGELIST.TSX
 * Displays related nodes (incoming and outgoing edges) as a static table
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { EdgeWithNodes } from '../lib/types';

interface EdgeListProps {
  incoming: EdgeWithNodes[];
  outgoing: EdgeWithNodes[];
}

export const EdgeList: React.FC<EdgeListProps> = ({ incoming, outgoing }) => {
  const hasEdges = incoming.length > 0 || outgoing.length > 0;

  if (!hasEdges) {
    return (
      <div className="edges-section">
        <h3>Related Nodes</h3>
        <p className="no-edges">No related nodes found.</p>
      </div>
    );
  }

  return (
    <div className="edges-section">
      <h3>Related Nodes</h3>

      {outgoing.length > 0 && (
        <div className="edge-group">
          <h4>Influences / Produces</h4>
          <table className="edges-table">
            <thead>
              <tr>
                <th>Relationship</th>
                <th>Target Node</th>
                <th>Type</th>
                <th>Gravity</th>
              </tr>
            </thead>
            <tbody>
              {outgoing.map((edge) => (
                <tr key={edge.id}>
                  <td className="relationship-type">{edge.relationship_type}</td>
                  <td>
                    <Link to={`/nodes/${edge.target_node.id}`}>{edge.target_node.title}</Link>
                  </td>
                  <td>{edge.target_node?.type || '—'}</td>
                  <td>{(edge.target_node?.gravity_score * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {incoming.length > 0 && (
        <div className="edge-group">
          <h4>Influenced By / Required For</h4>
          <table className="edges-table">
            <thead>
              <tr>
                <th>Relationship</th>
                <th>Source Node</th>
                <th>Type</th>
                <th>Gravity</th>
              </tr>
            </thead>
            <tbody>
              {incoming.map((edge) => (
                <tr key={edge.id}>
                  <td className="relationship-type">{edge.relationship_type}</td>
                  <td>
                    <Link to={`/nodes/${edge.source_node.id}`}>{edge.source_node.title}</Link>
                  </td>
                  <td>{edge.source_node?.type || '—'}</td>
                  <td>{(edge.source_node?.gravity_score * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
