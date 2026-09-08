import { REGIONS, species } from './content.ts';
import type { RegionId, SpeciesId, Tag } from './content.ts';
import type { GearId, Loadout } from './gear.ts';
export const BAIT_IDS = ['B01','B02','B03','B04','B05','B06','B07','B08'] as const;
export type BaitId = typeof BAIT_IDS[number];
export interface Bait { id: BaitId; name: string; coins: number; tokens: number; tag: Tag | null; description: string }
export const BAITS: readonly Bait[] = [
  {id:'B01',name:'普通面团',coins:0,tokens:0,tag:null,description:'免费无限，使用地区基础池。'},
  {id:'B02',name:'谷香饵',coins:10,tokens:0,tag:'grain',description:'同稀有层内偏好谷香的鱼权重翻倍。'},
  {id:'B03',name:'海盐饵',coins:10,tokens:0,tag:'marine',description:'同稀有层内偏好海盐的鱼权重翻倍。'},
  {id:'B04',name:'夜光饵',coins:15,tokens:0,tag:'glow',description:'同稀有层内偏好光亮的鱼权重翻倍。'},
  {id:'B05',name:'怪味饵',coins:15,tokens:0,tag:null,description:'奇珍异兽类别权重翻倍。'},
  {id:'B06',name:'深潜饵',coins:20,tokens:0,tag:'deep',description:'深潜偏好权重翻倍，遗物类别权重增加 25%。'},
  {id:'B07',name:'图鉴定向饵',coins:60,tokens:2,tag:null,description:'指定本区已公开线索的未发现条目，引导你收获。'},
  {id:'B08',name:'来客邀请饵',coins:0,tokens:0,tag:null,description:'完成来客请求后获得，邀请指定的来客。'},
];
export const TIDES = ['calm','glow','odd'] as const;
export type Tide = typeof TIDES[number];
export const TIDE_NAMES: Record<Tide,string> = {calm:'平潮',glow:'浮光',odd:'奇潮'};
export interface Journey {
  region: RegionId; bait: BaitId; target: SpeciesId | null;
  ownedGear: GearId[]; loadout: Loadout; baits: Partial<Record<BaitId,number>>;
  completed: Record<RegionId,number>; dryStreak: Record<RegionId,number>; variantStreak: number;
  totalCaught: number; totalEscaped: number; lengthRecords: number; miniCaught: number;
  releaseProgress: number; tideFinals: number; tideOverride: {tide:Tide; remaining:number} | null;
  tideTrialUsed: boolean; tutorialDone: boolean; invitations: SpeciesId[]; overflow: boolean;
}
export function emptyJourney(): Journey {
  return {region:'L01',bait:'B01',target:null,ownedGear:['D01','N01','U01'],loadout:{rod:'D01',line:'N01',float:'U01'},baits:{},
    completed:{L01:0,L02:0,L03:0,L04:0},dryStreak:{L01:0,L02:0,L03:0,L04:0},variantStreak:0,
    totalCaught:0,totalEscaped:0,lengthRecords:0,miniCaught:0,releaseProgress:0,tideFinals:0,tideOverride:null,
    tideTrialUsed:false,tutorialDone:false,invitations:[],overflow:false};
}
export function levelInfo(experience: number): {level:number; current:number; needed:number} {
  let remaining = experience;
  for (let level=1;level<20;level++) { const needed=40+20*level; if (remaining<needed) return {level,current:remaining,needed}; remaining-=needed; }
  return {level:20,current:remaining,needed:0};
}
export function regionUnlocked(id: RegionId, experience: number, research: number): boolean {
  const region = REGIONS.find(item=>item.id===id)!;
  return levelInfo(experience).level>=region.level && research>=region.research;
}
export function currentTide(journey: Journey): Tide { return journey.tideOverride?.tide ?? TIDES[Math.floor(journey.tideFinals/12)%3]!; }
export function bait(id: BaitId): Bait { const result=BAITS.find(item=>item.id===id); if (!result) throw new Error('Unknown bait'); return result; }
export function isBaitId(value: unknown): value is BaitId { return BAIT_IDS.some(id=>id===value); }
export function isTide(value: unknown): value is Tide { return TIDES.some(id=>id===value); }
export function finishTide(journey: Journey, region: RegionId): void { journey.tideFinals++; journey.completed[region]++; }
export function consumeOverride(journey: Journey): void {
  if (journey.tideOverride && --journey.tideOverride.remaining === 0) journey.tideOverride=null;
}
export function isInventorySpecies(id: SpeciesId): boolean { return ['fish','abstract'].includes(species(id).kind); }
