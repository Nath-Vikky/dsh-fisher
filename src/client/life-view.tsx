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
import type { GuestDefinition,GuestId } from '../game/guests.ts';
import { DECOR, DECOR_SLOTS, THEMES, SLOT_NAMES, THEME_NAMES, isDecorId } from '../game/decor.ts';
import { FRAME_IDS, FRAME_NAMES, frameAvailable } from '../game/life.ts';
import type { GameController } from './controller.ts';
import { API } from '../protocol.ts';
import { guestPicture,DECOR_ART } from '../game/visuals.ts';
import { thumbnailAsset } from '../game/art.ts';
import { createShowcase } from './showcase.tsx';

interface Props { data:Bootstrap; controller:GameController; blocked:boolean; onFish:()=>void; reducedMotion?:boolean; lowPerformance?:boolean }
type Art = ReactTypes.ComponentType<{id:SpeciesId;variant?:Variant|null;large?:boolean}>;
const rewardText=(coins:number,tokens:number)=>[coins?`${coins} 壳币`:'',tokens?`${tokens} 潮汐碎片`:''].filter(Boolean).join(' · ');
const catchLabel=(item:Catch)=>`${species(item.speciesId).name}${item.lengthMm===null?'':` ${(item.lengthMm/10).toFixed(1)} cm`}${item.variant?` · ${VARIANT_NAMES[item.variant]}`:''} · ${item.id.slice(-5)}`;
const protectedCatch=(item:Catch)=>item.isNew||item.isNewVariant||item.isRecord;

export function createLifeView(React:typeof ReactTypes,FishArt:Art) {
  const Showcase=createShowcase(React);
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
      <div className="dsh-fisher-card-heading"><h3>{definition.name}</h3><small>{quest.status==='offered'?'待接取':status.ready?'可完成':'进行中'}</small></div>
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
      {state.stage>0&&guestPicture(definition.id,state.outfit,'portrait')&&<div className="dsh-fisher-portrait"><button aria-expanded={portraitOpen} onClick={onPortraitOpen}>{portraitOpen?'收起来客立绘':'展开来客立绘'}</button>{portraitOpen&&<img src={`${API}/assets/${guestPicture(definition.id,state.outfit,'portrait')}`} alt={`${definition.name} · ${state.outfit==='base'?'初见衣装':definition.alternate}`} decoding="async"/>}</div>}
      {state.stage===0?<p>{definition.requirement}{eligible?' · 前提已满足':''}</p>:<>
        <p className="dsh-fisher-dialogue" role="status">“{definition.lines[2+line%4]}”</p>
        <div className="dsh-fisher-actions"><button onClick={()=>setLine(value=>value+1)}>聊一句</button><button disabled={blocked} onClick={()=>void controller.action({type:'guest.visit',guest:data.life.visitor===definition.id?null:definition.id})}>{data.life.visitor===definition.id?'让来客先歇歇':'请到岸边坐坐'}</button></div>
      </>}
      {state.task&&status?<div className="dsh-fisher-guest-request"><h4>{state.stage===0?'邀请请求':'来客的小请求'}</h4><p>{goalDescription(state.task.goal)}</p><p>进度 {status.current}/{status.total} · 长期保留</p><button disabled={blocked||!status.ready} onClick={()=>void controller.action({type:'guest.claim',guest:definition.id})}>{state.stage===0?'领取来客邀请':'完成请求，读下一页'}</button></div>
        :state.stage===0&&state.invitationEarned?<div className="dsh-fisher-guest-request"><p>{invitation?'邀请已经备好。寄出后会切换钓点，请再抛竿迎接。':'来客正在这一竿里，处理完这一竿即可。'}</p><button disabled={blocked||!invitation||!!data.active||!!data.pending} onClick={()=>void goInvite()}>寄出邀请，去钓点</button></div>
          :next&&<div className="dsh-fisher-guest-request"><h4>{state.stage===0?'邀请请求':'下一页故事'}</h4>
            {definition.id==='G002'&&state.stage===1&&<label>这次想试试<select aria-label="鲸汐请求的完成方式" value={route} disabled={blocked} onChange={event=>setRoute(event.target.value==='record'?'record':'catches')}><option value="catches">在深潜海成功 12 竿</option><option value="record">刷新一次已有长度纪录</option></select></label>}
            <p>{goalDescription(next)}</p><button disabled={blocked||(state.stage===0&&!eligible)} onClick={()=>void controller.action({type:'guest.accept',guest:definition.id,route})}>接下来客请求</button></div>}
      {state.stage>=2&&<details className="dsh-fisher-story"><summary>相遇故事 · 第一页</summary><p>{definition.stories[0]}</p></details>}
      {state.stage===3&&<><details className="dsh-fisher-story"><summary>相遇故事 · 第二页</summary><p>{definition.stories[1]}</p></details><label className="dsh-fisher-select-row">来客衣装<select aria-label={`${definition.name}的衣装`} value={state.outfit} disabled={blocked} onChange={event=>void controller.action({type:'guest.outfit',guest:definition.id,outfit:event.target.value==='alternate'?'alternate':'base'})}><option value="base">初见衣装</option><option value="alternate">{definition.alternate}</option></select></label></>}
      {state.stage>0&&<small>重访无需鱼饵，不重复领取首次相遇的奖励。</small>}
    </article>;
  }
  function Display({data,controller,blocked,reducedMotion=false,lowPerformance=false}:Omit<Props,'onFish'>) {
    const creatures=data.inventory.filter(item=>species(item.speciesId).creature),objects=data.inventory.filter(item=>!species(item.speciesId).creature);
    const relics=SPECIES.filter(item=>item.kind==='relic'&&data.catalog[item.id]);
    return <>
      <div className="dsh-fisher-collection-intro"><h3>把喜欢的相遇留在眼前</h3><p>展示中的个体留在背包，占一个格子；取回后才可出售、放流或交付。</p></div>
      <Showcase data={data} reducedMotion={reducedMotion} lowPerformance={lowPerformance}/>
      <fieldset><legend>鱼缸 · {data.life.aquarium.filter(Boolean).length}/8</legend>
        <div className="dsh-fisher-display-grid">{data.life.aquarium.map((id,slot)=>{const item=creatures.find(item=>item.id===id);return <div key={slot} className="dsh-fisher-display-slot">
          {item?<FishArt id={item.speciesId} variant={item.variant}/>:<div className="dsh-fisher-vacant" aria-hidden="true">≈</div>}
          <label>第 {slot+1} 格<select aria-label={`鱼缸第 ${slot+1} 格`} value={id??''} disabled={blocked} onChange={event=>void controller.action({type:'display.aquarium',slot,catchId:event.target.value||null})}><option value="">留一片水</option>{creatures.map(item=><option value={item.id} key={item.id}>{catchLabel(item)}{data.life.aquarium.includes(item.id)?' · 已在鱼缸':''}</option>)}</select></label>
        </div>;})}</div>
      </fieldset>
      <fieldset><legend>陈列架 · {data.life.shelf.filter(Boolean).length}/6</legend>
        <div className="dsh-fisher-display-grid">{data.life.shelf.map((entry,slot)=>{const caught=entry?.kind==='catch'?objects.find(item=>item.id===entry.id):null,def=entry?.kind==='relic'?species(entry.id):caught?species(caught.speciesId):null;return <div key={slot} className="dsh-fisher-display-slot">
          {def?<FishArt id={def.id}/>:<div className="dsh-fisher-vacant" aria-hidden="true">·</div>}
          <label>第 {slot+1} 层<select aria-label={`陈列架第 ${slot+1} 层`} value={entry?`${entry.kind}:${entry.id}`:''} disabled={blocked} onChange={event=>{
            const value=event.target.value,item=objects.find(item=>`catch:${item.id}`===value),relic=relics.find(item=>`relic:${item.id}`===value);
            if(!value||item||relic)void controller.action({type:'display.shelf',slot,item:item?{kind:'catch',id:item.id}:relic?{kind:'relic',id:relic.id}:null});
          }}><option value="">空一层</option>{objects.map(item=><option key={item.id} value={`catch:${item.id}`}>{catchLabel(item)}</option>)}{relics.map(item=><option key={item.id} value={`relic:${item.id}`}>{item.name} · 遗物</option>)}</select></label>
        </div>;})}</div>
      </fieldset>
      <fieldset><legend>码头布置</legend>
        {DECOR_SLOTS.map(slot=><label className="dsh-fisher-select-row" key={slot}>{SLOT_NAMES[slot]}<select aria-label={`布置${SLOT_NAMES[slot]}`} value={data.life.decor[slot]??''} disabled={blocked} onChange={event=>{const value=event.target.value;if(!value||isDecorId(value))void controller.action({type:'decor.equip',slot,decor:isDecorId(value)?value:null});}}><option value="">海岸原样</option>{DECOR.filter(item=>item.slot===slot&&data.life.ownedDecor.includes(item.id)).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>)}
        <p>同一主题集齐六件，就能选用对应的收获卡样式。</p>
        <label className="dsh-fisher-select-row">收获卡样式<select aria-label="收获卡样式" value={data.life.frame} disabled={blocked} onChange={event=>{const frame=FRAME_IDS.find(id=>id===event.target.value);if(frame)void controller.action({type:'frame.select',frame});}}>{FRAME_IDS.map(id=><option key={id} value={id} disabled={!frameAvailable(data.life,id)}>{FRAME_NAMES[id]}{frameAvailable(data.life,id)?'':' · 未解锁'}</option>)}</select></label>
      </fieldset>
      <fieldset><legend>装饰小铺 · {data.life.ownedDecor.length}/24</legend>{THEMES.map(theme=><details key={theme}><summary>{THEME_NAMES[theme]} · {DECOR.filter(item=>item.theme===theme&&data.life.ownedDecor.includes(item.id)).length}/6</summary>{DECOR.filter(item=>item.theme===theme).map(item=>{const owned=data.life.ownedDecor.includes(item.id);return <div className="dsh-fisher-shop-row" key={item.id}>{DECOR_ART[item.id]&&<img className="dsh-fisher-gear-art" src={`${API}/assets/${thumbnailAsset(DECOR_ART[item.id]!)}`} alt="" loading="lazy" decoding="async"/>}<div><b>{item.name}</b><small>{SLOT_NAMES[item.slot]} · {item.price} 壳币</small></div><button aria-label={`${owned?'已拥有':'购买'}${item.name}`} disabled={blocked||owned||data.coins<item.price} onClick={()=>void controller.action({type:'decor.buy',decor:item.id})}>{owned?'已拥有':'购买'}</button></div>;})}</details>)}</fieldset>
    </>;
  }
  return function LifeView(props:Props) {
    const [tab,setTab]=React.useState<'quests'|'achievements'|'guests'|'display'>('quests');
    const [portrait,setPortrait]=React.useState<GuestId|null>(null);
    const {data,controller,blocked}=props,life=data.life;
    const readyAchievements=life.achievements.length-life.claimedAchievements.length;
    return <section className="dsh-fisher-collection dsh-fisher-life" aria-label="海岸手记">
      <nav className="dsh-fisher-subtabs" aria-label="手记分类">{([['quests','委托'],['achievements','成就'],['guests','来客'],['display','展示']] as const).map(([id,name])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{name}{id==='achievements'&&readyAchievements>0?<small> {readyAchievements}</small>:null}</button>)}</nav>
      {tab==='quests'&&<><div className="dsh-fisher-collection-intro"><h3>海风带来的小事</h3><p>三份委托随时等你，没有到期时间。“新”收获从接下后开始记录。</p><small>已完成 {life.questsCompleted} 份 · {QUESTS.length} 种委托</small></div>{life.quests.map(quest=><QuestCard key={quest.id} quest={quest} data={data} controller={controller} blocked={blocked}/>)}</>}
      {tab==='achievements'&&<><div className="dsh-fisher-collection-intro"><h3>走过的海岸，都记得</h3><p>达成 {life.achievements.length}/24 · 待领 {readyAchievements} 项</p></div>{ACHIEVEMENTS.map(item=>{const unlocked=life.achievements.includes(item.id),claimed=life.claimedAchievements.includes(item.id),current=Math.min(item.total,achievementProgress(item.id,data));return <article className="dsh-fisher-paper-card" key={item.id}><div className="dsh-fisher-card-heading"><h3>{item.name}</h3><small>{unlocked?'已达成':`${current}/${item.total}`}</small></div><p>{item.description}</p><small>{rewardText(item.reward.coins,item.reward.tokens)}{item.id==='H12'?' · 图鉴纪念卡框':item.id==='H24'?'来客合影卡框':''}</small><button disabled={blocked||!unlocked||claimed} onClick={()=>void controller.action({type:'achievement.claim',achievement:item.id})}>{claimed?'已领取':'领取成就奖励'}</button></article>;})}</>}
      {tab==='guests'&&<><div className="dsh-fisher-collection-intro"><h3>岸边总有一个位置</h3><p>接下请求、迎接来客，再慢慢认识。来客的请求和故事都会留下。</p></div>{GUESTS.map(definition=><GuestCard key={definition.id} definition={definition} portraitOpen={portrait===definition.id} onPortraitOpen={()=>setPortrait(portrait===definition.id?null:definition.id)} {...props}/>)}</>}
      {tab==='display'&&<Display data={data} controller={controller} blocked={blocked} reducedMotion={props.reducedMotion??false} lowPerformance={props.lowPerformance??false}/>}
    </section>;
  };
}
