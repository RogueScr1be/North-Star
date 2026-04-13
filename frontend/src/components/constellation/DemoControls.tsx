/**
 * DEMOCONTROLS.TSX
 * Founder controls for demo narrative
 * Phase 3.3: Project Focus Controls
 * - Reset to canonical demo framing
 * - Focus on nearest project anchor
 * - Cycle through project anchors
 */

import React from 'react';
import './DemoControls.css';

interface DemoControlsProps {
  onResetFrame: () => void;
  onFocusProject: () => void;
  onNextProject?: () => void;
  disabled?: boolean;
}

export const DemoControls: React.FC<DemoControlsProps> = ({
  onResetFrame,
  onFocusProject,
  onNextProject,
  disabled = false,
}) => {
  return (
    <div className="demo-controls">
      <button
        className="demo-control-button demo-reset"
        onClick={onResetFrame}
        disabled={disabled}
        title="Reset to canonical demo framing"
      >
        ↺ Reset Frame
      </button>
      <button
        className="demo-control-button demo-project"
        onClick={onFocusProject}
        disabled={disabled}
        title="Focus on nearest project anchor"
      >
        ★ Focus Project
      </button>
      {onNextProject && (
        <button
          className="demo-control-button demo-project-next"
          onClick={onNextProject}
          disabled={disabled}
          title="Cycle to next project anchor"
        >
          ⭐ Next Project
        </button>
      )}
    </div>
  );
};
