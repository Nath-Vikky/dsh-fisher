import {species} from './content.ts';
import type {Pattern} from './content.ts';
import type {Catch} from './engine.ts';
export const COMPANION_IDS=['A002','A013','A004'] as const;
export type CompanionId=typeof COMPANION_IDS[number];
export const isCompanion=(value:unknown):value is CompanionId=>COMPANION_IDS.some(id=>id===value);
export const COMPANIONS:Record<CompanionId,{name:string;role:string;detail:string;home:string;play:string}>={
  A002:{name:'刀盾狗',role:'小小护卫',detail:'每竿遇到高张力的冲击或断线危险时护线一次，降低张力并挡住一阵冲击。适合手动收线。',home:'摸鱼塘',play:'和刀盾狗打个招呼'},
  A013:{name:'奶蛙',role:'鱼影观察员',detail:'抛竿后告诉你水下是普通鱼、奇珍、旧物还是来客，并提示拉扯特点。具体是哪一只，留到收获时揭晓。',home:'热梗湾',play:'请奶蛙跳一小段'},
  A004:{name:'香蕉猫',role:'小雨同行',detail:'带来一小片阵雨，托管所需有效活动时间减少10%。不改变产物、潮汐或故事条件，手动收线规则保持原样。',home:'热梗湾',play:'陪香蕉猫听一场雨'},
};
const PATTERN_HINTS:Record<Pattern,string>={steady:'力道平稳，可以慢慢收线',dart:'会突然冲刺，留意张力',heavy:'力道较重，别一直绷紧',pulse:'一阵一阵地用力，跟着节奏松线',rollback:'会回游，给它一点余地',feint:'会假动作，先看清再发力'};
export function companionHint(item:Catch,companion:CompanionId|null|undefined):string|null {
  if(companion!=='A013')return null;const def=species(item.speciesId);
  return `奶蛙看见${{fish:'鱼影',abstract:'奇珍的影子',relic:'水下旧物',guest:'一位来客'}[def.kind]} · ${PATTERN_HINTS[def.pattern]}`;
}
