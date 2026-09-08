import type { Catch, Challenge, InputEdge, Mode, Simulation } from './game/engine.ts';
import type { RegionId, SpeciesId, Variant } from './game/content.ts';
import type { BaitId, Journey, Tide } from './game/progression.ts';
import type { GearId } from './game/gear.ts';
import type { EncounterMeta } from './game/encounters.ts';
export const VERSION = '0.1.0-dev.4';
export const API = '/api/dsh-fisher/v1';
export const COAST_ASSET = `${API}/assets/coast-pixel-ink-v1.png`;

export interface RecordEntry { count: number; bestLengthMm: number | null; bestWeightG: number | null; variants: Partial<Record<Variant,number>> }
export interface ActiveCast {
  id: string; owner: string; ownerEpoch: number; leaseUntil: number; castRevision: number; inputCursor: number;
  paused: boolean; challenge: Challenge; simulation: Simulation; setup?: EncounterMeta;
}
export interface Bootstrap {
  protocolVersion: 1; version: string; generation: string; revision: number; saveId: string;
  gameplayAvailable: boolean; issue: string | null; coins: number; tokens: number; research: number;
  experience: number; released: number; inventory: Catch[]; catalog: Partial<Record<SpeciesId, RecordEntry>>;
  journey: Journey;
  active: ActiveCast | null; pending: Catch | null; lastOutcome: 'escaped' | 'cancelled' | null;
}
export type Action =
  | { type: 'cast.begin'; mode: Mode }
  | { type: 'cast.resume'; castId: string }
  | { type: 'cast.cancel'; castId: string; ownerEpoch: number }
  | { type: 'cast.recover'; castId: string; ownerEpoch: number }
  | { type: 'catch.resolve'; catchId: string; choice: 'keep' | 'sell' | 'release'; confirmed?: boolean }
  | { type: 'inventory.resolve'; catchId: string; choice: 'sell' | 'release'; confirmed?: boolean }
  | { type: 'inventory.lock'; catchId: string; locked: boolean }
  | { type: 'inventory.batch'; catchIds: string[]; choice: 'sell' | 'release' }
  | { type: 'location.select'; region: RegionId }
  | { type: 'bait.select'; bait: BaitId; target?: SpeciesId }
  | { type: 'bait.buy'; bait: BaitId; quantity: number }
  | { type: 'gear.buy'; gear: GearId }
  | { type: 'gear.equip'; gear: GearId }
  | { type: 'tide.choose'; tide: Tide }
  | { type: 'save.retry' };
export interface Envelope {
  protocolVersion: 1; actionId: string; clientId: string; saveId: string; generation: string; expectedRevision: number;
}
export interface ActionRequest extends Envelope { action: Action }
export interface InputRequest extends Envelope {
  castId: string; ownerEpoch: number; expectedCastRevision: number; fromTick: number; inputCursor: number;
  toTick: number; edges: InputEdge[]; command: 'checkpoint' | 'pause' | 'hook';
}
export interface MutationResult { snapshot: Bootstrap; appliedRevision: number; duplicate: boolean }

export interface GameProps {
  lowPerformance: boolean;
}

export function isBootstrap(value: unknown): value is Bootstrap {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  return data.protocolVersion === 1 && typeof data.version === 'string' && typeof data.generation === 'string'
    && typeof data.saveId === 'string' && Number.isSafeInteger(data.revision) && typeof data.gameplayAvailable === 'boolean'
    && Number.isSafeInteger(data.coins) && Array.isArray(data.inventory) && !!data.catalog && !!data.journey && 'active' in data && 'pending' in data;
}
