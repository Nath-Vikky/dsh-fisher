import type { RegionId,SpeciesId } from './content.ts';
import { species } from './content.ts';
import type { GuestId } from './guests.ts';
import type { EncounterMeta } from './encounters.ts';
import type { Journey } from './progression.ts';
import { currentTide } from './progression.ts';
import type { ShoreState,SpotId } from './shore.ts';

export const LEGEND_SPECIES:SpeciesId='F026';
export const PICNIC_MENUS={soup:'暖鱼汤',grill:'香烤小鱼'} as const;
export const PICNIC_MOODS={quiet:'安静听海',lively:'聊点趣事'} as const;
export type PicnicMenu=keyof typeof PICNIC_MENUS;
export type PicnicMood=keyof typeof PICNIC_MOODS;
export interface Picnic {guest:GuestId;region:RegionId;menu:PicnicMenu;mood:PicnicMood;species:SpeciesId}
export interface MemorialMemory {kind:'letter'|'light';species:SpeciesId}
export interface Adventures {
  legend:{stage:'unknown'|'heard'|'ready'|'complete';moon:boolean;deep:boolean;armed:boolean};
  memorials:Partial<Record<RegionId,MemorialMemory>>;
  picnic:Picnic|null;album:Picnic[];
}
export const emptyAdventures=():Adventures=>({legend:{stage:'unknown',moon:false,deep:false,armed:false},memorials:{},picnic:null,album:[]});
export function hasMemorial(shore:ShoreState,region:RegionId):boolean {
  return region==='L01'?shore.story==='built':shore.regions[region].stage==='built';
}
export function legendAvailable(shore:ShoreState):boolean {
  return (['L01','L02','L03','L04'] as const).some(region=>hasMemorial(shore,region));
}
export function legendEligible(adventures:Adventures,journey:Journey,spot:SpotId):boolean {
  return adventures.legend.stage==='ready'&&adventures.legend.armed&&journey.region==='L04'&&spot==='pier'&&journey.bait==='B06'&&currentTide(journey)==='glow';
}
export function recordAdventureCatch(adventures:Adventures,meta:EncounterMeta):void {
  const legend=adventures.legend;
  if(meta.source==='legend'){legend.stage='complete';legend.armed=false;return;}
  if(legend.stage!=='heard')return;
  if(meta.region==='L03'&&meta.spot==='cove'&&meta.tide==='glow')legend.moon=true;
  if(meta.region==='L04'&&meta.spot==='pier'&&meta.bait==='B06')legend.deep=true;
  if(legend.moon&&legend.deep)legend.stage='ready';
}
export function legendPause(adventures:Adventures,journey:Journey):string|null {
  const legend=adventures.legend;
  if(legend.stage==='unknown')return '先到岸边故事听一听传说。修好任意一岸的纪念设施后开放。';
  if(legend.stage==='complete')return '宝石鱼的追踪已经完成，可以换一个托管目标。';
  if(legend.stage==='ready'){
    if(!legend.armed)return '线索已齐，先到岸边故事准备特别遭遇。';
    if(journey.region!=='L04')return '带上线索，去深潜海的深水栈台。';
  }else if(!legend.moon){
    if(journey.region!=='L03')return '第一条线索在月光池的浅水落点。';
    if(currentTide(journey)!=='glow')return '等月光池迎来浮光，或在码头选择浮光潮相。';
    return null;
  }else if(journey.region!=='L04')return '下一条线索在深潜海的深水栈台。';
  if(journey.bait!=='B06')return '在码头选用深潜饵，再继续追踪。';
  if(legend.stage==='ready'&&currentTide(journey)!=='glow')return '特别遭遇需要浮光潮相；可以到码头准备。';
  return null;
}
export const picnicKey=(picnic:Picnic):string=>`${picnic.guest}/${picnic.region}/${picnic.menu}/${picnic.mood}`;
export function picnicScript(picnic:Picnic):readonly {speaker:'guest'|'player';text:string}[]{
  const opening={G001:'信袋先放一边。今天寄出的，是这顿饭的香气。',G002:'海风里多了一种味道。原来你把岸边变成了小餐桌。',G003:'我带了勺子！没有多带甜点，是想给你的菜留点位置。',G004:'这次没有待办，也没有谜题。一起坐一会儿吧。'}[picnic.guest];
  const quiet={G001:'不说话也没关系。我想把这段浪声，记在下一张明信片上。',G002:'听，远一点的浪和近一点的浪，声音是不一样的。',G003:'我平时话很多……不过和你一起安静吃饭，好像也挺好。',G004:'刚才经过的那片云，我已经记住了。今天不用追着它跑。'}[picnic.guest];
  const lively={G001:'有一次信封被海鸥叼走，我追到栈桥尽头，才发现里面只是自己的午饭菜单。',G002:'你说宝石鱼会不会也收藏我们掉进水里的东西？也许它有一整架鱼漂。',G003:'我曾经把鱼饵盒当成点心盒带出门。放心，今天出门前检查了三遍。',G004:'我给这次旅行起了个名字：吃饱了才去下一站。名字长一点，才容易记住。'}[picnic.guest];
  return [{speaker:'guest',text:opening},{speaker:'player',text:`今天用${species(picnic.species).name}做了${PICNIC_MENUS[picnic.menu]}。${picnic.mood==='quiet'?'一起听一会儿海吧。':'边吃边聊，说点最近遇到的趣事吧。'}`},
    {speaker:'guest',text:picnic.menu==='soup'?'热汤慢慢喝，刚好可以把脚步也放慢。':'外面香香的，里面还很嫩。刚才等待的时间很值得。'},
    {speaker:'guest',text:picnic.mood==='quiet'?quiet:lively},{speaker:'player',text:'把今天留在野餐相册里。下次换一道菜，也换一段故事。'}];
}
export function memorialText(region:RegionId,memory:MemorialMemory):string {
  const shore={L01:'风铃响起来的时候',L02:'贝壳小径被潮水照亮时',L03:'月光落到纪念物上时',L04:'灯塔的光扫过深海时'}[region];
  return `${shore}，${memory.kind==='letter'?'这封留下的信':'这盏小小的灯'}记着你遇见${species(memory.species).name}的日子。收藏仍在，故事也有了自己的名字。`;
}
