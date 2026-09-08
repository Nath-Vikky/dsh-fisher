import { createHash } from 'node:crypto';
import type { Session, SessionEvent, SessionStore } from '@deepseek-ai/dsh-session';
import type { WorkEvent, WorkTime } from './work-runtime.ts';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const activityTypes = new Set(['step/start', 'step/end', 'assistant/chunk', 'tool/call', 'tool/result']);

export class WorkAdapter {
  private readonly sampled = new Map<string, number>();
  private readonly sessions: Pick<SessionStore, 'get'>;
  private readonly emit: (event: WorkEvent) => void;
  private readonly clock: () => WorkTime;
  constructor(sessions: Pick<SessionStore, 'get'>, emit: (event: WorkEvent) => void, clock: () => WorkTime) {
    this.sessions = sessions; this.emit = emit; this.clock = clock;
  }
  private root(session: Session): Session | undefined {
    const visited = new Set<string>();
    for (let depth = 0; depth <= 16; depth++) {
      const identity = String(session.id);
      if (visited.has(identity)) return;
      visited.add(identity);
      if (session.header.parentSession === undefined) return session.header.origin === 'subagent' ? undefined : session;
      const parent = this.sessions.get(session.header.parentSession);
      if (!parent) return;
      session = parent;
    }
    return;
  }
  observe(session: Session, event: SessionEvent): void {
    const type: string = event.type;
    if (type !== 'turn/start' && type !== 'turn/end' && type !== 'approval/asked' && !activityTypes.has(type)) return;
    if (!Number.isSafeInteger(event.seq) || event.seq < session.firstLiveSeq || event.seq < 0 || event.seq > 2147483647) return;
    const root = this.root(session);
    if (!root) return;
    const rootId = hash(String(root.id)), sessionId = hash(String(session.id)), time = this.clock();
    if (type === 'approval/asked') {
      this.emit({ ...time, root: rootId, session: sessionId, seq: event.seq, turn: 0,
        kind: 'pause', completed: false, endKey: null });
      return;
    }
    const boundary = root === session && (type === 'turn/start' || type === 'turn/end');
    if (!boundary) {
      if (time.mono - (this.sampled.get(rootId) ?? -Infinity) < 1000) return;
      if (!this.sampled.has(rootId) && this.sampled.size >= 128) this.sampled.delete(this.sampled.keys().next().value!);
      this.sampled.set(rootId, time.mono);
    }
    // Only whitelisted numeric turn metadata is read. No message, chunk,
    // tool name, arguments, error payload, path, or token usage is accessed.
    const turn = (event.data as { turn: number }).turn;
    if (!Number.isSafeInteger(turn) || turn < 0 || turn > 2147483647) return;
    this.emit({ ...time, root: rootId, session: sessionId, turn, seq: event.seq,
      kind: boundary ? type === 'turn/start' ? 'start' : 'end' : 'activity',
      completed: boundary && type === 'turn/end' && (event.data as { reason: { kind: string } }).reason.kind === 'completed',
      endKey: boundary && type === 'turn/end' ? hash(`${sessionId}\0${turn}\0${event.seq}`) : null });
  }
  dispose(session: Session): void {
    if (session.header.parentSession !== undefined || session.header.origin === 'subagent') return;
    const root = hash(String(session.id)); this.sampled.delete(root);
    this.emit({ ...this.clock(), root, session: root, turn: 0, seq: 0, kind: 'dispose', completed: false, endKey: null });
  }
}
