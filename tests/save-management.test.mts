import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash,randomUUID } from 'node:crypto';
import { mkdir,mkdtemp,readFile,writeFile,rm } from 'node:fs/promises';
import { resolve,join,relative,isAbsolute } from 'node:path';
import { FisherService } from '../src/host/service.ts';
import { SaveStore } from '../src/host/store.ts';
import { decodeSave,encodeSave,MAX_SAVE_BYTES } from '../src/host/save-codec.ts';
import { emptySave } from '../src/host/model.ts';
import type { Action,ActionRequest } from '../src/protocol.ts';

const temporary=resolve(import.meta.dirname,'../tmp');
async function fixture(run:(directory:string,open:()=>Promise<FisherService>)=>Promise<void>) {
  await mkdir(temporary,{recursive:true});const directory=await mkdtemp(join(temporary,'save-management-')),services:FisherService[]=[];
  const open=async()=>{const service=new FisherService(new SaveStore(directory));services.push(service);await service.initialize();return service;};
  try{await run(directory,open);}finally{
    for(const service of services)await service.close();
    const within=relative(temporary,directory);assert.ok(within&&!within.startsWith('..')&&!isAbsolute(within));
    await rm(directory,{recursive:true,force:true});
  }
}
function request(service:FisherService,action:Action):ActionRequest {
  const state=service.snapshot();return {protocolVersion:1,actionId:randomUUID(),clientId:randomUUID(),saveId:state.saveId,generation:state.generation,expectedRevision:state.revision,action};
}
const send=(service:FisherService,action:Action)=>service.mutate(request(service,action),false);

test('save files reject corruption, excessive size and future formats before replacement',async()=>{
  const original=encodeSave(emptySave());assert.equal(decodeSave(original).save.coins,100);
  assert.throws(()=>decodeSave(original.replace('"coins":100','"coins":999')),/CHECKSUM/);
  assert.throws(()=>decodeSave(' '.repeat(MAX_SAVE_BYTES+1)),/TOO_LARGE/);
  await fixture(async(directory,open)=>{
    const future=original.replace('"formatVersion":4','"formatVersion":999');await writeFile(join(directory,'save.json'),future);
    const service=await open();assert.equal(service.snapshot().gameplayAvailable,false);
    assert.equal(await service.exportSave(),future);assert.equal(await readFile(join(directory,'save.json'),'utf8'),future);
    await assert.rejects(service.previewSave({source:'file',text:future}));
    const preview=await service.previewSave({source:'file',text:original});await send(service,{type:'save.import',previewId:preview.id,confirmed:true});
    assert.equal(service.snapshot().gameplayAvailable,true);assert.equal(await readFile(join(directory,'save.before-restore.1.json'),'utf8'),future);
  });
});

test('import preserves a committed encounter, disables observation, invalidates old windows and is idempotent',async()=>{
  await fixture(async(directory,open)=>{
    const service=await open();await send(service,{type:'work.enable',enabled:true});await send(service,{type:'cast.begin',mode:'assisted'});
    const exported=await service.exportSave(),frozen=decodeSave(exported).save.active!,oldId=service.snapshot().saveId;
    const stale=request(service,{type:'work.enable',enabled:true});
    const preview=await service.previewSave({source:'file',text:exported}),action=request(service,{type:'save.import',previewId:preview.id,confirmed:true});
    await service.mutate(action,false);const restored=decodeSave(await service.exportSave()).save;
    assert.notEqual(restored.id,oldId);assert.equal(restored.work.enabled,false);assert.equal(service.observingWork,false);
    assert.equal(restored.active?.paused,true);assert.deepEqual(restored.active?.catch,frozen.catch);assert.equal(restored.active?.seed,frozen.seed);
    assert.deepEqual(restored.active?.challenge,frozen.challenge);assert.equal((await service.mutate(action,false)).duplicate,true);
    await assert.rejects(service.mutate(stale,false),/连接已变化/);
    assert.equal(JSON.parse(await readFile(join(directory,'disabled.json'),'utf8')).workDisabled,true);
    await service.close();const restarted=await open();assert.equal(restarted.snapshot().work.enabled,false);
    await send(restarted,{type:'work.enable',enabled:true});assert.equal(restarted.observingWork,true);
    await assert.rejects(readFile(join(directory,'disabled.json')),/ENOENT/);
  });
});

test('delete clears only enumerated game files and a durable reset intent survives restart',async()=>{
  await fixture(async(directory,open)=>{
    let service=await open();await send(service,{type:'work.enable',enabled:true});
    await writeFile(join(directory,'save.before-v4.json'),await service.exportSave());
    await writeFile(join(directory,'save.before-content3.json'),await service.exportSave());await writeFile(join(directory,'saveXbackupYjson'),'keep');
    const original=await readFile(join(directory,'save.json'),'utf8');await assert.rejects(send(service,{type:'save.delete',confirmation:'删除'}));
    assert.equal(await readFile(join(directory,'save.json'),'utf8'),original);
    const deletion=request(service,{type:'save.delete',confirmation:'删除摸鱼海岸'});await service.mutate(deletion,false);
    assert.equal((await service.mutate(deletion,false)).duplicate,true);assert.equal(service.snapshot().coins,100);assert.equal(service.snapshot().work.enabled,false);
    await assert.rejects(readFile(join(directory,'save.before-v4.json')),/ENOENT/);
    await assert.rejects(readFile(join(directory,'save.before-content3.json')),/ENOENT/);assert.equal(await readFile(join(directory,'saveXbackupYjson'),'utf8'),'keep');
    await send(service,{type:'work.enable',enabled:true});await service.close();
    const resetId=randomUUID();await writeFile(join(directory,'disabled.json'),JSON.stringify({version:1,workDisabled:true,resetId}));
    service=await open();assert.equal(service.snapshot().saveId,resetId);assert.equal(service.snapshot().work.enabled,false);
    assert.equal(JSON.parse(await readFile(join(directory,'disabled.json'),'utf8')).resetId,undefined);
    assert.equal(decodeSave(await readFile(join(directory,'save.backup.json'),'utf8')).save.id,resetId);
  });
});

test('content upgrade preserves a committed encounter and archives the exact old file',async()=>{
  await fixture(async(directory,open)=>{
    const initial=emptySave();initial.journey.tutorialDone=true;initial.journey.completed.L01=10;initial.journey.totalCaught=10;
    initial.journey.bait='B07';initial.journey.target='A001';initial.journey.baits.B07=1;
    await writeFile(join(directory,'save.json'),encodeSave(initial));
    const before=await open();await send(before,{type:'cast.begin',mode:'assisted'});
    const frozen=decodeSave(await before.exportSave()).save;assert.equal(frozen.active?.catch.speciesId,'A001');await before.close();
    const legacy={...frozen,contentVersion:2};
    const raw=JSON.stringify({checksum:createHash('sha256').update(JSON.stringify(legacy)).digest('hex'),save:legacy});
    await writeFile(join(directory,'save.json'),raw);
    const upgraded=await open();assert.equal(upgraded.snapshot().gameplayAvailable,true);
    assert.equal(await readFile(join(directory,'save.before-content3.json'),'utf8'),raw);
    await send(upgraded,{type:'work.enable',enabled:true});
    const current=decodeSave(await upgraded.exportSave()).save;
    assert.equal(current.contentVersion,3);assert.equal(current.id,frozen.id);
    assert.deepEqual(current.active?.catch,frozen.active?.catch);assert.equal(current.active?.seed,frozen.active?.seed);
    assert.deepEqual(current.active?.challenge,frozen.active?.challenge);
  });
});

test('a second writer cannot import or delete, and a damaged primary keeps its valid recovery snapshot',async()=>{
  await fixture(async(directory,open)=>{
    const writer=await open(),other=await open();assert.equal(other.snapshot().storage.canManage,false);
    await assert.rejects(other.previewSave({source:'file',text:encodeSave(emptySave())}));
    await assert.rejects(send(other,{type:'save.delete',confirmation:'删除摸鱼海岸'}));
    const snapshot=decodeSave(await writer.exportSave()).save;snapshot.coins=321;await writer.close();await other.close();
    await writeFile(join(directory,'save.backup.json'),encodeSave(snapshot));await writeFile(join(directory,'save.json'),'broken primary');
    const damaged=await open();assert.equal(damaged.snapshot().coins,321);assert.equal(damaged.snapshot().gameplayAvailable,false);
    const preview=await damaged.previewSave({source:'backup'});await send(damaged,{type:'save.import',previewId:preview.id,confirmed:true});
    assert.equal(damaged.snapshot().coins,321);assert.equal(await readFile(join(directory,'save.before-restore.1.json'),'utf8'),'broken primary');
    assert.equal(decodeSave(await readFile(join(directory,'save.backup.json'),'utf8')).save.coins,321);
  });
});
