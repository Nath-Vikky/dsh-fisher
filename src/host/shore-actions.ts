import type { Save } from './model.ts';
import type { Action } from '../protocol.ts';
import { buildingFish } from '../game/shore.ts';
import { requireDisposable,requireState } from './actions-common.ts';
import { id } from './validation.ts';

export function applyShoreAction(save:Save,action:Action):boolean {
  const shore=save.shore;
  switch(action.type){
    case 'shore.companion':
      requireState(action.companion===null||action.companion==='A002'&&!!save.catalog.A002,'先在图鉴里遇见刀盾狗');
      shore.companion=action.companion;return true;
    case 'shore.read':
      requireState(shore.story==='bottle','这封信已经读过，或还未发现');
      requireState(save.journey.region==='L01','回到摸鱼塘后再找贝邮');
      shore.story='charted';return true;
    case 'shore.donate': {
      requireState(shore.story==='recovered','找到旧铃后再筹备木料');
      requireState(shore.timber<2,'木料已经够了');
      const item=save.inventory.find(item=>item.id===id(action.catchId));
      requireState(item&&buildingFish(item),'请选择一条原色普通鱼');
      requireDisposable(save,item,action.confirmed);
      save.inventory=save.inventory.filter(old=>old.id!==item.id);shore.timber++;return true;
    }
    case 'shore.build':
      requireState(save.journey.region==='L01','回到摸鱼塘再修风铃架');
      requireState(shore.story==='recovered'&&shore.timber===2,'还没有备齐风铃和木料');
      requireState(save.coins>=30,'还需要30壳币');
      save.coins-=30;shore.timber=0;shore.story='built';return true;
    default:return false;
  }
}
