import type * as ReactTypes from 'react';
import {API} from '../protocol.ts';
import {thumbnailAsset} from '../game/art.ts';
import {createPager,createSlotLayout} from './compact-ui.tsx';

export interface PickerItem {
  id:string;
  name:string;
  detail?:string;
  image?:string|null|undefined;
  badge?:string|undefined;
  disabled?:boolean;
}

export function createItemPicker(React:typeof ReactTypes){
  const Pager=createPager(React),useSlotLayout=createSlotLayout(React);
  return function ItemPicker({items,selected,onSelect,disabled=false,label='搜索收藏',empty='还没有可选的收藏。',maxItems=6}:{items:readonly PickerItem[];selected?:string|null;onSelect:(id:string)=>void;disabled?:boolean;label?:string;empty?:string;maxItems?:number}){
    const [search,setSearch]=React.useState(''),[page,setPage]=React.useState(0);
    const {ref,pageSize:available}=useSlotLayout(),pageSize=Math.max(1,Math.min(available,maxItems));
    const query=search.trim().toLocaleLowerCase();
    const entries=items.filter(item=>!query||`${item.name} ${item.detail??''} ${item.badge??''}`.toLocaleLowerCase().includes(query));
    const pages=Math.max(1,Math.ceil(entries.length/pageSize)),current=Math.min(page,pages-1);
    return <section ref={ref} className="dsh-fisher-item-picker" aria-label={label}>
      <div className="dsh-fisher-search-row"><input type="search" aria-label={label} placeholder={label} value={search} onChange={event=>{setSearch(event.target.value);setPage(0);}}/>{search&&<button onClick={()=>{setSearch('');setPage(0);}}>清空</button>}<small>{entries.length} 项</small></div>
      {entries.length?<div className="dsh-fisher-choice-grid" data-count={Math.min(pageSize,entries.length-current*pageSize)}>{entries.slice(current*pageSize,(current+1)*pageSize).map(item=><button key={item.id} disabled={disabled||item.disabled} aria-pressed={selected===item.id} onClick={()=>onSelect(item.id)}>
        {item.image?<img src={`${API}/assets/${thumbnailAsset(item.image)}`} alt="" loading="lazy" decoding="async"/>:<span className="dsh-fisher-choice-placeholder" aria-hidden="true">◇</span>}
        <strong>{item.name}</strong>{item.detail&&<small>{item.detail}</small>}{(selected===item.id||item.badge)&&<em>{selected===item.id?'✓ 已选':item.badge}</em>}
      </button>)}</div>:<p className="dsh-fisher-empty-note">{query?'没有找到，换个名字或清空搜索试试。':empty}</p>}
      <Pager page={current} count={pages} onChange={setPage}/>
    </section>;
  };
}
