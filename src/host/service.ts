import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { initialSimulation, replay } from '../game/engine.ts';
import type { Catch } from '../game/engine.ts';
import { isRegionId, isSpeciesId, species } from '../game/content.ts';
import type { SpeciesId } from '../game/content.ts';
import { verifyContent } from '../game/content-check.ts';
import { rollEncounter } from '../game/encounters.ts';
import { gear, isGearId } from '../game/gear.ts';
import { bait, consumeOverride, finishTide, isBaitId, isInventorySpecies, isTide, levelInfo, regionUnlocked } from '../game/progression.ts';
import { VERSION } from '../protocol.ts';
import type { ActionRequest, Bootstrap, Envelope, InputRequest, MutationResult,SavePreview,PluginPreferences } from '../protocol.ts';
import { emptySave, id, integer, object, validateSave } from './model.ts';
import type { PrivateCast, Save } from './model.ts';
import { SaveStore } from './store.ts';
import { decodeSave,encodeSave } from './save-codec.ts';
import { SUPPLY_BAITS, workView } from '../game/work.ts';
import { emptyWorkRuntime, observeWork, settleWork } from './work-runtime.ts';
import type { WorkEvent, WorkRuntime, WorkTime } from './work-runtime.ts';
import { recordLifeEvent, refreshLife } from '../game/life.ts';
import { applyLifeAction } from './life-actions.ts';
import { ActionError, award, requireDisposable, requireState } from './actions-common.ts';
export { ActionError } from './actions-common.ts';

export const workClock = (): WorkTime => ({ wall: Date.now(), mono: Math.floor(performance.now()) });

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
  generation = randomUUID();
  private previews=new Map<string,{save:Save;summary:SavePreview;started:boolean}>();
  private save: Save = emptySave();
  private tail: Promise<unknown> = Promise.resolve();
  private queued = 0;
  private stopped = false;
  private writeError = false;
  private readonly listeners = new Set<() => void>();
  private runtime: WorkRuntime;
  private pendingWork: WorkEvent[] = [];
  private workTimer: ReturnType<typeof setTimeout> | undefined;
  private epoch = 0;
  private readonly clock: () => WorkTime;
  readonly store: SaveStore;
  constructor(store = new SaveStore(), clock = workClock) { this.store = store; this.clock = clock; this.runtime = emptyWorkRuntime(clock()); }
  async initialize(): Promise<void> { verifyContent();this.save = await this.store.load(); }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  snapshot(): Bootstrap {
    const { active } = this.save;
    return structuredClone({ protocolVersion: 1, version: VERSION, generation: this.generation, revision: this.save.revision,
      saveId: this.save.id, gameplayAvailable: this.store.pluginEnabled && !this.stopped && !this.store.issue && !this.writeError,
      issue: this.store.issue ?? (this.writeError ? '保存没有完成，已暂停；请重试保存' : null),
      coins: this.save.coins, tokens: this.save.tokens, research: this.save.research, experience: this.save.experience,
      released: this.save.released, inventory: this.save.inventory, catalog: this.save.catalog, journey:this.save.journey,
      work: workView(this.save.work, this.clock().wall), life: this.save.life,storage:{canManage:this.store.canManage},
      active: active ? { id: active.id, owner: active.owner, ownerEpoch: active.ownerEpoch, leaseUntil: active.leaseUntil,
        castRevision: active.castRevision, inputCursor: active.inputCursor, paused: active.paused,
        challenge: active.challenge, simulation: active.simulation,setup:active.meta } : null,
      pending: this.save.pending, lastOutcome: this.save.lastOutcome });
  }
  get observingWork(): boolean { return this.store.pluginEnabled && this.save.work.enabled && !this.stopped && !this.writeError && !this.store.issue; }
  preferences():PluginPreferences {return {enabled:this.store.pluginEnabled,writable:!this.stopped&&this.store.canManage};}
  setEnabled(value:unknown):Promise<PluginPreferences> {
    if(this.queued>=256)return Promise.reject(new ActionError('保存队列繁忙，请稍后重试',429));
    this.queued++;
    const job=this.tail.then(async()=>{
      const request=object(value);requireState(typeof request.enabled==='boolean','启停状态不正确');
      requireState(!this.stopped&&this.store.canManage,'插件设置暂时无法保存');
      if(this.store.pluginEnabled===request.enabled)return this.preferences();
      if(!request.enabled){
        await this.persistWork(this.clock());
        if(this.save.active&&!this.save.active.paused){
          const next=structuredClone(this.save),cast=next.active!;
          cast.paused=true;cast.simulation.reel=false;cast.ownerEpoch++;cast.castRevision++;cast.leaseUntil=0;next.revision++;
          validateSave(next);await this.store.write(next);this.save=next;
        }
      }
      try{await this.store.setPluginEnabled(request.enabled);this.resetObservation();return this.preferences();}
      finally{this.notify();}
    }).finally(()=>{this.queued--;});
    this.tail=job.catch(()=>{});return job;
  }
  exportSave():Promise<string> {
    return this.tail.then(()=>{requireState(!this.stopped,'插件已停止');return this.store.issue?this.store.exportOriginal():encodeSave(this.save);});
  }
  previewSave(value:unknown):Promise<SavePreview> {
    if(this.queued>=256)return Promise.reject(new ActionError('保存队列繁忙，请稍后重试',429));
    this.queued++;
    const job=this.tail.then(async()=>{
      requireState(!this.stopped&&this.store.canManage,'当前存档不可替换，请先关闭占用它的其他宿主');
      const request=object(value);requireState(request.source==='file'||request.source==='backup','请选择存档来源');
      const text=request.source==='backup'?await this.store.backupText():request.text;
      requireState(typeof text==='string','请选择 JSON 存档文件');
      let decoded:ReturnType<typeof decodeSave>;
      try{decoded=decodeSave(text);}catch(error){throw new ActionError(error instanceof Error&&error.message==='UNSUPPORTED_SAVE_VERSION'?'这是其他版本的存档，原文件未修改':error instanceof Error&&error.message==='SAVE_TOO_LARGE'?'存档超过 2 MiB 上限':'存档内容或校验和不正确，原文件未修改',400);}
      const save=decoded.save;save.id=randomUUID();save.revision=0;save.receipts=[];save.work.enabled=false;
      if(save.active){save.active.owner=randomUUID();save.active.ownerEpoch=1;save.active.castRevision=0;save.active.leaseUntil=0;save.active.paused=true;}
      validateSave(save);
      const now=Date.now();for(const [key,entry] of this.previews)if(!entry.started&&entry.summary.expiresAt<now)this.previews.delete(key);
      if(this.previews.size>=2){const oldest=[...this.previews].find(([,entry])=>!entry.started);requireState(oldest,'请先完成正在替换的存档');this.previews.delete(oldest[0]);}
      const summary:SavePreview={id:randomUUID(),source:request.source,expiresAt:now+10*60_000,format:decoded.format,content:decoded.content,
        coins:save.coins,inventory:save.inventory.length,discovered:Object.keys(save.catalog).length,hasCast:!!save.active};
      this.previews.set(summary.id,{save,summary,started:false});return summary;
    }).finally(()=>{this.queued--;});
    this.tail=job.catch(()=>{});return job;
  }
  private async manageSave(request:ActionRequest,hash:string):Promise<MutationResult> {
    requireState(this.store.canManage,'当前存档不可替换，请先关闭占用它的其他宿主');
    requireState(request.expectedRevision===this.save.revision,'状态已更新，请重新确认');
    const action=request.action;let next:Save;
    if(action.type==='save.delete') {
      requireState(action.confirmation==='删除摸鱼海岸','请输入完整的删除确认文字');next=emptySave();
    } else {
      requireState(action.type==='save.import'&&action.confirmed===true,'请先预览并确认替换');
      const entry=this.previews.get(id(action.previewId));requireState(entry&&(entry.started||entry.summary.expiresAt>=Date.now()),'存档预览已过期，请重新选择文件');
      entry.started=true;next=structuredClone(entry.save);
    }
    next.revision=this.save.revision+1;next.receipts=[{id:request.actionId,fingerprint:hash,revision:next.revision}];validateSave(next);
    try{if(action.type==='save.delete')await this.store.reset(next);else await this.store.replace(next);}
    catch{this.writeError=true;this.resetObservation();this.notify();throw new ActionError(this.store.issue??'存档操作尚未完成，请重试',503);}
    this.save=next;this.generation=randomUUID();this.writeError=false;this.resetObservation();this.previews.clear();this.notify();
    return {snapshot:this.snapshot(),appliedRevision:next.revision,duplicate:false};
  }
  get workEpoch(): number { return this.epoch; }
  observe(event: WorkEvent, epoch: number): void {
    if (!this.observingWork || epoch !== this.epoch) return;
    if (this.pendingWork.length >= 256) {
      if (event.kind === 'activity') return;
      const replace = this.pendingWork.findIndex(item => item.kind === 'activity');
      if (replace < 0) return;
      this.pendingWork.splice(replace, 1);
    }
    this.pendingWork.push(event);
    if (this.workTimer === undefined) {
      this.workTimer = setTimeout(() => { this.workTimer = undefined; void this.flushWork(); }, 5000);
      this.workTimer.unref();
    }
  }
  private prepareWork(save: Save, at: WorkTime): { runtime: WorkRuntime; consumed: number } {
    const runtime = structuredClone(this.runtime), consumed = this.pendingWork.length;
    for (const event of this.pendingWork) observeWork(save.work, runtime, event, randomUUID);
    settleWork(save.work, runtime, at, randomUUID);
    return { runtime, consumed };
  }
  private commitWork(prepared: { runtime: WorkRuntime; consumed: number }, reset = false, at = this.clock()): void {
    this.pendingWork.splice(0, prepared.consumed);
    this.runtime = prepared.runtime;
    if (reset) this.resetObservation(at);
    if (!this.pendingWork.length && this.workTimer !== undefined) { clearTimeout(this.workTimer); this.workTimer = undefined; }
  }
  private resetObservation(at = this.clock()): void {
    this.epoch++; this.pendingWork = []; this.runtime = emptyWorkRuntime(at);
    if (this.workTimer !== undefined) clearTimeout(this.workTimer);
    this.workTimer = undefined;
  }
  flushWork(): Promise<void> {
    if (!this.observingWork || this.queued >= 256) return Promise.resolve();
    this.queued++;
    const job = this.tail.then(() => this.persistWork(this.clock())).finally(() => { this.queued--; });
    this.tail = job.catch(() => {}); return job;
  }
  private async persistWork(at: WorkTime): Promise<void> {
    if (!this.store.pluginEnabled || this.store.issue || this.writeError || !this.save.work.enabled) return;
    const next = structuredClone(this.save), prepared = this.prepareWork(next, at);
    if (JSON.stringify(next.work) !== JSON.stringify(this.save.work)) {
      next.revision++; validateSave(next);
      try { await this.store.write(next); }
      catch { this.writeError = true; this.resetObservation(); this.notify(); return; }
      this.save = next; this.commitWork(prepared); this.notify();
    } else this.commitWork(prepared);
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
    requireState(this.store.pluginEnabled,'请先在 DSH 设置中启用摸鱼海岸');
    const hash = fingerprint({ input, value });
    const prior = this.save.receipts.find(item => item.id === value.actionId);
    if (prior) {
      requireState(prior.fingerprint === hash, '重复请求内容不一致');
      return { snapshot: this.snapshot(), appliedRevision: prior.revision, duplicate: true };
    }
    requireState(value.saveId === this.save.id && value.generation === this.generation, '连接已变化，请重新连接');
    const request = value as ActionRequest;
    if(!input&&['save.import','save.delete'].includes(String(object(request.action).type)))return this.manageSave(request,hash);
    requireState(!this.store.issue, this.store.issue ?? '存档不可写');
    if (!input && object(request.action).type === 'save.retry') {
      try { await this.store.write(this.save); this.writeError = false; }
      catch { throw new ActionError('仍然无法保存，请检查存档目录与可用空间', 503); }
      this.notify();
      return { snapshot: this.snapshot(), appliedRevision: this.save.revision, duplicate: false };
    }
    requireState(!this.writeError, '保存没有完成，请先重试保存');
    if (!input) requireState(value.expectedRevision === this.save.revision, '状态已更新，请重新操作');
    const next = structuredClone(this.save);
    const at = this.clock(), prepared = this.prepareWork(next, at), wasEnabled = this.save.work.enabled;
    try {
      if (input) this.applyInput(next, value as InputRequest);
      else this.applyAction(next, request);
      refreshLife(next);
    } catch (error) {
      if (error instanceof ActionError) throw error;
      throw new ActionError('请求内容不正确', 400);
    }
    next.revision++;
    next.receipts.push({ id: value.actionId, fingerprint: hash, revision: next.revision });
    next.receipts = next.receipts.slice(-128);
    validateSave(next);
    try { await this.store.write(next); }
    catch { this.writeError = true; this.resetObservation(); this.notify(); throw new ActionError('保存没有完成，收入与收获尚未结算', 503); }
    this.save = next;
    this.commitWork(prepared, wasEnabled !== next.work.enabled, at);
    this.notify();
    return { snapshot: this.snapshot(), appliedRevision: next.revision, duplicate: false };
  }
  private applyAction(save: Save, { action, clientId }: ActionRequest): void {
    object(action);
    if (applyLifeAction(save, action)) return;
    switch (action.type) {
      case 'cast.begin': {
        requireState(!save.active && !save.pending, '请先处理这一竿');
        requireState(action.mode === 'standard' || action.mode === 'assisted', '请选择有效模式');
        const castId = randomUUID();
        const seed = randomBytes(4).readUInt32LE();
        const journey=save.journey;
        requireState(regionUnlocked(journey.region,save.experience,save.research),'这个钓点还未解锁');
        requireState(journey.bait==='B01'||journey.bait==='B08'||(journey.baits[journey.bait]??0)>0,'鱼饵用完了，请补充或换普通面团');
        let selected: ReturnType<typeof rollEncounter>;
        try { selected=rollEncounter(seed,castId,action.mode,journey,Object.keys(save.catalog) as SpeciesId[]); }
        catch (error) { throw new ActionError(error instanceof Error?error.message:'没有匹配的候选'); }
        if (journey.bait==='B08') journey.invitations=journey.invitations.filter(item=>item!==selected.catch.speciesId);
        else if (journey.bait!=='B01') journey.baits[journey.bait]!--;
        consumeOverride(journey);
        save.active = { id: castId, seed, catch: selected.catch, challenge: selected.challenge, meta:selected.meta,
          owner: clientId, ownerEpoch: 1, leaseUntil: Date.now() + 15000, castRevision: 0, inputCursor: 0,
          paused: false, simulation: initialSimulation() };
        save.lastOutcome = null;
        break;
      }
      case 'cast.resume': {
        const cast = save.active;
        requireState(cast && cast.id === id(action.castId), '这一竿已经结束');
        requireState(cast.simulation.phase!=='recovery','这一竿需要恢复收获');
        cast.owner = clientId; cast.ownerEpoch++; cast.leaseUntil = Date.now() + 15000;
        cast.paused = false; cast.simulation.reel = false; cast.castRevision++;
        break;
      }
      case 'cast.cancel': {
        const cast = save.active;
        requireState(cast && cast.id === id(action.castId), '这一竿已经结束');
        requireState(cast.owner === clientId && cast.ownerEpoch === integer(action.ownerEpoch, 1), '请先在这里继续这一竿');
        requireState(cast.simulation.phase!=='recovery','请先恢复这一竿的收获');
        if (cast.meta.source==='target') save.journey.baits.B07=Math.min(9999,(save.journey.baits.B07??0)+1);
        if (cast.meta.source==='invitation'&&!save.journey.invitations.includes(cast.catch.speciesId)) save.journey.invitations.push(cast.catch.speciesId);
        save.active = null; save.lastOutcome = 'cancelled';
        break;
      }
      case 'cast.recover': {
        const cast=save.active;
        requireState(cast && cast.id===id(action.castId) && cast.simulation.phase==='recovery','没有需要恢复的收获');
        requireState(cast.ownerEpoch===integer(action.ownerEpoch,1),'状态已变化，请重新操作');
        this.completeCatch(save,cast);
        break;
      }
      case 'catch.resolve': {
        const item = save.pending;
        requireState(item && item.id === id(action.catchId), '这份收获已经处理');
        requireState(['keep', 'sell', 'release'].includes(action.choice), '请选择处理方式');
        if (!isInventorySpecies(item.speciesId)) {
          requireState(action.choice==='keep','遗物和来客仅可收藏');save.pending=null;break;
        }
        if (action.choice === 'keep') {
          requireState(save.inventory.length < 240, '背包已满，请先整理');
          save.inventory.push(item);
        } else { requireDisposable(save,item,action.confirmed);this.resolveCatch(save, item, action.choice); }
        save.pending = null;
        break;
      }
      case 'inventory.resolve': {
        const index = save.inventory.findIndex(item => item.id === id(action.catchId));
        requireState(index >= 0, '这份收获已经处理');
        requireState(action.choice === 'sell' || action.choice === 'release', '请选择处理方式');
        requireDisposable(save,save.inventory[index]!,action.confirmed);
        this.resolveCatch(save, save.inventory[index]!, action.choice);
        save.inventory.splice(index, 1);
        break;
      }
      case 'inventory.lock': {
        const item=save.inventory.find(item=>item.id===id(action.catchId));
        requireState(item && typeof action.locked==='boolean','没有找到这份收获');item.locked=action.locked;break;
      }
      case 'inventory.batch': {
        requireState(Array.isArray(action.catchIds)&&action.catchIds.length>0&&action.catchIds.length<=240
          &&new Set(action.catchIds).size===action.catchIds.length,'请选择有效的收获数量');
        requireState(action.choice==='sell'||action.choice==='release','请选择处理方式');
        const items=action.catchIds.map(catchId=>save.inventory.find(item=>item.id===id(catchId)));
        for (const item of items) { requireState(item,'有收获已被处理');requireDisposable(save,item,false); }
        for (const item of items) this.resolveCatch(save,item!,action.choice);
        save.inventory=save.inventory.filter(item=>!action.catchIds.includes(item.id));break;
      }
      case 'location.select': {
        requireState(!save.active&&!save.pending,'请先处理这一竿');
        requireState(isRegionId(action.region)&&regionUnlocked(action.region,save.experience,save.research),'这个钓点还未解锁');
        save.journey.region=action.region;save.journey.bait='B01';save.journey.target=null;break;
      }
      case 'bait.select': {
        requireState(!save.active&&!save.pending,'请先处理这一竿');requireState(isBaitId(action.bait),'请选择有效鱼饵');
        requireState(action.target===undefined||isSpeciesId(action.target),'请选择有效目标');
        save.journey.bait=action.bait;save.journey.target=action.target??null;break;
      }
      case 'bait.buy': {
        requireState(isBaitId(action.bait)&&action.bait!=='B01'&&action.bait!=='B08','这种饵不能购买');
        const count=integer(action.quantity,1,99),item=bait(action.bait),owned=save.journey.baits[item.id]??0;
        requireState(owned+count<=9999,'鱼饵库存已满');
        requireState(save.coins>=item.coins*count&&save.tokens>=item.tokens*count,'壳币或潮汐碎片不足');
        save.coins-=item.coins*count;save.tokens-=item.tokens*count;save.journey.baits[item.id]=owned+count;break;
      }
      case 'gear.buy': {
        requireState(isGearId(action.gear),'请选择有效鱼具');const item=gear(action.gear);
        requireState(!save.journey.ownedGear.includes(item.id),'已经拥有这件鱼具');
        requireState(levelInfo(save.experience).level>=item.level,'手册等级还不够');
        requireState(save.coins>=item.price,'壳币不足');
        save.coins-=item.price;save.journey.ownedGear.push(item.id);break;
      }
      case 'gear.equip': {
        requireState(!save.active&&!save.pending,'请先处理这一竿');
        requireState(isGearId(action.gear)&&save.journey.ownedGear.includes(action.gear),'还没有这件鱼具');
        const item=gear(action.gear);save.journey.loadout[item.slot]=item.id;break;
      }
      case 'tide.choose': {
        requireState(!save.active&&!save.pending,'请先处理这一竿');requireState(isTide(action.tide),'请选择有效潮相');
        requireState(!save.journey.tideTrialUsed||save.tokens>=1,'需要 1 枚潮汐碎片');
        if (save.journey.tideTrialUsed) save.tokens--;else save.journey.tideTrialUsed=true;
        save.journey.tideOverride={tide:action.tide,remaining:3};break;
      }
      case 'work.enable': {
        requireState(typeof action.enabled === 'boolean', '请选择工作补给状态');
        save.work.enabled = action.enabled; break;
      }
      case 'work.claim': {
        const index = save.work.packs.indexOf(id(action.packId));
        requireState(index >= 0, '这份补给已经领取');
        requireState(SUPPLY_BAITS.some(bait => bait === action.bait), '请选择补给鱼饵');
        const stock = save.journey.baits[action.bait] ?? 0;
        requireState(stock <= 9997, '这种鱼饵的库存已满，请换一种');
        save.work.packs.splice(index, 1); save.journey.baits[action.bait] = stock + 2;
        award(save, 20, 1); break;
      }
      default: throw new ActionError('未知操作', 400);
    }
  }
  private resolveCatch(save: Save, item: Catch, choice: 'sell' | 'release'): void {
    if (choice === 'sell') award(save,item.price);
    else {
      if (species(item.speciesId).creature) save.released++;
      save.journey.releaseProgress++;
      if (save.journey.releaseProgress===5) {save.journey.releaseProgress=0;award(save,0,1);}
      recordLifeEvent(save,{type:'release',item});
    }
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
    if (cast.simulation.phase === 'caught') this.completeCatch(save,cast);
    else if (cast.simulation.phase === 'escaped') {
      save.active = null; save.lastOutcome = 'escaped'; save.experience += 2;
      save.journey.totalEscaped++;finishTide(save.journey,cast.meta.region);
    } else if (cast.simulation.phase==='recovery') {cast.paused=true;cast.simulation.reel=false;}
  }
  private completeCatch(save:Save,cast:PrivateCast): void {
    const item=cast.catch,def=species(item.speciesId),prior=save.catalog[item.speciesId],journey=save.journey;
    const lengthRecord=!!prior&&item.lengthMm!==null&&item.lengthMm>(prior.bestLengthMm??0);
    item.isNew=!prior;
    item.isRecord=!!prior&&item.lengthMm!==null&&item.weightG!==null
      &&(item.lengthMm>(prior.bestLengthMm??0)||item.weightG>(prior.bestWeightG??0));
    item.isNewVariant=item.variant!==null&&!prior?.variants[item.variant];item.caughtAt=new Date().toISOString();
    const variants={...prior?.variants};if (item.variant) variants[item.variant]=(variants[item.variant]??0)+1;
    save.catalog[item.speciesId]={count:(prior?.count??0)+1,
      bestLengthMm:item.lengthMm===null?null:Math.max(prior?.bestLengthMm??0,item.lengthMm),
      bestWeightG:item.weightG===null?null:Math.max(prior?.bestWeightG??0,item.weightG),variants};
    if (item.isNew && def.kind!=='guest') save.research++;
    const base=def.kind==='fish'?10:def.kind==='abstract'?12:0;
    const bonus=cast.challenge.mode==='standard'&&(cast.simulation.peakDanger??0)<200000?Math.floor(base*.1):0;
    save.experience+=base+bonus+(item.isNew&&def.kind!=='guest'?15:0);
    if (def.kind==='relic'&&!item.isNew) award(save,0,2);
    if (item.isNew) journey.dryStreak[item.region]=0;
    else if (cast.meta.source==='random'||cast.meta.source==='pity'||cast.meta.source==='legacy') journey.dryStreak[item.region]=Math.min(8,journey.dryStreak[item.region]+1);
    if (def.creature) {
      journey.variantStreak=item.variant==='original'?Math.min(39,journey.variantStreak+1):0;
      if (item.quality!<100) journey.miniCaught++;
      if (lengthRecord) journey.lengthRecords++;
    }
    item.order=++journey.totalCaught;journey.tutorialDone=true;finishTide(journey,cast.meta.region);
    save.pending=item;save.active=null;
    recordLifeEvent(save,{type:'catch',item,bait:cast.meta.bait,peakDanger:cast.simulation.peakDanger??0,lengthRecord});
    if (cast.meta.source==='target'||cast.meta.source==='invitation') {journey.bait='B01';journey.target=null;}
  }
  private notify(): void { for (const listener of this.listeners) { try { listener(); } catch { /* A closed subscriber cannot roll back a save. */ } } }
  async close(): Promise<void> {
    if (this.stopped) return;
    const at = this.clock(); this.stopped = true;
    if (this.workTimer !== undefined) clearTimeout(this.workTimer);
    this.workTimer = undefined;
    await this.tail; await this.persistWork(at); this.resetObservation(at);
    this.previews.clear();this.listeners.clear(); await this.store.close();
  }
}
