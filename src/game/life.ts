import { SPECIES } from './content.ts';
import type { SpeciesId } from './content.ts';
import type { Catch } from './engine.ts';
import type { Journey } from './progression.ts';
import type { RecordEntry } from '../protocol.ts';
import type { DecorId, DecorSlot, DecorTheme } from './decor.ts';
import { completeThemes } from './decor.ts';
import { ACHIEVEMENTS, achievementProgress } from './achievements.ts';
import type { AchievementId } from './achievements.ts';
import { GUEST_IDS, isGuestId } from './guests.ts';
import type { GuestId, GuestState } from './guests.ts';
import { fillQuests } from './quests.ts';
import type { Quest } from './quests.ts';
import { advanceGoal } from './goals.ts';
import type { LifeEvent } from './goals.ts';

export const FRAME_IDS=['plain','afternoon','coral','moon','deep','catalog','guests'] as const;
export type FrameId=typeof FRAME_IDS[number];
export const FRAME_NAMES:Record<FrameId,string>={plain:'海岸原样',afternoon:'午后摸鱼',coral:'珊瑚假日',moon:'月光邮局',deep:'深海终端',catalog:'图鉴纪念',guests:'来客合影'};
export type ShelfItem={kind:'catch';id:string}|{kind:'relic';id:SpeciesId};
export interface LifeState {
  quests:Quest[]; questSequence:number; questsCompleted:number;
  achievements:AchievementId[]; claimedAchievements:AchievementId[]; bestQuality:number;
  guests:Record<GuestId,GuestState>; visitor:GuestId|null;
  aquarium:(string|null)[]; shelf:(ShelfItem|null)[];
  ownedDecor:DecorId[]; decor:Partial<Record<DecorSlot,DecorId>>; frame:FrameId;
}
export interface LifeContext {
  life:LifeState; journey:Journey; inventory:Catch[]; catalog:Partial<Record<SpeciesId,RecordEntry>>;
  experience:number; research:number; released:number;
}
export function emptyLife(): LifeState {
  const visitor=():GuestState=>({stage:0,invitationEarned:false,task:null,outfit:'base'});
  return {quests:[],questSequence:0,questsCompleted:0,achievements:[],claimedAchievements:[],bestQuality:0,
    guests:{G001:visitor(),G002:visitor(),G003:visitor(),G004:visitor()},visitor:null,
    aquarium:Array<string|null>(8).fill(null),shelf:Array<ShelfItem|null>(6).fill(null),ownedDecor:[],decor:{},frame:'plain'};
}
export function refreshLife(context:LifeContext): void {
  fillQuests(context);
  for(const item of ACHIEVEMENTS) {
    if(!context.life.achievements.includes(item.id)&&achievementProgress(item.id,context)>=item.total)context.life.achievements.push(item.id);
  }
}
export function recordLifeEvent(context:LifeContext,event:LifeEvent): void {
  for(const task of context.life.quests)if(task.status==='active')advanceGoal(task,event);
  for(const state of Object.values(context.life.guests))if(state.task)advanceGoal(state.task,event);
  if(event.type==='catch') {
    context.life.bestQuality=Math.max(context.life.bestQuality,event.item.quality??0);
    if(isGuestId(event.item.speciesId)) {
      const guest=context.life.guests[event.item.speciesId];
      if(guest.stage===0){guest.stage=1;guest.invitationEarned=true;guest.task=null;context.life.visitor=event.item.speciesId;}
    }
  }
}
export function migrateLife(context:LifeContext & {active?:{catch:Catch}|null}): void {
  for(const id of GUEST_IDS) {
    const state=context.life.guests[id];
    state.invitationEarned=!!context.catalog[id]||context.journey.invitations.includes(id)||context.active?.catch.speciesId===id;
    if(context.catalog[id])state.stage=1;
  }
  for(const def of SPECIES) {
    const length=context.catalog[def.id]?.bestLengthMm;
    if(!def.creature||length===null||length===undefined)continue;
    const min=def.min!,peak=def.mode!,max=def.max!;
    const q=length<=peak?(length-min)**2/((max-min)*(peak-min)):1-(max-length)**2/((max-min)*(max-peak));
    context.life.bestQuality=Math.max(context.life.bestQuality,Math.round(q*1000));
  }
  refreshLife(context);
}
export function frameAvailable(life:LifeState,frame:FrameId): boolean {
  if(frame==='plain')return true;
  if(frame==='catalog')return life.claimedAchievements.includes('H12');
  if(frame==='guests')return life.claimedAchievements.includes('H24');
  return completeThemes(life.ownedDecor).includes(frame as DecorTheme);
}
