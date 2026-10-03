import { describe, it, expect } from 'vitest';
import {
  buildIntroSchedule,
  getIntroProgress,
  INTRO_BATCH_DELAY_MS,
  INTRO_TRAVEL_MS,
} from '../introSchedule';

const projects = [
  { id: 'p-low', gravity_score: 0.2 },
  { id: 'p-high', gravity_score: 0.9 },
];
const nodes = [
  { id: 'n-a', gravity_score: 0.5 },
  { id: 'n-b', gravity_score: 0.95 },
  { id: 'n-c', gravity_score: 0.5 },
  { id: 'n-d', gravity_score: 0.1 },
  { id: 'n-e', gravity_score: 0.7 },
];

describe('introSchedule', () => {
  const s = buildIntroSchedule(projects, nodes);

  it('orders projects first (gravity desc), then nodes by gravity desc with id tiebreak', () => {
    expect(s.order).toEqual(['p-high', 'p-low', 'n-b', 'n-e', 'n-a', 'n-c', 'n-d']);
  });

  it('is deterministic', () => {
    expect(buildIntroSchedule([...projects].reverse(), [...nodes].reverse()).order).toEqual(s.order);
  });

  it('batches in alternating 2/3 with a 150-220ms gap', () => {
    expect(INTRO_BATCH_DELAY_MS).toBeGreaterThanOrEqual(150);
    expect(INTRO_BATCH_DELAY_MS).toBeLessThanOrEqual(220);
    const counts = new Map<number, number>();
    s.startById.forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1));
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([0, 180, 360]);
    expect([...counts.values()]).toEqual([2, 3, 2]);
  });

  it('progress goes 0 -> 1 and lands exactly at 1', () => {
    expect(getIntroProgress(s, 'n-d', 0)).toBe(0);
    const mid = getIntroProgress(s, 'p-high', INTRO_TRAVEL_MS / 2);
    expect(mid).toBeGreaterThan(0.5); // ease-out
    expect(mid).toBeLessThan(1);
    expect(getIntroProgress(s, 'p-high', INTRO_TRAVEL_MS)).toBe(1);
    expect(getIntroProgress(s, 'n-d', s.totalMs)).toBe(1);
  });

  it('never hides unknown ids', () => {
    expect(getIntroProgress(s, 'unknown', 0)).toBe(1);
  });
});
