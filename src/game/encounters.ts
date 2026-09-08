import { SPECIES, species, region } from './content.ts';
import type { RegionId, Species, SpeciesId, Variant } from './content.ts';
import { randomStream } from './engine.ts';
import type { Catch, Encounter, Mode } from './engine.ts';
import { modifiers } from './gear.ts';
import { bait, currentTide } from './progression.ts';
import type { BaitId, Journey, Tide } from './progression.ts';
export type EncounterSource = 'random' | 'pity' | 'target' | 'invitation' | 'tutorial' | 'legacy';
export interface EncounterMeta { source:EncounterSource; region:RegionId; bait:BaitId; tide:Tide }
export function weighted<T>(items: readonly T[], weight:(item:T)=>number, random:()=>number): T {
  const total=items.reduce((sum,item)=>sum+weight(item),0);
  if (!(total>0)) throw new Error('没有匹配的候选，鱼饵未消耗');
  let pick=random()*total;
  for (const item of items) { pick-=weight(item); if (pick<0) return item; }
  return items[items.length-1]!;
}
export function categoryProbabilities(regionId:RegionId, baitId:BaitId, tide:Tide): readonly number[] {
  const base=region(regionId).weights;
  const weights=[base[0],base[1]*(baitId==='B05'?2:1)*(tide==='odd'?1.5:1),base[2]*(baitId==='B06'?1.25:1)];
  const total=weights.reduce((a,b)=>a+b,0);
  return weights.map(weight=>weight/total);
}
export function preferenceAvailable(regionId:RegionId, baitId:BaitId): boolean {
  const tag=bait(baitId).tag;
  return !tag || SPECIES.some(item=>item.region===regionId&&item.tags.includes(tag));
}
export function rollEncounter(seed:number,id:string,mode:Mode,journey:Journey,discovered:readonly SpeciesId[]): Encounter & {meta:EncounterMeta} {
  const location=journey.region, baitId=journey.bait, tide=currentTide(journey);
  const pool=SPECIES.filter(item=>item.region===location && item.kind!=='guest');
  const missing=pool.filter(item=>!discovered.includes(item.id));
  if (!preferenceAvailable(location,baitId)) throw new Error('这个钓点没有偏好这种鱼饵的鱼，请换一种饵');
  const tag=bait(baitId).tag;
  const preference=(item:Species)=>tag&&item.tags.includes(tag)?2:1;
  const pick=randomStream(seed,'entry-v2');
  let def:Species, source:EncounterSource='random';
  if (baitId==='B08') {
    if (!journey.target || !journey.invitations.includes(journey.target)) throw new Error('还没有这位来客的邀请');
    def=species(journey.target);
    if (def.kind!=='guest'||def.region!==location||discovered.includes(def.id)) throw new Error('这份邀请现在不可使用');
    source='invitation';
  } else if (baitId==='B07') {
    def=missing.find(item=>item.id===journey.target)!;
    if (!def || journey.completed[location]<10) throw new Error('请先选择本区已公开线索的未发现条目');
    source='target';
  } else if (!journey.tutorialDone) {
    def=species('F001');source='tutorial';
    if (location!=='L01'||baitId!=='B01') throw new Error('先用普通面团，在摸鱼塘完成第一竿');
  } else if (journey.dryStreak[location]>=8 && missing.length) {def=weighted(missing,preference,pick);source='pity';}
  else {
    const probabilities=categoryProbabilities(location,baitId,tide);
    const category=weighted([0,1,2] as const,item=>probabilities[item]!,randomStream(seed,'category-v2'));
    const candidates=pool.filter(item=>item.kind===(['fish','abstract','relic'] as const)[category]);
    if (category===0) {
      const rarity=weighted([1,2,3,4],item=>[60,26,11,3][item-1]!,randomStream(seed,'rarity-v2'));
      def=weighted(candidates.filter(item=>item.rarity===rarity),preference,pick);
    } else def=weighted(candidates,item=>item.poolWeight,pick);
  }
  const sizes=randomStream(seed,'size-v2');
  let lengthMm:number|null=null,weightG:number|null=null,quality:number|null=null,variant:Variant|null=null;
  let sizeFactor=1,variantFactor=1;
  if (def.creature) {
    const u=sizes(),min=def.min!,max=def.max!,peak=def.mode!;
    lengthMm=Math.round(u<(peak-min)/(max-min)?min+Math.sqrt(u*(max-min)*(peak-min)):max-Math.sqrt((1-u)*(max-min)*(max-peak)));
    const q=lengthMm<=peak?(lengthMm-min)**2/((max-min)*(peak-min)):1-(max-lengthMm)**2/((max-min)*(max-peak));
    weightG=Math.max(1,Math.round(def.weight!*(lengthMm/peak)**3*(.9+sizes()*.2)));
    quality=Math.round(q*1000);sizeFactor=.75+.75*q;
    variant=journey.variantStreak>=39?'pearl':weighted(['original','pearl','starsand'] as const,
      item=>(tide==='glow'?{original:90,pearl:8,starsand:2}:{original:93,pearl:6,starsand:1})[item],randomStream(seed,'variant-v2'));
    variantFactor=variant==='pearl'?1.15:variant==='starsand'?1.5:1;
  }
  const behavior=randomStream(seed,'behavior-v2');
  const catchItem:Catch={id,speciesId:def.id,region:location,lengthMm,weightG,quality,variant,
    price:def.price===0?0:Math.max(1,Math.min(1000,Math.round(def.price*region(location).prices*sizeFactor*variantFactor))),
    caughtAt:'',isNew:false,isRecord:false,isNewVariant:false,locked:false};
  return {catch:catchItem,challenge:{seed:Math.floor(behavior()*4294967296),waitTicks:40+Math.floor(behavior()*81),
    pattern:def.pattern,mode:['target','invitation','tutorial'].includes(source)?'guided':mode,rulesVersion:2,modifiers:modifiers(journey.loadout),size:quality??500},
    meta:{source,region:location,bait:baitId,tide}};
}
