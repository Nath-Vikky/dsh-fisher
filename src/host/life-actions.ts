import { species,isSpeciesId } from '../game/content.ts';
import { decor,isDecorId,isDecorSlot } from '../game/decor.ts';
import { goalProgress,hasDiscoveryTarget,newTask } from '../game/goals.ts';
import { guest,guestEligible,guestGoal,isGuestId } from '../game/guests.ts';
import { achievement,isAchievementId } from '../game/achievements.ts';
import { FRAME_IDS,frameAvailable,recordLifeEvent } from '../game/life.ts';
import { regionUnlocked } from '../game/progression.ts';
import type { Action } from '../protocol.ts';
import type { Save } from './model.ts';
import { id,integer,object } from './validation.ts';
import { award,requireDisposable,requireState } from './actions-common.ts';

export function applyLifeAction(save:Save,action:Action):boolean {
  const life=save.life;
  switch(action.type) {
    case 'quest.accept':case 'quest.skip':case 'quest.claim': {
      const quest=life.quests.find(item=>item.id===id(action.questId));requireState(quest,'这份委托已更新');
      if(action.type==='quest.accept') {
        requireState(quest.status==='offered','已经接下这份委托');
        requireState(quest.goal.kind!=='discover'||hasDiscoveryTarget(save,quest.goal.region),'这里的图鉴已经补齐，请换一份委托');
        quest.status='active';quest.acceptedOrder=save.journey.totalCaught;quest.progress=0;quest.marks=[];
      } else {
        if(action.type==='quest.claim') {
          requireState(quest.status==='active'&&goalProgress(quest,save).ready,'这份委托尚未完成');
          if(quest.goal.kind==='deliver') {
            requireState(Array.isArray(action.catchIds)&&action.catchIds.length===quest.goal.required&&new Set(action.catchIds).size===action.catchIds.length,'请选择三条不同的交付个体');
            const target=quest.goal.species;
            const items=action.catchIds.map(identity=>save.inventory.find(item=>item.id===id(identity)));
            for(const item of items){requireState(item&&item.speciesId===target,'交付个体不符合这份订单');requireDisposable(save,item,action.confirmed);}
            save.inventory=save.inventory.filter(item=>!action.catchIds!.includes(item.id));
          } else requireState(action.catchIds===undefined,'这份委托不需要交付个体');
          award(save,quest.reward.coins,quest.reward.tokens);life.questsCompleted++;recordLifeEvent(save,{type:'quest'});
        }
        life.quests=life.quests.filter(item=>item!==quest);
      }
      return true;
    }
    case 'achievement.claim': {
      requireState(isAchievementId(action.achievement)&&life.achievements.includes(action.achievement),'成就尚未达成');
      requireState(!life.claimedAchievements.includes(action.achievement),'成就奖励已经领取');
      const def=achievement(action.achievement);life.claimedAchievements.push(def.id);award(save,def.reward.coins,def.reward.tokens);return true;
    }
    case 'guest.accept':case 'guest.claim':case 'guest.prepare':case 'guest.outfit': {
      requireState(isGuestId(action.guest),'没有找到这位来客');const state=life.guests[action.guest],def=guest(action.guest);
      if(action.type==='guest.accept') {
        requireState(!state.task&&state.stage<3,'当前已有请求或关系已达常客');
        requireState(state.stage>0||(!state.invitationEarned&&guestEligible(action.guest,save)),'邀请前提还未满足，或邀请已经获得');
        if(action.guest==='G002'&&state.stage===1)requireState(action.route==='record'||action.route==='catches','请选择本次请求的完成方式');
        const goal=guestGoal(action.guest,state.stage,action.route);requireState(goal,'没有可接取的请求');
        state.task=newTask(goal,save.journey.totalCaught);
      } else if(action.type==='guest.claim') {
        requireState(state.task&&goalProgress(state.task,save).ready,'这个请求还未完成');
        if(state.stage===0) {
          requireState(!state.invitationEarned&&!save.catalog[action.guest],'邀请已经获得');
          state.invitationEarned=true;if(!save.journey.invitations.includes(action.guest))save.journey.invitations.push(action.guest);
        } else {requireState(state.stage<3,'已经是海岸常客');state.stage=state.stage===1?2:3;}
        state.task=null;
      } else if(action.type==='guest.prepare') {
        requireState(!save.active&&!save.pending,'请先处理这一竿');
        requireState(state.stage===0&&state.invitationEarned&&save.journey.invitations.includes(action.guest),'没有待使用的邀请');
        requireState(regionUnlocked(def.region,save.experience,save.research),'这个钓点尚未开放');
        save.journey.region=def.region;save.journey.bait='B08';save.journey.target=action.guest;
      } else if(action.type==='guest.outfit') {
        requireState(state.stage>0,'还没有认识这位来客');
        requireState(action.outfit==='base'||(action.outfit==='alternate'&&state.stage===3),'这套外观还没有解锁');state.outfit=action.outfit;
      }
      return true;
    }
    case 'guest.visit': {
      requireState(action.guest===null||(isGuestId(action.guest)&&life.guests[action.guest].stage>0),'还没有认识这位来客');
      life.visitor=action.guest;return true;
    }
    case 'display.aquarium': {
      const slot=integer(action.slot,0,7);
      if(action.catchId===null){life.aquarium[slot]=null;return true;}
      const item=save.inventory.find(item=>item.id===id(action.catchId));requireState(item&&species(item.speciesId).creature,'请选择背包里的生物');
      if(life.aquarium[slot]===item.id)return true;
      life.aquarium=life.aquarium.map(identity=>identity===item.id?null:identity);life.aquarium[slot]=item.id;
      recordLifeEvent(save,{type:'display',item});return true;
    }
    case 'display.shelf': {
      const slot=integer(action.slot,0,5),item=action.item;
      if(item===null){life.shelf[slot]=null;return true;}
      object(item);id(item.id);
      if(item.kind==='catch')requireState(save.inventory.some(caught=>caught.id===item.id&&!species(caught.speciesId).creature),'请选择背包里的奇物');
      else requireState(item.kind==='relic'&&isSpeciesId(item.id)&&species(item.id).kind==='relic'&&save.catalog[item.id],'还没有发现这件遗物');
      life.shelf=life.shelf.map(entry=>entry?.kind===item.kind&&entry.id===item.id?null:entry);life.shelf[slot]=structuredClone(item);return true;
    }
    case 'decor.buy': {
      requireState(isDecorId(action.decor),'没有找到这件装饰');const item=decor(action.decor);
      requireState(!life.ownedDecor.includes(item.id),'已经拥有这件装饰');requireState(save.coins>=item.price,'壳币不足');
      save.coins-=item.price;life.ownedDecor.push(item.id);return true;
    }
    case 'decor.equip': {
      requireState(isDecorSlot(action.slot),'请选择有效装饰位置');
      if(action.decor===null)delete life.decor[action.slot];
      else {requireState(isDecorId(action.decor)&&life.ownedDecor.includes(action.decor)&&decor(action.decor).slot===action.slot,'装饰不属于这个位置，或尚未拥有');life.decor[action.slot]=action.decor;}
      return true;
    }
    case 'frame.select': {
      requireState(FRAME_IDS.some(id=>id===action.frame)&&frameAvailable(life,action.frame),'这个收获卡样式还未解锁');life.frame=action.frame;return true;
    }
    default:return false;
  }
}
