import type { Action,Bootstrap } from '../protocol.ts';
import { gear,GEAR_ART } from '../game/gear.ts';
import { bait } from '../game/progression.ts';
import { DECOR } from '../game/decor.ts';
import { guest } from '../game/guests.ts';
import { BAIT_ART,DECOR_ART,guestPicture } from '../game/visuals.ts';

export interface RewardNotice { id:string; title:string; items:{name:string;quantity:number;art?:string}[] }
export function rewardNotice(action:Action,before:Bootstrap,after:Bootstrap,id:string):RewardNotice|null {
  const items:RewardNotice['items']=[];
  const add=(name:string,quantity:number,art?:string)=>{if(quantity>0)items.push({name,quantity,...(art?{art}:{})});};
  if(action.type==='bait.buy'||action.type==='work.claim')add(bait(action.bait).name,(after.journey.baits[action.bait]??0)-(before.journey.baits[action.bait]??0),BAIT_ART[action.bait]);
  if(action.type==='gear.buy'&&!before.journey.ownedGear.includes(action.gear)&&after.journey.ownedGear.includes(action.gear))add(gear(action.gear).name,1,GEAR_ART[action.gear]);
  if(action.type==='decor.buy'&&!before.life.ownedDecor.includes(action.decor)&&after.life.ownedDecor.includes(action.decor))add(DECOR.find(item=>item.id===action.decor)!.name,1,DECOR_ART[action.decor]);
  if(['work.claim','quest.claim','achievement.claim'].includes(action.type)){add('壳币',after.coins-before.coins);add('潮汐碎片',after.tokens-before.tokens);}
  if(action.type==='guest.claim'){
    const prior=before.life.guests[action.guest],current=after.life.guests[action.guest],definition=guest(action.guest);
    if(!prior.invitationEarned&&current.invitationEarned)add(`${definition.name}的邀请`,1,guestPicture(action.guest,'base','chibi'));
    if(current.stage>prior.stage)add(current.stage===3?`${definition.alternate} · 衣装与新故事`:'相遇故事 · 新的一页',1,guestPicture(action.guest,current.stage===3?'alternate':'base','chibi'));
  }
  if(action.type==='achievement.claim'&&['H12','H24'].includes(action.achievement)&&!before.life.claimedAchievements.includes(action.achievement)&&after.life.claimedAchievements.includes(action.achievement))add(action.achievement==='H12'?'图鉴纪念卡框':'来客合影卡框',1);
  return items.length?{id,title:action.type==='guest.claim'?'海岸传来了新消息':'获得物品',items}:null;
}
