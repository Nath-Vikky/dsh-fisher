import { REGIONS, SPECIES } from './content.ts';
import { preferenceAvailable } from './encounters.ts';
import { regionUnlocked } from './progression.ts';
import { SUPPLY_BAITS } from './work.ts';
import { hasDiscoveryTarget, newTask } from './goals.ts';
import type { Goal, GoalTask } from './goals.ts';
import type { LifeContext } from './life.ts';

export const QUEST_IDS = ['Q01','Q02','Q03','Q04','Q05','Q06','Q07','Q08','Q09','Q10','Q11','Q12'] as const;
export type QuestId = typeof QUEST_IDS[number];
export interface Reward { coins:number; tokens:number }
export interface QuestDefinition { id:QuestId; name:string; reward:Reward }
const names=['顺手三竿','换个风景','回到海里','小鱼订单','大一点就好','这也能钓到','找一点光','换饵试试','稳稳收线','图鉴补一页','今日展示','海底旧物'];
const coins=[30,55,15,45,50,40,80,40,35,60,25,70],tokens=[0,0,1,0,0,1,2,1,0,1,0,2];
export const QUESTS: readonly QuestDefinition[]=QUEST_IDS.map((id,index)=>({id,name:names[index]!,reward:{coins:coins[index]!,tokens:tokens[index]!}}));
export interface Quest extends GoalTask { id:string; template:QuestId; status:'offered'|'active'; reward:Reward }
export function questDefinition(id:QuestId): QuestDefinition { return QUESTS.find(item=>item.id===id)!; }
export function isQuestId(value:unknown): value is QuestId { return QUEST_IDS.some(id=>id===value); }
export function createQuestGoal(id:QuestId,context:LifeContext,sequence:number): Goal|null {
  const locations=REGIONS.filter(item=>regionUnlocked(item.id,context.experience,context.research)).map(item=>item.id);
  switch(id) {
    case 'Q01':return {kind:'catch',required:3,region:null,group:'any'};
    case 'Q02':return locations.length<2?null:{kind:'regions',required:2,regions:[locations[sequence%locations.length]!,locations[(sequence+1)%locations.length]!]};
    case 'Q03':return {kind:'release',required:3};
    case 'Q04':{
      const choices=SPECIES.filter(item=>item.rarity===1&&locations.includes(item.region));
      return {kind:'deliver',required:3,species:choices[sequence%choices.length]!.id};
    }
    case 'Q05':return {kind:'quality',required:1,minimum:750};
    case 'Q06':return {kind:'catch',required:1,region:null,group:'abstract'};
    case 'Q07':return {kind:'variant',required:1};
    case 'Q08':{
      const allowed=SUPPLY_BAITS.filter(bait=>locations.some(id=>preferenceAvailable(id,bait)));
      return allowed.length<2?null:{kind:'baits',required:2,allowed};
    }
    case 'Q09':return {kind:'safe',required:2,threshold:200000};
    case 'Q10':return hasDiscoveryTarget(context,context.journey.region)?{kind:'discover',required:1,region:context.journey.region}:null;
    case 'Q11':return {kind:'display-new',required:1};
    case 'Q12':return regionUnlocked('L03',context.experience,context.research)?{kind:'catch',required:1,region:null,group:'relic'}:null;
  }
}
export function fillQuests(context:LifeContext): void {
  while(context.life.quests.length<3) {
    let added=false;
    for(let attempt=0;attempt<QUEST_IDS.length;attempt++) {
      const sequence=++context.life.questSequence,id=QUEST_IDS[(sequence-1)%QUEST_IDS.length]!;
      if(context.life.quests.some(item=>item.template===id))continue;
      const goal=createQuestGoal(id,context,sequence);if(!goal)continue;
      context.life.quests.push({...newTask(goal,context.journey.totalCaught),id:`quest-${sequence}`,template:id,
        status:'offered',reward:{...questDefinition(id).reward}});added=true;break;
    }
    if(!added)break;
  }
}
