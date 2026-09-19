import type {Bootstrap} from '../../protocol.ts';
import type {CoastMap} from './regions.ts';
import type {PlaceId,Point} from './map.ts';
import {distance,walkable} from './map.ts';

export const CORNERS:Record<CoastMap['id'],Point>={L01:{x:1.2,z:-.65},L02:{x:1.5,z:.2},L03:{x:1,z:2.35},L04:{x:.6,z:-.9}};
export const MEMORIALS:Record<CoastMap['id'],Point>={L01:{x:-.9,z:2.7},L02:{x:-2,z:1.75},L03:{x:3.55,z:2.5},L04:{x:-3,z:.15}};
export const FACILITY_NAMES={aquarium:'岸边鱼缸',shelf:'收藏陈列架',seat:'休息长椅',memorial:'岸边纪念'} as const;
export type FacilityId=keyof typeof FACILITY_NAMES;
export type DestinationId=PlaceId|FacilityId;
export const isFacility=(id:DestinationId):id is FacilityId=>id in FACILITY_NAMES;
export function memorialBuilt(data:Pick<Bootstrap,'shore'|'journey'>):boolean{return data.journey.region==='L01'?data.shore.story==='built':data.shore.regions[data.journey.region].stage==='built';}
export function facilityPoints(map:CoastMap):Record<FacilityId,Point>{
  const p=CORNERS[map.id],m=MEMORIALS[map.id];
  const nearest=(point:Point)=>{
    if(walkable(point,map))return point;
    for(let r=.2;r<=1.6;r+=.2)for(let i=0;i<16;i++){
      const candidate={x:point.x+Math.cos(i*Math.PI/8)*r,z:point.z+Math.sin(i*Math.PI/8)*r};
      if(walkable(candidate,map))return candidate;
    }
    return {...map.spawn};
  };
  return {aquarium:nearest({x:p.x,z:p.z+1}),shelf:nearest({x:p.x+1.55,z:p.z+.85}),seat:nearest({x:p.x-1.35,z:p.z+.82}),memorial:nearest({x:m.x,z:m.z+.85})};
}
export function nearbyFacility(point:Point,places:Record<FacilityId,Point>,built:boolean):FacilityId|null {
  return (Object.keys(places) as FacilityId[]).filter(id=>id!=='memorial'||built).sort((a,b)=>distance(point,places[a])-distance(point,places[b])).find(id=>distance(point,places[id])<.72)??null;
}
