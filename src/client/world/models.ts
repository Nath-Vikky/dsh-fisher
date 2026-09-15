import {BoxGeometry,BufferGeometry,CylinderGeometry,DodecahedronGeometry,Float32BufferAttribute,Group,InstancedMesh,Matrix4,Mesh,MeshLambertMaterial,Object3D,TorusGeometry,Vector3} from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {TREES} from './map.ts';

const COLORS={sand:'#dcc594',grass:'#b8ce88',grassLight:'#cedb9c',grassDark:'#96b476',earth:'#b3a170',cream:'#f7e8be',roof:'#dba375',roofLight:'#edbe83',wood:'#ad8055',woodLight:'#dac39a',ink:'#334f54',leaf:'#88b47b',leafLight:'#adcb8b',water:'#79bec9',white:'#fff3d5',flower:'#dfac94',blue:'#6f9fa4'};
type ColorKey=keyof typeof COLORS;
export class Scenery {
  group=new Group();water=new Group();ripples:Mesh[]=[];
  geometries={box:new BoxGeometry(1,1,1),soft:new RoundedBoxGeometry(1,1,1,2,.07),rock:new DodecahedronGeometry(.5,0),trunk:new CylinderGeometry(.5,.58,1,7),disc:new CylinderGeometry(.5,.5,1,20)};
  materials=Object.fromEntries(Object.entries(COLORS).map(([key,color])=>[key,new MeshLambertMaterial({color})])) as Record<ColorKey,MeshLambertMaterial>;
  private batches=new Map<string,{geometry:BufferGeometry;material:MeshLambertMaterial;matrices:Matrix4[]}>();
  private helper=new Object3D();
  add(kind:keyof Scenery['geometries'],color:ColorKey,x:number,y:number,z:number,w:number,h:number,d:number,ry=0,rz=0):void {
    const key=`${kind}:${color}`;let batch=this.batches.get(key);
    if(!batch){batch={geometry:this.geometries[kind],material:this.materials[color],matrices:[]};this.batches.set(key,batch);}
    this.helper.position.set(x,y,z);this.helper.scale.set(w,h,d);this.helper.rotation.set(0,ry,rz);this.helper.updateMatrix();batch.matrices.push(this.helper.matrix.clone());
  }
  finish():void {
    for(const batch of this.batches.values()){const mesh=new InstancedMesh(batch.geometry,batch.material,batch.matrices.length);batch.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();this.group.add(mesh);}
    this.batches.clear();this.group.add(this.water);
  }
  constructor(){
    this.add('soft','earth',0,-.42,-.5,11.5,.8,9.7);
    this.add('soft','sand',0,-.045,-.5,11.35,.18,9.6);
    this.add('soft','grass',0,.02,-.68,10.8,.12,8.9);
    // Subtle grass patches and a continuous sandy path give the player readable routes.
    for(let x=-4;x<=4;x+=2)for(let z=-3.5;z<3;z+=2)this.add('soft',(x+z)%3>0?'grassLight':'grassDark',x,.085,z,1.75,.018,1.6);
    for(let i=0;i<11;i++)this.add('soft','sand',-2.8+i*.46,.107,-1.25+i*.48,1.25,.06,1.05,.13);
    this.add('soft','sand',-.4,.108,.7,8.5,.05,1.1);
    this.add('soft','sand',-3.3,.115,2.85,2.7,.05,1.4);
    this.house(-2.9,-2.8,1);
    this.house(3.1,-3.18,.54);
    for(const [x,z,s] of TREES){
      this.add('disc','grassDark',x,.13,z,1.9*s,.013,1.5*s);
      this.add('trunk','wood',x,.72*s,z,.29*s,1.45*s,.3*s);
      this.add('soft','leaf',x,1.63*s,z,1.52*s,.9*s,1.35*s,.12);
      this.add('soft','leafLight',x-.14*s,2.15*s,z-.02,1.25*s,.72*s,1.12*s,-.12);
      this.add('soft','grassLight',x+.02,2.53*s,z-.1,.75*s,.35*s,.7*s,.04);
      if(x<0)for(let i=0;i<3;i++)this.add('rock','roofLight',x-.5+i*.4,1.46*s,z+.7*s,.18,.18,.16);
    }
    // Dock boards share geometry and materials instead of creating a draw call per plank.
    this.add('box','wood',2,-.05,5.05,1.9,.2,4);
    for(let i=0;i<16;i++)this.add('box',i%3?'woodLight':'sand',2,.09,3.32+i*.24,1.92,.1,.224);
    for(const x of [1.1,2.9])for(const z of [3.7,5.1,6.7]){
      this.add('trunk','wood',x,-.02,z,.14,1.25,.14);
      this.add('disc','cream',x,.54,z,.19,.045,.19);
    }
    for(let i=0;i<10;i++){
      const x=-5.2+i*1.08,z=3.5+(i%3)*.08;
      if(x>1&&x<3)continue;this.add('rock','sand',x,-.02,z,.65,.38,.6,i*.3);
    }
    for(const [x,z] of [[-4,2.9],[-4.5,3.35],[4.7,3],[-5,2.1],[3.9,2.8]])for(let i=0;i<4;i++)this.add('box','leaf',x!+i*.13,.29+(i%2)*.08,z!+(i%2)*.2,.055,.42+(i%2)*.15,.05,i*.5,.08*(i%2?1:-1));
    for(let i=0;i<25;i++){
      const x=-5+(i*2.39)%10,z=-4.3+(i*1.77)%7.5;
      if(x>-4.5&&x<-1.3&&z<-1.5||x>2&&z<-2.2)continue;
      this.add('box','grassDark',x,.17,z,.055,.21,.05);
      this.add('soft',i%3?'white':'flower',x,.29,z,.16,.07,.16);
      this.add('box','roofLight',x,.33,z,.05,.025,.05);
    }
    // Bench, landing sign and mail box form the visitor's little corner.
    this.add('box','woodLight',3.45,.48,-.9,1.35,.12,.5);
    this.add('box','woodLight',3.45,.82,-1.14,1.35,.42,.09);
    for(const x of [2.95,3.95])this.add('box','wood',x,.24,-.9,.1,.5,.4);
    this.add('box','wood',.56,.54,2.7,.1,1.05,.1);
    this.add('soft','cream',.56,.94,2.7,.66,.36,.09);
    this.add('box','blue',.56,.95,2.76,.35,.045,.025,.0,-.18);
    this.add('box','wood',-1.0,.49,-.68,.12,.9,.12);
    this.add('soft','blue',-1,.98,-.68,.42,.36,.35);
    this.add('box','ink',-1,1,-.493,.24,.045,.02);
    const sea=new Mesh(new BoxGeometry(42,.12,42),new MeshLambertMaterial({color:COLORS.water}));sea.position.y=-.31;this.group.add(sea);
    const surface=new InstancedMesh(this.geometries.box,new MeshLambertMaterial({color:'#b8e0da',transparent:true,opacity:.52}),70);
    for(let i=0;i<70;i++){this.helper.position.set(-16+(i*3.43)%32,-.235,4+(i*2.63)%13);this.helper.scale.set(.15+(i%5)*.14,.006,.03);this.helper.rotation.set(0,.04,0);this.helper.updateMatrix();surface.setMatrixAt(i,this.helper.matrix);}
    surface.instanceMatrix.needsUpdate=true;this.water.add(surface);
    for(const [x,z] of [[2,7.6],[-3.3,4.7]]){
      const ripple=new Mesh(new TorusGeometry(.36,.012,3,28),new MeshLambertMaterial({color:'#d9eee4',transparent:true,opacity:.65}));
      ripple.rotation.x=-Math.PI/2;ripple.position.set(x!,-.225,z!);this.ripples.push(ripple);this.water.add(ripple);
    }
    this.finish();
  }
  private house(x:number,z:number,s:number):void {
    const add=(kind:keyof Scenery['geometries'],color:ColorKey,dx:number,y:number,dz:number,w:number,h:number,d:number,ry=0,rz=0)=>this.add(kind,color,x+dx*s,y*s,z+dz*s,w*s,h*s,d*s,ry,rz);
    add('soft','woodLight',0,.19,0,3.25,.3,2.6);
    add('soft','cream',0,1.03,0,3,1.6,2.4);
    add('box','wood',-1.4,1,1.19,.1,1.8,.11);add('box','wood',1.4,1,1.19,.1,1.8,.11);
    const roof=new BufferGeometry();roof.setAttribute('position',new Float32BufferAttribute([
      -1.7,1.78,-1.42,1.7,1.78,-1.42,0,2.9,-1.42, -1.7,1.78,1.42,0,2.9,1.42,1.7,1.78,1.42,
      -1.7,1.78,-1.42,0,2.9,-1.42,-1.7,1.78,1.42, 0,2.9,-1.42,0,2.9,1.42,-1.7,1.78,1.42,
      0,2.9,-1.42,1.7,1.78,-1.42,1.7,1.78,1.42, 0,2.9,-1.42,1.7,1.78,1.42,0,2.9,1.42,
    ],3));roof.computeVertexNormals();const mesh=new Mesh(roof,this.materials.roof);mesh.position.set(x,0,z);mesh.scale.setScalar(s);this.group.add(mesh);
    for(let row=0;row<5;row++)for(const side of [-1,1])for(let col=0;col<7;col++)add('box',(row+col)%3?'roof':'roofLight',side*(.17+row*.33),2.91-(.17+row*.33)*1.12/1.7,-1.25+col*.42,.43,.055,.395,0,-side*Math.atan(1.12/1.7));
    add('soft','earth',.9,2.6,-.55,.43,1.1,.43);add('box','cream',.9,3.17,-.55,.55,.12,.55);
    add('box','blue',-.38,.82,1.215,.62,1.25,.08);add('box','wood',-.38,.8,1.26,.5,1.12,.03);
    add('rock','roofLight',-.18,.85,1.3,.06,.06,.04);
    for(const dx of [-1.02,.7]){
      add('box','blue',dx,1.17,1.235,.55,.62,.07);add('box','cream',dx,1.17,1.285,.04,.6,.03);add('box','cream',dx,1.17,1.285,.55,.045,.03);
      add('box','leaf',dx,.76,1.34,.7,.18,.28);add('box','flower',dx,.86,1.38,.4,.08,.17);
    }
    add('box','sand',-.38,.14,1.56,1,.19,.52);add('box','woodLight',-.38,.075,1.89,1.2,.1,.26);
  }
}

export type ActorPose='idle'|'walk'|'cast'|'hold'|'reel'|'surprise';
export class Actor {
  group=new Group();body=new Group();leftArm=new Group();rightArm=new Group();leftLeg=new Group();rightLeg=new Group();rod=new Group();
  private hat=new Group();
  constructor(visitor=false){
    const soft=new RoundedBoxGeometry(1,1,1,2,.08),round=new DodecahedronGeometry(.5,1),cylinder=new CylinderGeometry(.5,.5,1,12);
    const materials={skin:new MeshLambertMaterial({color:'#efc79f'}),shirt:new MeshLambertMaterial({color:visitor?'#e9c782':'#72a9aa'}),dark:new MeshLambertMaterial({color:visitor?'#787e77':'#405969'}),hat:new MeshLambertMaterial({color:visitor?'#bba277':'#efd395'}),hair:new MeshLambertMaterial({color:visitor?'#ad7754':'#594f47'}),ink:new MeshLambertMaterial({color:'#354448'}),white:new MeshLambertMaterial({color:'#f8e7c1'}),coral:new MeshLambertMaterial({color:'#d8987c'})};
    const part=(parent:Group,material:keyof typeof materials,x:number,y:number,z:number,w:number,h:number,d:number,shape:BufferGeometry=soft)=>{const mesh=new Mesh(shape,materials[material]);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
    this.group.add(this.body);this.body.add(this.leftArm,this.rightArm,this.leftLeg,this.rightLeg,this.hat,this.rod);
    part(this.body,'shirt',0,.91,0,.5,.57,.34);part(this.body,'dark',0,.63,0,.46,.18,.32);
    part(this.body,'white',0,1.17,.05,.27,.07,.3);part(this.body,'white',0,1.02,.179,.035,.22,.012);
    part(this.body,'skin',0,1.37,.02,.45,.43,.4,round);part(this.body,'hair',0,1.52,-.03,.46,.21,.39);
    for(const side of [-1,1]){part(this.body,'ink',side*.095,1.405,.21,.044,.052,.025);part(this.body,'coral',side*.145,1.34,.19,.05,.025,.024);part(this.body,'skin',side*.225,1.38,.015,.08,.11,.12,round);}
    part(this.body,'skin',0,1.35,.23,.066,.06,.06,round);
    this.hat.position.y=1.56;part(this.hat,'hat',0,0,0,.76,.065,.68,cylinder);part(this.hat,'hat',0,.13,-.01,.48,.22,.45,cylinder);part(this.hat,'dark',0,.065,-.005,.49,.065,.46,cylinder);
    this.leftArm.position.set(-.3,1.12,0);this.rightArm.position.set(.3,1.12,0);
    for(const arm of [this.leftArm,this.rightArm]){part(arm,'shirt',0,-.14,0,.16,.29,.2);part(arm,'skin',0,-.34,.015,.135,.18,.145,round);}
    this.leftLeg.position.set(-.13,.63,0);this.rightLeg.position.set(.13,.63,0);
    for(const leg of [this.leftLeg,this.rightLeg]){part(leg,'dark',0,-.17,0,.17,.34,.22);part(leg,'skin',0,-.38,0,.14,.15,.17);part(leg,'hat',0,-.48,.055,.2,.13,.32);}
    part(this.body,'hat',0,.91,-.22,.32,.36,.2);part(this.body,'dark',-.19,1,-.02,.045,.35,.37);
    const shaft=new Mesh(new CylinderGeometry(.015,.032,1.48,8),materials.hair);shaft.position.y=.72;this.rod.add(shaft);
    const reel=new Mesh(new TorusGeometry(.095,.025,6,12),materials.dark);reel.position.set(.04,.28,.02);this.rod.add(reel);
    this.rod.position.set(.3,1.03,.25);this.rod.rotation.x=.75;this.rod.visible=false;
    const shadow=new Mesh(new CylinderGeometry(.38,.38,.006,24),new MeshLambertMaterial({color:'#7e9e82',transparent:true,opacity:.3}));shadow.position.y=.008;this.group.add(shadow);
    if(visitor){this.group.scale.setScalar(.94);part(this.body,'coral',.23,.94,.16,.24,.29,.18);}
  }
  animate(pose:ActorPose,time:number,reduced:boolean):void {
    const walk=pose==='walk',fishing=pose==='hold'||pose==='cast'||pose==='reel';
    const step=walk?Math.sin(time*9)*.6:0;
    this.leftLeg.rotation.x=step;this.rightLeg.rotation.x=-step;
    this.leftArm.rotation.x=walk?-step*.65:fishing?-1:0;this.rightArm.rotation.x=walk?step*.65:fishing?-1.25:0;
    this.leftArm.rotation.z=.12;this.rightArm.rotation.z=-.12;
    this.body.position.y=walk&&!reduced?Math.abs(Math.sin(time*9))*.025:0;
    this.rod.visible=fishing;this.rod.rotation.x=.75+(pose==='cast'&&!reduced?Math.sin(time*3)*.24:pose==='reel'&&!reduced?Math.sin(time*7)*.04:0);
    if(pose==='surprise'){this.leftArm.rotation.x=-2.5;this.rightArm.rotation.x=-2.5;}
  }
  rodTip():Vector3 {return this.rod.localToWorld(new Vector3(0,1.48,0));}
}

export function disposeModel(root:Group):void {
  const geometries=new Set<BufferGeometry>(),materials=new Set<MeshLambertMaterial>();
  root.traverse(object=>{if(object instanceof Mesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material as MeshLambertMaterial);if(object instanceof InstancedMesh)object.dispose();}});
  geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());root.clear();
}
