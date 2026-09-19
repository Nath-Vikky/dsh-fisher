import assert from 'node:assert/strict';
import {test} from 'node:test';
import {VisitorRoutine} from '../src/client/world/visitor-routine.ts';
import {COASTS} from '../src/client/world/regions.ts';
import {furnishedMap} from '../src/client/world/living-shore.ts';
import {walkable,distance} from '../src/client/world/map.ts';
import {facilityPoints} from '../src/client/world/facilities.ts';
import {GUEST_ACTION_ART,COMPANION_ACTION_ART} from '../src/game/actor-art.ts';
import {frameRect} from '../src/client/world/actor-atlas.ts';

test('visitors actually reach, observe and sit at all four shores; picnic seating persists until dismissed',()=>{
  for(const coast of Object.values(COASTS)){
    const map=furnishedMap(coast),routine=new VisitorRoutine(map),seen=new Set<string>(),player={x:20,z:20};
    for(let i=0;i<1200;i++){const visit=routine.update(.08,i*.08,player,false);seen.add(visit.pose);assert.ok(walkable(routine.point,map),`${map.id} left walking ground`);}
    assert.ok(seen.has('walk')&&seen.has('observe')&&seen.has('sit'),`${map.id} never completed routine: ${[...seen]}`);
    let visit=routine.update(.08,96,player,false,true);
    for(let i=0;i<250&&visit.pose!=='sit';i++)visit=routine.update(.08,96+i*.08,player,false,true);
    assert.equal(visit.pose,'sit',`${map.id} did not sit for picnic`);assert.ok(distance(routine.point,facilityPoints(map).seat)<.1);
    const seated=structuredClone(visit);assert.deepEqual(routine.update(0,150,player,true,true),seated);
    assert.equal(routine.update(.08,200,player,false,true).pose,'sit');
  }
});
test('atlas frames stay inside their own texture bounds when mirrored and retain character scale',()=>{
  for(const atlas of [...Object.values(GUEST_ACTION_ART).flatMap(Object.values),...Object.values(COMPANION_ACTION_ART)]){
    assert.equal(atlas.frames.length,4);
    for(let i=0;i<4;i++)for(const right of [true,false]){
      const frame=frameRect(atlas,i,right);assert.ok(frame.x>=0&&frame.x<=1);assert.ok(frame.x+frame.w>=0&&frame.x+frame.w<=1);assert.ok(frame.y>=0&&frame.y+frame.h<=1.00001);assert.ok(frame.width>0&&frame.height>0&&frame.height<1.2);
    }
  }
});
