import {BoxGeometry,CylinderGeometry,Group,Mesh,MeshStandardMaterial,OctahedronGeometry} from 'three';
import type {Bootstrap} from '../../protocol.ts';
import {CORNERS,MEMORIALS} from './facilities.ts';
import {disposeDecor} from './decor-models.ts';
import type {RegionId} from '../../game/content.ts';

export class ShoreMoments {
  group=new Group();private key='';
  sync(data:Bootstrap,region:RegionId):boolean{
    const memory=data.adventures.memorials[region],picnic=data.adventures.picnic?.region===region?data.adventures.picnic:null,legend=region==='L04'&&data.adventures.legend.stage==='complete';
    const key=JSON.stringify([memory,picnic,legend]);if(key===this.key)return false;this.key=key;disposeDecor(this.group);
    if(!memory&&!picnic&&!legend)return true;
    const wood=new MeshStandardMaterial({color:'#b49464',roughness:.85}),paper=new MeshStandardMaterial({color:'#f5e4b8',roughness:.8}),cloth=new MeshStandardMaterial({color:'#c48778',roughness:1}),light=new MeshStandardMaterial({color:'#ffdda0',emissive:'#eab864',emissiveIntensity:.5}),gem=new MeshStandardMaterial({color:'#89d6d7',emissive:'#60aabc',emissiveIntensity:.5,roughness:.2});
    const box=new BoxGeometry(1,1,1),round=new CylinderGeometry(.5,.5,1,12),diamond=new OctahedronGeometry(.5);
    const add=(shape:typeof box|typeof round|typeof diamond,mat:MeshStandardMaterial,x:number,y:number,z:number,w:number,h:number,d:number)=>{
      const mesh=new Mesh(shape,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;this.group.add(mesh);return mesh;
    };
    const mark=MEMORIALS[region];
    if(memory){const x=mark.x+.46,z=mark.z+.26;
      add(box,wood,x,.4,z,.055,.6,.055);
      if(memory.kind==='letter'){add(box,paper,x,.74,z,.34,.24,.025);const fold=add(box,cloth,x,.77,z+.02,.2,.018,.018);fold.rotation.z=-.4;}
      else{add(round,wood,x,.76,z,.26,.05,.26);add(round,light,x,.92,z,.18,.28,.18);add(round,wood,x,1.08,z,.27,.055,.27);}
    }
    if(picnic){const p=CORNERS[region],x=p.x-1.35,z=p.z+.6;
      add(box,cloth,x,.18,z,.9,.025,.6);for(const dx of [-.22,.22]){add(round,paper,x+dx,.21,z,.24,.035,.24);add(round,picnic.menu==='soup'?light:wood,x+dx,.24,z,.14,.04,.14);}add(round,paper,x,.28,z+.2,.1,.16,.1);
    }
    if(legend){const p=MEMORIALS.L04;add(round,wood,p.x-.5,.34,p.z,.33,.4,.33);const jewel=add(diamond,gem,p.x-.5,.78,p.z,.46,.5,.32);jewel.rotation.z=.35;}
    const usedMaterials=new Set(this.group.children.map(object=>(object as Mesh).material)),usedGeometry=new Set(this.group.children.map(object=>(object as Mesh).geometry));
    for(const material of [wood,paper,cloth,light,gem])if(!usedMaterials.has(material))material.dispose();
    for(const geometry of [box,round,diamond])if(!usedGeometry.has(geometry))geometry.dispose();
    return true;
  }
}
