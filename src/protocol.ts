import type { Catch, Challenge, InputEdge, Mode, Simulation } from './game/engine.ts';
import type { RegionId, SpeciesId, Variant } from './game/content.ts';
import type { BaitId, Journey, Tide } from './game/progression.ts';
import type { GearId } from './game/gear.ts';
import type { EncounterMeta } from './game/encounters.ts';
import type { SupplyBait, WorkView } from './game/work.ts';
import type { LifeState, ShelfItem, FrameId } from './game/life.ts';
import type { AchievementId } from './game/achievements.ts';
import type { GuestId } from './game/guests.ts';
import type { DecorId, DecorSlot } from './game/decor.ts';
export const VERSION = '0.1.0-rc.4';
export const API = '/api/dsh-fisher/v1';
export const COAST_ASSET = `${API}/assets/l01-coast-pixel-v1.webp`;

export interface RecordEntry { count: number; bestLengthMm: number | null; bestWeightG: number | null; variants: Partial<Record<Variant,number>> }
export interface ActiveCast {
  id: string; owner: string; ownerEpoch: number; leaseUntil: number; castRevision: number; inputCursor: number;
  paused: boolean; challenge: Challenge; simulation: Simulation; setup?: EncounterMeta;
}
export interface Bootstrap {
  protocolVersion: 1; version: string; generation: string; revision: number; saveId: string;
  gameplayAvailable: boolean; issue: string | null; coins: number; tokens: number; research: number;
  experience: number; released: number; inventory: Catch[]; catalog: Partial<Record<SpeciesId, RecordEntry>>;
  journey: Journey; work: WorkView; life:LifeState;
  storage:{canManage:boolean};
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
  | { type: 'work.enable'; enabled: boolean }
  | { type: 'work.claim'; packId: string; bait: SupplyBait }
  | { type: 'quest.accept'|'quest.skip'; questId:string }
  | { type: 'quest.claim'; questId:string; catchIds?:string[]; confirmed?:boolean }
  | { type: 'achievement.claim'; achievement:AchievementId }
  | { type: 'guest.accept'; guest:GuestId; route?:'record'|'catches' }
  | { type: 'guest.claim'|'guest.prepare'; guest:GuestId }
  | { type: 'guest.visit'; guest:GuestId|null }
  | { type: 'guest.outfit'; guest:GuestId; outfit:'base'|'alternate' }
  | { type: 'display.aquarium'; slot:number; catchId:string|null }
  | { type: 'display.shelf'; slot:number; item:ShelfItem|null }
  | { type: 'decor.buy'; decor:DecorId }
  | { type: 'decor.equip'; slot:DecorSlot; decor:DecorId|null }
  | { type: 'frame.select'; frame:FrameId }
  | { type: 'save.import'; previewId:string; confirmed:true }
  | { type: 'save.delete'; confirmation:string }
  | { type: 'save.retry' };
export interface SavePreview {id:string;source:'file'|'backup';expiresAt:number;format:number;content:number;coins:number;inventory:number;discovered:number;hasCast:boolean}
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
  reducedMotion?: boolean;
  sound?: boolean;
  volume?: number;
}

export function isBootstrap(value: unknown): value is Bootstrap {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  return data.protocolVersion === 1 && typeof data.version === 'string' && typeof data.generation === 'string'
    && typeof data.saveId === 'string' && Number.isSafeInteger(data.revision) && typeof data.gameplayAvailable === 'boolean'
    && Number.isSafeInteger(data.coins) && Array.isArray(data.inventory) && !!data.catalog && !!data.journey && !!data.work && !!data.life
    && typeof data.storage==='object' && data.storage!==null && typeof (data.storage as Record<string,unknown>).canManage==='boolean'
    && 'active' in data && 'pending' in data;
}
