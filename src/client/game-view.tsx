import type * as ReactTypes from 'react';
import { API } from '../protocol.ts';
import type { GameProps } from '../protocol.ts';
import { REGIONS, SPECIES, VARIANT_NAMES, region, sizeLabel, species, spriteName } from '../game/content.ts';
import type { RegionId, SpeciesId, Variant } from '../game/content.ts';
import { bait, currentTide, levelInfo, TIDE_NAMES, isInventorySpecies } from '../game/progression.ts';
import { gear } from '../game/gear.ts';
import { warning } from '../game/engine.ts';
import type { Catch, Mode } from '../game/engine.ts';
import { GameController } from './controller.ts';
import { createScene } from './scene.tsx';
import { createHarbor } from './harbor.tsx';
import { createLifeView } from './life-view.tsx';
import { displayed } from '../game/goals.ts';
import { guest } from '../game/guests.ts';

export function createGameView(React: typeof ReactTypes): ReactTypes.ComponentType<GameProps> {
  const Scene = createScene(React);
  const Harbor = createHarbor(React);
  const releaseLabel=(item:Catch)=>species(item.speciesId).creature?'放流':'回收';
  const measurements=(item:Catch)=>item.lengthMm===null?'海岸纪念':`${(item.lengthMm/10).toFixed(1)} cm · ${item.weightG} g`;
  function FishArt({ id, variant='original', large = false }: { id: SpeciesId; variant?:Variant|null; large?: boolean }) {
    const [failed, setFailed] = React.useState(false);
    const [attempt, setAttempt] = React.useState(0);
    const filename=spriteName(id,variant);
    return <div className={`dsh-fisher-fish-art${large ? ' is-large' : ''}`}>
      {!filename?<span className="dsh-fisher-art-note">{species(id).name}<small>{variant?VARIANT_NAMES[variant]:'海岸纪念'}</small></span>:failed ? <button onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>重新加载插图</button>
        : <img src={`${API}/assets/${filename}${attempt ? `?retry=${attempt}` : ''}`} alt={species(id).name} onError={() => setFailed(true)} />}
    </div>;
  }
  function Meter({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
    const percent = Math.round(value / 10000);
    return <div className="dsh-fisher-meter-row"><div><span>{label}</span><b>{percent}%</b></div>
      <div className={`dsh-fisher-meter${danger ? ' is-tension' : ''}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <i style={{ width: `${percent}%` }} /><span /></div></div>;
  }
  const LifeView = createLifeView(React,FishArt);

  return function Game({ lowPerformance }: GameProps) {
    const [controller] = React.useState(() => new GameController());
    const view = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
    const [tab, setTab] = React.useState<'fishing' | 'catalog' | 'inventory' | 'harbor' | 'life'>('fishing');
    const [catalogRegion,setCatalogRegion]=React.useState<RegionId>('L01');
    const [search,setSearch]=React.useState('');
    const [mode, setMode] = React.useState<Mode>('assisted');
    const [toggle, setToggle] = React.useState(false);
    const [confirm, setConfirm] = React.useState<{ item: Catch; source: 'catch' | 'inventory'; choice: 'sell' | 'release' } | null>(null);
    const [cancelConfirm, setCancelConfirm] = React.useState(false);
    const root = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
      const outside = (event: Event) => {
        const target = event.target;
        if (target instanceof Node && (event.type === 'pointerdown' || target !== document.body) && !root.current?.contains(target)) controller.pause();
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
    const data = view.data;
    const cast = data?.active;
    const sim = view.sim;
    const phase = sim?.phase;
    const pending = data?.pending;
    const location=region(data?.journey.region??'L01');
    const tidyItems=data?.inventory.filter(item=>!item.locked&&!item.isNew&&!item.isRecord&&!item.isNewVariant&&!displayed(data,item.id))??[];
    const blocked = view.busy || view.retryPending || !data?.gameplayAvailable || !view.connected;
    const resolve = (item: Catch, source: 'catch' | 'inventory', choice: 'keep' | 'sell' | 'release') => {
      if (choice !== 'keep' && (item.isNew || item.isRecord || item.isNewVariant)) { setConfirm({ item, source, choice }); return; }
      void controller.action(source === 'catch' ? { type: 'catch.resolve', catchId: item.id, choice }
        : { type: 'inventory.resolve', catchId: item.id, choice: choice === 'keep' ? 'sell' : choice });
    };
    const reelUp = () => { if (!toggle) controller.setReel(false); };
    const changeTab = (next: typeof tab) => { controller.pause(); setTab(next); setConfirm(null); setCancelConfirm(false); root.current?.closest('.dsh-fisher-body')?.scrollTo({top:0}); };
    const mood = pending ? '今天的海，回了一封信' : view.paused && cast ? '这一竿，等你回来' : phase === 'bite' ? '浮漂动了 · 现在提竿'
      : phase === 'fighting' ? warning(sim!, cast!.challenge) : phase === 'casting' ? '轻轻把线送出去' : phase === 'waiting' ? '等一阵涟漪' : '留一点时间给风，也给自己。';
    const visitor=data?.life.visitor?guest(data.life.visitor):null;
    const visitorLine=visitor?(pending?visitor.lines[pending.isRecord?8:pending.isNew?6:7]:view.paused&&cast?visitor.lines[9]:visitor.lines[data!.life.guests[visitor.id].stage===3?10:2]):null;
    return <div className="dsh-fisher-game" ref={root}>
      <div className="dsh-fisher-location"><div><small>海岸手记 · Lv.{levelInfo(data?.experience??0).level}</small><h2>{location.name}</h2></div>
        <div className="dsh-fisher-wallet"><span title="壳币">壳币 <b>{data?.coins ?? '—'}</b></span><small>潮汐碎片 {data?.tokens ?? '—'} · 研究 {data?.research ?? '—'}</small></div></div>
      <nav className="dsh-fisher-tabs" aria-label="海岸页面">
        <button aria-current={tab === 'fishing' ? 'page' : undefined} onClick={() => changeTab('fishing')}>钓鱼</button>
        <button aria-current={tab === 'catalog' ? 'page' : undefined} onClick={() => changeTab('catalog')}>图鉴 <small>{Object.keys(data?.catalog ?? {}).length}/48</small></button>
        <button aria-current={tab === 'inventory' ? 'page' : undefined} onClick={() => changeTab('inventory')}>背包 <small>{data?.inventory.length ?? 0}</small></button>
        <button aria-current={tab === 'harbor' ? 'page' : undefined} onClick={() => changeTab('harbor')}>码头</button>
        <button aria-current={tab === 'life' ? 'page' : undefined} onClick={() => changeTab('life')}>手记</button>
      </nav>
      {tab === 'fishing' && <>
        <div className={`dsh-fisher-scene dsh-fisher-play-scene${phase === 'fighting' && !view.paused ? ' is-fighting' : ''}`}>
          <Scene lowPerformance={lowPerformance} paused={!!cast && view.paused || !view.connected || !!confirm || cancelConfirm} />
          <div className="dsh-fisher-scene-label"><span>{cast?.setup?TIDE_NAMES[cast.setup.tide]:data?TIDE_NAMES[currentTide(data.journey)]:'平潮'} · 风轻</span><b>{location.id.slice(1)} / SHORE</b></div>
          {cast && !pending && <div className="dsh-fisher-float" data-phase={view.paused ? 'paused' : phase} aria-hidden="true"><i /><b /></div>}
          <div className="dsh-fisher-note" role="status">{mood}</div>
        </div>
        <section className="dsh-fisher-play-card" aria-label="钓鱼操作">
          {pending ? <>
            <div className="dsh-fisher-catch-heading"><small>{pending.isNew ? '新发现' : pending.isRecord ? '新纪录' : '有收获了'}</small><h3>{species(pending.speciesId).name}</h3></div>
            <FishArt id={pending.speciesId} variant={pending.variant} large />
            <div className="dsh-fisher-catch-stats"><span>{measurements(pending)}</span>{pending.variant&&<span>{sizeLabel(pending.quality)} · {VARIANT_NAMES[pending.variant]}</span>}{pending.price>0&&<span>{pending.price} 壳币</span>}</div>
            <p className="dsh-fisher-flavor">{species(pending.speciesId).description}</p>
            {isInventorySpecies(pending.speciesId)?<div className="dsh-fisher-actions"><button disabled={blocked || data!.inventory.length >= 240} onClick={() => resolve(pending, 'catch', 'keep')}>留下</button>
              <button disabled={blocked} onClick={() => resolve(pending, 'catch', 'sell')}>出售 +{pending.price}</button>
              <button disabled={blocked} onClick={() => resolve(pending, 'catch', 'release')}>{releaseLabel(pending)}</button></div>:<><p>{species(pending.speciesId).kind==='relic'?(pending.isNew?'已加入海岸陈列，不占背包格。':'已有的纪念，化作了 2 枚潮汐碎片。'):'这次相遇已记入海岸手记。'}</p><button disabled={blocked} className="dsh-fisher-primary" onClick={()=>resolve(pending,'catch','keep')}>记下这次相遇</button></>}
          </> : cast ? <>
            <div className="dsh-fisher-play-heading"><h3>{view.paused ? '这一竿已暂停' : phase === 'fighting' ? '跟着它的节奏' : phase === 'bite' ? '有鱼咬钩！' : '等鱼来信'}</h3>
              <small>{cast.challenge.mode==='guided'?'引导收获':cast.challenge.mode === 'assisted' ? '辅助松线' : '标准模式'}</small></div>
            {phase === 'fighting' && <><Meter label="收线进度" value={sim!.progress} /><Meter label="鱼线张力" value={sim!.tension} danger />
              <div className="dsh-fisher-danger" data-danger={sim!.danger > 0}>断线风险 <b>{Math.round(sim!.danger / 3000)}%</b><span>高张力时松开</span></div></>}
            {phase==='recovery'?<><p>这一竿的等待超出了预期，收获已经保留，可以安全收回。</p><button className="dsh-fisher-primary" disabled={blocked} onClick={()=>void controller.action({type:'cast.recover',castId:cast.id,ownerEpoch:cast.ownerEpoch})}>恢复这份收获</button></>:view.paused ? <><p>关闭窗口或离开页面会暂停。回来后接着钓。</p>
              <button className="dsh-fisher-primary" disabled={blocked} onClick={() => void controller.action({ type: 'cast.resume', castId: cast.id })}>
                {cast.owner === controller.clientId ? '继续这一竿' : '在这里继续这一竿'}</button></>
              : phase === 'bite' ? <button className="dsh-fisher-primary" disabled={blocked} onClick={() => void controller.hook()}>提竿</button>
                : phase === 'fighting' ? <>
                  <button className={`dsh-fisher-primary dsh-fisher-reel${view.reel ? ' is-reeling' : ''}`} aria-pressed={view.reel}
                    onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); if (!toggle) controller.setReel(true); }}
                    onPointerUp={reelUp} onPointerCancel={() => controller.setReel(false)} onLostPointerCapture={reelUp}
                    onKeyDown={event => { if (!toggle && (event.code === 'Space' || event.code === 'Enter')) { event.preventDefault(); if (!event.repeat) controller.setReel(true); } }}
                    onKeyUp={event => { if (!toggle && (event.code === 'Space' || event.code === 'Enter')) { event.preventDefault(); controller.setReel(false); } }}
                    onBlur={() => controller.setReel(false)} onClick={() => { if (toggle) controller.setReel(!view.reel); }}>
                    {view.reel ? '收线中 · 松开缓一缓' : toggle ? '点击开始收线' : '按住收线'}</button>
                  <label className="dsh-fisher-toggle"><input type="checkbox" checked={toggle} onChange={event => { controller.setReel(false); setToggle(event.target.checked); }} />点击切换收线 <span>也可在按钮上按住空格</span></label>
                </> : <p className="dsh-fisher-wait-copy">浮漂会提醒你，慢慢等就好。</p>}
            <div className="dsh-fisher-quiet-actions">{!view.paused && <button disabled={view.busy} onClick={() => controller.pause()}>歇一会儿</button>}
              <button disabled={blocked || cast.owner !== controller.clientId||phase==='recovery'} onClick={() => { controller.pause(); setCancelConfirm(true); }}>收起这一竿</button></div>
          </> : <><div className="dsh-fisher-play-heading"><h3>{data?.lastOutcome === 'escaped' ? '鱼回到水里了' : '在这里，慢一点也很好'}</h3><small>{gear(data?.journey.loadout.rod??'D01').name}</small></div>
            <p>{data?.lastOutcome === 'escaped' ? '下次张力升高时松一松线，再试一竿。' : `${bait(data?.journey.bait??'B01').name} · ${data?.journey.bait==='B01'?'免费无限':data?.journey.bait==='B08'?`邀请${data.journey.target?species(data.journey.target).name:'来客'}`:`剩余 ${data?.journey.baits[data.journey.bait]??0} 份`}`}</p>
            <label className="dsh-fisher-toggle"><input type="checkbox" checked={mode === 'assisted'} disabled={blocked} onChange={event => setMode(event.target.checked ? 'assisted' : 'standard')} />辅助松线 <span>张力高时帮你松线</span></label>
            <button className="dsh-fisher-primary" disabled={blocked} onClick={() => void controller.action({ type: 'cast.begin', mode })}>抛竿</button><div className="dsh-fisher-quiet-actions"><button onClick={()=>changeTab('harbor')}>换钓点 · 整理装备</button></div></>}
        </section>
        {visitor&&<aside className="dsh-fisher-visitor" aria-label="岸边来客"><b>{visitor.name}</b><p>{visitorLine}</p><button onClick={()=>changeTab('life')}>翻开来客手记</button></aside>}
      </>}
      {tab==='harbor'&&data&&<Harbor data={data} controller={controller} blocked={blocked}/>}
      {tab==='life'&&data&&<LifeView data={data} controller={controller} blocked={blocked} onFish={()=>changeTab('fishing')}/>}
      {tab === 'catalog' && <section className="dsh-fisher-collection" aria-label="海岸图鉴"><div className="dsh-fisher-collection-intro"><h3>水边的相遇</h3><p>发现会留下。出售或放流，也不影响图鉴。</p>
        <div className="dsh-fisher-actions">{REGIONS.map(item=><button key={item.id} aria-pressed={catalogRegion===item.id} onClick={()=>setCatalogRegion(item.id)}>{item.name}</button>)}</div><input aria-label="搜索图鉴" placeholder="搜索已发现的名字" value={search} onChange={event=>setSearch(event.target.value)}/></div>
        {SPECIES.filter(entry=>entry.region===catalogRegion&&(!search||(data?.catalog[entry.id]&&entry.name.includes(search)))).map(entry => { const record = data?.catalog[entry.id];const clue=(data?.journey.completed[entry.region]??0)>=10&&entry.kind!=='guest'; return <article className="dsh-fisher-entry" key={entry.id}>
          {record ? <FishArt id={entry.id} /> : <div className="dsh-fisher-undiscovered" aria-label="尚未发现">?</div>}
          <div><small>{entry.id} · {entry.kind==='relic'?'海岸遗物':entry.kind==='guest'?'海岸来客':entry.kind==='abstract'?'奇珍异兽':'水中居民'}</small><h3>{record||clue ? entry.name : '尚未相遇'}</h3>
            {record ? <><p>{entry.description}</p><small>相遇 {record.count} 次{record.bestLengthMm!==null?` · 最长 ${(record.bestLengthMm/10).toFixed(1)} cm · 最重 ${record.bestWeightG} g`:''}</small><small>{Object.entries(record.variants).map(([variant,count])=>`${VARIANT_NAMES[variant as Variant]} ${count}`).join(' · ')}</small></> : <p>{entry.kind==='guest'?'完成这片海岸的来客请求，就能寄出邀请。':clue?`线索：在${region(entry.region).name}使用${entry.tags.includes('glow')?'夜光饵':entry.tags.includes('grain')?'谷香饵':entry.tags.includes('marine')?'海盐饵':entry.tags.includes('deep')?'深潜饵':entry.kind==='abstract'?'怪味饵':'普通面团'}，或选择图鉴定向饵。`:'从一圈涟漪开始认识。本区完成 10 竿后公开线索。'}</p>}</div>
        </article>; })}</section>}
      {tab === 'inventory' && <section className="dsh-fisher-collection" aria-label="收获背包"><div className="dsh-fisher-collection-intro"><h3>带回来的小小纪念</h3>
        <p>{data?.inventory.length ?? 0} / 240 格 · 再放流或回收 {5-(data?.journey.releaseProgress??0)} 次可得 1 潮汐碎片</p><div className="dsh-fisher-actions"><button disabled={blocked||!tidyItems.length} onClick={()=>void controller.action({type:'inventory.batch',catchIds:tidyItems.map(item=>item.id),choice:'sell'})}>出售普通收获 {tidyItems.length}</button><button disabled={blocked||!tidyItems.length} onClick={()=>void controller.action({type:'inventory.batch',catchIds:tidyItems.map(item=>item.id),choice:'release'})}>放流／回收 {tidyItems.length}</button></div><p>新发现、首次外观、纪录、已锁定和展示中的个体保留。</p></div>
        {!data?.inventory.length && <div className="dsh-fisher-empty"><span aria-hidden="true">≈</span><p>背包里还装着海风。</p><button onClick={() => changeTab('fishing')}>去钓一竿</button></div>}
        {data?.inventory.map(item => <article className="dsh-fisher-entry" key={item.id}><FishArt id={item.speciesId} variant={item.variant}/><div><small>{item.isNew ? '初次相遇' : item.isRecord ? '纪录留念' : item.isNewVariant?'首次外观':'水边收获'}{item.variant?` · ${VARIANT_NAMES[item.variant]}`:''}</small>
          <h3>{species(item.speciesId).name}</h3><p>{measurements(item)}</p><button className="dsh-fisher-lock" aria-pressed={item.locked} disabled={blocked} onClick={()=>void controller.action({type:'inventory.lock',catchId:item.id,locked:!item.locked})}>{item.locked?'已锁定 · 点击解锁':'锁定留念'}</button>
          {displayed(data,item.id)&&<small>正在展示 · 到手记的展示页取回</small>}<div className="dsh-fisher-actions"><button disabled={blocked||item.locked||displayed(data,item.id)} onClick={() => resolve(item, 'inventory', 'sell')}>出售 +{item.price}</button><button disabled={blocked||item.locked||displayed(data,item.id)} onClick={() => resolve(item, 'inventory', 'release')}>{releaseLabel(item)}</button></div></div></article>)}</section>}
      {confirm && <div className="dsh-fisher-confirm" role="alert"><p>这是{confirm.item.isNew ? '首次发现' :confirm.item.isNewVariant?'首次外观': '刷新纪录'}的{species(confirm.item.speciesId).name}。{confirm.choice === 'sell' ? '出售' : releaseLabel(confirm.item)}后图鉴仍会保留。</p>
        <div className="dsh-fisher-actions"><button disabled={blocked} onClick={() => {
          void controller.action(confirm.source === 'catch' ? { type: 'catch.resolve', catchId: confirm.item.id, choice: confirm.choice,confirmed:true }
            : { type: 'inventory.resolve', catchId: confirm.item.id, choice: confirm.choice,confirmed:true }); setConfirm(null);
        }}>确认{confirm.choice === 'sell' ? '出售' : releaseLabel(confirm.item)}</button><button onClick={() => setConfirm(null)}>再想想</button></div></div>}
      {cancelConfirm && cast && <div className="dsh-fisher-confirm" role="alert"><p>收起后这一竿会结束。普通消耗饵不退回；定向饵和来客邀请会保留，潮相覆盖次数不退回。</p><div className="dsh-fisher-actions">
        <button disabled={blocked} onClick={() => { void controller.action({ type: 'cast.cancel', castId: cast.id, ownerEpoch: cast.ownerEpoch }); setCancelConfirm(false); }}>确认收竿</button>
        <button onClick={() => setCancelConfirm(false)}>继续留着</button></div></div>}
      <div className="dsh-fisher-connection" data-state={view.error ? 'error' : 'ready'} role="status"><span><span className="dsh-fisher-dot" />
        {view.error ?? (view.busy ? '正在保存…' : data ? '进度已保存在本机' : '正在连接海岸…')}</span>
        {(view.error || !view.connected) && <button disabled={view.busy} onClick={() => void controller.retry()}>{view.retryPending || data?.issue?.startsWith('保存没有完成') ? '重试保存' : '重新连接'}</button>}
      </div>
      {data?.journey.overflow&&<p className="dsh-fisher-overflow" role="status">有货币达到持有上限，超出部分未计入。</p>}
    </div>;
  };
}
