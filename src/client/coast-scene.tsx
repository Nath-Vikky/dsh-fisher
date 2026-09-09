import type * as ReactTypes from 'react';
import type { Bootstrap } from '../protocol.ts';
import { region } from '../game/content.ts';
import { SCENE_ART, DECOR_ART, PLAYER_ART, guestPicture } from '../game/visuals.ts';
import type { PlayerPose } from '../game/visuals.ts';
import { GEAR_ART } from '../game/gear.ts';
import { drawCoast, coastPoint } from './coast.ts';
import { SceneArt, drawSprite } from './scene-art.ts';

// Hand positions within each full sprite, shared by all equipped rods.
const ROD_HANDS={
  cast:[[.645,.35],[.745,.29]],
  hold:[[.655,.495],[.655,.495]],
  reel:[[.64,.395],[.625,.375]],
} as const;

interface Props { lowPerformance:boolean; paused?:boolean; reducedMotion?:boolean; data:Bootstrap|null; pose?:PlayerPose; quiet?:boolean }
export function createScene(React:typeof ReactTypes) {
  return function Scene({lowPerformance,paused=false,reducedMotion=false,data,pose='idle',quiet=false}:Props) {
    const canvas=React.useRef<HTMLCanvasElement>(null);
    const latest=React.useRef({data,pose,paused,reducedMotion});latest.current={data,pose,paused,reducedMotion};
    const restart=React.useRef<()=>void>(()=>{});
    const art=React.useRef<SceneArt>();
    const [artState,setArtState]=React.useState<'loading'|'ready'|'error'>('loading');
    const location=data?.journey.region??'L01',scene=SCENE_ART[location];
    const guest=data?.life.visitor;
    const visitor=guest?guestPicture(guest,data!.life.guests[guest].outfit,'chibi'):undefined;
    const decorFiles=(['ground','seat','lamp','sign'] as const).map(slot=>data?.life.decor[slot]).flatMap(id=>id&&DECOR_ART[id]?[DECOR_ART[id]]:[]);
    const rod=data&&['cast','hold','reel'].includes(pose)?GEAR_ART[data.journey.loadout.rod]:undefined;
    const files=[scene,visitor,rod,...decorFiles,...(PLAYER_ART[pose]??[])].filter((file):file is string=>!!file);
    const fileKey=files.join('|');
    const fileRef=React.useRef(files);fileRef.current=files;
    React.useEffect(()=>{art.current?.select(fileRef.current);restart.current();},[fileKey,paused,reducedMotion,data?.revision]);
    React.useEffect(()=>{
      const element=canvas.current,ctx=element?.getContext('2d',{alpha:false});if(!element||!ctx)return;
      let frame=0,width=0,height=0,pixelRatio=0,last=0,elapsed=0,stopped=false,visible=true;
      const reduced=matchMedia('(prefers-reduced-motion: reduce)');
      const draw=()=>{
        const current=latest.current,snapshot=current.data;
        const background=artwork.get(SCENE_ART[snapshot?.journey.region??'L01']);
        drawCoast(ctx,width,height,current.reducedMotion||reduced.matches?0:elapsed,background);
        if(!background)return;
        const point=(x:number,y:number)=>coastPoint(background,width,height,x,y);
        for(const [slot,x,y,size] of [['ground',.43,.75,110],['seat',.37,.67,32],['lamp',.23,.64,46],['sign',.55,.58,45]] as const) {
          const id=snapshot?.life.decor[slot],position=point(x,y);
          if(id)drawSprite(ctx,artwork.get(DECOR_ART[id]),position.x,position.y,size,size);
        }
        const playerFrames=PLAYER_ART[current.pose]??[],player=point(.47,.62);
        const actorScale=Math.min(1.6,width/320,Math.max(.65,(player.y-8)/80));
        const staticFrame=current.reducedMotion||reduced.matches||current.paused;
        const frameIndex=(staticFrame?0:Math.floor(elapsed*2))%Math.max(1,playerFrames.length);
        const frameName=playerFrames[frameIndex];
        if(snapshot&&(current.pose==='cast'||current.pose==='hold'||current.pose==='reel')) {
          const equipped=artwork.get(GEAR_ART[snapshot.journey.loadout.rod]);
          if(equipped) {
            const hand=ROD_HANDS[current.pose][frameIndex]??ROD_HANDS[current.pose][0],playerSize=Math.round(80*actorScale);
            const gripX=Math.round(player.x)+(hand[0]-.5)*playerSize,gripY=Math.round(player.y)+(hand[1]-1)*playerSize;
            const gesture=current.pose==='cast'?(frameIndex===0?-.3:0):current.pose==='reel'&&!staticFrame?Math.sin(elapsed*4)*.04:0;
            // Keep the entire rotated rod in the scene without moving its grip away from the hand.
            const bounds=([[-.35,-.66],[.65,-.66],[-.35,.34],[.65,.34]] as const).map(([x,y])=>({
              x:x*Math.cos(gesture)-y*Math.sin(gesture),y:x*Math.sin(gesture)+y*Math.cos(gesture),
            }));
            const rodSize=Math.max(0,Math.min(112*actorScale,
              (gripY-6)/-Math.min(...bounds.map(p=>p.y)),(height-6-gripY)/Math.max(...bounds.map(p=>p.y)),
              (gripX-6)/-Math.min(...bounds.map(p=>p.x)),(width-6-gripX)/Math.max(...bounds.map(p=>p.x))));
            ctx.save();ctx.translate(gripX,gripY);ctx.rotate(gesture);
            drawSprite(ctx,equipped,.15*rodSize,.34*rodSize,rodSize,rodSize);ctx.restore();
          }
        }
        // The player's foreground hand and sleeve cover the handle, rather than the reverse.
        drawSprite(ctx,artwork.get(frameName),player.x,player.y,80*actorScale,96*actorScale);
        const guestId=snapshot?.life.visitor,guestPosition=point(.28,.67);
        if(guestId)drawSprite(ctx,artwork.get(guestPicture(guestId,snapshot!.life.guests[guestId].outfit,'chibi')),guestPosition.x,guestPosition.y,76*actorScale,84*actorScale);
      };
      const render=(now:number)=>{
        if(stopped||!visible||document.hidden||latest.current.paused)return;
        if(now-last>=(quiet?100:lowPerformance?50:1000/30)) {
          elapsed+=Math.min(100,now-last)/1000;last=now;draw();
        }
        frame=requestAnimationFrame(render);
      };
      const start=()=>{
        cancelAnimationFrame(frame);if(stopped||!visible||document.hidden)return;
        last=performance.now();draw();
        const ready=!!artwork.get(SCENE_ART[latest.current.data?.journey.region??'L01']);
        setArtState(artwork.hasError()?'error':ready?'ready':'loading');
        if(ready&&!reduced.matches&&!latest.current.reducedMotion&&!latest.current.paused)frame=requestAnimationFrame(render);
      };
      const artwork=new SceneArt(start);art.current=artwork;restart.current=start;
      const resize=()=>{
        const rect=element.getBoundingClientRect(),ratio=lowPerformance?1:Math.max(1,Math.min(2,window.devicePixelRatio||1));
        if(rect.width<=0||rect.height<=0||(rect.width===width&&rect.height===height&&ratio===pixelRatio))return;
        width=rect.width;height=rect.height;pixelRatio=ratio;
        // Preserve sprite detail at display resolution; performance mode still keeps one pixel per CSS pixel.
        element.width=Math.ceil(width*ratio);element.height=Math.ceil(height*ratio);
        ctx.setTransform(element.width/width,0,0,element.height/height,0,0);start();
      };
      const observer=new ResizeObserver(resize);observer.observe(element);
      const intersection=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);start();});intersection.observe(element);
      document.addEventListener('visibilitychange',start);reduced.addEventListener('change',start);window.addEventListener('resize',resize);
      artwork.select(fileRef.current);resize();
      return ()=>{
        stopped=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();artwork.dispose();art.current=undefined;restart.current=()=>{};
        document.removeEventListener('visibilitychange',start);reduced.removeEventListener('change',start);window.removeEventListener('resize',resize);
      };
    },[lowPerformance,quiet]);
    return <><canvas ref={canvas} aria-label={`${region(location).name}的像素码头${guest?'与岸边来客':''}`} role="img" data-scene-state={artState}/>
      {artState!=='ready'&&<div className="dsh-fisher-scene-loading" role="status"><span>{artState==='error'?'部分海岸插图暂时没有展开':'正在展开海岸…'}</span>
        {artState==='error'&&<button onClick={()=>{art.current?.select(fileRef.current,true);setArtState('loading');}}>重新加载画面</button>}</div>}</>;
  };
}
