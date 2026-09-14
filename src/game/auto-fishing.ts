import { species } from './content.ts';
import type { Catch } from './engine.ts';

export interface AutoCast { elapsedMs:number; requiredMs:number }
export interface AutoFishingState {
  enabled:boolean; caught:number; seen:number; recent:Catch[]; reason:string|null;
}
export interface AutoFishingView extends AutoFishingState { working:boolean }
export const emptyAutoFishing=():AutoFishingState=>({enabled:false,caught:0,seen:0,recent:[],reason:null});

export function autoFishingDuration(item:Catch):number {
  const def=species(item.speciesId),tier=def.rarity??(def.kind==='relic'?4:def.kind==='guest'?2:3);
  const base=[60_000,120_000,240_000,480_000][tier-1]!;
  const appearance=item.variant==='starsand'?2:item.variant==='pearl'?1.5:1;
  return Math.round(base*appearance*((item.quality??0)>=950?1.25:1));
}
export function fishingTime(ms:number):string {
  const seconds=Math.ceil(Math.max(0,ms)/1000),minutes=Math.floor(seconds/60);
  return minutes?`${minutes}分${seconds%60?`${seconds%60}秒`:''}`:`${seconds}秒`;
}
