import type * as ReactTypes from 'react';
import type {Bootstrap} from '../protocol.ts';
import type {GameController} from './controller.ts';
import {SPECIES,species,region,spriteName,VARIANT_NAMES} from '../game/content.ts';
import type {SpeciesId} from '../game/content.ts';
import {GUESTS,guest} from '../game/guests.ts';
import type {GuestId} from '../game/guests.ts';
import {buildingFish} from '../game/shore.ts';
import {displayed} from '../game/goals.ts';
import {hasMemorial,legendAvailable,legendPause,memorialText,PICNIC_MENUS,PICNIC_MOODS} from '../game/adventures.ts';
import type {PicnicMenu,PicnicMood} from '../game/adventures.ts';
import {createPager} from './compact-ui.tsx';
import {createItemPicker} from './item-picker.tsx';
import {createDialog} from './dialog.tsx';
import {API} from '../protocol.ts';
import {guestPicture} from '../game/visuals.ts';
import {thumbnailAsset} from '../game/art.ts';

export type AdventureArea='legend'|'picnic'|'memory';
export function createAdventureJournal(React:typeof ReactTypes){
  const Pager=createPager(React),ItemPicker=createItemPicker(React),Dialog=createDialog(React);
  return function AdventureJournal({data,controller,disabled,initialArea='legend',onPicnic,onHarbor}:{data:Bootstrap;controller:GameController;disabled:boolean;initialArea?:AdventureArea;onPicnic:()=>void;onHarbor:()=>void}){
    const [area,setArea]=React.useState<AdventureArea>(initialArea),[preparing,setPreparing]=React.useState(false),[step,setStep]=React.useState(0),[album,setAlbum]=React.useState(0),[choosingMemory,setChoosingMemory]=React.useState(false);
    const [selected,setSelected]=React.useState<string|null>(null),[confirmed,setConfirmed]=React.useState(false);
    const [visitor,setVisitor]=React.useState<GuestId>('G001'),[menu,setMenu]=React.useState<PicnicMenu>('soup'),[mood,setMood]=React.useState<PicnicMood>('quiet');
    const location=data.journey.region,memory=data.adventures.memorials[location];
    const [memoryKind,setMemoryKind]=React.useState<'letter'|'light'>(memory?.kind??'letter'),[memorySpecies,setMemorySpecies]=React.useState<SpeciesId|null>(memory?.species??null);
    const legend=data.adventures.legend,picnic=data.adventures.picnic,known=GUESTS.filter(def=>data.life.guests[def.id].stage>0);
    const candidates=data.inventory.filter(item=>buildingFish(item)&&!item.locked&&!displayed(data,item.id));
    const item=candidates.find(item=>item.id===selected),protectedItem=!!item&&(item.isNew||item.isNewVariant||item.isRecord);
    const memoryChoices=SPECIES.filter(def=>def.kind!=='guest'&&data.catalog[def.id]),chosenSpecies=memorySpecies&&memoryChoices.some(def=>def.id===memorySpecies)?memorySpecies:null;
    const chosenGuest=known.find(def=>def.id===visitor)?.id??known[0]?.id;
    const savedPicnic=data.adventures.album[Math.min(album,Math.max(0,data.adventures.album.length-1))];
    return <section className="dsh-fisher-shore-journal dsh-fisher-adventures">
      <div className="dsh-fisher-shore-tabs">{(['legend','picnic','memory'] as const).map(tab=><button key={tab} aria-pressed={area===tab} onClick={()=>{setArea(tab);setPreparing(false);}}>{({legend:'追踪传说',picnic:'岸边野餐',memory:'纪念余韵'})[tab]}</button>)}</div>
      {area==='legend'?<>
        <small>循光而来的鱼 · 一次特别相遇</small><h3>星砂宝石鱼</h3>
        {legend.stage==='unknown'?<><p>旧纪念物旁留下一个传闻：月光池的碎光，会一路游到深海。完成任意一岸故事后，可以开始追踪。</p><button className="dsh-fisher-primary" disabled={disabled||!legendAvailable(data.shore)} onClick={()=>void controller.action({type:'legend.hear'})}>把传闻记下来</button></>:<>
          <div className="dsh-fisher-story-routes"><p className="dsh-fisher-shore-next">{legend.moon?'✓':'1'} 月光池 · 浮光潮相，在睡莲池畔成功收获一竿。</p><p className="dsh-fisher-shore-next">{legend.deep?'✓':'2'} 深潜海 · 用深潜饵在深水栈台成功收获一竿。</p></div>
          {legend.stage==='heard'&&<p>{legendPause(data.adventures,data.journey)??'地点和准备已就绪，成功收获即可记下线索。'}</p>}
          {legend.stage==='ready'&&<><p>带着两条线索，在深潜海的深水栈台，使用深潜饵并等待浮光。准备后，符合条件的下一竿就是特别遭遇。</p><button className="dsh-fisher-primary" disabled={disabled||!!data.active||!!data.pending||legend.armed} onClick={()=>void controller.action({type:'legend.arm'})}>{legend.armed?'已准备 · 等候这一竿':'准备特别遭遇'}</button><small>消耗一份深潜饵；收起或失手后可重新准备。手动、托管及中途接管都可以完成。</small></>}
          {legend.stage==='complete'?<><p className="dsh-fisher-shore-next">✓ 已相遇。星砂宝石鱼已记入图鉴，深潜海也留下了一枚发光纪念。</p><small>纪念独立于背包中的个体，出售或放流后仍然保留。</small></>:<button onClick={onHarbor}>去码头准备 · 海岸／鱼饵／潮相</button>}
        </>}
      </>:area==='memory'?<>
        <h3>{region(location).name} · 留下自己的记忆</h3>
        {!hasMemorial(data.shore,location)?<p>先完成本岸故事并建好纪念设施，再给它留下信或灯。</p>:<>
          {memory&&<p className="dsh-fisher-dialogue">{memorialText(location,memory)}</p>}
          <div className="dsh-fisher-shore-tabs"><button aria-pressed={memoryKind==='letter'} onClick={()=>setMemoryKind('letter')}>留一封信</button><button aria-pressed={memoryKind==='light'} onClick={()=>setMemoryKind('light')}>点一盏灯</button></div>
          <button className="dsh-fisher-selected-item" aria-haspopup="dialog" onClick={()=>setChoosingMemory(true)}>{chosenSpecies&&<img src={`${API}/assets/${thumbnailAsset(spriteName(chosenSpecies,'original')!)}`} alt=""/>}<span><small>记住哪一次相遇</small><strong>{chosenSpecies?species(chosenSpecies).name:'选择已发现的收藏'}</strong></span><span aria-hidden="true">›</span></button>
          <button className="dsh-fisher-primary" disabled={disabled||!chosenSpecies} onClick={()=>{if(chosenSpecies)void controller.action({type:'shore.memory',kind:memoryKind,species:chosenSpecies});}}>把这份记忆留在岸边</button>
          <small>只引用图鉴，不消耗收藏或壳币；随时可以改写。</small>
          {choosingMemory&&<Dialog title="选择纪念中的相遇" onClose={()=>setChoosingMemory(false)} closeLabel="取消选择"><ItemPicker selected={chosenSpecies} items={memoryChoices.map(def=>({id:def.id,name:def.name,detail:region(def.region).name,image:spriteName(def.id,'original')}))} onSelect={id=>{setMemorySpecies(id as SpeciesId);setChoosingMemory(false);}}/></Dialog>}
        </>}
      </>:picnic?<>
        <h3>{guest(picnic.guest).name}的野餐邀约</h3><p>{region(picnic.region).name} · {PICNIC_MENUS[picnic.menu]} · {PICNIC_MOODS[picnic.mood]}</p><p>食材已经备好，来客会在那里的座椅旁等你。不计时，也不会过期。</p>
        {picnic.region===location?<button className="dsh-fisher-primary" disabled={disabled} onClick={onPicnic}>坐下来，一起开饭</button>:<button onClick={onHarbor}>回到{region(picnic.region).name}</button>}
      </>:preparing?<>
        <nav className="dsh-fisher-shore-tabs" aria-label="野餐准备步骤"><button aria-pressed={step===0} onClick={()=>setStep(0)}>1 · 邀约</button><button aria-pressed={step===1} disabled={!chosenGuest} onClick={()=>setStep(1)}>2 · 食材</button><button aria-pressed={step===2} disabled={!item} onClick={()=>setStep(2)}>3 · 确认</button></nav>
        {step===0?<>
          <strong>想和谁一起吃饭</strong><div className="dsh-fisher-picnic-guests">{known.map(def=><button key={def.id} aria-pressed={chosenGuest===def.id} onClick={()=>setVisitor(def.id)}><img src={`${API}/assets/${thumbnailAsset(guestPicture(def.id,data.life.guests[def.id].outfit,'chibi')!)}`} alt=""/><span>{def.name}{chosenGuest===def.id?' ✓':''}</span></button>)}</div>
          <div className="dsh-fisher-picnic-choices"><fieldset><legend>今天的菜</legend>{Object.entries(PICNIC_MENUS).map(([key,name])=><button key={key} aria-pressed={menu===key} onClick={()=>setMenu(key as PicnicMenu)}>{name}</button>)}</fieldset><fieldset><legend>一起做什么</legend>{Object.entries(PICNIC_MOODS).map(([key,name])=><button key={key} aria-pressed={mood===key} onClick={()=>setMood(key as PicnicMood)}>{name}</button>)}</fieldset></div>
          <button className="dsh-fisher-primary" disabled={!chosenGuest} onClick={()=>setStep(1)}>下一步 · 挑一条鱼</button>
        </>:step===1?<>
          <ItemPicker maxItems={3} label="搜索可用食材" items={candidates.map(fish=>({id:fish.id,name:species(fish.speciesId).name,detail:`${(fish.lengthMm!/10).toFixed(1)} cm · ${VARIANT_NAMES[fish.variant??'original']} · #${fish.id.slice(-5)}`,image:spriteName(fish.speciesId,fish.variant),badge:fish.isNew?'首次发现':fish.isRecord?'长度纪录':fish.isNewVariant?'首次外观':undefined}))} selected={selected} onSelect={id=>{setSelected(id);setConfirmed(false);setStep(2);}} empty="还没有可用食材。上锁、展示中和特殊外观的个体不会列出。"/>
          <small>点选一条鱼，下一步确认后才会使用。</small>
        </>:<>
          <div className="dsh-fisher-review-card"><strong>与{chosenGuest?guest(chosenGuest).name:'来客'} · {PICNIC_MENUS[menu]}</strong><small>{region(location).name} · {PICNIC_MOODS[mood]}</small></div>
          <button className="dsh-fisher-selected-item" onClick={()=>setStep(1)}>{item&&<img src={`${API}/assets/${thumbnailAsset(spriteName(item.speciesId,item.variant)!)}`} alt=""/>}<span><strong>{item?species(item.speciesId).name:'重新挑一条鱼'}</strong>{item&&<small>{(item.lengthMm!/10).toFixed(1)} cm · #{item.id.slice(-5)}</small>}</span><span>更换 ›</span></button>
          <small>只消耗选中的这一条鱼，图鉴保留。</small>
          {protectedItem&&<button aria-pressed={confirmed} onClick={()=>setConfirmed(value=>!value)}>{confirmed?'✓ 已确认':'确认'}使用这条首次／纪录个体</button>}
          <button className="dsh-fisher-primary" disabled={disabled||!chosenGuest||!item||protectedItem&&!confirmed||!!data.active||!!data.pending||data.autoFishing.enabled} onClick={()=>{if(chosenGuest&&item)void controller.action({type:'picnic.prepare',guest:chosenGuest,menu,mood,catchId:item.id,confirmed});}}>{item?'用这条鱼准备野餐':'先挑一条鱼'}</button>
          {(data.active||data.pending||data.autoFishing.enabled)&&<small>先结束当前这一竿并关闭托管，再开饭。</small>}
        </>}<button onClick={()=>setPreparing(false)}>返回野餐相册</button>
      </>:<>
        <h3>给海岸留一顿饭的时间</h3><p>邀请认识的来客，选一道菜和谈话气氛。吃过的饭会留在相册里，不用赶时间。</p>
        <button className="dsh-fisher-primary" disabled={!known.length||disabled} onClick={()=>{setPreparing(true);setStep(0);}}>准备一场野餐</button>{!known.length&&<small>先在来客手记里认识一位朋友。</small>}
        {savedPicnic?<><p className="dsh-fisher-shore-next">与{guest(savedPicnic.guest).name} · {region(savedPicnic.region).name}<br/>{PICNIC_MENUS[savedPicnic.menu]} · {PICNIC_MOODS[savedPicnic.mood]}</p><Pager page={album} count={data.adventures.album.length} onChange={setAlbum}/></>:<small>相册还是空的，第一顿饭会从这里开始。</small>}
      </>}
      {controller.getSnapshot().error&&<p role="alert">{controller.getSnapshot().error}</p>}
    </section>;
  };
}
