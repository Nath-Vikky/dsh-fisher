import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import type { Session, SessionEvent, SessionStore } from '@deepseek-ai/dsh-session';
import { emptyWork, UTC_DAY_MS } from '../src/game/work.ts';
import { emptySave } from '../src/host/model.ts';
import { FisherService } from '../src/host/service.ts';
import { SaveStore } from '../src/host/store.ts';
import { WorkAdapter } from '../src/host/work-adapter.ts';
import { emptyWorkRuntime, observeWork, settleWork } from '../src/host/work-runtime.ts';
import type { WorkEvent } from '../src/host/work-runtime.ts';
import type { Action } from '../src/protocol.ts';

const base = Date.UTC(2026, 8, 8), hash = (value: string) => createHash('sha256').update(value).digest('hex');
const at = (mono: number) => ({ mono, wall: base + mono });
function event(root: string, turn: number, seq: number, mono: number, kind: WorkEvent['kind'], completed = true, child = ''): WorkEvent {
  return { ...at(mono), root: hash(root), session: hash(child || root), turn, seq, kind, completed,
    endKey: kind === 'end' ? hash(`${root}/${turn}/${seq}`) : null };
}
const checksum = (save: unknown) => JSON.stringify({ save, checksum: hash(JSON.stringify(save)) });
async function cleanup(directory: string) {
  assert.equal(dirname(resolve(directory)), resolve(tmpdir())); assert.ok(basename(directory).startsWith('dsh-fisher-test-'));
  await rm(directory, { recursive: true, force: true });
}
function request(service: FisherService, action: Action) {
  const snapshot = service.snapshot();
  return { protocolVersion: 1, actionId: randomUUID(), clientId: 'work-test', saveId: snapshot.saveId,
    generation: service.generation, expectedRevision: snapshot.revision, action };
}
function action(service: FisherService, value: Action) { return service.mutate(request(service, value), false); }

test('work uses a lease union, completion fences, a durable turn cap, and a monotonic UTC bucket', () => {
  const work = emptyWork(); work.enabled = true;
  let runtime = emptyWorkRuntime(at(0));
  const emit = (value: WorkEvent) => observeWork(work, runtime, value, randomUUID);
  emit(event('a', 1, 0, 0, 'start')); emit(event('b', 1, 0, 0, 'start'));
  for (let seq = 1; seq <= 9; seq++) {
    emit(event('a', 1, seq, seq * 20000, 'activity'));
    emit(event('b', 1, seq, seq * 20000, 'activity'));
    emit(event('a', 1, seq, seq * 20000, 'activity', true, 'child'));
  }
  emit(event('a', 1, 10, 180000, 'end')); emit(event('b', 1, 10, 180000, 'end'));
  assert.equal(work.dailyPoints, 7); assert.equal(work.activeMs, 0);
  emit(event('a', 1, 11, 240000, 'end'));
  assert.equal(work.dailyPoints, 7, 'a second end cannot reopen a completed turn');
  emit(event('c', 1, 0, 240000, 'start')); emit(event('c', 1, 1, 241000, 'end'));
  assert.equal(work.packs.length, 1); assert.equal(work.points, 2);
  emit(event('c', 2, 2, 300000, 'start')); emit(event('c', 2, 3, 301000, 'end', false));
  assert.equal(work.dailyPoints, 12, 'failed turns earn no completion bonus');
  const before = work.dailyPoints;
  emit(event('long', 1, 0, 320000, 'start'));
  for (let seq = 1; seq <= 60; seq++) emit(event('long', 1, seq, 320000 + seq * 20000, 'activity'));
  assert.equal(work.dailyPoints, before + 12);
  const capped = work.activeMs;
  runtime = emptyWorkRuntime(at(2000000));
  emit(event('long', 1, 61, 2000000, 'activity'));
  settleWork(work, runtime, at(2030000), randomUUID);
  assert.equal(work.activeMs, capped, 'restart does not reset a remembered turn cap');
  emit(event('long', 1, 62, 2030000, 'end'));
  assert.equal(work.dailyPoints, before + 12, 'restart cannot infer the old start');
  const day = work.day;
  settleWork(work, runtime, { mono: 2031000, wall: base - UTC_DAY_MS }, randomUUID);
  assert.equal(work.day, day); assert.equal(work.dailyPoints, before + 12);
  settleWork(work, runtime, { mono: 2032000, wall: base + 40 * UTC_DAY_MS }, randomUUID);
  assert.equal(work.day, day + 40); assert.equal(work.dailyPoints, 0); assert.equal(work.activeMs, capped);
});

test('supplies stop at the daily and storage caps, and permission boundaries cut a lease', () => {
  const work = emptyWork(); work.enabled = true; work.day = base / UTC_DAY_MS;
  work.packs = Array.from({ length: 11 }, randomUUID); work.points = 9; work.dailyPoints = 119; work.activeMs = 179999;
  const runtime = emptyWorkRuntime(at(0));
  observeWork(work, runtime, event('cap', 1, 0, 0, 'start'), randomUUID);
  settleWork(work, runtime, at(1), randomUUID);
  assert.equal(work.packs.length, 12); assert.equal(work.dailyPoints, 120); assert.equal(work.points, 0);
  settleWork(work, runtime, at(30000), randomUUID); assert.equal(work.activeMs, 0);
  work.packs.pop();
  settleWork(work, runtime, { mono: UTC_DAY_MS, wall: base + UTC_DAY_MS }, randomUUID);
  observeWork(work, runtime, event('next', 1, 0, UTC_DAY_MS, 'start'), randomUUID);
  observeWork(work, runtime, event('next', 1, 1, UTC_DAY_MS + 1000, 'pause'), randomUUID);
  settleWork(work, runtime, at(UTC_DAY_MS + 100000), randomUUID);
  assert.equal(work.activeMs, 1000); assert.equal(work.dailyPoints, 0);
  const midnight = emptyWork(); midnight.enabled = true; midnight.day = base / UTC_DAY_MS;
  midnight.dailyPoints = 120;
  const cross = emptyWorkRuntime(at(UTC_DAY_MS - 10000));
  observeWork(midnight, cross, event('midnight', 1, 0, UTC_DAY_MS - 10000, 'start'), randomUUID);
  settleWork(midnight, cross, at(UTC_DAY_MS + 10000), randomUUID);
  assert.equal(midnight.dailyPoints, 0); assert.equal(midnight.activeMs, 10000, 'elapsed leases are split at the UTC boundary');
});

test('the DSH adapter projects metadata without accessing chat, chunks, arguments, or history', () => {
  const forbidden = () => { throw new Error('private payload was read'); };
  const root = { id: 'root-private-id', firstLiveSeq: 10, header: { get cwd() { return forbidden(); } } } as unknown as Session;
  const child = { id: 'child-private-id', firstLiveSeq: 0, header: { parentSession: root.id, origin: 'subagent' } } as Session;
  const sessions = { get: (id: string) => id === root.id ? root : undefined } as Pick<SessionStore, 'get'>;
  const emitted: WorkEvent[] = []; let now = at(0);
  const adapter = new WorkAdapter(sessions, value => emitted.push(value), () => now);
  adapter.observe(root, { type: 'turn/start', seq: 9, get data() { return forbidden(); } } as unknown as SessionEvent);
  adapter.observe(root, { type: 'user/message', get data() { return forbidden(); } } as unknown as SessionEvent);
  adapter.observe(root, { type: 'turn/start', seq: 10, data: { turn: 1 } } as SessionEvent);
  adapter.observe(root, { type: 'assistant/chunk', seq: 11, data: { turn: 1, get chunk() { return forbidden(); } } } as unknown as SessionEvent);
  adapter.observe(child, { type: 'tool/call', seq: 1, get data() { return forbidden(); } } as unknown as SessionEvent);
  now = at(1000);
  adapter.observe(child, { type: 'tool/call', seq: 2, data: { turn: 1, get name() { return forbidden(); }, get arguments() { return forbidden(); } } } as unknown as SessionEvent);
  adapter.observe(root, { type: 'approval/asked', seq: 12, get data() { return forbidden(); } } as unknown as SessionEvent);
  adapter.observe(root, { type: 'turn/end', seq: 13, data: { turn: 1, reason: { kind: 'error', get error() { return forbidden(); } } } } as unknown as SessionEvent);
  assert.deepEqual(emitted.map(value => value.kind), ['start', 'activity', 'activity', 'pause', 'end']);
  assert.equal(emitted.at(-1)?.completed, false); assert.equal(emitted[2]?.root, emitted[0]?.root);
  assert.equal(JSON.stringify(emitted).includes('private-id'), false);
  const orphan = { id: 'orphan', firstLiveSeq: 0, header: { parentSession: 'missing' } } as unknown as Session;
  adapter.observe(orphan, { type: 'turn/start', seq: 1, get data() { return forbidden(); } } as unknown as SessionEvent);
  const cyclic = { id: 'cycle', firstLiveSeq: 0, header: { parentSession: 'cycle' } } as unknown as Session;
  const cycleAdapter = new WorkAdapter({ get: () => cyclic } as Pick<SessionStore, 'get'>, () => assert.fail('cyclic parent accepted'), () => now);
  cycleAdapter.observe(cyclic, { type: 'turn/start', seq: 1 } as SessionEvent);
  assert.equal(emitted.length, 5);
});

test('work migration, disable, restart, claim retries and write failure preserve rewards', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-fisher-test-'));
  const old = emptySave() as unknown as Record<string, unknown>; old.formatVersion = 2; delete old.work; delete old.life;
  const original = checksum(old); await writeFile(join(directory, 'save.json'), original);
  let now = at(0), service = new FisherService(new SaveStore(directory), () => now);
  try {
    await service.initialize(); assert.equal(service.observingWork, false);
    assert.equal(await readFile(join(directory, 'save.before-v3.json'), 'utf8'), original);
    assert.equal(await readFile(join(directory, 'save.json'), 'utf8'), original);
    service.observe(event('ignored', 1, 0, 0, 'start'), service.workEpoch); await service.flushWork();
    assert.equal(service.snapshot().work.points, 0);
    await action(service, { type: 'work.enable', enabled: true });
    const emit = (value: WorkEvent) => { now = { wall: value.wall, mono: value.mono }; service.observe(value, service.workEpoch); };
    emit(event('task', 1, 0, 0, 'start')); emit(event('task', 1, 1, 1000, 'end'));
    emit(event('task', 2, 2, 61000, 'start')); emit(event('task', 2, 3, 62000, 'end'));
    await service.flushWork(); assert.equal(service.snapshot().work.packs.length, 1);
    const claim = request(service, { type: 'work.claim', packId: service.snapshot().work.packs[0]!, bait: 'B05' });
    const originalWrite = service.store.write.bind(service.store); service.store.write = async () => { throw new Error('injected disk failure'); };
    await assert.rejects(service.mutate(claim, false), /保存没有完成/);
    assert.equal(service.snapshot().work.packs.length, 1); assert.equal(service.snapshot().coins, 100);
    assert.equal(service.observingWork, false);
    service.store.write = originalWrite; await action(service, { type: 'save.retry' });
    await service.mutate(claim, false); await service.mutate(claim, false);
    assert.equal(service.snapshot().coins, 120); assert.equal(service.snapshot().tokens, 1); assert.equal(service.snapshot().journey.baits.B05, 2);
    await action(service, { type: 'work.enable', enabled: false });
    emit(event('task', 3, 4, 130000, 'start')); emit(event('task', 3, 5, 131000, 'end')); await service.flushWork();
    assert.equal(service.snapshot().work.points, 0);
    await action(service, { type: 'work.enable', enabled: true });
    emit(event('running', 1, 0, 150000, 'start')); await service.flushWork(); await service.close();
    now = at(5000000); service = new FisherService(new SaveStore(directory), () => now); await service.initialize();
    assert.equal(service.observingWork, true);
    const progress = service.snapshot().work.activeMs;
    emit(event('running', 1, 1, 5000000, 'activity')); emit(event('running', 1, 2, 5001000, 'end')); await service.flushWork();
    assert.equal(service.snapshot().work.activeMs, progress + 1000); assert.equal(service.snapshot().work.points, 0);
    emit(event('running', 1, 2, 5100000, 'end')); await service.flushWork();
    assert.equal(service.snapshot().work.points, 0);
  } finally { await service.close(); await cleanup(directory); }
});
