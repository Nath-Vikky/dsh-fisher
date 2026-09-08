import { SPECIES, region, species } from './content.ts';
import type { RegionId, SpeciesId } from './content.ts';
import { bait } from './progression.ts';
import type { BaitId } from './progression.ts';
import type { Catch } from './engine.ts';
import type { LifeContext } from './life.ts';

export type Goal =
  | { kind:'catch'; required:number; region:RegionId|null; group:'any'|'fish'|'abstract'|'relic' }
  | { kind:'regions'; required:2; regions:[RegionId,RegionId] }
  | { kind:'release'; required:number }
  | { kind:'deliver'; required:3; species:SpeciesId }
  | { kind:'quality'; required:1; minimum:750 }
  | { kind:'variant'; required:1 }
  | { kind:'baits'; required:2; allowed:BaitId[] }
  | { kind:'safe'; required:2; threshold:200000 }
  | { kind:'discover'; required:1; region:RegionId }
  | { kind:'display-new'; required:1 }
  | { kind:'display'; required:number; region:RegionId }
  | { kind:'quests'; required:3 }
  | { kind:'record'; required:1 }
  | { kind:'distinct-fish'; required:3 }
  | { kind:'decorate-catch'; required:3 };
export interface GoalTask { goal:Goal; acceptedOrder:number; progress:number; marks:string[] }
export type LifeEvent =
  | { type:'catch'; item:Catch; bait:BaitId; peakDanger:number; lengthRecord:boolean }
  | { type:'release'; item:Catch }
  | { type:'display'; item:Catch }
  | { type:'quest' };
export function newTask(goal:Goal, acceptedOrder:number): GoalTask { return {goal,acceptedOrder,progress:0,marks:[]}; }
export function advanceGoal(task:GoalTask,event:LifeEvent): void {
  const goal=task.goal;
  let increment=false;
  if (event.type==='catch') {
    const item=event.item,def=species(item.speciesId);
    switch(goal.kind) {
      case 'catch': increment=(!goal.region||goal.region===item.region)&&(goal.group==='any'||def.kind===goal.group);break;
      case 'regions':
        if(goal.regions.includes(item.region)&&task.marks.filter(id=>id===item.region).length<goal.required)task.marks.push(item.region);break;
      case 'quality': increment=item.quality!==null&&item.quality>=goal.minimum;break;
      case 'variant': increment=item.variant==='pearl'||item.variant==='starsand';break;
      case 'baits': if(goal.allowed.includes(event.bait)&&!task.marks.includes(event.bait)&&task.marks.length<goal.required)task.marks.push(event.bait);break;
      case 'safe': increment=event.peakDanger<goal.threshold;break;
      case 'discover': increment=item.isNew&&item.region===goal.region;break;
      case 'record': increment=event.lengthRecord;break;
      case 'distinct-fish': if(def.kind==='fish'&&!task.marks.includes(def.id)&&task.marks.length<goal.required)task.marks.push(def.id);break;
      case 'decorate-catch': increment=true;break;
    }
  } else if(event.type==='release'&&goal.kind==='release') increment=species(event.item.speciesId).creature;
  else if(event.type==='display'&&goal.kind==='display-new') increment=(event.item.order??0)>task.acceptedOrder&&species(event.item.speciesId).creature;
  else if(event.type==='quest'&&goal.kind==='quests') increment=true;
  if(increment)task.progress=Math.min(goal.required,task.progress+1);
}
export function displayedFish(context:LifeContext,location:RegionId): number {
  return context.life.aquarium.filter(id=>context.inventory.some(item=>item.id===id&&item.region===location&&species(item.speciesId).kind==='fish')).length;
}
export function goalProgress(task:GoalTask,context:LifeContext): {current:number; total:number; ready:boolean} {
  const {goal}=task;let current=task.progress,total:number=goal.required;
  switch(goal.kind) {
    case 'regions': current=task.marks.length;total=goal.required*goal.regions.length;break;
    case 'baits': case 'distinct-fish': current=task.marks.length;break;
    case 'deliver': current=context.inventory.filter(item=>item.speciesId===goal.species&&!item.locked&&!displayed(context,item.id)).length;break;
    case 'display': current=displayedFish(context,goal.region);break;
    case 'decorate-catch': if(!Object.keys(context.life.decor).length)return {current,total,ready:false};break;
  }
  return {current:Math.min(current,total),total,ready:current>=total};
}
export function displayed(context:LifeContext,id:string): boolean {
  return context.life.aquarium.includes(id)||context.life.shelf.some(item=>item?.kind==='catch'&&item.id===id);
}
export function goalDescription(goal:Goal): string {
  switch(goal.kind) {
    case 'catch': return `新钓到 ${goal.required} ${goal.group==='fish'?'条正常鱼':goal.group==='abstract'?'个奇珍异兽':goal.group==='relic'?'件遗物':'份收获'}${goal.region?` · ${region(goal.region).name}`:''}`;
    case 'regions': return `${goal.regions.map(id=>region(id).name).join('、')}各新钓到 ${goal.required} 份收获`;
    case 'release': return `新放流 ${goal.required} 个生物`;
    case 'deliver': return `交付 ${goal.required} 条${species(goal.species).name}，可使用已有库存`;
    case 'quality': return '新钓到 1 个大型、巨物或冠军尺寸的生物';
    case 'variant': return '新钓到 1 个珠光或星砂外观';
    case 'baits': return `用两种偏好饵各成功一竿（${goal.allowed.map(id=>bait(id).name).join('、')}）`;
    case 'safe': return '新成功 2 竿，危险峰值均低于 200；辅助模式也可完成';
    case 'discover': return `在${region(goal.region).name}获得 1 项新发现`;
    case 'display-new': return '新钓到一个生物，再把这个个体放入鱼缸';
    case 'display': return `在鱼缸展示 ${goal.required} 条${region(goal.region).name}的正常鱼，可使用已有收藏`;
    case 'quests': return '新完成 3 个委托';
    case 'record': return '新刷新 1 次已有物种的长度纪录';
    case 'distinct-fish': return '新钓到 3 种不同的正常鱼';
    case 'decorate-catch': return '布置至少一件码头装饰，并新成功 3 竿';
  }
}
export function hasDiscoveryTarget(context:LifeContext,id:RegionId): boolean {
  return SPECIES.some(item=>item.region===id&&item.kind!=='guest'&&!context.catalog[item.id]);
}
