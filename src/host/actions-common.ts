import type { Save } from './model.ts';
import type { Catch } from '../game/engine.ts';
import { displayed } from '../game/goals.ts';
export class ActionError extends Error {
  readonly status:number;
  constructor(message:string,status=409){super(message);this.status=status;}
}
export function requireState(condition:unknown,message:string): asserts condition {if(!condition)throw new ActionError(message);}
export function award(save:Save,coins=0,tokens=0):void {
  if(save.coins+coins>9999999||save.tokens+tokens>99999)save.journey.overflow=true;
  save.coins=Math.min(9999999,save.coins+coins);save.tokens=Math.min(99999,save.tokens+tokens);
}
export function requireDisposable(save:Save,item:Catch,confirmed:unknown):void {
  requireState(!item.locked,'请先解锁这份收获');
  requireState(!displayed(save,item.id),'请先从展示区取下这份收获');
  requireState(!(item.isNew||item.isNewVariant||item.isRecord)||confirmed===true,'这是新发现、首次外观或纪录个体，请单独确认');
}
