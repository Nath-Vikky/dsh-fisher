import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {FisherService} from '../src/host/service.ts';
import {SaveStore} from '../src/host/store.ts';
import type {Action} from '../src/protocol.ts';

test('plugin switch persists, fences an active cast and stops work without resetting progress',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'dsh-fisher-settings-'));
  let service=new FisherService(new SaveStore(directory));
  const action=(value:Action)=>{const data=service.snapshot();return service.mutate({protocolVersion:1,actionId:randomUUID(),clientId:'settings-test',saveId:data.saveId,generation:data.generation,expectedRevision:data.revision,action:value},false);};
  try{
    await service.initialize();await action({type:'work.enable',enabled:true});await action({type:'cast.begin',mode:'assisted'});
    const before=service.snapshot();assert.ok(before.active);assert.equal(service.observingWork,true);
    await service.setEnabled({enabled:false});const paused=service.snapshot();
    assert.equal(paused.active?.id,before.active.id);assert.equal(paused.active?.paused,true);assert.ok(paused.active!.ownerEpoch>before.active.ownerEpoch);
    assert.equal(paused.coins,before.coins);assert.equal(paused.saveId,before.saveId);assert.deepEqual(paused.inventory,before.inventory);
    assert.equal(service.observingWork,false);assert.equal(paused.work.enabled,true);assert.equal(paused.gameplayAvailable,false);
    await assert.rejects(action({type:'cast.resume',castId:before.active.id}),/启用摸鱼海岸/);
    await service.close();service=new FisherService(new SaveStore(directory));await service.initialize();
    assert.equal(service.preferences().enabled,false);assert.equal(service.observingWork,false);
    assert.equal(service.snapshot().active?.id,before.active.id);
    await service.setEnabled({enabled:true});assert.equal(service.observingWork,true);assert.equal(service.snapshot().gameplayAvailable,true);
    assert.equal(service.snapshot().active?.paused,true);
    await action({type:'cast.resume',castId:before.active.id});assert.equal(service.snapshot().active?.paused,false);
  }finally{
    await service.close();assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('dsh-fisher-settings-'));await rm(directory,{recursive:true,force:true});
  }
});
