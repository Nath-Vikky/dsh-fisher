import type {CoastMap} from './regions.ts';
import type {Point} from './map.ts';
import {distance,move,route} from './map.ts';
import {CORNERS,facilityPoints} from './facilities.ts';

export type VisitorPose='idle'|'walk'|'sit'|'observe';
export interface VisitorStep {position:Point;walking:boolean;pose:VisitorPose}
export class VisitorRoutine {
  private map:CoastMap;private position:Point;private path:Point[]=[];private station=0;private destination=0;private nextVisit=4;private picnic=false;
  private stops:Point[];activity='在岸边等你';
  constructor(map:CoastMap){this.map=map;const facilities=facilityPoints(map);this.stops=[map.places.guest,facilities.aquarium,facilities.seat,facilities.shelf];this.position={...map.places.guest};}
  get point():Point{return this.position;}
  update(dt:number,time:number,player:Point,freeze:boolean,picnic=false):VisitorStep {
    if(picnic!==this.picnic){this.picnic=picnic;this.path=[];this.destination=this.station;if(picnic&&this.station!==2)this.travel(2);else if(!picnic)this.nextVisit=time+5;}
    if(!freeze&&(this.picnic||distance(player,this.position)>=1.2)){
      if(!this.path.length&&!this.picnic&&time>=this.nextVisit){this.travel((this.station+1)%4);this.nextVisit=time+5;}
      const target=this.path[0];
      if(target&&dt>0){
        const length=distance(this.position,target);
        if(length<.025){this.position={...target};this.path.shift();if(!this.path.length){this.station=this.destination;this.nextVisit=time+9;}}
        else{const step=Math.min(length,dt*.78),before=this.position;this.position=move(before,{x:(target.x-before.x)/length*step,z:(target.z-before.z)/length*step},this.map);
          if(distance(before,this.position)>.001){this.activity=this.picnic?'正去准备野餐':'在岸边散步';return {position:this.position,walking:true,pose:'walk'};}
          this.path=[];this.destination=this.station;this.nextVisit=time+4;
        }
      }
    }
    if(this.path.length){this.activity='在岸边等你';return {position:this.position,walking:false,pose:'idle'};}
    this.activity=this.station===2?(this.picnic?'坐在长椅上等你开饭':'坐在长椅上歇脚'):['在岸边等你','正在看鱼缸里的收藏','','正在看陈列架'][this.station]!;
    const p=CORNERS[this.map.id];
    return {position:this.station===2?{x:p.x-1.35,z:p.z+.14}:this.position,walking:false,pose:this.station===2?'sit':this.station===0?'idle':'observe'};
  }
  private travel(destination:number):void {
    const path=route(this.position,this.stops[destination]!,this.map);if(!path.length)return;this.destination=destination;this.path=path;
  }
}
