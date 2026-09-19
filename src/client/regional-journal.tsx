import type * as ReactTypes from 'react';
import type {Bootstrap} from '../protocol.ts';
import type {GameController} from './controller.ts';
import {REGIONAL_STORIES} from '../game/regional-stories.ts';
import type {StoryRegion,StoryChoice} from '../game/regional-stories.ts';
import {guest} from '../game/guests.ts';
import {COASTS} from './world/regions.ts';
export function createRegionalJournal(React:typeof ReactTypes){
  return function RegionalJournal({data,controller,disabled,onRead,onFish}:{data:Bootstrap;controller:GameController;disabled:boolean;onRead:()=>void;onFish:()=>void}){
    const region=data.journey.region as StoryRegion,def=REGIONAL_STORIES[region],state=data.shore.regions[region],branch=state.choice?def.branches[state.choice]:null;
    const [changing,setChanging]=React.useState(false);
    const choose=(choice:StoryChoice)=>{void controller.action({type:'shore.choose',choice}).then(()=>setChanging(false));};
    return <><h3>{def.title}</h3><p>{state.stage==='quiet'?def.clue:state.stage==='built'?`${branch!.name}留在了岸边。这段海岸记忆会一直保存。`:def.opening}</p>
      {state.stage==='quiet'&&<><p>在{COASTS[region].places[def.discovery].name}成功收获 {state.found}/2</p><button onClick={onFish}>回到岸边寻找</button></>}
      {state.stage==='found'&&<button onClick={onRead}>听{guest(def.guest).name}说说</button>}
      {(state.stage==='found'||state.stage==='seeking'&&changing)&&<div className="dsh-fisher-story-routes" aria-label="选择故事路线">{(['near','far'] as const).map(choice=><button key={choice} aria-pressed={state.choice===choice} disabled={disabled||!!data.active||!!data.pending} onClick={()=>choose(choice)}><strong>{def.branches[choice].name}</strong><span>{def.branches[choice].detail}</span></button>)}{changing&&<small>更换路线会清空当前路线探索进度，已收获物品保留。</small>}</div>}
      {state.stage==='seeking'&&branch&&<><p className="dsh-fisher-shore-next">{branch.detail}</p><p>{branch.name} · {state.progress}/{branch.need}{branch.kind==='tour'&&state.spots.length?` · 已走过${state.spots.map(spot=>COASTS[region].places[spot].name).join('、')}`:''}</p><button className="dsh-fisher-primary" onClick={onFish}>回到岸边继续</button><button onClick={()=>setChanging(value=>!value)}>{changing?'保留当前路线':'看看另一条路线'}</button></>}
      {state.stage==='ready'&&<><p>{branch!.name}的材料已备齐 · 壳币 {data.coins}/{def.cost}</p><button className="dsh-fisher-primary" disabled={disabled||data.coins<def.cost} onClick={()=>void controller.action({type:'shore.build'})}>布置{branch!.name} · {def.cost}壳币</button></>}
      {state.stage==='built'&&<button onClick={onFish}>去看看岸边的纪念</button>}
      <small>手动与自动都能探索。故事材料单独记录，不消耗背包渔获；最后布置才花壳币。</small>
    </>;
  };
}
