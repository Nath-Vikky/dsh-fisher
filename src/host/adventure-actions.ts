import type { Save } from './model.ts';
import type { Action } from '../protocol.ts';
import { requireState,requireDisposable } from './actions-common.ts';
import { hasMemorial,legendAvailable,picnicKey,PICNIC_MENUS,PICNIC_MOODS } from '../game/adventures.ts';
import { isSpeciesId,species } from '../game/content.ts';
import { isGuestId } from '../game/guests.ts';
import { buildingFish } from '../game/shore.ts';

export function applyAdventureAction(save:Save,action:Action):boolean {
  const state=save.adventures;
  switch(action.type){
    case 'legend.hear':
      requireState(legendAvailable(save.shore),'先完成一岸的故事并建好纪念设施');
      requireState(state.legend.stage==='unknown','这段传说已经记下');
      state.legend.stage='heard';return true;
    case 'legend.arm':
      requireState(!save.active&&!save.pending,'请先处理这一竿');
      requireState(state.legend.stage==='ready','先找齐两条线索');
      state.legend.armed=true;return true;
    case 'shore.memory': {
      requireState(hasMemorial(save.shore,save.journey.region),'先建好本岸纪念设施');
      requireState(action.kind==='letter'||action.kind==='light','请选择信或灯');
      requireState(isSpeciesId(action.species)&&save.catalog[action.species]&&species(action.species).kind!=='guest','请选择已发现的收藏');
      state.memorials[save.journey.region]={kind:action.kind,species:action.species};return true;
    }
    case 'picnic.prepare': {
      requireState(!save.active&&!save.pending&&!save.autoFishing.enabled,'请先结束这一竿并关闭托管，再准备野餐');
      requireState(!state.picnic,'已有一场野餐在等你');
      requireState(isGuestId(action.guest)&&save.life.guests[action.guest].stage>0,'先认识这位来客');
      requireState(Object.hasOwn(PICNIC_MENUS,action.menu)&&Object.hasOwn(PICNIC_MOODS,action.mood),'请选择野餐菜单和气氛');
      const item=save.inventory.find(item=>item.id===action.catchId);
      requireState(item&&buildingFish(item),'野餐需要一条背包里的原色普通鱼');
      requireDisposable(save,item,action.confirmed);
      state.picnic={guest:action.guest,region:save.journey.region,menu:action.menu,mood:action.mood,species:item.speciesId};
      save.inventory=save.inventory.filter(other=>other.id!==item.id);return true;
    }
    case 'picnic.finish': {
      const picnic=state.picnic;
      requireState(picnic&&picnic.region===save.journey.region,'请回到准备野餐的海岸');
      const index=state.album.findIndex(item=>picnicKey(item)===picnicKey(picnic));
      if(index<0)state.album.push(picnic);else state.album[index]=picnic;
      state.picnic=null;return true;
    }
    default:return false;
  }
}
