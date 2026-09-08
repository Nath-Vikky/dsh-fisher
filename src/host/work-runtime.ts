import { UTC_DAY_MS } from '../game/work.ts';
import type { WorkState } from '../game/work.ts';

export interface WorkTime { wall: number; mono: number }
export interface WorkEvent extends WorkTime {
  root: string; session: string; seq: number; turn: number;
  kind: 'start' | 'activity' | 'end' | 'pause' | 'dispose'; completed: boolean; endKey: string | null;
}
interface RootLease { turn: number; startSeen: boolean; until: number; spent: number }
export interface WorkRuntime { at: WorkTime; roots: Record<string, RootLease> }
export function emptyWorkRuntime(at: WorkTime): WorkRuntime { return { at, roots: {} }; }
function advanceDay(work: WorkState, wall: number): void {
  const day = Math.floor(wall / UTC_DAY_MS);
  if (day > work.day) { work.day = day; work.dailyPoints = 0; }
}
function hasRoom(work: WorkState): boolean { return work.packs.length < 12 && work.dailyPoints < 120; }
function addPoints(work: WorkState, amount: number, packId: () => string): number {
  if (!hasRoom(work)) return 0;
  const accepted = Math.min(amount, 120 - work.dailyPoints, (12 - work.packs.length) * 10 - work.points);
  work.dailyPoints += accepted; work.points += accepted;
  while (work.points >= 10) { work.points -= 10; work.packs.push(packId()); }
  return accepted;
}
function addActivity(work: WorkState, ms: number, packId: () => string): void {
  if (!hasRoom(work)) return;
  work.activeMs += ms;
  while (work.activeMs >= 180_000) {
    work.activeMs -= 180_000; addPoints(work, 2, packId);
    if (!hasRoom(work)) { work.activeMs = 0; break; }
  }
}

// Every live lease starts at or before the last settlement: their remaining
// overlap is a single interval, whose length is the longest remaining lease.
export function settleWork(work: WorkState, runtime: WorkRuntime, time: WorkTime, packId: () => string): void {
  const mono = Math.max(runtime.at.mono, time.mono);
  if (work.enabled) {
    let duration = 0;
    for (const [id, root] of Object.entries(runtime.roots)) {
      const elapsed = Math.max(0, Math.min(mono, root.until) - runtime.at.mono);
      const accepted = Math.min(elapsed, 1_200_000 - root.spent);
      root.spent += accepted; duration = Math.max(duration, accepted);
      const cursor = work.cursors.find(cursor => cursor.session === id && cursor.turn === root.turn);
      if (cursor) cursor.activeMs = root.spent;
    }
    let wall = runtime.at.wall;
    while (duration > 0) {
      advanceDay(work, wall);
      const span = Math.min(duration, (Math.floor(wall / UTC_DAY_MS) + 1) * UTC_DAY_MS - wall);
      addActivity(work, span, packId); wall += span; duration -= span;
    }
    // Wall-clock jumps only move the daily bucket; elapsed time uses the
    // monotonic clock and never synthesizes activity between process runs.
    advanceDay(work, time.wall);
  }
  runtime.at = { wall: time.wall, mono };
}

export function observeWork(work: WorkState, runtime: WorkRuntime, event: WorkEvent, packId: () => string): void {
  if (!work.enabled) return;
  settleWork(work, runtime, event, packId);
  if (event.kind === 'dispose') { delete runtime.roots[event.root]; return; }
  const previous = work.cursors.find(cursor => cursor.session === event.session);
  if (event.kind === 'pause') {
    if (previous && event.seq <= previous.seq) return;
    const root = runtime.roots[event.root];
    if (root) root.until = runtime.at.mono;
    if (previous) previous.seq = event.seq;
    return;
  }
  if (previous && (event.seq <= previous.seq || event.turn < previous.turn)) return;
  const isRoot = event.root === event.session;
  const wasEnded = previous?.turn === event.turn && previous.ended;
  work.cursors = work.cursors.filter(cursor => cursor !== previous);
  work.cursors.push({ session: event.session, seq: event.seq, turn: event.turn,
    ended: wasEnded || (isRoot && event.kind === 'end'), activeMs: previous?.turn === event.turn ? previous.activeMs : 0 });
  if (work.cursors.length > 128) {
    const expired = work.cursors.findIndex(cursor => !runtime.roots[cursor.session] && cursor.session !== event.session);
    // Active roots keep their per-turn cap when the process restarts.
    if (expired < 0) { work.cursors.pop(); return; }
    work.cursors.splice(expired, 1);
  }
  let root = runtime.roots[event.root];
  if (!isRoot) {
    if (root) root.until = runtime.at.mono + 30_000;
    return;
  }
  if (wasEnded) return;
  if (event.kind === 'end') {
    if (event.endKey && !work.ends.includes(event.endKey)) {
      work.ends.push(event.endKey); work.ends = work.ends.slice(-128);
      if (root?.turn === event.turn && root.startSeen && event.completed
        && (work.lastCompletionAt === null || event.wall - work.lastCompletionAt >= 60_000)) {
        if (addPoints(work, 5, packId) > 0) work.lastCompletionAt = event.wall;
      }
    }
    if (root && root.turn <= event.turn) delete runtime.roots[event.root];
    return;
  }
  if (!root || event.turn > root.turn) {
    if (!root && Object.keys(runtime.roots).length >= 128) return;
    root = { turn: event.turn, startSeen: event.kind === 'start', until: runtime.at.mono,
      spent: previous?.turn === event.turn ? previous.activeMs : 0 };
    runtime.roots[event.root] = root;
  }
  if (root.turn === event.turn) root.until = runtime.at.mono + 30_000;
}
