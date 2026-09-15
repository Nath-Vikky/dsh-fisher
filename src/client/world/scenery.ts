import {BoxGeometry,BufferGeometry,CircleGeometry,CylinderGeometry,DodecahedronGeometry,DoubleSide,ExtrudeGeometry,Float32BufferAttribute,Group,InstancedMesh,Material,Matrix4,Mesh,MeshStandardMaterial,Object3D,PlaneGeometry,Shape,TorusGeometry} from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {COASTLINE,POND,TREES} from './map.ts';
import {coastWater} from './water.ts';

const COLORS={sand:'#e4d3a8',stone:'#bfc6ad',grass:'#9db879',grassLight:'#b4ca89',grassDark:'#728f5a',earth:'#b7a07b',cream:'#f5e9c9',roof:'#c66c43',roofLight:'#e2965a',wood:'#896240',woodLight:'#c6a777',ink:'#355359',leaf:'#568961',leafLight:'#7eaa70',white:'#fff0d0',flower:'#cc8db0',blue:'#508785',coral:'#dc9a74',glass:'#f6d597'};
type ColorKey=keyof typeof COLORS;
type GeometryKey=keyof Scenery['geometries'];
export class Scenery {
  group=new Group();water=new Group();ripples:Mesh[]=[];
  seaMaterial=coastWater();pondMaterial=coastWater(true);
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
  constructor(){
    this.geometries.leaf.setAttribute('position',new Float32BufferAttribute([0,0,0,-.28,.12,.38,0,.2,.62, 0,0,0,0,.2,.62,.28,.12,.38, -.28,.12,.38,0,-.14,1.25,0,.2,.62, 0,.2,.62,0,-.14,1.25,.28,.12,.38],3));this.geometries.leaf.computeVertexNormals();
    this.land(1,-.72,.72,'earth');this.land(.995,-.05,.13,'sand');this.land(.935,.06,.03,'grass');
    // Low slabs mark the garden paths, leaving both fishing approaches open.
    for(let row=0;row<3;row++)for(let col=0;col<7;col++)this.add('soft',(row+col)%3?'cream':'sand',-4.05+col*.5,.12,-1.3+row*.48,.44,.055,.43,.02*(col%2));
    for(let i=0;i<10;i++)this.add('soft',i%3?'sand':'cream',-.9+i*.54,.13,1.85,.5,.05,.64,.06*Math.sin(i));
    for(let i=0;i<5;i++)this.add('soft','sand',1.8,.125,2.05+i*.38,1,.05,.34);
    for(let i=0;i<5;i++)this.add('soft','cream',-4.15+i*.42,.125,2.72,.38,.05,.52,.09*i);
    this.house(-2.9,-2.8,1,false);this.house(3.1,-3.18,.56,true);
    this.garden();
    TREES.forEach(([x,z,s],index)=>this.tree(x,z,s,index===0));
    this.pond();this.dock();this.lighthouse();
    this.add('box','woodLight',.85,.48,-.05,1.35,.12,.5);this.add('box','woodLight',.85,.82,-.29,1.35,.42,.09);
    for(const x of [.35,1.35])this.add('box','wood',x,.24,-.05,.1,.5,.4);
    this.add('trunk','wood',.56,.54,2.7,.1,1.05,.1);this.add('soft','cream',.56,.94,2.7,.66,.36,.09);this.add('box','blue',.56,.95,2.76,.35,.045,.025,0,-.18);
    this.add('box','wood',-1,.5,-.68,.12,.9,.12);this.add('soft','blue',-1,1,-.68,.42,.36,.35);this.add('box','ink',-1,1,-.493,.24,.045,.02);
    for(let i=0;i<COASTLINE.length;i++){
      const [x,z]=COASTLINE[i]!;
      if(x>1&&x<3.1&&z>3)continue;
      this.add('rock',i%2?'stone':'sand',x*.97,-.04,z*.97,.6+(i%3)*.17,.35+(i%2)*.2,.52,i*.8);
      this.add('rock','stone',x*1.055,-.24,z*1.045,.42,.35,.49,i);
    }
    const sea=new Mesh(new PlaneGeometry(54,54),this.seaMaterial);sea.rotation.x=-Math.PI/2;sea.position.y=-.2;this.water.add(sea);
    for(const [x,z] of [[2,7.75],[-3.3,4.8]]){const ripple=new Mesh(new TorusGeometry(.32,.009,3,32),new MeshStandardMaterial({color:'#dcece0',transparent:true,opacity:.66,roughness:1,depthWrite:false}));ripple.rotation.x=-Math.PI/2;ripple.position.set(x!,-.186,z!);this.ripples.push(ripple);this.water.add(ripple);}
    this.finish();
  }
  update(time:number):void{this.seaMaterial.uniforms.time!.value=time;this.pondMaterial.uniforms.time!.value=time;for(let i=0;i<this.ripples.length;i++)this.ripples[i]!.scale.setScalar(1+Math.sin(time*1.2+i)*.12);}
  private land(scale:number,y:number,depth:number,color:ColorKey):void{
    const shape=new Shape();COASTLINE.forEach(([x,z],i)=>{if(i===0)shape.moveTo(x*scale,-z*scale);else shape.lineTo(x*scale,-z*scale);});shape.closePath();
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
    this.add('disc','sand',POND.x,.105,POND.z,POND.rx*2.12,.085,POND.rz*2.12);
    const pond=new Mesh(new CircleGeometry(1,48),this.pondMaterial);pond.rotation.x=-Math.PI/2;pond.scale.set(POND.rx,POND.rz,1);pond.position.set(POND.x,.154,POND.z);this.water.add(pond);
    for(let i=0;i<14;i++){const a=i*Math.PI/7;this.add('rock',i%3?'stone':'sand',POND.x+Math.cos(a)*POND.rx,.17,POND.z+Math.sin(a)*POND.rz,.22+(i%3)*.07,.16,.21,a);}
    for(let i=0;i<6;i++){const x=POND.x-.65+i*.17,z=POND.z-.32+Math.sin(i*2)*.2;this.add('disc','leafLight',x,.165,z,.21,.015,.17,i);if(i%3===0)this.flower(x,z,'white',.44);}
    for(let i=0;i<8;i++)this.flower(POND.x+.95+i*.08,POND.z-.35+i*.13,'flower',.8);
  }
  private dock():void{
    this.add('box','wood',2,-.045,5.05,1.9,.18,4);
    for(let i=0;i<17;i++){
      this.add('box',i%3?'woodLight':'sand',2,.09,3.28+i*.23,1.92,.1,.216);
      if(i%2===0)this.add('box','wood',1.52+(i%3)*.3,.145,3.28+i*.23,.35,.004,.011);
    }
    for(const x of [1.1,2.9])for(const z of [3.7,5.1,6.9]){this.add('trunk','wood',x,-.1,z,.13,1.35,.13);this.add('disc','cream',x,.48,z,.17,.06,.17);for(let i=0;i<3;i++)this.add('disc','woodLight',x,.22+i*.05,z,.15,.035,.15);}
    this.add('soft','woodLight',3.55,.32,2.8,.52,.48,.45,.2);this.add('box','wood',3.55,.57,2.8,.57,.06,.5,.2);
    this.add('pot','blue',.98,.29,3.12,.28,.28,.28);this.add('disc','cream',.98,.45,3.12,.31,.035,.31);
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
    const x=7.65,z=-5.4;this.add('rock','stone',x,-.21,z,3.1,.9,2.5);
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
