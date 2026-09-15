import type {RegionId} from '../../game/content.ts';
import type {PlaceId,Point} from './map.ts';

export interface CoastPlace extends Point {name:string;radius:number;water?:Point&{y:number}}
export interface CoastMap {
  id:RegionId;name:string;spawn:Point;places:Record<PlaceId,CoastPlace>;
  coastline:readonly (readonly [number,number])[];
  dock:{x:number;start:number;end:number;width:number;stone?:boolean};
  pond?:Point&{rx:number;rz:number};
  trees:readonly (readonly [number,number,number])[];
  walls:readonly (readonly [number,number,number,number])[];
  circles?:readonly (readonly [number,number,number])[];
  light:{fog:string;sun:string;sky:string;ground:string;strength:number;ambient:number;exposure:number};
  water:{shallow:string;deep:string;pond:string};
}
export const COASTS:Record<RegionId,CoastMap>={
  L01:{id:'L01',name:'摸鱼塘',spawn:{x:0,z:.6},
    places:{pier:{x:2,z:6.15,name:'木栈桥',radius:1.1,water:{x:2,z:7.8,y:-.2}},cove:{x:-3.3,z:3.25,name:'芦苇浅湾',radius:1.15,water:{x:-3.3,z:4.9,y:-.2}},guest:{x:.1,z:1.1,name:'岸边来客',radius:1.1}},
    coastline:[[-5.6,-4.55],[-2.1,-4.95],[2.9,-4.7],[5.4,-3.9],[5.6,-1.15],[5.25,2.9],[4.4,3.8],[3,4.05],[1,3.8],[-1.5,3.95],[-3.95,3.7],[-5.4,2.8],[-5.65,.2]],
    dock:{x:2,start:3.5,end:7,width:1.9},pond:{x:-2.85,z:.65,rx:1.3,rz:.9},
    trees:[[-4.8,1.1,1.1],[-4.7,-3.9,1.2],[4.6,1.6,1.05],[4.5,-4,1.25],[.5,-3.8,1.15]],walls:[[-4.4,-1.4,-4.05,-1.6],[2.25,3.9,-3.9,-2.45]],
    light:{fog:'#bbd9d4',sun:'#fff0d2',sky:'#fffae7',ground:'#72978d',strength:3,ambient:1.6,exposure:1.05},water:{shallow:'#70c6c6',deep:'#398faa',pond:'#559991'}},
  L02:{id:'L02',name:'热梗湾',spawn:{x:.8,z:.9},
    places:{pier:{x:3.55,z:6.05,name:'珊瑚栈桥',radius:1.1,water:{x:3.55,z:7.7,y:-.2}},cove:{x:-4.3,z:2.55,name:'贝壳浅滩',radius:1.05,water:{x:-4.3,z:4.2,y:-.2}},guest:{x:-.8,z:.4,name:'湾边来客',radius:1.1}},
    coastline:[[-6,-4.2],[-3.3,-5],[.4,-4.6],[3,-3.2],[5.7,-2.9],[6,0],[4.7,3.1],[1.6,3.7],[-1,2.8],[-3.4,3.8],[-5.4,2.8],[-6.2,.2]],
    dock:{x:3.55,start:2.55,end:6.8,width:1.9},pond:{x:-2.6,z:-.8,rx:1.2,rz:.7},
    trees:[[-5.3,1,1.1],[-1.7,-3.9,1.1],[5,-1,1],[4.9,2.1,.95]],walls:[[-5.4,-3.25,-4.2,-2.1],[.4,2.6,-3.2,-1.8]],
    light:{fog:'#b9e1dc',sun:'#ffdbad',sky:'#fff4dd',ground:'#95b9a0',strength:3.2,ambient:1.7,exposure:1.08},water:{shallow:'#6ddbc9',deep:'#268fae',pond:'#75c7b7'}},
  L03:{id:'L03',name:'月光池',spawn:{x:2,z:1.7},
    places:{pier:{x:2.5,z:6.05,name:'月下木台',radius:1.1,water:{x:2.5,z:7.7,y:-.2}},cove:{x:-1.5,z:-2.72,name:'睡莲池畔',radius:.85,water:{x:-1.5,z:-1.07,y:.154}},guest:{x:1.8,z:.15,name:'林间来客',radius:1.1}},
    coastline:[[-6,-5],[-2,-5.6],[3.6,-4.7],[5.6,-2.2],[5,1.9],[3.7,4],[.1,4.55],[-4.4,3.7],[-5.6,.8]],
    dock:{x:2.5,start:3.4,end:6.8,width:1.9},pond:{x:-1.5,z:-.75,rx:2.1,rz:1.55},
    trees:[[-5.1,-3.1,1.45],[-4.7,1.9,1.35],[-.1,-4.35,1.4],[4.75,.95,1.2]],walls:[[1.3,3.7,-4.1,-1.9]],
    light:{fog:'#203c55',sun:'#b9d8ff',sky:'#bad5ed',ground:'#42686b',strength:1.55,ambient:1.65,exposure:.95},water:{shallow:'#416e8f',deep:'#203e60',pond:'#426e90'}},
  L04:{id:'L04',name:'深潜海',spawn:{x:.5,z:.4},
    places:{pier:{x:-.7,z:6.1,name:'深水栈台',radius:1.1,water:{x:-.7,z:7.75,y:-.2}},cove:{x:3.7,z:3,name:'星砂礁岸',radius:.95,water:{x:3.7,z:4.65,y:-.2}},guest:{x:-1.7,z:1.3,name:'港口来客',radius:1.1}},
    coastline:[[-5.5,-4.8],[-1.8,-5.4],[3.4,-4.8],[5.4,-2.8],[5.1,.1],[4.55,3.65],[1.3,4.3],[-1.75,3.9],[-3.8,2.25],[-5.8,.75]],
    dock:{x:-.7,start:3,end:7,width:2.2,stone:true},
    trees:[[-4.9,.4,.8],[4.45,-.6,.8],[.5,-4.6,.85]],walls:[[1.55,3.65,-4.4,-2.05],[3.7,4.45,-2.7,-1.9]],circles:[[-2.8,-2.7,.85]],
    light:{fog:'#678b9d',sun:'#f7d0b5',sky:'#c5def2',ground:'#486773',strength:2.1,ambient:1.55,exposure:1},water:{shallow:'#4089a6',deep:'#183f67',pond:'#438aa0'}},
};
