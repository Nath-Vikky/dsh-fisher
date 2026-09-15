import type * as ReactTypes from 'react';
export type CoastIconName='book'|'bag'|'harbor'|'note'|'fish'|'auto'|'coin'|'compass'|'save'|'more';
const paths:Record<CoastIconName,string>={
  book:'M3 5c3-1 6 0 9 2 3-2 6-3 9-2v14c-3-1-6 0-9 2-3-2-6-3-9-2V5ZM12 7v14M6 9l3 1M15 10l3-1',
  bag:'M7 8V6a5 5 0 0 1 10 0v2M5 8h14l2 13H3L5 8ZM8 12v2m8-2v2M8 18h8',
  harbor:'M4 20h16M6 20V8l6-5 6 5v12M3 10l9-8 9 8M10 20v-6h4v6M8 10h1m6 0h1',
  note:'M5 3h13v18H5zM3 7h4m-4 5h4m-4 5h4M10 7h5m-5 4h5m-5 4h3',
  fish:'M5 12c5-7 12-6 16 0-4 6-11 7-16 0Zm0 0-3-4v8l3-4ZM16 11h.01M12 8l-1 4 1 4',
  auto:'M5 6a8 8 0 0 1 14 4M19 5v5h-5M19 18a8 8 0 0 1-14-4M5 19v-5h5M10 9l5 3-5 3V9Z',
  coin:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM12 7v10M15 9c-5-4-9 2-3 3s2 7-3 3',
  compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 8l-2 6-6 2 2-6 6-2Z',
  save:'M4 3h13l3 3v15H4V3ZM8 3v6h8V3M8 21v-8h8v8M10 16h4',
  more:'M5 11h1v1H5zM11 11h1v1h-1zM17 11h1v1h-1z',
};
export function createCoastIcon(React:typeof ReactTypes){return function CoastIcon({name}:{name:CoastIconName}){return <svg className="dsh-fisher-coast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;};}
