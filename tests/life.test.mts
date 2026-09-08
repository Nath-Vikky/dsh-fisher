import assert from 'node:assert/strict';
import { createHash,randomUUID } from 'node:crypto';
import { mkdtemp,readFile,rm,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename,dirname,join,resolve } from 'node:path';
import test from 'node:test';
import { SPECIES,species } from '../src/game/content.ts';
import type { SpeciesId } from '../src/game/content.ts';
import { rollEncounter } from '../src/game/encounters.ts';
import { initialSimulation,step } from '../src/game/engine.ts';
import type { Catch,InputEdge } from '../src/game/engine.ts';
import { emptyJourney } from '../src/game/progression.ts';
import { advanceGoal,goalProgress,newTask } from '../src/game/goals.ts';
import { createQuestGoal,questDefinition } from '../src/game/quests.ts';
import type { QuestId } from '../src/game/quests.ts';
import { frameAvailable,migrateLife,recordLifeEvent,refreshLife } from '../src/game/life.ts';
import { emptySave,upgradeSave,validateSave } from '../src/host/model.ts';
import type { Save } from '../src/host/model.ts';
import { FisherService } from '../src/host/service.ts';
import { SaveStore } from '../src/host/store.ts';
import type { Action } from '../src/protocol.ts';

const checksum=(save:unknown)=>JSON.stringify({save,checksum:createHash('sha256').update(JSON.stringify(save)).digest('hex')});
function specimen(speciesId:SpeciesId,identity:string,order=1):Catch {
  const journey=emptyJourney();journey.tutorialDone=true;journey.region=species(speciesId).region;
  journey.completed[journey.region]=10;journey.bait='B07';journey.target=speciesId;
  return {...rollEncounter(31,identity,'assisted',journey,[]).catch,caughtAt:'2026-09-08T00:00:00.000Z',order};
}
function seed():Save {
  const save=emptySave();save.coins=5000;save.experience=4560;save.research=20;save.journey.totalCaught=10;save.journey.tutorialDone=true;
  for(const entry of SPECIES.filter(item=>item.region==='L01'&&item.rarity!==null).slice(0,5))save.catalog[entry.id]={count:1,bestLengthMm:entry.mode,bestWeightG:entry.weight,variants:{original:1}};
  save.inventory=Array.from({length:10},(_,index)=>specimen('F001',`fish-${index+1}`,index+1));refreshLife(save);return save;
}
function quests(save:Save,templates:QuestId[]) {
  save.life.questSequence=100;save.life.quests=templates.map((template,index)=>{
    const goal=createQuestGoal(template,save,index+1);assert.ok(goal);
    return {...newTask(goal,save.journey.totalCaught),id:`quest-${index+1}`,template,status:'active',reward:{...questDefinition(template).reward}};
  });
}
function envelope(service:FisherService) {const data=service.snapshot();return {protocolVersion:1,actionId:randomUUID(),clientId:'life-test',saveId:data.saveId,generation:data.generation,expectedRevision:data.revision};}
const action=(service:FisherService,action:Action)=>service.mutate({...envelope(service),action},false);
async function cleanup(directory:string) {
  assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('dsh-fisher-test-'));
  await rm(directory,{recursive:true,force:true});
}
async function land(service:FisherService) {
  for(let batch=0;service.snapshot().active&&batch<60;batch++) {
    const cast=service.snapshot().active!;let sim=cast.simulation;const edges:InputEdge[]=[];
    for(let i=0;i<100&&!['bite','caught','escaped','recovery'].includes(sim.phase);i++) {
      const reel=sim.phase==='fighting';if(reel!==sim.reel)edges.push({tick:sim.tick+1,reel});sim=step(sim,cast.challenge,reel);
    }
    await service.mutate({...envelope(service),castId:cast.id,ownerEpoch:cast.ownerEpoch,expectedCastRevision:cast.castRevision,
      fromTick:cast.simulation.tick,inputCursor:cast.inputCursor,toTick:sim.tick,edges,command:cast.simulation.phase==='bite'?'hook':'checkpoint'},true);
  }
  assert.ok(service.snapshot().pending);return service.snapshot().pending!;
}

test('goals count accepted events, distinct choices and a newly caught displayed individual',()=>{
  const save=seed();quests(save,['Q02','Q08','Q11']);
  const [regions,baits,display]=save.life.quests;assert.ok(regions&&baits&&display);assert.equal(regions.goal.kind,'regions');
  if(regions.goal.kind!=='regions')throw new Error('fixture');
  const locations=regions.goal.regions;
  const emit=(item:Catch,bait:'B02'|'B03')=>recordLifeEvent(save,{type:'catch',item,bait,peakDanger:100000,lengthRecord:false});
  const old=save.inventory[0]!;
  recordLifeEvent(save,{type:'display',item:old});assert.equal(display.progress,0,'old fish cannot fulfill new-catch display');
  for(let i=0;i<3;i++)emit({...old,region:locations[0]},'B02');
  assert.equal(goalProgress(regions,save).current,2);assert.equal(goalProgress(baits,save).current,1);
  for(let i=0;i<2;i++)emit({...old,region:locations[1]},'B03');
  assert.ok(goalProgress(regions,save).ready&&goalProgress(baits,save).ready);
  recordLifeEvent(save,{type:'display',item:{...old,order:11}});assert.equal(display.progress,1);
  const safe=newTask({kind:'safe',required:2,threshold:200000},10);
  advanceGoal(safe,{type:'catch',item:old,bait:'B01',peakDanger:200000,lengthRecord:false});assert.equal(safe.progress,0);
  const release=newTask({kind:'release',required:3},10);
  advanceGoal(release,{type:'release',item:specimen('A003','object')});assert.equal(release.progress,0,'recycling is not releasing a creature');
  advanceGoal(release,{type:'release',item:old});assert.equal(release.progress,1);
});

test('specific delivery, display protection and durable reward receipts are one transaction',async()=>{
  class FaultStore extends SaveStore {fail=false;override async write(save:Save){if(this.fail)throw new Error('disk fixture');await super.write(save);}}
  const directory=await mkdtemp(join(tmpdir(),'dsh-fisher-test-')),save=seed();quests(save,['Q04','Q11','Q01']);
  save.life.quests[0]!.goal={kind:'deliver',required:3,species:'F001'};save.inventory[0]!.isNew=true;
  await writeFile(join(directory,'save.json'),checksum(save));const store=new FaultStore(directory),service=new FisherService(store);
  try {
    await service.initialize();const ids=['fish-1','fish-2','fish-3'];
    await action(service,{type:'display.aquarium',slot:0,catchId:'fish-2'});
    await assert.rejects(action(service,{type:'inventory.resolve',catchId:'fish-2',choice:'sell',confirmed:true}),/展示/);
    await assert.rejects(action(service,{type:'inventory.batch',catchIds:['fish-2'],choice:'release'}),/展示/);
    await assert.rejects(action(service,{type:'quest.claim',questId:'quest-1',catchIds:ids,confirmed:true}),/展示/);
    assert.equal(service.snapshot().coins,5000);assert.equal(service.snapshot().inventory.length,10);
    await action(service,{type:'display.aquarium',slot:1,catchId:'fish-2'});assert.deepEqual(service.snapshot().life.aquarium.slice(0,2),[null,'fish-2']);
    assert.equal(service.snapshot().life.quests[1]?.progress,0);
    await action(service,{type:'display.aquarium',slot:1,catchId:null});
    await assert.rejects(action(service,{type:'quest.claim',questId:'quest-1',catchIds:['fish-1','fish-1','fish-3'],confirmed:true}),/三条/);
    await assert.rejects(action(service,{type:'quest.claim',questId:'quest-1',catchIds:ids}),/单独确认/);
    store.fail=true;await assert.rejects(action(service,{type:'quest.claim',questId:'quest-1',catchIds:ids,confirmed:true}),/保存/);
    assert.equal(service.snapshot().inventory.length,10);assert.equal(service.snapshot().life.questsCompleted,0);
    store.fail=false;await action(service,{type:'save.retry'});
    const request={...envelope(service),action:{type:'quest.claim',questId:'quest-1',catchIds:ids,confirmed:true}};
    await service.mutate(request,false);await service.mutate(request,false);
    assert.equal(service.snapshot().coins,5045);assert.equal(service.snapshot().inventory.length,7);
    assert.equal(service.snapshot().released,0);assert.equal(service.snapshot().life.questsCompleted,1);assert.equal(service.snapshot().life.quests.length,3);
    await action(service,{type:'achievement.claim',achievement:'H01'});assert.equal(service.snapshot().coins,5065);
    await assert.rejects(action(service,{type:'achievement.claim',achievement:'H01'}),/已经领取/);
    const before=service.snapshot(),offered=before.life.quests.find(item=>item.status==='offered')!;
    await action(service,{type:'quest.skip',questId:offered.id});assert.equal(service.snapshot().coins,before.coins);
    await action(service,{type:'decor.buy',decor:'C001'});await action(service,{type:'decor.equip',slot:'ground',decor:'C001'});
    await assert.rejects(action(service,{type:'decor.equip',slot:'lamp',decor:'C001'}),/位置/);
    await service.close();const restarted=new FisherService(new SaveStore(directory));
    try{await restarted.initialize();assert.equal((await restarted.mutate(request,false)).duplicate,true);assert.equal(restarted.snapshot().life.decor.ground,'C001');}finally{await restarted.close();}
  } finally {await service.close();await cleanup(directory);}
});

test('guest invitations survive cancellation, become permanent visits and unlock both story stages',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'dsh-fisher-test-')),save=seed();quests(save,['Q03','Q09','Q07']);
  for(const quest of save.life.quests)quest.progress=quest.goal.required;
  await writeFile(join(directory,'save.json'),checksum(save));const service=new FisherService(new SaveStore(directory));
  try {
    await service.initialize();await assert.rejects(action(service,{type:'guest.claim',guest:'G001'}),/未完成/);
    await action(service,{type:'guest.accept',guest:'G001'});assert.equal(service.snapshot().life.guests.G001.task?.progress,0);
    await action(service,{type:'inventory.batch',catchIds:['fish-1','fish-2','fish-3','fish-4','fish-5'],choice:'release'});
    await action(service,{type:'guest.claim',guest:'G001'});assert.deepEqual(service.snapshot().journey.invitations,['G001']);
    await assert.rejects(action(service,{type:'guest.claim',guest:'G001'}),/未完成/);
    await action(service,{type:'guest.prepare',guest:'G001'});await action(service,{type:'cast.begin',mode:'assisted'});
    const first=service.snapshot().active!;await action(service,{type:'cast.cancel',castId:first.id,ownerEpoch:first.ownerEpoch});
    assert.deepEqual(service.snapshot().journey.invitations,['G001']);await action(service,{type:'cast.begin',mode:'assisted'});
    const experience=service.snapshot().experience,research=service.snapshot().research,item=await land(service);
    assert.equal(item.speciesId,'G001');assert.equal(item.order,11);assert.equal(service.snapshot().life.guests.G001.stage,1);
    assert.equal(service.snapshot().experience,experience);assert.equal(service.snapshot().research,research);
    assert.equal(service.snapshot().catalog.G001?.count,1);assert.deepEqual(service.snapshot().journey.invitations,[]);
    await action(service,{type:'catch.resolve',catchId:item.id,choice:'keep'});
    await action(service,{type:'guest.accept',guest:'G001'});await action(service,{type:'display.aquarium',slot:0,catchId:'fish-6'});
    await action(service,{type:'guest.claim',guest:'G001'});assert.equal(service.snapshot().life.guests.G001.stage,2);
    await action(service,{type:'guest.accept',guest:'G001'});
    for(const questId of ['quest-1','quest-2','quest-3'])await action(service,{type:'quest.claim',questId});
    await action(service,{type:'guest.claim',guest:'G001'});await action(service,{type:'guest.outfit',guest:'G001',outfit:'alternate'});
    assert.equal(service.snapshot().life.guests.G001.stage,3);
    const before=service.snapshot();await action(service,{type:'guest.visit',guest:null});await action(service,{type:'guest.visit',guest:'G001'});
    assert.equal(service.snapshot().coins,before.coins);assert.deepEqual(service.snapshot().catalog,before.catalog);
    await assert.rejects(action(service,{type:'guest.prepare',guest:'G001'}),/没有待使用/);
  } finally {await service.close();await cleanup(directory);}
});

test('format three migration preserves an in-flight guest, supplies and source backup',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'dsh-fisher-test-')),save=seed();
  save.work.packs=['old-pack'];save.journey.region='L01';save.journey.bait='B08';save.journey.target='G001';save.journey.invitations=['G001'];
  const selected=rollEncounter(61,'old-invitation','assisted',save.journey,[]);save.journey.invitations=[];
  save.active={id:'old-invitation',owner:'life-test',ownerEpoch:1,leaseUntil:Date.now()+15000,castRevision:0,inputCursor:0,paused:true,seed:61,
    catch:selected.catch,challenge:selected.challenge,meta:selected.meta,simulation:initialSimulation()};
  const old=save as unknown as Record<string,unknown>;old.formatVersion=3;delete old.life;
  const original=checksum(old);await writeFile(join(directory,'save.json'),original);const service=new FisherService(new SaveStore(directory));
  try {
    await service.initialize();assert.equal(service.snapshot().gameplayAvailable,true);assert.equal(service.snapshot().life.guests.G001.invitationEarned,true);
    assert.deepEqual(service.snapshot().work.packs,['old-pack']);assert.deepEqual(service.snapshot().active?.challenge,selected.challenge);
    assert.equal(await readFile(join(directory,'save.before-v4.json'),'utf8'),original);
    const upgraded=upgradeSave(JSON.parse(JSON.stringify(old)));validateSave(upgraded);
    const invalid=structuredClone(upgraded);invalid.life.aquarium[0]='missing-fish';assert.throws(()=>validateSave(invalid));
    upgraded.catalog.G002={count:1,bestLengthMm:null,bestWeightG:null,variants:{}};migrateLife(upgraded);
    upgraded.life.guests.G002.task=newTask({required:12,group:'any',region:'L04',kind:'catch'},10);validateSave(upgraded);
    upgraded.life.ownedDecor=['C001','C002','C003','C004','C005','C006'];refreshLife(upgraded);
    assert.ok(upgraded.life.achievements.includes('H22'));assert.ok(frameAvailable(upgraded.life,'afternoon'));
    await action(service,{type:'cast.cancel',castId:'old-invitation',ownerEpoch:1});assert.deepEqual(service.snapshot().journey.invitations,['G001']);
  } finally {await service.close();await cleanup(directory);}
});
