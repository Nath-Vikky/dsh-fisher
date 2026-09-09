import type * as ReactTypes from 'react';
import { API } from '../protocol.ts';
import type { Bootstrap } from '../protocol.ts';
import { REGIONS,SPECIES,VARIANTS,VARIANT_NAMES,region,spriteName } from '../game/content.ts';
import { thumbnailAsset } from '../game/art.ts';
import type { RegionId,SpeciesId,Variant } from '../game/content.ts';
import { regionUnlocked } from '../game/progression.ts';
import type { GameController } from './controller.ts';
import { createDialog } from './dialog.tsx';
import { createHelp,createPager } from './compact-ui.tsx';

type Art=ReactTypes.ComponentType<{id:SpeciesId;variant?:Variant|null;large?:boolean}>;
export function createCatalogView(React:typeof ReactTypes,FishArt:Art) {
  const Dialog=createDialog(React),Help=createHelp(React),Pager=createPager(React);
  return function Catalog({data,controller,blocked,onFish}:{data:Bootstrap;controller:GameController;blocked:boolean;onFish:()=>void}) {
    const [location,setLocation]=React.useState<RegionId>(data.journey.region),[search,setSearch]=React.useState('');
    const [kind,setKind]=React.useState('all'),[discovery,setDiscovery]=React.useState('all'),[rarity,setRarity]=React.useState('all');
    const [selected,setSelected]=React.useState<SpeciesId|null>(null),[variant,setVariant]=React.useState<Variant>('original');
    const [page,setPage]=React.useState(0),[filters,setFilters]=React.useState(false);
    React.useEffect(()=>{setPage(0);},[location,search,kind,discovery,rarity]);
    const idle=!data.active&&!data.pending;
    const travel=async(id:SpeciesId,targeted:boolean)=>{
      const definition=SPECIES.find(item=>item.id===id)!;
      if(data.journey.region!==definition.region)await controller.action({type:'location.select',region:definition.region});
      if(controller.getSnapshot().error)return;
      if(targeted)await controller.action({type:'bait.select',bait:'B07',target:id});
      if(!controller.getSnapshot().error)onFish();
    };
    const entries=SPECIES.filter(entry=>entry.region===location&&(kind==='all'||entry.kind===kind)
      &&(discovery==='all'||!!data.catalog[entry.id]===(discovery==='known'))
      &&(rarity==='all'||entry.rarity===Number(rarity))
      &&(!search||(data.catalog[entry.id]&&entry.name.includes(search))));
    const pages=Math.max(1,Math.ceil(entries.length/4)),currentPage=Math.min(page,pages-1);
    return <section className="dsh-fisher-collection dsh-fisher-catalog" aria-label="海岸图鉴"><div className="dsh-fisher-collection-intro"><div className="dsh-fisher-card-heading"><h3>水边的相遇</h3><Help label="图鉴说明"><p>发现会留下，出售或放流不影响图鉴。点击条目查看外观、纪录和线索。</p></Help></div>
      <div className="dsh-fisher-actions">{REGIONS.map(item=><button key={item.id} aria-pressed={location===item.id} onClick={()=>{setLocation(item.id);setSelected(null);}}>{item.name}</button>)}</div>
      <div className="dsh-fisher-search-row"><input aria-label="搜索图鉴" placeholder="搜索已发现的名字" value={search} onChange={event=>setSearch(event.target.value)}/><button aria-haspopup="dialog" onClick={()=>setFilters(true)}>筛选{[kind,discovery,rarity].some(value=>value!=='all')?' · 已选':''}</button></div></div>
      {filters&&<Dialog title="筛选图鉴" onClose={()=>setFilters(false)}>
      <div className="dsh-fisher-catalog-filters"><label>类别<select value={kind} onChange={event=>setKind(event.target.value)}><option value="all">全部收藏</option><option value="fish">正常鱼</option><option value="abstract">奇珍异兽</option><option value="relic">海岸遗物</option><option value="guest">海岸来客</option></select></label>
        <label>发现<select value={discovery} onChange={event=>setDiscovery(event.target.value)}><option value="all">全部</option><option value="known">已发现</option><option value="unknown">未发现</option></select></label>
        <label>稀有度<select value={rarity} onChange={event=>setRarity(event.target.value)}><option value="all">全部</option>{['常见','少见','稀有','珍奇'].map((name,index)=><option key={name} value={index+1}>{name}</option>)}</select></label></div>
      </Dialog>}
      {!entries.length&&<p>这一页暂时没有符合筛选的相遇。</p>}
      <div className="dsh-fisher-catalog-grid">{entries.slice(currentPage*4,currentPage*4+4).map(entry=>{
        const record=data.catalog[entry.id],clue=data.journey.completed[entry.region]>=10&&entry.kind!=='guest';
        const available=VARIANTS.filter(id=>record?.variants[id]),chosen=available.includes(variant)?variant:available[0]??'original';
        const opened=selected===entry.id,unlocked=regionUnlocked(entry.region,data.experience,data.research);
        const cover=record?spriteName(entry.id,available[0]??null):undefined;
        return <article className="dsh-fisher-catalog-item" key={entry.id}>
          <button className="dsh-fisher-catalog-open" aria-haspopup="dialog" onClick={()=>{setSelected(entry.id);setVariant('original');}}>
            {cover?<img className="dsh-fisher-catalog-thumbnail" src={`${API}/assets/${thumbnailAsset(cover)}`} alt="" loading="lazy" decoding="async"/>:<span className="dsh-fisher-undiscovered" aria-hidden="true">?</span>}
            <small>{entry.id} · {entry.rarity?['常见','少见','稀有','珍奇'][entry.rarity-1]:entry.kind==='abstract'?'奇珍异兽':entry.kind==='relic'?'海岸遗物':'来客'}</small>
            <b>{record||clue?entry.name:'尚未相遇'}</b>
          </button>
          {opened&&<Dialog title={record||clue?entry.name:'尚未相遇'} onClose={()=>setSelected(null)}><div className="dsh-fisher-catalog-detail">
            {record?<><FishArt id={entry.id} variant={chosen} large/>{entry.creature&&<div className="dsh-fisher-actions">{VARIANTS.map(id=><button key={id} disabled={!record.variants[id]} aria-pressed={chosen===id} onClick={()=>setVariant(id)}>{VARIANT_NAMES[id]}{record.variants[id]?` · ${record.variants[id]}`:' · 未发现'}</button>)}</div>}
              <p>{entry.description}</p><p>相遇 {record.count} 次{record.bestLengthMm!==null?` · 最长 ${(record.bestLengthMm/10).toFixed(1)} cm · 最重 ${record.bestWeightG} g`:''}</p></>
              :<p>{entry.kind==='guest'?'完成这片海岸的来客请求，就能寄出邀请。':clue?`线索：在${region(entry.region).name}使用${entry.tags.includes('glow')?'夜光饵':entry.tags.includes('grain')?'谷香饵':entry.tags.includes('marine')?'海盐饵':entry.tags.includes('deep')?'深潜饵':entry.kind==='abstract'?'怪味饵':'普通面团'}，或选择图鉴定向饵。`:'本区完成 10 竿后公开线索。'}</p>}
            {unlocked?<><div className="dsh-fisher-actions"><button disabled={blocked||!idle} onClick={()=>void travel(entry.id,false)}>去{region(entry.region).name}</button>
              {!record&&clue&&<button disabled={blocked||!idle} onClick={()=>void travel(entry.id,true)}>选择定向饵</button>}</div>{!idle&&<small>处理完这一竿后可前往。</small>}</>:<p>需要 Lv.{region(entry.region).level} / 研究 {region(entry.region).research} 解锁此钓点。</p>}
          </div></Dialog>}
        </article>;
      })}</div>
      <Pager page={currentPage} count={pages} onChange={setPage}/>
    </section>;
  };
}
