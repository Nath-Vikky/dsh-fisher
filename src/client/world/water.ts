import {Color,DoubleSide,ShaderMaterial} from 'three';

export function coastWater(pond=false):ShaderMaterial{
  return new ShaderMaterial({side:DoubleSide,uniforms:{time:{value:0},pond:{value:pond?1:0},shallow:{value:new Color(pond?'#559991':'#70c6c6')},deep:{value:new Color(pond?'#32656b':'#398faa')}},
    vertexShader:`varying vec3 shorePosition;
      void main(){vec4 world=modelMatrix*vec4(position,1.0);shorePosition=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform float time;uniform float pond;uniform vec3 shallow;uniform vec3 deep;varying vec3 shorePosition;
      void main(){vec2 p=shorePosition.xz;
        vec2 shore=max(abs(p-vec2(0.,-.5))-vec2(5.35,4.25),0.);float distanceToShore=length(shore);
        float depth=pond>.5?clamp(length((p-vec2(-2.85,.65))/vec2(1.3,.9)),0.,1.):clamp(distanceToShore/5.5,0.,1.);
        vec3 color=mix(shallow,deep,pond>.5?(1.-depth)*.8:depth);
        float a=sin(p.x*3.4+p.y*2.9+time*.55),b=sin(p.x*2.8-p.y*3.2-time*.4);
        float caustic=pow(max(0.,1.-abs(a+b)*2.5),8.);color+=vec3(.13,.21,.18)*caustic*(1.-depth)*.48;
        float wave=sin(p.x*1.4+p.y*7.5-time*.8)+sin(p.x*3.5-p.y*2.3+time*.32);
        float glint=smoothstep(1.83,1.98,wave);color+=vec3(.36,.4,.31)*glint;
        float foam=(1.-smoothstep(.08,.32,abs(distanceToShore-.2-sin(p.x*2.2+time*.55)*.075)))*(1.-pond);
        color=mix(color,vec3(.77,.91,.82),foam*.42);
        color=mix(color,vec3(.69,.83,.8),smoothstep(12.,30.,length(p))*.7);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,toneMapped:true});
}
