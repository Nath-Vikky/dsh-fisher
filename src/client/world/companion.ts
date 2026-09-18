import { CircleGeometry,Group,Mesh,MeshBasicMaterial,Sprite,SpriteMaterial } from 'three';
import { spriteName } from '../../game/content.ts';
import type { ActorTextures } from './actors.ts';
import type { Point } from './map.ts';
import { move } from './map.ts';
import type { CoastMap } from './regions.ts';

export class Companion {
  group=new Group();private material=new SpriteMaterial({alphaTest:.12,depthWrite:true,toneMapped:false});
  private sprite=new Sprite(this.material);private shadow:Mesh;private disposed=false;
  private lastPlayer:Point|null=null;private position:Point={x:0,z:0};
  constructor(private pictures:ActorTextures){
    this.sprite.center.set(.5,.08);this.sprite.scale.set(1.15,1.15,1);this.sprite.renderOrder=2;
    this.shadow=new Mesh(new CircleGeometry(.23,16),new MeshBasicMaterial({color:'#d7bb7b',transparent:true,opacity:.25,depthWrite:false}));
    this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.01;this.shadow.scale.set(1,.7,1);this.group.add(this.sprite,this.shadow);this.group.visible=false;
  }
  async prepare(enabled:boolean):Promise<void>{
    if(!enabled)return;const texture=await this.pictures.load(spriteName('A002','original')!);if(this.disposed)return;
    if(!this.material.map)this.material.needsUpdate=true;this.material.map=texture;
    const source=texture.image as ImageBitmap;this.sprite.scale.set(1.15*source.width/source.height,1.15,1);
  }
  update(enabled:boolean,player:Point,time:number,walking:boolean,guarded:boolean,reduced:boolean,map:CoastMap):void {
    this.group.visible=enabled&&!!this.material.map;if(!this.group.visible)return;
    if(!this.lastPlayer||player.x!==this.lastPlayer.x||player.z!==this.lastPlayer.z){
      // Stay beside the player in screen space, with the same shore collision limits.
      this.position=move(player,{x:.6,z:-1.1},map);this.lastPlayer={...player};
    }
    this.group.position.set(this.position.x,.15,this.position.z);
    this.sprite.position.y=!reduced&&walking?Math.abs(Math.sin(time*9))*.07:0;
    this.material.rotation=!reduced&&walking?Math.sin(time*9)*.03:0;
    this.material.color.set(guarded?'#ffe2a0':'#ffffff');this.shadow.scale.setScalar(guarded?1.8:1);
  }
  dispose():void{this.disposed=true;this.material.dispose();}
}
