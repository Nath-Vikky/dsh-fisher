import type * as ReactTypes from 'react';
import { COAST_ASSET } from '../protocol.ts';
import type { GameProps } from '../protocol.ts';
import { drawCoast } from './coast.ts';

export function createScene(React: typeof ReactTypes) {
  function Scene({ lowPerformance, paused = false }: GameProps & { paused?: boolean }) {
    const canvas = React.useRef<HTMLCanvasElement>(null);
    const pausedRef = React.useRef(paused);
    pausedRef.current = paused;
    const restart = React.useRef<() => void>(() => {});
    React.useEffect(() => { restart.current(); }, [paused]);
    const [artState, setArtState] = React.useState<'loading' | 'ready' | 'error'>('loading');
    const [artAttempt, setArtAttempt] = React.useState(0);
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
      let artwork: HTMLImageElement | undefined;
      const picture = new Image();
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      const render = (now: number) => {
        if (stopped || document.hidden || pausedRef.current) return;
        if (now - last >= (lowPerformance ? 50 : 1000 / 30)) {
          elapsed += Math.min(50, now - last) / 1000;
          last = now;
          drawCoast(context, width, height, reduced.matches ? 0 : elapsed, artwork);
        }
        frame = requestAnimationFrame(render);
      };
      const start = () => {
        cancelAnimationFrame(frame);
        if (stopped || document.hidden) return;
        last = performance.now();
        drawCoast(context, width, height, reduced.matches ? 0 : elapsed, artwork);
        if (!reduced.matches && !pausedRef.current && artwork) frame = requestAnimationFrame(render);
      };
      restart.current = start;
      const resize = () => {
        const rect = element.getBoundingClientRect();
        if (rect.width === width && rect.height === height) return;
        width = rect.width; height = rect.height;
        const ratio = 1 / (lowPerformance ? 3 : 2);
        element.width = Math.max(1, Math.ceil(width * ratio));
        element.height = Math.max(1, Math.ceil(height * ratio));
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        start();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      document.addEventListener('visibilitychange', start);
      reduced.addEventListener('change', start);
      resize();
      setArtState('loading');
      const deadline = setTimeout(() => {
        picture.onload = null; picture.onerror = null; picture.removeAttribute('src');
        if (!stopped) setArtState('error');
      }, 15_000);
      picture.onload = () => {
        clearTimeout(deadline);
        if (stopped) return;
        artwork = picture; setArtState('ready'); start();
      };
      picture.onerror = () => { clearTimeout(deadline); if (!stopped) setArtState('error'); };
      picture.src = `${COAST_ASSET}${artAttempt ? `?retry=${artAttempt}` : ''}`;
      return () => {
        stopped = true; cancelAnimationFrame(frame); observer.disconnect();
        restart.current = () => {};
        clearTimeout(deadline); picture.onload = null; picture.onerror = null; picture.removeAttribute('src');
        document.removeEventListener('visibilitychange', start); reduced.removeEventListener('change', start);
      };
    }, [lowPerformance, artAttempt]);
    return <><canvas ref={canvas} aria-label="像素海湾与木码头" role="img" data-scene-state={artState} />
      {artState !== 'ready' && <div className="dsh-fisher-scene-loading" role="status">
        <span>{artState === 'error' ? '海岸画面暂时没有展开' : '正在展开海岸…'}</span>
        {artState === 'error' && <button onClick={() => setArtAttempt(value => value + 1)}>重新加载画面</button>}
      </div>}</>;
  }

  return Scene;
}
