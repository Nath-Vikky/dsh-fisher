import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {emptySave} from '../src/host/model.ts';
import type {Save} from '../src/host/model.ts';
import {SaveStore} from '../src/host/store.ts';
import {encodeSave,decodeSave} from '../src/host/save-codec.ts';
import {FisherService} from '../src/host/service.ts';
import type {WorkEvent} from '../src/host/work-runtime.ts';
import type {Action,ActionRequest,InputRequest} from '../src/protocol.ts';
import {autoFishingDuration} from '../src/game/auto-fishing.ts';
import {rollEncounter} from '../src/game/encounters.ts';
import {step} from '../src/game/engine.ts';

const root=resolve(import.meta.dirname,'../tmp'),base=Date.UTC(2026,8,14),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function request(service:FisherService,action:Action):ActionRequest {
  const s=service.snapshot();return {protocolVersion:1,actionId:randomUUID(),clientId:'auto-test',saveId:s.saveId,generation:s.generation,expectedRevision:s.revision,action};
}
const send=(service:FisherService,action:Action)=>service.mutate(request(service,action),false);
async function fixture(run:(f:{directory:string;open:()=>Promise<FisherService>;time:(ms:number)=>void;emit:(s:FisherService,ms:number,kind:WorkEvent['kind'],name?:string)=>void})=>Promise<void>,save?:Save){
  await mkdir(root,{recursive:true});const directory=await mkdtemp(join(root,'auto-fishing-')),opened:FisherService[]=[];
  let now=0,seq=0;
  if(save)await writeFile(join(directory,'save.json'),encodeSave(save));
  const open=async()=>{const service=new FisherService(new SaveStore(directory),()=>({mono:now,wall:base+now}));opened.push(service);await service.initialize();return service;};
  const emit=(service:FisherService,ms:number,kind:WorkEvent['kind'],name='root')=>{now=ms;service.observe({mono:ms,wall:base+ms,root:hash(name),session:hash(name),seq:++seq,turn:1,kind,completed:true,endKey:kind==='end'?hash(`${name}-${seq}`):null},service.workEpoch);};
  try{await run({directory,open,time:ms=>{now=ms;},emit});}finally{
    for(const service of opened)await service.close();
    const within=relative(root,directory);assert.ok(within&&!within.startsWith('..')&&!isAbsolute(within));await rm(directory,{recursive:true,force:true});
  }
}

test('automatic catches require opt-in, count overlapping work once, pause on inactivity, and do not award disabled supplies',async()=>{
  await fixture(async({open,time,emit})=>{
    const s=await open();emit(s,0,'start');time(600000);await s.flushWork();assert.equal(s.snapshot().active,null);
    await send(s,{type:'auto.enable',enabled:true});assert.equal(s.snapshot().active,null);
    emit(s,600000,'start','a');emit(s,600000,'start','b');time(610000);await s.flushWork();
    assert.equal(s.snapshot().active?.automatic?.elapsedMs,10000);
    emit(s,620000,'pause','a');emit(s,620000,'pause','b');time(900000);await s.flushWork();
    assert.equal(s.snapshot().active?.automatic?.elapsedMs,20000);assert.equal(s.snapshot().autoFishing.working,false);
    assert.equal(s.snapshot().work.dailyPoints,0);assert.equal(s.snapshot().work.activeMs,0);assert.deepEqual(s.snapshot().work.packs,[]);
    const frozen=decodeSave(await s.exportSave()).save.active!;
    const remaining=frozen.automatic!.requiredMs-20000;let elapsed=0;
    while(elapsed<remaining){emit(s,900000+elapsed,'activity','a');const chunk=Math.min(20000,remaining-elapsed);elapsed+=chunk;time(900000+elapsed);await s.flushWork();}
    const done=s.snapshot();assert.equal(done.autoFishing.caught,1);assert.equal(done.inventory.length,1);assert.equal(done.inventory[0]!.id,frozen.id);
    assert.equal(done.catalog.F001?.count,1);assert.equal(done.active,null);
    const ack=request(s,{type:'auto.ack',through:1});await s.mutate(ack,false);assert.equal((await s.mutate(ack,false)).duplicate,true);assert.equal(s.snapshot().autoFishing.seen,1);
  });
});

test('restart retains the frozen catch without offline progress; takeover starts manual reeling with the same catch and only one settlement',async()=>{
  await fixture(async({open,time,emit})=>{
    let s=await open();await send(s,{type:'auto.enable',enabled:true});emit(s,0,'start');time(30000);await s.flushWork();
    const frozen=decodeSave(await s.exportSave()).save.active!;await s.close();time(86_400_000);s=await open();
    await s.flushWork();assert.deepEqual(decodeSave(await s.exportSave()).save.active,frozen);
    await send(s,{type:'auto.takeover',castId:frozen.id});let current=decodeSave(await s.exportSave()).save.active!;
    assert.equal(current.automatic,null);assert.equal(current.simulation.phase,'fighting');assert.equal(s.snapshot().autoFishing.enabled,false);
    assert.deepEqual(current.catch,frozen.catch);assert.deepEqual(current.challenge,frozen.challenge);assert.equal(current.seed,frozen.seed);
    assert.equal(current.simulation.progress,Math.min(900000,Math.floor(30000/frozen.automatic!.requiredMs*1000000)));
    for(let tries=0;s.snapshot().active&&tries<100;tries++){
      const cast=s.snapshot().active!;let sim={...cast.simulation};const edges:InputRequest['edges']=[];
      while(sim.tick<cast.simulation.tick+80&&!['caught','escaped','recovery'].includes(sim.phase)){
        if(!sim.reel)edges.push({tick:sim.tick+1,reel:true});sim=step(sim,cast.challenge,true);
      }
      const {action:_,...envelope}=request(s,{type:'save.retry'});
      await s.mutate({...envelope,castId:cast.id,ownerEpoch:cast.ownerEpoch,expectedCastRevision:cast.castRevision,fromTick:cast.simulation.tick,
        inputCursor:cast.inputCursor,toTick:sim.tick,edges,command:'checkpoint'},true);
      if(s.snapshot().active?.simulation.phase==='recovery')await send(s,{type:'cast.recover',castId:cast.id,ownerEpoch:cast.ownerEpoch});
    }
    assert.equal(s.snapshot().pending?.id,frozen.id);assert.equal(s.snapshot().catalog.F001?.count,1);assert.equal(s.snapshot().autoFishing.caught,0);
    await send(s,{type:'catch.resolve',catchId:frozen.id,choice:'keep'});assert.equal(s.snapshot().inventory.length,1);
  });
});

test('automatic completion rolls back on disk failure and retries without duplicating the harvest',async()=>{
  await fixture(async({open,time,emit})=>{
    const s=await open();await send(s,{type:'auto.enable',enabled:true});emit(s,0,'start');time(1000);await s.flushWork();
    const duration=s.snapshot().active!.automatic!.requiredMs;let at=1000;
    while(at<duration-1000){emit(s,at,'activity');at=Math.min(duration-1000,at+20000);time(at);await s.flushWork();}
    const castId=s.snapshot().active!.id,write=s.store.write.bind(s.store);
    s.store.write=async()=>{throw new Error('disk failure');};emit(s,at,'activity');time(duration);await s.flushWork();
    assert.equal(s.snapshot().gameplayAvailable,false);assert.equal(s.snapshot().inventory.length,0);assert.equal(s.snapshot().autoFishing.caught,0);
    s.store.write=write;await send(s,{type:'save.retry'});emit(s,duration,'activity');time(duration+1000);await s.flushWork();
    assert.equal(s.snapshot().inventory[0]?.id,castId);assert.equal(s.snapshot().autoFishing.caught,1);assert.equal(s.snapshot().catalog.F001?.count,1);
  });
});

test('full inventory and empty bait pause the loop without discarding catches or consuming unavailable bait',async()=>{
  const save=emptySave();save.journey.totalCaught=239;
  for(let i=0;i<239;i++)save.inventory.push({...rollEncounter(50,`old-${i}`,'assisted',save.journey,[]).catch,caughtAt:new Date(base).toISOString(),order:i+1});
  await fixture(async({open,time,emit})=>{
    const s=await open();await send(s,{type:'auto.enable',enabled:true});let at=0;emit(s,0,'start');time(1000);await s.flushWork();
    const duration=s.snapshot().active!.automatic!.requiredMs;
    while(at<duration+10000){emit(s,at,'activity');at=Math.min(duration+10000,at+20000);time(at);await s.flushWork();}
    assert.equal(s.snapshot().inventory.length,240);assert.equal(s.snapshot().autoFishing.caught,1);assert.match(s.snapshot().autoFishing.reason!,/背包已满/);
    assert.equal(s.snapshot().active,null);assert.equal(s.snapshot().pending,null);
    await send(s,{type:'inventory.resolve',catchId:'old-0',choice:'release'});emit(s,at,'activity');time(at+1000);await s.flushWork();assert.ok(s.snapshot().active?.automatic);
  },save);
  const noBait=emptySave();noBait.journey.tutorialDone=true;noBait.journey.bait='B02';
  await fixture(async({open,time,emit})=>{
    const s=await open();await send(s,{type:'auto.enable',enabled:true});emit(s,0,'start');time(1000);await s.flushWork();
    assert.equal(s.snapshot().active,null);assert.match(s.snapshot().autoFishing.reason!,/鱼饵用完/);assert.equal(s.snapshot().coins,100);
    await send(s,{type:'bait.buy',bait:'B02',quantity:1});time(2000);await s.flushWork();assert.ok(s.snapshot().active?.automatic);assert.equal(s.snapshot().journey.baits.B02,0);
  },noBait);
});

test('format four migration archives exact bytes, defaults automatic fishing off, and import pauses its progress',async()=>{
  await fixture(async({directory,open,time,emit})=>{
    const {autoFishing:_,...old}=emptySave();const legacy={...old,formatVersion:4};const body=JSON.stringify(legacy),raw=JSON.stringify({save:legacy,checksum:hash(body)});
    await writeFile(join(directory,'save.json'),raw);const s=await open();assert.equal(s.snapshot().autoFishing.enabled,false);
    assert.equal(await readFile(join(directory,'save.before-v5.json'),'utf8'),raw);assert.equal(await readFile(join(directory,'save.json'),'utf8'),raw);
    await send(s,{type:'auto.enable',enabled:true});emit(s,0,'start');time(10000);await s.flushWork();
    const exported=await s.exportSave(),before=decodeSave(exported).save.active!;
    const preview=await s.previewSave({source:'file',text:exported});await send(s,{type:'save.import',previewId:preview.id,confirmed:true});
    const after=decodeSave(await s.exportSave()).save;assert.equal(after.autoFishing.enabled,false);assert.equal(after.work.enabled,false);
    assert.deepEqual(after.active?.automatic,before.automatic);assert.deepEqual(after.active?.catch,before.catch);assert.equal(s.observingWork,false);
  });
});

test('rarity, appearance and giant size extend automatic fishing duration',()=>{
  const item=rollEncounter(50,'duration','assisted',emptySave().journey,[]).catch;
  const normal=autoFishingDuration({...item,variant:'original',quality:500});
  const rare=autoFishingDuration({...item,speciesId:'F007',variant:'original',quality:500});
  assert.ok(rare>normal);assert.ok(autoFishingDuration({...item,variant:'pearl'})>normal);
  assert.ok(autoFishingDuration({...item,variant:'starsand'})>autoFishingDuration({...item,variant:'pearl'}));
  assert.ok(autoFishingDuration({...item,variant:'original',quality:990})>normal);
});
