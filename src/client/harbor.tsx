import type * as ReactTypes from 'react';
import { API } from '../protocol.ts';
import type { Bootstrap } from '../protocol.ts';
import { REGIONS, SPECIES, isRegionId, isSpeciesId } from '../game/content.ts';
import { BAITS, TIDES, TIDE_NAMES, bait, currentTide, isBaitId, levelInfo, regionUnlocked } from '../game/progression.ts';
import { GEAR, GEAR_ART } from '../game/gear.ts';
import { categoryProbabilities, preferenceAvailable } from '../game/encounters.ts';
import type { GameController } from './controller.ts';
import { SUPPLY_BAITS } from '../game/work.ts';
import type { SupplyBait } from '../game/work.ts';
export function createHarbor(React:typeof ReactTypes) {
  return function Harbor({data,controller,blocked}:{data:Bootstrap;controller:GameController;blocked:boolean}) {
    const [supplyBait, setSupplyBait] = React.useState<SupplyBait>('B02');
    const journey=data.journey,idle=!data.active&&!data.pending,level=levelInfo(data.experience),tide=currentTide(journey);
    const probabilities=categoryProbabilities(journey.region,journey.bait,tide);
    const clues=journey.completed[journey.region]>=10;
    const missing=SPECIES.filter(item=>item.region===journey.region&&item.kind!=='guest'&&!data.catalog[item.id]);
    return <section className="dsh-fisher-collection dsh-fisher-harbor" aria-label="码头整备">
      <div className="dsh-fisher-collection-intro"><h3>把下一竿，准备得刚刚好</h3><p>手册 Lv.{level.level} · {level.needed?`升级还需 ${level.needed-level.current} 经验`:'海岸故事继续累积'} · 研究 {data.research}</p></div>
      <fieldset><legend>工作之余，捎来一包补给</legend>
        <label className="dsh-fisher-toggle"><input type="checkbox" checked={data.work.enabled} disabled={blocked} onChange={event=>void controller.action({type:'work.enable',enabled:event.target.checked})}/>启用 DSH 工作补给</label>
        <p>仅从启用后的新活动累计。只观察回合边界与事件到达，不读取聊天内容，也不会发起模型请求。关闭小窗后仍可积累；关闭此开关或禁用插件就停止观察。</p>
        <p>足迹 {data.work.points}/10 · 补给 {data.work.packs.length}/12 · 本日足迹 {data.work.dailyPoints}/120</p>
        <p>活动时长估计 {Math.floor(data.work.activeMs/1000)}/180 秒，每 180 秒 +2 足迹；观察到完整回合后 +5，相邻完成奖励至少间隔 60 秒。多人同时工作合并计算。</p>
        {(data.work.packs.length===12||data.work.dailyPoints===120)&&<p>当前积分已暂停。领取储备或等到日限额重置后，新活动继续累计。</p>}
        <details><summary>领取与日界</summary><p>每包 20 壳币、1 潮汐碎片，再自选两份鱼饵。储备不会过期，关闭补给后也可领取。</p><p>下次 UTC 日限额重置：{new Date(data.work.nextResetAt).toLocaleString()}（本地时间）。</p></details>
        <label>补给中的鱼饵<select aria-label="补给中的鱼饵" value={supplyBait} disabled={blocked} onChange={event=>{if(SUPPLY_BAITS.some(id=>id===event.target.value))setSupplyBait(event.target.value as SupplyBait);}}>{SUPPLY_BAITS.map(id=><option key={id} value={id}>{bait(id).name} ×2</option>)}</select></label>
        <button disabled={blocked||!data.work.packs.length||(journey.baits[supplyBait]??0)>9997} onClick={()=>{const packId=data.work.packs[0];if(packId)void controller.action({type:'work.claim',packId,bait:supplyBait});}}>领取 1 包补给</button>
      </fieldset>
      <fieldset><legend>去哪里坐坐</legend><label>钓点<select aria-label="钓点" value={journey.region} disabled={blocked||!idle} onChange={event=>{if(isRegionId(event.target.value))void controller.action({type:'location.select',region:event.target.value});}}>
        {REGIONS.map(item=><option key={item.id} value={item.id} disabled={!regionUnlocked(item.id,data.experience,data.research)}>{item.name}{regionUnlocked(item.id,data.experience,data.research)?'':` · Lv.${item.level} / 研究 ${item.research}`}</option>)}</select></label>
        <p>{REGIONS.find(item=>item.id===journey.region)!.mood}</p>{!idle&&<p>处理完这一竿，再调整装备、鱼饵和潮相。</p>}
      </fieldset>
      <fieldset><legend>挑一份鱼饵</legend><label>本竿鱼饵<select aria-label="本竿鱼饵" value={journey.bait} disabled={blocked||!idle} onChange={event=>{if(isBaitId(event.target.value))void controller.action({type:'bait.select',bait:event.target.value});}}>
        {BAITS.map(item=><option key={item.id} value={item.id} disabled={!preferenceAvailable(journey.region,item.id)||(item.id==='B08'&&!journey.invitations.length)}>{item.name} · {item.id==='B01'?'无限':item.id==='B08'?journey.invitations.length:journey.baits[item.id]??0}</option>)}</select></label>
        <p>{bait(journey.bait).description}</p>
        {journey.bait==='B07'&&<label>图鉴目标<select aria-label="图鉴目标" value={journey.target??''} disabled={blocked||!idle||!clues} onChange={event=>{if(isSpeciesId(event.target.value))void controller.action({type:'bait.select',bait:'B07',target:event.target.value});}}><option value="">{clues?'选一个想认识的条目':'本区完成 10 竿后公开线索'}</option>{clues&&missing.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        {journey.bait==='B08'&&<label>邀请谁来<select aria-label="邀请谁来" value={journey.target??''} disabled={blocked||!idle} onChange={event=>{if(isSpeciesId(event.target.value))void controller.action({type:'bait.select',bait:'B08',target:event.target.value});}}><option value="">选择来客</option>{SPECIES.filter(item=>journey.invitations.includes(item.id)&&item.region===journey.region).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <details><summary>这一竿的相遇机会</summary><p>{!journey.tutorialDone?'第一竿将带你认识鲫鱼。':['B07','B08'].includes(journey.bait)?'本竿由指定目标覆盖，尺寸与外观仍在开始时抽选。':journey.dryStreak[journey.region]>=8&&missing.length?'本竿优先遇到本区未发现条目。':`正常鱼 ${(probabilities[0]!*100).toFixed(1)}% · 奇珍异兽 ${(probabilities[1]!*100).toFixed(1)}% · 遗物 ${(probabilities[2]!*100).toFixed(1)}%`}</p><p>普通鱼先选稀有层：常见 60%、少见 26%、稀有 11%、珍奇 3%；偏好饵只改变同层权重。</p><p>原色外观连续 {journey.variantStreak}/39 次；连续 39 次原色后，下一尾支持变体的收获为珠光。</p></details>
        <details><summary>补充鱼饵</summary>{BAITS.filter(item=>item.id!=='B01'&&item.id!=='B08').map(item=><div className="dsh-fisher-shop-row" key={item.id}><div><b>{item.name}</b><small>已有 {journey.baits[item.id]??0} · {item.coins} 壳币{item.tokens?` + ${item.tokens} 碎片`:''}</small></div><button disabled={blocked||data.coins<item.coins||data.tokens<item.tokens} onClick={()=>void controller.action({type:'bait.buy',bait:item.id,quantity:1})}>买 1 份</button></div>)}</details>
      </fieldset>
      <fieldset><legend>顺着潮水</legend><p>当前 {TIDE_NAMES[tide]} · {journey.tideOverride?`覆盖剩余 ${journey.tideOverride.remaining} 竿`:`再完成 ${12-journey.tideFinals%12} 竿换潮`}</p><p>浮光让珠光、星砂更常见；奇潮偏向奇珍异兽。选择后覆盖未来 3 竿，替换覆盖不退碎片。</p>
        <div className="dsh-fisher-actions">{TIDES.map(item=><button key={item} disabled={blocked||!idle||(journey.tideTrialUsed&&data.tokens<1)} onClick={()=>void controller.action({type:'tide.choose',tide:item})}>{TIDE_NAMES[item]} · {journey.tideTrialUsed?'1 碎片':'免费体验'}</button>)}</div>
      </fieldset>
      <fieldset><legend>鱼具小铺</legend>{(['rod','line','float'] as const).map(slot=><details key={slot} open={slot==='rod'}><summary>{slot==='rod'?'鱼竿':slot==='line'?'鱼线':'浮漂'} · {GEAR.find(item=>item.id===journey.loadout[slot])!.name}</summary>
        {GEAR.filter(item=>item.slot===slot).map(item=>{const owned=journey.ownedGear.includes(item.id),equipped=journey.loadout[slot]===item.id;return <div key={item.id} className="dsh-fisher-shop-row">{GEAR_ART[item.id]&&<img className="dsh-fisher-gear-art" src={`${API}/assets/${GEAR_ART[item.id]}`} alt={item.name} loading="lazy"/>}<div><b>{item.name}</b><small>{item.description}</small><small>{owned?'已拥有':`${item.price} 壳币 · Lv.${item.level}`}</small></div>
          <button disabled={blocked||equipped||(owned?!idle:level.level<item.level||data.coins<item.price)} onClick={()=>void controller.action({type:owned?'gear.equip':'gear.buy',gear:item.id})}>{equipped?'已装备':owned?'装备':'购买'}</button></div>;})}</details>)}</fieldset>
    </section>;
  };
}
