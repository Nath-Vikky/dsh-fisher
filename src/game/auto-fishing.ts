import { species } from './content.ts';
import type { Catch } from './engine.ts';
import type { SpeciesId,RegionId } from './content.ts';
import { SPECIES } from './content.ts';
import type { ShoreState,SpotId } from './shore.ts';

export const AUTO_GOALS=['relax','catalog','coins','clues'] as const;
export type AutoGoal=typeof AUTO_GOALS[number];
export const AUTO_GOAL_NAMES:Record<AutoGoal,string>={relax:'随心钓',catalog:'补图鉴',coins:'攒壳币',clues:'找线索'};
export const AUTO_GOAL_DETAILS:Record<AutoGoal,string>={
  relax:'沿用所选落点和鱼饵，所有收获都保留。',
  catalog:'留在当前海岸，提高未发现类别、稀有层与条目的权重。每竿多用25%活动时间，上限20分钟；定向饵和原有保底仍优先。',
  coins:'摸鱼塘自动选择浅湾。只出售重复、原色、普通鱼；首次发现、纪录、特殊外观和奇珍全部保留。背包满时仍先暂停。',
  clues:'在摸鱼塘按故事进度选择浅湾或栈桥。发现信件或旧铃后暂停等待你处理；线索不会过期。',
};
export const isAutoGoal=(value:unknown):value is AutoGoal=>AUTO_GOALS.some(goal=>goal===value);

export interface AutoCast { elapsedMs:number; requiredMs:number }
export interface AutoFishingState {
  enabled:boolean; caught:number; seen:number; recent:Catch[]; reason:string|null;
  goal:AutoGoal; sold:number; earnedCoins:number; recentSold:string[];
}
export interface AutoFishingView extends AutoFishingState { working:boolean }
export const emptyAutoFishing=():AutoFishingState=>({enabled:false,caught:0,seen:0,recent:[],reason:null,goal:'relax',sold:0,earnedCoins:0,recentSold:[]});

export function autoFishingDuration(item:Catch,goal?:AutoGoal):number {
  const def=species(item.speciesId),tier=def.rarity??(def.kind==='relic'?4:def.kind==='guest'?2:3);
  const base=[60_000,120_000,240_000,480_000][tier-1]!;
  const appearance=item.variant==='starsand'?2:item.variant==='pearl'?1.5:1;
  return Math.min(1200000,Math.round(base*appearance*((item.quality??0)>=950?1.25:1)*(goal==='catalog'?1.25:1)));
}
export function automaticSpot(goal:AutoGoal,region:RegionId,shore:ShoreState,known:readonly SpeciesId[]):SpotId {
  if(region!=='L01'||goal==='relax')return shore.spots[region];
  if(goal==='coins')return 'cove';
  if(goal==='clues')return shore.story==='quiet'?'cove':'pier';
  return SPECIES.some(def=>def.region===region&&def.kind==='fish'&&!known.includes(def.id))?'cove':'pier';
}
export function cluePause(region:RegionId,shore:ShoreState):string|null {
  if(region!=='L01')return '线索在摸鱼塘，切换海岸后再继续。';
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
