import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID,createHash } from 'node:crypto';
import { mkdir,mkdtemp,rm,writeFile } from 'node:fs/promises';
import { resolve,join,relative,isAbsolute } from 'node:path';
import { emptySave,upgradeSave } from '../src/host/model.ts';
import type { Save } from '../src/host/model.ts';
import { SaveStore } from '../src/host/store.ts';
import { FisherService } from '../src/host/service.ts';
import { encodeSave,decodeSave } from '../src/host/save-codec.ts';
import { categoryProbabilities,rollEncounter } from '../src/game/encounters.ts';
import type { Action,ActionRequest } from '../src/protocol.ts';

const root=resolve(import.meta.dirname,'../tmp');
function request(s:FisherService,action:Action):ActionRequest {
  const data=s.snapshot();return {protocolVersion:1,actionId:randomUUID(),clientId:'shore-test',saveId:data.saveId,generation:data.generation,expectedRevision:data.revision,action};
}
const send=(s:FisherService,action:Action)=>s.mutate(request(s,action),false);
async function fixture(run:(s:FisherService,dir:string)=>Promise<void>,save=emptySave()) {
  await mkdir(root,{recursive:true});const dir=await mkdtemp(join(root,'shore-'));await writeFile(join(dir,'save.json'),encodeSave(save));
  const s=new FisherService(new SaveStore(dir));await s.initialize();
  try{await run(s,dir);}finally{await s.close();const path=relative(root,dir);assert.ok(path&&!path.startsWith('..')&&!isAbsolute(path));await rm(dir,{recursive:true,force:true});}
}
test('spot choice survives restart and freezes into a cast; a retry cannot change its encounter',async()=>{
  await fixture(async(s,dir)=>{
    const action=request(s,{type:'shore.spot',spot:'cove'});await s.mutate(action,false);assert.equal((await s.mutate(action,false)).duplicate,true);
    await send(s,{type:'cast.begin',mode:'assisted'});const frozen=decodeSave(await s.exportSave()).save.active!;
    assert.equal(frozen.meta.spot,'cove');assert.equal(frozen.catch.speciesId,'F001');
    await assert.rejects(send(s,{type:'shore.spot',spot:'pier'}),/先结束/);
    assert.deepEqual(decodeSave(await s.exportSave()).save.active,frozen);
    await s.close();const reopened=new FisherService(new SaveStore(dir));await reopened.initialize();
    try{assert.equal(reopened.snapshot().shore.spots.L01,'cove');assert.deepEqual(decodeSave(await reopened.exportSave()).save.active?.catch,frozen.catch);}finally{await reopened.close();}
  });
});
test('v5 migration preserves an existing cast, inventory and catalog without rerolling',async()=>{
  await fixture(async(s)=>{
    await send(s,{type:'cast.begin',mode:'assisted'});const save=decodeSave(await s.exportSave()).save;
    const old=structuredClone(save) as unknown as Record<string,unknown>;old.formatVersion=5;delete old.shore;
    const active=old.active as Save['active'];delete active!.meta.spot;
    const upgraded=upgradeSave(old);assert.deepEqual(upgraded.active,active);assert.deepEqual(upgraded.inventory,old.inventory);assert.deepEqual(upgraded.catalog,old.catalog);
    assert.equal(upgraded.shore.spots.L01,'pier');assert.equal(old.formatVersion,5);
  });
});
test('water clues change actual encounter odds while directed catches and other coasts stay intact',()=>{
  const shallow=categoryProbabilities('L01','B01','calm','cove'),deep=categoryProbabilities('L01','B01','calm','pier');
  assert.ok(shallow[0]!>deep[0]!);assert.ok(deep[1]!>shallow[1]!);assert.ok(deep[2]!>shallow[2]!);
  assert.deepEqual(categoryProbabilities('L02','B01','calm','cove'),categoryProbabilities('L02','B01','calm','pier'));
  const j=emptySave().journey;j.tutorialDone=true;j.bait='B07';j.target='A002';j.completed.L01=10;
  for(const spot of ['pier','cove'] as const){const rolled=rollEncounter(98,'same','assisted',j,[],spot);assert.equal(rolled.catch.speciesId,'A002');assert.equal(rolled.meta.source,'target');}
  j.bait='B01';j.target=null;
  let different=0;for(let seed=0;seed<100;seed++)if(rollEncounter(seed,'a','assisted',j,[],'cove').catch.speciesId!==rollEncounter(seed,'a','assisted',j,[],'pier').catch.speciesId)different++;
  assert.ok(different>10);
});
