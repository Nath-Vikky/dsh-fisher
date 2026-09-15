import type * as ReactTypes from 'react';
import type {WorldProps} from './contracts.ts';
import {CoastWorld} from './renderer.ts';
import type {WorldState} from './renderer.ts';
import {PLACES} from './map.ts';

export function createWorld(React:typeof ReactTypes){
  return function World(props:WorldProps){
    const canvas=React.useRef<HTMLCanvasElement>(null),host=React.useRef<CoastWorld>(),latest=React.useRef(props);latest.current=props;
    const [state,setState]=React.useState<WorldState>({near:null,walking:false,destination:null,spot:'pier',ready:false});
    const [error,setError]=React.useState(false),[attempt,setAttempt]=React.useState(0),[knob,setKnob]=React.useState({x:0,y:0});
    const drag=React.useRef<number|null>(null),keys=React.useRef(new Set<string>());
    const locked=props.blocked||!!props.data.active||!!props.data.pending||props.data.autoFishing.enabled||props.overlay;
    const reset=()=>{keys.current.clear();drag.current=null;setKnob({x:0,y:0});host.current?.setInput(0,0);};
    React.useEffect(()=>{
      let disposed=false,runtime:CoastWorld|undefined;
      setError(false);setState(s=>({...s,ready:false}));
      const timer=setTimeout(()=>{
        if(disposed||!canvas.current)return;
        try{runtime=new CoastWorld(canvas.current,latest.current,value=>{if(!disposed)setState(value);},()=>{if(!disposed)setError(true);});host.current=runtime;
          void runtime.prepare().catch(()=>{runtime?.dispose();if(!disposed)setError(true);});
        }catch{runtime?.dispose();if(!disposed)setError(true);}
      },0);
      return ()=>{disposed=true;clearTimeout(timer);runtime?.dispose();host.current=undefined;};
    },[props.data.saveId,attempt]);
    React.useEffect(()=>{host.current?.update(props);if(locked)reset();},[props]);
    React.useEffect(()=>{const cancel=()=>reset();window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',cancel);return ()=>{window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',cancel);};},[]);
    const key=(event:ReactTypes.KeyboardEvent,pressed:boolean)=>{
      const code=event.code;if(!['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code)||event.altKey||event.ctrlKey||event.metaKey)return;
      if(event.target instanceof HTMLElement&&event.target.matches('input,textarea,select'))return;
      event.preventDefault();event.stopPropagation();if(pressed)keys.current.add(code);else keys.current.delete(code);
      const has=(a:string,b:string)=>keys.current.has(a)||keys.current.has(b),x=Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft')),y=Number(has('KeyS','ArrowDown'))-Number(has('KeyW','ArrowUp'));
      host.current?.setInput(x,y);setKnob({x:x*23,y:y*23});
    };
    const pointer=(event:ReactTypes.PointerEvent<HTMLButtonElement>)=>{
      if(drag.current!==event.pointerId)return;const rect=event.currentTarget.getBoundingClientRect(),dx=event.clientX-rect.left-rect.width/2,dy=event.clientY-rect.top-rect.height/2,length=Math.hypot(dx,dy),scale=Math.min(1,29/Math.max(1,length));
      setKnob({x:dx*scale,y:dy*scale});host.current?.setInput(dx/29,dy/29);
    };
    const finish=(event:ReactTypes.PointerEvent<HTMLButtonElement>)=>{if(drag.current!==event.pointerId)return;reset();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);};
    const fish=()=>{if(host.current?.dock())props.onFish();};
    return <div className="dsh-fisher-world" onKeyDown={event=>key(event,true)} onKeyUp={event=>key(event,false)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))reset();}}>
      <canvas key={attempt} ref={canvas} tabIndex={0} role="img" aria-label="可以走动的摸鱼塘海岸，使用摇杆或方向键移动" onPointerDown={event=>event.currentTarget.focus()} data-render-state="loading"/>
      <div className="dsh-fisher-world-title"><span>摸鱼塘 · 海岸漫步</span><small>{state.destination?`正在前往${PLACES[state.destination].name}`:props.data.autoFishing.enabled?'托管在岸边':props.data.active?'这一竿，慢慢来':'风从海面吹过来'}</small></div>
      {!locked&&state.ready&&!error&&<><div className="dsh-fisher-world-waypoints" aria-label="海岸导航">
        <button onClick={()=>host.current?.go('pier')}>木栈桥</button><button onClick={()=>host.current?.go('cove')}>浅湾</button>{props.data.life.visitor&&<button onClick={()=>host.current?.go('guest')}>来客</button>}
      </div><div className="dsh-fisher-joystick-wrap"><button className="dsh-fisher-joystick" aria-label="移动摇杆" title="鼠标按住拖动，也可用方向键或 WASD"
        onPointerDown={event=>{if(!event.isPrimary||event.button!==0)return;drag.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.focus();pointer(event);}}
        onPointerMove={pointer} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}><span style={{transform:`translate(${knob.x}px,${knob.y}px)`}}/><i aria-hidden="true">＋</i></button><small>拖动摇杆 · 走向海边</small></div>
        <div className="dsh-fisher-world-interaction" aria-live="polite">{state.near==='guest'?<><small>岸边来客</small><button className="dsh-fisher-primary" onClick={props.onGuest}>交谈</button></>:state.near?<><small>{PLACES[state.near].name}</small><button className="dsh-fisher-primary" onClick={fish}>在这里钓鱼</button><button onClick={props.onGear}>整理装备</button></>:<span>靠近钓点或来客<br/>就能展开互动</span>}</div>
      </>}
      {(!state.ready||error)&&<div className="dsh-fisher-world-loading" role="status"><span className="dsh-fisher-world-loading-mark">≈</span><strong>{error?'海岸暂时没有展开':'正在准备海岸'}</strong><small>{error?'可以重试，或使用轻量画面继续。':'整理小屋、码头与光线…'}</small>{error&&<><button onClick={()=>setAttempt(v=>v+1)}>重新展开</button><button onClick={props.onFallback}>使用轻量画面</button></>}</div>}
    </div>;
  };
}
