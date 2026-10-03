/**
 * INTROSCHEDULE.TS
 * Pure, deterministic schedule for the cinematic constellation intro.
 *
 * Presentation-only: nothing here reads or mutates canonical graph data beyond ids and
 * gravity scores. Display position during the intro is derived elsewhere as
 *   displayPosition = lerp(centerPosition, finalPosition, progress)
 */

export const INTRO_BATCH_DELAY_MS = 180; // within the 150-220ms spec window
export const INTRO_TRAVEL_MS = 900; // per-entity outward travel time
export const INTRO_CAMERA_MS = 3200; // camera pullback duration
const BATCH_SIZES = [2, 3]; // alternating, deterministic

export interface IntroSchedule {
  /** entity id -> ms after burst start at which it begins travelling */
  startById: Map<string, number>;
  /** entity ids in launch order (projects, then nodes by gravity desc) */
  order: string[];
  /** ms after burst start when the last entity lands */
  totalMs: number;
}

interface Scheduled {
  id: string;
  gravity_score?: number;
}

function byGravityThenId(a: Scheduled, b: Scheduled): number {
  const g = (b.gravity_score ?? 0) - (a.gravity_score ?? 0);
  return g !== 0 ? g : a.id.localeCompare(b.id);
}

/**
 * Order: (person is already visible) -> project anchors -> nodes by gravity desc.
 * Sorting nodes by gravity descending places high-gravity nodes before the remainder.
 */
export function buildIntroSchedule(
  projects: Scheduled[],
  nodes: Scheduled[]
): IntroSchedule {
  const order = [
    ...[...projects].sort(byGravityThenId).map(p => p.id),
    ...[...nodes].sort(byGravityThenId).map(n => n.id),
  ];

  const startById = new Map<string, number>();
  let i = 0;
  let batch = 0;
  while (i < order.length) {
    const size = BATCH_SIZES[batch % BATCH_SIZES.length];
    for (const id of order.slice(i, i + size)) {
      startById.set(id, batch * INTRO_BATCH_DELAY_MS);
    }
    i += size;
    batch++;
  }

  const lastStart = batch === 0 ? 0 : (batch - 1) * INTRO_BATCH_DELAY_MS;
  return { startById, order, totalMs: lastStart + INTRO_TRAVEL_MS };
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/** 0 = not yet launched (hidden at center), 1 = landed at final position. */
export function getIntroProgress(
  schedule: IntroSchedule,
  id: string,
  elapsedMs: number
): number {
  const start = schedule.startById.get(id);
  if (start === undefined) return 1; // unknown ids are never hidden
  const t = (elapsedMs - start) / INTRO_TRAVEL_MS;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.max(0.0001, easeOutCubic(t)); // >0 once launched so visibility flips
}
