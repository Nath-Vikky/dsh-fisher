import * as React from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client';
import type { SettingsSectionOwnerProps } from '@deepseek-ai/dsh-client-ui-settings/client';
import { API, VERSION } from './protocol.ts';
import type { GameProps } from './protocol.ts';
import { createWindowStore } from './client/window-store.ts';
import type { WindowStore } from './client/window-store.ts';
import { styles } from './client/styles.ts';

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'dsh-fisher': 'title'; }
  interface SlotMap {
    'settings.section': { kind: 'list'; scope: 'root'; owner: SettingsSectionOwnerProps };
  }
}

export const inject = ['slots', 'locale'];
type ClientContext = Context & { slots: SlotRegistry; locale: LocaleRuntime };

class GameBoundary extends React.Component<{ children: React.ReactNode; retry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className="dsh-fisher-loading"><p>海岸暂时未能打开，请检查 DSH 连接。</p><button onClick={this.props.retry}>重新打开</button></div>
      : this.props.children;
  }
}

function createComponents(store: WindowStore) {
  const useWindow = () => React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  let pending: Promise<{ default: React.ComponentType<GameProps> }> | undefined;
  let loadAttempt = 0;
  const loadGame = () => {
    pending ??= (async () => {
      const url = `${API}/client/game.js?v=${encodeURIComponent(VERSION)}&attempt=${loadAttempt++}`;
      const loaded: unknown = await import(/* @vite-ignore */ url);
      if (typeof loaded !== 'object' || loaded === null || !('createGame' in loaded)
        || typeof loaded.createGame !== 'function') throw new Error('Invalid game module');
      const createGame = loaded.createGame as (react: typeof React) => React.ComponentType<GameProps>;
      return { default: createGame(React) };
    })().catch(error => { pending = undefined; throw error; });
    return pending;
  };

  function Overlay() {
    const view = useWindow();
    const opener = React.useRef<HTMLButtonElement>(null);
    const [attempt, setAttempt] = React.useState(0);
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
      store.set(drag.mode === 'move' ? { x: drag.x + dx, y: drag.y + dy }
        : { width: drag.width + dx, height: drag.height + dy });
    };
    const end = () => { gesture.current = undefined; store.persist(); };

    return <>
      <div className="dsh-fisher dsh-fisher-launcher">
        <button ref={opener} className="dsh-fisher-open" aria-label="打开摸鱼海岸" aria-expanded={view.open}
          onClick={() => store.set({ open: !view.open })}><span aria-hidden="true">⌁</span> 摸鱼海岸</button>
      </div>
      {view.open && <section className="dsh-fisher dsh-fisher-panel" aria-label="摸鱼海岸" role="region"
        style={{ left: view.x, top: view.y, width: view.width, height: view.height }}
        onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
        <header className="dsh-fisher-header" onPointerDown={event => start('move', event)} onPointerMove={move}
          onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onDoubleClick={() => store.reset()}>
          <div className="dsh-fisher-brand"><span aria-hidden="true">⌁</span><div><strong>摸鱼海岸</strong><small>A LITTLE TIME BY THE SEA</small></div></div>
          <button className="dsh-fisher-icon" onClick={close} aria-label="收起摸鱼海岸">×</button>
        </header>
        <div className="dsh-fisher-body">
          <GameBoundary key={attempt} retry={() => setAttempt(value => value + 1)}>
            <React.Suspense fallback={<p className="dsh-fisher-loading" role="status">正在走向海边…</p>}>
              <Game lowPerformance={view.lowPerformance} />
            </React.Suspense>
          </GameBoundary>
        </div>
        <button className="dsh-fisher-resize" aria-label="调整窗口大小（方向键）" title="拖动或用方向键调整大小，也可在设置中输入尺寸"
          onPointerDown={event => start('resize', event)} onPointerMove={move} onPointerUp={end}
          onPointerCancel={end} onLostPointerCapture={end} onKeyDown={event => {
            const steps: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
            const step = steps[event.key];
            if (!step) return;
            event.preventDefault(); event.stopPropagation();
            store.set({ width: view.width + step[0], height: view.height + step[1] }, true);
          }} />
      </section>}
    </>;
  }

  function Settings() {
    const view = useWindow();
    return <section className="dsh-fisher-settings" aria-label="摸鱼海岸设置">
      <h3>摸鱼海岸</h3><p>工作间隙，来海边坐一会儿。</p>
      <button onClick={() => store.set({ open: !view.open })}>{view.open ? '收起海岸' : '打开海岸'}</button>
      <div className="dsh-fisher-setting-row"><span>窗口尺寸</span>
        <button onClick={() => store.preset('compact')}>紧凑</button><button onClick={() => store.preset('standard')}>标准</button>
        <button onClick={() => store.preset('roomy')}>宽松</button></div>
      <div className="dsh-fisher-setting-row">
        <label>宽度 <input type="number" min={320} max={Math.max(320, window.innerWidth - 16)} step={10}
          value={Math.round(view.width)} onChange={event => {
            const width = event.target.valueAsNumber;
            if (Number.isFinite(width)) store.set({ width }, true);
          }} /></label>
        <label>高度 <input type="number" min={360} max={Math.max(360, window.innerHeight - 16)} step={10}
          value={Math.round(view.height)} onChange={event => {
            const height = event.target.valueAsNumber;
            if (Number.isFinite(height)) store.set({ height }, true);
          }} /></label>
      </div>
      <div className="dsh-fisher-setting-row"><label><input type="checkbox" checked={view.lowPerformance}
        onChange={event => store.set({ lowPerformance: event.target.checked }, true)} />降低动画与画布开销</label></div>
      <button onClick={() => store.reset()}>窗口归位</button>
    </section>;
  }
  return { Overlay, Settings };
}

export function apply(ctx: ClientContext): void {
  const store = createWindowStore();
  ctx.effect(() => () => store.dispose(), 'dsh-fisher: window preferences');
  ctx.effect(() => {
    const style = document.createElement('style');
    style.dataset.plugin = 'dsh-fisher';
    style.textContent = styles;
    document.head.appendChild(style);
    return () => style.remove();
  }, 'dsh-fisher: scoped styles');
  ctx.effect(() => ctx.locale.register('dsh-fisher', { zh: { title: '摸鱼海岸' }, en: { title: 'Fisher' } }), 'dsh-fisher: locale');
  const { Overlay, Settings } = createComponents(store);
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'dsh-fisher', order: 81 }, Overlay));
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'dsh-fisher', order: 151, label: () => ctx.locale.bind('dsh-fisher')('title'),
  }, Settings));
}
