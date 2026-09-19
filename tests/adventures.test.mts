import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {emptySave,upgradeSave,validateSave} from '../src/host/model.ts';
import type {Save} from '../src/host/model.ts';
import {encodeSave,decodeSave} from '../src/host/save-codec.ts';
import {SaveStore} from '../src/host/store.ts';
import {FisherService} from '../src/host/service.ts';
import {rollEncounter} from '../src/game/encounters.ts';
import {recordAdventureCatch,legendPause,legendEligible} from '../src/game/adventures.ts';
import {automaticSpot} from '../src/game/auto-fishing.ts';
import {step} from '../src/game/engine.ts';
import type {Action,ActionRequest,InputRequest} from '../src/protocol.ts';

const root=resolve(import.meta.dirname,'../tmp');
function request(s:FisherService,action:Action):ActionRequest{const d=s.snapshot();return {protocolVersion:1,actionId:randomUUID(),clientId:'adventure-test',saveId:d.saveId,generation:d.generation,expectedRevision:d.revision,action};}
const send=(s:FisherService,action:Action)=>s.mutate(request(s,action),false);
async function fixture(save:Save,run:(s:FisherService,dir:string)=>Promise<void>){
  await mkdir(root,{recursive:true});const dir=await mkdtemp(join(root,'adventure-'));await writeFile(join(dir,'save.json'),encodeSave(save));const s=new FisherService(new SaveStore(dir));await s.initialize();
  try{await run(s,dir);}finally{await s.close();const sub=relative(root,dir);assert.ok(sub&&!sub.startsWith('..')&&!isAbsolute(sub));await rm(dir,{recursive:true,force:true});}
}
function progressed(){const save=emptySave();save.experience=100000;save.research=49;save.journey.tutorialDone=true;save.shore.story='built';save.shore.searched=2;return save;}

test('v10 migration backs up exact source bytes and preserves an in-flight catch and selections',async()=>{
  await fixture(emptySave(),async(s,dir)=>{
    await send(s,{type:'cast.begin',mode:'assisted'});const save=decodeSave(await s.exportSave()).save;await s.close();
    const {adventures:_,...rest}=save,old={...rest,formatVersion:10};const body=JSON.stringify(old),text=JSON.stringify({save:old,checksum:createHash('sha256').update(body).digest('hex')});
    const migrated=upgradeSave(old);assert.deepEqual(migrated.active,old.active);assert.deepEqual(migrated.inventory,old.inventory);assert.deepEqual(migrated.journey,old.journey);
    await writeFile(join(dir,'save.json'),text);const reopened=new FisherService(new SaveStore(dir));await reopened.initialize();
    try{assert.equal(await readFile(join(dir,'save.before-v11.json'),'utf8'),text);assert.equal(await readFile(join(dir,'save.json'),'utf8'),text);assert.deepEqual(decodeSave(await reopened.exportSave()).save.active,save.active);}finally{await reopened.close();}
  });
});
test('legend clues enforce location and preparation; a committed encounter survives reload and completes once',async()=>{
  const save=progressed();
  await fixture(save,async(s,dir)=>{
    await send(s,{type:'legend.hear'});let state=decodeSave(await s.exportSave()).save;
    recordAdventureCatch(state.adventures,{source:'random',region:'L03',tide:'calm',bait:'B01',spot:'cove'});assert.equal(state.adventures.legend.moon,false);
    recordAdventureCatch(state.adventures,{source:'random',region:'L03',tide:'glow',bait:'B01',spot:'cove'});
    recordAdventureCatch(state.adventures,{source:'random',region:'L04',tide:'calm',bait:'B01',spot:'pier'});assert.equal(state.adventures.legend.deep,false);
    recordAdventureCatch(state.adventures,{source:'random',region:'L04',tide:'calm',bait:'B06',spot:'pier'});assert.equal(state.adventures.legend.stage,'ready');
    state.journey.region='L04';state.journey.bait='B06';state.journey.baits.B06=2;state.journey.tideOverride={tide:'glow',remaining:3};
    await s.close();await writeFile(join(dir,'save.json'),encodeSave(state));const next=new FisherService(new SaveStore(dir));await next.initialize();
    try{
      assert.match(legendPause(next.snapshot().adventures,next.snapshot().journey)!,/准备/);await send(next,{type:'legend.arm'});
      assert.equal(legendEligible(next.snapshot().adventures,next.snapshot().journey,'cove'),false);assert.equal(legendEligible(next.snapshot().adventures,next.snapshot().journey,'pier'),true);
      await send(next,{type:'cast.begin',mode:'assisted'});const frozen=decodeSave(await next.exportSave()).save.active!;assert.equal(frozen.catch.speciesId,'F026');assert.equal(frozen.catch.variant,'starsand');assert.equal(frozen.meta.source,'legend');assert.equal(next.snapshot().adventures.legend.armed,false);
      assert.deepEqual(decodeSave(encodeSave(decodeSave(await next.exportSave()).save)).save.active,frozen);
      for(let i=0;next.snapshot().active&&i<65;i++){
        const cast=next.snapshot().active!;
        if(cast.simulation.phase==='recovery'){await send(next,{type:'cast.recover',castId:cast.id,ownerEpoch:cast.ownerEpoch});break;}
        let sim={...cast.simulation};const edges:InputRequest['edges']=[];
        while(sim.tick<cast.simulation.tick+80&&!['caught','escaped','recovery','bite'].includes(sim.phase)){if(!sim.reel)edges.push({tick:sim.tick+1,reel:true});sim=step(sim,cast.challenge,true);}
        const {action:_,...envelope}=request(next,{type:'save.retry'});await next.mutate({...envelope,castId:cast.id,ownerEpoch:cast.ownerEpoch,expectedCastRevision:cast.castRevision,fromTick:cast.simulation.tick,inputCursor:cast.inputCursor,toTick:sim.tick,edges,command:sim.phase==='bite'?'hook':'checkpoint'},true);
      }
      assert.equal(next.snapshot().adventures.legend.stage,'complete');assert.equal(next.snapshot().catalog.F026?.count,1);await assert.rejects(send(next,{type:'legend.arm'}));
      const resolve=request(next,{type:'catch.resolve',catchId:frozen.id,choice:'keep'});await next.mutate(resolve,false);assert.equal((await next.mutate(resolve,false)).duplicate,true);assert.equal(next.snapshot().inventory.length,1);
      assert.match(legendPause(next.snapshot().adventures,next.snapshot().journey)!,/已经完成/);
    }finally{await next.close();}
  });
});
test('picnic consumes only an explicitly confirmed unprotected item once and stores a repeatable memory',async()=>{
  const save=progressed(),item={...rollEncounter(8,'meal','assisted',emptySave().journey,[]).catch,caughtAt:new Date().toISOString(),isNew:true};
  save.inventory=[item];save.journey.totalCaught=1;save.catalog.F001={count:1,bestLengthMm:item.lengthMm,bestWeightG:item.weightG,variants:{original:1}};
  save.catalog.G001={count:1,bestLengthMm:null,bestWeightG:null,variants:{}};save.life.guests.G001={stage:3,outfit:'base',task:null,invitationEarned:true};
  await fixture(save,async(s)=>{
    const prepare={type:'picnic.prepare',guest:'G001',menu:'soup',mood:'quiet',catchId:item.id} as const;
    await assert.rejects(send(s,prepare),/单独确认/);assert.equal(s.snapshot().inventory.length,1);
    await send(s,{type:'inventory.lock',catchId:item.id,locked:true});await assert.rejects(send(s,{...prepare,confirmed:true}),/解锁/);
    await send(s,{type:'inventory.lock',catchId:item.id,locked:false});await send(s,{type:'display.aquarium',slot:0,catchId:item.id});await assert.rejects(send(s,{...prepare,confirmed:true}),/取下/);await send(s,{type:'display.aquarium',slot:0,catchId:null});
    const start=request(s,{...prepare,confirmed:true});await s.mutate(start,false);assert.equal((await s.mutate(start,false)).duplicate,true);assert.equal(s.snapshot().inventory.length,0);assert.ok(s.snapshot().adventures.picnic);
    await send(s,{type:'location.select',region:'L02'});await assert.rejects(send(s,{type:'picnic.finish'}),/回到/);await send(s,{type:'location.select',region:'L01'});
    const finish=request(s,{type:'picnic.finish'});await s.mutate(finish,false);await s.mutate(finish,false);assert.equal(s.snapshot().adventures.album.length,1);assert.equal(s.snapshot().adventures.picnic,null);assert.equal(s.snapshot().coins,save.coins);assert.deepEqual(s.snapshot().catalog,save.catalog);
    await assert.rejects(send(s,{type:'shore.memory',kind:'light',species:'F026'}),/已发现/);await send(s,{type:'shore.memory',kind:'light',species:'F001'});assert.equal(s.snapshot().adventures.memorials.L01?.species,'F001');validateSave(decodeSave(await s.exportSave()).save);
  });
});
test('legend automatic goal stops for preparation and selects the matching real spot',()=>{
  const save=progressed();assert.match(legendPause(save.adventures,save.journey)!,/传说/);save.adventures.legend.stage='heard';save.journey.region='L03';
  assert.equal(automaticSpot('legend','L03',save.shore,[]),'cove');assert.match(legendPause(save.adventures,save.journey)!,/浮光/);
  save.journey.tideOverride={tide:'glow',remaining:3};assert.equal(legendPause(save.adventures,save.journey),null);
  save.adventures.legend.moon=true;assert.match(legendPause(save.adventures,save.journey)!,/深潜海/);save.journey.region='L04';assert.equal(automaticSpot('legend','L04',save.shore,[]),'pier');assert.match(legendPause(save.adventures,save.journey)!,/深潜饵/);
});
