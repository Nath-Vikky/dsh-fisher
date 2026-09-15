import type * as ReactTypes from 'react';
export type CoastIconName='book'|'bag'|'harbor'|'note'|'fish'|'auto'|'coin'|'compass'|'save'|'more'|'star';
const icons:Record<CoastIconName,{shape:string;detail:string;tint:string}>={
  book:{shape:'M3 4h7v1h4V4h7v15h-7v1h-4v-1H3Z',detail:'M12 6v13M6 8h3M6 11h3M15 8h3M15 11h3',tint:'#aac7b0'},
  bag:{shape:'M8 3h8v3h3v4h2v10H3V10h2V6h3Z',detail:'M8 6V3h8v3M4 11h16M9 10h6v4H9Z',tint:'#b4a4bf'},
  harbor:{shape:'M10 2h4v3h3v3h4v3h-2v10H5V11H3V8h4V5h3Z',detail:'M4 10h16M10 21v-7h4v7M8 7h8',tint:'#c2c59a'},
  note:{shape:'M5 2h15v20H5Z',detail:'M3 6h4M3 11h4M3 16h4M10 6h6M10 10h6M10 14h4',tint:'#e0c79a'},
  fish:{shape:'M2 8h3v2h2V7h4V5h6v2h3v3h2v4h-2v3h-3v2h-6v-2H7v-3H5v2H2Z',detail:'M16 9v2h2V9ZM11 7v3H9v4h2v3',tint:'#a7d5ca'},
  auto:{shape:'M7 3h10v2h3v3h2v3h-6V8h-2V7H8V5H5v4H2V6h2V4h3ZM2 13h6v3h2v1h6v2h3v-4h3v3h-2v2h-3v1H7v-2H4v-3H2Z',detail:'M10 10h2v1h2v2h-2v1h-2Z',tint:'#a7c4b0'},
  coin:{shape:'M8 2h8v2h4v4h2v8h-2v4h-4v2H8v-2H4v-4H2V8h2V4h4Z',detail:'M9 7h6v2H9v6h6v2H9M12 5v2m0 10v2',tint:'#edcb73'},
  compass:{shape:'M8 2h8v2h4v4h2v8h-2v4h-4v2H8v-2H4v-4H2V8h2V4h4Z',detail:'M15 7h2v2h-2v4h-2v2H9v2H7v-2h2v-4h2V9h4ZM11 11h2v2h-2Z',tint:'#c8d3b4'},
  save:{shape:'M3 2h14v2h2v2h2v16H3Z',detail:'M7 3v6h9V3M7 22v-9h10v9M10 16h4',tint:'#b0b4ce'},
  more:{shape:'M2 10h4v4H2ZM10 10h4v4h-4ZM18 10h4v4h-4Z',detail:'',tint:'#dac391'},
  star:{shape:'M10 2h4v5h3v3h5v4h-5v3h-3v5h-4v-5H7v-3H2v-4h5V7h3Z',detail:'M11 9h2v6h-2Z',tint:'#b0c8db'},
};
export function createCoastIcon(React:typeof ReactTypes){return function CoastIcon({name}:{name:CoastIconName}){const icon=icons[name];return <svg className="dsh-fisher-coast-icon" viewBox="0 0 24 24" stroke="#57475b" strokeWidth="1" strokeLinejoin="miter" strokeLinecap="square" shapeRendering="crispEdges" aria-hidden="true"><path d={icon.shape} fill={icon.tint}/>{icon.detail&&<path d={icon.detail} fill="none"/>}</svg>;};}
