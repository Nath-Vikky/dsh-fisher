import {BufferGeometry,Float32BufferAttribute,Group,LineBasicMaterial,LineSegments,Mesh,MeshBasicMaterial,TorusGeometry} from 'three';
import type {Challenge,Simulation} from '../../game/engine.ts';
import {behavior} from '../../game/fight.ts';

// Visuals read the same deterministic beat as the fight, without advancing it.
export function fishingMotion(sim:Simulation|undefined,challenge:Challenge|undefined,time:number,reduced:boolean){
  const result={x:0,z:0,y:0,strength:0,danger:false};if(!sim)return result;
  result.danger=sim.tension>720000||sim.danger>0;
  if(reduced)return {...result,strength:sim.phase==='bite'?.6:sim.phase==='fighting'?.35:0};
  result.y=Math.sin(time*2)*.025;
  if(sim.phase==='bite')return {...result,y:-.06+Math.sin(time*13)*.045,strength:.9};
  if(sim.phase!=='fighting'||!challenge)return result;
  const beat=behavior(sim.fightTicks,challenge),t=sim.fightTicks*.05;
  result.strength=beat.burst?1:.22;
  switch(challenge.pattern){
    case 'steady':result.x=Math.sin(t*1.4)*.1;break;
    case 'dart':result.x=Math.sin(t*4)*(beat.burst?.58:.08);result.z=beat.burst?-.22:0;break;
    case 'heavy':result.y=-.08+Math.sin(t*2)*.012;result.strength=.55;break;
    case 'pulse':result.x=Math.sin(t*5)*(beat.burst?.32:.04);result.y-=beat.burst?.06:0;break;
    case 'rollback':result.z=Math.sin(t*1.8)*.25;result.x=Math.cos(t*1.8)*.14;break;
    case 'feint':result.x=Math.sin(t*7)*(beat.burst?(beat.push>200?.5:.13):.035);break;
  }
  return result;
}
export class FishingFeedback {
  group=new Group();private rings:Mesh[]=[];private material=new MeshBasicMaterial({color:'#fff2c4',transparent:true,opacity:.65,depthWrite:false});
  private splash:LineSegments;
  constructor(){
    const geometry=new TorusGeometry(.22,.009,3,28);
    for(let i=0;i<2;i++){const mesh=new Mesh(geometry,this.material);mesh.rotation.x=-Math.PI/2;this.rings.push(mesh);this.group.add(mesh);}
    const lines=new BufferGeometry();lines.setAttribute('position',new Float32BufferAttribute(new Float32Array(36),3));this.splash=new LineSegments(lines,new LineBasicMaterial({color:'#e5fbef',transparent:true,opacity:.75}));this.splash.frustumCulled=false;this.group.add(this.splash);
  }
  update(x:number,y:number,z:number,time:number,strength:number,danger:boolean,reduced:boolean){
    this.group.position.set(x,y+.02,z);this.group.visible=strength>0;
    this.material.color.set(danger?'#efb382':'#fff2c4');
    for(let i=0;i<2;i++)this.rings[i]!.scale.setScalar(.7+strength+(reduced?i*.3:((time*1.7+i*.5)%1)*1.1));
    this.splash.visible=!reduced&&strength>.5;
    if(this.splash.visible){const points=this.splash.geometry.getAttribute('position');for(let i=0;i<6;i++){const a=i*Math.PI/3,r=.14+strength*.15,h=(.06+Math.abs(Math.sin(time*7+i))*.18)*strength;points.setXYZ(i*2,Math.cos(a)*r,0,Math.sin(a)*r);points.setXYZ(i*2+1,Math.cos(a)*(r+.05),h,Math.sin(a)*(r+.05));}points.needsUpdate=true;}
  }
}
