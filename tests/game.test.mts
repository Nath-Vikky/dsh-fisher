import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { encounter, initialSimulation, randomStream, replay, step } from '../src/game/engine.ts';
import { species } from '../src/game/content.ts';
import type { InputEdge } from '../src/game/engine.ts';
import type { Action, ActionRequest, InputRequest } from '../src/protocol.ts';
import { FisherService } from '../src/host/service.ts';
import { SaveStore } from '../src/host/store.ts';

const clientId = 'test-client';
async function cleanup(directory: string) {
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  assert.ok(basename(directory).startsWith('dsh-fisher-test-'));
  await rm(directory, { recursive: true, force: true });
}
function envelope(service: FisherService) {
  const data = service.snapshot();
  return { protocolVersion: 1 as const, actionId: randomUUID(), clientId, saveId: data.saveId,
    generation: data.generation, expectedRevision: data.revision };
}
function request(service: FisherService, action: Action): ActionRequest { return { ...envelope(service), action }; }
function action(service: FisherService, action: Action) { return service.mutate(request(service, action), false); }
function checkpoint(service: FisherService, command: InputRequest['command'] = 'checkpoint', ticks = 40): InputRequest {
  const cast = service.snapshot().active!;
  let sim = cast.simulation;
  const edges: InputEdge[] = [];
  for (let index = 0; index < ticks && !['bite', 'caught', 'escaped'].includes(sim.phase); index++) {
    const reel = sim.phase === 'fighting';
    if (reel !== sim.reel) edges.push({ tick: sim.tick + 1, reel });
    sim = step(sim, cast.challenge, reel);
  }
  return { ...envelope(service), castId: cast.id, ownerEpoch: cast.ownerEpoch, expectedCastRevision: cast.castRevision,
    fromTick: cast.simulation.tick, inputCursor: cast.inputCursor, toTick: sim.tick, edges, command };
}
async function catchOne(service: FisherService, attempt=0): Promise<NonNullable<ReturnType<FisherService['snapshot']>['pending']>> {
  if (!service.snapshot().active) await action(service, { type: 'cast.begin', mode: 'assisted' });
  for (let batch = 0; batch < 100 && service.snapshot().active; batch++) {
    const cast = service.snapshot().active!;
    await service.mutate(checkpoint(service, cast.simulation.phase === 'bite' ? 'hook' : 'checkpoint'), true);
  }
  assert.ok(service.snapshot().pending, 'assisted fishing should produce a pending catch');
  const pending=service.snapshot().pending!;
  if (!species(pending.speciesId).creature) {
    assert.ok(attempt<10,'transaction fixture needs a creature');
    await action(service,{type:'catch.resolve',catchId:pending.id,choice:'keep'});
    return catchOne(service,attempt+1);
  }
  return service.snapshot().pending!;
}

test('seeded encounter and input replay remain identical across checkpoint boundaries', () => {
  const selected = encounter(4221, 'catch', 'assisted');
  assert.deepEqual(selected, encounter(4221, 'catch', 'assisted'));
  const before = randomStream(4221, 'size')();
  const behavior = randomStream(4221, 'behavior');
  for (let i = 0; i < 30; i++) behavior();
  assert.equal(before, randomStream(4221, 'size')());
  const start = { ...initialSimulation(), phase: 'fighting' as const };
  const edges = [{ tick: 1, reel: true }, { tick: 50, reel: false }, { tick: 80, reel: true }];
  const whole = replay(start, selected.challenge, 150, edges);
  const split = replay(replay(start, selected.challenge, 60, edges.slice(0, 2)), selected.challenge, 150, edges.slice(2));
  assert.deepEqual(whole, split);
  const stopped = { ...start, phase: 'bite' as const };
  assert.deepEqual(step(stopped, selected.challenge, true), stopped);
  assert.throws(() => replay(stopped, selected.challenge, 1, []));
});

test('one writer, restart with the same cast, ownership fencing, and exactly-once sale', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-fisher-test-'));
  let service = new FisherService(new SaveStore(directory));
  const competing = new FisherService(new SaveStore(directory));
  try {
    await service.initialize();
    await action(service, { type: 'cast.begin', mode: 'assisted' });
    await service.mutate(checkpoint(service, 'pause', 20), true);
    const before = service.snapshot();
    assert.ok(before.active?.paused);
    assert.equal('catch' in before.active!, false, 'unrevealed catch must stay private');
    await competing.initialize();
    assert.equal(competing.snapshot().gameplayAvailable, false);
    await assert.rejects(action(competing, { type: 'cast.begin', mode: 'assisted' }));
    await competing.close();
    const privateBefore = JSON.parse(await readFile(join(directory, 'save.json'), 'utf8')).save.active;
    await service.close();
    service = new FisherService(new SaveStore(directory));
    await service.initialize();
    assert.equal(service.snapshot().active?.id, before.active?.id);
    assert.deepEqual(service.snapshot().active?.simulation, before.active?.simulation);
    const castId = service.snapshot().active!.id;
    await action(service, { type: 'cast.resume', castId });
    const now = Date.now;
    try {
      Date.now = () => now() + 16000;
      await assert.rejects(service.mutate(checkpoint(service), true), /操作连接已暂停/);
    } finally { Date.now = now; }
    const stale = checkpoint(service);
    await service.mutate({ ...request(service, { type: 'cast.resume', castId }), clientId: 'second-client' }, false);
    await assert.rejects(service.mutate(stale, true), /另一个窗口/);
    await action(service, { type: 'cast.resume', castId });
    const privateAfter = JSON.parse(await readFile(join(directory, 'save.json'), 'utf8')).save.active;
    assert.deepEqual(privateAfter.catch, privateBefore.catch);
    const item = await catchOne(service);
    const coins = service.snapshot().coins;
    const sale = request(service, { type: 'catch.resolve', catchId: item.id, choice: 'sell', confirmed:true });
    const [first, duplicate] = await Promise.all([service.mutate(sale, false), service.mutate(sale, false)]);
    assert.equal(first.duplicate, false); assert.equal(duplicate.duplicate, true);
    assert.equal(service.snapshot().coins, coins + item.price);
    await assert.rejects(action(service, { type: 'catch.resolve', catchId: item.id, choice: 'sell' }));
    assert.equal(service.snapshot().catalog[item.speciesId]?.count, 1);
    await service.close(); service = new FisherService(new SaveStore(directory)); await service.initialize();
    assert.equal(service.snapshot().coins, coins + item.price);
    assert.equal((await service.mutate(sale, false)).duplicate, true, 'receipt survives a host generation change');
    const another = await catchOne(service);
    await action(service, { type: 'catch.resolve', catchId: another.id, choice: 'keep' });
    const release = request(service, { type: 'inventory.resolve', catchId: another.id, choice: 'release', confirmed:true });
    await service.mutate(release, false); await service.mutate(release, false);
    assert.equal(service.snapshot().released, 1); assert.equal(service.snapshot().inventory.length, 0);
  } finally { await service.close(); await competing.close(); await cleanup(directory); }
});

test('failed disk writes cannot award income; corrupt and newer saves are preserved', async () => {
  class FaultStore extends SaveStore {
    fail = false;
    override async write(save: Parameters<SaveStore['write']>[0]) {
      if (this.fail) throw new Error('simulated ENOSPC');
      await super.write(save);
    }
  }
  const directory = await mkdtemp(join(tmpdir(), 'dsh-fisher-test-'));
  const store = new FaultStore(directory);
  const service = new FisherService(store);
  let reader: FisherService | undefined;
  try {
    await service.initialize();
    const item = await catchOne(service);
    const coins = service.snapshot().coins;
    const sale = request(service, { type: 'catch.resolve', catchId: item.id, choice: 'sell', confirmed:true });
    const disk = await readFile(join(directory, 'save.json'), 'utf8');
    store.fail = true;
    await assert.rejects(service.mutate(sale, false), /保存没有完成/);
    assert.equal(service.snapshot().coins, coins);
    assert.equal(service.snapshot().pending?.id, item.id);
    assert.equal(await readFile(join(directory, 'save.json'), 'utf8'), disk);
    store.fail = false; await action(service, { type: 'save.retry' }); await service.mutate(sale, false);
    assert.equal(service.snapshot().coins, coins + item.price);
    await service.close();
    const future = JSON.parse(await readFile(join(directory, 'save.json'), 'utf8'));
    future.save.formatVersion = 99;
    const futureText = JSON.stringify(future);
    await writeFile(join(directory, 'save.json'), futureText);
    reader = new FisherService(new SaveStore(directory)); await reader.initialize();
    assert.equal(reader.snapshot().gameplayAvailable, false);
    assert.equal(await readFile(join(directory, 'save.json'), 'utf8'), futureText);
    await reader.close();
    await writeFile(join(directory, 'save.json'), '{broken');
    reader = new FisherService(new SaveStore(directory)); await reader.initialize();
    assert.equal(reader.snapshot().gameplayAvailable, false);
    assert.equal(await readFile(join(directory, 'save.json'), 'utf8'), '{broken');
  } finally { await reader?.close(); await service.close(); await cleanup(directory); }
});

test('another process holds the writer lock until the OS releases it on process exit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-fisher-test-'));
  const child = fork(new URL('./writer-child.mts', import.meta.url), [directory], {
    execArgv: ['--experimental-strip-types'], stdio: ['ignore', 'ignore', 'inherit', 'ipc'], windowsHide: true,
  });
  let reader = new FisherService(new SaveStore(directory));
  try {
    const ready = new AbortController();
    const timeout = setTimeout(() => ready.abort(), 5000);
    try { await once(child, 'message', { signal: ready.signal }); } finally { clearTimeout(timeout); }
    await reader.initialize(); assert.equal(reader.snapshot().gameplayAvailable, false);
    await reader.close();
    const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
    reader = new FisherService(new SaveStore(directory)); await reader.initialize();
    assert.equal(reader.snapshot().gameplayAvailable, true);
    await action(reader, { type: 'cast.begin', mode: 'assisted' });
  } finally {
    if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; }
    await reader.close(); await cleanup(directory);
  }
});
