import type * as ReactTypes from 'react';
import { API, isBootstrap } from '../protocol.ts';
import type { GameProps } from '../protocol.ts';
import { drawCoast } from './coast.ts';

// Receive the existing React instance; this module has no runtime React import.
export function createGame(React: typeof ReactTypes): ReactTypes.ComponentType<GameProps> {
  function Scene({ lowPerformance }: GameProps) {
    const canvas = React.useRef<HTMLCanvasElement>(null);
    React.useEffect(() => {
      const element = canvas.current;
      const context = element?.getContext('2d', { alpha: false });
      if (!element || !context) return;
      let frame = 0;
      let width = 0;
      let height = 0;
      let last = 0;
      let elapsed = 0;
      let stopped = false;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      const render = (now: number) => {
        if (stopped || document.hidden) return;
        if (now - last >= (lowPerformance ? 50 : 1000 / 30)) {
          elapsed += Math.min(50, now - last) / 1000;
          last = now;
          drawCoast(context, width, height, reduced.matches ? 0 : elapsed);
        }
        frame = requestAnimationFrame(render);
      };
      const start = () => {
        cancelAnimationFrame(frame);
        if (stopped || document.hidden) return;
        last = performance.now();
        drawCoast(context, width, height, reduced.matches ? 0 : elapsed);
        if (!reduced.matches) frame = requestAnimationFrame(render);
      };
      const resize = () => {
        const rect = element.getBoundingClientRect();
        if (rect.width === width && rect.height === height) return;
        width = rect.width; height = rect.height;
        const ratio = Math.min(window.devicePixelRatio || 1, lowPerformance ? 1 : 1.5);
        element.width = Math.max(1, Math.round(width * ratio));
        element.height = Math.max(1, Math.round(height * ratio));
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        start();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      document.addEventListener('visibilitychange', start);
      reduced.addEventListener('change', start);
      resize();
      return () => {
        stopped = true; cancelAnimationFrame(frame); observer.disconnect();
        document.removeEventListener('visibilitychange', start); reduced.removeEventListener('change', start);
      };
    }, [lowPerformance]);
    return <canvas ref={canvas} aria-label="平静海湾与木码头" role="img" />;
  }

  return function Game({ lowPerformance }: GameProps) {
    const [connection, setConnection] = React.useState<'loading' | 'ready' | 'error'>('loading');
    const [message, setMessage] = React.useState('正在连接海岸');
    const [attempt, setAttempt] = React.useState(0);
    React.useEffect(() => {
      let controller: AbortController | undefined;
      let stream: EventSource | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let stopped = false;
      let run = 0;
      const close = () => { run++; controller?.abort(); stream?.close(); if (timer) clearTimeout(timer); };
      const connect = async () => {
        close();
        if (document.hidden || stopped) return;
        const generation = run;
        const current = new AbortController();
        controller = current;
        setConnection('loading'); setMessage('正在连接海岸');
        timer = setTimeout(() => current.abort(), 10_000);
        try {
          const response = await fetch(`${API}/bootstrap`, { credentials: 'same-origin', cache: 'no-store', signal: current.signal });
          if (!response.ok) throw new Error(response.status === 401 ? '请重新连接 DSH' : response.status === 403 ? '当前连接未获允许' : '海岸暂时无法连接');
          const data: unknown = await response.json();
          if (!isBootstrap(data)) throw new Error('插件版本不兼容，请更新后重试');
          if (stopped || generation !== run) return;
          clearTimeout(timer);
          stream = new EventSource(`${API}/events`);
          const active = stream;
          active.addEventListener('snapshot', event => {
            if (stopped || generation !== run) return;
            try {
              const value: unknown = JSON.parse((event as MessageEvent<string>).data);
              if (!isBootstrap(value) || value.generation !== data.generation) throw new Error();
              setConnection('ready'); setMessage('海岸已连接');
            } catch { active.close(); setConnection('error'); setMessage('连接已变化，请重新连接'); }
          });
          active.onerror = () => {
            active.close();
            if (!stopped && generation === run) { setConnection('error'); setMessage('连接已暂停，可手动重连'); }
          };
        } catch (error) {
          if (stopped || generation !== run) return;
          setConnection('error');
          setMessage(current.signal.aborted ? '连接超时，请重试' : error instanceof Error ? error.message : '连接未完成');
        } finally { if (generation === run && timer) clearTimeout(timer); }
      };
      const visibility = () => { if (document.hidden) close(); else void connect(); };
      document.addEventListener('visibilitychange', visibility);
      void connect();
      return () => { stopped = true; close(); document.removeEventListener('visibilitychange', visibility); };
    }, [attempt]);

    return <div className="dsh-fisher-game">
      <div className="dsh-fisher-scene"><Scene lowPerformance={lowPerformance} />
        <div className="dsh-fisher-scene-label"><span>THE QUIET SHORE</span><h2>风平浪静的一天</h2></div>
        <div className="dsh-fisher-note">留一点时间给风，给水，也给自己。</div>
      </div>
      <div className="dsh-fisher-footer"><h3>欢迎来到摸鱼海岸</h3><p>海岸还在布置中，先坐一会儿。</p>
        <div className="dsh-fisher-connection" data-state={connection} role="status">
          <span><span className="dsh-fisher-dot" />{message}</span>
          {connection === 'error' ? <button onClick={() => setAttempt(value => value + 1)}>重新连接</button> : <span>开发预览</span>}
        </div>
      </div>
    </div>;
  };
}
