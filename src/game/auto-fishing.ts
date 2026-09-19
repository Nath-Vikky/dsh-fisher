import { species } from './content.ts';
import type { Catch } from './engine.ts';
import type { SpeciesId,RegionId } from './content.ts';
import { SPECIES } from './content.ts';
import type { ShoreState,SpotId } from './shore.ts';
import {isStoryRegion,regionalSpot,regionalPause} from './regional-stories.ts';
import type {CompanionId} from './companions.ts';

export const AUTO_GOALS=['relax','catalog','coins','clues','legend'] as const;
export type AutoGoal=typeof AUTO_GOALS[number];
export const AUTO_GOAL_NAMES:Record<AutoGoal,string>={relax:'随心钓',catalog:'补图鉴',coins:'攒壳币',clues:'找线索',legend:'追传说'};
export const AUTO_GOAL_DETAILS:Record<AutoGoal,string>={
  relax:'沿用所选落点和鱼饵，所有收获都保留。',
  catalog:'留在当前海岸，提高未发现类别、稀有层与条目的权重。每竿多用25%活动时间，上限20分钟；定向饵和原有保底仍优先。',
  coins:'自动选择当前海岸普通鱼较多的浅水落点。只出售重复、原色、普通鱼；首次发现、纪录、特殊外观和奇珍全部保留。背包满时仍先暂停。',
  clues:'按当前海岸的故事路线选择落点。发现线索或备齐材料后暂停，等你交谈或布置；线索不会过期。',
  legend:'按传说线索选择浅湾或深水落点。需要换岸、鱼饵或潮相时暂停，等你准备；不会自动消费壳币。',
};
export const isAutoGoal=(value:unknown):value is AutoGoal=>AUTO_GOALS.some(goal=>goal===value);

export interface AutoCast { elapsedMs:number; requiredMs:number }
export interface AutoFishingState {
  enabled:boolean; caught:number; seen:number; recent:Catch[]; reason:string|null;
  goal:AutoGoal; sold:number; earnedCoins:number; recentSold:string[];
}
export interface AutoFishingView extends AutoFishingState { working:boolean }
export const emptyAutoFishing=():AutoFishingState=>({enabled:false,caught:0,seen:0,recent:[],reason:null,goal:'relax',sold:0,earnedCoins:0,recentSold:[]});

export function autoFishingDuration(item:Catch,goal?:AutoGoal,companion?:CompanionId|null):number {
  const def=species(item.speciesId),tier=def.rarity??(def.kind==='relic'?4:def.kind==='guest'?2:3);
  const base=[60_000,120_000,240_000,480_000][tier-1]!;
  const appearance=item.variant==='starsand'?2:item.variant==='pearl'?1.5:1;
  return Math.round(Math.min(1200000,Math.round(base*appearance*((item.quality??0)>=950?1.25:1)*(goal==='catalog'?1.25:1)))*(companion==='A004'?.9:1));
}
export function automaticSpot(goal:AutoGoal,region:RegionId,shore:ShoreState,known:readonly SpeciesId[]):SpotId {
  if(goal==='relax')return shore.spots[region];
  if(goal==='coins')return 'cove';
  if(goal==='legend')return region==='L03'?'cove':'pier';
  if(goal==='clues')return isStoryRegion(region)?regionalSpot(region,shore.regions[region]):shore.story==='quiet'?'cove':'pier';
  return SPECIES.some(def=>def.region===region&&def.kind==='fish'&&!known.includes(def.id))?'cove':'pier';
}
export function cluePause(region:RegionId,shore:ShoreState):string|null {
  if(isStoryRegion(region))return regionalPause(region,shore.regions[region]);
  if(shore.story==='bottle')return '瓶中信已收好，等你找贝邮解读后继续。';
  if(shore.story==='recovered')return '旧铃已找回，等你筹备木料修建风铃架。';
  if(shore.story==='built')return '这段故事已经完成，可以换一个托管目标。';
  return null;
}
export function autoSellable(item:Catch):boolean {
  const def=species(item.speciesId);
  return def.kind==='fish'&&(def.rarity??9)<=2&&item.variant==='original'&&!item.isNew&&!item.isNewVariant&&!item.isRecord&&!item.locked;
}
export function fishingTime(ms:number):string {
  const seconds=Math.ceil(Math.max(0,ms)/1000),minutes=Math.floor(seconds/60);
  return minutes?`${minutes}分${seconds%60?`${seconds%60}秒`:''}`:`${seconds}秒`;
}
