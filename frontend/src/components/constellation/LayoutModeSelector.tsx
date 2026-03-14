/**
 * LAYOUTMODESELECTOR.TSX
 * Canvas-level layout mode selector component
 * Phase 6.0: Toggle between Curated (API) and Dynamic (D3 experimental) layouts
 *
 * User-facing labels:
 * - Curated: Thoughtful, authored positioning from API
 * - Dynamic (Experimental): Auto-arranged positioning from D3 force simulation
 *
 * Internal state:
 * - layoutEngine: 'api' | 'd3'
 */

import React from 'react';
import './LayoutModeSelector.css';

interface LayoutModeSelectorProps {
  layoutEngine: 'api' | 'd3';
  onLayoutModeChange: (engine: 'api' | 'd3') => void;
}

export const LayoutModeSelector: React.FC<LayoutModeSelectorProps> = ({
  layoutEngine,
  onLayoutModeChange,
}) => {
  return (
    <div className="layout-mode-selector">
      <label className="layout-mode-label">Layout:</label>

      <div className="layout-mode-radio-group">
        <label className="layout-mode-radio">
          <input
            type="radio"
            name="layout-mode"
            value="api"
            checked={layoutEngine === 'api'}
            onChange={() => onLayoutModeChange('api')}
          />
          <span className="radio-label">Curated</span>
        </label>

        <label className="layout-mode-radio">
          <input
            type="radio"
            name="layout-mode"
            value="d3"
            checked={layoutEngine === 'd3'}
            onChange={() => onLayoutModeChange('d3')}
          />
          <span className="radio-label">Dynamic (Experimental)</span>
        </label>
      </div>

      <div className="layout-mode-help">
        <p>
          <strong>Curated:</strong> Uses thoughtful positioning from manual curation.
        </p>
        <p>
          <strong>Dynamic (Experimental):</strong> Auto-arranges the graph using force-directed simulation. Results may vary.
        </p>
      </div>
    </div>
  );
};
