import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLACES,POND,SPAWN,distance,move,route,screenDirection,walkable} from '../src/client/world/map.ts';
import {furnishedMap} from '../src/client/world/living-shore.ts';
import {COASTS} from '../src/client/world/regions.ts';
import {playerFacing,playerMotion} from '../src/client/player-motion.ts';

test('movement stays on land and cannot tunnel through the house or water',()=>{
  assert.ok(walkable(SPAWN));assert.ok(walkable(PLACES.pier));assert.ok(walkable(PLACES.cove));
  assert.equal(walkable({x:0,z:6}),false);assert.equal(walkable({x:-3,z:-2.7}),false);
  const wall=move({x:-3,z:-.8},{x:0,z:-8});assert.ok(walkable(wall));assert.ok(wall.z>-1.6);
  const shore=move(SPAWN,{x:14,z:9});assert.ok(walkable(shore));assert.ok(shore.x<5.6);
  assert.equal(walkable({x:NaN,z:0}),false);
  assert.equal(walkable(POND),false);
  const pondBank=move({x:POND.x,z:POND.z+1.7},{x:0,z:-3});
  assert.ok(walkable(pondBank));assert.ok(pondBank.z>POND.z+POND.rz);
});
test('stick dead zone and diagonal input preserve the same maximum walking speed',()=>{
  assert.deepEqual(screenDirection(.03,.02),{x:0,z:0});
  const straight=screenDirection(1,0),diagonal=screenDirection(1,1),outside=screenDirection(12,-9);
  assert.ok(Math.abs(distance(straight,{x:0,z:0})-distance(diagonal,{x:0,z:0}))<.001);
  assert.ok(distance(outside,{x:0,z:0})<=1.001);
});
test('automatic paths reach both fishing spots without cutting house corners',()=>{
  for(const from of [SPAWN,{x:-4.66,z:-2.8}])for(const target of [PLACES.pier,PLACES.cove,PLACES.guest]){
    const points=route(from,target);assert.ok(points.length,`No path from ${JSON.stringify(from)}`);
    let point=from;
    for(const next of points){const count=Math.ceil(distance(point,next)/.06);for(let i=0;i<=count;i++)assert.ok(walkable({x:point.x+(next.x-point.x)*i/Math.max(1,count),z:point.z+(next.z-point.z)*i/Math.max(1,count)}));point=next;}
    assert.ok(distance(point,target)<.01);
  }
});

test('every coast connects its spawn, two fishing spots and visitor around solid obstacles',()=>{
  for(const map of [...Object.values(COASTS),...Object.values(COASTS).map(furnishedMap)]){
    const places=[map.spawn,...Object.values(map.places)];
    for(const from of places)for(const target of places){
      assert.ok(walkable(from,map),`${map.id} invalid place ${JSON.stringify(from)}`);
      const path=route(from,target,map);assert.ok(path.length,`${map.id} unreachable ${JSON.stringify(target)}`);
      let point=from;
      for(const next of path){const count=Math.max(1,Math.ceil(distance(point,next)/.08));for(let i=0;i<=count;i++)assert.ok(walkable({x:point.x+(next.x-point.x)*i/count,z:point.z+(next.z-point.z)*i/count},map),`${map.id} path crossed obstacle`);point=next;}
      assert.ok(distance(point,target)<.01);
    }
    if(map.pond)assert.equal(walkable(map.pond,map),false);
    for(const [x0,x1,z0,z1] of map.walls)assert.equal(walkable({x:(x0+x1)/2,z:(z0+z1)/2},map),false);
  }
});

test('walking away shows the back and lateral or stopped motion retains facing',()=>{
  const away=screenDirection(0,-1),toward=screenDirection(0,1),side=screenDirection(1,0);
  const back=playerFacing(away.x,away.z);assert.equal(back.back,true);
  assert.equal(playerFacing(toward.x,toward.z,back).back,false);
  assert.equal(playerFacing(side.x,side.z,back).back,true);
  assert.deepEqual(playerFacing(0,0,back),back);
  assert.match(playerMotion('idle',4.6,false,true).file,/rear-idle/);
  assert.match(playerMotion('walk',0,false,true).file,/rear-walk-a/);
  assert.match(playerMotion('walk',.35,false,true).file,/rear-walk-b/);
  assert.match(playerMotion('walk',.35,true,true).file,/rear-idle/);
  assert.doesNotMatch(playerMotion('hold',0,false,true).file,/rear/);
});
