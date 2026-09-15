export interface Point { x:number; z:number }
export type SpotId='pier'|'cove';
export type PlaceId=SpotId|'guest';
export const SPAWN:Point={x:0,z:.6};
export const PLACES={
  pier:{x:2,z:6.15,name:'木栈桥',radius:1.1},
  cove:{x:-3.3,z:3.25,name:'芦苇浅湾',radius:1.15},
  guest:{x:3.3,z:-.45,name:'岸边来客',radius:1.35},
} as const;
export const TREES=[[-4.8,1.1,1.1],[-4.7,-3.9,1.2],[4.6,1.6,1.05],[4.5,-4,1.25],[.5,-3.8,1.15]] as const;
const RADIUS=.23;
const ground=(x:number,z:number)=>(x>=-5.6&&x<=5.6&&z>=-4.8&&z<=3.8)||(x>=1.05&&x<=2.95&&z>=3.5&&z<=7);
export function walkable(point:Point):boolean {
  if(!Number.isFinite(point.x)||!Number.isFinite(point.z))return false;
  for(const [x,z] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]])if(!ground(point.x+x!*RADIUS,point.z+z!*RADIUS))return false;
  if(point.x>-4.4-RADIUS&&point.x<-1.4+RADIUS&&point.z>-4.05-RADIUS&&point.z<-1.6+RADIUS)return false;
  if(point.x>2.25-RADIUS&&point.x<3.9+RADIUS&&point.z>-3.9-RADIUS&&point.z<-2.45+RADIUS)return false;
  return !TREES.some(([x,z])=>Math.hypot(point.x-x,point.z-z)<.42+RADIUS);
}
export function screenDirection(x:number,y:number):Point {
  const length=Math.hypot(x,y);if(length<.12)return {x:0,z:0};
  const scale=Math.min(1,length)/length;
  return {x:(x*.832+y*.555)*scale,z:(-x*.555+y*.832)*scale};
}
export function move(point:Point,delta:Point):Point {
  const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.12));let result={...point};
  for(let i=0;i<steps;i++){
    const dx=delta.x/steps,dz=delta.z/steps,next={x:result.x+dx,z:result.z+dz};
    if(walkable(next))result=next;
    else{const slideX={x:result.x+dx,z:result.z};if(walkable(slideX))result=slideX;const slideZ={x:result.x,z:result.z+dz};if(walkable(slideZ))result=slideZ;}
  }
  return result;
}
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export function nearby(point:Point,hasGuest:boolean):PlaceId|null {
  return (Object.keys(PLACES) as PlaceId[]).filter(id=>id!=='guest'||hasGuest).sort((a,b)=>distance(point,PLACES[a])-distance(point,PLACES[b])).find(id=>distance(point,PLACES[id])<=PLACES[id].radius)??null;
}
function clearLine(a:Point,b:Point):boolean {
  const count=Math.max(1,Math.ceil(distance(a,b)/.12));
  for(let i=0;i<=count;i++)if(!walkable({x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count}))return false;
  return true;
}
// A bounded navigation grid is sufficient for this small, flat shoreline.
export function route(from:Point,to:Point):Point[] {
  if(!walkable(from)||!walkable(to))return [];
  if(clearLine(from,to))return [{...to}];
  const cell=.35,key=(p:Point)=>`${Math.round(p.x/cell)},${Math.round(p.z/cell)}`;
  const center=(id:string):Point=>{const [x,z]=id.split(',').map(Number);return {x:x!*cell,z:z!*cell};};
  const snapped=center(key(from)),candidates:Point[]=[];
  for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)candidates.push({x:snapped.x+x*cell,z:snapped.z+z*cell});
  const first=candidates.filter(point=>clearLine(from,point)).sort((a,b)=>distance(from,a)-distance(from,b))[0];if(!first)return [];
  const start=key(first),open=[start],previous=new Map<string,string>(),scores=new Map([[start,distance(from,first)]]),closed=new Set<string>();
  let end:string|undefined;
  while(open.length&&closed.size<1600){
    open.sort((a,b)=>(scores.get(a)!+distance(center(a),to))-(scores.get(b)!+distance(center(b),to)));
    const id=open.shift()!,point=center(id);if(closed.has(id))continue;closed.add(id);
    if(clearLine(point,to)){end=id;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const next={x:point.x+dx!*cell,z:point.z+dz!*cell},nextId=key(next);
      if(closed.has(nextId)||!clearLine(point,next))continue;
      const cost=scores.get(id)!+distance(point,next);if(cost>=(scores.get(nextId)??Infinity))continue;
      scores.set(nextId,cost);previous.set(nextId,id);open.push(nextId);
    }
  }
  if(!end)return [];
  const points:Point[]=[{...to}];for(let id:string|undefined=end;id&&id!==start;id=previous.get(id))points.unshift(center(id));
  points.unshift(first);
  const result:Point[]=[];let point=from,index=0;
  while(index<points.length){let far=index;while(far+1<points.length&&clearLine(point,points[far+1]!))far++;point=points[far]!;result.push(point);index=far+1;}
  return result;
}
