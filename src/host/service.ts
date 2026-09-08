import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { encounter, initialSimulation, replay } from '../game/engine.ts';
import type { Catch } from '../game/engine.ts';
import { VERSION } from '../protocol.ts';
import type { ActionRequest, Bootstrap, Envelope, InputRequest, MutationResult } from '../protocol.ts';
import { emptySave, id, integer, object, validateSave } from './model.ts';
import type { Save } from './model.ts';
import { SaveStore } from './store.ts';

export class ActionError extends Error {
  readonly status: number;
  constructor(message: string, status = 409) { super(message); this.status = status; }
}
function requireState(condition: unknown, message: string): asserts condition { if (!condition) throw new ActionError(message); }
function fingerprint(value: unknown): string {
  const stable = (item: unknown): string => Array.isArray(item) ? `[${item.map(stable).join(',')}]`
    : item && typeof item === 'object' ? `{${Object.keys(item).sort().map(key => `${JSON.stringify(key)}:${stable((item as Record<string, unknown>)[key])}`).join(',')}}`
      : JSON.stringify(item);
  return createHash('sha256').update(stable(value)).digest('hex');
}
function validateEnvelope(value: unknown): asserts value is Envelope {
  const request = object(value);
  if (request.protocolVersion !== 1) throw new Error('Protocol mismatch');
  id(request.actionId); id(request.clientId); id(request.saveId); id(request.generation); integer(request.expectedRevision);
}

export class FisherService {
  readonly generation = randomUUID();
  private save: Save = emptySave();
  private tail: Promise<unknown> = Promise.resolve();
  private queued = 0;
  private stopped = false;
  private writeError = false;
  private readonly listeners = new Set<() => void>();
  readonly store: SaveStore;
  constructor(store = new SaveStore()) { this.store = store; }
  async initialize(): Promise<void> { this.save = await this.store.load(); }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  snapshot(): Bootstrap {
    const { active } = this.save;
    return structuredClone({ protocolVersion: 1, version: VERSION, generation: this.generation, revision: this.save.revision,
      saveId: this.save.id, gameplayAvailable: !this.stopped && !this.store.issue && !this.writeError,
      issue: this.store.issue ?? (this.writeError ? '保存没有完成，已暂停；请重试保存' : null),
      coins: this.save.coins, tokens: this.save.tokens, research: this.save.research, experience: this.save.experience,
      released: this.save.released, inventory: this.save.inventory, catalog: this.save.catalog,
      active: active ? { id: active.id, owner: active.owner, ownerEpoch: active.ownerEpoch, leaseUntil: active.leaseUntil,
        castRevision: active.castRevision, inputCursor: active.inputCursor, paused: active.paused,
        challenge: active.challenge, simulation: active.simulation } : null,
      pending: this.save.pending, lastOutcome: this.save.lastOutcome });
  }
  mutate(value: unknown, input: boolean): Promise<MutationResult> {
    if (this.queued >= 256) return Promise.reject(new ActionError('保存队列繁忙，请稍后重试', 429));
    this.queued++;
    const work = this.tail.then(() => this.perform(value, input)).finally(() => { this.queued--; });
    this.tail = work.catch(() => {});
    return work;
  }
  private async perform(value: unknown, input: boolean): Promise<MutationResult> {
    try { validateEnvelope(value); } catch { throw new ActionError('请求格式不正确', 400); }
    requireState(!this.stopped, '插件已停止');
    const hash = fingerprint({ input, value });
    const prior = this.save.receipts.find(item => item.id === value.actionId);
    if (prior) {
      requireState(prior.fingerprint === hash, '重复请求内容不一致');
      return { snapshot: this.snapshot(), appliedRevision: prior.revision, duplicate: true };
    }
    requireState(!this.store.issue, this.store.issue ?? '存档不可写');
    requireState(value.saveId === this.save.id && value.generation === this.generation, '连接已变化，请重新连接');
    const request = value as ActionRequest;
    if (!input && object(request.action).type === 'save.retry') {
      try { await this.store.write(this.save); this.writeError = false; }
      catch { throw new ActionError('仍然无法保存，请检查存档目录与可用空间', 503); }
      this.notify();
      return { snapshot: this.snapshot(), appliedRevision: this.save.revision, duplicate: false };
    }
    requireState(!this.writeError, '保存没有完成，请先重试保存');
    if (!input) requireState(value.expectedRevision === this.save.revision, '状态已更新，请重新操作');
    const next = structuredClone(this.save);
    try {
      if (input) this.applyInput(next, value as InputRequest);
      else this.applyAction(next, request);
    } catch (error) {
      if (error instanceof ActionError) throw error;
      throw new ActionError('请求内容不正确', 400);
    }
    next.revision++;
    next.receipts.push({ id: value.actionId, fingerprint: hash, revision: next.revision });
    next.receipts = next.receipts.slice(-128);
    validateSave(next);
    try { await this.store.write(next); }
    catch { this.writeError = true; this.notify(); throw new ActionError('保存没有完成，收入与收获尚未结算', 503); }
    this.save = next;
    this.notify();
    return { snapshot: this.snapshot(), appliedRevision: next.revision, duplicate: false };
  }
  private applyAction(save: Save, { action, clientId }: ActionRequest): void {
    object(action);
    switch (action.type) {
      case 'cast.begin': {
        requireState(!save.active && !save.pending, '请先处理这一竿');
        requireState(action.mode === 'standard' || action.mode === 'assisted', '请选择有效模式');
        const castId = randomUUID();
        const seed = randomBytes(4).readUInt32LE();
        const selected = encounter(seed, castId, action.mode);
        save.active = { id: castId, seed, catch: selected.catch, challenge: selected.challenge,
          owner: clientId, ownerEpoch: 1, leaseUntil: Date.now() + 15000, castRevision: 0, inputCursor: 0,
          paused: false, simulation: initialSimulation() };
        save.lastOutcome = null;
        break;
      }
      case 'cast.resume': {
        const cast = save.active;
        requireState(cast && cast.id === id(action.castId), '这一竿已经结束');
        cast.owner = clientId; cast.ownerEpoch++; cast.leaseUntil = Date.now() + 15000;
        cast.paused = false; cast.simulation.reel = false; cast.castRevision++;
        break;
      }
      case 'cast.cancel': {
        const cast = save.active;
        requireState(cast && cast.id === id(action.castId), '这一竿已经结束');
        requireState(cast.owner === clientId && cast.ownerEpoch === integer(action.ownerEpoch, 1), '请先在这里继续这一竿');
        save.active = null; save.lastOutcome = 'cancelled';
        break;
      }
      case 'catch.resolve': {
        const item = save.pending;
        requireState(item && item.id === id(action.catchId), '这份收获已经处理');
        requireState(['keep', 'sell', 'release'].includes(action.choice), '请选择处理方式');
        if (action.choice === 'keep') {
          requireState(save.inventory.length < 240, '背包已满，请先整理');
          save.inventory.push(item);
        } else this.resolveCatch(save, item, action.choice);
        save.pending = null;
        break;
      }
      case 'inventory.resolve': {
        const index = save.inventory.findIndex(item => item.id === id(action.catchId));
        requireState(index >= 0, '这份收获已经处理');
        requireState(action.choice === 'sell' || action.choice === 'release', '请选择处理方式');
        this.resolveCatch(save, save.inventory[index]!, action.choice);
        save.inventory.splice(index, 1);
        break;
      }
      default: throw new ActionError('未知操作', 400);
    }
  }
  private resolveCatch(save: Save, item: Catch, choice: 'sell' | 'release'): void {
    if (choice === 'sell') save.coins = Math.min(9999999, save.coins + item.price);
    else { save.released++; if (save.released % 5 === 0) save.tokens = Math.min(99999, save.tokens + 1); }
  }
  private applyInput(save: Save, request: InputRequest): void {
    const cast = save.active;
    requireState(cast && cast.id === id(request.castId), '这一竿已经结束');
    requireState(cast.owner === request.clientId && cast.ownerEpoch === integer(request.ownerEpoch, 1), '这一竿已在另一个窗口继续');
    requireState(!cast.paused, '请先继续这一竿');
    requireState(Date.now() <= cast.leaseUntil, '操作连接已暂停，请重新继续这一竿');
    requireState(cast.castRevision === integer(request.expectedCastRevision) && cast.simulation.tick === integer(request.fromTick)
      && cast.inputCursor === integer(request.inputCursor, 0, 4096), '进度已变化，请重新连接');
    integer(request.toTick, request.fromTick, Math.min(3800, request.fromTick + 100));
    if (!Array.isArray(request.edges) || request.edges.length > 100 || cast.inputCursor + request.edges.length > 4096) throw new Error('Input limit');
    let previous = request.fromTick;
    for (const edge of request.edges) {
      object(edge); integer(edge.tick, previous + 1, request.toTick);
      if (typeof edge.reel !== 'boolean') throw new Error('Input type');
      previous = edge.tick;
    }
    if (!['checkpoint', 'pause', 'hook'].includes(request.command)) throw new Error('Input command');
    cast.simulation = replay(cast.simulation, cast.challenge, request.toTick, request.edges);
    cast.inputCursor += request.edges.length; cast.castRevision++; cast.leaseUntil = Date.now() + 15000;
    if (request.command === 'hook') {
      requireState(cast.simulation.phase === 'bite', '还没有咬钩');
      cast.simulation.phase = 'fighting'; cast.simulation.reel = false;
    } else if (request.command === 'pause') { cast.paused = true; cast.simulation.reel = false; }
    if (cast.simulation.phase === 'caught') {
      const item = cast.catch;
      const prior = save.catalog[item.speciesId];
      item.isNew = !prior;
      item.isRecord = !!prior && (item.lengthMm > prior.bestLengthMm || item.weightG > prior.bestWeightG);
      item.caughtAt = new Date().toISOString();
      save.catalog[item.speciesId] = { count: (prior?.count ?? 0) + 1,
        bestLengthMm: Math.max(prior?.bestLengthMm ?? 0, item.lengthMm), bestWeightG: Math.max(prior?.bestWeightG ?? 0, item.weightG) };
      if (!prior) save.research++;
      save.experience += (item.speciesId === 'A001' ? 12 : 10) + (prior ? 0 : 15);
      save.pending = item; save.active = null;
    } else if (cast.simulation.phase === 'escaped') { save.active = null; save.lastOutcome = 'escaped'; save.experience += 2; }
  }
  private notify(): void { for (const listener of this.listeners) { try { listener(); } catch { /* A closed subscriber cannot roll back a save. */ } } }
  async close(): Promise<void> { this.stopped = true; await this.tail; this.listeners.clear(); await this.store.close(); }
}
