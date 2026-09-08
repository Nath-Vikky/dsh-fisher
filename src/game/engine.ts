import { SPECIES, species } from './content.ts';
import type { Pattern, SpeciesId } from './content.ts';

export const TICK_MS = 50;
export const MAX_TICKS = 3600;
export type Mode = 'standard' | 'assisted';
export type Phase = 'casting' | 'waiting' | 'bite' | 'fighting' | 'caught' | 'escaped';
export interface Challenge { seed: number; waitTicks: number; pattern: Pattern; mode: Mode }
export interface Simulation {
  tick: number; fightTicks: number; phase: Phase; progress: number; tension: number;
  danger: number; reel: boolean; assistedRelease: boolean; rollbacks: number;
}
export interface InputEdge { tick: number; reel: boolean }
export interface Catch {
  id: string; speciesId: SpeciesId; lengthMm: number; weightG: number; quality: number;
  price: number; caughtAt: string; isNew: boolean; isRecord: boolean;
}
export interface Encounter { challenge: Challenge; catch: Catch }

// Each named stream is independent of the number of calls in the other streams.
export function randomStream(seed: number, label: string): () => number {
  let state = seed >>> 0;
  for (const char of label) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
export function encounter(seed: number, id: string, mode: Mode): Encounter {
  const pick = randomStream(seed, 'species')() * 97;
  const definition = SPECIES[pick < 30 ? 0 : pick < 60 ? 1 : pick < 90 ? 2 : 3]!;
  const sizes = randomStream(seed, 'size');
  const u = sizes();
  const { min, max, mode: peak } = definition;
  const lengthMm = Math.round(u < (peak - min) / (max - min)
    ? min + Math.sqrt(u * (max - min) * (peak - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - peak)));
  const q = lengthMm <= peak ? (lengthMm - min) ** 2 / ((max - min) * (peak - min))
    : 1 - (max - lengthMm) ** 2 / ((max - min) * (max - peak));
  const behavior = randomStream(seed, 'behavior');
  return {
    challenge: { seed: Math.floor(behavior() * 4294967296), waitTicks: 40 + Math.floor(behavior() * 81), pattern: definition.pattern, mode },
    catch: { id, speciesId: definition.id, lengthMm,
      weightG: Math.max(1, Math.round(definition.weight * (lengthMm / peak) ** 3 * (.9 + sizes() * .2))),
      quality: Math.round(q * 1000), price: Math.max(1, Math.min(1000, Math.round(definition.price * (.75 + .75 * q)))),
      caughtAt: '', isNew: false, isRecord: false },
  };
}
export function initialSimulation(): Simulation {
  return { tick: 0, fightTicks: 0, phase: 'casting', progress: 0, tension: 200000,
    danger: 0, reel: false, assistedRelease: false, rollbacks: 0 };
}
export function warning(sim: Simulation, challenge: Challenge): string {
  if (sim.phase !== 'fighting') return '';
  if (sim.fightTicks >= 3000) return '水流在帮你，把这一竿慢慢收回来';
  if (sim.danger > 0) return '鱼线吃紧 · 松开收线';
  const beat = (sim.fightTicks + challenge.seed % 40) % 120;
  if (challenge.pattern === 'dart' && beat >= 68 && beat < 100) return beat < 80 ? '它要冲刺了 · 准备松线' : '正在冲刺 · 稳住';
  if (challenge.pattern === 'rollback' && sim.rollbacks < 2 && sim.progress >= (sim.rollbacks === 0 ? 290000 : 640000)) return '这股力道，似乎想倒着游';
  return sim.assistedRelease ? '辅助松线中' : '按住收线，张力升高时松开';
}
export function step(sim: Simulation, challenge: Challenge, reel: boolean): Simulation {
  if (sim.phase === 'caught' || sim.phase === 'escaped' || sim.phase === 'bite') return sim;
  const next = { ...sim, tick: sim.tick + 1, reel };
  if (sim.phase === 'casting') { if (next.tick >= 12) next.phase = 'waiting'; return next; }
  if (sim.phase === 'waiting') { if (next.tick >= 12 + challenge.waitTicks) next.phase = 'bite'; return next; }
  next.fightTicks++;
  const safety = next.fightTicks >= 3000;
  if (challenge.mode === 'assisted' || safety) {
    if (sim.tension >= 650000) next.assistedRelease = true;
    else if (sim.tension <= 300000) next.assistedRelease = false;
    reel = (reel || safety) && !next.assistedRelease;
  }
  const beat = (next.fightTicks + challenge.seed % 40) % 120;
  const push = safety ? 0 : challenge.pattern === 'dart' && beat >= 80 && beat < 100 ? 240
    : challenge.pattern === 'rollback' ? 25 : 12 + ((Math.floor(next.fightTicks / 40) + challenge.seed) % 3) * 8;
  next.tension = Math.max(0, Math.min(1000000, sim.tension + (reel ? 140 + push : -260 + push) * TICK_MS));
  next.progress = Math.max(0, Math.min(1000000, sim.progress + (reel ? (safety ? 140 : 80) : (sim.tension < 80000 ? -35 : -15)) * TICK_MS));
  if (next.tension > 850000) next.danger = Math.min(300000, sim.danger + 100 * TICK_MS);
  else if (next.tension <= 720000) next.danger = Math.max(0, sim.danger - 80 * TICK_MS);
  if (!safety && challenge.pattern === 'rollback' && next.rollbacks < 2 && next.progress >= (next.rollbacks === 0 ? 350000 : 700000)) {
    next.rollbacks++; next.progress = Math.max(0, next.progress - 80000);
  }
  if (next.danger >= 300000) next.phase = 'escaped';
  else if (next.progress >= 1000000) next.phase = 'caught';
  else if (next.fightTicks >= MAX_TICKS) next.phase = 'escaped';
  return next;
}
export function replay(sim: Simulation, challenge: Challenge, toTick: number, edges: readonly InputEdge[]): Simulation {
  let next = { ...sim };
  let index = 0;
  let reel = sim.reel;
  while (next.tick < toTick) {
    const edge = edges[index];
    if (edge?.tick === next.tick + 1) { reel = edge.reel; index++; }
    const before = next.tick;
    next = step(next, challenge, reel);
    if (next.tick === before) throw new Error('Simulation is not advancing');
  }
  if (index !== edges.length) throw new Error('Unconsumed input');
  return next;
}
export function catchBoundsValid(item: Catch): boolean {
  const def = species(item.speciesId);
  return item.lengthMm >= def.min && item.lengthMm <= def.max && item.price >= 1 && item.price <= 1000;
}
