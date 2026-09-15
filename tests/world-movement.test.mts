import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLACES,POND,SPAWN,distance,move,route,screenDirection,walkable} from '../src/client/world/map.ts';

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
