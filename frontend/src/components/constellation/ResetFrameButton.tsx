/**
 * RESETFRAMEBUTTON.TSX
 * Simple circular reset-frame control for constellation canvas
 * Phase 5.3: Clean reset control without demo mode dependency
 */

import React from 'react';
import './ResetFrameButton.css';

interface ResetFrameButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const ResetFrameButton: React.FC<ResetFrameButtonProps> = ({
  onClick,
  disabled = false,
}) => {
  return (
    <button
      className="reset-frame-button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Reset frame to default view"
      title="Reset frame to default view (press R)"
    >
      ↻
    </button>
  );
};
