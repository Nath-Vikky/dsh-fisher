export interface WindowState {
  open: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  lowPerformance: boolean;
  theme: 'system'|'light'|'dark';
  fontSize: 14|16|18;
  reducedMotion: boolean;
  sound: boolean;
  volume: number;
  aspectLocked: boolean;
  aspectRatio: number;
  launcherX:number;
  launcherY:number;
}

const KEY = 'dsh-fisher:window:v1';
export const presets = { compact: [360, 640], standard: [420, 720], roomy: [480, 820] } as const;

export function createWindowStore() {
  let launcherWidth=128,launcherHeight=42;
  const listeners = new Set<() => void>();
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const fit = (next: WindowState): WindowState => {
    const maxWidth = Math.max(1, window.innerWidth - 16);
    const maxHeight = Math.max(1, window.innerHeight - 16);
    const width = clamp(next.width, Math.min(320, maxWidth), maxWidth);
    const height = clamp(next.height, Math.min(360, maxHeight), maxHeight);
    return { ...next, width, height,
      x: clamp(next.x, 8, Math.max(8, window.innerWidth - width - 8)),
      y: clamp(next.y, 8, Math.max(8, window.innerHeight - height - 8)),
      launcherX:clamp(next.launcherX,0,Math.max(0,window.innerWidth-launcherWidth)),
      launcherY:clamp(next.launcherY,0,Math.max(0,window.innerHeight-launcherHeight)),
    };
  };
  let state: WindowState = fit({ open: false, width: 420, height: 720,
    x: window.innerWidth - 444, y: window.innerHeight - 800, lowPerformance: false,
    theme:'system',fontSize:14,reducedMotion:false,sound:false,volume:.35,aspectLocked:true,aspectRatio:420/720,
    launcherX:window.innerWidth-220,launcherY:window.innerHeight-62 });
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved !== null && typeof saved === 'object') {
      const row = saved as Record<string, unknown>;
      if(typeof row.launcherWidth==='number'&&row.launcherWidth>=40&&row.launcherWidth<=400)launcherWidth=row.launcherWidth;
      if(typeof row.launcherHeight==='number'&&row.launcherHeight>=20&&row.launcherHeight<=100)launcherHeight=row.launcherHeight;
      const numeric = (key: 'x' | 'y' | 'width' | 'height'|'launcherX'|'launcherY') =>
        typeof row[key] === 'number' && Number.isFinite(row[key]) ? row[key] : state[key];
      state = fit({ ...state, x: numeric('x'), y: numeric('y'), width: numeric('width'), height: numeric('height'),launcherX:numeric('launcherX'),launcherY:numeric('launcherY'),
        lowPerformance: row.lowPerformance === true,theme:row.theme==='light'||row.theme==='dark'?row.theme:'system',
        fontSize:row.fontSize===16||row.fontSize===18?row.fontSize:14,reducedMotion:row.reducedMotion===true,sound:row.sound===true,
        volume:typeof row.volume==='number'&&Number.isFinite(row.volume)?clamp(row.volume,0,1):.35,
        aspectLocked:row.aspectLocked!==false,aspectRatio:typeof row.aspectRatio==='number'&&row.aspectRatio>=.3&&row.aspectRatio<=3?row.aspectRatio:420/720 });
      if(typeof row.relativeX==='number'&&typeof row.relativeY==='number'&&Number.isFinite(row.relativeX)&&Number.isFinite(row.relativeY))state=fit({...state,
        x:8+clamp(row.relativeX,0,1)*Math.max(0,window.innerWidth-state.width-16),
        y:8+clamp(row.relativeY,0,1)*Math.max(0,window.innerHeight-state.height-16)});
      if(typeof row.launcherRelativeX==='number'&&typeof row.launcherRelativeY==='number'&&Number.isFinite(row.launcherRelativeX)&&Number.isFinite(row.launcherRelativeY))state=fit({...state,
        launcherX:clamp(row.launcherRelativeX,0,1)*Math.max(0,window.innerWidth-launcherWidth),launcherY:clamp(row.launcherRelativeY,0,1)*Math.max(0,window.innerHeight-launcherHeight)});
    }
  } catch { /* Device preferences are optional. */ }

  const persist = () => {
    try {
      const { open: _open, ...saved } = state;
      localStorage.setItem(KEY, JSON.stringify({...saved,
        launcherWidth,launcherHeight,
        launcherRelativeX:state.launcherX/Math.max(1,window.innerWidth-launcherWidth),launcherRelativeY:state.launcherY/Math.max(1,window.innerHeight-launcherHeight),
        relativeX:(state.x-8)/Math.max(1,window.innerWidth-state.width-16),relativeY:(state.y-8)/Math.max(1,window.innerHeight-state.height-16)}));
    } catch { /* A blocked or full storage area must not prevent opening the panel. */ }
  };
  const set = (patch: Partial<WindowState>, save = false) => {
    const next = fit({ ...state, ...patch });
    if (Object.keys(next).every(key => next[key as keyof WindowState] === state[key as keyof WindowState])) return;
    state = next;
    if (save) persist();
    for (const listener of listeners) listener();
  };
  const reset = () => set({ width: 420, height: 720,aspectRatio:420/720, x: window.innerWidth - 444, y: window.innerHeight - 800 }, true);
  let viewportWidth=window.innerWidth,viewportHeight=window.innerHeight;
  const resize = () => {
    const launcherRelativeX=state.launcherX/Math.max(1,viewportWidth-launcherWidth),launcherRelativeY=state.launcherY/Math.max(1,viewportHeight-launcherHeight);
    const relativeX=(state.x-8)/Math.max(1,viewportWidth-state.width-16),relativeY=(state.y-8)/Math.max(1,viewportHeight-state.height-16);
    const fitted=fit(state);viewportWidth=window.innerWidth;viewportHeight=window.innerHeight;
    set({x:8+relativeX*Math.max(0,viewportWidth-fitted.width-16),y:8+relativeY*Math.max(0,viewportHeight-fitted.height-16),
      launcherX:launcherRelativeX*Math.max(0,viewportWidth-launcherWidth),launcherY:launcherRelativeY*Math.max(0,viewportHeight-launcherHeight)},true);
  };
  const resizeTo=(width:number,height:number,save=false) => {
    if(state.aspectLocked) {
      if(Math.abs((width-state.width)/state.width)>=Math.abs((height-state.height)/state.height))height=width/state.aspectRatio;
      else width=height*state.aspectRatio;
    }
    set({width,height},save);
  };
  window.addEventListener('resize', resize);

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    set, persist, reset,resizeTo,
    measureLauncher(width:number,height:number){launcherWidth=width;launcherHeight=height;set({});},
    resetLauncher(){set({launcherX:window.innerWidth-launcherWidth-92,launcherY:window.innerHeight-launcherHeight-20},true);},
    dock(side:'left'|'right') {set({x:side==='left'?8:window.innerWidth-state.width-8},true);},
    preset(name: keyof typeof presets) { const [width, height] = presets[name]; set({ width, height,aspectRatio:width/height }, true); },
    dispose() { window.removeEventListener('resize', resize); listeners.clear(); },
  };
}

export type WindowStore = ReturnType<typeof createWindowStore>;
