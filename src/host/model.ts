import { randomUUID } from 'node:crypto';
import { isSpeciesId, isRegionId, PATTERNS, REGION_IDS, VARIANTS, species } from '../game/content.ts';
import type { SpeciesId } from '../game/content.ts';
import { gear, isGearId } from '../game/gear.ts';
import { emptyJourney, isBaitId, isTide, isInventorySpecies } from '../game/progression.ts';
import type { Journey } from '../game/progression.ts';
import type { EncounterMeta } from '../game/encounters.ts';
import { catchBoundsValid } from '../game/engine.ts';
import type { Catch } from '../game/engine.ts';
import type { ActiveCast, Bootstrap } from '../protocol.ts';
import { emptyWork } from '../game/work.ts';
import type { WorkState } from '../game/work.ts';
import { emptyLife, migrateLife, refreshLife } from '../game/life.ts';
import type { LifeState } from '../game/life.ts';
import { validateLife } from './life-validation.ts';
import { object, integer, id } from './validation.ts';
export { object, integer, id } from './validation.ts';

export interface PrivateCast extends ActiveCast { seed: number; catch: Catch; meta: EncounterMeta }
export interface Receipt { id: string; fingerprint: string; revision: number }
export interface Save {
  formatVersion: 4; rulesVersion: 2; contentVersion: 2; id: string; revision: number;
  coins: number; tokens: number; research: number; experience: number; released: number;
  inventory: Catch[]; catalog: Bootstrap['catalog']; active: PrivateCast | null; pending: Catch | null;
  lastOutcome: Bootstrap['lastOutcome']; receipts: Receipt[]; journey: Journey; work: WorkState; life: LifeState;
}
export function emptySave(): Save {
  const save:Save={ formatVersion: 4, rulesVersion: 2, contentVersion: 2, id: randomUUID(), revision: 0,
    coins: 100, tokens: 0, research: 0, experience: 0, released: 0, inventory: [], catalog: {},
    active: null, pending: null, lastOutcome: null, receipts: [], journey:emptyJourney(), work:emptyWork(),life:emptyLife() };
  refreshLife(save);return save;
}
function boolean(value: unknown): void { if (typeof value !== 'boolean') throw new Error('Invalid boolean'); }
function validCatch(value: unknown, complete = true): asserts value is Catch {
  const item = object(value);
  id(item.id);
  if (!isSpeciesId(item.speciesId)) throw new Error('Unknown species');
  if (species(item.speciesId).creature) {
    integer(item.lengthMm, 1, 10000); integer(item.weightG, 1, 10000000); integer(item.quality, 0, 1000);
    if (!VARIANTS.some(variant=>variant===item.variant)) throw new Error('Invalid variant');
  }
  integer(item.price, 0, 1000);
  boolean(item.isNew); boolean(item.isRecord); boolean(item.isNewVariant); boolean(item.locked);
  if(item.order!==undefined)integer(item.order,1);
  if (typeof item.caughtAt !== 'string' || (complete ? !Number.isFinite(Date.parse(item.caughtAt)) : item.caughtAt !== '')) throw new Error('Invalid date');
  if (!catchBoundsValid(value as Catch)) throw new Error('Invalid catch bounds');
}
export function validateSave(value: unknown): asserts value is Save {
  const data = object(value);
  if (data.formatVersion !== 4 || data.rulesVersion !== 2 || data.contentVersion !== 2) throw new Error('UNSUPPORTED_SAVE_VERSION');
  id(data.id); integer(data.revision); integer(data.coins, 0, 9999999); integer(data.tokens, 0, 99999);
  integer(data.research); integer(data.experience); integer(data.released);
  if (!Array.isArray(data.inventory) || data.inventory.length > 240) throw new Error('Invalid inventory');
  for (const item of data.inventory) { validCatch(item); if (!isInventorySpecies(item.speciesId)) throw new Error('Invalid inventory kind'); }
  if (data.pending !== null) validCatch(data.pending);
  const ids = data.inventory.map(item => (item as Catch).id);
  if (data.pending) ids.push((data.pending as Catch).id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate catch');
  for (const [key, value] of Object.entries(object(data.catalog))) {
    if (!isSpeciesId(key)) throw new Error('Unknown catalog entry');
    const entry = object(value);
    integer(entry.count, 1);
    const def=species(key);
    if (def.creature) { integer(entry.bestLengthMm, def.min!, def.max!); integer(entry.bestWeightG, 1, 10000000); }
    else if (entry.bestLengthMm!==null || entry.bestWeightG!==null) throw new Error('Invalid non-creature record');
    let variants=0;
    for (const [key,count] of Object.entries(object(entry.variants))) {
      if (!VARIANTS.some(variant=>variant===key)||!def.creature) throw new Error('Invalid catalog variant');
      variants+=integer(count,1,entry.count as number);
    }
    if (def.creature && variants!==entry.count) throw new Error('Invalid variant count');
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
    if (!PATTERNS.some(pattern=>pattern===challenge.pattern) || !['standard', 'assisted', 'guided'].includes(String(challenge.mode))) throw new Error('Invalid challenge');
    if (challenge.rulesVersion===2) {
      const params=object(challenge.modifiers);
      integer(params.speed,60,110);integer(params.reelTension,850,1120);integer(params.burst,900,1000);
      integer(params.heavyPush,900,1000);integer(params.heavyResistance,920,1000);integer(params.slack,700,1000);
      integer(params.warningTicks,0,4);integer(params.recovery,80,100);integer(challenge.size,0,1000);
    } else if (challenge.rulesVersion!==undefined || !['steady','dart','rollback'].includes(String(challenge.pattern)) || challenge.mode==='guided') throw new Error('Invalid legacy challenge');
    const meta=object(cast.meta);
    if (!isRegionId(meta.region)||meta.region!==(cast.catch as Catch).region||!isBaitId(meta.bait)||!isTide(meta.tide)
      ||!['random','pity','target','invitation','tutorial','legacy'].includes(String(meta.source))) throw new Error('Invalid encounter metadata');
    const sim = object(cast.simulation);
    integer(sim.tick, 0, 3800); integer(sim.fightTicks, 0, 3600); integer(sim.progress, 0, 1000000);
    integer(sim.tension, 0, 1000000); integer(sim.danger, 0, 300000); integer(sim.rollbacks, 0, 2);
    boolean(sim.reel); boolean(sim.assistedRelease);
    if (sim.peakDanger!==undefined) integer(sim.peakDanger,sim.danger as number,300000);
    if (!['casting', 'waiting', 'bite', 'fighting','recovery'].includes(String(sim.phase))) throw new Error('Invalid active phase');
    if (sim.phase==='recovery' && (sim.fightTicks!==3600 || cast.paused!==true)) throw new Error('Invalid recovery');
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
  validateJourney(data.journey);
  validateWork(data.work);
  validateLife(data.life,data as unknown as Save);
  for(const item of data.inventory as Catch[])if(item.order!==undefined)integer(item.order,1,(data.journey as Journey).totalCaught);
  if(data.pending&&(data.pending as Catch).order!==undefined)integer((data.pending as Catch).order,1,(data.journey as Journey).totalCaught);
}

function validateWork(value: unknown): void {
  const work = object(value);
  boolean(work.enabled); integer(work.day, 0, 100000000);
  integer(work.points, 0, 9); integer(work.dailyPoints, 0, 120); integer(work.activeMs, 0, 179999);
  if (work.lastCompletionAt !== null) integer(work.lastCompletionAt, 0, 8640000000000000);
  if (!Array.isArray(work.packs) || work.packs.length > 12 || new Set(work.packs).size !== work.packs.length) throw new Error('Invalid supplies');
  for (const pack of work.packs) id(pack);
  const digest = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  if (!Array.isArray(work.ends) || work.ends.length > 128 || work.ends.some(value => !digest(value))
    || new Set(work.ends).size !== work.ends.length) throw new Error('Invalid work ledger');
  if (!Array.isArray(work.cursors) || work.cursors.length > 128) throw new Error('Invalid work cursors');
  const sessions = new Set<string>();
  for (const entry of work.cursors) {
    const cursor = object(entry);
    if (!digest(cursor.session) || sessions.has(cursor.session as string)) throw new Error('Invalid work cursor');
    sessions.add(cursor.session as string); integer(cursor.seq); integer(cursor.turn); boolean(cursor.ended); integer(cursor.activeMs, 0, 1200000);
  }
}

function validateJourney(value:unknown): void {
  const data=object(value);
  if (!isRegionId(data.region)||!isBaitId(data.bait)||(data.target!==null&&!isSpeciesId(data.target))) throw new Error('Invalid selection');
  if (!Array.isArray(data.ownedGear)||data.ownedGear.length>14||data.ownedGear.some(item=>!isGearId(item))||new Set(data.ownedGear).size!==data.ownedGear.length) throw new Error('Invalid gear');
  const loadout=object(data.loadout);
  for (const slot of ['rod','line','float'] as const) {
    const item=loadout[slot];
    if (!isGearId(item)||gear(item).slot!==slot||!data.ownedGear.includes(item)) throw new Error('Invalid loadout');
  }
  for (const [key,count] of Object.entries(object(data.baits))) {
    if (!isBaitId(key)||key==='B01'||key==='B08') throw new Error('Invalid bait stock');
    integer(count,0,9999);
  }
  for (const key of ['completed','dryStreak'] as const) {
    const counts=object(data[key]);
    if (Object.keys(counts).length!==4) throw new Error('Invalid region counters');
    for (const region of REGION_IDS) integer(counts[region],0,key==='dryStreak'?8:2147483647);
  }
  for (const key of ['totalCaught','totalEscaped','lengthRecords','miniCaught','tideFinals']) integer(data[key]);
  integer(data.variantStreak,0,39);integer(data.releaseProgress,0,4);
  boolean(data.tideTrialUsed);boolean(data.tutorialDone);boolean(data.overflow);
  if (data.tideOverride!==null) { const tide=object(data.tideOverride);if (!isTide(tide.tide)) throw new Error('Invalid tide');integer(tide.remaining,1,3); }
  if (!Array.isArray(data.invitations)||data.invitations.length>4||new Set(data.invitations).size!==data.invitations.length
    ||data.invitations.some(item=>!isSpeciesId(item)||species(item).kind!=='guest')) throw new Error('Invalid invitations');
}

export function upgradeSave(value:unknown): Save {
  const data=structuredClone(object(value));
  if (data.formatVersion===4) { validateSave(data);return data; }
  if (data.formatVersion===3 && data.rulesVersion===2 && data.contentVersion===2) {
    data.formatVersion=4;data.life=emptyLife();migrateLife(data as unknown as Save);validateSave(data);return data;
  }
  if (data.formatVersion===2 && data.rulesVersion===2 && data.contentVersion===2) {
    data.formatVersion=3;data.work=emptyWork();return upgradeSave(data);
  }
  if (data.formatVersion!==1||data.rulesVersion!==1||data.contentVersion!==1) throw new Error('UNSUPPORTED_SAVE_VERSION');
  const legacyIds:SpeciesId[]=['F001','F002','F003','A001'];
  const adaptCatch=(value:unknown) => {
    const item=object(value);
    if (!legacyIds.includes(item.speciesId as SpeciesId)) throw new Error('Invalid legacy catch');
    return {...item,region:'L01',variant:'original',isNewVariant:false,locked:false};
  };
  if (!Array.isArray(data.inventory)) throw new Error('Invalid legacy inventory');
  data.inventory=data.inventory.map(adaptCatch);
  if (data.pending!==null) data.pending=adaptCatch(data.pending);
  const journey=emptyJourney();
  const catalog=object(data.catalog);
  for (const [key,value] of Object.entries(catalog)) {
    if (!legacyIds.includes(key as SpeciesId)) throw new Error('Invalid legacy catalog');
    const record=object(value);integer(record.count,1);
    catalog[key]={...record,variants:{original:record.count}};
    journey.totalCaught+=record.count as number;
  }
  journey.completed.L01=journey.totalCaught;journey.tideFinals=journey.totalCaught;
  journey.tutorialDone=journey.totalCaught>0;journey.releaseProgress=integer(data.released)%5;
  if (data.active!==null) {
    const cast=object(data.active);
    const challenge=object(cast.challenge);
    if (challenge.rulesVersion!==undefined) throw new Error('Invalid legacy rules');
    cast.catch=adaptCatch(cast.catch);
    cast.meta={source:'legacy',region:'L01',bait:'B01',tide:'calm'};
  }
  data.formatVersion=3;data.rulesVersion=2;data.contentVersion=2;data.journey=journey;data.work=emptyWork();
  return upgradeSave(data);
}
