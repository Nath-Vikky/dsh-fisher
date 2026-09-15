export interface Point { x:number; z:number }
export type SpotId='pier'|'cove';
export type PlaceId=SpotId|'guest';
import {COASTS} from './regions.ts';
import type {CoastMap} from './regions.ts';
export const SPAWN=COASTS.L01.spawn,PLACES=COASTS.L01.places,POND=COASTS.L01.pond!;
const RADIUS=.23;
const ground=(x:number,z:number,map:CoastMap)=>{
  const {dock,coastline}=map;
  if(x>=dock.x-dock.width/2&&x<=dock.x+dock.width/2&&z>=dock.start&&z<=dock.end)return true;
  let inside=false;
  for(let i=0,j=coastline.length-1;i<coastline.length;j=i++){
    const a=coastline[i]!,b=coastline[j]!;
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
};
export function walkable(point:Point,map:CoastMap=COASTS.L01):boolean {
  if(!Number.isFinite(point.x)||!Number.isFinite(point.z))return false;
  for(const [x,z] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]])if(!ground(point.x+x!*RADIUS,point.z+z!*RADIUS,map))return false;
  if(map.walls.some(([x0,x1,z0,z1])=>point.x>x0-RADIUS&&point.x<x1+RADIUS&&point.z>z0-RADIUS&&point.z<z1+RADIUS))return false;
  const pond=map.pond;
  if(pond&&((point.x-pond.x)/(pond.rx+RADIUS))**2+((point.z-pond.z)/(pond.rz+RADIUS))**2<1)return false;
  if(map.circles?.some(([x,z,r])=>Math.hypot(point.x-x,point.z-z)<r+RADIUS))return false;
  return !map.trees.some(([x,z])=>Math.hypot(point.x-x,point.z-z)<.42+RADIUS);
}
export function screenDirection(x:number,y:number):Point {
  const length=Math.hypot(x,y);if(length<.12)return {x:0,z:0};
  const scale=Math.min(1,length)/length;
  return {x:(x*.832+y*.555)*scale,z:(-x*.555+y*.832)*scale};
}
export function move(point:Point,delta:Point,map:CoastMap=COASTS.L01):Point {
  const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.12));let result={...point};
  for(let i=0;i<steps;i++){
    const dx=delta.x/steps,dz=delta.z/steps,next={x:result.x+dx,z:result.z+dz};
    if(walkable(next,map))result=next;
    else{const slideX={x:result.x+dx,z:result.z};if(walkable(slideX,map))result=slideX;const slideZ={x:result.x,z:result.z+dz};if(walkable(slideZ,map))result=slideZ;}
  }
  return result;
}
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export function nearby(point:Point,hasGuest:boolean,map:CoastMap=COASTS.L01):PlaceId|null {
  const places=map.places;
  return (Object.keys(places) as PlaceId[]).filter(id=>id!=='guest'||hasGuest).sort((a,b)=>distance(point,places[a])-distance(point,places[b])).find(id=>distance(point,places[id])<=places[id].radius)??null;
}
function clearLine(a:Point,b:Point,map:CoastMap):boolean {
  const count=Math.max(1,Math.ceil(distance(a,b)/.025));
  for(let i=0;i<=count;i++)if(!walkable({x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count},map))return false;
  return true;
}
// A bounded navigation grid is sufficient for this small, flat shoreline.
export function route(from:Point,to:Point,map:CoastMap=COASTS.L01):Point[] {
  const clear=(a:Point,b:Point)=>clearLine(a,b,map);
  if(!walkable(from,map)||!walkable(to,map))return [];
  if(clear(from,to))return [{...to}];
  const cell=.35,key=(p:Point)=>`${Math.round(p.x/cell)},${Math.round(p.z/cell)}`;
  const center=(id:string):Point=>{const [x,z]=id.split(',').map(Number);return {x:x!*cell,z:z!*cell};};
  const snapped=center(key(from)),candidates:Point[]=[];
  for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)candidates.push({x:snapped.x+x*cell,z:snapped.z+z*cell});
  const first=candidates.filter(point=>clear(from,point)).sort((a,b)=>distance(from,a)-distance(from,b))[0];if(!first)return [];
  const start=key(first),open=[start],previous=new Map<string,string>(),scores=new Map([[start,distance(from,first)]]),closed=new Set<string>();
  let end:string|undefined;
  while(open.length&&closed.size<1600){
    open.sort((a,b)=>(scores.get(a)!+distance(center(a),to))-(scores.get(b)!+distance(center(b),to)));
    const id=open.shift()!,point=center(id);if(closed.has(id))continue;closed.add(id);
    if(clear(point,to)){end=id;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const next={x:point.x+dx!*cell,z:point.z+dz!*cell},nextId=key(next);
      if(closed.has(nextId)||!clear(point,next))continue;
      const cost=scores.get(id)!+distance(point,next);if(cost>=(scores.get(nextId)??Infinity))continue;
      scores.set(nextId,cost);previous.set(nextId,id);open.push(nextId);
    }
  }
  if(!end)return [];
  const points:Point[]=[{...to}];for(let id:string|undefined=end;id&&id!==start;id=previous.get(id))points.unshift(center(id));
  points.unshift(first);
  const result:Point[]=[];let point=from,index=0;
  while(index<points.length){let far=index;while(far+1<points.length&&clear(point,points[far+1]!))far++;point=points[far]!;result.push(point);index=far+1;}
  return result;
}
