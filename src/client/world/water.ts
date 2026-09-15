import {Color,DoubleSide,ShaderMaterial,Vector2} from 'three';
import {COASTS} from './regions.ts';
import type {CoastMap} from './regions.ts';

export function coastWater(pond=false,map:CoastMap=COASTS.L01):ShaderMaterial{
  const pool=map.pond??{x:0,z:0,rx:1,rz:1};
  return new ShaderMaterial({side:DoubleSide,uniforms:{time:{value:0},pond:{value:pond?1:0},shallow:{value:new Color(pond?map.water.pond:map.water.shallow)},deep:{value:new Color(map.water.deep)},horizon:{value:new Color(map.light.fog)},poolCenter:{value:new Vector2(pool.x,pool.z)},poolSize:{value:new Vector2(pool.rx,pool.rz)},shoreCount:{value:map.coastline.length},shorePoints:{value:Array.from({length:16},(_,i)=>new Vector2(...(map.coastline[i]??map.coastline[0]!)))}},
    vertexShader:`varying vec3 shorePosition;
      void main(){vec4 world=modelMatrix*vec4(position,1.0);shorePosition=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform float time;uniform float pond;uniform vec3 shallow;uniform vec3 deep;uniform vec3 horizon;uniform vec2 poolCenter;uniform vec2 poolSize;uniform vec2 shorePoints[16];uniform int shoreCount;varying vec3 shorePosition;
      void main(){vec2 p=shorePosition.xz;
        float distanceToShore=100.;
        for(int i=0;i<16;i++){if(i>=shoreCount)break;vec2 a=shorePoints[i],b=shorePoints[i+1==shoreCount?0:i+1];vec2 edge=b-a;float along=clamp(dot(p-a,edge)/max(dot(edge,edge),.001),0.,1.);distanceToShore=min(distanceToShore,length(p-a-edge*along));}
        float depth=pond>.5?clamp(length((p-poolCenter)/poolSize),0.,1.):clamp(distanceToShore/5.5,0.,1.);
        vec3 color=mix(shallow,deep,pond>.5?(1.-depth)*.8:depth);
        float a=sin(p.x*3.4+p.y*2.9+time*.55),b=sin(p.x*2.8-p.y*3.2-time*.4);
        float shimmer=clamp(dot(shallow,vec3(.2126,.7152,.0722))*1.7,.22,1.);
        float caustic=pow(max(0.,1.-abs(a+b)*2.5),8.);color+=vec3(.13,.21,.18)*caustic*(1.-depth)*.48*shimmer;
        float wave=sin(p.x*1.4+p.y*7.5-time*.8)+sin(p.x*3.5-p.y*2.3+time*.32);
        float glint=smoothstep(1.83,1.98,wave);color+=vec3(.36,.4,.31)*glint*shimmer;
        float foam=(1.-smoothstep(.08,.32,abs(distanceToShore-.2-sin(p.x*2.2+time*.55)*.075)))*(1.-pond);
        color=mix(color,vec3(.77,.91,.82),foam*.42);
        color=mix(color,horizon,smoothstep(12.,30.,length(p))*.7);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,toneMapped:true});
}
