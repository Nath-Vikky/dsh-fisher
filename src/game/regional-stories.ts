import {species} from './content.ts';
import type {RegionId} from './content.ts';
import type {GuestId} from './guests.ts';
import type {SpotId} from './shore.ts';
import type {EncounterMeta} from './encounters.ts';
import type {Catch} from './engine.ts';

export const STORY_REGIONS=['L02','L03','L04'] as const;
export type StoryRegion=typeof STORY_REGIONS[number];
export const REGIONAL_STAGES=['quiet','found','seeking','ready','built'] as const;
export type StoryChoice='near'|'far';
export interface RegionalStory {stage:typeof REGIONAL_STAGES[number];found:number;choice:StoryChoice|null;progress:number;spots:SpotId[]}
interface StoryBranch {name:string;detail:string;kind:'catches'|'glow'|'tour'|'unusual';spot:SpotId;need:number}
interface StoryDefinition {title:string;guest:GuestId;discovery:SpotId;clue:string;opening:string;cost:number;branches:Record<StoryChoice,StoryBranch>}
export const REGIONAL_STORIES:Record<StoryRegion,StoryDefinition>={
  L02:{title:'海风的礼物',guest:'G003',discovery:'cove',clue:'贝壳浅滩有几段褪色的彩绳。成功收获两次，捎回这份海风的礼物。',opening:'这些彩绳以前挂在湾边的小摊上。我们可以串起贝壳，也可以给珊瑚做一盏小灯。你想把哪种声音留在这里？',cost:40,branches:{
    near:{name:'贝壳声串',detail:'在贝壳浅滩再成功收获2次，收集被浪捎来的贝壳。',kind:'catches',spot:'cove',need:2},
    far:{name:'珊瑚风灯',detail:'去珊瑚栈桥成功收获2次，找回灯座的零件。',kind:'catches',spot:'pier',need:2},
  }},
  L03:{title:'替月亮留一盏灯',guest:'G004',discovery:'cove',clue:'睡莲池畔的水影里藏着一片旧灯罩。成功收获两次，看看它还记不记得月光。',opening:'灯罩上的星孔还完好。可以等辉潮落进池水，也可以沿两处水边走一圈，把归途的方向记下来。两种办法都能点亮它。',cost:60,branches:{
    near:{name:'月辉灯',detail:'辉潮时在睡莲池畔成功收获1次。可继续钓鱼等潮水变化，也可使用码头的试潮。',kind:'glow',spot:'cove',need:1},
    far:{name:'归途星图',detail:'分别在睡莲池畔、月下木台成功收获1次，潮汐不限。',kind:'tour',spot:'cove',need:2},
  }},
  L04:{title:'远航的回声',guest:'G002',discovery:'pier',clue:'深水栈台下面漂着一枚旧信号片。成功收获两次，顺着回声找到它。',opening:'这枚信号片曾替夜航的船指路。礁岸的星砂能点亮一排航灯；深水的特别访客，也许能带回更远处的回声。',cost:90,branches:{
    near:{name:'星砂航灯',detail:'在星砂礁岸成功收获3次，用耐心点亮沿岸的小灯。',kind:'catches',spot:'cove',need:3},
    far:{name:'深水信标',detail:'在深水栈台收获1项稀有鱼（三星及以上）、奇珍异兽或旧物。',kind:'unusual',spot:'pier',need:1},
  }},
};
export function emptyRegionalStories():Record<StoryRegion,RegionalStory>{const empty=():RegionalStory=>({stage:'quiet',found:0,choice:null,progress:0,spots:[]});return {L02:empty(),L03:empty(),L04:empty()};}
export const isStoryRegion=(region:RegionId):region is StoryRegion=>region!=='L01';
export function regionalSpot(region:StoryRegion,state:RegionalStory):SpotId {
  const def=REGIONAL_STORIES[region];if(state.stage==='quiet'||!state.choice)return def.discovery;
  const branch=def.branches[state.choice];return branch.kind==='tour'?(state.spots.includes('cove')?'pier':'cove'):branch.spot;
}
export function recordRegionalCatch(states:Record<StoryRegion,RegionalStory>,meta:EncounterMeta,item:Catch):void {
  if(!isStoryRegion(meta.region)||!meta.spot||meta.source==='invitation')return;
  const state=states[meta.region],def=REGIONAL_STORIES[meta.region];
  if(state.stage==='quiet'&&meta.spot===def.discovery){state.found++;if(state.found===2)state.stage='found';return;}
  if(state.stage!=='seeking'||!state.choice)return;
  const branch=def.branches[state.choice],caught=species(item.speciesId);
  if(branch.kind==='tour'){
    if(!state.spots.includes(meta.spot))state.spots.push(meta.spot);state.progress=state.spots.length;
  }else if(meta.spot===branch.spot&&(branch.kind==='catches'||branch.kind==='glow'&&meta.tide==='glow'||branch.kind==='unusual'&&(caught.kind==='abstract'||caught.kind==='relic'||caught.kind==='fish'&&(caught.rarity??0)>=3)))state.progress++;
  if(state.progress===branch.need)state.stage='ready';
}
export function regionalPause(region:StoryRegion,state:RegionalStory):string|null {
  if(state.stage==='found')return '线索已收好，打开岸边故事，听听来客的建议并选一条路线。';
  if(state.stage==='ready')return '故事材料已备齐，等你到岸边完成布置。';
  if(state.stage==='built')return `${REGIONAL_STORIES[region].title}已完成，可以换一个托管目标。`;
  return null;
}
