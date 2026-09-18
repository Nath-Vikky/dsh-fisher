import type { RegionId, Species } from './content.ts';
import type { Tide } from './progression.ts';
import type { GuestId } from './guests.ts';
import type { EncounterMeta } from './encounters.ts';
import type { Catch } from './engine.ts';
import { species } from './content.ts';

export const SPOT_IDS = ['pier', 'cove'] as const;
export type SpotId = typeof SPOT_IDS[number];
export const STORY_STAGES = ['quiet','bottle','charted','recovered','built'] as const;
export type ShoreStory = typeof STORY_STAGES[number];
export interface ShoreState { spots: Record<RegionId, SpotId>; story: ShoreStory; searched: number; timber: number }
export function emptyShore(): ShoreState { return { spots: { L01:'pier', L02:'pier', L03:'pier', L04:'pier' },story:'quiet',searched:0,timber:0 }; }
export function isSpot(value: unknown): value is SpotId { return value === 'pier' || value === 'cove'; }
export function waterClue(spot: SpotId, tide: Tide): { title: string; detail: string } {
  return spot === 'cove'
    ? { title:'浅水鱼影', detail:'普通鱼更常见，同稀有层中偏爱谷香的鱼更容易靠近。适合攒鱼、找浅湾线索。' }
    : { title:tide === 'odd' ? '异常水纹' : '深水气泡', detail:'奇珍异兽和旧物更容易上钩。奇潮时，奇珍异兽还会更活跃。' };
}
export function spotWeights(region: RegionId, spot?: SpotId): readonly number[] | null {
  return region !== 'L01' || !spot ? null : spot === 'cove' ? [96,3,1] : [80,14,6];
}
export function spotPreference(def: Species, spot?: SpotId): number {
  return def.region === 'L01' && spot === 'cove' && def.tags.includes('grain') ? 2 : 1;
}
export function recordShoreCatch(shore:ShoreState,meta:EncounterMeta):void {
  if(meta.region!=='L01'||meta.source==='invitation')return;
  if(shore.story==='quiet'&&meta.spot==='cove'){
    shore.searched=Math.min(2,shore.searched+1);if(shore.searched===2)shore.story='bottle';
  }else if(shore.story==='charted'&&meta.spot==='pier')shore.story='recovered';
}
export function shoreVisitor(shore:ShoreState,region:RegionId,visitor:GuestId|null):GuestId|null {
  return region==='L01'&&shore.story==='bottle'?'G001':visitor;
}
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
