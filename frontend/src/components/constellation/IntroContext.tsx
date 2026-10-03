/**
 * INTROCONTEXT.TSX
 * Presentation-only intro plumbing. Entities keep their canonical final positions;
 * IntroGroup applies a temporary translation so the rendered position equals
 *   lerp(center, final, progress)
 * with center = person node = origin.
 */

import { createContext, useContext, useLayoutEffect, useRef, MutableRefObject, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { IntroSchedule, getIntroProgress, getReverseProgress } from '../../lib/graph/introSchedule';

export type IntroPhase = 'idle' | 'running' | 'reversing' | 'complete';

export interface IntroController {
  schedule: IntroSchedule;
  phaseRef: MutableRefObject<IntroPhase>;
  /** performance.now() at burst start (or collapse start while reversing) */
  startRef: MutableRefObject<number>;
  /** Called if any intro frame logic throws: parent forces the normal complete state. */
  onFail: () => void;
}

export const IntroCtx = createContext<IntroController | null>(null);
export const useIntro = () => useContext(IntroCtx);

/** Progress for an entity right now (1 when no intro or intro complete). */
export function readIntroProgress(intro: IntroController | null, id: string): number {
  if (!intro) return 1;
  const phase = intro.phaseRef.current;
  if (phase === 'complete') return 1;
  if (phase === 'idle') return 0;
  if (phase === 'reversing') return getReverseProgress(intro.schedule, id, performance.now() - intro.startRef.current);
  return getIntroProgress(intro.schedule, id, performance.now() - intro.startRef.current);
}

/**
 * Wraps an entity whose children are already positioned at their final (render-layer
 * expanded) location `to`. Hidden until launched; then slides outward from the origin.
 */
export function IntroGroup({
  id,
  to,
  children,
}: {
  id: string;
  to: [number, number, number];
  children: ReactNode;
}) {
  const intro = useIntro();
  const ref = useRef<THREE.Group>(null);

  const apply = () => {
    const g = ref.current;
    if (!g) return;
    const p = readIntroProgress(intro, id);
    if (p >= 1) {
      if (!g.visible) g.visible = true;
      if (g.position.x !== 0 || g.position.y !== 0 || g.position.z !== 0) g.position.set(0, 0, 0);
      return;
    }
    g.visible = p > 0;
    const k = 1 - p;
    g.position.set(-to[0] * k, -to[1] * k, -to[2] * k);
  };

  useLayoutEffect(() => {
    try { apply(); } catch { intro?.onFail(); }
  });

  useFrame(() => {
    if (!intro) return;
    try { apply(); } catch { intro.onFail(); }
  });

  return <group ref={ref}>{children}</group>;
}
