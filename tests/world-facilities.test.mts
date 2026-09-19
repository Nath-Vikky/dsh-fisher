import assert from 'node:assert/strict';
import {test} from 'node:test';
import {COASTS} from '../src/client/world/regions.ts';
import {furnishedMap} from '../src/client/world/living-shore.ts';
import {facilityPoints,nearbyFacility} from '../src/client/world/facilities.ts';
import {distance,route,walkable} from '../src/client/world/map.ts';
import {fishingMotion} from '../src/client/world/fishing-feedback.ts';
import {initialSimulation} from '../src/game/engine.ts';

test('all four coasts have reachable facility approaches without entering their furniture',()=>{
  for(const coast of Object.values(COASTS)){
    const map=furnishedMap(coast),places=facilityPoints(map);
    for(const [id,target] of Object.entries(places)){
      assert.ok(walkable(target,map),`${map.id} ${id} invalid approach`);
      assert.equal(nearbyFacility(target,places,true),id);
      assert.ok(route(map.spawn,target,map).length,`${map.id} ${id} unreachable`);
      assert.ok(distance(target,map.spawn)>.05,`${map.id} ${id} used spawn fallback`);
    }
    assert.notEqual(nearbyFacility(places.memorial,places,false),'memorial');
  }
});
test('fight effects leave authoritative progress unchanged and respect reduced motion',()=>{
  const sim={...initialSimulation(),phase:'fighting' as const,fightTicks:85,tension:880000},copy=structuredClone(sim);
  const challenge={seed:0,waitTicks:60,pattern:'dart' as const,mode:'standard' as const};
  const effect=fishingMotion(sim,challenge,4,false);
  assert.ok(effect.strength>.5);assert.equal(effect.danger,true);assert.deepEqual(sim,copy);
  const quiet=fishingMotion(sim,challenge,4,true);assert.equal(quiet.x,0);assert.equal(quiet.z,0);assert.equal(quiet.y,0);
});
