import {CircleGeometry,CylinderGeometry,Group,LinearFilter,LinearMipmapLinearFilter,Mesh,MeshBasicMaterial,MeshStandardMaterial,Sprite,SpriteMaterial,SRGBColorSpace,Texture,TorusGeometry,Vector3} from 'three';
import type {Camera} from 'three';
import {API} from '../../protocol.ts';
import {WORLD_PLAYER_ART,guestPicture} from '../../game/visuals.ts';
import type {Outfit} from '../../game/visuals.ts';
import type {GuestId} from '../../game/guests.ts';
import {PLAYER_DRAWN_HEIGHT,PLAYER_FOOT,PLAYER_HANDS,playerMotion} from '../player-motion.ts';
import type {ActorPose} from '../player-motion.ts';
import {DecodedCache} from '../decoded-cache.ts';
import type {ImageLease} from '../decoded-cache.ts';
import {GUEST_ACTION_ART} from '../../game/actor-art.ts';
import {applyAtlas} from './actor-atlas.ts';
import type {ActionAtlas} from './actor-atlas.ts';

const bitmaps=new DecodedCache<ImageBitmap>(async(file,signal)=>{
  const response=await fetch(`${API}/assets/${file}`,{credentials:'same-origin',signal});
  if(!response.ok)throw new Error(`Character image unavailable: ${file} (${response.status})`);
  // Orientation is decoded once; every scene uploads its own GPU texture.
  return createImageBitmap(await response.blob(),{imageOrientation:'flipY',premultiplyAlpha:'none',...file.endsWith('-actions-v1.png')?{resizeWidth:1024,resizeHeight:1024,resizeQuality:'high' as const}:{}});
},picture=>picture.close(),picture=>picture.width*picture.height*4,16*1024*1024);

export class ActorTextures {
  textures=new Map<string,Texture>();
  private pending=new Map<string,Promise<Texture>>();private leases=new Map<string,ImageLease<ImageBitmap>>();private disposed=false;
  private holds=new Map<string,number>();
  cacheHits=0;cacheMisses=0;
  get decodedBytes(){return bitmaps.bytes;}
  retain(files:readonly string[]):()=>void{
    for(const file of files)this.holds.set(file,(this.holds.get(file)??0)+1);
    let released=false;return ()=>{if(released)return;released=true;for(const file of files){const count=(this.holds.get(file)??1)-1;if(count>0)this.holds.set(file,count);else{this.holds.delete(file);void this.pending.get(file)?.then(()=>this.releaseIdle(file),()=>{});this.releaseIdle(file);}}};
  }
  private releaseIdle(file:string):void{
    if(this.holds.has(file)||!this.textures.has(file))return;
    this.textures.get(file)!.dispose();this.textures.delete(file);this.pending.delete(file);this.leases.get(file)?.release();this.leases.delete(file);
  }
  load(file:string):Promise<Texture>{
    if(this.disposed)return Promise.reject(new Error('Character loading stopped'));
    const ready=this.textures.get(file);if(ready)return Promise.resolve(ready);
    const pending=this.pending.get(file);if(pending)return pending;
    const lease=bitmaps.acquire(file);this.leases.set(file,lease);if(lease.cached)this.cacheHits++;else this.cacheMisses++;
    const task=lease.ready.then(picture=>{
      if(this.disposed)throw new Error('Character loading stopped');
      const texture=new Texture(picture);texture.flipY=false;texture.colorSpace=SRGBColorSpace;texture.magFilter=LinearFilter;texture.minFilter=LinearMipmapLinearFilter;texture.needsUpdate=true;
      this.textures.set(file,texture);return texture;
    }).catch(error=>{
      lease.release();this.leases.delete(file);this.pending.delete(file);throw error;
    });
    this.pending.set(file,task);return task;
  }
  dispose():void{this.disposed=true;for(const texture of this.textures.values())texture.dispose();for(const lease of this.leases.values())lease.release();this.textures.clear();this.pending.clear();this.leases.clear();this.holds.clear();}
}

// Camera-facing cutouts retain the hand-painted detail while participating in scene depth.
export class SpriteActor {
  group=new Group();private material=new SpriteMaterial({alphaTest:.12,transparent:true,depthWrite:true,toneMapped:false});
  private sprite=new Sprite(this.material);private rodMaterial=new MeshStandardMaterial({color:'#795238',roughness:.65});private rod=new Group();
  private right=true;private picture='';private tip=new Vector3();private screenRight=new Vector3();private screenUp=new Vector3();private screenForward=new Vector3();private rodDirection=new Vector3();private up=new Vector3(0,1,0);
  private height:number;private guestFile='';private pose:ActorPose|'sit'|'observe'='idle';private poseStarted=0;private preparation=0;
  private atlas:ActionAtlas|null=null;private actionReady=false;private releasePictures:()=>void=()=>{};private releaseActions:()=>void=()=>{};private guestCenter=.02;private warming=false;
  constructor(private pictures:ActorTextures,private visitor=false){
    this.height=visitor?2.18:2;this.sprite.center.set(.5,.02);this.sprite.scale.set(this.height,this.height,1);this.sprite.renderOrder=2;
    const shaft=new Mesh(new CylinderGeometry(.011,.025,2.1,7),this.rodMaterial);shaft.position.y=1.05;
    const handle=new Mesh(new CylinderGeometry(.047,.047,.28,8),new MeshStandardMaterial({color:'#d8bd84',roughness:.9}));handle.position.y=.05;
    const reel=new Mesh(new TorusGeometry(.075,.017,5,12),new MeshStandardMaterial({color:'#5a7271',metalness:.45,roughness:.5}));reel.position.set(.07,.06,0);
    this.rod.add(shaft,handle,reel);this.rod.visible=false;
    this.group.add(this.sprite,this.rod);
    const shadow=new Mesh(new CircleGeometry(.33,24),new MeshBasicMaterial({color:'#27483f',transparent:true,opacity:.23,depthWrite:false}));
    shadow.rotation.x=-Math.PI/2;shadow.scale.set(1,.62,1);shadow.position.y=.014;this.group.add(shadow);
  }
  async prepare(guest?:GuestId|null,outfit:Outfit='base',rod='D01'):Promise<void>{
    const preparation=++this.preparation;
    const files:string[]=this.visitor?(guest?[guestPicture(guest,outfit,'chibi')!]:[]):Object.values(WORLD_PLAYER_ART);
    const release=this.pictures.retain(files);this.releaseActions();this.releaseActions=()=>{};this.actionReady=false;this.warming=false;this.atlas=this.visitor&&guest?GUEST_ACTION_ART[guest][outfit]:null;
    if(this.visitor)this.guestFile=files[0]??'';
    else{const colors:Record<string,string>={D01:'#795238',D02:'#54785c',D03:'#617e9b',D04:'#424e69',D05:'#60a9a4',D06:'#b79662'};this.rodMaterial.color.set(colors[rod]??colors.D01!);}
    try{await Promise.all(files.map(file=>this.pictures.load(file)));}catch(error){release();throw error;}
    if(preparation!==this.preparation){release();return;}
    this.releasePictures();this.releasePictures=release;
    const map=this.pictures.textures.get(this.visitor?this.guestFile:WORLD_PLAYER_ART.idle)??null;
    if(!!map!==!!this.material.map)this.material.needsUpdate=true;
    this.material.map=map;this.picture='';
    this.guestCenter=guest==='G003'&&outfit==='base'?.076:.02;
    this.sprite.center.y=this.visitor?this.guestCenter:1-PLAYER_FOOT;
  }
  async warmActions():Promise<void>{
    if(!this.atlas||this.warming||this.actionReady)return;this.warming=true;const generation=this.preparation,atlas=this.atlas,release=this.pictures.retain([atlas.file]);
    try{await this.pictures.load(atlas.file);if(generation!==this.preparation){release();return;}this.releaseActions=release;this.actionReady=true;}catch{release();}finally{if(generation===this.preparation)this.warming=false;}
  }
  private back=false;
  face(right:boolean,back=false):void{this.right=right;this.back=back;}
  get facing(){return {right:this.right,back:this.back};}
  animate(pose:ActorPose|'sit'|'observe',time:number,reduced:boolean,camera:Camera):void{
    if(pose!==this.pose){this.pose=pose;this.poseStarted=time;}
    const motion=playerMotion(pose==='sit'||pose==='observe'?'idle':pose,time-this.poseStarted,reduced,this.back);
    const atlas=this.visitor&&this.actionReady&&['walk','sit','observe'].includes(pose)?this.atlas:null;
    const frame=pose==='sit'?2:pose==='observe'?3:reduced?0:Math.floor((time-this.poseStarted)*3.8)%2;
    const file=atlas?atlas.file:this.visitor?this.guestFile:motion.file;
    const texture=this.pictures.textures.get(file);
    if(texture){
      if(this.picture!==file){if(!this.material.map)this.material.needsUpdate=true;this.material.map=texture;this.picture=file;}
      const source=texture.image as ImageBitmap;
      const height=this.visitor?this.height:this.height/PLAYER_DRAWN_HEIGHT;
      if(atlas)applyAtlas(this.sprite,texture,atlas,frame,this.height*.96,this.right);
      else{this.sprite.scale.set(height*source.width/source.height,height*(this.visitor?1:motion.stretch),1);this.sprite.center.y=this.visitor?this.guestCenter:1-PLAYER_FOOT;texture.repeat.set(this.right?1:-1,1);texture.offset.set(this.right?0:1,0);}
    }
    this.sprite.visible=!!texture;this.sprite.position.set(0,this.visitor?(atlas&&pose==='sit'?atlas.seatLift:!reduced&&pose==='walk'?Math.abs(Math.sin(time*6))*.02:0):motion.bob,0);
    // A camera-facing seated cutout otherwise leans through the chair back.
    // Move only along view depth, keeping its projected seat contact unchanged.
    if(atlas&&pose==='sit'){camera.getWorldDirection(this.screenForward);this.sprite.position.addScaledVector(this.screenForward,-.85);}
    this.material.rotation=this.visitor?0:motion.rotation;
    const fishing=!this.visitor&&['cast','hold','reel'].includes(pose);this.rod.visible=fishing;
    if(!fishing)return;
    const hand=PLAYER_HANDS[file]??PLAYER_HANDS[WORLD_PLAYER_ART.hold]!;
    const handX=((this.right?hand[0]:1-hand[0])-.5)*this.sprite.scale.x,handY=(PLAYER_FOOT-hand[1])*this.sprite.scale.y;
    const turn=this.material.rotation,gripX=handX*Math.cos(turn)-handY*Math.sin(turn),gripY=handX*Math.sin(turn)+handY*Math.cos(turn);
    this.screenRight.setFromMatrixColumn(camera.matrixWorld,0);this.screenUp.setFromMatrixColumn(camera.matrixWorld,1);camera.getWorldDirection(this.screenForward);
    this.rod.position.copy(this.screenRight).multiplyScalar(gripX).addScaledVector(this.screenUp,gripY).addScaledVector(this.screenForward,.018);this.rod.position.y+=motion.bob;
    this.rodDirection.set(0,1.2+motion.rodLift,1.8).normalize();this.rod.quaternion.setFromUnitVectors(this.up,this.rodDirection);
    this.tip.copy(this.group.position).add(this.rod.position).addScaledVector(this.rodDirection,2.1);
  }
  rodTip():Vector3{return this.tip;}
  get frame():string{return this.picture;}
  get action():ActorPose|'sit'|'observe'{return this.pose;}
  get actionsReady():boolean{return this.actionReady;}
  dispose():void{this.preparation++;this.releasePictures();this.releaseActions();this.material.dispose();}
}
