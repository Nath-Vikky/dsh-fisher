import type * as ReactTypes from 'react';
import {API,VERSION} from '../protocol.ts';
import type {WorldProps} from './world/contracts.ts';
export function createWorldView(React:typeof ReactTypes){
  let loading:Promise<{default:ReactTypes.ComponentType<WorldProps>}>|undefined;
  const load=()=>loading??=(async()=>{
    const loaded:unknown=await import(/* @vite-ignore */ `${API}/client/world.js?v=${encodeURIComponent(VERSION)}`);
    if(!loaded||typeof loaded!=='object'||!('createWorld' in loaded)||typeof loaded.createWorld!=='function')throw new Error('World module unavailable');
    return {default:loaded.createWorld(React) as ReactTypes.ComponentType<WorldProps>};
  })().catch(error=>{loading=undefined;throw error;});
  class Boundary extends React.Component<{children:ReactTypes.ReactNode;onFallback:()=>void;retry:()=>void},{failed:boolean}>{
    state={failed:false};static getDerivedStateFromError(){return {failed:true};}
    render(){return this.state.failed?<div className="dsh-fisher-world-loading" role="status"><strong>海岸还没有展开</strong><p>可以重试，或先用轻量画面继续钓鱼。</p><button onClick={this.props.retry}>重新展开</button><button onClick={this.props.onFallback}>使用轻量画面</button></div>:this.props.children;}
  }
  return function WorldView(props:WorldProps){
    const [attempt,setAttempt]=React.useState(0),World=React.useMemo(()=>React.lazy(load),[attempt]);
    return <Boundary key={attempt} onFallback={props.onFallback} retry={()=>setAttempt(v=>v+1)}><React.Suspense fallback={<div className="dsh-fisher-world-loading" role="status"><span className="dsh-fisher-world-loading-mark">≈</span><strong>正在展开海岸</strong><small>准备场景与行囊…</small></div>}><World {...props}/></React.Suspense></Boundary>;
  };
}
