import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Sprite,SpriteMaterial} from 'three';
import type {Bootstrap} from '../../protocol.ts';
import {spriteName} from '../../game/content.ts';
import {thumbnailAsset} from '../../game/art.ts';
import {decor} from '../../game/decor.ts';
import type {ActorTextures} from './actors.ts';
import type {CoastMap} from './regions.ts';
import type {Point} from './map.ts';
import {distance,move,route,walkable} from './map.ts';

const CORNERS:Record<CoastMap['id'],Point>={L01:{x:1.2,z:-.65},L02:{x:1.5,z:.2},L03:{x:1,z:2.35},L04:{x:.6,z:-.9}};
const COLORS={afternoon:'#af9874',coral:'#e4a385',moon:'#7e91b4',deep:'#647e9d'};
export function furnishedMap(map:CoastMap):CoastMap {
  const p=CORNERS[map.id];
  return {...map,circles:[...(map.circles??[]),[p.x,p.z,.6],[p.x+1.55,p.z,.43],[p.x-1.35,p.z,.38]]};
}
export class LivingShore {
  group=new Group();private box=new BoxGeometry(1,1,1);private wood=new MeshStandardMaterial({color:'#b69b75',roughness:.88});
  private slots=new Map<string,{group:Group;material:MeshStandardMaterial}>();private sprites:Sprite[]=[];private spriteMaterials:SpriteMaterial[]=[];
  private key='';private generation=0;private disposed=false;private fishCount=0;private files:(string|null)[]=[];
  private visitorPath:Point[]=[];private nextVisit=0;private place=0;private actorPosition:Point|null=null;activity='在岸边等你';
  private pictures:ActorTextures;private map:CoastMap;
  constructor(pictures:ActorTextures,map:CoastMap){
    this.pictures=pictures;this.map=map;
    const p=CORNERS[map.id];this.group.position.set(p.x,.14,p.z);
    this.cube(this.group,this.wood,0,.2,0,1.32,.4,.7);
    const water=new MeshStandardMaterial({color:'#72c9c5',roughness:.35,transparent:true,opacity:.35,depthWrite:false});
    this.cube(this.group,water,0,.77,0,1.23,.7,.61);
    for(const x of [-.66,.66])this.cube(this.group,this.wood,x,.73,0,.05,.8,.73);
    for(const y of [.39,1.12])this.cube(this.group,this.wood,0,y,.35,1.35,.045,.035);
    for(const y of [.22,.64,1.06])this.cube(this.group,this.wood,1.55,y,0,.86,.065,.53);
    for(const x of [1.1,2])this.cube(this.group,this.wood,x,.55,-.15,.055,1.15,.36);
    for(const slot of ['ground','seat','lamp','sign','background','shelf']){
      const group=new Group(),material=new MeshStandardMaterial({color:'#c5b392',roughness:.8});this.slots.set(slot,{group,material});this.group.add(group);
      if(slot==='ground')this.cube(group,material,.3,.015,0,3.5,.03,1.4);
      if(slot==='seat'){
        this.cube(group,material,-1.35,.43,0,.9,.12,.55);this.cube(group,material,-1.35,.79,-.23,.9,.55,.08);
        for(const x of [-1.68,-1.02])this.cube(group,this.wood,x,.2,0,.08,.4,.48);
      }
      if(slot==='lamp'){this.cube(group,this.wood,2.3,.64,-.1,.07,1.28,.07);this.cube(group,material,2.3,1.36,-.1,.25,.32,.25);material.emissive.set('#ead798');material.emissiveIntensity=.55;}
      if(slot==='sign'){this.cube(group,this.wood,-2,.35,.1,.055,.7,.055);this.cube(group,material,-2,.78,.1,.66,.4,.07);}
      if(slot==='background')this.cube(group,material,0,.76,-.32,1.27,.68,.04);
      if(slot==='shelf')this.cube(group,material,1.55,.65,-.24,.87,1,.04);
    }
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
    for(const [slot,value] of this.slots){const id=data.life.decor[slot as keyof typeof data.life.decor];value.group.visible=slot==='seat'||!!id;value.material.color.set(id?COLORS[decor(id).theme]:'#b69b75');}
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
  visitor(dt:number,time:number,player:Point,freeze:boolean):{position:Point;walking:boolean} {
    this.actorPosition??={...this.map.places.guest};const current=this.actorPosition,p=CORNERS[this.map.id];
    const stops=[{...this.map.places.guest},{x:p.x,z:p.z+1},{x:p.x-1.35,z:p.z+.82},{x:p.x+1.55,z:p.z+.85}];
    if(freeze||distance(player,current)<1.65)return {position:current,walking:false};
    if(!this.visitorPath.length&&time>=this.nextVisit){
      this.place=(this.place+1)%stops.length;const target=stops[this.place]!;
      if(walkable(target,this.map))this.visitorPath=route(current,target,this.map);
      this.nextVisit=time+14;this.activity=['在岸边等你',this.fishCount?'在看鱼缸里的收藏':'在看看小鱼缸','在长椅旁歇脚','在看陈列架'][this.place]!;
    }
    const target=this.visitorPath[0];if(!target||dt===0)return {position:current,walking:false};
    const length=distance(current,target);if(length<.025){this.visitorPath.shift();return {position:current,walking:false};}
    const step=Math.min(length,dt*.65);this.actorPosition=move(current,{x:(target.x-current.x)/length*step,z:(target.z-current.z)/length*step},this.map);
    return {position:this.actorPosition,walking:distance(current,this.actorPosition)>.001};
  }
  get visitorPoint():Point{return this.actorPosition??this.map.places.guest;}
  get visibleCollection(){return this.files.filter(Boolean).length;}
  dispose():void{this.disposed=true;this.generation++;for(const material of this.spriteMaterials)material.dispose();}
}
