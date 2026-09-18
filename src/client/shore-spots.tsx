import type * as ReactTypes from 'react';
import type { Bootstrap } from '../protocol.ts';
import type { GameController } from './controller.ts';
import { SPOT_IDS, waterClue } from '../game/shore.ts';
import { currentTide } from '../game/progression.ts';
import { COASTS } from './world/regions.ts';
import { automaticSpot } from '../game/auto-fishing.ts';
import type { SpeciesId } from '../game/content.ts';
import { createHelp } from './compact-ui.tsx';
import { createCoastIcon } from './coast-icons.tsx';

export function createShoreSpots(React: typeof ReactTypes) {
  const Help=createHelp(React),Icon=createCoastIcon(React);
  return function ShoreSpots({data,controller,disabled,automatic=false,compact=false}:{data:Bootstrap;controller:GameController;disabled:boolean;automatic?:boolean;compact?:boolean}) {
    const region=data.journey.region,planned=automatic&&data.autoFishing.goal!=='relax';
    const selected=data.active?.setup?.spot??(planned?automaticSpot(data.autoFishing.goal,region,data.shore,Object.keys(data.catalog) as SpeciesId[]):data.shore.spots[region]);
    if(compact)return <section className="dsh-fisher-auto-spot" aria-label="托管落点"><div className="dsh-fisher-auto-section-heading"><strong>{data.active?'这一竿的落点':'出发落点'}</strong><small>{data.active?'下一竿可以更换':planned?'由目标安排':COASTS[region].name}</small></div>
      {planned||data.active?<div className="dsh-fisher-auto-route"><Icon name="compass"/><span>{COASTS[region].name} · {COASTS[region].places[selected].name}</span>{region==='L01'&&<Help label="落点线索"><p>{waterClue(selected,currentTide(data.journey)).detail}</p></Help>}</div>
        :<div className="dsh-fisher-auto-spots">{SPOT_IDS.map(spot=><button key={spot} disabled={disabled||!!data.pending} aria-pressed={selected===spot} onClick={()=>void controller.action({type:'shore.spot',spot})}><span aria-hidden="true">{selected===spot?'◆':'◇'}</span>{COASTS[region].places[spot].name}</button>)}</div>}
    </section>;
    return <fieldset className="dsh-fisher-spot-picker" disabled={disabled||!!data.active||!!data.pending||planned}>
      <legend>这一竿的落点</legend>
      <div>{SPOT_IDS.map(spot=>{const clue=waterClue(spot,currentTide(data.journey));return <button key={spot} aria-pressed={selected===spot}
        onClick={()=>void controller.action({type:'shore.spot',spot})}><strong>{COASTS[region].places[spot].name}</strong>
        {region==='L01'&&<small>{clue.title}</small>}</button>;})}</div>
      {region==='L01'&&<p>{waterClue(selected,currentTide(data.journey)).detail}</p>}
      {data.active&&<small>收起这一竿后可以换落点。</small>}
      {!data.active&&planned&&<small>目标会选择落点；选择「随心钓」可自己指定。</small>}
    </fieldset>;
  };
}
