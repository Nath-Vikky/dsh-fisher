import { BoxGeometry,CylinderGeometry,Group,Mesh,MeshStandardMaterial,TorusGeometry,SphereGeometry } from 'three';
import type { ShoreState } from '../../game/shore.ts';
import type { RegionId } from '../../game/content.ts';

export class ShoreScene {
  group=new Group();private chime=new Group();private bottle=new Group();private bell=new Group();private near=new Group();private far=new Group();
  constructor(private region:RegionId){
    if(region!=='L01'){this.regional(region);return;}
    const wood=new MeshStandardMaterial({color:'#98754a',roughness:.85});
    const gold=new MeshStandardMaterial({color:'#d7ad65',roughness:.55,metalness:.22});
    const blue=new MeshStandardMaterial({color:'#6aada3',roughness:.65});
    const box=new BoxGeometry(1,1,1),cylinder=new CylinderGeometry(.12,.2,.24,10);
    for(const x of [-.65,.65]){const post=new Mesh(box,wood);post.position.set(x,.78,0);post.scale.set(.12,1.55,.12);post.castShadow=true;this.chime.add(post);}
    const beam=new Mesh(box,wood);beam.position.y=1.56;beam.scale.set(1.6,.13,.17);beam.castShadow=true;this.chime.add(beam);
    const ring=new Mesh(new TorusGeometry(.065,.014,4,10),gold);ring.position.y=1.4;this.chime.add(ring);
    const bell=new Mesh(cylinder,gold);bell.position.y=-.2;this.bell.position.y=1.35;this.bell.add(bell);
    const ribbon=new Mesh(box,blue);ribbon.position.y=-.46;ribbon.scale.set(.08,.27,.015);this.bell.add(ribbon);this.chime.add(this.bell);
    this.chime.position.set(-.9,.15,2.7);
    const glass=new MeshStandardMaterial({color:'#9fcec0',roughness:.32});
    const body=new Mesh(new CylinderGeometry(.06,.08,.25,8),glass);body.rotation.z=.8;this.bottle.add(body);
    const cork=new Mesh(box,wood);cork.position.set(-.1,.1,0);cork.scale.set(.065,.06,.06);this.bottle.add(cork);
    this.bottle.position.set(-3.4,-.13,4.7);this.bottle.scale.setScalar(1.5);
    this.group.add(this.chime,this.bottle);
  }
  private regional(region:Exclude<RegionId,'L01'>):void {
    const wood=new MeshStandardMaterial({color:region==='L02'?'#b48164':'#607e89',roughness:.85});
    const light=new MeshStandardMaterial({color:region==='L02'?'#f5cf9e':region==='L03'?'#c9dbea':'#afd8d6',emissive:region==='L02'?'#c96c46':'#76b9c4',emissiveIntensity:.6,roughness:.5});
    const accent=new MeshStandardMaterial({color:region==='L02'?'#e5a496':'#d7bd87',roughness:.7});
    const box=new BoxGeometry(1,1,1),sphere=new SphereGeometry(.5,10,6);
    const add=(group:Group,material:MeshStandardMaterial,x:number,y:number,z:number,w:number,h:number,d:number,round=false)=>{const mesh=new Mesh(round?sphere:box,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
    this.group.add(this.near,this.far);this.group.position.set(...(region==='L02'?[-2,.15,1.75]:region==='L03'?[3.55,.15,2.5]:[-3,.15,.15]) as [number,number,number]);
    if(region==='L02'){
      for(const group of [this.near,this.far]){for(const x of [-.55,.55])add(group,wood,x,.8,0,.08,1.6,.08);add(group,wood,0,1.6,0,1.35,.09,.12);}
      for(let i=0;i<5;i++){const x=(i-2)*.22;add(this.near,wood,x,1.28,0,.016,.55,.016);add(this.near,i%2?accent:light,x,1.01+(i%2)*.12,0,.19,.24,.1,true);}
      add(this.far,wood,0,1.36,0,.035,.48,.035);add(this.far,light,0,1.03,0,.55,.56,.4);add(this.far,accent,0,1.35,0,.65,.09,.5);add(this.far,accent,0,.71,0,.65,.09,.5);
    }else if(region==='L03'){
      for(const group of [this.near,this.far]){add(group,wood,0,.48,0,.11,.95,.11);add(group,wood,0,.12,0,.55,.22,.55);}
      add(this.near,light,0,1.22,0,.62,.85,.62,true);add(this.near,accent,0,1.61,0,.46,.05,.46);
      const orbit=new Mesh(new TorusGeometry(.48,.035,6,32),accent);orbit.position.y=1.2;orbit.rotation.x=.55;this.far.add(orbit);
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;add(this.far,light,Math.cos(a)*.43,1.2+Math.sin(a)*.38,0,.16,.16,.16,true);}add(this.far,light,0,1.2,0,.25,.25,.25,true);
    }else{
      for(let i=0;i<3;i++){add(this.near,wood,(i-1)*.48,.4,0,.12,.8,.12);add(this.near,light,(i-1)*.48,.85,0,.23,.32,.23);add(this.near,accent,(i-1)*.48,1.04,0,.32,.06,.32);}
      add(this.far,wood,0,.8,0,.21,1.6,.21);add(this.far,accent,0,1.67,0,.7,.12,.65);add(this.far,light,0,1.95,0,.4,.45,.4,true);add(this.far,wood,0,2.21,0,.7,.09,.65);
    }
  }
  update(shore:ShoreState,time:number):void {
    if(this.region!=='L01'){const state=shore.regions[this.region];this.group.visible=state.stage==='built';this.near.visible=state.choice==='near';this.far.visible=state.choice==='far';return;}
    this.chime.visible=shore.story==='built';this.bottle.visible=shore.story==='quiet';
    this.bell.rotation.z=Math.sin(time*1.9)*.07;this.bottle.position.y=-.13+Math.sin(time*1.4)*.025;
  }
}
