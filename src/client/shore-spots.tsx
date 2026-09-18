import type * as ReactTypes from 'react';
import type { Bootstrap } from '../protocol.ts';
import type { GameController } from './controller.ts';
import { SPOT_IDS, waterClue } from '../game/shore.ts';
import { currentTide } from '../game/progression.ts';
import { COASTS } from './world/regions.ts';

export function createShoreSpots(React: typeof ReactTypes) {
  return function ShoreSpots({data,controller,disabled}:{data:Bootstrap;controller:GameController;disabled:boolean}) {
    const region=data.journey.region,selected=data.active?.setup?.spot??data.shore.spots[region];
    return <fieldset className="dsh-fisher-spot-picker" disabled={disabled||!!data.active||!!data.pending}>
      <legend>这一竿的落点</legend>
      <div>{SPOT_IDS.map(spot=>{const clue=waterClue(spot,currentTide(data.journey));return <button key={spot} aria-pressed={selected===spot}
        onClick={()=>void controller.action({type:'shore.spot',spot})}><strong>{COASTS[region].places[spot].name}</strong>
        {region==='L01'&&<small>{clue.title}</small>}</button>;})}</div>
      {region==='L01'&&<p>{waterClue(selected,currentTide(data.journey)).detail}</p>}
      {data.active&&<small>收起这一竿后可以换落点。</small>}
    </fieldset>;
  };
}
