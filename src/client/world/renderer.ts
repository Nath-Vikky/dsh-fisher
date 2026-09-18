import {ACESFilmicToneMapping,BufferGeometry,Color,DirectionalLight,Float32BufferAttribute,Fog,Group,HemisphereLight,Line,LineBasicMaterial,Mesh,MeshLambertMaterial,OrthographicCamera,PCFShadowMap,Scene,SphereGeometry,Vector3,WebGLRenderer} from 'three';
import type {WorldProps} from './contracts.ts';
import {Scenery,disposeModel} from './scenery.ts';
import {ActorTextures,SpriteActor} from './actors.ts';
import {distance,move,nearby,route,screenDirection,walkable} from './map.ts';
import type {PlaceId,Point,SpotId} from './map.ts';
import {COASTS} from './regions.ts';
import type {CoastMap} from './regions.ts';
import {shoreVisitor} from '../../game/shore.ts';
import {ShoreScene} from './shore-scene.ts';
import {automaticSpot} from '../../game/auto-fishing.ts';
import type {SpeciesId} from '../../game/content.ts';
import {Companion} from './companion.ts';
import {playerFacing} from '../player-motion.ts';

export interface WorldState {near:PlaceId|null;walking:boolean;destination:PlaceId|null;spot:SpotId;ready:boolean}
const selectedSpot=(data:WorldProps['data'])=>data.active?.setup?.spot??(data.autoFishing.enabled?automaticSpot(data.autoFishing.goal,data.journey.region,data.shore,Object.keys(data.catalog) as SpeciesId[]):data.shore.spots[data.journey.region]);
const nextTask=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
export class CoastWorld {
  private renderer:WebGLRenderer;
  private scene=new Scene();private camera=new OrthographicCamera();private content=new Group();
  private scenery:Scenery;private shoreScene:ShoreScene;private pictures=new ActorTextures();private player=new SpriteActor(this.pictures);private visitor=new SpriteActor(this.pictures,true);private companion=new Companion(this.pictures);private actorKey='';
  private line:Line;private bobber:Mesh;
  private options:WorldProps;
  private map:CoastMap;private position:Point;private spot:SpotId='pier';private input:Point={x:0,z:0};
  private path:Point[]=[];private destination:PlaceId|null=null;private frame=0;private last=0;private time=0;
  private ready=false;private disposed=false;private visible=true;private focused=document.hasFocus();private published='';private lastSave=0;private walking=false;
  private resizeObserver:ResizeObserver;private intersection:IntersectionObserver;
  private systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
  private target=new Vector3();private aim=new Vector3();private cameraOffset=new Vector3(10,17,15);
  private key:string;private started=performance.now();private wasAutomatic=false;private celebrateUntil=0;
  private savedPosition='';private waterPoint=new Vector3();private uploaded=new WeakSet<object>();private diagnosticAt=0;
  constructor(private canvas:HTMLCanvasElement,options:WorldProps,private changed:(state:WorldState)=>void,private failed:()=>void){
    this.options=options;this.map=COASTS[options.data.journey.region];this.position={...this.map.spawn};
    this.key=`dsh-fisher:walk:v1:${options.data.saveId}${this.map.id==='L01'?'':`:${this.map.id}`}`;
    try{const saved=JSON.parse(localStorage.getItem(this.key)??'null') as {position?:Point;spot?:string}|null;
      if(saved?.position&&walkable(saved.position,this.map))this.position={...saved.position};if(saved?.spot==='pier'||saved?.spot==='cove')this.spot=saved.spot;
    }catch{/* Position is optional; game progress belongs to the host. */}
    this.spot=selectedSpot(options.data);
    const places=this.map.places,light=this.map.light;
    if(options.data.active||options.data.autoFishing.enabled)this.position={x:places[this.spot].x,z:places[this.spot].z};
    this.renderer=new WebGLRenderer({canvas,antialias:true,powerPreference:'low-power',alpha:false});
    this.renderer.setClearColor(light.fog);this.renderer.toneMapping=ACESFilmicToneMapping;this.renderer.toneMappingExposure=light.exposure;
    this.renderer.shadowMap.type=PCFShadowMap;this.renderer.shadowMap.autoUpdate=false;
    this.scene.background=new Color(light.fog);this.scene.fog=new Fog(light.fog,27,60);
    this.scene.matrixAutoUpdate=false;this.content.matrixAutoUpdate=false;
    const sun=new DirectionalLight(light.sun,light.strength);sun.position.set(-5,14,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.camera.near=.5;sun.shadow.camera.far=40;sun.shadow.bias=-.0004;sun.shadow.normalBias=.035;
    this.scene.add(new HemisphereLight(light.sky,light.ground,light.ambient),sun,this.content);
    this.shoreScene=new ShoreScene(this.map.id);this.scenery=new Scenery(this.map);this.content.add(this.shoreScene.group,this.scenery.group,this.player.group,this.visitor.group,this.companion.group);
    this.visitor.group.position.set(places.guest.x+.8,.145,places.guest.z-.5);this.visitor.face(false);
    const lineGeometry=new BufferGeometry();lineGeometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(9),3));
    this.line=new Line(lineGeometry,new LineBasicMaterial({color:'#657c79',transparent:true,opacity:.8}));this.line.frustumCulled=false;this.content.add(this.line);
    this.bobber=new Mesh(new SphereGeometry(.065,8,6),new MeshLambertMaterial({color:'#e7a488'}));this.content.add(this.bobber);
    this.resizeObserver=new ResizeObserver(this.resize);this.resizeObserver.observe(canvas);
    this.intersection=new IntersectionObserver(entries=>{this.visible=entries.some(entry=>entry.isIntersecting);this.start();});this.intersection.observe(canvas);
    document.addEventListener('visibilitychange',this.visibility);window.addEventListener('blur',this.blur);window.addEventListener('focus',this.focus);
    this.systemMotion.addEventListener('change',this.start);canvas.addEventListener('webglcontextlost',this.contextLost);
    this.aim.set(this.position.x*.6,0,this.position.z*.5);this.target.copy(this.aim);this.resize();
    this.update(options);this.publish();
  }
  async prepare():Promise<void>{
    await nextTask();if(this.disposed)return;
    const texturesStarted=performance.now();await this.prepareActors();if(this.disposed)return;
    this.canvas.dataset.texturesMs=String(Math.round(performance.now()-texturesStarted));
    this.draw(0,false);
    const compileStarted=performance.now();
    await this.renderer.compileAsync(this.scene,this.camera);
    this.canvas.dataset.compileMs=String(Math.round(performance.now()-compileStarted));
    if(this.disposed)return;
    await nextTask();if(this.disposed)return;
    // Upload geometry and complete a real first frame behind the loading cover.
    this.renderer.render(this.scene,this.camera);this.ready=true;
    this.canvas.dataset.readyMs=String(Math.round(performance.now()-this.started));
    this.canvas.dataset.drawCalls=String(this.renderer.info.render.calls);this.canvas.dataset.triangles=String(this.renderer.info.render.triangles);
    this.canvas.dataset.renderState='ready';this.publish();this.start();
  }
  private async prepareActors():Promise<void>{
    const data=this.options.data,visitor=shoreVisitor(data.shore,this.map.id,data.life.visitor),outfit=visitor?data.life.guests[visitor].outfit:'base';
    this.actorKey=`${visitor??''}|${outfit}|${data.journey.loadout.rod}|${this.companionEnabled}`;
    await Promise.all([this.player.prepare(null,'base',data.journey.loadout.rod),this.visitor.prepare(visitor,outfit),this.companion.prepare(this.companionEnabled)]);
    if(this.disposed)return;
    let count=0;
    for(const texture of this.pictures.textures.values()){
      if(this.disposed)return;if(this.uploaded.has(texture))continue;
      this.renderer.initTexture(texture);this.uploaded.add(texture);
      if(++count%3===0)await nextTask();
    }
    if(this.disposed)return;
    this.canvas.dataset.textureCacheHits=String(this.pictures.cacheHits);this.canvas.dataset.textureCacheMisses=String(this.pictures.cacheMisses);this.canvas.dataset.decodedBytes=String(this.pictures.decodedBytes);
    this.start();
  }
  private resize=()=>{
    if(this.disposed)return;const rect=this.canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
    this.renderer.setPixelRatio(Math.min(this.options.lowPerformance?1:1.5,window.devicePixelRatio||1));this.renderer.setSize(rect.width,rect.height,false);
    this.renderer.shadowMap.enabled=!this.options.lowPerformance;this.renderer.shadowMap.needsUpdate=!this.options.lowPerformance;
    const height=this.options.data.active?13.2:16,width=height*rect.width/rect.height;
    this.camera.left=-width/2;this.camera.right=width/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.near=.1;this.camera.far=90;this.camera.updateProjectionMatrix();this.start();
  };
  private visibility=()=>{if(document.hidden){this.input={x:0,z:0};this.persist();}this.start();};
  private blur=()=>{this.focused=false;this.input={x:0,z:0};this.persist();this.start();};
  private focus=()=>{this.focused=true;this.start();};
  private contextLost=(event:Event)=>{event.preventDefault();if(!this.disposed){this.canvas.dataset.renderState='lost';this.dispose();this.failed();}};
  private get reduced(){return this.options.reducedMotion||this.systemMotion.matches;}
  private get companionEnabled(){const data=this.options.data;return data.active?data.active.challenge.guard==='A002':data.shore.companion==='A002';}
  private get suspended(){return this.disposed||!this.ready||!this.visible||document.hidden||!this.focused||this.options.overlay;}
  private get locked(){return this.options.blocked||!!this.options.data.active||!!this.options.data.pending||this.options.data.autoFishing.enabled;}
  update(options:WorldProps):void {
    const before=this.options;this.options=options;
    if(this.disposed)return;
    // Let the catch reaction play when the reward overlay releases the scene.
    if(options.data.shore.story!==before.data.shore.story)this.renderer.shadowMap.needsUpdate=true;
    if(options.pose==='surprise'&&before.pose!=='surprise')this.celebrateUntil=this.time+1.1;
    this.visitor.group.visible=!!shoreVisitor(options.data.shore,this.map.id,options.data.life.visitor);
    const visitor=shoreVisitor(options.data.shore,this.map.id,options.data.life.visitor),key=`${visitor??''}|${visitor?options.data.life.guests[visitor].outfit:'base'}|${options.data.journey.loadout.rod}|${this.companionEnabled}`;
    if(this.ready&&key!==this.actorKey)void this.prepareActors().catch(()=>{if(!this.disposed){this.dispose();this.failed();}});
    const auto=options.data.autoFishing.enabled;
    const savedSpot=selectedSpot(options.data);
    const spotChanged=savedSpot!==selectedSpot(before.data);
    if(spotChanged)this.spot=savedSpot;
    if(auto&&(!this.wasAutomatic||spotChanged))this.go(savedSpot,true);
    if(!auto&&this.wasAutomatic){this.path=[];this.destination=null;}
    this.wasAutomatic=auto;
    if(options.data.active&&!options.data.active.automatic&&!before.data.active){this.path=[];this.destination=null;const place=this.map.places[this.spot];this.position={x:place.x,z:place.z};}
    if(this.locked||options.overlay)this.input={x:0,z:0};
    if(!!before.data.active!==!!options.data.active||before.lowPerformance!==options.lowPerformance)this.resize();
    this.publish();this.start();
  }
  setInput(x:number,y:number):void {
    if(this.locked||this.options.overlay||!this.ready)return;
    this.input=screenDirection(x,y);if(Math.hypot(x,y)>.12){this.path=[];this.destination=null;}
    this.start();
  }
  go(id:PlaceId,automatic=false):void {
    if(this.disposed||this.locked&&!automatic||id==='guest'&&!shoreVisitor(this.options.data.shore,this.map.id,this.options.data.life.visitor))return;
    const target=this.map.places[id];this.path=route(this.position,target,this.map);this.destination=this.path.length?id:null;this.input={x:0,z:0};
    if(id!=='guest')this.spot=id;this.publish();this.start();
  }
  dock():SpotId|null {
    const at=nearby(this.position,false,this.map);if(at!=='pier'&&at!=='cove'||this.locked)return null;
    this.spot=at;const place=this.map.places[at];this.position={x:place.x,z:place.z};this.path=[];this.destination=null;this.input={x:0,z:0};this.persist();this.start();return at;
  }
  private start=()=>{
    if(this.suspended){cancelAnimationFrame(this.frame);this.frame=0;if(this.ready&&!this.disposed)this.canvas.dataset.renderState='paused';return;}
    if(this.frame)return;
    this.canvas.dataset.renderState='ready';this.last=performance.now();this.draw(0);this.frame=requestAnimationFrame(this.tick);
  };
  private tick=(now:number)=>{
    this.frame=0;
    if(this.suspended)return;
    const interval=1000/(this.options.lowPerformance?20:30);
    if(now-this.last>=interval-.5){const dt=Math.min(.08,(now-this.last)/1000);this.last=now;this.draw(dt);}
    const canAnimate=!this.reduced&&!this.options.paused;
    if(canAnimate||this.path.length||Math.hypot(this.input.x,this.input.z)>0)this.frame=requestAnimationFrame(this.tick);
  };
  private draw(dt:number,render=true):void {
    if(this.disposed)return;
    const active=this.options.data.active,auto=this.options.data.autoFishing.enabled;
    const canMove=!this.options.blocked&&!this.options.overlay&&(!active||!!active.automatic&&auto);
    const before=this.position;
    if(canMove&&this.path.length){
      const target=this.path[0]!,length=distance(this.position,target),travel=Math.min(length,dt*2.2);
      if(length<.035){this.position={...target};this.path.shift();if(!this.path.length)this.destination=null;}
      else this.position=move(this.position,{x:(target.x-this.position.x)/length*travel,z:(target.z-this.position.z)/length*travel},this.map);
    }else if(!this.locked&&!this.options.overlay&&dt>0&&(this.input.x||this.input.z))this.position=move(this.position,{x:this.input.x*2.65*dt,z:this.input.z*2.65*dt},this.map);
    const walking=distance(before,this.position)>.0001;
    if(walking){const facing=playerFacing(this.position.x-before.x,this.position.z-before.z,this.player.facing);this.player.face(facing.right,facing.back);this.time+=dt;}
    else if(!this.options.paused&&!this.reduced)this.time+=dt;
    const atSpot=!this.path.length&&(!!active||auto);
    if(atSpot)this.player.face(false);
    this.player.group.position.set(this.position.x,.145,this.position.z);
    const pose=walking?'walk':atSpot?(auto&&!this.options.data.autoFishing.working?'hold':active?this.options.pose:'hold'):this.options.pose==='surprise'||!this.reduced&&this.time<this.celebrateUntil?'surprise':'idle';
    this.aim.set(this.position.x*(atSpot ? .9 : .64),-.1,this.position.z*(atSpot ? .9 : .63));
    this.target.lerp(this.aim,this.reduced||dt===0?1:1-Math.exp(-dt*4));this.camera.position.copy(this.target).add(this.cameraOffset);this.camera.lookAt(this.target);this.camera.updateMatrixWorld();
    this.player.animate(pose,this.time,this.reduced,this.camera);this.visitor.animate('idle',this.time,this.reduced,this.camera);this.scenery.update(this.reduced?0:this.time);this.shoreScene.update(this.options.data.shore,this.reduced?0:this.time);
    this.companion.update(this.companionEnabled,this.position,this.time,walking,!!this.options.guarded,this.reduced,this.map);
    this.line.visible=this.bobber.visible=atSpot;
    if(atSpot){
      const place=this.map.places[this.spot].water!,tip=this.player.rodTip(),water=this.waterPoint.set(place.x,place.y,place.z);
      this.bobber.position.copy(water);this.bobber.position.y+=(this.reduced||this.options.paused?0:Math.sin(this.time*2)*.035);
      const points=this.line.geometry.getAttribute('position');points.setXYZ(0,tip.x,tip.y,tip.z);points.setXYZ(1,(tip.x+water.x)/2,(tip.y+water.y)/2-.08,(tip.z+water.z)/2);points.setXYZ(2,water.x,this.bobber.position.y,water.z);points.needsUpdate=true;
    }
    if(render)this.renderer.render(this.scene,this.camera);
    const now=performance.now();
    if(now-this.lastSave>2000){this.persist();this.lastSave=now;}
    if(render&&now-this.diagnosticAt>1000){this.diagnosticAt=now;this.canvas.dataset.gpuTextures=String(this.renderer.info.memory.textures);this.canvas.dataset.gpuGeometries=String(this.renderer.info.memory.geometries);this.canvas.dataset.steadyDrawCalls=String(this.renderer.info.render.calls);}
    this.publish(walking);
  }
  private publish(walking=this.walking):void {
    this.walking=walking;
    const state:WorldState={near:nearby(this.position,!!shoreVisitor(this.options.data.shore,this.map.id,this.options.data.life.visitor),this.map),walking,destination:this.destination,spot:this.spot,ready:this.ready};
    const value=JSON.stringify(state);if(value!==this.published){this.published=value;this.changed(state);}
    const attributes={playerX:this.position.x.toFixed(2),playerZ:this.position.z.toFixed(2),spot:this.spot,actors:'2d-cutouts',shoreStory:this.options.data.shore.story,companion:this.companionEnabled?'A002':'none',playerFrame:this.player.frame,playerAction:this.player.action,region:this.map.id,playerFacing:this.player.facing.back?'back':'front'};
    for(const [key,text] of Object.entries(attributes))if(this.canvas.dataset[key]!==text)this.canvas.dataset[key]=text;
  }
  private persist():void {const value=JSON.stringify({position:this.position,spot:this.spot});if(value===this.savedPosition)return;try{localStorage.setItem(this.key,value);this.savedPosition=value;}catch{/* Optional view preferences never block fishing. */}}
  dispose():void {
    if(this.disposed)return;this.disposed=true;this.persist();cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();this.intersection.disconnect();document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('blur',this.blur);window.removeEventListener('focus',this.focus);this.systemMotion.removeEventListener('change',this.start);this.canvas.removeEventListener('webglcontextlost',this.contextLost);
    this.line.geometry.dispose();(this.line.material as LineBasicMaterial).dispose();this.player.dispose();this.visitor.dispose();this.companion.dispose();this.pictures.dispose();disposeModel(this.content);this.scenery.pondMaterial.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.scene.clear();
  }
}
