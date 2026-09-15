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
import { createHelp,createPager,createSlotLayout } from './compact-ui.tsx';
import { createCoastIcon } from './coast-icons.tsx';

export function createInventoryView(React:typeof ReactTypes,FishArt:ReactTypes.ComponentType<{id:SpeciesId;variant?:Variant|null;large?:boolean}>) {
  const Dialog=createDialog(React),CardButton=createCardButton(React),Help=createHelp(React),Pager=createPager(React),Icon=createCoastIcon(React);
  const useSlotLayout=createSlotLayout(React);
  return function Inventory({data,controller,blocked,onFish,onResolve}:{data:Bootstrap;controller:GameController;blocked:boolean;onFish:()=>void;onResolve:(item:Catch,choice:'sell'|'release')=>void}) {
    const [selected,setSelected]=React.useState<string|null>(null),[page,setPage]=React.useState(0);
    const [kind,setKind]=React.useState<'all'|'fish'|'abstract'>('all'),[organize,setOrganize]=React.useState(false);
    const {ref,pageSize}=useSlotLayout();
    const tidy=data.inventory.filter(item=>!item.locked&&!item.isNew&&!item.isRecord&&!item.isNewVariant&&!displayed(data,item.id));
    const entries=data.inventory.filter(item=>kind==='all'||species(item.speciesId).kind===kind);
    const item=data.inventory.find(item=>item.id===selected),pages=Math.max(1,Math.ceil(entries.length/pageSize)),current=Math.min(page,pages-1),visible=entries.slice(current*pageSize,current*pageSize+pageSize);
    return <section ref={ref} className="dsh-fisher-collection dsh-fisher-inventory" aria-label="收获背包">
      <nav className="dsh-fisher-ribbon-tabs" aria-label="背包分类">{([['all','全部收藏','bag'],['fish','鱼儿','fish'],['abstract','奇珍异兽','star']] as const).map(([id,label,icon])=><button key={id} aria-pressed={kind===id} onClick={()=>{setKind(id);setPage(0);}}><Icon name={icon}/><span>{label}</span></button>)}</nav>
      <div className="dsh-fisher-card-heading"><small>{entries.length} 份收藏 · 背包 {data.inventory.length}/240</small><Help label="背包整理说明"><p>点击道具格查看个体、锁定或保存收获卡。批量整理会保留新发现、首次外观、纪录、锁定和展示中的个体。再放流或回收 {5-data.journey.releaseProgress} 次可得1潮汐碎片。</p></Help></div>
      {!data.inventory.length&&<div className="dsh-fisher-empty"><span aria-hidden="true">≈</span><p>背包里还装着海风。</p><button onClick={onFish}>去钓一竿</button></div>}
      {!!data.inventory.length&&<div className="dsh-fisher-catalog-grid dsh-fisher-slot-grid">{visible.map(entry=>{const description=`${species(entry.speciesId).name}，${entry.lengthMm===null?'海岸纪念':`${(entry.lengthMm/10).toFixed(1)} cm`}${entry.variant?`，${VARIANT_NAMES[entry.variant]}`:''}${entry.locked?'，已锁定':displayed(data,entry.id)?'，展示中':''}`;return <button key={entry.id} className="dsh-fisher-inventory-item" aria-label={description} title={description} aria-haspopup="dialog" onClick={()=>setSelected(entry.id)}><img className="dsh-fisher-catalog-thumbnail" src={`${API}/assets/${thumbnailAsset(spriteName(entry.speciesId,entry.variant)!)}`} alt="" loading="lazy" decoding="async"/><strong>{species(entry.speciesId).name}</strong><small>{entry.lengthMm===null?'纪念':`${(entry.lengthMm/10).toFixed(1)} cm`}</small>{(entry.locked||displayed(data,entry.id)||entry.variant&&entry.variant!=='original')&&<span className="dsh-fisher-slot-mark" aria-hidden="true">{entry.locked?'◆':displayed(data,entry.id)?'▣':entry.variant==='starsand'?'✦':'◇'}</span>}</button>;})}{Array.from({length:pageSize-visible.length},(_,index)=><div className="dsh-fisher-empty-slot" key={`empty-${index}`} aria-hidden="true"/>)}</div>}
      <Pager page={current} count={pages} onChange={setPage}/>
      {!!data.inventory.length&&<div className="dsh-fisher-inventory-footer"><span>每一格，都是一次相遇。</span><button aria-haspopup="dialog" onClick={()=>setOrganize(true)}>整理背包</button></div>}
      {organize&&<Dialog title="整理背包" onClose={()=>setOrganize(false)} busy={controller.getSnapshot().busy} error={controller.getSnapshot().error} onRetry={()=>void controller.retry()}><p>全背包中有 {tidy.length} 份普通收获可以整理。新发现、首次外观、纪录、锁定和展示中的收藏会留下。</p><div className="dsh-fisher-actions"><button disabled={blocked||!tidy.length} onClick={()=>void controller.action({type:'inventory.batch',catchIds:tidy.map(item=>item.id),choice:'sell'})}>出售普通收获 {tidy.length}</button><button disabled={blocked||!tidy.length} onClick={()=>void controller.action({type:'inventory.batch',catchIds:tidy.map(item=>item.id),choice:'release'})}>放流／回收 {tidy.length}</button></div></Dialog>}
      {item&&<Dialog title={species(item.speciesId).name} onClose={()=>setSelected(null)} busy={controller.getSnapshot().busy} error={controller.getSnapshot().error} onRetry={()=>void controller.retry()}>
        <FishArt id={item.speciesId} variant={item.variant} large/><p className="dsh-fisher-catch-stats">{item.lengthMm===null?'海岸纪念':`${(item.lengthMm/10).toFixed(1)} cm · ${item.weightG} g`}{item.variant?` · ${VARIANT_NAMES[item.variant]}`:''}</p>
        <p>{species(item.speciesId).description}</p><button className="dsh-fisher-lock" aria-pressed={item.locked} disabled={blocked} onClick={()=>void controller.action({type:'inventory.lock',catchId:item.id,locked:!item.locked})}>{item.locked?'已锁定 · 点击解锁':'锁定留念'}</button>
        <CardButton item={item} frame={data.life.frame} onStart={()=>controller.pause()}/>
        {displayed(data,item.id)&&<small>正在展示 · 到手记的展示页取回</small>}<div className="dsh-fisher-actions"><button disabled={blocked||item.locked||displayed(data,item.id)} onClick={()=>onResolve(item,'sell')}>出售 +{item.price}</button><button disabled={blocked||item.locked||displayed(data,item.id)} onClick={()=>onResolve(item,'release')}>{species(item.speciesId).creature?'放流':'回收'}</button></div>
      </Dialog>}
    </section>;
  };
}
