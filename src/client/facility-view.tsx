import type * as ReactTypes from 'react';
import type {Bootstrap} from '../protocol.ts';
import {species,region} from '../game/content.ts';
import type {SpeciesId,Variant} from '../game/content.ts';
import {REGIONAL_STORIES} from '../game/regional-stories.ts';
import {currentTide,TIDE_NAMES} from '../game/progression.ts';
import {decor} from '../game/decor.ts';
import type {FacilityId} from './world/facilities.ts';
import {createPager} from './compact-ui.tsx';

export function createFacilityView(React:typeof ReactTypes,Art:ReactTypes.ComponentType<{id:SpeciesId;variant?:Variant|null}>){
  const Pager=createPager(React);
  return function Facility({id,data,onManage,onTalk,onStories,onAdventure}:{id:FacilityId;data:Bootstrap;onManage:(area:'aquarium'|'shelf'|'decor')=>void;onTalk:()=>void;onStories:()=>void;onAdventure:(area:'picnic'|'memory')=>void}){
    const [page,setPage]=React.useState(0),[selected,setSelected]=React.useState<SpeciesId|null>(null);
    const entries=id==='aquarium'?data.life.aquarium.flatMap(key=>{const item=data.inventory.find(item=>item.id===key);return item?[{id:item.speciesId,variant:item.variant}]:[];}):data.life.shelf.flatMap(item=>{if(item?.kind==='relic')return [{id:item.id,variant:null}];const caught=item?.kind==='catch'?data.inventory.find(c=>c.id===item.id):null;return caught?[{id:caught.speciesId,variant:caught.variant}]:[];});
    const location=data.journey.region,state=location==='L01'?null:data.shore.regions[location];
    const memorial=location==='L01'?'岸边风铃':state?.choice?REGIONAL_STORIES[location].branches[state.choice].name:'岸边纪念';
    return <section className="dsh-fisher-facility-view">
      {id==='aquarium'||id==='shelf'?<><p>{id==='aquarium'?'把喜欢的相遇留在一片小水里。':'每一件纪念都有自己的来路。'} · {entries.length} 件</p>
        <div className="dsh-fisher-menu-grid">{entries.slice(page*4,page*4+4).map((item,i)=><button key={`${item.id}:${i}`} aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}><Art {...item}/><strong>{species(item.id).name}</strong></button>)}</div>
        {!entries.length&&<p>这里还空着，挑一件喜欢的收藏放进来吧。</p>}
        {selected&&<p className="dsh-fisher-dialogue">{species(selected).description}</p>}
        <Pager page={page} count={Math.ceil(entries.length/4)} onChange={value=>{setPage(value);setSelected(null);}}/>
        <button className="dsh-fisher-primary" onClick={()=>onManage(id)}>{id==='aquarium'?'布置这片小水':'整理陈列架'}</button></>:id==='seat'?<>
          <small>{region(location).name} · {TIDE_NAMES[currentTide(data.journey)]}</small>
          <h3>{data.life.decor.seat?decor(data.life.decor.seat).name:'海岸长椅'}</h3>
          <p className="dsh-fisher-dialogue">{({L01:'风铃和芦苇都慢了下来。留一点时间，看看刚刚钓过的水面。',L02:'海风把贝壳吹得轻轻碰在一起。今天的热闹，可以坐下来慢慢听。',L03:'月光落在池水上。没有新的任务，也可以在这里多待一会儿。',L04:'远处的灯塔转过来，又转过去。下一次出海之前，先歇一会儿。'})[location]}</p>
          <div className="dsh-fisher-actions">{data.life.visitor&&<button onClick={onTalk}>和来客聊聊</button>}<button onClick={()=>onManage('decor')}>换一张喜欢的座椅</button></div>
          <button className="dsh-fisher-primary" onClick={()=>onAdventure('picnic')}>{data.adventures.picnic?'赴一场野餐':'准备岸边野餐'}</button>
        </>:<><small>我们留在岸边的变化</small><h3>{memorial}</h3><p className="dsh-fisher-dialogue">{location==='L01'?'风经过时，旧铃铛终于又响了。这段来自瓶中信的故事，现在也成了你的海岸记忆。':`${REGIONAL_STORIES[location].title}留在了这里。${state?.choice==='near'?'靠近岸边的小小发现，也能照亮一段归途。':'那次走向更远水面的决定，让这里有了新的模样。'}`}</p><button onClick={onStories}>翻开这段岸边故事</button></>}
      {id==='memorial'&&<button className="dsh-fisher-primary" onClick={()=>onAdventure('memory')}>为这里留一封信或一盏灯</button>}
    </section>;
  };
}
