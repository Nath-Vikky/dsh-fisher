export interface WindowState {
  open: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  lowPerformance: boolean;
}

const KEY = 'dsh-fisher:window:v1';
export const presets = { compact: [360, 640], standard: [420, 720], roomy: [480, 820] } as const;

export function createWindowStore() {
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
    };
  };
  let state: WindowState = fit({ open: false, width: 420, height: 720,
    x: window.innerWidth - 444, y: window.innerHeight - 800, lowPerformance: false });
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved !== null && typeof saved === 'object') {
      const row = saved as Record<string, unknown>;
      const numeric = (key: 'x' | 'y' | 'width' | 'height') =>
        typeof row[key] === 'number' && Number.isFinite(row[key]) ? row[key] : state[key];
      state = fit({ ...state, x: numeric('x'), y: numeric('y'), width: numeric('width'), height: numeric('height'),
        lowPerformance: row.lowPerformance === true });
    }
  } catch { /* Device preferences are optional. */ }

  const persist = () => {
    try {
      const { open: _open, ...saved } = state;
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch { /* A blocked or full storage area must not prevent opening the panel. */ }
  };
  const set = (patch: Partial<WindowState>, save = false) => {
    const next = fit({ ...state, ...patch });
    if (Object.keys(next).every(key => next[key as keyof WindowState] === state[key as keyof WindowState])) return;
    state = next;
    if (save) persist();
    for (const listener of listeners) listener();
  };
  const reset = () => set({ width: 420, height: 720, x: window.innerWidth - 444, y: window.innerHeight - 800 }, true);
  const resize = () => set({}, true);
  window.addEventListener('resize', resize);

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    set, persist, reset,
    preset(name: keyof typeof presets) { const [width, height] = presets[name]; set({ width, height }, true); },
    dispose() { window.removeEventListener('resize', resize); listeners.clear(); },
  };
}

export type WindowStore = ReturnType<typeof createWindowStore>;
