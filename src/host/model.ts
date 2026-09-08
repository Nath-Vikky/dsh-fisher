import { randomUUID } from 'node:crypto';
import { isSpeciesId } from '../game/content.ts';
import { catchBoundsValid } from '../game/engine.ts';
import type { Catch } from '../game/engine.ts';
import type { ActiveCast, Bootstrap } from '../protocol.ts';

export interface PrivateCast extends ActiveCast { seed: number; catch: Catch }
export interface Receipt { id: string; fingerprint: string; revision: number }
export interface Save {
  formatVersion: 1; rulesVersion: 1; contentVersion: 1; id: string; revision: number;
  coins: number; tokens: number; research: number; experience: number; released: number;
  inventory: Catch[]; catalog: Bootstrap['catalog']; active: PrivateCast | null; pending: Catch | null;
  lastOutcome: Bootstrap['lastOutcome']; receipts: Receipt[];
}
export function emptySave(): Save {
  return { formatVersion: 1, rulesVersion: 1, contentVersion: 1, id: randomUUID(), revision: 0,
    coins: 100, tokens: 0, research: 0, experience: 0, released: 0, inventory: [], catalog: {},
    active: null, pending: null, lastOutcome: null, receipts: [] };
}
export function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected object');
  return value as Record<string, unknown>;
}
export function integer(value: unknown, min = 0, max = 2147483647): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new Error('Invalid integer');
  return value;
}
export function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(value)) throw new Error('Invalid identifier');
  return value;
}
function boolean(value: unknown): void { if (typeof value !== 'boolean') throw new Error('Invalid boolean'); }
function validCatch(value: unknown, complete = true): asserts value is Catch {
  const item = object(value);
  id(item.id);
  if (!isSpeciesId(item.speciesId)) throw new Error('Unknown species');
  integer(item.lengthMm, 1, 10000); integer(item.weightG, 1, 10000000);
  integer(item.quality, 0, 1000); integer(item.price, 1, 1000);
  boolean(item.isNew); boolean(item.isRecord);
  if (typeof item.caughtAt !== 'string' || (complete ? !Number.isFinite(Date.parse(item.caughtAt)) : item.caughtAt !== '')) throw new Error('Invalid date');
  if (!catchBoundsValid(value as Catch)) throw new Error('Invalid catch bounds');
}
export function validateSave(value: unknown): asserts value is Save {
  const data = object(value);
  if (data.formatVersion !== 1 || data.rulesVersion !== 1 || data.contentVersion !== 1) throw new Error('UNSUPPORTED_SAVE_VERSION');
  id(data.id); integer(data.revision); integer(data.coins, 0, 9999999); integer(data.tokens, 0, 99999);
  integer(data.research); integer(data.experience); integer(data.released);
  if (!Array.isArray(data.inventory) || data.inventory.length > 240) throw new Error('Invalid inventory');
  for (const item of data.inventory) validCatch(item);
  if (data.pending !== null) validCatch(data.pending);
  const ids = data.inventory.map(item => (item as Catch).id);
  if (data.pending) ids.push((data.pending as Catch).id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate catch');
  for (const [key, value] of Object.entries(object(data.catalog))) {
    if (!isSpeciesId(key)) throw new Error('Unknown catalog entry');
    const entry = object(value);
    integer(entry.count, 1); integer(entry.bestLengthMm, 1, 10000); integer(entry.bestWeightG, 1, 10000000);
  }
  if (data.active !== null) {
    if (data.pending !== null) throw new Error('Conflicting cast state');
    const cast = object(data.active);
    id(cast.id); id(cast.owner); integer(cast.ownerEpoch, 1); integer(cast.leaseUntil, 0, Number.MAX_SAFE_INTEGER);
    integer(cast.castRevision); integer(cast.inputCursor, 0, 4096); integer(cast.seed, 0, 4294967295); boolean(cast.paused);
    validCatch(cast.catch, false);
    if ((cast.catch as Catch).id !== cast.id) throw new Error('Catch identity mismatch');
    const challenge = object(cast.challenge);
    integer(challenge.seed, 0, 4294967295); integer(challenge.waitTicks, 40, 120);
    if (!['steady', 'dart', 'rollback'].includes(String(challenge.pattern)) || !['standard', 'assisted'].includes(String(challenge.mode))) throw new Error('Invalid challenge');
    const sim = object(cast.simulation);
    integer(sim.tick, 0, 3800); integer(sim.fightTicks, 0, 3600); integer(sim.progress, 0, 1000000);
    integer(sim.tension, 0, 1000000); integer(sim.danger, 0, 300000); integer(sim.rollbacks, 0, 2);
    boolean(sim.reel); boolean(sim.assistedRelease);
    if (!['casting', 'waiting', 'bite', 'fighting'].includes(String(sim.phase))) throw new Error('Invalid active phase');
  }
  if (data.lastOutcome !== null && data.lastOutcome !== 'escaped' && data.lastOutcome !== 'cancelled') throw new Error('Invalid outcome');
  if (!Array.isArray(data.receipts) || data.receipts.length > 128) throw new Error('Invalid receipts');
  const actionIds = new Set<string>();
  for (const value of data.receipts) {
    const receipt = object(value);
    const actionId = id(receipt.id);
    if (actionIds.has(actionId)) throw new Error('Duplicate receipt');
    actionIds.add(actionId); integer(receipt.revision, 1, data.revision as number);
    if (typeof receipt.fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.fingerprint)) throw new Error('Invalid receipt');
  }
}
