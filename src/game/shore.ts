import type { RegionId, Species } from './content.ts';
import type { Tide } from './progression.ts';
import type { GuestId } from './guests.ts';
import type { EncounterMeta } from './encounters.ts';
import type { Catch } from './engine.ts';
import { species } from './content.ts';
import {emptyRegionalStories,isStoryRegion,REGIONAL_STORIES} from './regional-stories.ts';
import type {RegionalStory,StoryRegion} from './regional-stories.ts';
import type {CompanionId} from './companions.ts';

export const SPOT_IDS = ['pier', 'cove'] as const;
export type SpotId = typeof SPOT_IDS[number];
export const STORY_STAGES = ['quiet','bottle','charted','recovered','built'] as const;
export type ShoreStory = typeof STORY_STAGES[number];
export interface ShoreState { spots: Record<RegionId, SpotId>; story: ShoreStory; searched: number; timber: number; companion:CompanionId|null; regions:Record<StoryRegion,RegionalStory> }
export function emptyShore(): ShoreState { return { spots: { L01:'pier', L02:'pier', L03:'pier', L04:'pier' },story:'quiet',searched:0,timber:0,companion:null,regions:emptyRegionalStories() }; }
export function isSpot(value: unknown): value is SpotId { return value === 'pier' || value === 'cove'; }
export function waterClue(spot: SpotId, tide: Tide,region:RegionId='L01'): { title: string; detail: string } {
  if(region==='L02')return spot==='cove'?{title:'贝沙游鱼',detail:'浅滩普通鱼较多，同稀有层中偏爱海鲜的鱼更容易靠近；适合捡拾海风故事的线索。'}:{title:'珊瑚怪影',detail:'栈桥的奇珍异兽和旧物更常见。怪味饵、奇潮会进一步吸引奇珍异兽。'};
  if(region==='L03')return spot==='cove'?{title:'莲下萤光',detail:'睡莲间更容易遇到普通鱼，同稀有层中偏爱微光的鱼更多；辉潮仍影响特殊外观。'}:{title:'月影深纹',detail:'木台外侧的奇珍异兽和旧物更多，同稀有层中偏爱深海气味的鱼更容易上钩。'};
  if(region==='L04')return spot==='cove'?{title:'星砂鱼群',detail:'礁岸普通鱼更多，同稀有层中偏爱微光的鱼更容易靠近；适合慢慢筹备航灯材料。'}:{title:'深处回声',detail:'栈台更容易带回奇珍异兽与旧物，同稀有层中偏爱深海气味的鱼更多。'};
  return spot === 'cove'
    ? { title:'浅水鱼影', detail:'普通鱼更常见，同稀有层中偏爱谷香的鱼更容易靠近。适合攒鱼、找浅湾线索。' }
    : { title:tide === 'odd' ? '异常水纹' : '深水气泡', detail:'奇珍异兽和旧物更容易上钩。奇潮时，奇珍异兽还会更活跃。' };
}
export function spotWeights(region: RegionId, spot?: SpotId): readonly number[] | null {
  const weights={L01:{cove:[96,3,1],pier:[80,14,6]},L02:{cove:[80,16,4],pier:[50,39,11]},L03:{cove:[90,7,3],pier:[67,19,14]},L04:{cove:[87,8,5],pier:[61,23,16]}};
  return spot?weights[region][spot]:null;
}
export function spotPreference(def: Species, spot?: SpotId): number {
  const tag=spot==='cove'?({L01:'grain',L02:'marine',L03:'glow',L04:'glow'} as const)[def.region]:spot==='pier'&&(def.region==='L03'||def.region==='L04')?'deep':null;
  return tag&&def.tags.includes(tag)?2:1;
}
export function recordShoreCatch(shore:ShoreState,meta:EncounterMeta):void {
  if(meta.region!=='L01'||meta.source==='invitation')return;
  if(shore.story==='quiet'&&meta.spot==='cove'){
    shore.searched=Math.min(2,shore.searched+1);if(shore.searched===2)shore.story='bottle';
  }else if(shore.story==='charted'&&meta.spot==='pier')shore.story='recovered';
}
export function shoreVisitor(shore:ShoreState,region:RegionId,visitor:GuestId|null):GuestId|null {
  return storyVisitor(shore,region)??visitor;
}
export function storyVisitor(shore:ShoreState,region:RegionId):GuestId|null {return region==='L01'?(shore.story==='bottle'?'G001':null):shore.regions[region].stage==='found'?REGIONAL_STORIES[region].guest:null;}
export function storyNotice(shore:ShoreState,region:RegionId):boolean {return isStoryRegion(region)?['found','ready'].includes(shore.regions[region].stage):shore.story==='bottle'||shore.story==='recovered';}
export function buildingFish(item:Catch):boolean {
  const def=species(item.speciesId);return def.kind==='fish'&&(def.rarity??9)<=2&&item.variant==='original';
}
export const SHORE_STORY:Record<ShoreStory,{title:string;detail:string;next:string}>={
  quiet:{title:'浅湾的瓶中信',detail:'芦苇边有一只被水草缠住的玻璃瓶。把鱼线送近一些，也许能捎它上岸。',next:'在摸鱼塘的芦苇浅湾成功收获两次。'},
  bottle:{title:'一封褪色的信',detail:'瓶子里藏着半张旧码头草图。贝邮来到了岸边，似乎认得上面的记号。',next:'找贝邮解读瓶中信，或在这里打开信件。'},
  charted:{title:'三根木桩的水影',detail:'贝邮圈出了木栈桥尽头：那里曾经挂着一串报平安的铃铛。',next:'去摸鱼塘的木栈桥成功收获一次，顺着鱼线找回旧铃。'},
  recovered:{title:'让旧铃重新响起',detail:'鱼线带回了一枚小铃和风铃架的草图。把普通渔获交给木匠，就能换来修架子的木料。',next:'捐两条原色普通鱼换两份木料，再花30壳币修好风铃架。'},
  built:{title:'海岸有了回音',detail:'旧铃挂回了岸边。贝邮在架子上留下一张小卡片：“这个地址，风也记住了。”',next:'风铃架会一直留在摸鱼塘，作为这段小旅行的纪念。'},
};
