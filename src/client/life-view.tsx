import type * as ReactTypes from 'react';
import type { Bootstrap } from '../protocol.ts';
import { SPECIES, VARIANT_NAMES, region, species } from '../game/content.ts';
import type { SpeciesId, Variant } from '../game/content.ts';
import type { Catch } from '../game/engine.ts';
import { QUESTS, questDefinition } from '../game/quests.ts';
import type { Quest } from '../game/quests.ts';
import { displayed, goalDescription, goalProgress } from '../game/goals.ts';
import { ACHIEVEMENTS, achievementProgress } from '../game/achievements.ts';
import { GUESTS, guestEligible, guestGoal } from '../game/guests.ts';
import type { GuestDefinition } from '../game/guests.ts';
import { DECOR, DECOR_SLOTS, THEMES, SLOT_NAMES, THEME_NAMES, isDecorId } from '../game/decor.ts';
import { FRAME_IDS, FRAME_NAMES, frameAvailable } from '../game/life.ts';
import type { GameController } from './controller.ts';
import { API } from '../protocol.ts';
import { guestPicture,DECOR_ART } from '../game/visuals.ts';
import { thumbnailAsset } from '../game/art.ts';
import { createShowcase } from './showcase.tsx';
import { createDialog } from './dialog.tsx';
import { createHelp,createPager } from './compact-ui.tsx';

interface Props { data:Bootstrap; controller:GameController; blocked:boolean; onFish:()=>void; reducedMotion?:boolean; lowPerformance?:boolean }
type Art = ReactTypes.ComponentType<{id:SpeciesId;variant?:Variant|null;large?:boolean}>;
const rewardText=(coins:number,tokens:number)=>[coins?`${coins} 壳币`:'',tokens?`${tokens} 潮汐碎片`:''].filter(Boolean).join(' · ');
const catchLabel=(item:Catch)=>`${species(item.speciesId).name}${item.lengthMm===null?'':` ${(item.lengthMm/10).toFixed(1)} cm`}${item.variant?` · ${VARIANT_NAMES[item.variant]}`:''} · ${item.id.slice(-5)}`;
const protectedCatch=(item:Catch)=>item.isNew||item.isNewVariant||item.isRecord;

export function createLifeView(React:typeof ReactTypes,FishArt:Art) {
  const Showcase=createShowcase(React),Dialog=createDialog(React),Help=createHelp(React),Pager=createPager(React);
  function QuestCard({quest,data,controller,blocked}:{quest:Quest}&Omit<Props,'onFish'>) {
    const [skipping,setSkipping]=React.useState(false);
    const [selected,setSelected]=React.useState<string[]>([]);
    const [confirmed,setConfirmed]=React.useState(false);
    const status=goalProgress(quest,data),definition=questDefinition(quest.template);
    const target=quest.goal.kind==='deliver'?quest.goal.species:null;
    const choices=data.inventory.filter(item=>item.speciesId===target);
    const chosen=choices.filter(item=>selected.includes(item.id)&&!item.locked&&!displayed(data,item.id));
    const needsConfirmation=chosen.some(protectedCatch);
    const canClaim=status.ready&&(!target||(chosen.length===3&&(!needsConfirmation||confirmed)));
    return <article className="dsh-fisher-paper-card" aria-label={definition.name}>
      <div className="dsh-fisher-card-heading"><small>{quest.status==='offered'?'待接取':status.ready?'可完成':'进行中'}</small></div>
      <p>{goalDescription(quest.goal)}</p><small>报酬：{rewardText(quest.reward.coins,quest.reward.tokens)}</small>
      {quest.status==='active'&&<><p className="dsh-fisher-goal-progress">进度 {status.current}/{status.total}</p>
        {target&&<fieldset className="dsh-fisher-delivery"><legend>选定交付个体 · {chosen.length}/3</legend>
          {!choices.length&&<p>背包里还没有{species(target).name}。</p>}
          {choices.map(item=>{const unavailable=item.locked||displayed(data,item.id),checked=chosen.some(value=>value.id===item.id);return <label key={item.id} className="dsh-fisher-check-row">
            <input type="checkbox" disabled={blocked||unavailable||(!checked&&chosen.length===3)} checked={checked} onChange={event=>{setSelected(event.target.checked?[...chosen.map(item=>item.id),item.id]:selected.filter(id=>id!==item.id));setConfirmed(false);}}/>
            <span>{catchLabel(item)}<small>{item.locked?'已锁定':displayed(data,item.id)?'展示中，请先取回':protectedCatch(item)?'新发现、外观或纪录个体':'可交付'}</small></span>
          </label>;})}
          {needsConfirmation&&<label className="dsh-fisher-check-row"><input type="checkbox" checked={confirmed} disabled={blocked} onChange={event=>setConfirmed(event.target.checked)}/><span>我确认交付选中的受保护个体，图鉴仍保留。</span></label>}
          <p>交付后会从背包移出所选的三条鱼。</p>
        </fieldset>}
      </>}
      <div className="dsh-fisher-actions"><button disabled={blocked||(quest.status==='active'&&!canClaim)} onClick={()=>void controller.action(quest.status==='offered'?{type:'quest.accept',questId:quest.id}:target?{type:'quest.claim',questId:quest.id,catchIds:chosen.map(item=>item.id),confirmed}:{type:'quest.claim',questId:quest.id})}>{quest.status==='offered'?'接下委托':target?'交付并领取':'领取委托报酬'}</button>
        <button disabled={blocked} onClick={()=>setSkipping(value=>!value)}>换一份</button></div>
      {skipping&&<div className="dsh-fisher-inline-confirm" role="alert"><p>换掉这份委托会清空它的进度，不扣货币。</p><div className="dsh-fisher-actions"><button disabled={blocked} onClick={()=>void controller.action({type:'quest.skip',questId:quest.id})}>确认换一份</button><button onClick={()=>setSkipping(false)}>继续留着</button></div></div>}
    </article>;
  }
  function GuestCard({definition,data,controller,blocked,onFish,portraitOpen,onPortraitOpen}:{definition:GuestDefinition;portraitOpen:boolean;onPortraitOpen:()=>void}&Props) {
    const state=data.life.guests[definition.id];
    const [pane,setPane]=React.useState<'visit'|'request'|'story'|'outfit'>(state.stage?'visit':'request'),[story,setStory]=React.useState(0);
    const [route,setRoute]=React.useState<'record'|'catches'>('catches');
    const [line,setLine]=React.useState(0);
    const next=guestGoal(definition.id,state.stage,route),status=state.task?goalProgress(state.task,data):null;
    const eligible=guestEligible(definition.id,data),invitation=data.journey.invitations.includes(definition.id);
    const goInvite=async()=>{
      await controller.action({type:'guest.prepare',guest:definition.id});
      const result=controller.getSnapshot();
      if(!result.error&&result.data?.journey.bait==='B08'&&result.data.journey.target===definition.id)onFish();
    };
    return <article className="dsh-fisher-paper-card" aria-label={`${definition.name}的来客手记`}>
      <div className="dsh-fisher-guest-heading">{state.stage>0&&guestPicture(definition.id,state.outfit,'chibi')?<img className="dsh-fisher-guest-thumbnail" src={`${API}/assets/${thumbnailAsset(guestPicture(definition.id,state.outfit,'chibi')!)}`} alt={definition.name} loading="lazy" decoding="async"/>:<FishArt id={definition.id}/>}<div><small>{region(definition.region).name}</small><h3>{definition.name}</h3><p>{['尚未相遇','初识','熟络','常客'][state.stage]}</p></div></div>
      <nav className="dsh-fisher-subtabs" aria-label="来客详情分类">{([['visit','闲聊'],['request','请求'],['story','故事'],['outfit','衣装']] as const).map(([id,label])=><button key={id} aria-pressed={pane===id} disabled={id==='visit'?state.stage===0:id==='story'?state.stage<2:id==='outfit'?state.stage===0:false} onClick={()=>setPane(id)}>{label}</button>)}</nav>
      {pane==='visit'&&state.stage>0&&<>
        <p className="dsh-fisher-dialogue" role="status">“{definition.lines[2+line%4]}”</p>
        <div className="dsh-fisher-actions"><button onClick={()=>setLine(value=>value+1)}>聊一句</button><button disabled={blocked} onClick={()=>void controller.action({type:'guest.visit',guest:data.life.visitor===definition.id?null:definition.id})}>{data.life.visitor===definition.id?'让来客先歇歇':'请到岸边坐坐'}</button></div>
      </>}
      {pane==='request'&&<>
      {state.stage===0&&<p>{definition.requirement}{eligible?' · 前提已满足':''}</p>}
      {state.task&&status?<div className="dsh-fisher-guest-request"><h4>{state.stage===0?'邀请请求':'来客的小请求'}</h4><p>{goalDescription(state.task.goal)}</p><p>进度 {status.current}/{status.total} · 长期保留</p><button disabled={blocked||!status.ready} onClick={()=>void controller.action({type:'guest.claim',guest:definition.id})}>{state.stage===0?'领取来客邀请':'完成请求，读下一页'}</button></div>
        :state.stage===0&&state.invitationEarned?<div className="dsh-fisher-guest-request"><p>{invitation?'邀请已经备好。寄出后会切换钓点，请再抛竿迎接。':'来客正在这一竿里，处理完这一竿即可。'}</p><button disabled={blocked||!invitation||!!data.active||!!data.pending} onClick={()=>void goInvite()}>寄出邀请，去钓点</button></div>
          :next&&<div className="dsh-fisher-guest-request"><h4>{state.stage===0?'邀请请求':'下一页故事'}</h4>
            {definition.id==='G002'&&state.stage===1&&<label>这次想试试<select aria-label="鲸汐请求的完成方式" value={route} disabled={blocked} onChange={event=>setRoute(event.target.value==='record'?'record':'catches')}><option value="catches">在深潜海成功 12 竿</option><option value="record">刷新一次已有长度纪录</option></select></label>}
            <p>{goalDescription(next)}</p><button disabled={blocked||(state.stage===0&&!eligible)} onClick={()=>void controller.action({type:'guest.accept',guest:definition.id,route})}>接下来客请求</button></div>}
      {state.stage>0&&<small>重访无需鱼饵，不重复领取首次相遇的奖励。</small>}
      </>}
      {pane==='story'&&state.stage>=2&&<><nav className="dsh-fisher-subtabs" aria-label="故事页码"><button aria-pressed={story===0} onClick={()=>setStory(0)}>第一页</button><button disabled={state.stage<3} aria-pressed={story===1} onClick={()=>setStory(1)}>第二页</button></nav><p className="dsh-fisher-story">{definition.stories[story]}</p></>}
      {pane==='outfit'&&state.stage>0&&<><div className="dsh-fisher-portrait"><button aria-haspopup="dialog" onClick={onPortraitOpen}>查看来客立绘</button></div><label className="dsh-fisher-select-row">来客衣装<select aria-label={`${definition.name}的衣装`} value={state.outfit} disabled={blocked} onChange={event=>void controller.action({type:'guest.outfit',guest:definition.id,outfit:event.target.value==='alternate'?'alternate':'base'})}><option value="base">初见衣装</option><option value="alternate" disabled={state.stage<3}>{definition.alternate}{state.stage<3?' · 常客时解锁':''}</option></select></label></>}
      {portraitOpen&&<Dialog title={`${definition.name} · ${state.outfit==='base'?'初见衣装':definition.alternate}`} onClose={onPortraitOpen}><div className="dsh-fisher-portrait"><img src={`${API}/assets/${guestPicture(definition.id,state.outfit,'portrait')}`} alt={`${definition.name}的立绘`} decoding="async"/></div></Dialog>}
    </article>;
  }
  function Display({data,controller,blocked,reducedMotion=false,lowPerformance=false}:Omit<Props,'onFish'>) {
    const [area,setArea]=React.useState<'aquarium'|'shelf'|'decor'|'shop'|null>(null),[page,setPage]=React.useState(0),[theme,setTheme]=React.useState<(typeof THEMES)[number]>(THEMES[0]!);
    const creatures=data.inventory.filter(item=>species(item.speciesId).creature),objects=data.inventory.filter(item=>!species(item.speciesId).creature);
    const relics=SPECIES.filter(item=>item.kind==='relic'&&data.catalog[item.id]);
    const names={aquarium:'布置鱼缸',shelf:'整理陈列架',decor:'码头与卡片',shop:'装饰小铺'};
    return <>
      <div className="dsh-fisher-card-heading">{area?<button onClick={()=>{setArea(null);setPage(0);}}>‹ 返回展示</button>:<h3>喜欢的相遇，就留在眼前</h3>}<Help label="展示说明"><p>展示中的个体仍占背包格，取回后才可出售、放流或交付。遗物可以直接放上陈列架。同主题集齐六件装饰，解锁对应收获卡样式。</p></Help></div>
      {!area&&<><Showcase data={data} reducedMotion={reducedMotion} lowPerformance={lowPerformance}/><div className="dsh-fisher-menu-grid">{(Object.keys(names) as (keyof typeof names)[]).map(id=><button key={id} onClick={()=>{setArea(id);setPage(0);}}>{names[id]}</button>)}</div></>}
      {area==='aquarium'&&<><h3>鱼缸 · {data.life.aquarium.filter(Boolean).length}/8</h3><div className="dsh-fisher-display-grid">{data.life.aquarium.slice(page*4,page*4+4).map((id,index)=>{const slot=page*4+index,item=creatures.find(item=>item.id===id);return <div key={slot} className="dsh-fisher-display-slot">
        {item?<FishArt id={item.speciesId} variant={item.variant}/>:<div className="dsh-fisher-vacant" aria-hidden="true">≈</div>}
        <label>第 {slot+1} 格<select aria-label={`鱼缸第 ${slot+1} 格`} value={id??''} disabled={blocked} onChange={event=>void controller.action({type:'display.aquarium',slot,catchId:event.target.value||null})}><option value="">留一片水</option>{creatures.map(item=><option value={item.id} key={item.id}>{catchLabel(item)}{data.life.aquarium.includes(item.id)?' · 已在鱼缸':''}</option>)}</select></label>
      </div>;})}</div><Pager page={page} count={2} onChange={setPage}/></>}
      {area==='shelf'&&<><h3>陈列架 · {data.life.shelf.filter(Boolean).length}/6</h3><div className="dsh-fisher-display-grid">{data.life.shelf.slice(page*4,page*4+4).map((entry,index)=>{const slot=page*4+index,caught=entry?.kind==='catch'?objects.find(item=>item.id===entry.id):null,def=entry?.kind==='relic'?species(entry.id):caught?species(caught.speciesId):null;return <div key={slot} className="dsh-fisher-display-slot">
        {def?<FishArt id={def.id}/>:<div className="dsh-fisher-vacant" aria-hidden="true">·</div>}
        <label>第 {slot+1} 层<select aria-label={`陈列架第 ${slot+1} 层`} value={entry?`${entry.kind}:${entry.id}`:''} disabled={blocked} onChange={event=>{const value=event.target.value,item=objects.find(item=>`catch:${item.id}`===value),relic=relics.find(item=>`relic:${item.id}`===value);if(!value||item||relic)void controller.action({type:'display.shelf',slot,item:item?{kind:'catch',id:item.id}:relic?{kind:'relic',id:relic.id}:null});}}><option value="">空一层</option>{objects.map(item=><option key={item.id} value={`catch:${item.id}`}>{catchLabel(item)}</option>)}{relics.map(item=><option key={item.id} value={`relic:${item.id}`}>{item.name} · 遗物</option>)}</select></label>
      </div>;})}</div><Pager page={page} count={2} onChange={setPage}/></>}
      {area==='decor'&&<>{DECOR_SLOTS.map(slot=><label className="dsh-fisher-select-row" key={slot}>{SLOT_NAMES[slot]}<select aria-label={`布置${SLOT_NAMES[slot]}`} value={data.life.decor[slot]??''} disabled={blocked} onChange={event=>{const value=event.target.value;if(!value||isDecorId(value))void controller.action({type:'decor.equip',slot,decor:isDecorId(value)?value:null});}}><option value="">海岸原样</option>{DECOR.filter(item=>item.slot===slot&&data.life.ownedDecor.includes(item.id)).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>)}<label className="dsh-fisher-select-row">收获卡样式<select aria-label="收获卡样式" value={data.life.frame} disabled={blocked} onChange={event=>{const frame=FRAME_IDS.find(id=>id===event.target.value);if(frame)void controller.action({type:'frame.select',frame});}}>{FRAME_IDS.map(id=><option key={id} value={id} disabled={!frameAvailable(data.life,id)}>{FRAME_NAMES[id]}{frameAvailable(data.life,id)?'':' · 未解锁'}</option>)}</select></label></>}
      {area==='shop'&&<><nav className="dsh-fisher-subtabs" aria-label="装饰主题">{THEMES.map(id=><button key={id} aria-pressed={theme===id} onClick={()=>{setTheme(id);setPage(0);}}>{THEME_NAMES[id]}</button>)}</nav>{DECOR.filter(item=>item.theme===theme).slice(page*3,page*3+3).map(item=>{const owned=data.life.ownedDecor.includes(item.id);return <div className="dsh-fisher-shop-row" key={item.id}><img className="dsh-fisher-gear-art" src={`${API}/assets/${thumbnailAsset(DECOR_ART[item.id]!)}`} alt=""/><div><b>{item.name}</b><small>{SLOT_NAMES[item.slot]} · {item.price} 壳币</small></div><button aria-label={`${owned?'已拥有':'购买'}${item.name}`} disabled={blocked||owned||data.coins<item.price} onClick={()=>void controller.action({type:'decor.buy',decor:item.id})}>{owned?'已拥有':'购买'}</button></div>})}<Pager page={page} count={2} onChange={setPage}/></>}
    </>;
  }
  return function LifeView(props:Props) {
    const [section,setSection]=React.useState<'quests'|'achievements'|'guests'|'display'|null>(null),[selected,setSelected]=React.useState<string|null>(null),[page,setPage]=React.useState(0),[portrait,setPortrait]=React.useState(false);
    const {data,controller,blocked}=props,life=data.life,readyAchievements=life.achievements.length-life.claimedAchievements.length;
    const names={quests:'委托',achievements:'成就',guests:'来客',display:'展示'};
    const summaries={quests:`${life.quests.filter(q=>q.status==='active').length} 份进行中`,achievements:`达成 ${life.achievements.length}/24${readyAchievements?` · ${readyAchievements} 项待领`:''}`,guests:`${GUESTS.filter(g=>life.guests[g.id].stage>0).length} 位相识`,display:`鱼缸 ${life.aquarium.filter(Boolean).length}/8 · 陈列 ${life.shelf.filter(Boolean).length}/6`};
    const quest=section==='quests'?life.quests.find(item=>item.id===selected):undefined;
    const achievement=section==='achievements'?ACHIEVEMENTS.find(item=>item.id===selected):undefined;
    const visitor=section==='guests'?GUESTS.find(item=>item.id===selected):undefined;
    const detailed=!!(quest||achievement||visitor);
    const open=(id:NonNullable<typeof section>)=>{controller.pause();setSection(id);setSelected(null);setPage(0);setPortrait(false);};
    return <section className="dsh-fisher-collection dsh-fisher-life" aria-label="海岸手记">
      <div className="dsh-fisher-collection-intro"><h3>海岸上的小事，慢慢记</h3><small>已完成 {life.questsCompleted} 份委托 · {QUESTS.length} 种故事起点</small></div>
      <div className="dsh-fisher-guests-strip">{GUESTS.map(definition=><button key={definition.id} aria-label={`查看${definition.name}的手记`} onClick={()=>{open('guests');setSelected(definition.id);}}><img src={`${API}/assets/${thumbnailAsset(guestPicture(definition.id,life.guests[definition.id].outfit,'chibi')!)}`} alt=""/><small>{definition.name}</small></button>)}</div>
      <div className="dsh-fisher-menu-grid">{(Object.keys(names) as (keyof typeof names)[]).map((id,index)=><button key={id} className="dsh-fisher-menu-button" aria-haspopup="dialog" onClick={()=>open(id)}><small>0{index+1} / {names[id]}</small><strong>{summaries[id]}</strong><span aria-hidden="true">↗</span></button>)}</div>
      {section&&<Dialog title={quest?questDefinition(quest.template).name:achievement?achievement.name:visitor?`${visitor.name}的手记`:names[section]} busy={controller.getSnapshot().busy} error={controller.getSnapshot().error} onRetry={()=>void controller.retry()} closeLabel={detailed?'返回列表':'返回手记'} onClose={()=>{if(detailed){setSelected(null);setPortrait(false);}else setSection(null);}} className="dsh-fisher-life dsh-fisher-detail-window">
        {section==='quests'&&(quest?<QuestCard key={quest.id} quest={quest} data={data} controller={controller} blocked={blocked}/>:<><div className="dsh-fisher-card-heading"><small>三份委托 · 随时接下</small><Help label="委托说明"><p>委托没有到期时间。“新”收获从接下后开始记录；交付订单可用已有个体，受保护的收藏需再次确认。</p></Help></div><div className="dsh-fisher-compact-list">{life.quests.map(item=>{const status=goalProgress(item,data);return <button className="dsh-fisher-list-button" key={item.id} onClick={()=>setSelected(item.id)}><strong>{questDefinition(item.template).name}</strong><small>{goalDescription(item.goal)}</small><span>{item.status==='offered'?'待接取':status.ready?'可完成':`${status.current}/${status.total}`}</span></button>;})}</div></>)}
        {section==='achievements'&&(achievement?<article className="dsh-fisher-paper-card"><p>{achievement.description}</p><p>进度 {Math.min(achievement.total,achievementProgress(achievement.id,data))}/{achievement.total}</p><small>{rewardText(achievement.reward.coins,achievement.reward.tokens)}{achievement.id==='H12'?' · 图鉴纪念卡框':achievement.id==='H24'?' · 来客合影卡框':''}</small><button disabled={blocked||!life.achievements.includes(achievement.id)||life.claimedAchievements.includes(achievement.id)} onClick={()=>void controller.action({type:'achievement.claim',achievement:achievement.id})}>{life.claimedAchievements.includes(achievement.id)?'已领取':'领取成就奖励'}</button></article>:<><small>达成 {life.achievements.length}/24 · 待领 {readyAchievements} 项</small><div className="dsh-fisher-menu-grid">{ACHIEVEMENTS.slice(page*6,page*6+6).map(item=><button className="dsh-fisher-achievement-button" key={item.id} onClick={()=>setSelected(item.id)}><strong>{item.name}</strong><small>{life.claimedAchievements.includes(item.id)?'已领取':life.achievements.includes(item.id)?'可领取':`${Math.min(item.total,achievementProgress(item.id,data))}/${item.total}`}</small></button>)}</div><Pager page={page} count={4} onChange={setPage}/></>)}
        {section==='guests'&&(visitor?<GuestCard key={visitor.id} definition={visitor} portraitOpen={portrait} onPortraitOpen={()=>setPortrait(value=>!value)} {...props}/>:<div className="dsh-fisher-menu-grid">{GUESTS.map(definition=><button key={definition.id} className="dsh-fisher-guest-button" onClick={()=>setSelected(definition.id)}><img className="dsh-fisher-guest-thumbnail" src={`${API}/assets/${thumbnailAsset(guestPicture(definition.id,life.guests[definition.id].outfit,'chibi')!)}`} alt=""/><strong>{definition.name}</strong><small>{['尚未相遇','初识','熟络','常客'][life.guests[definition.id].stage]}</small></button>)}</div>)}
        {section==='display'&&<Display data={data} controller={controller} blocked={blocked} reducedMotion={props.reducedMotion??false} lowPerformance={props.lowPerformance??false}/>}
      </Dialog>}
    </section>;
  };
}
