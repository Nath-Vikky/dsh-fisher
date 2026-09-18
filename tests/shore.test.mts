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
import type { Action,ActionRequest,InputRequest } from '../src/protocol.ts';
import { step,initialSimulation,replay } from '../src/game/engine.ts';
import { modifiers } from '../src/game/gear.ts';

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

async function land(s:FisherService,spot:'pier'|'cove') {
  await send(s,{type:'shore.spot',spot});await send(s,{type:'cast.begin',mode:'assisted'});
  for(let tries=0;s.snapshot().active&&tries<100;tries++){
    const cast=s.snapshot().active!;
    if(cast.simulation.phase==='recovery'){await send(s,{type:'cast.recover',castId:cast.id,ownerEpoch:cast.ownerEpoch});break;}
    let sim={...cast.simulation};const edges:InputRequest['edges']=[];
    while(sim.tick<cast.simulation.tick+80&&!['caught','escaped','recovery','bite'].includes(sim.phase)){
      if(!sim.reel)edges.push({tick:sim.tick+1,reel:true});sim=step(sim,cast.challenge,true);
    }
    const {action:_,...envelope}=request(s,{type:'save.retry'});
    await s.mutate({...envelope,castId:cast.id,ownerEpoch:cast.ownerEpoch,expectedCastRevision:cast.castRevision,fromTick:cast.simulation.tick,inputCursor:cast.inputCursor,toTick:sim.tick,edges,command:sim.phase==='bite'?'hook':'checkpoint'},true);
  }
  const item=s.snapshot().pending;assert.ok(item);await send(s,{type:'catch.resolve',catchId:item.id,choice:'keep'});
}
test('bottle story persists through the catch loop and the building spends explicitly donated fish only once',async()=>{
  const save=emptySave();save.journey.totalCaught=2;
  for(let i=0;i<2;i++)save.inventory.push({...rollEncounter(50,`wood-${i}`,'assisted',save.journey,[]).catch,caughtAt:new Date().toISOString(),isRecord:true});
  await fixture(async(s)=>{
    await assert.rejects(send(s,{type:'shore.read'}),/还未发现/);
    await land(s,'cove');assert.equal(s.snapshot().shore.story,'quiet');assert.equal(s.snapshot().shore.searched,1);
    await land(s,'cove');assert.equal(s.snapshot().shore.story,'bottle');
    const reloaded=decodeSave(await s.exportSave()).save;assert.equal(reloaded.shore.story,'bottle');
    await send(s,{type:'shore.read'});await land(s,'cove');assert.equal(s.snapshot().shore.story,'charted');
    await land(s,'pier');assert.equal(s.snapshot().shore.story,'recovered');
    await assert.rejects(send(s,{type:'shore.donate',catchId:'wood-0'}),/单独确认/);
    await send(s,{type:'inventory.lock',catchId:'wood-0',locked:true});
    await assert.rejects(send(s,{type:'shore.donate',catchId:'wood-0',confirmed:true}),/解锁/);
    await send(s,{type:'inventory.lock',catchId:'wood-0',locked:false});
    const donation=request(s,{type:'shore.donate',catchId:'wood-0',confirmed:true});await s.mutate(donation,false);await s.mutate(donation,false);
    assert.equal(s.snapshot().shore.timber,1);await send(s,{type:'shore.donate',catchId:'wood-1',confirmed:true});
    const before=s.snapshot(),build=request(s,{type:'shore.build'});await s.mutate(build,false);await s.mutate(build,false);
    assert.equal(s.snapshot().coins,before.coins-30);assert.equal(s.snapshot().shore.story,'built');assert.equal(s.snapshot().shore.timber,0);
    assert.deepEqual(s.snapshot().catalog,before.catalog);await assert.rejects(send(s,{type:'shore.build'}),/备齐/);
    assert.equal(decodeSave(await s.exportSave()).save.shore.story,'built');
  },save);
});
test('companion is collection-gated and changing it never rewrites a committed challenge',async()=>{
  await fixture(async(s)=>{await assert.rejects(send(s,{type:'shore.companion',companion:'A002'}),/先在图鉴/);});
  const save=emptySave();save.catalog.A002={count:1,bestLengthMm:300,bestWeightG:500,variants:{original:1}};
  await fixture(async(s)=>{
    await send(s,{type:'shore.companion',companion:'A002'});await send(s,{type:'cast.begin',mode:'standard'});
    const frozen=s.snapshot().active!.challenge;assert.equal(frozen.guard,'A002');
    await send(s,{type:'shore.companion',companion:null});assert.deepEqual(s.snapshot().active!.challenge,frozen);
    assert.equal(decodeSave(await s.exportSave()).save.active!.challenge.guard,'A002');
  },save);
});
test('the guard absorbs one burst, persists in replay, and cannot recharge on later bursts',()=>{
  const challenge={seed:0,waitTicks:50,pattern:'dart',mode:'standard',rulesVersion:2,modifiers:modifiers({rod:'D01',line:'N01',float:'U01'}),size:500,guard:'A002'} as const;
  const start={...initialSimulation(),phase:'fighting',tick:100,fightTicks:79,tension:600000,reel:true} as const;
  const guarded=step(start,challenge,true),plain=step(start,{...challenge,guard:undefined},true);
  assert.equal(guarded.guardUsed,true);assert.equal(guarded.guardTicks,24);assert.ok(guarded.tension<plain.tension-150000);
  let direct=guarded;for(let i=0;i<30;i++)direct=step(direct,challenge,false);
  assert.deepEqual(replay(guarded,challenge,guarded.tick+30,[{tick:guarded.tick+1,reel:false}]),direct);
  assert.equal(direct.guardTicks,0);
  const later=step({...direct,phase:'fighting',fightTicks:239,tension:600000,danger:80000},challenge,true);
  assert.equal(later.guardTicks,0);assert.ok(later.tension>600000);
});
