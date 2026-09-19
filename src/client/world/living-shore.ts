import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Sprite,SpriteMaterial} from 'three';
import type {Bootstrap} from '../../protocol.ts';
import {spriteName} from '../../game/content.ts';
import {thumbnailAsset} from '../../game/art.ts';
import type {DecorId,DecorSlot} from '../../game/decor.ts';
import {CORNERS} from './facilities.ts';
import {decorModel,disposeDecor} from './decor-models.ts';
import type {ActorTextures} from './actors.ts';
import type {CoastMap} from './regions.ts';
import type {Point} from './map.ts';
import {VisitorRoutine} from './visitor-routine.ts';

export function furnishedMap(map:CoastMap):CoastMap {
  const p=CORNERS[map.id];
  return {...map,circles:[...(map.circles??[]),[p.x,p.z,.6],[p.x+1.55,p.z,.43],[p.x-1.35,p.z,.38]]};
}
export class LivingShore {
  group=new Group();private box=new BoxGeometry(1,1,1);private wood=new MeshStandardMaterial({color:'#b69b75',roughness:.88});
  private slots=new Map<DecorSlot,{group:Group;id:DecorId|null}>();private sprites:Sprite[]=[];private spriteMaterials:SpriteMaterial[]=[];
  private key='';private generation=0;private disposed=false;private fishCount=0;private files:(string|null)[]=[];
  private routine:VisitorRoutine;
  private pictures:ActorTextures;
  constructor(pictures:ActorTextures,map:CoastMap){
    this.pictures=pictures;this.routine=new VisitorRoutine(map);
    const p=CORNERS[map.id];this.group.position.set(p.x,.14,p.z);
    this.cube(this.group,this.wood,0,.2,0,1.32,.4,.7);
    const water=new MeshStandardMaterial({color:'#72c9c5',roughness:.35,transparent:true,opacity:.35,depthWrite:false});
    this.cube(this.group,water,0,.77,0,1.23,.7,.61);
    for(const x of [-.66,.66])this.cube(this.group,this.wood,x,.73,0,.05,.8,.73);
    for(const y of [.39,1.12])this.cube(this.group,this.wood,0,y,.35,1.35,.045,.035);
    for(const slot of ['ground','seat','lamp','sign','background','shelf'] as const){const group=decorModel(slot,null);group.visible=slot==='seat'||slot==='shelf';this.slots.set(slot,{group,id:null});this.group.add(group);}
    for(let i=0;i<14;i++){
      const material=new SpriteMaterial({alphaTest:.12,depthWrite:false,toneMapped:false}),sprite=new Sprite(material);sprite.scale.setScalar(i<8?.29:.32);sprite.visible=false;sprite.renderOrder=3;
      this.sprites.push(sprite);this.spriteMaterials.push(material);this.group.add(sprite);
    }
  }
  private cube(group:Group,material:MeshStandardMaterial,x:number,y:number,z:number,w:number,h:number,d:number){
    const mesh=new Mesh(this.box,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=!material.transparent;group.add(mesh);
  }
  async sync(data:Bootstrap):Promise<boolean>{
    const files=[...data.life.aquarium.map(id=>{const item=data.inventory.find(item=>item.id===id);return item?spriteName(item.speciesId,item.variant):null;}),...data.life.shelf.map(entry=>{
      if(entry?.kind==='relic')return spriteName(entry.id);const item=entry?.kind==='catch'?data.inventory.find(item=>item.id===entry.id):null;return item?spriteName(item.speciesId,item.variant):null;
    })].map(file=>file?thumbnailAsset(file):null);
    const key=JSON.stringify([files,data.life.decor]);if(key===this.key)return false;this.key=key;const generation=++this.generation;
    this.files=files;this.fishCount=files.slice(0,8).filter(Boolean).length;
    for(const [slot,value] of this.slots){const id=data.life.decor[slot]??null;if(value.id!==id){this.group.remove(value.group);disposeDecor(value.group);value.group=decorModel(slot,id);value.id=id;this.group.add(value.group);}value.group.visible=slot==='seat'||slot==='shelf'||!!id;}
    await Promise.all(files.filter((file):file is string=>!!file).map(file=>this.pictures.load(file)));
    if(this.disposed||generation!==this.generation)return false;
    for(let i=0;i<14;i++){const material=this.spriteMaterials[i]!,texture=files[i]?this.pictures.textures.get(files[i]!):undefined;if(!!texture!==!!material.map)material.needsUpdate=true;material.map=texture??null;this.sprites[i]!.visible=!!texture;}
    return true;
  }
  update(time:number,reduced:boolean):void {
    for(let i=0;i<14;i++){
      const sprite=this.sprites[i]!;if(!sprite.visible)continue;
      if(i<8)sprite.position.set(-.42+(i%4)*.28+(!reduced?Math.sin(time*.65+i)*.018:0),.57+Math.floor(i/4)*.27,.27);
      else sprite.position.set(1.25+((i-8)%3)*.3,.41+Math.floor((i-8)/3)*.41,.28);
    }
  }
  visitor(dt:number,time:number,player:Point,freeze:boolean,picnic=false){return this.routine.update(dt,time,player,freeze,picnic);}
  get visitorPoint():Point{return this.routine.point;}
  get activity():string{return !this.fishCount&&this.routine.activity==='正在看鱼缸里的收藏'?'在看看小鱼缸':this.routine.activity;}
  get visibleCollection(){return this.files.filter(Boolean).length;}
  dispose():void{this.disposed=true;this.generation++;for(const material of this.spriteMaterials)material.dispose();}
}
