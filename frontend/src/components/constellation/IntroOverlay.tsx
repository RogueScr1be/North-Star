/**
 * INTROOVERLAY.TSX
 * "Enter" gate for the cinematic intro. Pure DOM; does not block canvas rendering.
 * - loading: opaque black cover until the close-up camera is applied (no flash of the full graph)
 * - ready: transparent, centered Enter button
 * - leaving: fades out after click
 */

import React, { useEffect, useRef, useState } from 'react';
import './IntroOverlay.css';

interface IntroOverlayProps {
  ready: boolean;
  onEnter: () => void;
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({ ready, onEnter }) => {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (ready) btnRef.current?.focus();
  }, [ready]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setGone(true), 650);
    return () => clearTimeout(t);
  }, [leaving]);

  if (gone) return null;

  const state = leaving ? 'leaving' : ready ? 'ready' : 'loading';

  return (
    <div className={`intro-overlay intro-overlay--${state}`} data-testid="intro-overlay">
      <button
        ref={btnRef}
        type="button"
        className="intro-enter-button"
        disabled={!ready || leaving}
        aria-label="Enter the constellation"
        onClick={() => {
          setLeaving(true);
          onEnter();
        }}
      >
        Enter
      </button>
    </div>
  );
};
