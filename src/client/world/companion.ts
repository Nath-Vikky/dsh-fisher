import { CircleGeometry,Group,Mesh,MeshBasicMaterial,Sprite,SpriteMaterial,SphereGeometry,BufferGeometry,Float32BufferAttribute,LineSegments,LineBasicMaterial,TorusGeometry } from 'three';
import { spriteName } from '../../game/content.ts';
import type { ActorTextures } from './actors.ts';
import type { Point } from './map.ts';
import { move } from './map.ts';
import type { CoastMap } from './regions.ts';
import type {CompanionId} from '../../game/companions.ts';
import type {SpotId} from './map.ts';
import {COMPANION_ACTION_ART} from '../../game/actor-art.ts';
import type {ActionAtlas} from './actor-atlas.ts';
import {applyAtlas} from './actor-atlas.ts';

export class Companion {
  group=new Group();private material=new SpriteMaterial({alphaTest:.12,depthWrite:true,toneMapped:false});
  private sprite=new Sprite(this.material);private shadow:Mesh;private disposed=false;
  private lastPlayer:Point|null=null;private position:Point={x:0,z:0};
  private loaded:CompanionId|null=null;private generation=0;private playUntil=0;private cloud=new Group();private rain:LineSegments;private ring:Mesh;
  private baseFile='';private atlas:ActionAtlas|null=null;private ready=false;private warming=false;private right=true;private releaseBase:()=>void=()=>{};private releaseActions:()=>void=()=>{};
  constructor(private pictures:ActorTextures){
    this.sprite.center.set(.5,.08);this.sprite.scale.set(1.15,1.15,1);this.sprite.renderOrder=2;
    this.shadow=new Mesh(new CircleGeometry(.23,16),new MeshBasicMaterial({color:'#d7bb7b',transparent:true,opacity:.25,depthWrite:false}));
    this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.01;this.shadow.scale.set(1,.7,1);this.group.add(this.sprite,this.shadow);this.group.visible=false;
    const puff=new SphereGeometry(.24,10,6),cloudMaterial=new MeshBasicMaterial({color:'#dae5e7',transparent:true,opacity:.88});
    for(let i=0;i<3;i++){const mesh=new Mesh(puff,cloudMaterial);mesh.position.set((i-1)*.25,1.8+(i%2)*.12,0);mesh.scale.set(1,.65,.75);this.cloud.add(mesh);}this.group.add(this.cloud);
    const rainGeometry=new BufferGeometry();rainGeometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(12*6),3));
    this.rain=new LineSegments(rainGeometry,new LineBasicMaterial({color:'#a8d4e9',transparent:true,opacity:.65}));this.rain.frustumCulled=false;this.cloud.add(this.rain);
    this.ring=new Mesh(new TorusGeometry(.22,.012,3,28),new MeshBasicMaterial({color:'#ebedac',transparent:true,opacity:.8,depthWrite:false}));this.ring.rotation.x=-Math.PI/2;this.group.add(this.ring);
  }
  play(time:number):void{this.playUntil=time+6;}
  async prepare(id:CompanionId|null):Promise<void>{
    const generation=++this.generation;this.playUntil=0;this.releaseActions();this.releaseActions=()=>{};this.ready=false;this.warming=false;this.atlas=id?COMPANION_ACTION_ART[id]:null;
    if(!id){this.loaded=null;this.releaseBase();this.releaseBase=()=>{};this.material.map=null;return;}
    const file=spriteName(id,'original')!,release=this.pictures.retain([file]);let texture;
    try{texture=await this.pictures.load(file);}catch(error){release();throw error;}
    if(this.disposed||generation!==this.generation){release();return;}this.releaseBase();this.releaseBase=release;this.baseFile=file;
    if(!this.material.map)this.material.needsUpdate=true;this.material.map=texture;
    this.loaded=id;const height=id==='A004'?1.05:1.15,source=texture.image as ImageBitmap;this.sprite.scale.set(height*source.width/source.height,height,1);
  }
  async warmActions():Promise<void>{
    if(!this.atlas||this.warming||this.ready)return;this.warming=true;const generation=this.generation,atlas=this.atlas,release=this.pictures.retain([atlas.file]);
    try{await this.pictures.load(atlas.file);if(this.disposed||generation!==this.generation){release();return;}this.releaseActions=release;this.ready=true;}catch{release();}finally{if(generation===this.generation)this.warming=false;}
  }
  update(id:CompanionId|null,player:Point,time:number,walking:boolean,guarded:boolean,reduced:boolean,map:CoastMap,fishing:SpotId|null):void {
    this.group.visible=!!id&&id===this.loaded&&!!this.material.map;if(!this.group.visible)return;
    if(!this.lastPlayer||player.x!==this.lastPlayer.x||player.z!==this.lastPlayer.z){
      if(this.lastPlayer){const direction=(player.x-this.lastPlayer.x)*.832-(player.z-this.lastPlayer.z)*.555;if(Math.abs(direction)>.001)this.right=direction<0;}
      // Stay beside the player in screen space, with the same shore collision limits.
      this.position=move(player,{x:.6,z:-1.1},map);this.lastPlayer={...player};
    }
    this.group.position.set(this.position.x,.15,this.position.z);
    const playing=time<this.playUntil;
    const frame=guarded&&id==='A002'?3:walking?(reduced?0:Math.floor(time*4)%2):playing?(id==='A002'?2:id==='A013'?(Math.floor(time*3)%2?3:2):Math.floor(time*2)%2?2:3):id==='A004'&&fishing?3:null;
    const atlas=this.ready&&frame!==null?this.atlas:null,texture=this.pictures.textures.get(atlas?atlas.file:this.baseFile);
    if(texture){this.material.map=texture;if(atlas)applyAtlas(this.sprite,texture,atlas,frame!,id==='A004'?1.05:1.15,this.right);else{const height=id==='A004'?1.05:1.15,source=texture.image as ImageBitmap;this.sprite.center.set(.5,.08);this.sprite.scale.set(height*source.width/source.height,height,1);texture.repeat.set(this.right?1:-1,1);texture.offset.set(this.right?0:1,0);}}
    this.sprite.position.y=!reduced&&(walking||playing&&id==='A013')?Math.abs(Math.sin(time*(id==='A013'?6:9)))*(playing?.28:.07):0;
    this.material.rotation=!reduced&&(walking||playing&&id==='A002')?Math.sin(time*9)*(playing?.1:.03):0;
    this.material.color.set(guarded?'#ffe2a0':'#ffffff');this.shadow.scale.setScalar(guarded||playing?1.6:1);
    this.cloud.visible=id==='A004'&&(playing||!!fishing||time%45>38);this.rain.visible=!reduced;
    if(this.cloud.visible&&!reduced){const points=this.rain.geometry.getAttribute('position');for(let i=0;i<12;i++){const y=1.6-((time*1.4+i*.13)%1.5),x=((i*7)%13)/13*.8-.4,z=((i*3)%7)/7*.35;points.setXYZ(i*2,x,y,z);points.setXYZ(i*2+1,x-.02,y-.12,z);}points.needsUpdate=true;}
    this.ring.visible=id==='A013'&&!!fishing;
    if(this.ring.visible){const water=map.places[fishing!].water!;this.ring.position.set(water.x-this.position.x,water.y-.12,water.z-this.position.z);this.ring.scale.setScalar(reduced?1:1+Math.sin(time*2)*.12);}
  }
  get actionsReady():boolean{return this.ready;}
  dispose():void{this.disposed=true;this.generation++;this.releaseBase();this.releaseActions();this.material.dispose();this.rain.geometry.dispose();(this.rain.material as LineBasicMaterial).dispose();}
}
