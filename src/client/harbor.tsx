import type * as ReactTypes from 'react';
import { API } from '../protocol.ts';
import type { Bootstrap } from '../protocol.ts';
import { REGIONS, SPECIES, isSpeciesId,region } from '../game/content.ts';
import { BAITS, TIDES, TIDE_NAMES, bait, currentTide, isBaitId, levelInfo, regionUnlocked } from '../game/progression.ts';
import { GEAR, GEAR_ART,gear } from '../game/gear.ts';
import { categoryProbabilities, preferenceAvailable } from '../game/encounters.ts';
import type { GameController } from './controller.ts';
import { SUPPLY_BAITS } from '../game/work.ts';
import type { SupplyBait } from '../game/work.ts';
import { createScene } from './coast-scene.tsx';
import { createStorageView } from './storage-view.tsx';
import { createDialog } from './dialog.tsx';
import { createHelp,createPager } from './compact-ui.tsx';
import { BAIT_ART,SCENE_ART } from '../game/visuals.ts';
import { thumbnailAsset } from '../game/art.ts';

export function createHarbor(React:typeof ReactTypes) {
  const Scene=createScene(React),Storage=createStorageView(React),Dialog=createDialog(React),Help=createHelp(React),Pager=createPager(React);
  const names={location:'选择钓点',bait:'鱼饵盒',tide:'潮相',gear:'鱼具小铺',work:'DSH 补给',storage:'本机存档'};
  return function Harbor({data,controller,blocked,lowPerformance,reducedMotion,storageBusy}:{data:Bootstrap;controller:GameController;blocked:boolean;lowPerformance:boolean;reducedMotion:boolean;storageBusy:boolean}) {
    const [section,setSection]=React.useState<keyof typeof names|null>(null),[supplyBait,setSupplyBait]=React.useState<SupplyBait>('B02');
    const [baitShop,setBaitShop]=React.useState(false),[slot,setSlot]=React.useState<'rod'|'line'|'float'>('rod'),[page,setPage]=React.useState(0);
    const journey=data.journey,idle=!data.active&&!data.pending,level=levelInfo(data.experience),tide=currentTide(journey);
    const probabilities=categoryProbabilities(journey.region,journey.bait,tide),clues=journey.completed[journey.region]>=10;
    const missing=SPECIES.filter(item=>item.region===journey.region&&item.kind!=='guest'&&!data.catalog[item.id]);
    const gearItems=GEAR.filter(item=>item.slot===slot),shopBaits=BAITS.filter(item=>item.id!=='B01'&&item.id!=='B08');
    const open=(next:keyof typeof names)=>{controller.pause();setSection(next);setPage(0);setBaitShop(false);};
    const summaries={location:region(journey.region).name,bait:bait(journey.bait).name,tide:TIDE_NAMES[tide],gear:gear(journey.loadout.rod).name,work:`${data.work.packs.length} 包待领 · ${data.work.enabled?'已开启':'未开启'}`,storage:`${data.inventory.length} 件收藏 · 本机保存`};
    return <section className="dsh-fisher-collection dsh-fisher-harbor" aria-label="码头整备">
      <div className="dsh-fisher-collection-intro"><h3>下一竿，去哪里坐坐</h3><small>手册 Lv.{level.level} · 研究 {data.research}</small></div>
      <div className="dsh-fisher-scene dsh-fisher-harbor-scene"><Scene data={data} lowPerformance={lowPerformance} reducedMotion={reducedMotion} quiet paused={!!section}/></div>
      <div className="dsh-fisher-menu-grid">{(Object.keys(names) as (keyof typeof names)[]).map((id,index)=><button key={id} className="dsh-fisher-menu-button" aria-haspopup="dialog" onClick={()=>open(id)}><small>0{index+1} / {names[id]}</small><strong>{summaries[id]}</strong><span aria-hidden="true">↗</span></button>)}</div>
      {section&&<Dialog title={names[section]} busy={controller.getSnapshot().busy} error={controller.getSnapshot().error} onRetry={()=>void controller.retry()} onClose={()=>setSection(null)} className="dsh-fisher-harbor dsh-fisher-detail-window">
        {section==='work'&&<>
          <div className="dsh-fisher-card-heading"><label className="dsh-fisher-toggle"><input type="checkbox" checked={data.work.enabled} disabled={blocked} onChange={event=>void controller.action({type:'work.enable',enabled:event.target.checked})}/>启用 DSH 工作补给</label><Help label="DSH 补给说明"><p>仅从启用后的新活动累计，只观察回合边界与事件到达，不读取聊天内容，不发起模型请求。关闭小窗仍可积累，关闭开关或禁用插件停止观察。</p><p>每180秒活动 +2 足迹；完整回合 +5，相邻完成奖励至少间隔60秒，多会话合并计时。每10足迹获得1包，最多储备12包，每日最多120足迹。</p><p>每包20壳币、1潮汐碎片和两份自选鱼饵；储备不会过期。下次日限额重置：{new Date(data.work.nextResetAt).toLocaleString()}。</p></Help></div>
          <div className="dsh-fisher-stat-grid"><div><strong>{data.work.packs.length}<small> / 12</small></strong><span>补给储备</span></div><div><strong>{data.work.points}<small> / 10</small></strong><span>当前足迹</span></div></div>
          <p>本日足迹 {data.work.dailyPoints}/120 · 活动 {Math.floor(data.work.activeMs/1000)}/180 秒</p>
          {(data.work.packs.length===12||data.work.dailyPoints===120)&&<p role="status">当前积分已暂停，领取储备或日限额重置后继续。</p>}
          <label>补给中的鱼饵<select aria-label="补给中的鱼饵" value={supplyBait} disabled={blocked} onChange={event=>{if(SUPPLY_BAITS.some(id=>id===event.target.value))setSupplyBait(event.target.value as SupplyBait);}}>{SUPPLY_BAITS.map(id=><option key={id} value={id}>{bait(id).name} ×2</option>)}</select></label>
          <button className="dsh-fisher-primary" disabled={blocked||!data.work.packs.length||(journey.baits[supplyBait]??0)>9997} onClick={()=>{const packId=data.work.packs[0];if(packId)void controller.action({type:'work.claim',packId,bait:supplyBait});}}>领取 1 包补给</button>
        </>}
        {section==='location'&&<><div className="dsh-fisher-location-grid">{REGIONS.map(item=>{const unlocked=regionUnlocked(item.id,data.experience,data.research),selected=journey.region===item.id;return <button key={item.id} className="dsh-fisher-location-card" aria-label={`前往${item.name}`} aria-pressed={selected} disabled={blocked||!idle||!unlocked||selected} onClick={()=>void controller.action({type:'location.select',region:item.id})}><img src={`${API}/assets/${SCENE_ART[item.id]}`} alt={`${item.name}场景`} loading="lazy"/><strong>{item.name}</strong><small>{selected?'当前码头':unlocked?'前往这里':`Lv.${item.level} · 研究 ${item.research}`}</small></button>;})}</div><p>{region(journey.region).mood}</p><small>{level.needed?`手册升级还需 ${level.needed-level.current} 经验`:'海岸故事继续累积'}</small>{!idle&&<p>处理完这一竿，再调整钓点和装备。</p>}</>}
        {section==='bait'&&<>
          <nav className="dsh-fisher-subtabs" aria-label="鱼饵分类"><button aria-pressed={!baitShop} onClick={()=>{setBaitShop(false);setPage(0);}}>选用鱼饵</button><button aria-pressed={baitShop} onClick={()=>{setBaitShop(true);setPage(0);}}>补充鱼饵</button></nav>
          {!baitShop?<>
            <label>本竿鱼饵<select aria-label="本竿鱼饵" value={journey.bait} disabled={blocked||!idle} onChange={event=>{if(isBaitId(event.target.value))void controller.action({type:'bait.select',bait:event.target.value});}}>{BAITS.map(item=><option key={item.id} value={item.id} disabled={!preferenceAvailable(journey.region,item.id)||(item.id==='B08'&&!journey.invitations.length)}>{item.name} · {item.id==='B01'?'无限':item.id==='B08'?journey.invitations.length:journey.baits[item.id]??0}</option>)}</select></label>
            <div className="dsh-fisher-item-preview">{BAIT_ART[journey.bait]&&<img className="dsh-fisher-gear-art" src={`${API}/assets/${BAIT_ART[journey.bait]}`} alt={bait(journey.bait).name}/>}<p>{bait(journey.bait).description}</p></div>
            {journey.bait==='B07'&&<label>图鉴目标<select aria-label="图鉴目标" value={journey.target??''} disabled={blocked||!idle||!clues} onChange={event=>{if(isSpeciesId(event.target.value))void controller.action({type:'bait.select',bait:'B07',target:event.target.value});}}><option value="">{clues?'选一个想认识的条目':'本区完成 10 竿后公开线索'}</option>{clues&&missing.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            {journey.bait==='B08'&&<label>邀请谁来<select aria-label="邀请谁来" value={journey.target??''} disabled={blocked||!idle} onChange={event=>{if(isSpeciesId(event.target.value))void controller.action({type:'bait.select',bait:'B08',target:event.target.value});}}><option value="">选择来客</option>{SPECIES.filter(item=>journey.invitations.includes(item.id)&&item.region===journey.region).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            <div className="dsh-fisher-card-heading"><small>这一竿的相遇机会</small><Help label="相遇机会说明"><p>{!journey.tutorialDone?'第一竿将带你认识鲫鱼。':['B07','B08'].includes(journey.bait)?'本竿由指定目标覆盖，尺寸与外观仍在开始时抽选。':journey.dryStreak[journey.region]>=8&&missing.length?'本竿优先遇到本区未发现条目。':`正常鱼 ${(probabilities[0]!*100).toFixed(1)}% · 奇珍异兽 ${(probabilities[1]!*100).toFixed(1)}% · 遗物 ${(probabilities[2]!*100).toFixed(1)}%`}</p><p>普通鱼先选稀有层：常见60%、少见26%、稀有11%、珍奇3%；偏好饵只改变同层权重。原色连续 {journey.variantStreak}/39 次，连续39次原色后，下一尾支持变体的收获为珠光。</p></Help></div>
          </>:<>{shopBaits.slice(page*3,page*3+3).map(item=><div className="dsh-fisher-shop-row" key={item.id}>{BAIT_ART[item.id]&&<img className="dsh-fisher-gear-art" src={`${API}/assets/${thumbnailAsset(BAIT_ART[item.id]!)}`} alt=""/>}<div><b>{item.name}</b><small>已有 {journey.baits[item.id]??0} · {item.coins} 壳币{item.tokens?` + ${item.tokens} 碎片`:''}</small></div><button disabled={blocked||data.coins<item.coins||data.tokens<item.tokens} onClick={()=>void controller.action({type:'bait.buy',bait:item.id,quantity:1})}>买 1 份</button></div>)}<Pager page={page} count={Math.ceil(shopBaits.length/3)} onChange={setPage}/></>}
        </>}
        {section==='tide'&&<><div className="dsh-fisher-card-heading"><h3>当前 {TIDE_NAMES[tide]}</h3><Help label="潮相说明"><p>浮光让珠光、星砂更常见；奇潮偏向奇珍异兽。选择后覆盖未来3竿，替换覆盖不退碎片。</p></Help></div><p>{journey.tideOverride?`覆盖剩余 ${journey.tideOverride.remaining} 竿`:`再完成 ${12-journey.tideFinals%12} 竿换潮`}</p><div className="dsh-fisher-menu-grid">{TIDES.map(item=><button key={item} disabled={blocked||!idle||(journey.tideTrialUsed&&data.tokens<1)} onClick={()=>void controller.action({type:'tide.choose',tide:item})}>{TIDE_NAMES[item]} · {journey.tideTrialUsed?'1 碎片':'免费体验'}</button>)}</div></>}
        {section==='gear'&&<><nav className="dsh-fisher-subtabs" aria-label="鱼具分类">{(['rod','line','float'] as const).map(id=><button key={id} aria-pressed={slot===id} onClick={()=>{setSlot(id);setPage(0);}}>{id==='rod'?'鱼竿':id==='line'?'鱼线':'浮漂'}</button>)}</nav>{gearItems.slice(page*3,page*3+3).map(item=>{const owned=journey.ownedGear.includes(item.id),equipped=journey.loadout[slot]===item.id;return <div key={item.id} className="dsh-fisher-shop-row"><img className="dsh-fisher-gear-art" src={`${API}/assets/${GEAR_ART[item.id]}`} alt={item.name}/><div><b>{item.name}</b><small>{item.description}</small><small>{owned?'已拥有':`${item.price} 壳币 · Lv.${item.level}`}</small></div><button disabled={blocked||equipped||(owned?!idle:level.level<item.level||data.coins<item.price)} onClick={()=>void controller.action({type:owned?'gear.equip':'gear.buy',gear:item.id})}>{equipped?'已装备':owned?'装备':'购买'}</button></div>})}<Pager page={page} count={Math.ceil(gearItems.length/3)} onChange={setPage}/></>}
        {section==='storage'&&<Storage data={data} controller={controller} busy={storageBusy}/>}
      </Dialog>}
    </section>;
  };
}
