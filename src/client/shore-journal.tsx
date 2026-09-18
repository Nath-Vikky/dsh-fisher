import type * as ReactTypes from 'react';
import type { Bootstrap } from '../protocol.ts';
import type { GameController } from './controller.ts';
import { buildingFish,SHORE_STORY } from '../game/shore.ts';
import { displayed } from '../game/goals.ts';
import { species } from '../game/content.ts';
import { createPager } from './compact-ui.tsx';

export const BOTTLE_CONVERSATION = [
  {speaker:'guest',text:'这张草图上的三道短线，是老码头的木桩。有人把报平安的铃声，寄给了很久以后的我们。'},
  {speaker:'player',text:'那就去木栈桥找找吧。要是铃铛还在，我们把它重新挂起来。'},
  {speaker:'guest',text:'把鱼线送到栈桥尽头的气泡附近。收回一竿时留意水下的旧绳结，别着急，我已经把位置记在你的岸边故事里。'},
] as const;

export function createShoreJournal(React:typeof ReactTypes){
  const Pager=createPager(React);
  return function ShoreJournal({data,controller,disabled,onRead,onFish}:{data:Bootstrap;controller:GameController;disabled:boolean;onRead:()=>void;onFish:()=>void}){
    const [selected,setSelected]=React.useState<string|null>(null),[confirmed,setConfirmed]=React.useState(false),[page,setPage]=React.useState(0);
    const shore=data.shore,story=SHORE_STORY[shore.story],local=data.journey.region==='L01';
    const candidates=data.inventory.filter(item=>buildingFish(item)&&!item.locked&&!displayed(data,item.id));
    const item=candidates.find(item=>item.id===selected),protectedItem=item&&(item.isNew||item.isNewVariant||item.isRecord);
    const count=Math.ceil(candidates.length/4),current=Math.min(page,Math.max(0,count-1));
    return <div className="dsh-fisher-shore-journal">
      <div className="dsh-fisher-story-mark" aria-hidden="true">{shore.story==='built'?'♬':'✉'}</div>
      <h3>{story.title}</h3><p>{story.detail}</p><p className="dsh-fisher-shore-next">{story.next}</p>
      {!local&&<p>这段故事发生在摸鱼塘，去码头切换海岸后可以继续。</p>}
      {shore.story==='quiet'&&<small>浅湾收获 {shore.searched}/2 · 手动与自动都计入</small>}
      {shore.story==='bottle'&&<button className="dsh-fisher-primary" disabled={disabled||!local} onClick={onRead}>请贝邮解读</button>}
      {(shore.story==='quiet'||shore.story==='charted')&&<button disabled={disabled||!local} onClick={onFish}>回到岸边找一找</button>}
      {shore.story==='recovered'&&<><p>木料 {shore.timber}/2 · 修建需要30壳币（持有 {data.coins}）</p>
        {shore.timber<2&&<><p className="dsh-fisher-muted">捐赠会消耗选中的鱼，图鉴保留；上锁、展示中或特殊外观的鱼不会列出。</p>
          <div className="dsh-fisher-donation-list">{candidates.slice(current*4,current*4+4).map(fish=><button key={fish.id} disabled={disabled} aria-pressed={selected===fish.id} onClick={()=>{setSelected(fish.id);setConfirmed(false);}}>{species(fish.speciesId).name} · {(fish.lengthMm!/10).toFixed(1)} cm{fish.isNew?' · 首次':fish.isRecord?' · 纪录':''}</button>)}</div>
          {!candidates.length&&<p>背包还没有可捐的原色普通鱼。浅湾比较容易钓到。</p>}
          <Pager page={current} count={count} onChange={setPage}/>
          {protectedItem&&<label className="dsh-fisher-toggle"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>确认捐出这条首次／纪录个体</label>}
          <button disabled={disabled||!item||!!protectedItem&&!confirmed} onClick={()=>{if(item)void controller.action({type:'shore.donate',catchId:item.id,confirmed});}}>捐出选中的鱼 · 换1份木料</button>
        </>}
        <button className="dsh-fisher-primary" disabled={disabled||!local||shore.timber<2||data.coins<30} onClick={()=>void controller.action({type:'shore.build'})}>修好岸边风铃架 · 30壳币</button>
      </>}
      {shore.story==='built'&&<button onClick={onFish}>去看看风铃架</button>}
      <small>线索不会过期，未完成的部分下次接着来。</small>
      {controller.getSnapshot().error&&<p role="alert">{controller.getSnapshot().error}</p>}
    </div>;
  };
}
