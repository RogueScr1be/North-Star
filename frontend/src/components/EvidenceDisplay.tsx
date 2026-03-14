/**
 * EVIDENCEDISPLAY.TSX
 * Displays evidence metadata from node (source, detail, URL)
 */

import React from 'react';
import { Evidence } from '../lib/types';

interface EvidenceDisplayProps {
  evidence: Evidence[];
}

export const EvidenceDisplay: React.FC<EvidenceDisplayProps> = ({ evidence }) => {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="evidence-section">
        <h3>Evidence</h3>
        <p className="no-evidence">No evidence documented for this node.</p>
      </div>
    );
  }

  return (
    <div className="evidence-section">
      <h3>Evidence</h3>
      <div className="evidence-list">
        {evidence.map((item, index) => (
          <div key={index} className="evidence-item">
            <div className="evidence-source">
              <strong>{item.source}</strong>
            </div>

            {item.detail && <p className="evidence-detail">{item.detail}</p>}

            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="evidence-link">
                View Source →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
