import type * as ReactTypes from 'react';
import {API} from '../protocol.ts';
import type {Bootstrap} from '../protocol.ts';
import type {GameController} from './controller.ts';
import {COMPANIONS,COMPANION_IDS} from '../game/companions.ts';
import type {CompanionId} from '../game/companions.ts';
import {spriteName} from '../game/content.ts';
import {thumbnailAsset} from '../game/art.ts';

export function createCompanionJournal(React:typeof ReactTypes){
  return function CompanionJournal({data,controller,disabled,onPlay}:{data:Bootstrap;controller:GameController;disabled:boolean;onPlay:()=>void}){
    const [selected,setSelected]=React.useState<CompanionId>(data.shore.companion??'A002'),def=COMPANIONS[selected],following=data.shore.companion===selected,known=!!data.catalog[selected];
    return <><div className="dsh-fisher-companion-options" aria-label="伙伴选择">{COMPANION_IDS.map(id=><button key={id} aria-pressed={selected===id} onClick={()=>setSelected(id)}><img src={`${API}/assets/${thumbnailAsset(spriteName(id,'original')!)}`} alt=""/><strong>{COMPANIONS[id].name}</strong><small>{data.shore.companion===id?'正在同行':data.catalog[id]?'已相遇':'待相遇'}</small></button>)}</div>
      <img className="dsh-fisher-companion-portrait" src={`${API}/assets/${spriteName(selected,'original')}`} alt={def.name}/><h3>{def.name} · {def.role}</h3><p>{def.detail}</p>
      {!known&&<p>先在{def.home}发现这位伙伴，就能邀请同行。邀请不会消耗收藏个体。</p>}
      <button className="dsh-fisher-primary" disabled={disabled||!known} onClick={()=>void controller.action({type:'shore.companion',companion:following?null:selected})}>{following?`让${def.name}歇一会儿`:`邀请${def.name}同行`}</button>
      {following&&<button disabled={disabled||!!data.active} onClick={onPlay}>{def.play}</button>}
      <small>{data.active?'更换从下一竿生效，当前这一竿的伙伴和能力保持原样。':'每次邀请一位。也可以带它散步，在岸边打个招呼。'}</small>
    </>;
  };
}
