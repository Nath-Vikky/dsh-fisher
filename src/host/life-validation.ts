import { isRegionId, isSpeciesId, species } from '../game/content.ts';
import { isBaitId } from '../game/progression.ts';
import { DECOR_SLOTS, decor, isDecorId } from '../game/decor.ts';
import { GUEST_IDS, guestGoal, isGuestId } from '../game/guests.ts';
import { isQuestId } from '../game/quests.ts';
import { isAchievementId } from '../game/achievements.ts';
import { FRAME_IDS, frameAvailable } from '../game/life.ts';
import type { GoalTask } from '../game/goals.ts';
import type { LifeState } from '../game/life.ts';
import type { Save } from './model.ts';
import { object,integer,id } from './validation.ts';

function list(value:unknown,max:number): unknown[] { if(!Array.isArray(value)||value.length>max)throw new Error('Invalid collection');return value; }
function unique(value:unknown,max:number): unknown[] {const result=list(value,max);if(new Set(result).size!==result.length)throw new Error('Duplicate collection item');return result;}
function validateTask(value:unknown,order:number): asserts value is GoalTask {
  const task=object(value),goal=object(task.goal),required=integer(goal.required,1,12);
  integer(task.acceptedOrder,0,order);integer(task.progress,0,required);const marks=list(task.marks,4);
  const location=(value:unknown)=>{if(!isRegionId(value))throw new Error('Invalid goal region');};
  switch(goal.kind) {
    case 'catch':if(goal.region!==null)location(goal.region);if(!['any','fish','abstract','relic'].includes(String(goal.group)))throw new Error('Invalid goal kind');break;
    case 'regions':{
      const regions=unique(goal.regions,2);if(regions.length!==2||required!==2)throw new Error('Invalid region goal');regions.forEach(location);
      if(marks.some(id=>!regions.includes(id))||regions.some(id=>marks.filter(mark=>mark===id).length>2))throw new Error('Invalid region progress');break;
    }
    case 'deliver':if(!isSpeciesId(goal.species)||species(goal.species).kind!=='fish'||species(goal.species).rarity!==1||required!==3)throw new Error('Invalid delivery');break;
    case 'quality':if(goal.minimum!==750||required!==1)throw new Error('Invalid quality goal');break;
    case 'variant':case 'display-new':case 'record':if(required!==1)throw new Error('Invalid goal count');break;
    case 'baits':{
      const allowed=unique(goal.allowed,5);
      if(allowed.length<2||required!==2||allowed.some(id=>!isBaitId(id)||id==='B01'||id==='B07'||id==='B08')
        ||marks.length>2||new Set(marks).size!==marks.length||marks.some(id=>!allowed.includes(id)))throw new Error('Invalid bait goal');break;
    }
    case 'safe':if(goal.threshold!==200000||required!==2)throw new Error('Invalid safe goal');break;
    case 'discover':location(goal.region);if(required!==1)throw new Error('Invalid discovery goal');break;
    case 'display':location(goal.region);if(required>8)throw new Error('Invalid display goal');break;
    case 'distinct-fish':if(required!==3||marks.length>3||new Set(marks).size!==marks.length||marks.some(id=>!isSpeciesId(id)||species(id).kind!=='fish'))throw new Error('Invalid species progress');break;
    case 'quests':case 'decorate-catch':if(required!==3)throw new Error('Invalid goal count');break;
    case 'release':break;
    default:throw new Error('Unknown goal');
  }
  if(!['regions','baits','distinct-fish'].includes(String(goal.kind))&&marks.length)throw new Error('Unexpected goal marks');
}
export function validateLife(value:unknown,save:Save): asserts value is LifeState {
  const life=object(value);
  integer(life.questSequence);integer(life.questsCompleted);integer(life.bestQuality,0,1000);
  const quests=list(life.quests,3);if(quests.length!==3)throw new Error('Missing quest slots');
  const questIds=new Set<string>(),templates=new Set<string>();
  const kinds={Q01:'catch',Q02:'regions',Q03:'release',Q04:'deliver',Q05:'quality',Q06:'catch',Q07:'variant',Q08:'baits',Q09:'safe',Q10:'discover',Q11:'display-new',Q12:'catch'};
  for(const value of quests) {
    validateTask(value,save.journey.totalCaught);const quest=object(value),identity=id(quest.id);
    if(!/^quest-[1-9][0-9]*$/.test(identity)||Number(identity.slice(6))>(life.questSequence as number)||questIds.has(identity))throw new Error('Invalid quest identity');
    questIds.add(identity);
    if(!isQuestId(quest.template)||templates.has(quest.template)||kinds[quest.template]!==value.goal.kind)throw new Error('Invalid quest template');
    templates.add(quest.template);
    if(quest.status!=='offered'&&quest.status!=='active')throw new Error('Invalid quest status');
    if(quest.status==='offered'&&(value.progress!==0||value.marks.length))throw new Error('Unaccepted quest progress');
    const reward=object(quest.reward);integer(reward.coins,0,1000);integer(reward.tokens,0,10);
  }
  const achievements=unique(life.achievements,24),claimed=unique(life.claimedAchievements,24);
  if(achievements.some(id=>!isAchievementId(id))||claimed.some(id=>!achievements.includes(id)))throw new Error('Invalid achievements');
  const guests=object(life.guests);if(Object.keys(guests).length!==4)throw new Error('Invalid guests');
  for(const guest of GUEST_IDS) {
    const state=object(guests[guest]),stage=integer(state.stage,0,3);
    if(typeof state.invitationEarned!=='boolean'||!['base','alternate'].includes(String(state.outfit)))throw new Error('Invalid guest state');
    if((stage>0)!==!!save.catalog[guest]||(stage>0&&!state.invitationEarned)||(stage<3&&state.outfit!=='base'))throw new Error('Invalid guest relationship');
    if(save.journey.invitations.includes(guest)&&(!state.invitationEarned||stage!==0))throw new Error('Invalid invitation');
    if(stage===0&&state.invitationEarned&&!save.journey.invitations.includes(guest)&&save.active?.catch.speciesId!==guest)throw new Error('Missing invitation');
    if(state.task!==null) {
      validateTask(state.task,save.journey.totalCaught);
      if(stage===3||(stage===0&&state.invitationEarned))throw new Error('Invalid guest request');
      const goal=state.task.goal,expected=guestGoal(guest,stage as 0|1|2,goal.kind==='catch'?'catches':'record');
      if(!expected||Object.keys(goal).length!==Object.keys(expected).length
        ||Object.entries(expected).some(([key,value])=>object(goal)[key]!==value))throw new Error('Invalid guest goal');
    }
  }
  if(life.visitor!==null&&(!isGuestId(life.visitor)||integer(object(guests[life.visitor]).stage)<1))throw new Error('Invalid visitor');
  const aquarium=list(life.aquarium,8);if(aquarium.length!==8)throw new Error('Invalid aquarium size');
  const displayed=new Set<string>();
  for(const value of aquarium) {
    if(value===null)continue;const identity=id(value),item=save.inventory.find(item=>item.id===identity);
    if(!item||!species(item.speciesId).creature||displayed.has(identity))throw new Error('Invalid aquarium item');displayed.add(identity);
  }
  const shelf=list(life.shelf,6);if(shelf.length!==6)throw new Error('Invalid shelf size');
  const relics=new Set<string>();
  for(const value of shelf) {
    if(value===null)continue;const entry=object(value),identity=id(entry.id);
    if(entry.kind==='catch') {
      const item=save.inventory.find(item=>item.id===identity);
      if(!item||species(item.speciesId).creature||displayed.has(identity))throw new Error('Invalid shelf item');displayed.add(identity);
    } else if(entry.kind==='relic') {
      if(!isSpeciesId(identity)||species(identity).kind!=='relic'||!save.catalog[identity]||relics.has(identity))throw new Error('Invalid relic display');relics.add(identity);
    } else throw new Error('Unknown shelf kind');
  }
  const owned=unique(life.ownedDecor,24);
  if(owned.some(id=>!isDecorId(id)))throw new Error('Invalid decor ownership');
  for(const [slot,value] of Object.entries(object(life.decor))) {
    if(!DECOR_SLOTS.some(id=>id===slot)||!isDecorId(value)||!owned.includes(value)||decor(value).slot!==slot)throw new Error('Invalid decor placement');
  }
  if(!FRAME_IDS.some(id=>id===life.frame)||!frameAvailable(value as LifeState,life.frame as LifeState['frame']))throw new Error('Invalid frame');
}
