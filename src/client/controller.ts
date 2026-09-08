import { API, isBootstrap } from '../protocol.ts';
import type { Action, ActionRequest, Bootstrap, Envelope, InputRequest, MutationResult } from '../protocol.ts';
import { step, TICK_MS } from '../game/engine.ts';
import type { InputEdge, Simulation } from '../game/engine.ts';

const CLIENT_ID = crypto.randomUUID();
interface View {
  data: Bootstrap | null; sim: Simulation | null; busy: boolean; paused: boolean; reel: boolean;
  error: string | null; connected: boolean; retryPending: boolean;
}
interface Pending { route: 'actions' | 'cast-input'; body: ActionRequest | InputRequest }

export class GameController {
  readonly clientId = CLIENT_ID;
  private view: View = { data: null, sim: null, busy: false, paused: true, reel: false, error: null, connected: false, retryPending: false };
  private readonly listeners = new Set<() => void>();
  private stream: EventSource | undefined;
  private frame = 0;
  private lastFrame = 0;
  private accumulator = 0;
  private lastPublish = 0;
  private lastCheckpoint = 0;
  private edges: InputEdge[] = [];
  private pending: Pending | undefined;
  private disposed = false;
  private running = false;
  private pauseRequested = false;
  private refreshRequested = false;
  private notification: { generation: string; revision: number; gameplayAvailable: boolean } | undefined;
  private refreshing = false;
  private fetchController: AbortController | undefined;
  getSnapshot = (): View => this.view;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private publish(patch: Partial<View> = {}): void {
    this.view = { ...this.view, ...patch, retryPending: !!this.pending };
    for (const listener of this.listeners) listener();
  }
  start(): void {
    this.disposed = false;
    queueMicrotask(() => { if (!this.disposed) void this.connect(); });
    document.addEventListener('visibilitychange', this.visibility); window.addEventListener('blur', this.blur);
  }
  private visibility = (): void => {
    if (document.hidden) { this.pause(); this.stream?.close(); this.stream = undefined; }
    else if (!this.disposed) void this.connect();
  };
  private blur = (): void => { this.pause(); };
  async connect(): Promise<void> {
    if (this.disposed || document.hidden) return;
    if (this.view.busy) { this.refreshRequested = true; return; }
    if (this.refreshing) return;
    this.refreshing = true;
    const controller = new AbortController(); this.fetchController = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${API}/state`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
      const result: unknown = await response.json();
      if (!response.ok || !isBootstrap(result)) throw new Error(response.status === 401 ? '请重新连接 DSH' : '海岸暂时无法连接');
      if (this.disposed || controller.signal.aborted) return;
      this.accept(result, false);
      this.publish({ connected: true, error: this.pending ? this.view.error : result.issue });
      if (this.stream && this.stream.readyState !== EventSource.CLOSED) return;
      const stream = new EventSource(`${API}/events`); this.stream = stream;
      stream.addEventListener('revision', event => {
        if (this.disposed || this.stream !== stream) return;
        try {
          const data = JSON.parse((event as MessageEvent<string>).data) as { generation: string; revision: number; gameplayAvailable: boolean };
          this.notification = data;
          const current = this.view.data;
          if (current && (data.generation !== current.generation || data.revision > current.revision || data.gameplayAvailable !== current.gameplayAvailable)) {
            if (this.view.busy) this.refreshRequested = true;
            else void this.connect();
          }
        } catch { this.pause(); this.publish({ error: '连接数据未能识别，请重新连接' }); }
      });
      stream.onerror = () => {
        stream.close();
        if (this.stream === stream && !this.disposed) { this.stream = undefined; this.pause(); this.publish({ connected: false, error: '连接已中断，进度已暂停' }); }
      };
    } catch (error) {
      if (!this.disposed) { this.pause(); this.publish({ connected: false, error: error instanceof Error ? error.message : '连接未完成' }); }
    } finally { clearTimeout(timeout); this.refreshing = false; }
  }
  private accept(data: Bootstrap, fromMutation: boolean): void {
    const previous = this.view.data;
    if (previous?.generation === data.generation && data.revision < previous.revision) return;
    const preserve = !fromMutation && !!data.active && data.active.id === previous?.active?.id
      && data.active.castRevision === previous.active.castRevision && data.active.ownerEpoch === previous.active.ownerEpoch;
    if (!preserve) {
      this.edges = [];
      this.view = { ...this.view, sim: data.active ? { ...data.active.simulation } : null };
    }
    const owns = data.active?.owner === this.clientId;
    if (this.notification?.generation === data.generation && this.notification.revision <= data.revision
      && this.notification.gameplayAvailable === data.gameplayAvailable) this.refreshRequested = false;
    if (!owns || data.active?.paused || !data.gameplayAvailable) this.stopClock();
    this.publish({ data, paused: !this.running });
  }
  private envelope(): Envelope {
    const data = this.view.data;
    if (!data) throw new Error('海岸尚未连接');
    return { protocolVersion: 1, actionId: crypto.randomUUID(), clientId: this.clientId, saveId: data.saveId,
      generation: data.generation, expectedRevision: data.revision };
  }
  async action(action: Action): Promise<void> {
    if (this.view.busy || this.pending || !this.view.data || this.disposed) return;
    if (action.type === 'cast.begin' || action.type === 'cast.resume') this.pauseRequested = false;
    this.pending = { route: 'actions', body: { ...this.envelope(), action } };
    await this.send();
  }
  setReel(reel: boolean): void {
    if (reel && (!this.running || this.view.sim?.phase !== 'fighting')) return;
    this.publish({ reel });
  }
  private startClock(): void {
    if (this.disposed || document.hidden || this.pauseRequested || !this.view.data?.active || this.view.data.active.owner !== this.clientId) return;
    cancelAnimationFrame(this.frame);
    this.running = true; this.lastFrame = performance.now(); this.lastCheckpoint = this.lastFrame; this.accumulator = 0;
    this.publish({ paused: false });
    this.frame = requestAnimationFrame(this.advance);
  }
  private stopClock(): void { this.running = false; cancelAnimationFrame(this.frame); this.view = { ...this.view, paused: true, reel: false }; }
  private advance = (now: number): void => {
    if (!this.running || this.disposed || document.hidden) return;
    const cast = this.view.data?.active;
    let sim = this.view.sim;
    if (!cast || !sim) { this.stopClock(); this.publish(); return; }
    // Never catch up wall time after a stall or tab suspension.
    this.accumulator += Math.min(100, Math.max(0, now - this.lastFrame)); this.lastFrame = now;
    if (!this.view.busy && !this.pending) {
      while (this.accumulator >= TICK_MS) {
        this.accumulator -= TICK_MS;
        if (sim.phase === 'bite') {
          if (now - this.lastCheckpoint >= 5000) void this.checkpoint('checkpoint');
          break;
        }
        if (this.view.reel !== sim.reel) this.edges.push({ tick: sim.tick + 1, reel: this.view.reel });
        sim = step(sim, cast.challenge, this.view.reel);
        this.view = { ...this.view, sim };
        if (sim.tick - cast.simulation.tick >= 40 || sim.phase === 'bite' || sim.phase === 'caught' || sim.phase === 'escaped') {
          void this.checkpoint('checkpoint'); break;
        }
      }
    } else this.accumulator = 0;
    if (now - this.lastPublish >= 100) { this.lastPublish = now; this.publish(); }
    this.frame = requestAnimationFrame(this.advance);
  };
  async hook(): Promise<void> { if (this.running && this.view.sim?.phase === 'bite') await this.checkpoint('hook'); }
  pause(): void {
    this.pauseRequested = true; this.stopClock(); this.publish();
    const cast = this.view.data?.active;
    if (cast?.owner === this.clientId && !cast.paused && !this.view.busy && !this.pending) void this.checkpoint('pause');
  }
  private async checkpoint(command: InputRequest['command']): Promise<void> {
    const cast = this.view.data?.active;
    const sim = this.view.sim;
    if (!cast || !sim || cast.owner !== this.clientId || cast.paused || this.view.busy || this.pending) return;
    this.lastCheckpoint = performance.now();
    this.pending = { route: 'cast-input', body: { ...this.envelope(), castId: cast.id, ownerEpoch: cast.ownerEpoch,
      expectedCastRevision: cast.castRevision, fromTick: cast.simulation.tick, inputCursor: cast.inputCursor,
      toTick: sim.tick, edges: [...this.edges], command } };
    await this.send();
  }
  private async post(pending: Pending): Promise<{ response: Response; result: MutationResult & { error?: string } }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${API}/${pending.route}`, { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending.body), signal: controller.signal, keepalive: true });
      return { response, result: await response.json() as MutationResult & { error?: string } };
    } finally { clearTimeout(timer); }
  }
  private async send(): Promise<void> {
    const pending = this.pending;
    if (!pending || this.view.busy) return;
    this.publish({ busy: true, error: null });
    let success = false;
    try {
      const { response, result } = await this.post(pending);
      if (!isBootstrap(result.snapshot)) throw new Error('保存回复未能识别，请重试');
      if (!response.ok) {
        if (response.status !== 503) { this.pending = undefined; this.accept(result.snapshot, true); }
        else this.publish({ data: result.snapshot });
        throw new Error(result.error ?? '保存未完成');
      }
      this.pending = undefined;
      this.accept(result.snapshot, true);
      this.publish({ connected: true, error: result.snapshot.issue });
      success = true;
    } catch (error) {
      this.stopClock(); this.pauseRequested = true;
      this.publish({ error: error instanceof Error ? error.message : '保存未完成，请重试' });
    } finally { this.publish({ busy: false }); }
    if (success) {
      const cast = this.view.data?.active;
      if ((this.pauseRequested || this.disposed || document.hidden) && cast?.owner === this.clientId && !cast.paused) {
        await this.checkpoint('pause');
      } else if (pending.route === 'actions' && 'action' in pending.body && ['cast.begin', 'cast.resume'].includes(pending.body.action.type)) this.startClock();
      else if (!cast) { this.stopClock(); this.publish(); }
    }
    if (this.refreshRequested && !this.disposed) { this.refreshRequested = false; void this.connect(); }
  }
  async retry(): Promise<void> {
    if (this.view.busy) return;
    if (this.view.data && !this.view.data.gameplayAvailable && this.view.data.issue?.startsWith('保存没有完成')) {
      this.publish({ busy: true });
      try {
        const { response, result } = await this.post({ route: 'actions', body: { ...this.envelope(), action: { type: 'save.retry' } } });
        if (!response.ok || !isBootstrap(result.snapshot)) throw new Error(result.error ?? '仍然无法保存');
        this.publish({ data: result.snapshot, error: null });
      } catch (error) { this.publish({ error: error instanceof Error ? error.message : '仍然无法保存' }); return; }
      finally { this.publish({ busy: false }); }
    }
    if (this.pending) await this.send();
    else await this.connect();
  }
  dispose(): void {
    this.pause(); this.disposed = true; this.fetchController?.abort(); this.stream?.close();
    cancelAnimationFrame(this.frame); this.listeners.clear();
    document.removeEventListener('visibilitychange', this.visibility); window.removeEventListener('blur', this.blur);
  }
}
