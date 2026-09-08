import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { PATTERNS, REGIONS, SPECIES, species } from '../src/game/content.ts';
import { categoryProbabilities, preferenceAvailable, rollEncounter } from '../src/game/encounters.ts';
import { encounter, initialSimulation, step } from '../src/game/engine.ts';
import type { Challenge, InputEdge } from '../src/game/engine.ts';
import { GEAR, modifiers } from '../src/game/gear.ts';
import { BAITS, currentTide, emptyJourney, levelInfo, regionUnlocked } from '../src/game/progression.ts';
import { emptySave, upgradeSave, validateSave } from '../src/host/model.ts';
import { FisherService } from '../src/host/service.ts';
import { SaveStore } from '../src/host/store.ts';
import type { Action, InputRequest } from '../src/protocol.ts';
const clientId='rules-test';
const checksum=(save:unknown)=>JSON.stringify({save,checksum:createHash('sha256').update(JSON.stringify(save)).digest('hex')});
async function cleanup(directory:string) {
  assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('dsh-fisher-test-'));
  await rm(directory,{recursive:true,force:true});
}
function envelope(service:FisherService) {
  const snapshot=service.snapshot();return {protocolVersion:1 as const,actionId:randomUUID(),clientId,
    saveId:snapshot.saveId,generation:service.generation,expectedRevision:snapshot.revision};
}
function action(service:FisherService,value:Action) {return service.mutate({...envelope(service),action:value},false);}
async function finish(service:FisherService) {
  for (let batch=0;service.snapshot().active&&batch<100;batch++) {
    const cast=service.snapshot().active!;let sim=cast.simulation;
    const edges:InputEdge[]=[];
    for (let tick=0;tick<100&&!['bite','caught','escaped','recovery'].includes(sim.phase);tick++) {
      const reel=sim.phase==='fighting';if (reel!==sim.reel) edges.push({tick:sim.tick+1,reel});sim=step(sim,cast.challenge,reel);
    }
    const input:InputRequest={...envelope(service),castId:cast.id,ownerEpoch:cast.ownerEpoch,expectedCastRevision:cast.castRevision,
      fromTick:cast.simulation.tick,inputCursor:cast.inputCursor,toTick:sim.tick,edges,command:cast.simulation.phase==='bite'?'hook':'checkpoint'};
    await service.mutate(input,true);
  }
  assert.ok(service.snapshot().pending);return service.snapshot().pending!;
}

test('complete catalog, conditional probabilities, pity, variants, and six viable behaviors',()=>{
  assert.equal(SPECIES.length,48);assert.equal(new Set(SPECIES.map(item=>item.id)).size,48);
  assert.deepEqual(['fish','abstract','relic','guest'].map(kind=>SPECIES.filter(item=>item.kind===kind).length),[28,12,4,4]);
  assert.equal(SPECIES.filter(item=>item.creature).length*3,108);assert.equal(GEAR.length,14);assert.equal(BAITS.length,8);
  for (const region of REGIONS) assert.deepEqual([1,2,3,4].map(rarity=>SPECIES.filter(item=>item.region===region.id&&item.rarity===rarity).length),[3,2,1,1]);
  assert.deepEqual(categoryProbabilities('L01','B01','calm'),[.9,.07,.03]);
  const odd=categoryProbabilities('L02','B05','odd');assert.ok(Math.abs(odd[1]!-84/156)<1e-12);
  assert.equal(preferenceAvailable('L01','B03'),false);
  const journey=emptyJourney();journey.tutorialDone=true;
  const discovered=SPECIES.filter(item=>item.region==='L01'&&item.kind!=='guest'&&item.id!=='F007').map(item=>item.id);
  journey.dryStreak.L01=8;
  const selected=rollEncounter(55,'pity','assisted',journey,discovered);
  assert.equal(selected.catch.speciesId,'F007');assert.equal(selected.meta.source,'pity');
  assert.deepEqual(selected,rollEncounter(55,'pity','assisted',journey,discovered));
  journey.variantStreak=39;
  assert.equal(rollEncounter(55,'variant','assisted',journey,discovered).catch.variant,'pearl');
  journey.bait='B07';journey.target='A003';journey.completed.L01=10;
  const object=rollEncounter(91,'object','standard',journey,[]);
  assert.equal(object.challenge.mode,'guided');assert.equal(object.catch.lengthMm,null);assert.equal(object.catch.weightG,null);
  assert.equal(object.catch.variant,null);assert.equal(object.catch.price,45);
  journey.target='G001';assert.throws(()=>rollEncounter(91,'invalid','assisted',journey,[]));
  journey.tideFinals=12;assert.equal(currentTide(journey),'glow');journey.tideFinals=24;assert.equal(currentTide(journey),'odd');
  assert.equal(levelInfo(0).level,1);assert.equal(levelInfo(140).level,3);assert.equal(levelInfo(4560).level,20);
  assert.equal(regionUnlocked('L02',140,4),false);assert.equal(regionUnlocked('L02',140,5),true);
  for (const pattern of PATTERNS) for (const mode of ['standard','assisted'] as const) {
    const challenge:Challenge={seed:55,waitTicks:40,pattern,mode,rulesVersion:2,size:1000,modifiers:modifiers({rod:'D01',line:'N01',float:'U01'})};
    let sim={...initialSimulation(),phase:'fighting' as const} as ReturnType<typeof initialSimulation>;
    let reel=true;
    while (sim.phase==='fighting' && sim.fightTicks<3000) {
      if (sim.tension>620000) reel=false;else if (sim.tension<320000) reel=true;
      sim=step(sim,challenge,mode==='assisted'||reel);
    }
    assert.equal(sim.phase,'caught',`${pattern}/${mode} should finish before technical assistance`);
  }
  const recovery=step({...initialSimulation(),phase:'fighting',fightTicks:3599},
    {seed:1,waitTicks:40,pattern:'steady',mode:'standard',rulesVersion:2,modifiers:modifiers({rod:'D01',line:'N01',float:'U01'}),size:500},false);
  assert.equal(recovery.phase,'recovery');
});

test('legacy upgrade preserves frozen encounter, balances, receipts and original file',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'dsh-fisher-test-'));
  const legacy=emptySave() as unknown as Record<string,unknown>;
  legacy.formatVersion=1;legacy.rulesVersion=1;legacy.contentVersion=1;delete legacy.journey;
  const selected=encounter(31,'legacy-cast','assisted');
  const oldCatch={...selected.catch} as Record<string,unknown>;
  for (const key of ['region','variant','isNewVariant','locked']) delete oldCatch[key];
  legacy.active={id:'legacy-cast',owner:clientId,ownerEpoch:1,leaseUntil:Date.now()+15000,castRevision:0,inputCursor:0,paused:true,
    challenge:selected.challenge,simulation:initialSimulation(),seed:31,catch:oldCatch};
  const original=checksum(legacy);await writeFile(join(directory,'save.json'),original);
  const service=new FisherService(new SaveStore(directory));
  try {
    await service.initialize();const data=service.snapshot();assert.equal(data.coins,100);
    assert.deepEqual(data.active?.challenge,selected.challenge);assert.equal(data.active?.id,'legacy-cast');
    assert.equal(await readFile(join(directory,'save.before-v2.json'),'utf8'),original);
    assert.equal(await readFile(join(directory,'save.json'),'utf8'),original,'loading alone leaves source save intact');
    await action(service,{type:'cast.resume',castId:'legacy-cast'});
    const caught=await finish(service);assert.equal(caught.speciesId,oldCatch.speciesId);assert.equal(caught.lengthMm,oldCatch.lengthMm);
    const saved=JSON.parse(await readFile(join(directory,'save.json'),'utf8')).save;validateSave(saved);assert.equal(saved.formatVersion,2);
    const invalid=structuredClone(legacy);(invalid.active as Record<string,unknown>).catch={...oldCatch,speciesId:'G001'};
    assert.throws(()=>upgradeSave(invalid));
  } finally {await service.close();await cleanup(directory);}
});

test('purchases, frozen gear, invalid bait, protected disposal and relic reward stay transactional',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'dsh-fisher-test-'));
  const save=emptySave();save.coins=1000;save.tokens=10;save.experience=140;save.research=5;
  save.journey.tutorialDone=true;save.journey.completed.L01=10;save.journey.dryStreak.L01=8;save.journey.variantStreak=39;
  for (const id of ['F001','F002','F003','F004','F005'] as const) {const def=species(id);save.catalog[id]={count:1,bestLengthMm:def.mode,bestWeightG:def.weight,variants:{original:1}};}
  await writeFile(join(directory,'save.json'),checksum(save));const service=new FisherService(new SaveStore(directory));
  try {
    await service.initialize();
    const buy={...envelope(service),action:{type:'gear.buy' as const,gear:'D02' as const}};
    await service.mutate(buy,false);await service.mutate(buy,false);assert.equal(service.snapshot().coins,880);
    await action(service,{type:'gear.equip',gear:'D02'});
    const tide={...envelope(service),action:{type:'tide.choose' as const,tide:'glow' as const}};
    await service.mutate(tide,false);await service.mutate(tide,false);assert.equal(service.snapshot().tokens,10);
    await action(service,{type:'bait.buy',bait:'B03',quantity:1});await action(service,{type:'bait.select',bait:'B03'});
    await assert.rejects(action(service,{type:'cast.begin',mode:'assisted'}),/没有偏好/);
    assert.equal(service.snapshot().journey.baits.B03,1);assert.equal(service.snapshot().journey.tideOverride?.remaining,3);
    await action(service,{type:'bait.buy',bait:'B07',quantity:1});await action(service,{type:'bait.select',bait:'B07',target:'A002'});
    const begin={...envelope(service),action:{type:'cast.begin' as const,mode:'assisted' as const}};
    await service.mutate(begin,false);await service.mutate(begin,false);
    assert.equal(service.snapshot().journey.baits.B07,0);assert.equal(service.snapshot().journey.tideOverride?.remaining,2);
    await assert.rejects(action(service,{type:'gear.equip',gear:'D01'}),/先处理/);
    assert.equal(service.snapshot().active?.challenge.modifiers?.reelTension,850);
    const caught=await finish(service);assert.equal(caught.speciesId,'A002');assert.equal(caught.variant,'pearl');
    assert.equal(service.snapshot().journey.variantStreak,0);assert.equal(service.snapshot().journey.dryStreak.L01,0);
    await assert.rejects(action(service,{type:'catch.resolve',catchId:caught.id,choice:'sell'}),/单独确认/);
    await action(service,{type:'catch.resolve',catchId:caught.id,choice:'keep'});
    await assert.rejects(action(service,{type:'inventory.batch',catchIds:[caught.id],choice:'sell'}),/单独确认/);
    await action(service,{type:'inventory.lock',catchId:caught.id,locked:true});
    await assert.rejects(action(service,{type:'inventory.resolve',catchId:caught.id,choice:'sell',confirmed:true}),/解锁/);
    await action(service,{type:'inventory.lock',catchId:caught.id,locked:false});
    await action(service,{type:'inventory.resolve',catchId:caught.id,choice:'release',confirmed:true});assert.equal(service.snapshot().released,1);
    await action(service,{type:'bait.buy',bait:'B07',quantity:1});await action(service,{type:'bait.select',bait:'B07',target:'R001'});
    await action(service,{type:'cast.begin',mode:'assisted'});const relic=await finish(service);
    assert.equal(relic.speciesId,'R001');assert.equal(relic.lengthMm,null);assert.equal(relic.price,0);
    await assert.rejects(action(service,{type:'catch.resolve',catchId:relic.id,choice:'sell',confirmed:true}),/仅可收藏/);
    await action(service,{type:'catch.resolve',catchId:relic.id,choice:'keep'});assert.equal(service.snapshot().inventory.length,0);
    await assert.rejects(action(service,{type:'bait.buy',bait:'B02',quantity:-1}));
    assert.equal(service.snapshot().journey.baits.B02,undefined);
  } finally {await service.close();await cleanup(directory);}
});
