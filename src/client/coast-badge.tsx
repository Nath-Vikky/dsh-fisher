import type * as ReactTypes from 'react';
import type { RegionId } from '../game/content.ts';

export function createCoastBadge(React:typeof ReactTypes) {
  return function CoastBadge({region}:{region:RegionId}) {
    const night=region==='L03'||region==='L04';
    return <svg className="dsh-fisher-coast-badge" viewBox="0 0 96 52" fill="none" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M0 52V28H4V20H8V14H16V8H26V4H36V0H60V4H70V8H80V14H88V20H92V28H96V52Z" fill="#b39b73"/>
      <path d="M4 50V28H8V22H12V16H20V10H28V8H38V4H58V8H68V10H76V16H84V22H88V28H92V50Z" fill={night?'#42405c':'#85b7b2'} stroke="#f6edca" strokeWidth="2"/>
      {night?<><path d="M64 12H72V16H68V24H76V28H64V24H60V16H64Z" fill="#f9e1a2"/><path d="M24 18h4v4h-4zM42 10h2v2h-2zM80 32h2v2h-2z" fill="#fff5d9"/></>:<><path d="M24 14h10v4h4v10h-4v4H24v-4h-4V18h4Z" fill="#efc37b"/><path d="M55 18h12v4h8v4H49v-4h6Z" fill="#f4efdb"/></>}
      <path d="M6 38h12v-4h12v4h14v4h18v-4h14v-4h12v16H6Z" fill={night?'#647b92':'#568f91'}/>
      <path d="M8 42h8v2H8zM25 46h14v2H25zM50 43h8v2h-8zM68 46h16v2H68z" fill={night?'#b1ceca':'#b8ddd0'}/>
    </svg>;
  };
}
