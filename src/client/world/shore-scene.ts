import { BoxGeometry,CylinderGeometry,Group,Mesh,MeshStandardMaterial,TorusGeometry } from 'three';
import type { ShoreState } from '../../game/shore.ts';
import type { RegionId } from '../../game/content.ts';

export class ShoreScene {
  group=new Group();private chime=new Group();private bottle=new Group();private bell=new Group();
  constructor(private region:RegionId){
    if(region!=='L01')return;
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
  update(shore:ShoreState,time:number):void {
    this.group.visible=this.region==='L01';this.chime.visible=shore.story==='built';this.bottle.visible=shore.story==='quiet';
    this.bell.rotation.z=Math.sin(time*1.9)*.07;this.bottle.position.y=-.13+Math.sin(time*1.4)*.025;
  }
}
