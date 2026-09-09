import type * as ReactTypes from 'react';
import type { Bootstrap } from '../protocol.ts';
import type { Catch } from '../game/engine.ts';
import { species,VARIANT_NAMES,spriteName } from '../game/content.ts';
import { API } from '../protocol.ts';
import { thumbnailAsset } from '../game/art.ts';
import type { SpeciesId,Variant } from '../game/content.ts';
import { displayed } from '../game/goals.ts';
import type { GameController } from './controller.ts';
import { createDialog } from './dialog.tsx';
import { createCardButton } from './card-button.tsx';
import { createHelp,createPager } from './compact-ui.tsx';

export function createInventoryView(React:typeof ReactTypes,FishArt:ReactTypes.ComponentType<{id:SpeciesId;variant?:Variant|null;large?:boolean}>) {
  const Dialog=createDialog(React),CardButton=createCardButton(React),Help=createHelp(React),Pager=createPager(React);
  return function Inventory({data,controller,blocked,onFish,onResolve}:{data:Bootstrap;controller:GameController;blocked:boolean;onFish:()=>void;onResolve:(item:Catch,choice:'sell'|'release')=>void}) {
    const [selected,setSelected]=React.useState<string|null>(null),[page,setPage]=React.useState(0);
    const tidy=data.inventory.filter(item=>!item.locked&&!item.isNew&&!item.isRecord&&!item.isNewVariant&&!displayed(data,item.id));
    const item=data.inventory.find(item=>item.id===selected),pages=Math.max(1,Math.ceil(data.inventory.length/4)),current=Math.min(page,pages-1);
    return <section className="dsh-fisher-collection dsh-fisher-inventory" aria-label="收获背包">
      <div className="dsh-fisher-collection-intro"><div className="dsh-fisher-card-heading"><h3>带回来的小小纪念</h3><Help label="背包整理说明"><p>批量处理会保留新发现、首次外观、纪录、锁定和展示中的个体。再放流或回收 {5-data.journey.releaseProgress} 次可得1潮汐碎片；收藏详情里可保存收获卡。</p></Help></div><small>{data.inventory.length} / 240 格</small></div>
      {!!data.inventory.length&&<div className="dsh-fisher-actions"><button disabled={blocked||!tidy.length} onClick={()=>void controller.action({type:'inventory.batch',catchIds:tidy.map(item=>item.id),choice:'sell'})}>出售普通收获 {tidy.length}</button><button disabled={blocked||!tidy.length} onClick={()=>void controller.action({type:'inventory.batch',catchIds:tidy.map(item=>item.id),choice:'release'})}>放流／回收 {tidy.length}</button></div>}
      {!data.inventory.length&&<div className="dsh-fisher-empty"><span aria-hidden="true">≈</span><p>背包里还装着海风。</p><button onClick={onFish}>去钓一竿</button></div>}
      <div className="dsh-fisher-catalog-grid">{data.inventory.slice(current*4,current*4+4).map(entry=><button key={entry.id} className="dsh-fisher-inventory-item" aria-haspopup="dialog" onClick={()=>setSelected(entry.id)}><img className="dsh-fisher-catalog-thumbnail" src={`${API}/assets/${thumbnailAsset(spriteName(entry.speciesId,entry.variant)!)}`} alt="" loading="lazy"/><strong>{species(entry.speciesId).name}</strong><small>{entry.locked?'已锁定 · ':displayed(data,entry.id)?'展示中 · ':''}{entry.lengthMm===null?'海岸纪念':`${(entry.lengthMm/10).toFixed(1)} cm`}{entry.variant?` · ${VARIANT_NAMES[entry.variant]}`:''}</small></button>)}</div>
      <Pager page={current} count={pages} onChange={setPage}/>
      {item&&<Dialog title={species(item.speciesId).name} onClose={()=>setSelected(null)} busy={controller.getSnapshot().busy} error={controller.getSnapshot().error} onRetry={()=>void controller.retry()}>
        <FishArt id={item.speciesId} variant={item.variant} large/><p className="dsh-fisher-catch-stats">{item.lengthMm===null?'海岸纪念':`${(item.lengthMm/10).toFixed(1)} cm · ${item.weightG} g`}{item.variant?` · ${VARIANT_NAMES[item.variant]}`:''}</p>
        <p>{species(item.speciesId).description}</p><button className="dsh-fisher-lock" aria-pressed={item.locked} disabled={blocked} onClick={()=>void controller.action({type:'inventory.lock',catchId:item.id,locked:!item.locked})}>{item.locked?'已锁定 · 点击解锁':'锁定留念'}</button>
        <CardButton item={item} frame={data.life.frame} onStart={()=>controller.pause()}/>
        {displayed(data,item.id)&&<small>正在展示 · 到手记的展示页取回</small>}<div className="dsh-fisher-actions"><button disabled={blocked||item.locked||displayed(data,item.id)} onClick={()=>onResolve(item,'sell')}>出售 +{item.price}</button><button disabled={blocked||item.locked||displayed(data,item.id)} onClick={()=>onResolve(item,'release')}>{species(item.speciesId).creature?'放流':'回收'}</button></div>
      </Dialog>}
    </section>;
  };
}
