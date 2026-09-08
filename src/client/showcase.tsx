import type * as ReactTypes from 'react';
import type { Bootstrap } from '../protocol.ts';
import { species,spriteName } from '../game/content.ts';
import { DECOR_ART } from '../game/visuals.ts';
import { thumbnailAsset } from '../game/art.ts';
import { SceneArt,drawSprite } from './scene-art.ts';

export function createShowcase(React:typeof ReactTypes) {
  return function Showcase({data,reducedMotion=false,lowPerformance=false}:{data:Bootstrap;reducedMotion?:boolean;lowPerformance?:boolean}) {
    const canvas=React.useRef<HTMLCanvasElement>(null),art=React.useRef<SceneArt>();
    const redraw=React.useRef<()=>void>(()=>{}),[error,setError]=React.useState(false);
    const caught=data.life.aquarium.map(id=>data.inventory.find(item=>item.id===id));
    const shelf=data.life.shelf.map(entry=>entry?.kind==='relic'?entry.id:entry?.kind==='catch'?data.inventory.find(item=>item.id===entry.id)?.speciesId:undefined);
    const background=data.life.decor.background?DECOR_ART[data.life.decor.background]:undefined;
    const cabinet=data.life.decor.shelf?DECOR_ART[data.life.decor.shelf]:undefined;
    const fishFiles=caught.map(item=>item?spriteName(item.speciesId,item.variant):undefined);
    const shelfFiles=data.life.shelf.map(entry=>{
      if(entry?.kind==='relic')return spriteName(entry.id);
      const item=entry?.kind==='catch'?data.inventory.find(caught=>caught.id===entry.id):undefined;
      return item?spriteName(item.speciesId,item.variant):undefined;
    });
    const files=[background,cabinet,...[...fishFiles,...shelfFiles].map(file=>file?thumbnailAsset(file):undefined)].filter((file):file is string=>!!file);
    const key=files.join('|'),latest=React.useRef({caught,fishFiles,shelfFiles,background,cabinet,files,reducedMotion,lowPerformance});
    latest.current={caught,fishFiles,shelfFiles,background,cabinet,files,reducedMotion,lowPerformance};
    React.useEffect(()=>{art.current?.select(latest.current.files);redraw.current();},[key,reducedMotion,lowPerformance,data.revision]);
    React.useEffect(()=>{
      const element=canvas.current,ctx=element?.getContext('2d',{alpha:false});if(!element||!ctx)return;
      let frame=0,last=0,elapsed=0,width=320,visible=true,stopped=false;
      const reduced=matchMedia('(prefers-reduced-motion: reduce)');
      const draw=()=>{
        const state=latest.current,time=reduced.matches||state.reducedMotion?0:elapsed;
        ctx.imageSmoothingEnabled=false;ctx.fillStyle='#f4efdb';ctx.fillRect(0,0,width,340);
        ctx.fillStyle='#afd3c6';ctx.fillRect(9,10,width-18,176);ctx.strokeStyle='#293f46';ctx.lineWidth=1;ctx.strokeRect(9,10,width-18,176);
        const backdrop=artwork.get(state.background);
        if(backdrop)ctx.drawImage(backdrop,-7,-64,width+14,320);
        for(let index=0;index<8;index++) {
          const item=state.caught[index],file=state.fishFiles[index];if(!item||!file)continue;
          const def=species(item.speciesId),quality=(item.lengthMm??def.mode??100)/(def.mode??100);
          const size=Math.min(68,Math.max(28,40*Math.sqrt(quality)));
          const movement=state.lowPerformance&&index>=4?0:time;
          const x=80+(index%4)*(width-160)/3+Math.sin(movement*.32+index)*Math.min(7,width*.02);
          const y=84+Math.floor(index/4)*72+Math.sin(movement*.5+index)*4;
          drawSprite(ctx,artwork.get(thumbnailAsset(file)),x,y,size,size,index%2===1);
        }
        ctx.fillStyle='#f4efdb';for(let index=0;index<4;index++)ctx.fillRect(25+index*(width-70)/4,19,16,2);
        ctx.fillStyle='#e8d3ac';ctx.fillRect(9,204,width-18,126);ctx.strokeRect(9,204,width-18,126);
        const cabinet=artwork.get(state.cabinet);
        if(cabinet)ctx.drawImage(cabinet,-width*.06,173,width*1.12,174);
        else {ctx.beginPath();ctx.moveTo(14,261);ctx.lineTo(width-14,261);ctx.moveTo(14,320);ctx.lineTo(width-14,320);ctx.stroke();}
        for(let index=0;index<6;index++) {
          const file=state.shelfFiles[index];if(!file)continue;
          drawSprite(ctx,artwork.get(thumbnailAsset(file)),width*(.19+(index%3)*.31),258+Math.floor(index/3)*60,50,48);
        }
      };
      const render=(now:number)=>{
        if(stopped||!visible||document.hidden)return;
        if(now-last>=100){elapsed+=Math.min(100,now-last)/1000;last=now;draw();}
        frame=requestAnimationFrame(render);
      };
      const start=()=>{
        cancelAnimationFrame(frame);if(stopped||!visible||document.hidden)return;
        last=performance.now();draw();setError(artwork.hasError());
        if(!reduced.matches&&!latest.current.reducedMotion)frame=requestAnimationFrame(render);
      };
      const artwork=new SceneArt(start);art.current=artwork;redraw.current=start;
      const resize=new ResizeObserver(()=>{
        const rect=element.getBoundingClientRect();width=rect.width;
        element.width=Math.max(1,Math.round(width));element.height=340;start();
      });resize.observe(element);
      const intersection=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);start();});intersection.observe(element);
      document.addEventListener('visibilitychange',start);reduced.addEventListener('change',start);artwork.select(latest.current.files);start();
      return ()=>{
        stopped=true;cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();artwork.dispose();art.current=undefined;redraw.current=()=>{};
        document.removeEventListener('visibilitychange',start);reduced.removeEventListener('change',start);
      };
    },[]);
    return <figure className="dsh-fisher-showcase"><canvas ref={canvas} role="img" aria-label={`鱼缸展示 ${caught.filter(Boolean).map(item=>species(item!.speciesId).name).join('、')||'尚未摆放'}；陈列架展示 ${shelf.filter(Boolean).map(id=>species(id!).name).join('、')||'尚未摆放'}`}/>
      <figcaption>上方鱼缸 · 下方陈列架<br/>缩尺标本展示，大小经过调整以便一同欣赏。</figcaption>
      {error&&<button onClick={()=>{art.current?.select(latest.current.files,true);setError(false);}}>重新加载展示插图</button>}</figure>;
  };
}
