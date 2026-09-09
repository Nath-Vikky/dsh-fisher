import * as React from 'react';
import { createPortal } from 'react-dom';
import type { Context } from '@deepseek-ai/cordis';
import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client';
import type { SettingsSectionOwnerProps } from '@deepseek-ai/dsh-client-ui-settings/client';
import { API, VERSION } from './protocol.ts';
import type { GameProps } from './protocol.ts';
import { createWindowStore } from './client/window-store.ts';
import type { WindowState, WindowStore } from './client/window-store.ts';
import { styles } from './client/styles.ts';
import { createPluginStore } from './client/plugin-store.ts';
import type { PluginStore } from './client/plugin-store.ts';

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'dsh-fisher': 'title'; }
  interface SlotMap {
    'settings.section': { kind: 'list'; scope: 'root'; owner: SettingsSectionOwnerProps };
  }
}

export const inject = ['slots', 'locale'];
type ClientContext = Context & { slots: SlotRegistry; locale: LocaleRuntime };

function ShoreMark() {
  return <svg className="dsh-fisher-mark" viewBox="0 0 20 20" aria-hidden="true">
    <path fill="currentColor" d="M2 6h3V4h4v2h3v2h3V6h3v3h-3v2h-4V9H8V7H5v2H2zM2 13h3v-2h3v2h3v2h4v-2h3v3h-3v2h-5v-2H7v-2H5v2H2z" />
  </svg>;
}

class GameBoundary extends React.Component<{ children: React.ReactNode; retry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className="dsh-fisher-loading"><p>海岸暂时未能打开，请检查 DSH 连接。</p><button onClick={this.props.retry}>重新打开</button></div>
      : this.props.children;
  }
}

function createComponents(store: WindowStore,plugin:PluginStore) {
  const useWindow = () => React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const usePlugin=()=>React.useSyncExternalStore(plugin.subscribe,plugin.getSnapshot,plugin.getSnapshot);
  let pending: Promise<{ default: React.ComponentType<GameProps> }> | undefined;
  let loadAttempt = 0;
  const loadGame = () => {
    pending ??= (async () => {
      const url = `${API}/client/game.js?v=${encodeURIComponent(VERSION)}&attempt=${loadAttempt++}`;
      const loaded: unknown = await import(/* @vite-ignore */ url);
      if (typeof loaded !== 'object' || loaded === null || !('createGame' in loaded)
        || typeof loaded.createGame !== 'function') throw new Error('Invalid game module');
      const createGame = loaded.createGame as (react: typeof React, portal:typeof createPortal) => React.ComponentType<GameProps>;
      return { default: createGame(React,createPortal) };
    })().catch(error => { pending = undefined; throw error; });
    return pending;
  };

  const appearance=(view:WindowState)=>({'--fisher-font':`${view.fontSize}px`} as React.CSSProperties);
  function Overlay() {
    const view = useWindow();
    const preference=usePlugin();
    const opener = React.useRef<HTMLButtonElement>(null);
    const launcherDrag=React.useRef<{pointerId:number;startX:number;startY:number;x:number;y:number;moved:boolean}>(),ignoreClick=React.useRef(false);
    React.useLayoutEffect(()=>{
      const button=opener.current;if(!button)return;
      const measure=()=>{store.measureLauncher(button.offsetWidth,button.offsetHeight);};measure();
      const observer=new ResizeObserver(measure);observer.observe(button);return ()=>observer.disconnect();
    },[preference.enabled]);
    React.useEffect(()=>{if(!preference.enabled)store.set({open:false});},[preference.enabled]);
    const endLauncher=(event:React.PointerEvent<HTMLButtonElement>)=>{
      const drag=launcherDrag.current;if(!drag||drag.pointerId!==event.pointerId)return;
      ignoreClick.current=drag.moved;launcherDrag.current=undefined;store.persist();
      if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    };
    const [attempt, setAttempt] = React.useState(0);
    const [settingsOpen,setSettingsOpen]=React.useState(false);
    const Game = React.useMemo(() => React.lazy(loadGame), [attempt]);
    const gesture = React.useRef<{ mode: 'move' | 'resize'; pointerId: number; x: number; y: number;
      startX: number; startY: number; width: number; height: number }>();
    const close = () => { store.set({ open: false }); store.persist(); opener.current?.focus(); };
    const start = (mode: 'move' | 'resize', event: React.PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || event.button !== 0) return;
      if (mode === 'move' && (event.target as HTMLElement).closest('button')) return;
      gesture.current = { mode, pointerId: event.pointerId, x: view.x, y: view.y,
        startX: event.clientX, startY: event.clientY, width: view.width, height: view.height };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const move = (event: React.PointerEvent<HTMLElement>) => {
      const drag = gesture.current;
      if (drag === undefined || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if(drag.mode==='move')store.set({x:drag.x+dx,y:drag.y+dy});
      else store.resizeTo(drag.width+dx,drag.height+dy);
    };
    const end = () => { gesture.current = undefined; store.persist(); };

    return <>
      {preference.ready&&preference.enabled&&<div className="dsh-fisher dsh-fisher-launcher" style={{left:view.launcherX,top:view.launcherY}}>
        <button ref={opener} className="dsh-fisher-open" aria-label="打开摸鱼海岸" aria-expanded={view.open}
          title="点击打开海岸；拖动可移动入口，聚焦后用方向键微调"
          onPointerDown={event=>{if(!event.isPrimary||event.button!==0)return;ignoreClick.current=false;launcherDrag.current={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,x:view.launcherX,y:view.launcherY,moved:false};event.currentTarget.setPointerCapture(event.pointerId);}}
          onPointerMove={event=>{const drag=launcherDrag.current;if(!drag||drag.pointerId!==event.pointerId)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){event.preventDefault();store.set({launcherX:drag.x+dx,launcherY:drag.y+dy});}}}
          onPointerUp={endLauncher} onPointerCancel={endLauncher} onLostPointerCapture={endLauncher}
          onKeyDown={event=>{const steps:Record<string,[number,number]>={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};const step=steps[event.key];if(step){event.preventDefault();event.stopPropagation();store.set({launcherX:view.launcherX+step[0],launcherY:view.launcherY+step[1]},true);}}}
          onClick={event => {if(ignoreClick.current&&event.detail!==0){ignoreClick.current=false;return;}store.set({ open: !view.open });}}><ShoreMark />摸鱼海岸</button>
      </div>}
      {preference.enabled&&view.open && <section className="dsh-fisher dsh-fisher-panel" aria-label="摸鱼海岸" role="region" data-theme={view.theme} data-reduced-motion={view.reducedMotion}
        style={{ ...appearance(view), left: view.x, top: view.y, width: view.width, height: view.height }}
        onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if(settingsOpen)setSettingsOpen(false);else close(); } }}>
        <header className="dsh-fisher-header" onPointerDown={event => start('move', event)} onPointerMove={move}
          onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onDoubleClick={() => store.reset()}>
          <div className="dsh-fisher-brand"><ShoreMark /><div><strong>摸鱼海岸</strong><small>FISHER / COAST NOTES</small></div></div>
          <div className="dsh-fisher-header-actions"><button className="dsh-fisher-header-settings" onClick={()=>setSettingsOpen(value=>!value)} aria-label={settingsOpen?"返回海岸":"打开海岸设置"}>{settingsOpen?"返回":"设置"}</button>
          <button className="dsh-fisher-icon" onClick={close} aria-label="收起摸鱼海岸">×</button></div>
        </header>
        <div className="dsh-fisher-body">
          {settingsOpen?<Settings/>:<GameBoundary key={attempt} retry={() => setAttempt(value => value + 1)}>
            <React.Suspense fallback={<p className="dsh-fisher-loading" role="status">正在走向海边…</p>}>
              <Game lowPerformance={view.lowPerformance} reducedMotion={view.reducedMotion} sound={view.sound} volume={view.volume} onEnabledChange={plugin.receiveEnabled}/>
            </React.Suspense>
          </GameBoundary>}
        </div>
        <button className="dsh-fisher-resize" aria-label="调整窗口大小（方向键）" title="拖动或用方向键调整大小，也可在设置中输入尺寸"
          onPointerDown={event => start('resize', event)} onPointerMove={move} onPointerUp={end}
          onPointerCancel={end} onLostPointerCapture={end} onKeyDown={event => {
            const steps: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
            const step = steps[event.key];
            if (!step) return;
            event.preventDefault(); event.stopPropagation();
            store.resizeTo(view.width+step[0],view.height+step[1],true);
          }} />
      </section>}
    </>;
  }

  function Settings() {
    const view = useWindow();
    const preference=usePlugin();
    return <section className="dsh-fisher-settings" aria-label="摸鱼海岸设置" data-theme={view.theme} data-reduced-motion={view.reducedMotion} style={appearance(view)}>
      <h3>摸鱼海岸</h3><p>工作间隙，来海边坐一会儿。</p>
      <div className="dsh-fisher-plugin-setting"><div><strong>启用摸鱼海岸</strong><small>{preference.busy?'正在保存…':preference.enabled?'已启用':'已停用'} · 停用会暂停游戏与补给，保留存档。</small></div><button type="button" className="dsh-fisher-switch" role="switch" aria-label="启用摸鱼海岸插件" aria-checked={preference.enabled} disabled={!preference.ready||!preference.writable||preference.busy} onClick={()=>void plugin.setEnabled(!preference.enabled)}><span/></button></div>
      {preference.error&&<p role="alert">{preference.error} <button onClick={()=>void plugin.refresh()}>重试连接</button></p>}
      <button disabled={!preference.ready||!preference.enabled} onClick={() => store.set({ open: !view.open })}>{view.open ? '收起海岸' : '打开海岸'}</button>
      <div className="dsh-fisher-setting-row"><span>窗口尺寸</span>
        <button onClick={() => store.preset('compact')}>紧凑</button><button onClick={() => store.preset('standard')}>标准</button>
        <button onClick={() => store.preset('roomy')}>宽松</button></div>
      <div className="dsh-fisher-setting-row"><label><input type="checkbox" checked={view.aspectLocked} onChange={event=>store.set({aspectLocked:event.target.checked,aspectRatio:view.width/view.height},true)}/>锁定当前宽高比例</label></div>
      <div className="dsh-fisher-setting-row">
        <label>宽度 <input type="number" key={Math.round(view.width)} min={Math.min(320,window.innerWidth-16)} max={Math.max(1,window.innerWidth-16)} step={10} defaultValue={Math.round(view.width)}
          onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}} onBlur={event=>{const width=event.target.valueAsNumber;if(Number.isFinite(width))store.resizeTo(width,view.height,true);else event.target.value=String(Math.round(view.width));}}/></label>
        <label>高度 <input type="number" key={Math.round(view.height)} min={Math.min(360,window.innerHeight-16)} max={Math.max(1,window.innerHeight-16)} step={10} defaultValue={Math.round(view.height)}
          onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}} onBlur={event=>{const height=event.target.valueAsNumber;if(Number.isFinite(height))store.resizeTo(view.width,height,true);else event.target.value=String(Math.round(view.height));}}/></label>
      </div>
      <div className="dsh-fisher-setting-row"><label>主题<select value={view.theme} onChange={event=>store.set({theme:event.target.value==='dark'?'dark':event.target.value==='light'?'light':'system'},true)}><option value="system">跟随系统</option><option value="light">暖纸浅色</option><option value="dark">夜航深色</option></select></label>
        <label>字号<select value={view.fontSize} onChange={event=>store.set({fontSize:Number(event.target.value)===18?18:Number(event.target.value)===16?16:14},true)}><option value={14}>14 px</option><option value={16}>16 px</option><option value={18}>18 px</option></select></label></div>
      <div className="dsh-fisher-setting-row"><label><input type="checkbox" checked={view.reducedMotion} onChange={event=>store.set({reducedMotion:event.target.checked},true)}/>减少动态效果</label></div>
      <div className="dsh-fisher-setting-row"><label><input type="checkbox" checked={view.sound} onChange={event=>store.set({sound:event.target.checked},true)}/>播放轻声提示</label><label>音量<input type="range" min={0} max={100} step={5} value={Math.round(view.volume*100)} onChange={event=>store.set({volume:Number(event.target.value)/100},true)}/>{Math.round(view.volume*100)}%</label></div>
      <div className="dsh-fisher-setting-row"><label><input type="checkbox" checked={view.lowPerformance}
        onChange={event => store.set({ lowPerformance: event.target.checked }, true)} />降低动画与画布开销</label></div>
      <div className="dsh-fisher-setting-row"><button onClick={()=>store.dock("left")}>停靠左侧</button><button onClick={()=>store.dock("right")}>停靠右侧</button><button onClick={() => store.reset()}>窗口归位</button><button onClick={()=>store.resetLauncher()}>入口归位</button></div>
    </section>;
  }
  return { Overlay, Settings };
}

export function apply(ctx: ClientContext): void {
  const store = createWindowStore();
  const plugin=createPluginStore();
  ctx.effect(()=>()=>plugin.dispose(),'dsh-fisher: plugin preferences');
  ctx.effect(() => () => store.dispose(), 'dsh-fisher: window preferences');
  ctx.effect(() => {
    const style = document.createElement('style');
    style.dataset.plugin = 'dsh-fisher';
    style.textContent = styles;
    document.head.appendChild(style);
    return () => style.remove();
  }, 'dsh-fisher: scoped styles');
  ctx.effect(() => ctx.locale.register('dsh-fisher', { zh: { title: '摸鱼海岸' }, en: { title: 'Fisher' } }), 'dsh-fisher: locale');
  const { Overlay, Settings } = createComponents(store,plugin);
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'dsh-fisher', order: 81 }, Overlay));
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'dsh-fisher', order: 151, label: () => ctx.locale.bind('dsh-fisher')('title'),
  }, Settings));
}
