import type * as ReactTypes from 'react';
import {API} from '../protocol.ts';
import type {Bootstrap} from '../protocol.ts';
import {SUPPLY_BAITS} from '../game/work.ts';
import type {SupplyBait} from '../game/work.ts';
import {bait} from '../game/progression.ts';
import {BAIT_ART} from '../game/visuals.ts';
import {thumbnailAsset} from '../game/art.ts';
import type {GameController} from './controller.ts';
import {createActivitySwitch} from './activity-switch.tsx';
import {createCoastIcon} from './coast-icons.tsx';
import {createHelp} from './compact-ui.tsx';

export function createWorkSupplyView(React:typeof ReactTypes){
  const ActivitySwitch=createActivitySwitch(React),Icon=createCoastIcon(React),Help=createHelp(React);
  return function WorkSupply({data,controller,disabled,selected,onSelect}:{data:Bootstrap;controller:GameController;disabled:boolean;selected:SupplyBait;onSelect:(id:SupplyBait)=>void}){
    const work=data.work,count=work.packs.length,full=count>=12,dailyFull=work.dailyPoints>=120,baitFull=(data.journey.baits[selected]??0)>9997;
    const status=full&&dailyFull?'储备已满，今日足迹已达上限。':full?'储备已满，领取后可继续积累。':dailyFull?'今日足迹已达上限，储备仍可领取。':work.enabled?'随新的 DSH 活动积累，储备不会过期。':'开启后积累足迹，已有储备仍可领取。';
    return <section className="dsh-fisher-supply" aria-label="工作补给">
      <ActivitySwitch title="工作补给" description={work.enabled?'已开启 · 随 DSH 活动积累':'未开启 · 工作之余，攒点补给'} icon="bag" enabled={work.enabled} disabled={disabled} onChange={enabled=>void controller.action({type:'work.enable',enabled})}>
        <Help label="DSH 补给说明"><p>仅从启用后的新活动累计，只观察回合边界与事件到达，不读取聊天内容，不发起模型请求。关闭小窗仍可积累，关闭开关或禁用插件停止观察。</p><p>每180秒活动 +2 足迹；完整回合 +5，相邻完成奖励至少间隔60秒，多会话合并计时。每10足迹获得1包，最多储备12包，每日最多120足迹。</p><p>每包20壳币、1潮汐碎片和两份自选鱼饵；储备不会过期。当前活动 {Math.floor(work.activeMs/1000)}/180 秒。下次日限额重置：{new Date(work.nextResetAt).toLocaleString()}。</p></Help>
      </ActivitySwitch>
      <div className="dsh-fisher-supply-stock" data-capped={full||dailyFull}>
        <div className="dsh-fisher-supply-summary"><div className="dsh-fisher-supply-packs"><Icon name="bag"/><div><strong>{count}<small> / 12</small></strong><span>待领补给</span></div></div>
          <div className="dsh-fisher-supply-footprints"><div><strong>下一包补给</strong><span>{work.points} / 10 足迹</span></div><div className="dsh-fisher-meter" role="meter" aria-label="下一包补给足迹" aria-valuemin={0} aria-valuemax={10} aria-valuenow={work.points}><i style={{width:`${work.points*10}%`}}/></div><small>今日已积累 {work.dailyPoints} / 120 足迹</small></div>
        </div><p role="status">{status}</p>
      </div>
      <div className="dsh-fisher-supply-rewards" aria-label="每包补给内容"><span><Icon name="coin"/><b>20</b> 壳币</span><span><Icon name="star"/><b>1</b> 潮汐碎片</span><span><Icon name="fish"/><b>2</b> 份鱼饵</span></div>
      <section className="dsh-fisher-supply-choice" aria-label="选择补给鱼饵"><div className="dsh-fisher-supply-heading"><strong>这包想带哪种鱼饵</strong><Help label="所选鱼饵说明"><p>{bait(selected).name}：{bait(selected).description}</p><p>已有 {data.journey.baits[selected]??0} 份。这里只选择补给内容，不会更换当前装备的鱼饵。</p></Help></div>
        <div className="dsh-fisher-supply-baits">{SUPPLY_BAITS.map(id=><button type="button" key={id} aria-label={`${bait(id).name} ×2`} aria-pressed={selected===id} disabled={disabled} onClick={()=>onSelect(id)}><img src={`${API}/assets/${thumbnailAsset(BAIT_ART[id])}`} alt="" decoding="async"/><span>{bait(id).name}</span><i aria-hidden="true">{selected===id?'✓':'×2'}</i></button>)}</div>
      </section>
      <button type="button" className="dsh-fisher-primary dsh-fisher-supply-claim" disabled={disabled||!count||baitFull} onClick={()=>{const packId=work.packs[0];if(packId)void controller.action({type:'work.claim',packId,bait:selected});}}><Icon name="bag"/><strong>{!count?'暂无可领取的补给':baitFull?'所选鱼饵已满':'领取 1 包补给'}</strong>{count>0&&!baitFull&&<small>{bait(selected).name} ×2</small>}</button>
      {count>0&&baitFull&&<p className="dsh-fisher-supply-full" role="status">换一种鱼饵，或先使用一些再领取；补给会为你保留。</p>}
    </section>;
  };
}
