/**
 * SPLASHSCREEN.TSX
 * Full-screen branded splash: ONLY the large app icon on black (no text, no card).
 * Stays mounted across data loading + intro close-up setup, then fades out onto the
 * centered first frame. Presentation-only.
 */

import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

export const SplashScreen: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => setGone(true), 1000);
    return () => clearTimeout(t);
  }, [visible]);

  if (gone) return null;

  return (
    <div
      className={`splash-screen ${visible ? '' : 'splash-screen--hidden'}`}
      data-testid="splash-screen"
      aria-hidden={!visible}
    >
      <img className="splash-logo" src="/splash-logo.png" alt="North Star" draggable={false} />
    </div>
  );
};
