import type * as ReactTypes from 'react';
import type { Bootstrap } from '../protocol.ts';
import { fishingTime,AUTO_GOALS,AUTO_GOAL_NAMES,AUTO_GOAL_DETAILS } from '../game/auto-fishing.ts';
import type {AutoGoal} from '../game/auto-fishing.ts';
import { species,VARIANT_NAMES,spriteName } from '../game/content.ts';
import { API } from '../protocol.ts';
import { thumbnailAsset } from '../game/art.ts';
import type { GameController } from './controller.ts';
import { createHelp,createPager } from './compact-ui.tsx';
import { createDialog } from './dialog.tsx';
import { createCoastIcon } from './coast-icons.tsx';
import type { CoastIconName } from './coast-icons.tsx';
import { createActivitySwitch } from './activity-switch.tsx';

const GOAL_CARDS:Record<AutoGoal,{icon:CoastIconName;summary:string;note:string}>={
  relax:{icon:'fish',summary:'随缘收好每份渔获',note:'沿用你选择的落点，所有收获都留下。'},
  catalog:{icon:'book',summary:'寻找还没遇见的收获',note:'新发现更容易上钩，每竿会多等一会儿。'},
  coins:{icon:'coin',summary:'出售重复的普通鱼',note:'首次发现、纪录和特殊外观都会留下。'},
  clues:{icon:'compass',summary:'跟进当前海岸的故事',note:'自动寻找线索，选择和布置时等你回来。'},
  legend:{icon:'compass',summary:'循着线索寻找星砂宝石鱼',note:'需要换海岸、准备鱼饵或潮相时暂停等你。'},
};

interface Props { data:Bootstrap; controller:GameController; disabled:boolean }
export function createAutoFishingView(React:typeof ReactTypes){
  const Help=createHelp(React),Dialog=createDialog(React),Pager=createPager(React),Icon=createCoastIcon(React),ActivitySwitch=createActivitySwitch(React);
  function Controls({data,controller,disabled,onHistory,compact=false}:Props&{onHistory:()=>void;compact?:boolean}){
    const enabled=data.autoFishing.enabled;
    return <><ActivitySwitch title="自动钓鱼" description={enabled?'已开启 · 随 DSH 活动进行':'未开启 · 点一下，让海岸替你钓'} icon="auto" enabled={enabled} disabled={disabled} compact={compact} onChange={enabled=>void controller.action({type:'auto.enable',enabled})}>
      <Help label="自动钓鱼说明"><p>开启后，随 DSH 的模型响应和工具活动积累钓鱼时间。连续30秒没有新活动或等待确认时暂停；关掉海岸小窗仍可继续，退出 DSH 后保留进度。</p>
        <p>普通产物约需1分钟有效活动，越稀有越久，珠光、星砂和巨物还会延长。随心钓沿用所选落点，其他目标可选择落点；鱼饵不变。默认收好产物，攒壳币会出售符合条件的重复普通鱼；满包、缺饵时暂停。</p>
        <p>接管会关闭自动模式，保留同一份产物，并把已等待的比例转为收线进度，最后一段由你完成。只观察活动信号，不读取思考、聊天或工具正文。</p></Help>
    </ActivitySwitch>{!compact&&<section className="dsh-fisher-auto-plan" aria-label="托管目标">
      <div className="dsh-fisher-auto-section-heading"><strong>这次想钓什么</strong><Help label="托管目标说明"><p>{AUTO_GOAL_DETAILS[data.autoFishing.goal]}</p></Help></div>
      <div className="dsh-fisher-auto-goals">{AUTO_GOALS.map(goal=><button key={goal} disabled={disabled} aria-pressed={data.autoFishing.goal===goal} onClick={()=>void controller.action({type:'auto.goal',goal})}>
        <Icon name={GOAL_CARDS[goal].icon}/><span><strong>{AUTO_GOAL_NAMES[goal]}</strong><small>{GOAL_CARDS[goal].summary}</small></span><i aria-hidden="true">{data.autoFishing.goal===goal?'✓':''}</i>
      </button>)}</div><p className="dsh-fisher-auto-goal-note">{GOAL_CARDS[data.autoFishing.goal].note}{data.active&&' 更换目标从下一竿生效。'}</p>
    </section>}{data.autoFishing.recent.length>0&&<button className="dsh-fisher-auto-history" disabled={disabled} onClick={onHistory}><Icon name="bag"/><span>查看自动收获</span><b>{data.autoFishing.caught>data.autoFishing.seen?`${data.autoFishing.caught-data.autoFishing.seen} 份新收获`:'最近记录'}</b><span aria-hidden="true">›</span></button>}</>;
  }
  function Progress({data,controller,disabled,onCancel,onHarbor}:Props&{onCancel:()=>void;onHarbor:()=>void}){
    const cast=data.active,auto=cast?.automatic,enabled=data.autoFishing.enabled;
    const percent=auto?Math.floor(auto.elapsedMs/auto.requiredMs*100):0;
    if(!auto&&!enabled)return <div className="dsh-fisher-auto-equipment"><small>使用当前鱼饵与装备</small><button onClick={onHarbor} disabled={disabled}>整理装备 <span aria-hidden="true">›</span></button></div>;
    const heading=!enabled?'已暂停，进度为你保留':data.autoFishing.reason?'等你回来处理':data.autoFishing.working?'正在自动钓鱼':'已就位，等待 DSH 活动';
    return <section className="dsh-fisher-auto-progress" data-working={enabled&&data.autoFishing.working}><div className="dsh-fisher-play-heading"><h3><i aria-hidden="true"/>{heading}</h3><small>{AUTO_GOAL_NAMES[cast?.setup?.autoGoal??data.autoFishing.goal]}</small></div>
      {auto?<>{cast?.companionHint&&<p>{cast.companionHint}</p>}{cast?.setup?.companion==='A004'&&<small>香蕉猫的小雨 · 这一竿所需时间已减少10%</small>}<div className="dsh-fisher-meter-row"><div><span>有效活动 {fishingTime(auto.elapsedMs)} / {fishingTime(auto.requiredMs)}</span><b>{percent}%</b></div>
        <div className="dsh-fisher-meter" role="meter" aria-label="自动钓鱼进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{width:`${percent}%`}}/></div></div>
        <div className="dsh-fisher-auto-actions"><button className="dsh-fisher-primary" disabled={disabled} onClick={()=>void controller.action({type:'auto.takeover',castId:cast!.id})}>接管这一竿</button>
          <button disabled={disabled} onClick={onCancel}>收起这一竿</button></div></>
        :<><p>{data.autoFishing.reason??'你继续使用 DSH，下一段有效活动就会推进这一竿。'}</p>
          <div className="dsh-fisher-quiet-actions"><button disabled={disabled} onClick={onHarbor}>钓点与装备 <span aria-hidden="true">›</span></button></div></>}
    </section>;
  }
  function Catches({data,controller,disabled,open,onClose}:Props&{open:boolean;onClose:()=>void}){
    const [page,setPage]=React.useState(0),count=Math.ceil(data.autoFishing.recent.length/4),currentPage=Math.min(page,Math.max(0,count-1));
    const unread=data.autoFishing.caught-data.autoFishing.seen;
    if(!open)return null;
    const close=()=>{if(unread)void controller.action({type:'auto.ack',through:data.autoFishing.caught});onClose();};
    return <Dialog title="自动钓鱼收获" onClose={close} busy={disabled} error={controller.getSnapshot().error} onRetry={()=>void controller.retry()} closeLabel="继续" hint="点击空白处继续。自动钓鱼会按开关状态继续。">
      <p>{unread?`这段时间钓到了 ${unread} 份收获，已按托管目标处理。`:'最近的自动收获与处理结果。'}{unread>12?'以下展示最近12份。':''}</p>
      {data.autoFishing.sold>0&&<p>累计出售 {data.autoFishing.sold} 条重复普通鱼 · 入账 {data.autoFishing.earnedCoins} 壳币</p>}
      {[...data.autoFishing.recent].reverse().slice(currentPage*4,currentPage*4+4).map(item=>{const def=species(item.speciesId),art=spriteName(item.speciesId,item.variant);return <div className="dsh-fisher-auto-catch" key={item.id}>
        {art&&<img src={`${API}/assets/${thumbnailAsset(art)}`} alt={def.name}/>}<div><strong>{def.name}</strong><small>{item.variant?VARIANT_NAMES[item.variant]:def.kind==='guest'?'来客相遇':'海岸纪念'}{item.lengthMm!==null?` · ${item.lengthMm/10} cm`:''}</small></div>
        <small>{data.autoFishing.recentSold.includes(item.id)?`已出售 +${item.price}`:item.isNew?'新发现':item.isNewVariant?'新外观':item.isRecord?'新纪录':''}</small></div>;})}
      <Pager page={currentPage} count={count} onChange={setPage}/>
    </Dialog>;
  }
  return {Controls,Progress,Catches};
}
