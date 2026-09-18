import {BoxGeometry,BufferGeometry,CircleGeometry,CylinderGeometry,DodecahedronGeometry,DoubleSide,ExtrudeGeometry,Float32BufferAttribute,Group,InstancedMesh,Material,Matrix4,Mesh,MeshStandardMaterial,Object3D,PlaneGeometry,Shape,TorusGeometry,SphereGeometry} from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {COASTS} from './regions.ts';
import type {CoastMap} from './regions.ts';
import {coastWater} from './water.ts';

const COLORS={sand:'#e4d3a8',stone:'#bfc6ad',grass:'#9db879',grassLight:'#b4ca89',grassDark:'#728f5a',earth:'#b7a07b',cream:'#f5e9c9',roof:'#c66c43',roofLight:'#e2965a',wood:'#896240',woodLight:'#c6a777',ink:'#355359',leaf:'#568961',leafLight:'#7eaa70',white:'#fff0d0',flower:'#cc8db0',blue:'#508785',coral:'#dc9a74',glass:'#f6d597'};
type ColorKey=keyof typeof COLORS;
type GeometryKey=keyof Scenery['geometries'];
export class Scenery {
  group=new Group();water=new Group();ripples:Mesh[]=[];
  seaMaterial:ReturnType<typeof coastWater>;pondMaterial:ReturnType<typeof coastWater>;
  geometries={box:new BoxGeometry(1,1,1),soft:new RoundedBoxGeometry(1,1,1,1,.09),rock:new DodecahedronGeometry(.5,0),crown:new DodecahedronGeometry(.5,1),trunk:new CylinderGeometry(.5,.58,1,9),disc:new CylinderGeometry(.5,.5,1,24),pot:new CylinderGeometry(.5,.36,1,10),cone:new CylinderGeometry(0,.5,1,12),leaf:new BufferGeometry()};
  materials=Object.fromEntries(Object.entries(COLORS).map(([key,color])=>[key,new MeshStandardMaterial({color,roughness:.9,metalness:0,...key==='leaf'||key==='leafLight'?{side:DoubleSide}:{}})])) as Record<ColorKey,MeshStandardMaterial>;
  private batches=new Map<string,{geometry:BufferGeometry;material:MeshStandardMaterial;matrices:Matrix4[]}>();private helper=new Object3D();
  add(kind:GeometryKey,color:ColorKey,x:number,y:number,z:number,w:number,h:number,d:number,ry=0,rz=0,rx=0):void{
    const key=`${kind}:${color}`;let batch=this.batches.get(key);
    if(!batch){batch={geometry:this.geometries[kind],material:this.materials[color],matrices:[]};this.batches.set(key,batch);}
    this.helper.position.set(x,y,z);this.helper.scale.set(w,h,d);this.helper.rotation.set(rx,ry,rz);this.helper.updateMatrix();batch.matrices.push(this.helper.matrix.clone());
  }
  private finish():void{
    for(const batch of this.batches.values()){
      const mesh=new InstancedMesh(batch.geometry,batch.material,batch.matrices.length);batch.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;this.group.add(mesh);
    }
    this.batches.clear();this.group.add(this.water);
  }
  constructor(private map:CoastMap=COASTS.L01){
    this.seaMaterial=coastWater(false,map);this.pondMaterial=coastWater(true,map);
    const palette:Partial<Record<ColorKey,string>>=map.id==='L02'?{grass:'#c3cb97',sand:'#f4d2af',stone:'#cfb8a6',roof:'#de9978',blue:'#45a8a0',leaf:'#548e72',coral:'#ee947f'}:map.id==='L03'?{grass:'#4d8078',grassLight:'#78a699',grassDark:'#42666a',sand:'#91b0af',stone:'#8296a6',earth:'#45626f',leaf:'#366966',leafLight:'#588b7c',wood:'#596a77',woodLight:'#9bafa9',blue:'#5b8998',cream:'#c1d5ce',flower:'#bda6e1',glass:'#b9e6d3'}:map.id==='L04'?{grass:'#7c9a95',grassLight:'#9ab1a6',sand:'#b0bcb2',stone:'#889fab',earth:'#607d8a',leaf:'#567977',leafLight:'#7e9d91',roof:'#668e9a',wood:'#53677b',woodLight:'#a9b4b4',coral:'#d6a482'}:{};
    for(const [key,color] of Object.entries(palette))this.materials[key as ColorKey].color.set(color);
    if(map.id==='L03'||map.id==='L04'){this.materials.glass.emissive.copy(this.materials.glass.color);this.materials.glass.emissiveIntensity=.65;}
    this.geometries.leaf.setAttribute('position',new Float32BufferAttribute([0,0,0,-.28,.12,.38,0,.2,.62, 0,0,0,0,.2,.62,.28,.12,.38, -.28,.12,.38,0,-.14,1.25,0,.2,.62, 0,.2,.62,0,-.14,1.25,.28,.12,.38],3));this.geometries.leaf.computeVertexNormals();
    this.land(1,-.72,.72,'earth');this.land(.995,-.05,.13,'sand');this.land(.935,.06,.03,'grass');
    if(map.id==='L01')this.homeCoast();
    else if(map.id==='L02')this.coralBay();
    else if(map.id==='L03')this.moonForest();
    else this.deepHarbor();
    this.pond();this.dock();
    for(let i=0;i<map.coastline.length;i++){
      const [x,z]=map.coastline[i]!;
      if(Math.abs(x-map.dock.x)<map.dock.width*.65&&z>2.5)continue;
      this.add('rock',i%2?'stone':'sand',x*.97,-.04,z*.97,.6+(i%3)*.17,.35+(i%2)*.2,.52,i*.8);
      this.add('rock','stone',x*1.055,-.24,z*1.045,.42,.35,.49,i);
    }
    const sea=new Mesh(new PlaneGeometry(54,54),this.seaMaterial);sea.rotation.x=-Math.PI/2;sea.position.y=-.2;this.water.add(sea);
    for(const id of ['pier','cove'] as const){const point=map.places[id].water!;const ripple=new Mesh(new TorusGeometry(.32,.009,3,32),new MeshStandardMaterial({color:'#dcece0',transparent:true,opacity:.66,roughness:1,depthWrite:false}));ripple.rotation.x=-Math.PI/2;ripple.position.set(point.x,point.y+.014,point.z);this.ripples.push(ripple);this.water.add(ripple);}
    if(map.id==='L01')this.waterClues();
    this.finish();
    this.group.traverse(object=>{object.updateMatrix();object.matrixAutoUpdate=false;});
    for(const ripple of this.ripples)ripple.matrixAutoUpdate=true;
  }
  private waterClues():void {
    const shallow=this.map.places.cove.water!,deep=this.map.places.pier.water!;
    const ink=new MeshStandardMaterial({color:'#396b69',transparent:true,opacity:.72,roughness:1});
    const silver=new MeshStandardMaterial({color:'#fff1c5',roughness:.5});
    const shape=new SphereGeometry(1,8,5);
    for(let i=0;i<3;i++){
      const fish=new Mesh(shape,ink);fish.scale.set(.22,.015,.06);fish.rotation.y=i*.6;
      fish.position.set(shallow.x-.35+i*.35,shallow.y+.018,shallow.z+.2*(i%2));this.water.add(fish);
      const bubble=new Mesh(shape,silver);bubble.scale.setScalar(.035+i*.012);
      bubble.position.set(deep.x-.25+i*.21,deep.y+.025,deep.z+.15*(i%2));this.water.add(bubble);
    }
  }
  private homeCoast():void{
    // Low slabs mark the garden paths, leaving both fishing approaches open.
    for(let row=0;row<3;row++)for(let col=0;col<7;col++)this.add('soft',(row+col)%3?'cream':'sand',-4.05+col*.5,.12,-1.3+row*.48,.44,.055,.43,.02*(col%2));
    for(let i=0;i<10;i++)this.add('soft',i%3?'sand':'cream',-.9+i*.54,.13,1.85,.5,.05,.64,.06*Math.sin(i));
    for(let i=0;i<5;i++)this.add('soft','sand',1.8,.125,2.05+i*.38,1,.05,.34);
    for(let i=0;i<5;i++)this.add('soft','cream',-4.15+i*.42,.125,2.72,.38,.05,.52,.09*i);
    this.house(-2.9,-2.8,1,false);this.house(3.1,-3.18,.56,true);
    this.garden();
    this.map.trees.forEach(([x,z,s],index)=>this.tree(x,z,s,index===0));
    this.lighthouse();
    this.add('box','woodLight',.85,.48,-.05,1.35,.12,.5);this.add('box','woodLight',.85,.82,-.29,1.35,.42,.09);
    for(const x of [.35,1.35])this.add('box','wood',x,.24,-.05,.1,.5,.4);
    this.add('trunk','wood',.56,.54,2.7,.1,1.05,.1);this.add('soft','cream',.56,.94,2.7,.66,.36,.09);this.add('box','blue',.56,.95,2.76,.35,.045,.025,0,-.18);
    this.add('box','wood',-1,.5,-.68,.12,.9,.12);this.add('soft','blue',-1,1,-.68,.42,.36,.35);this.add('box','ink',-1,1,-.493,.24,.045,.02);
  }
  update(time:number):void{this.seaMaterial.uniforms.time!.value=time;this.pondMaterial.uniforms.time!.value=time;for(let i=0;i<this.ripples.length;i++)this.ripples[i]!.scale.setScalar(1+Math.sin(time*1.2+i)*.12);}
  private land(scale:number,y:number,depth:number,color:ColorKey):void{
    const shape=new Shape();this.map.coastline.forEach(([x,z],i)=>{if(i===0)shape.moveTo(x*scale,-z*scale);else shape.lineTo(x*scale,-z*scale);});shape.closePath();
    const geometry=new ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.1,bevelThickness:.025});geometry.rotateX(-Math.PI/2);
    const mesh=new Mesh(geometry,this.materials[color]);mesh.position.y=y;mesh.receiveShadow=true;this.group.add(mesh);
  }
  private flower(x:number,z:number,color:ColorKey='flower',size=1):void{
    this.add('trunk','grassDark',x,.24*size,z,.027,.3*size,.027);
    for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;this.add('crown',color,x+Math.cos(angle)*.08*size,.39*size,z+Math.sin(angle)*.08*size,.12*size,.055*size,.11*size);}
    this.add('disc','roofLight',x,.424*size,z,.064*size,.018,.064*size);
  }
  private planter(x:number,z:number,size=.45):void{
    this.add('pot','roof',x,.13+size*.34,z,size,size*.7,size);this.add('disc','roofLight',x,.14+size*.68,z,size*1.06,.065,size*1.06);this.add('disc','earth',x,.18+size*.68,z,size*.84,.028,size*.84);
    for(let i=0;i<4;i++){const a=i*1.6;this.add('leaf','leaf',x,.2+size*.66,z,size*.8,size*.6,size*.55,a);this.add('crown',i%2?'flower':'white',x+Math.cos(a)*size*.22,.3+size*.9,z+Math.sin(a)*size*.22,size*.25,.13,size*.25);}
  }
  private tree(x:number,z:number,s:number,palm=false):void{
    this.add('trunk','wood',x,1.1*s,z,.21*s,2.2*s,.24*s,.1,.05);
    if(palm){
      for(let i=0;i<9;i++)this.add('disc','woodLight',x,.27+i*.25*s,z,.26*s,.03,.26*s);
      for(let i=0;i<10;i++)this.add('leaf',i%2?'leaf':'leafLight',x,2.28*s,z,1.7*s,.85*s,1.5*s,i*Math.PI/5,0,-.18+(i%2)*.2);
      for(let i=0;i<3;i++)this.add('rock','wood',x+.13*(i-1),2.15*s,z+.12,.2,.24,.2);return;
    }
    for(let i=0;i<7;i++){const a=i*2.4;this.add('crown',i%3===0?'leafLight':'leaf',x+Math.cos(a)*.43*s,(2+(i%3)*.34)*s,z+Math.sin(a)*.42*s,1.23*s,1.17*s,1.26*s,a);}
    for(let i=0;i<3;i++)this.add('trunk','wood',x+(i-1)*.16,1.65*s,z,.12,.9*s,.12,i,-.65+i*.65);
  }
  private garden():void{
    for(const [x,z] of [[-4.6,-1.0],[-3.6,-1.0],[-1.4,-1.05],[2.1,-1.75],[4.4,-2.1]])this.planter(x!,z!,x!<0?.43:.36);
    for(let i=0;i<42;i++){
      const x=-4.9+(i*2.71)%9.7,z=-.8+(i*1.39)%4.25;
      if((x>-4.25&&x<-1.3&&z<1.9)||(x>-.6&&x<3&&z<2.8))continue;
      for(let j=0;j<3;j++)this.add('leaf',j%2?'grassDark':'leafLight',x,.12,z,.23,.32,.28,j*2.1+i,.15);
      if(i%2===0)this.flower(x+.18,z+.12,i%3?'white':'flower',.75);
    }
    for(const x of [-.45,.5,1.45]){this.add('box','woodLight',x,.5,-2.02,.08,.8,.09);this.add('cone','cream',x,.95,-2.02,.13,.14,.13);}
    for(const y of [.4,.7])this.add('box','woodLight',.5,y,-2.02,2,.07,.055);
  }
  private pond():void{
    const POND=this.map.pond;if(!POND)return;
    this.add('disc','sand',POND.x,.105,POND.z,POND.rx*2.12,.085,POND.rz*2.12);
    const pond=new Mesh(new CircleGeometry(1,48),this.pondMaterial);pond.rotation.x=-Math.PI/2;pond.scale.set(POND.rx,POND.rz,1);pond.position.set(POND.x,.154,POND.z);this.water.add(pond);
    for(let i=0;i<14;i++){const a=i*Math.PI/7;this.add('rock',i%3?'stone':'sand',POND.x+Math.cos(a)*POND.rx,.17,POND.z+Math.sin(a)*POND.rz,.22+(i%3)*.07,.16,.21,a);}
    for(let i=0;i<6;i++){const x=POND.x-.65+i*.17,z=POND.z-.32+Math.sin(i*2)*.2;this.add('disc','leafLight',x,.165,z,.21,.015,.17,i);if(i%3===0)this.flower(x,z,'white',.44);}
    for(let i=0;i<8;i++)this.flower(POND.x+.95+i*.08,POND.z-.35+i*.13,'flower',.8);
  }
  private dock():void{
    const {x,start,end,width,stone}=this.map.dock,length=end-start+.2;
    this.add('box',stone?'stone':'wood',x,-.045,(start+end)/2,width,.18,length);
    const count=Math.ceil(length/.23);
    for(let i=0;i<count;i++){
      const z=start-.1+i*length/count;
      this.add('box',stone?(i%3?'stone':'sand'):(i%3?'woodLight':'sand'),x,.09,z,width,.1,length/count-.014);
      if(!stone&&i%2===0)this.add('box','wood',x-.48+(i%3)*.3,.145,z,.35,.004,.011);
    }
    for(const side of [-1,1])for(let i=0;i<3;i++){
      const px=x+side*(width/2-.05),z=start+.2+(length-.4)*i/2;
      this.add('trunk',stone?'ink':'wood',px,-.1,z,.13,1.35,.13);this.add('disc','cream',px,.48,z,.17,.06,.17);
      for(let j=0;j<3;j++)this.add('disc','woodLight',px,.22+j*.05,z,.15,.035,.15);
    }
    this.add('pot','blue',x-width*.56,.29,start-.38,.28,.28,.28);this.add('disc','cream',x-width*.56,.45,start-.38,.31,.035,.31);
    if(this.map.id==='L03'||stone)for(const side of [-1,1])this.lantern(x+side*(width/2+.12),start+.15,.8);
  }
  private path(points:readonly (readonly [number,number])[],width=.48):void{
    points.forEach(([x,z],i)=>this.add('soft',i%3?'sand':'cream',x,.125,z,width,.04,width*.86,Math.sin(i)*.12));
  }
  private lantern(x:number,z:number,s=1):void{
    this.add('trunk','wood',x,.62*s,z,.075,1.1*s,.075);
    this.add('soft','glass',x,1.26*s,z,.28*s,.4*s,.28*s);
    for(const y of [1.02,1.5])this.add('box','ink',x,y*s,z,.37*s,.055,.37*s);
    this.add('cone','blue',x,1.6*s,z,.48*s,.18*s,.48*s);
  }
  private coralBay():void{
    this.house(-4.3,-3.35,.7,true);
    this.map.trees.forEach(([x,z,s])=>this.tree(x,z,s,true));
    this.path(Array.from({length:12},(_,i)=>[.1+i*.3,.35+i*.25] as const));
    this.path(Array.from({length:9},(_,i)=>[-.4-i*.45,1.7+Math.sin(i*.4)*.32] as const));
    // Striped market awning and its shell counter.
    for(const x of [.45,2.55])for(const z of [-3.12,-1.86])this.add('trunk','wood',x,1.1,z,.09,2,.09);
    for(let i=0;i<10;i++)this.add('soft',i%2?'white':'coral',.4+i*.23,2.18,-2.5,.24,.1,1.68,0,0,-.12);
    this.add('box','woodLight',1.5,.72,-1.9,2.12,.12,.5);
    for(let i=0;i<7;i++)this.add('rock',i%2?'cream':'flower',.7+i*.26,.85,-1.9,.18,.14,.21,i*.8);
    for(const [x,z] of [[-5.4,-.45],[-.3,-3.5],[4.95,.1]]){
      this.add('rock','coral',x!,.3,z!,.7,.65,.7);
      for(let i=0;i<5;i++){const a=i*1.3;this.add('trunk',i%2?'coral':'flower',x!+Math.cos(a)*.28,.56,z!+Math.sin(a)*.28,.12,.75,.12,a,.3);this.add('crown','cream',x!+Math.cos(a)*.38,.9,z!+Math.sin(a)*.3,.17,.15,.18);}
    }
    // A reef arch and a small beached dinghy beyond the playable shore.
    for(const x of [-7.5,-6.1])this.add('rock','coral',x,.48,-2.7,.8,1.65,1.05);
    this.add('rock','sand',-6.8,1.28,-2.7,1.6,.6,1.05);
    this.add('soft','wood',-5.8,-.04,3.5,.8,.3,1.8,.6);this.add('soft','cream',-5.8,.1,3.5,.62,.13,1.45,.6);
    for(let i=0;i<18;i++){const a=i*2.4,x=Math.cos(a)*5,z=Math.sin(a)*3;
      if(z<-.8||Math.abs(x)<3.8)continue;
      this.add('rock',i%2?'cream':'coral',x,.14,z,.15,.08,.2,a);this.flower(x+.2,z-.15,'white',.6);
    }
    this.planter(.2,-2.3,.48);this.planter(2.9,-2.35,.48);
  }
  private moonForest():void{
    this.map.trees.forEach(([x,z,s])=>this.tree(x,z,s));
    // Four-sided moon pavilion, raised floor, curved roof edges and warm paper lanterns.
    const x=2.5,z=-3;
    this.add('soft','stone',x,.23,z,2.5,.24,2.35);
    for(const dx of [-1,1])for(const dz of [-.95,.95]){this.add('trunk','wood',x+dx,1.28,z+dz,.13,2.2,.13);this.add('disc','cream',x+dx,.39,z+dz,.23,.13,.23);}
    for(let i=0;i<5;i++){const size=2.9-i*.47;this.add('soft',i%2?'blue':'ink',x,2.48+i*.15,z,size,.18,size*.9);}
    this.add('cone','blue',x,3.25,z,.8,.6,.75);this.add('rock','glass',x,3.61,z,.17,.17,.17);
    this.add('soft','woodLight',x,.7,z,1.25,.12,.46);
    for(const dx of [-.9,.9])this.lantern(x+dx,z+1.03,.62);
    this.path(Array.from({length:10},(_,i)=>[1.25+i*.13,1.7+i*.35] as const),.65);
    this.path(Array.from({length:10},(_,i)=>[1.1-Math.sin(i*.29)*2.9,-1.4-i*.19] as const));
    for(const [lx,lz] of [[1.2,-1.5],[-3.75,1.15],[-2.75,-3.1],[3.4,2.3]])this.lantern(lx!,lz!,.65);
    for(let i=0;i<24;i++){
      const a=i*2.4,px=Math.cos(a)*4.7,pz=Math.sin(a)*3.45;
      if(Math.abs(px)<3&&pz<0||px>2.2&&pz<-1.8)continue;
      for(let j=0;j<3;j++)this.add('leaf',j%2?'leafLight':'grassDark',px,.13,pz,.36,.38,.45,j*2.1+i);
      if(i%3===0){this.add('trunk','cream',px,.24,pz,.07,.24,.07);this.add('crown','flower',px,.4,pz,.25,.12,.25);}
      else this.flower(px,pz,'flower',.62);
    }
    for(let i=0;i<12;i++){const a=i*2.4;this.add('crown','glass',Math.cos(a)*3.8,.7+(i%4)*.13,Math.sin(a)*2.5,.04,.04,.04);}
  }
  private deepHarbor():void{
    this.lighthouse();this.house(2.6,-3.6,.65,true);
    this.map.trees.forEach(([x,z,s])=>{
      this.add('trunk','wood',x,.78*s,z,.18,1.55*s,.2);
      for(let i=0;i<3;i++)this.add('cone',i%2?'leafLight':'leaf',x,(1.15+i*.44)*s,z,(1.5-i*.28)*s,.9*s,(1.4-i*.27)*s);
    });
    this.path(Array.from({length:12},(_,i)=>[-.7, .15+i*.28] as const),.86);
    this.path(Array.from({length:9},(_,i)=>[-2.6+i*.62,-1.25] as const),.64);
    this.path(Array.from({length:7},(_,i)=>[.3+i*.52,1.8+i*.17] as const),.6);
    // Harbor crane, rope winch, cargo and an offshore survey boat.
    this.add('soft','stone',4.05,.34,-2.3,.8,.4,.9);this.add('box','ink',4.05,1.7,-2.3,.18,2.5,.18);
    this.add('box','woodLight',4.85,2.85,-2.3,1.85,.17,.18,0,-.12);this.add('trunk','ink',5.6,1.77,-2.3,.028,1.9,.028);
    this.add('rock','blue',5.6,.75,-2.3,.42,.55,.42);
    for(const [cx,cz] of [[-4.05,-1.95],[1.6,-4.5],[3.55,-1.6]]){
      this.add('soft','woodLight',cx!,.4,cz!,.55,.55,.58);
      for(const side of [-1,1])this.add('box','ink',cx!+side*.17,.4,cz!+.3,.035,.55,.025);
    }
    this.add('soft','ink',6.8,-.05,.3,1.65,.5,3.2,-.25);
    this.add('soft','cream',6.8,.23,.3,1.48,.2,2.9,-.25);
    this.add('soft','blue',6.65,.65,-.18,1.05,.78,1.2,-.25);this.add('box','glass',6.8,.78,.43,.73,.29,.045,-.25);
    this.add('trunk','ink',6.55,1.6,-.3,.04,1.3,.04);
    for(let i=0;i<7;i++)this.add('rock','stone',-6.05+i*.13,-.01,-2.7+i*.57,1,.7,.77,i*.4);
    for(const [lx,lz] of [[-3.6,-.7],[1.35,-1.25],[3.25,1.65]])this.lantern(lx!,lz!,.8);
    for(let i=0;i<8;i++){const x=3.3+(i%3)*.35,z=2.1+Math.floor(i/3)*.34;this.add('rock',i%2?'cream':'blue',x,.13,z,.14,.07,.2,i);}
  }
  private house(x:number,z:number,s:number,hut:boolean):void{
    const add=(kind:GeometryKey,color:ColorKey,dx:number,y:number,dz:number,w:number,h:number,d:number,ry=0,rz=0)=>this.add(kind,color,x+dx*s,y*s,z+dz*s,w*s,h*s,d*s,ry,rz);
    add('soft','stone',0,.15,0,3.18,.26,2.55);add('soft',hut?'woodLight':'cream',0,1.12,0,3,1.82,2.4);
    for(const dx of [-1.43,1.43])add('box','wood',dx,1.05,1.22,.12,1.95,.11);
    for(let i=0;i<8;i++)add('box',hut?'wood':'sand',0,.27+i*.23,1.213,2.87,.025,.03);
    const roof=new BufferGeometry();roof.setAttribute('position',new Float32BufferAttribute([-1.7,1.97,-1.42,1.7,1.97,-1.42,0,3.03,-1.42,-1.7,1.97,1.42,0,3.03,1.42,1.7,1.97,1.42,-1.7,1.97,-1.42,0,3.03,-1.42,-1.7,1.97,1.42,0,3.03,-1.42,0,3.03,1.42,-1.7,1.97,1.42,0,3.03,-1.42,1.7,1.97,-1.42,1.7,1.97,1.42,0,3.03,-1.42,1.7,1.97,1.42,0,3.03,1.42],3));roof.computeVertexNormals();
    const roofMesh=new Mesh(roof,this.materials[hut?'blue':'roof']);roofMesh.position.set(x,0,z);roofMesh.scale.setScalar(s);roofMesh.castShadow=true;roofMesh.receiveShadow=true;this.group.add(roofMesh);
    for(let row=0;row<6;row++)for(const side of [-1,1])for(let col=0;col<8;col++)add('soft',hut?'blue':(row+col)%4?'roof':'roofLight',side*(.13+row*.28),3.04-(.13+row*.28)*1.06/1.7,-1.27+col*.36,.37,.11,.347,0,-side*Math.atan(1.06/1.7));
    for(let i=0;i<9;i++)add('soft',hut?'blue':'roofLight',0,3.12,-1.38+i*.34,.25,.17,.39);
    add('soft','cream',.92,2.92,-.57,.4,.95,.42);add('box','wood',.92,3.41,-.57,.53,.11,.53);
    add('soft','blue',-.35,.82,1.23,.68,1.35,.11);add('box','woodLight',-.35,.8,1.292,.04,1.17,.015);add('rock','roofLight',-.15,.83,1.31,.055,.055,.04);
    for(const dx of [-1.02,.75]){
      add('box','wood',dx,1.2,1.23,.63,.7,.09);add('box','glass',dx,1.2,1.289,.49,.57,.025);add('box','cream',dx,1.2,1.31,.035,.6,.025);add('box','cream',dx,1.2,1.31,.5,.035,.025);
      for(const side of [-1,1]){add('box','blue',dx+side*.39,1.2,1.28,.19,.68,.06);for(let i=0;i<5;i++)add('box','leafLight',dx+side*.39,1+i*.09,1.318,.16,.025,.018);}
      add('soft','wood',dx,.77,1.38,.8,.2,.26);for(let i=0;i<5;i++){add('crown','leaf',dx-.29+i*.145,.91,1.38,.19,.24,.18);add('crown',i%2?'white':'flower',dx-.29+i*.145,1.02,1.44,.1,.09,.09);}
    }
    for(let i=0;i<3;i++)add('soft','sand',-.35,.09+i*.055,1.98-i*.2,1.04,.12,.26);
    if(!hut){
      for(let i=0;i<7;i++)add('box',i%2?'white':'coral',-.35,1.94,1.53,.22,.055,.58,0,0);
      for(const dx of [-1.1,.4])add('trunk','wood',dx,.96,1.78,.055,1.92,.055);
      add('box','wood',-.35,1.96,1.8,1.6,.075,.06);
    }else{for(let i=0;i<6;i++)add('box','woodLight',0,.2,1.3+i*.18,3.2,.08,.17);for(const dx of [-1.5,1.5])add('trunk','wood',dx,.58,2.2,.1,1.2,.1);add('box','wood',0,1.1,2.2,3.1,.1,.09);}
  }
  private lighthouse():void{
    const x=this.map.id==='L04'?-2.8:7.65,z=this.map.id==='L04'?-2.7:-5.4;this.add('rock','stone',x,-.21,z,3.1,.9,2.5);
    this.add('trunk','cream',x,1.47,z,.91,3.05,.91);this.add('disc','coral',x,1.25,z,.95,.33,.95);this.add('disc','stone',x,3.0,z,1.3,.13,1.3);
    this.add('trunk','glass',x,3.36,z,.65,.61,.65);for(let i=0;i<6;i++){const a=i*Math.PI/3;this.add('box','wood',x+Math.cos(a)*.37,3.36,z+Math.sin(a)*.37,.04,.65,.04);}
    this.add('cone','roof',x,3.92,z,1.25,.58,1.25);this.add('trunk','wood',x,4.38,z,.04,.42,.04);
  }
}

export function disposeModel(root:Group):void{
  const geometries=new Set<BufferGeometry>(),materials=new Set<Material>();
  root.traverse(object=>{if(object instanceof Mesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);if(object instanceof InstancedMesh)object.dispose();}});
  geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());root.clear();
}
