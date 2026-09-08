export const SUPPLY_BAITS = ['B02', 'B03', 'B04', 'B05', 'B06'] as const;
export type SupplyBait = typeof SUPPLY_BAITS[number];
export const UTC_DAY_MS = 86_400_000;
export interface WorkCursor { session: string; seq: number; turn: number; ended: boolean; activeMs: number }
export interface WorkState {
  enabled: boolean;
  day: number;
  dailyPoints: number;
  points: number;
  activeMs: number;
  packs: string[];
  lastCompletionAt: number | null;
  cursors: WorkCursor[];
  ends: string[];
}
export interface WorkView {
  enabled: boolean; dailyPoints: number; points: number; activeMs: number;
  packs: string[]; nextResetAt: number;
}
export function emptyWork(): WorkState {
  return { enabled: false, day: 0, dailyPoints: 0, points: 0, activeMs: 0, packs: [],
    lastCompletionAt: null, cursors: [], ends: [] };
}
export function workView(work: WorkState, now: number): WorkView {
  const day = Math.max(work.day, Math.floor(now / UTC_DAY_MS));
  return { enabled: work.enabled, dailyPoints: day > work.day ? 0 : work.dailyPoints,
    points: work.points, activeMs: work.activeMs, packs: [...work.packs], nextResetAt: (day + 1) * UTC_DAY_MS };
}
