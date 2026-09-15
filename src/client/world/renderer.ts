import {ACESFilmicToneMapping,BufferGeometry,Color,DirectionalLight,Float32BufferAttribute,Fog,Group,HemisphereLight,Line,LineBasicMaterial,Mesh,MeshLambertMaterial,OrthographicCamera,Scene,SphereGeometry,Vector3,WebGLRenderer} from 'three';
import type {WorldProps} from './contracts.ts';
import {Actor,Scenery,disposeModel} from './models.ts';
import {PLACES,SPAWN,distance,move,nearby,route,screenDirection,walkable} from './map.ts';
import type {PlaceId,Point,SpotId} from './map.ts';

export interface WorldState {near:PlaceId|null;walking:boolean;destination:PlaceId|null;spot:SpotId;ready:boolean}
const nextTask=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
export class CoastWorld {
  private renderer:WebGLRenderer;
  private scene=new Scene();private camera=new OrthographicCamera();private content=new Group();
  private scenery:Scenery;private player=new Actor();private visitor=new Actor(true);
  private line:Line;private bobber:Mesh;
  private options:WorldProps;
  private position:Point={...SPAWN};private spot:SpotId='pier';private input:Point={x:0,z:0};
  private path:Point[]=[];private destination:PlaceId|null=null;private frame=0;private last=0;private time=0;
  private ready=false;private disposed=false;private visible=true;private focused=document.hasFocus();private published='';private lastSave=0;private walking=false;
  private resizeObserver:ResizeObserver;private intersection:IntersectionObserver;
  private systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
  private target=new Vector3();private aim=new Vector3();private cameraOffset=new Vector3(10,13,15);
  private key:string;private started=performance.now();private wasAutomatic=false;
  constructor(private canvas:HTMLCanvasElement,options:WorldProps,private changed:(state:WorldState)=>void,private failed:()=>void){
    this.options=options;this.key=`dsh-fisher:walk:v1:${options.data.saveId}`;
    try{const saved=JSON.parse(localStorage.getItem(this.key)??'null') as {position?:Point;spot?:string}|null;
      if(saved?.position&&walkable(saved.position))this.position={...saved.position};if(saved?.spot==='pier'||saved?.spot==='cove')this.spot=saved.spot;
    }catch{/* Position is optional; game progress belongs to the host. */}
    if(options.data.active||options.data.autoFishing.enabled)this.position={x:PLACES[this.spot].x,z:PLACES[this.spot].z};
    this.renderer=new WebGLRenderer({canvas,antialias:true,powerPreference:'low-power',alpha:false});
    this.renderer.setClearColor('#bedad4');this.renderer.toneMapping=ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    this.scene.background=new Color('#bedad4');this.scene.fog=new Fog('#bedad4',28,58);
    const sun=new DirectionalLight('#fff0d2',2.1);sun.position.set(-5,12,7);this.scene.add(new HemisphereLight('#fffae7','#729797',2.1),sun,this.content);
    this.scenery=new Scenery();this.content.add(this.scenery.group,this.player.group,this.visitor.group);
    this.visitor.group.position.set(PLACES.guest.x+.75,.13,PLACES.guest.z-.6);this.visitor.group.rotation.y=-.35;
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
    this.draw(0,false);
    await this.renderer.compileAsync(this.scene,this.camera);
    if(this.disposed)return;
    await nextTask();if(this.disposed)return;
    // Upload geometry and complete a real first frame behind the loading cover.
    this.renderer.render(this.scene,this.camera);this.ready=true;
    this.canvas.dataset.readyMs=String(Math.round(performance.now()-this.started));
    this.canvas.dataset.drawCalls=String(this.renderer.info.render.calls);this.canvas.dataset.triangles=String(this.renderer.info.render.triangles);
    this.canvas.dataset.renderState='ready';this.publish();this.start();
  }
  private resize=()=>{
    if(this.disposed)return;const rect=this.canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
    this.renderer.setPixelRatio(Math.min(this.options.lowPerformance?1:1.5,window.devicePixelRatio||1));this.renderer.setSize(rect.width,rect.height,false);
    const height=this.options.data.active?7.2:11.5,width=height*rect.width/rect.height;
    this.camera.left=-width/2;this.camera.right=width/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.near=.1;this.camera.far=90;this.camera.updateProjectionMatrix();this.start();
  };
  private visibility=()=>{if(document.hidden){this.input={x:0,z:0};this.persist();}this.start();};
  private blur=()=>{this.focused=false;this.input={x:0,z:0};this.persist();this.start();};
  private focus=()=>{this.focused=true;this.start();};
  private contextLost=(event:Event)=>{event.preventDefault();if(!this.disposed){this.canvas.dataset.renderState='lost';this.dispose();this.failed();}};
  private get reduced(){return this.options.reducedMotion||this.systemMotion.matches;}
  private get suspended(){return this.disposed||!this.ready||!this.visible||document.hidden||!this.focused||this.options.overlay;}
  private get locked(){return this.options.blocked||!!this.options.data.active||!!this.options.data.pending||this.options.data.autoFishing.enabled;}
  update(options:WorldProps):void {
    const before=this.options;this.options=options;
    if(this.disposed)return;
    this.visitor.group.visible=!!options.data.life.visitor;
    const auto=options.data.autoFishing.enabled;
    if(auto&&!this.wasAutomatic)this.go(this.spot,true);
    if(!auto&&this.wasAutomatic){this.path=[];this.destination=null;}
    this.wasAutomatic=auto;
    if(options.data.active&&!options.data.active.automatic&&!before.data.active){this.path=[];this.destination=null;this.position={x:PLACES[this.spot].x,z:PLACES[this.spot].z};}
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
    if(this.disposed||this.locked&&!automatic||id==='guest'&&!this.options.data.life.visitor)return;
    const target=PLACES[id];this.path=route(this.position,target);this.destination=this.path.length?id:null;this.input={x:0,z:0};
    if(id!=='guest')this.spot=id;this.publish();this.start();
  }
  dock():boolean {
    const at=nearby(this.position,false);if(at!=='pier'&&at!=='cove'||this.locked)return false;
    this.spot=at;this.position={x:PLACES[at].x,z:PLACES[at].z};this.path=[];this.destination=null;this.input={x:0,z:0};this.persist();this.start();return true;
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
      else this.position=move(this.position,{x:(target.x-this.position.x)/length*travel,z:(target.z-this.position.z)/length*travel});
    }else if(!this.locked&&!this.options.overlay)this.position=move(this.position,{x:this.input.x*2.65*dt,z:this.input.z*2.65*dt});
    const walking=distance(before,this.position)>.0001;
    if(walking){this.player.group.rotation.y=Math.atan2(this.position.x-before.x,this.position.z-before.z);this.time+=dt;}
    else if(!this.options.paused&&!this.reduced)this.time+=dt;
    const atSpot=!this.path.length&&(!!active||auto);
    if(atSpot)this.player.group.rotation.y=0;
    this.player.group.position.set(this.position.x,.145,this.position.z);
    const pose=walking?'walk':atSpot?(auto&&!this.options.data.autoFishing.working?'hold':active?this.options.pose:'hold'):this.options.pose==='surprise'?'surprise':'idle';
    this.player.animate(pose,this.time,this.reduced||this.options.paused);this.visitor.animate('idle',this.time,this.reduced);
    this.aim.set(this.position.x*(atSpot ? .9 : .64),-.1,this.position.z*(atSpot ? .9 : .63));
    this.target.lerp(this.aim,this.reduced||dt===0?1:1-Math.exp(-dt*4));this.camera.position.copy(this.target).add(this.cameraOffset);this.camera.lookAt(this.target);
    this.scenery.water.position.x=this.reduced?0:Math.sin(this.time*.35)*.055;
    for(let i=0;i<this.scenery.ripples.length;i++)this.scenery.ripples[i]!.scale.setScalar(this.reduced?1:1+Math.sin(this.time*1.3+i)*.18);
    this.line.visible=this.bobber.visible=atSpot;
    if(atSpot){
      const place=PLACES[this.spot],tip=this.player.rodTip(),water=new Vector3(place.x,-.2,place.z+1.65);
      this.bobber.position.copy(water);this.bobber.position.y+=(this.reduced||this.options.paused?0:Math.sin(this.time*2)*.035);
      const points=this.line.geometry.getAttribute('position');points.setXYZ(0,tip.x,tip.y,tip.z);points.setXYZ(1,(tip.x+water.x)/2,(tip.y+water.y)/2-.08,(tip.z+water.z)/2);points.setXYZ(2,water.x,this.bobber.position.y,water.z);points.needsUpdate=true;
    }
    if(render)this.renderer.render(this.scene,this.camera);
    if(performance.now()-this.lastSave>2000){this.persist();this.lastSave=performance.now();}
    this.publish(walking);
  }
  private publish(walking=this.walking):void {
    this.walking=walking;
    const state:WorldState={near:nearby(this.position,!!this.options.data.life.visitor),walking,destination:this.destination,spot:this.spot,ready:this.ready};
    const value=JSON.stringify(state);if(value!==this.published){this.published=value;this.changed(state);}
    this.canvas.dataset.playerX=this.position.x.toFixed(2);this.canvas.dataset.playerZ=this.position.z.toFixed(2);this.canvas.dataset.spot=this.spot;
  }
  private persist():void {try{localStorage.setItem(this.key,JSON.stringify({position:this.position,spot:this.spot}));}catch{/* Optional view preferences never block fishing. */}}
  dispose():void {
    if(this.disposed)return;this.disposed=true;this.persist();cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();this.intersection.disconnect();document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('blur',this.blur);window.removeEventListener('focus',this.focus);this.systemMotion.removeEventListener('change',this.start);this.canvas.removeEventListener('webglcontextlost',this.contextLost);
    this.line.geometry.dispose();(this.line.material as LineBasicMaterial).dispose();disposeModel(this.content);this.renderer.dispose();this.renderer.forceContextLoss();this.scene.clear();
  }
}
