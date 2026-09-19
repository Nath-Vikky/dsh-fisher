import type { Save } from './model.ts';
import type { Action } from '../protocol.ts';
import { buildingFish } from '../game/shore.ts';
import { requireDisposable,requireState } from './actions-common.ts';
import { id } from './validation.ts';
import {isStoryRegion,REGIONAL_STORIES} from '../game/regional-stories.ts';
import {isCompanion} from '../game/companions.ts';

export function applyShoreAction(save:Save,action:Action):boolean {
  const shore=save.shore;
  switch(action.type){
    case 'shore.choose': {
      const region=save.journey.region;requireState(isStoryRegion(region),'这里的故事不需要选择路线');
      requireState(!save.active&&!save.pending,'先结束这一竿再选择故事路线');
      requireState(action.choice==='near'||action.choice==='far','请选择一条有效路线');
      const state=shore.regions[region];requireState(state.stage==='found'||state.stage==='seeking','先找到线索，完成后不再更换路线');
      if(state.choice===action.choice)return true;
      state.choice=action.choice;state.progress=0;state.spots=[];state.stage='seeking';return true;
    }
    case 'shore.companion':
      requireState(action.companion===null||isCompanion(action.companion)&&!!save.catalog[action.companion],'先在图鉴里遇见这位伙伴');
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
      if(isStoryRegion(save.journey.region)){
        const state=shore.regions[save.journey.region],def=REGIONAL_STORIES[save.journey.region];
        requireState(state.stage==='ready','还没有备齐故事材料');requireState(save.coins>=def.cost,`还需要${def.cost}壳币`);
        save.coins-=def.cost;state.stage='built';return true;
      }
      requireState(save.journey.region==='L01','回到摸鱼塘再修风铃架');
      requireState(shore.story==='recovered'&&shore.timber===2,'还没有备齐风铃和木料');
      requireState(save.coins>=30,'还需要30壳币');
      save.coins-=30;shore.timber=0;shore.story='built';return true;
    default:return false;
  }
}
