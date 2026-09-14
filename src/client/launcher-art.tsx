import * as React from 'react';
import { API } from '../protocol.ts';
import type { LauncherStatus } from '../protocol.ts';
import { GUEST_ART } from '../game/visuals.ts';

export function LauncherArt({status}:{status:LauncherStatus}){
  const automatic=status!=='shore';
  return <><span className="dsh-fisher-launcher-picture" aria-hidden="true">
    <span className="dsh-fisher-launcher-sky"/>
    {automatic?<svg className="dsh-fisher-launcher-rod" viewBox="0 0 68 82" fill="none">
      <path d="M7 65 43 20Q52 9 58 18" stroke="#183e58" strokeWidth="5" strokeLinecap="square"/>
      <path d="M8 64 44 21Q52 12 57 18" stroke="#edc990" strokeWidth="2.5"/>
      <path d="m8 64 9-11" stroke="#8d6149" strokeWidth="5"/>
      <path d="m25 41 3 2m7-14 3 2" stroke="#214d67" strokeWidth="3"/>
      <circle cx="17" cy="58" r="4" fill="#d5e8e6" stroke="#214d67" strokeWidth="2"/>
      <path d="M18 58h6v4" stroke="#214d67" strokeWidth="2"/>
      <path d="M57 19 54 60" stroke="#f5f3d7" strokeWidth="1.5"/>
      <path d="M58 19 55 60" stroke="#214d67" strokeWidth=".7"/>
      <g className="dsh-fisher-launcher-bobber">
        <path d="M54 53v6" stroke="#214d67" strokeWidth="1.5"/>
        <path d="m54 57 4 6-4 6-4-6z" fill="#f8e7bf" stroke="#214d67" strokeWidth="1.5"/>
        <path d="m50 63 4 6 4-6" fill="#e39473"/>
      </g>
    </svg>:<img className="dsh-fisher-launcher-portrait" src={`${API}/assets/${GUEST_ART.G002.base.portrait}`} alt="" draggable={false} decoding="async"/>}
    <span className="dsh-fisher-launcher-water">
      <svg className="dsh-fisher-launcher-wave is-back" viewBox="0 0 136 36" preserveAspectRatio="none"><path d="M0 10Q8 2 17 10T34 10T51 10T68 10T85 10T102 10T119 10T136 10V36H0Z" fill="#459cca"/><path d="M0 10Q8 2 17 10T34 10T51 10T68 10T85 10T102 10T119 10T136 10" fill="none" stroke="#c4f5f1" strokeWidth="1"/></svg>
      <svg className="dsh-fisher-launcher-wave is-front" viewBox="0 0 136 36" preserveAspectRatio="none"><path d="M0 15Q8 23 17 15T34 15T51 15T68 15T85 15T102 15T119 15T136 15V36H0Z" fill="#267bac"/><path d="M4 28h12m7-5h8m14 6h12m15-1h12m7-5h8m14 6h12" stroke="#9ee6ea" strokeWidth="1.5"/></svg>
      <i/><i/><i/>
    </span>
    {automatic&&<span className="dsh-fisher-launcher-ripple"/>}
    <span className="dsh-fisher-launcher-glint"/>
  </span><span className="dsh-fisher-launcher-caption">{automatic?status==='fishing'?'自动钓鱼':'自动暂歇':'摸鱼海岸'}</span></>;
}
