import type * as ReactTypes from 'react';
import type { Bootstrap } from '../protocol.ts';
import { fishingTime } from '../game/auto-fishing.ts';
import { species,VARIANT_NAMES,spriteName } from '../game/content.ts';
import { API } from '../protocol.ts';
import { thumbnailAsset } from '../game/art.ts';
import type { GameController } from './controller.ts';
import { createHelp,createPager } from './compact-ui.tsx';
import { createDialog } from './dialog.tsx';

interface Props { data:Bootstrap; controller:GameController; disabled:boolean }
export function createAutoFishingView(React:typeof ReactTypes){
  const Help=createHelp(React),Dialog=createDialog(React),Pager=createPager(React);
  function Controls({data,controller,disabled,onHistory}:Props&{onHistory:()=>void}){
    return <div className="dsh-fisher-auto-controls">
      <label className="dsh-fisher-toggle"><input type="checkbox" checked={data.autoFishing.enabled} disabled={disabled}
        onChange={event=>void controller.action({type:'auto.enable',enabled:event.target.checked})}/>自动钓鱼</label>
      <Help label="自动钓鱼说明"><p>开启后，随 DSH 的模型响应和工具活动积累钓鱼时间。连续30秒没有新活动或等待确认时暂停；关掉海岸小窗仍可继续，退出 DSH 后保留进度。</p>
        <p>普通产物约需1分钟有效活动，越稀有越久，珠光、星砂和巨物还会延长。沿用当前钓点和鱼饵，收获自动放入背包或图鉴；满包、缺饵时暂停。</p>
        <p>接管会关闭自动模式，保留同一份产物，并把已等待的比例转为收线进度，最后一段由你完成。只观察活动信号，不读取思考、聊天或工具正文。</p></Help>
      {data.autoFishing.recent.length>0&&<button className="dsh-fisher-link" disabled={disabled} onClick={onHistory}>自动收获{data.autoFishing.caught>data.autoFishing.seen?` · ${data.autoFishing.caught-data.autoFishing.seen}`:''}</button>}
    </div>;
  }
  function Progress({data,controller,disabled,onCancel,onHarbor}:Props&{onCancel:()=>void;onHarbor:()=>void}){
    const cast=data.active,auto=cast?.automatic,enabled=data.autoFishing.enabled;
    const percent=auto?Math.floor(auto.elapsedMs/auto.requiredMs*100):0;
    const heading=!enabled?'自动钓鱼已暂停':data.autoFishing.reason?'自动钓鱼暂歇':data.autoFishing.working?'跟着工作，慢慢钓':'等待 DSH 活动';
    return <><div className="dsh-fisher-play-heading"><h3>{heading}</h3><small>自动入包</small></div>
      {auto?<><div className="dsh-fisher-meter-row"><div><span>有效活动 {fishingTime(auto.elapsedMs)} / {fishingTime(auto.requiredMs)}</span><b>{percent}%</b></div>
        <div className="dsh-fisher-meter" role="meter" aria-label="自动钓鱼进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{width:`${percent}%`}}/></div></div>
        <div className="dsh-fisher-auto-actions"><button className="dsh-fisher-primary" disabled={disabled} onClick={()=>void controller.action({type:'auto.takeover',castId:cast!.id})}>接管这一竿</button>
          <div className="dsh-fisher-quiet-actions"><button disabled={disabled} onClick={onCancel}>收起这一竿</button></div></div></>
        :<><p>{data.autoFishing.reason??'你继续使用 DSH，海岸会自动抛竿并收好产物。'}</p>
          <div className="dsh-fisher-quiet-actions"><button disabled={disabled} onClick={onHarbor}>换钓点 · 整理装备</button></div></>}
    </>;
  }
  function Catches({data,controller,disabled,open,onClose}:Props&{open:boolean;onClose:()=>void}){
    const [page,setPage]=React.useState(0),count=Math.ceil(data.autoFishing.recent.length/4),currentPage=Math.min(page,Math.max(0,count-1));
    const unread=data.autoFishing.caught-data.autoFishing.seen;
    if(!open)return null;
    const close=()=>{if(unread)void controller.action({type:'auto.ack',through:data.autoFishing.caught});onClose();};
    return <Dialog title="自动钓鱼收获" onClose={close} busy={disabled} error={controller.getSnapshot().error} onRetry={()=>void controller.retry()} closeLabel="继续" hint="点击空白处继续。自动钓鱼会按开关状态继续。">
      <p>{unread?`这段时间钓到了 ${unread} 份收获，已自动收好。`:'最近的自动收获，已收入背包或图鉴。'}{unread>12?'以下展示最近12份。':''}</p>
      {[...data.autoFishing.recent].reverse().slice(currentPage*4,currentPage*4+4).map(item=>{const def=species(item.speciesId),art=spriteName(item.speciesId,item.variant);return <div className="dsh-fisher-auto-catch" key={item.id}>
        {art&&<img src={`${API}/assets/${thumbnailAsset(art)}`} alt={def.name}/>}<div><strong>{def.name}</strong><small>{item.variant?VARIANT_NAMES[item.variant]:def.kind==='guest'?'来客相遇':'海岸纪念'}{item.lengthMm!==null?` · ${item.lengthMm/10} cm`:''}</small></div>
        <small>{item.isNew?'新发现':item.isNewVariant?'新外观':item.isRecord?'新纪录':''}</small></div>;})}
      <Pager page={currentPage} count={count} onChange={setPage}/>
    </Dialog>;
  }
  return {Controls,Progress,Catches};
}
