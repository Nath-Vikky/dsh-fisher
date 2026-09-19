import type * as ReactTypes from 'react';
import type {WorldProps} from './contracts.ts';
import {CoastWorld} from './renderer.ts';
import type {WorldState} from './renderer.ts';
import {COASTS} from './regions.ts';
import {waterClue,shoreVisitor} from '../../game/shore.ts';
import {currentTide} from '../../game/progression.ts';
import {createCoastIcon} from '../coast-icons.tsx';
import {FACILITY_NAMES,isFacility,memorialBuilt} from './facilities.ts';
import type {DestinationId} from './facilities.ts';

export function createWorld(React:typeof ReactTypes){
  const Icon=createCoastIcon(React);
  return function World(props:WorldProps){
    const coast=COASTS[props.data.journey.region],PLACES=coast.places;
    const placeName=(id:DestinationId)=>isFacility(id)?FACILITY_NAMES[id]:PLACES[id].name;
    const visitor=props.data.adventures.picnic?.region===coast.id?props.data.adventures.picnic.guest:shoreVisitor(props.data.shore,coast.id,props.data.life.visitor);
    const destinations:DestinationId[]=['pier','cove',...(visitor?['guest' as const]:[]),'aquarium','shelf','seat',...(memorialBuilt(props.data)?['memorial' as const]:[])];
    const canvas=React.useRef<HTMLCanvasElement>(null),host=React.useRef<CoastWorld>(),latest=React.useRef(props);latest.current=props;
    const [state,setState]=React.useState<WorldState>({near:null,walking:false,destination:null,spot:'pier',ready:false,guestActivity:'在岸边等你'});
    const [error,setError]=React.useState(false),[attempt,setAttempt]=React.useState(0);
    const [stick,setStick]=React.useState<{left:number;top:number;x:number;y:number}|null>(null),[hasDragged,setHasDragged]=React.useState(false);
    const [navigation,setNavigation]=React.useState(false);
    const drag=React.useRef<{id:number;x:number;y:number;active:boolean}|null>(null),keys=React.useRef(new Set<string>());
    const locked=props.blocked||!!props.data.active||!!props.data.pending||props.data.autoFishing.enabled||props.overlay;
    const reset=()=>{const pointer=drag.current;drag.current=null;keys.current.clear();setStick(null);host.current?.setInput(0,0);if(pointer&&canvas.current?.hasPointerCapture(pointer.id))canvas.current.releasePointerCapture(pointer.id);};
    React.useEffect(()=>{
      let disposed=false,runtime:CoastWorld|undefined;
      setError(false);setState(s=>({...s,ready:false}));
      const timer=setTimeout(()=>{
        if(disposed||!canvas.current)return;
        try{runtime=new CoastWorld(canvas.current,latest.current,value=>{if(!disposed)setState(value);},()=>{if(!disposed)setError(true);});host.current=runtime;
          void runtime.prepare().catch(error=>{if(canvas.current)canvas.current.dataset.loadError=error instanceof Error?error.message:'Scene preparation failed';runtime?.dispose();if(!disposed)setError(true);});
        }catch(error){if(canvas.current)canvas.current.dataset.loadError=error instanceof Error?error.message:'Scene initialization failed';runtime?.dispose();if(!disposed)setError(true);}
      },0);
      return ()=>{disposed=true;clearTimeout(timer);runtime?.dispose();host.current=undefined;};
    },[props.data.saveId,props.data.journey.region,attempt]);
    React.useEffect(()=>{host.current?.update(props);if(locked)reset();},[props]);
    React.useEffect(()=>{const cancel=()=>reset(),resize=new ResizeObserver(()=>{if(drag.current)reset();});if(canvas.current)resize.observe(canvas.current);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',cancel);return ()=>{resize.disconnect();window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',cancel);};},[]);
    const key=(event:ReactTypes.KeyboardEvent,pressed:boolean)=>{
      const code=event.code;if(!['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code)||event.altKey||event.ctrlKey||event.metaKey)return;
      if(locked||!state.ready||error||event.target instanceof HTMLElement&&event.target.matches('input,textarea,select'))return;
      event.preventDefault();event.stopPropagation();if(pressed)keys.current.add(code);else keys.current.delete(code);
      const has=(a:string,b:string)=>keys.current.has(a)||keys.current.has(b),x=Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft')),y=Number(has('KeyS','ArrowDown'))-Number(has('KeyW','ArrowUp'));
      host.current?.setInput(x,y);
    };
    const begin=(event:ReactTypes.PointerEvent<HTMLCanvasElement>)=>{
      if(locked||!state.ready||error||!event.isPrimary||event.button!==0||drag.current)return;
      event.preventDefault();event.currentTarget.focus({preventScroll:true});keys.current.clear();host.current?.setInput(0,0);
      drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,active:false};event.currentTarget.setPointerCapture(event.pointerId);
    };
    const pointer=(event:ReactTypes.PointerEvent<HTMLCanvasElement>)=>{
      const gesture=drag.current;if(!gesture||gesture.id!==event.pointerId)return;
      if(locked||event.pointerType==='mouse'&&event.buttons===0){reset();return;}
      const rect=event.currentTarget.getBoundingClientRect(),sx=event.currentTarget.clientWidth/rect.width,sy=event.currentTarget.clientHeight/rect.height;
      const dx=(event.clientX-gesture.x)*sx,dy=(event.clientY-gesture.y)*sy,length=Math.hypot(dx,dy);
      if(!gesture.active&&length<8)return;
      gesture.active=true;event.preventDefault();setHasDragged(true);setNavigation(false);
      const scale=Math.min(1,29/Math.max(1,length)),clamp=(value:number,size:number)=>Math.max(48,Math.min(size-48,value));
      setStick({left:clamp((gesture.x-rect.left)*sx,event.currentTarget.clientWidth),top:clamp((gesture.y-rect.top)*sy,event.currentTarget.clientHeight),x:dx*scale,y:dy*scale});
      host.current?.setInput(dx/29,dy/29);
    };
    const finish=(event:ReactTypes.PointerEvent<HTMLCanvasElement>)=>{if(drag.current?.id===event.pointerId)reset();};
    const fish=()=>{const spot=host.current?.dock();if(spot)props.onFish(spot);};
    return <div className="dsh-fisher-world" data-steering={!!stick} onKeyDown={event=>key(event,true)} onKeyUp={event=>key(event,false)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))reset();}}>
      <canvas key={`${coast.id}:${attempt}`} ref={canvas} tabIndex={0} role="img" aria-label={`可以走动的${coast.name}海岸，拖动空白处或用方向键、WASD移动`} data-steerable={!locked&&state.ready&&!error} onPointerDown={begin} onPointerMove={pointer} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} data-render-state="loading"/>
      {!locked&&state.ready&&!error&&<><div className="dsh-fisher-world-waypoints" aria-label="海岸导航">
        {navigation&&<div className="dsh-fisher-world-destinations">{destinations.map(id=><button key={id} onClick={()=>{host.current?.go(id);setNavigation(false);}}>{placeName(id)}</button>)}</div>}
        <button className="dsh-fisher-navigation-button" aria-expanded={navigation} onClick={()=>setNavigation(value=>!value)}><Icon name="compass"/><span>{state.destination?`前往${placeName(state.destination)}`:'去哪里'}</span></button>
      </div>{stick&&<div className="dsh-fisher-floating-stick" aria-hidden="true" style={{left:stick.left,top:stick.top}}><span style={{transform:`translate(${stick.x}px,${stick.y}px)`}}>＋</span></div>}
        {!hasDragged&&<span className="dsh-fisher-move-hint">拖动空白处移动</span>}
        <div className="dsh-fisher-world-interaction" aria-live="polite">{state.near&&isFacility(state.near)?<button className="dsh-fisher-primary" onClick={()=>{if(state.near&&isFacility(state.near))props.onFacility(state.near);}}><Icon name="note"/><span>{state.near==='seat'?'在这里歇一会儿':`看看${FACILITY_NAMES[state.near]}`}</span><small>收藏与岸边生活</small></button>:state.near==='guest'?<button className="dsh-fisher-primary" onClick={props.onGuest}><Icon name="note"/><span>交谈</span><small>{state.guestActivity}</small></button>:state.near?<button className="dsh-fisher-primary" onClick={fish}><Icon name="fish"/><span>在这里钓鱼</span><small>{PLACES[state.near].name}{` · ${waterClue(state.near,currentTide(props.data.journey),coast.id).title}`}</small></button>:null}</div>
      </>}
      {(!state.ready||error)&&<div className="dsh-fisher-world-loading" role="status"><span className="dsh-fisher-world-loading-mark">≈</span><strong>{error?'海岸暂时没有展开':'正在准备海岸'}</strong><small>{error?'可以重试，或使用轻量画面继续。':'整理小屋、码头与光线…'}</small>{error&&<><button onClick={()=>setAttempt(v=>v+1)}>重新展开</button><button onClick={props.onFallback}>使用轻量画面</button></>}</div>}
    </div>;
  };
}
