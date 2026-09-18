import type * as ReactTypes from 'react';
import { API } from '../protocol.ts';
import type { GameProps } from '../protocol.ts';
import { SPECIES,VARIANT_NAMES, region, sizeLabel, species, spriteName } from '../game/content.ts';
import type { SpeciesId, Variant } from '../game/content.ts';
import { bait, currentTide, levelInfo, TIDE_NAMES, isInventorySpecies } from '../game/progression.ts';
import { gear,GEAR_ART } from '../game/gear.ts';
import { warning } from '../game/engine.ts';
import type { Catch, Mode } from '../game/engine.ts';
import { GameController } from './controller.ts';
import { createScene } from './coast-scene.tsx';
import { createWorldView } from './world-view.tsx';
import { createHarbor } from './harbor.tsx';
import { createLifeView } from './life-view.tsx';
import { guest } from '../game/guests.ts';
import { thumbnailAsset } from '../game/art.ts';
import { createCardButton } from './card-button.tsx';
import { createCatalogView } from './catalog-view.tsx';
import { createDialog } from './dialog.tsx';
import { CoastSound } from './sound.ts';
import { createInventoryView } from './inventory-view.tsx';
import { createAutoFishingView } from './auto-fishing-view.tsx';
import { createCoastIcon } from './coast-icons.tsx';
import { createCoastBadge } from './coast-badge.tsx';
import { createConversation } from './conversation.tsx';
import { createShoreJournal, BOTTLE_CONVERSATION } from './shore-journal.tsx';
import { shoreVisitor } from '../game/shore.ts';
import { createShoreSpots } from './shore-spots.tsx';
import {retainConversationArt} from './portrait-art.tsx';

export function createGameView(React: typeof ReactTypes): ReactTypes.ComponentType<GameProps> {
  const Scene = createScene(React);
  const ShoreSpots = createShoreSpots(React),ShoreJournal=createShoreJournal(React);
  const World = createWorldView(React);
  const Harbor = createHarbor(React);
  const CardButton = createCardButton(React);
  const Dialog = createDialog(React);
  const Automatic=createAutoFishingView(React);
  const Icon=createCoastIcon(React);
  const CoastBadge=createCoastBadge(React),Conversation=createConversation(React);
  const releaseLabel=(item:Catch)=>species(item.speciesId).creature?'放流':'回收';
  const measurements=(item:Catch)=>item.lengthMm===null?'海岸纪念':`${(item.lengthMm/10).toFixed(1)} cm · ${item.weightG} g`;
  function FishArt({ id, variant='original', large = false }: { id: SpeciesId; variant?:Variant|null; large?: boolean }) {
    const [failed, setFailed] = React.useState(false);
    const [attempt, setAttempt] = React.useState(0);
    const actualVariant=species(id).creature?variant:null,filename=spriteName(id,actualVariant);
    React.useEffect(()=>setFailed(false),[filename]);
    return <div className={`dsh-fisher-fish-art${large ? ' is-large' : ''}`}>
      {!filename?<span className="dsh-fisher-art-note">{species(id).name}<small>{actualVariant?VARIANT_NAMES[actualVariant]:'海岸纪念'}</small></span>:failed ? <button onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>重新加载插图</button>
        : <img src={`${API}/assets/${large?filename:thumbnailAsset(filename)}${attempt ? `?retry=${attempt}` : ''}`} loading={large?'eager':'lazy'} decoding="async" alt={species(id).name} onError={() => setFailed(true)} />}
    </div>;
  }
  function Meter({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
    const percent = Math.round(value / 10000);
    return <div className="dsh-fisher-meter-row"><div><span>{label}</span><b>{percent}%</b></div>
      <div className={`dsh-fisher-meter${danger ? ' is-tension' : ''}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <i style={{ width: `${percent}%` }} /><span /></div></div>;
  }
  const LifeView = createLifeView(React,FishArt);
  const Catalog = createCatalogView(React,FishArt);
  const Inventory = createInventoryView(React,FishArt);

  return function Game({ lowPerformance,reducedMotion=false,sound=false,volume=.35,obscured=false,onEnabledChange }: GameProps) {
    const [controller] = React.useState(() => new GameController(onEnabledChange));
    const [audio]=React.useState(()=>new CoastSound());
    const lastSound=React.useRef({cast:'',pending:'',phase:'',outcome:'',coins:0,error:''});
    React.useEffect(()=>{audio.configure(sound,volume);},[audio,sound,volume]);
    React.useEffect(()=>{const quiet=()=>audio.quiet();document.addEventListener('visibilitychange',quiet);window.addEventListener('blur',quiet);return ()=>{audio.dispose();document.removeEventListener('visibilitychange',quiet);window.removeEventListener('blur',quiet);};},[audio]);
    const view = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
    const [tab, setTab] = React.useState<'fishing' | 'catalog' | 'inventory' | 'harbor' | 'life'>('fishing');
    const [mode, setMode] = React.useState<Mode>('assisted');
    const [toggle, setToggle] = React.useState(false);
    const [confirm, setConfirm] = React.useState<{ item: Catch; source: 'catch' | 'inventory'; choice: 'sell' | 'release' } | null>(null);
    const [cancelConfirm, setCancelConfirm] = React.useState(false);
    const [autoHistory,setAutoHistory]=React.useState(false);
    const [worldFallback,setWorldFallback]=React.useState(false);
    const [prepareFishing,setPrepareFishing]=React.useState(false);
    const [talk,setTalk]=React.useState(false),[shoreTalk,setShoreTalk]=React.useState(false);
    const [panel,setPanel]=React.useState<'automatic'|'status'|'fishing'|'shore'|null>(null);
    const root = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
      const outside = (event: Event) => {
        const target = event.target;
        if (target instanceof Node && (event.type === 'pointerdown' || target !== document.body) && !root.current?.closest('.dsh-fisher-panel')?.contains(target)) controller.pause();
      };
      controller.start();
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('focusin', outside);
      return () => {
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('focusin', outside);
        controller.dispose();
      };
    }, [controller]);
    React.useEffect(()=>{if(obscured)controller.pause();},[controller,obscured]);
    const data = view.data;
    const currentGuest=data?shoreVisitor(data.shore,data.journey.region,data.life.visitor):null,currentOutfit=currentGuest&&data?data.life.guests[currentGuest].outfit:'base';
    React.useEffect(()=>retainConversationArt(currentGuest,currentOutfit),[currentGuest,currentOutfit]);
    const cast = data?.active;
    const sim = view.sim;
    const phase = sim?.phase;
    const pending = data?.pending;
    const automatic=cast?.automatic;
    React.useEffect(()=>{if(cast&&!automatic)setPanel(value=>value==='automatic'?null:value);},[cast?.id,!!automatic]);
    const worldMode=!!data&&!worldFallback;
    React.useEffect(()=>{if(cast||data?.autoFishing.enabled||tab!=='fishing')setPrepareFishing(false);},[cast?.id,data?.autoFishing.enabled,tab]);
    React.useEffect(()=>{setTalk(false);setShoreTalk(false);setPrepareFishing(false);setWorldFallback(false);setPanel(null);},[data?.saveId]);
    React.useEffect(()=>{setWorldFallback(false);},[data?.journey.region]);
    React.useEffect(()=>{if(data?.shore.story!=='bottle'||data.journey.region!=='L01')setShoreTalk(false);},[data?.shore.story,data?.journey.region]);
    React.useEffect(()=>setAutoHistory(false),[data?.saveId]);
    React.useEffect(()=>{
      if(!data)return;
      const prior=lastSound.current,next={cast:cast?.id??'',pending:pending?.id??'',phase:phase??'',outcome:data.lastOutcome??'',coins:data.coins,error:view.error??''};
      if(next.pending&&next.pending!==prior.pending)audio.play(pending!.isRecord?'record':pending!.isNew?'new':'catch');
      else if(next.error&&next.error!==prior.error)audio.play('error');
      else if(next.cast&&next.cast!==prior.cast&&phase==='casting')audio.play('cast');
      else if(phase==='bite'&&prior.phase!=='bite')audio.play(data.journey.loadout.float==='U02'?'shell':'bite');
      else if(phase==='fighting'&&prior.phase==='bite')audio.play('hook');
      else if(next.outcome==='escaped'&&prior.outcome!=='escaped')audio.play('escape');
      else if(prior.coins&&next.coins>prior.coins)audio.play('reward');
      lastSound.current=next;
    },[audio,data,cast,pending,phase,view.error]);
    React.useEffect(()=>{if(!view.connected)audio.quiet();},[audio,view.connected]);
    const location=region(data?.journey.region??'L01');
    const blocked = view.busy || view.retryPending || !data?.gameplayAvailable || !view.connected;
    const resolve = (item: Catch, source: 'catch' | 'inventory', choice: 'keep' | 'sell' | 'release') => {
      if (choice !== 'keep' && (item.isNew || item.isRecord || item.isNewVariant)) { setConfirm({ item, source, choice }); return; }
      void controller.action(source === 'catch' ? { type: 'catch.resolve', catchId: item.id, choice }
        : { type: 'inventory.resolve', catchId: item.id, choice: choice === 'keep' ? 'sell' : choice });
    };
    const reelUp = () => { if (!toggle) controller.setReel(false); };
    const changeTab = (next: typeof tab) => { controller.pause();if(next!==tab)audio.play('page'); setTab(next); setConfirm(null); setCancelConfirm(false); root.current?.closest('.dsh-fisher-body')?.scrollTo({top:0}); };
    const openPanel=(next:typeof panel)=>{controller.pause();setPanel(next);};
    const overlay=obscured||tab!=='fishing'||!!panel||!!confirm||cancelConfirm||!!pending||!!view.reward||autoHistory||!!data&&data.autoFishing.caught>data.autoFishing.seen||prepareFishing||talk||shoreTalk;
    const reelButton=(compact=false)=><button disabled={blocked} className={`dsh-fisher-primary dsh-fisher-reel${view.reel?' is-reeling':''}`} aria-pressed={view.reel}
      onPointerDown={event=>{if(event.button!==0)return;event.currentTarget.setPointerCapture(event.pointerId);if(!toggle)controller.setReel(true);}}
      onPointerUp={reelUp} onPointerCancel={()=>controller.setReel(false)} onLostPointerCapture={reelUp}
      onKeyDown={event=>{if(!toggle&&['Space','Enter'].includes(event.code)){event.preventDefault();if(!event.repeat)controller.setReel(true);}}}
      onKeyUp={event=>{if(!toggle&&['Space','Enter'].includes(event.code)){event.preventDefault();controller.setReel(false);}}}
      onBlur={()=>controller.setReel(false)} onClick={()=>{if(toggle)controller.setReel(!view.reel);}}>
      {compact&&<Icon name="fish"/>}<span>{view.reel?'收线中':toggle?'点击收线':'按住收线'}</span>
      {compact&&sim&&<><small>收线 {Math.round(sim.progress/10000)}% · 张力 {Math.round(sim.tension/10000)}%</small>{cast?.challenge.guard&&<small>{(sim.guardTicks??0)>0?'刀盾狗护线中':sim.guardUsed?'刀盾狗已护线':'刀盾狗在守候'}</small>}<i className="dsh-fisher-hud-meter" style={{'--catch':`${Math.min(100,sim.progress/10000)}%`,'--tension':`${Math.min(100,sim.tension/10000)}%`} as ReactTypes.CSSProperties}/></>}
    </button>;
    const mood = pending ? '今天的海，回了一封信' : automatic ? data?.autoFishing.enabled&&data.autoFishing.working?'你忙你的，海岸慢慢钓':'这份等待，下次接着来' : view.paused && cast ? '这一竿，等你回来' : phase === 'bite' ? '浮漂动了 · 现在提竿'
      : phase === 'fighting' ? warning(sim!, cast!.challenge) : phase === 'casting' ? '轻轻把线送出去' : phase === 'waiting' ? '等一阵涟漪' : '留一点时间给风，也给自己。';
    const visitor=currentGuest?guest(currentGuest):null;
    const visitorLine=visitor?(pending?visitor.lines[pending.isRecord?8:pending.isNew?6:7]:(automatic?!data?.autoFishing.working:view.paused&&cast)?visitor.lines[9]:visitor.lines[data!.life.guests[visitor.id].stage===3?10:2]):null;
    const fishingPanel=(<section className="dsh-fisher-play-card" aria-label="钓鱼操作">
          {data&&(!worldMode||!cast||automatic||data.autoFishing.enabled)&&<Automatic.Controls compact data={data} controller={controller} disabled={blocked} onHistory={()=>setAutoHistory(true)}/>}
          {pending ? <p>新相遇，慢慢看。</p> : data&&(automatic||!cast&&data.autoFishing.enabled)?<Automatic.Progress data={data} controller={controller} disabled={blocked} onCancel={()=>setCancelConfirm(true)} onHarbor={()=>changeTab('harbor')}/> : cast ? <>
            <div className="dsh-fisher-play-heading"><h3>{view.paused ? '这一竿已暂停' : phase === 'fighting' ? '跟着它的节奏' : phase === 'bite' ? '有鱼咬钩！' : '等鱼来信'}</h3>
              <small>{cast.challenge.mode==='guided'?'引导收获':cast.challenge.mode === 'assisted' ? '辅助松线' : '标准模式'}</small></div>
            {phase === 'fighting' && <><Meter label="收线进度" value={sim!.progress} /><Meter label="鱼线张力" value={sim!.tension} danger />
              <div className="dsh-fisher-danger" data-danger={sim!.danger > 0}>断线风险 <b>{Math.round(sim!.danger / 3000)}%</b><span>高张力时松开</span></div></>}
            {phase==='recovery'?<><p>这一竿的等待超出了预期，收获已经保留，可以安全收回。</p><button className="dsh-fisher-primary" disabled={blocked} onClick={()=>void controller.action({type:'cast.recover',castId:cast.id,ownerEpoch:cast.ownerEpoch})}>恢复这份收获</button></>:view.paused ? <><p>关闭窗口或离开页面会暂停。回来后接着钓。</p>
              <button className="dsh-fisher-primary" disabled={blocked} onClick={() => {setPanel(null);void controller.action({ type: 'cast.resume', castId: cast.id });}}>
                {cast.owner === controller.clientId ? '继续这一竿' : '在这里继续这一竿'}</button></>
              : phase === 'bite' ? <button className="dsh-fisher-primary" disabled={blocked} onClick={() => void controller.hook()}>提竿</button>
                : phase === 'fighting' ? <>
                  {reelButton()}
                </> : <p className="dsh-fisher-wait-copy">浮漂会提醒你，慢慢等就好。</p>}
            {phase==='fighting'&&<label className="dsh-fisher-toggle"><input type="checkbox" checked={toggle} onChange={event=>{controller.setReel(false);setToggle(event.target.checked);}}/>点击切换收线 <span>也可在按钮上按住空格</span></label>}
            <div className="dsh-fisher-quiet-actions">{!view.paused && <button disabled={view.busy} onClick={() => controller.pause()}>歇一会儿</button>}
              <button disabled={blocked || cast.owner !== controller.clientId||phase==='recovery'} onClick={() => { controller.pause(); setCancelConfirm(true); }}>收起这一竿</button></div>
          </> : <><div className="dsh-fisher-play-heading"><h3>{data?.lastOutcome === 'escaped' ? '鱼回到水里了' : '在这里，慢一点也很好'}</h3><small>{gear(data?.journey.loadout.rod??'D01').name}</small></div>
            <p>{data?.lastOutcome === 'escaped' ? '下次张力升高时松一松线，再试一竿。' : `${bait(data?.journey.bait??'B01').name} · ${data?.journey.bait==='B01'?'免费无限':data?.journey.bait==='B08'?`邀请${data.journey.target?species(data.journey.target).name:'来客'}`:`剩余 ${data?.journey.baits[data.journey.bait]??0} 份`}`}</p>
            <ShoreSpots data={data!} controller={controller} disabled={blocked}/><label className="dsh-fisher-toggle"><input type="checkbox" checked={mode === 'assisted'} disabled={blocked} onChange={event => setMode(event.target.checked ? 'assisted' : 'standard')} />辅助松线 <span>张力高时帮你松线</span></label>
            <button className="dsh-fisher-primary" disabled={blocked} onClick={() => void controller.action({ type: 'cast.begin', mode })}>抛竿</button><div className="dsh-fisher-quiet-actions"><button onClick={()=>changeTab('harbor')}>换钓点 · 整理装备</button></div></>}
        </section>);
    return <div className="dsh-fisher-game" data-immersive="true" data-world={worldMode} ref={root} onPointerDown={()=>audio.activate()} onChangeCapture={event=>{const target=event.target;if(target instanceof HTMLSelectElement||target instanceof HTMLInputElement&&['checkbox','radio'].includes(target.type))audio.play('select');}} onKeyDown={event=>{audio.activate();if(event.key==='Escape'){event.stopPropagation();controller.pause();}}}>
      {data&&<>
        {worldMode&&data?<div className="dsh-fisher-world-stage" data-fishing={!!cast||data.autoFishing.enabled}><World key={`${data.saveId}:${data.journey.region}`} data={data} lowPerformance={lowPerformance} reducedMotion={reducedMotion} blocked={blocked}
          pose={pending?'surprise':phase==='casting'?'cast':phase==='fighting'&&view.reel?'reel':cast?'hold':'idle'}
          paused={automatic?!data.autoFishing.working:!!cast&&view.paused}
          overlay={overlay} guarded={(sim?.guardTicks??0)>0}
          onFish={spot=>{setPrepareFishing(true);if(spot!==data.shore.spots[data.journey.region])void controller.action({type:'shore.spot',spot});}} onGuest={()=>{if(data.shore.story==='bottle'&&data.journey.region==='L01')setShoreTalk(true);else setTalk(true);}} onGear={()=>changeTab('harbor')} onFallback={()=>setWorldFallback(true)}/></div>:<div className={`dsh-fisher-scene dsh-fisher-play-scene${phase === 'fighting' && !view.paused ? ' is-fighting' : ''}`}>
          <Scene lowPerformance={lowPerformance} reducedMotion={reducedMotion} data={data} pose={pending?'surprise':phase==='casting'?'cast':phase==='fighting'&&view.reel?'reel':cast?'hold':'idle'} paused={overlay||(automatic?!data?.autoFishing.working:!!cast&&view.paused)||!view.connected} />
          {cast && !pending && <div className="dsh-fisher-float" data-phase={(automatic?!data?.autoFishing.working:view.paused) ? 'paused' : phase} data-glow={data!.journey.loadout.float==='U03'&&['L03','L04'].includes(location.id)} aria-hidden="true">{GEAR_ART[data!.journey.loadout.float]?(<img src={`${API}/assets/${thumbnailAsset(GEAR_ART[data!.journey.loadout.float]!)}`} alt=""/>):<i/>}<b /></div>}
          {pending?.isRecord&&data!.journey.loadout.float==='U04'&&<span className="dsh-fisher-record-flag">新纪录</span>}
        </div>}
      </>}
      <div className="dsh-fisher-hud-top"><button className="dsh-fisher-hud-location" title="查看码头与钓点" onClick={()=>changeTab('harbor')} aria-haspopup="dialog"><CoastBadge region={location.id}/><span className="dsh-fisher-coast-name">{location.name}</span><small>{data?TIDE_NAMES[currentTide(data.journey)]:'平潮'}<i aria-hidden="true"> · </i>Lv.{levelInfo(data?.experience??0).level}</small></button><button className="dsh-fisher-hud-wallet" onClick={()=>openPanel('status')} aria-label={`海岸状态，${data?.coins??0} 壳币，${data?.tokens??0} 潮汐碎片`} aria-haspopup="dialog"><span><Icon name="coin"/>{data?.coins??'—'}</span><small><Icon name="star"/>{data?.tokens??'—'}</small></button></div>
      <button className="dsh-fisher-hud-story" aria-haspopup="dialog" data-notice={data?.shore.story==='bottle'||data?.shore.story==='recovered'} onClick={()=>openPanel('shore')}><Icon name="note"/><span>岸边故事</span></button>
      <nav className="dsh-fisher-hud-menu" aria-label="海岸功能">
        <button aria-haspopup="dialog" title={`图鉴 ${Object.keys(data?.catalog??{}).length}/${SPECIES.length}`} onClick={()=>changeTab('catalog')}><Icon name="book"/><span>图鉴</span></button>
        <button aria-haspopup="dialog" title={`背包 ${data?.inventory.length??0}`} onClick={()=>changeTab('inventory')}><Icon name="bag"/><span>背包</span></button>
        <button aria-haspopup="dialog" onClick={()=>changeTab('harbor')}><Icon name="harbor"/><span>码头</span></button>
        <button aria-haspopup="dialog" onClick={()=>changeTab('life')}><Icon name="note"/><span>手记</span></button>
        <button aria-haspopup="dialog" aria-label="自动钓鱼设置" data-active={data?.autoFishing.enabled} onClick={()=>openPanel('automatic')}><Icon name="auto"/><span>{data?.autoFishing.enabled?'托管中':'托管'}</span></button>
      </nav>
      <button className="dsh-fisher-hud-save" data-error={!!view.error||!view.connected} aria-haspopup="dialog" onClick={()=>openPanel('status')} title={view.error??(view.busy?'正在保存…':'进度已保存在本机')}><Icon name="save"/><span>{view.error?'保存提示':!view.connected?'正在连接':view.busy?'保存中':'存档'}</span></button>
      {!overlay&&data&&<div className="dsh-fisher-hud-fishing" aria-label="岸边钓鱼操作">
        {automatic||!cast&&data.autoFishing.enabled?<button onClick={()=>openPanel('automatic')} className="dsh-fisher-primary"><Icon name="auto"/><span>{data.autoFishing.working?'正在自动钓鱼':'托管等待中'}</span></button>:cast?<>
          {phase==='recovery'?<button className="dsh-fisher-primary" disabled={blocked} onClick={()=>void controller.action({type:'cast.recover',castId:cast.id,ownerEpoch:cast.ownerEpoch})}>恢复收获</button>:view.paused?<button className="dsh-fisher-primary" disabled={blocked} onClick={()=>void controller.action({type:'cast.resume',castId:cast.id})}><Icon name="fish"/><span>继续这一竿</span></button>:phase==='bite'?<button className="dsh-fisher-primary is-biting" disabled={blocked} onClick={()=>void controller.hook()}><Icon name="fish"/><span>提竿！</span></button>:phase==='fighting'?reelButton(true):<button className="dsh-fisher-primary" onClick={()=>openPanel('fishing')} title={mood}><Icon name="fish"/><span>等鱼来信</span></button>}
          <button className="dsh-fisher-hud-more" onClick={()=>openPanel('fishing')} aria-label="钓鱼操作选项" aria-haspopup="dialog"><Icon name="more"/></button>
        </>:!worldMode?<button className="dsh-fisher-primary" disabled={blocked} onClick={()=>setPrepareFishing(true)}><Icon name="fish"/><span>准备钓鱼</span></button>:null}
      </div>}
      {!obscured&&<>
      {prepareFishing&&!cast&&!data?.autoFishing.enabled&&<Dialog title="这一竿的准备" onClose={()=>setPrepareFishing(false)} busy={view.busy} closeLabel="回到岸边">{fishingPanel}</Dialog>}
      {talk&&visitor&&data&&<Conversation key={visitor.id} definition={visitor} outfit={data.life.guests[visitor.id].outfit} opening={visitorLine!} onClose={()=>setTalk(false)} onJournal={()=>{setTalk(false);changeTab('life');}}/>}
      {panel==='fishing'&&<Dialog title="钓鱼操作" onClose={()=>setPanel(null)} closeLabel="回到岸边">{fishingPanel}</Dialog>}
      {panel==='automatic'&&data&&<Dialog title="随 DSH 自动钓鱼" onClose={()=>setPanel(null)} closeLabel="回到岸边"><Automatic.Controls data={data} controller={controller} disabled={blocked} onHistory={()=>setAutoHistory(true)}/><ShoreSpots automatic data={data} controller={controller} disabled={blocked}/><Automatic.Progress data={data} controller={controller} disabled={blocked} onCancel={()=>setCancelConfirm(true)} onHarbor={()=>{setPanel(null);changeTab('harbor');}}/></Dialog>}
      {panel==='shore'&&data&&<Dialog title="岸边故事" onClose={()=>setPanel(null)} busy={view.busy}><ShoreJournal data={data} controller={controller} disabled={blocked} onRead={()=>setShoreTalk(true)} onFish={()=>setPanel(null)}/></Dialog>}
      {shoreTalk&&data&&data.shore.story==='bottle'&&<Conversation definition={guest('G001')} outfit="base" script={BOTTLE_CONVERSATION} disabled={blocked} error={view.error} onClose={()=>setShoreTalk(false)} onComplete={()=>{void controller.action({type:'shore.read'}).then(()=>{if(controller.getSnapshot().data?.shore.story!=='bottle')setShoreTalk(false);});}}/>}
      {panel==='status'&&<Dialog title="海岸状态" onClose={()=>setPanel(null)}><div className="dsh-fisher-stat-grid"><div><strong>{levelInfo(data?.experience??0).level}</strong><span>海岸等级</span></div><div><strong>{data?.coins??'—'}</strong><span>壳币</span></div><div><strong>{data?.tokens??'—'}</strong><span>潮汐碎片</span></div><div><strong>{data?.research??'—'}</strong><span>研究</span></div></div><p role="status">{view.error??(!view.connected?'海岸正在等待连接，进度已暂停。':view.busy?'正在保存…':'进度已保存在本机。')}</p>{(view.error||!view.connected)&&<button disabled={view.busy} onClick={()=>void controller.retry()}>{view.retryPending?'重试保存':'重新连接'}</button>}{data?.journey.overflow&&<p>有货币达到持有上限，超出部分未计入。</p>}</Dialog>}
      {tab!=='fishing'&&<Dialog title={{catalog:'海岸图鉴',inventory:'我的背包',harbor:'码头',life:'海岸手记'}[tab]} onClose={()=>changeTab('fishing')} closeLabel="回到海岸" className="dsh-fisher-page-dialog">
        {!data?<p>正在连接海岸…</p>:tab==='harbor'?<Harbor data={data} controller={controller} blocked={blocked} lowPerformance={lowPerformance} reducedMotion={reducedMotion} storageBusy={view.busy||view.retryPending}/>:tab==='life'?<LifeView data={data} controller={controller} blocked={blocked} reducedMotion={reducedMotion} lowPerformance={lowPerformance} onFish={()=>changeTab('fishing')}/>:tab==='catalog'?<Catalog data={data} controller={controller} blocked={blocked} onFish={()=>changeTab('fishing')}/>:<Inventory data={data} controller={controller} blocked={blocked} onFish={()=>changeTab('fishing')} onResolve={(item,choice)=>resolve(item,'inventory',choice)}/>}
      </Dialog>}
      {view.connected&&pending&&data&&<Dialog key={pending.id} title={`${pending.isNew?'新发现':pending.isRecord?'新纪录':'有收获了'} · ${species(pending.speciesId).name}`} className="dsh-fisher-catch-dialog" busy={view.busy} closeDisabled={blocked||(isInventorySpecies(pending.speciesId)&&data.inventory.length>=240)} closeLabel={isInventorySpecies(pending.speciesId)?'留下并继续':'继续'} hint={isInventorySpecies(pending.speciesId)?data.inventory.length>=240?'背包已满，请选择出售或放流／回收。':'点击空白处继续，收获会放入背包。':'点击空白处继续。'} onClose={()=>{if(!blocked&&(!isInventorySpecies(pending.speciesId)||data.inventory.length<240))resolve(pending,'catch','keep');}}>
        <div className="dsh-fisher-catch-heading"><FishArt id={pending.speciesId} variant={pending.variant} large/></div>
        <div className="dsh-fisher-catch-stats"><span>{measurements(pending)}</span>{pending.variant&&<span>{sizeLabel(pending.quality)} · {VARIANT_NAMES[pending.variant]}</span>}{pending.price>0&&<span>{pending.price} 壳币</span>}</div>
        <p className="dsh-fisher-flavor">{species(pending.speciesId).description}</p><CardButton item={pending} frame={data.life.frame} onStart={()=>controller.pause()}/>
        {isInventorySpecies(pending.speciesId)?<div className="dsh-fisher-actions"><button disabled={blocked} onClick={()=>resolve(pending,'catch','sell')}>出售 +{pending.price}</button><button disabled={blocked} onClick={()=>resolve(pending,'catch','release')}>{releaseLabel(pending)}</button></div>:<p>{species(pending.speciesId).kind==='relic'?(pending.isNew?'已加入海岸陈列，不占背包格。':'已有的纪念，化作了2枚潮汐碎片。'):'这次相遇已记入海岸手记。'}</p>}
        {view.error&&<div role="alert"><p>{view.error}</p><button disabled={view.busy} onClick={()=>void controller.retry()}>重试保存</button></div>}
      </Dialog>}
      {view.connected&&view.reward&&!pending&&<Dialog key={view.reward.id} title={view.reward.title} className="dsh-fisher-reward-dialog" onClose={controller.dismissReward} closeLabel="继续" hint="点击空白处继续。"><div className="dsh-fisher-reward-items">{view.reward.items.map((item,index)=><div className="dsh-fisher-reward-item" key={index}>{item.art?<img src={`${API}/assets/${item.art}`} alt=""/>:<span className="dsh-fisher-reward-mark" aria-hidden="true">✦</span>}<strong>{item.name}</strong><small>×{item.quantity}</small></div>)}</div></Dialog>}
      {view.connected&&data&&!pending&&!view.reward&&!confirm&&!cancelConfirm&&<Automatic.Catches data={data} controller={controller} disabled={blocked} open={autoHistory||data.autoFishing.caught>data.autoFishing.seen} onClose={()=>setAutoHistory(false)}/>}
      {confirm && <Dialog title="确认处理这份纪念" onClose={()=>setConfirm(null)} busy={view.busy}><p>这是{confirm.item.isNew ? '首次发现' :confirm.item.isNewVariant?'首次外观': '刷新纪录'}的{species(confirm.item.speciesId).name}。{confirm.choice === 'sell' ? '出售' : releaseLabel(confirm.item)}后图鉴仍会保留。</p>
        <div className="dsh-fisher-actions"><button disabled={blocked} onClick={() => {
          void controller.action(confirm.source === 'catch' ? { type: 'catch.resolve', catchId: confirm.item.id, choice: confirm.choice,confirmed:true }
            : { type: 'inventory.resolve', catchId: confirm.item.id, choice: confirm.choice,confirmed:true }); setConfirm(null);
        }}>确认{confirm.choice === 'sell' ? '出售' : releaseLabel(confirm.item)}</button></div></Dialog>}
      {cancelConfirm && cast && <Dialog title="收起这一竿" onClose={()=>setCancelConfirm(false)} busy={view.busy}><p>收起后这一竿会结束。普通消耗饵不退回；定向饵和来客邀请会保留，潮相覆盖次数不退回。</p><div className="dsh-fisher-actions">
        <button disabled={blocked} onClick={() => { void controller.action({ type: 'cast.cancel', castId: cast.id, ownerEpoch: cast.ownerEpoch }); setCancelConfirm(false); }}>确认收竿</button>
        </div></Dialog>}
      </>}
    </div>;
  };
}
