import {BoxGeometry,CylinderGeometry,Group,InstancedMesh,Matrix4,Mesh,MeshStandardMaterial,Object3D,SphereGeometry,TorusGeometry} from 'three';
import type {BufferGeometry,Material} from 'three';
import {decor} from '../../game/decor.ts';
import type {DecorId,DecorSlot} from '../../game/decor.ts';

export function disposeDecor(group:Group):void{
  const geometries=new Set<BufferGeometry>(),materials=new Set<Material>();
  group.traverse(object=>{if(object instanceof Mesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);}});
  for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();group.clear();
}

export function decorModel(slot:DecorSlot,id:DecorId|null):Group {
  const group=new Group(),theme=id?decor(id).theme:'afternoon';
  const colors={afternoon:['#b89564','#f3dda5','#628f82'],coral:['#e2ac87','#ffe3bc','#63adab'],moon:['#677b9e','#dfdcbc','#b1caba'],deep:['#486c88','#a7d4d3','#dec398']}[theme];
  const materials=colors.map(color=>new MeshStandardMaterial({color,roughness:.78}));
  const geometries={box:new BoxGeometry(1,1,1),round:new SphereGeometry(.5,10,6),post:new CylinderGeometry(.5,.5,1,10),ring:new TorusGeometry(.5,.045,5,20)};
  const batches=new Map<string,Matrix4[]>(),helper=new Object3D();
  const add=(shape:keyof typeof geometries,c:number,x:number,y:number,z:number,w:number,h:number,d:number,rz=0,rx=0)=>{
    helper.position.set(x,y,z);helper.scale.set(w,h,d);helper.rotation.set(rx,0,rz);helper.updateMatrix();
    const key=`${shape}:${c}`;if(!batches.has(key))batches.set(key,[]);batches.get(key)!.push(helper.matrix.clone());
  };
  const star=(x:number,y:number,z:number,size:number)=>{add('box',1,x,y,z,size,.035,.035,.78);add('box',1,x,y,z,size,.035,.035,-.78);};
  if(slot==='ground'){
    if(theme==='afternoon')for(let i=0;i<9;i++)add('box',i%3===0?1:0,.3+(i-4)*.39,.025,0,.36,.045,1.45);
    if(theme==='coral'){add('round',1,.3,.02,0,3.5,.05,1.55);for(let i=0;i<8;i++)add('round',0,-1.1+i*.4,.07,.56,.12,.05,.09);}
    if(theme==='moon'){add('box',0,.3,.03,0,3.5,.04,1.5);add('ring',1,.3,.06,0,.8,.8,.8,0,Math.PI/2);for(let i=0;i<5;i++)add('box',1,-1.2+i*.72,.055,.62,.09,.01,.09,Math.PI/4);}
    if(theme==='deep')for(let x=0;x<7;x++)for(let z=0;z<3;z++)add('box',(x+z)%3===0?2:0,-1.2+x*.5,.03,-.5+z*.5,.46,.05,.46);
  }else if(slot==='seat'){
    const x=-1.35;
    add('box',0,x,.43,0,.92,.13,.55);for(const dx of [-.34,.34])add('post',0,x+dx,.2,0,.07,.4,.4);
    if(theme==='afternoon'){for(let i=0;i<7;i++)add('box',i%2?1:0,x+(i-3)*.12,.76,-.23,.075,.56,.07);add('box',0,x,1.03,-.23,.95,.065,.08);}
    if(theme==='coral'){for(let i=0;i<7;i++){const a=(i-3)*.22;add('round',i%2?1:0,x+Math.sin(a)*.45,.72+Math.cos(a)*.18,-.2,.19,.65,.12,-a);}add('round',2,x,.51,.02,.72,.12,.4);}
    if(theme==='moon'){add('round',0,x,.78,-.2,.95,.72,.22);add('round',1,x,.53,0,.8,.19,.5);for(const dx of [-.48,.48])add('round',0,x+dx,.62,0,.18,.3,.6);star(x,.9,-.065,.22);}
    if(theme==='deep'){add('box',0,x,.77,-.22,.18,.6,.13);for(const dx of [-1,1])add('round',2,x+dx*.25,.98,-.2,.61,.24,.15,-dx*.45);add('round',1,x,.53,0,.77,.12,.43);}
  }else if(slot==='lamp'){
    const x=2.3;materials[1]!.emissive.set(colors[1]!);materials[1]!.emissiveIntensity=.45;
    if(theme==='afternoon'){add('post',0,x,.65,-.1,.06,1.3,.06);add('box',1,x,1.4,-.1,.25,.36,.25);for(const y of [1.2,1.6])add('box',0,x,y,-.1,.35,.06,.35);add('ring',0,x,1.73,-.1,.13,.13,.13);}
    if(theme==='coral'){add('post',0,x,.65,-.1,.07,1.3,.07);for(let i=0;i<5;i++){add('box',0,x,1+i*.12,-.1,.52,.04,.04,(i-2)*.3);add('round',1,x+(i%2?.25:-.25),1+i*.12,-.1,.14,.2,.14);}}
    if(theme==='moon'){add('post',0,x,.6,-.1,.065,1.2,.065);add('round',1,x,1.45,-.1,.49,.62,.4);for(const y of [1.14,1.75])add('box',0,x,y,-.1,.23,.05,.23);for(let i=0;i<4;i++)add('box',2,x+(i-1.5)*.05,1.02,-.1,.015,.18,.02);}
    if(theme==='deep'){add('post',0,x,.64,-.1,.25,1.25,.25);for(const y of [.2,.5,.8])add('post',1,x,y,-.1,.27,.085,.27);add('post',1,x,1.39,-.1,.34,.24,.34);add('round',2,x,1.59,-.1,.47,.2,.47);}
  }else if(slot==='sign'){
    const x=-2;add('post',0,x,.35,.1,.06,.7,.06);
    if(theme==='afternoon'){add('box',0,x,.8,.1,.7,.38,.08);add('round',1,x,.8,.15,.29,.14,.035);add('box',1,x-.2,.8,.15,.13,.13,.03,Math.PI/4);}
    if(theme==='coral'){add('box',1,x,.8,.1,.69,.31,.09);add('box',1,x+.28,.8,.1,.3,.3,.08,Math.PI/4);for(let i=0;i<3;i++)add('box',2,x-.2+i*.13,.81,.16,.07,.13,.02);}
    if(theme==='moon'){add('box',0,x,.8,.1,.63,.4,.08);add('box',1,x,.8,.16,.37,.23,.02);add('box',2,x-.07,.83,.18,.21,.02,.015,-.4);add('box',2,x+.07,.83,.18,.21,.02,.015,.4);}
    if(theme==='deep'){add('box',0,x,.8,.1,.68,.43,.14);add('box',2,x,.81,.18,.55,.3,.025);for(let i=0;i<3;i++)add('box',0,x-.17+i*.1,.82,.2,.035,.1,.01);add('round',1,x+.19,.72,.2,.05,.05,.02);}
  }else if(slot==='background'){
    add('box',0,0,.76,-.32,1.27,.68,.035);
    if(theme==='afternoon')for(let i=0;i<3;i++){add('round',2,(i-1)*.35,.68+(i%2)*.2,-.29,.38,.13,.03);add('box',1,(i-1)*.35,.52,-.28,.018,.25,.018);}
    if(theme==='coral')for(let i=0;i<5;i++){const x=(i-2)*.23;add('box',i%2?1:2,x,.62,-.28,.045,.32+(i%3)*.14,.025);add('box',1,x+.06,.73,-.28,.2,.035,.025,.5);}
    if(theme==='moon'){add('round',1,.27,.88,-.29,.28,.28,.025);for(let i=0;i<5;i++)star(-.45+i*.18,.57+(i%3)*.14,-.28,.075);}
    if(theme==='deep')for(let i=0;i<5;i++){add('round',1,(i-2)*.23,.55+(i%3)*.17,-.28,.11,.11,.02);add('box',2,(i-2)*.23,.49+(i%3)*.17,-.28,.015,.1,.02);}
  }else{
    const x=1.55;
    for(const y of [.22,.64,1.06])add('box',0,x,y,0,.86,.065,.53);
    for(const dx of [-.45,.45])add('box',0,x+dx,.55,-.15,.055,1.15,.36,theme==='coral'?dx*.16:0);
    if(theme==='afternoon'){add('box',1,x,1.2,-.2,.97,.07,.08);add('box',0,x,.64,-.2,.8,.04,.04,.65);}
    if(theme==='coral'){for(const dx of [-.4,0,.4])add('round',1,x+dx,1.18,-.15,.22,.1,.16);add('box',2,x,.13,.25,.87,.05,.025);}
    if(theme==='moon'){add('box',0,x,.63,-.24,.88,1.1,.04);for(let i=0;i<5;i++)star(x-.33+i*.16,1.19+(i%2)*.04,-.13,.1);}
    if(theme==='deep'){add('round',1,x,1.27,-.12,.28,.28,.17);for(const y of [.2,.64,1.07])add('box',2,x,y,.28,.93,.03,.03);add('box',0,x,.63,-.25,.9,1.1,.055);}
  }
  const used=new Set<string>();for(const [key,matrices] of batches){const [shape,c]=key.split(':');used.add(shape!);const mesh=new InstancedMesh(geometries[shape as keyof typeof geometries],materials[Number(c)]!,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
  for(const [name,geometry] of Object.entries(geometries))if(!used.has(name))geometry.dispose();
  for(let i=0;i<materials.length;i++)if(![...batches.keys()].some(key=>key.endsWith(`:${i}`)))materials[i]!.dispose();
  return group;
}
