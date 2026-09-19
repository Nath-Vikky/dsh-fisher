import type { Save } from './model.ts';
import { object } from './validation.ts';
import { isRegionId,isSpeciesId,species } from '../game/content.ts';
import { isGuestId } from '../game/guests.ts';
import { hasMemorial,picnicKey,PICNIC_MENUS,PICNIC_MOODS } from '../game/adventures.ts';
import type { Picnic } from '../game/adventures.ts';

export function validateAdventures(value:unknown,save:Save):void {
  const state=object(value),legend=object(state.legend);
  if(!['unknown','heard','ready','complete'].includes(String(legend.stage))||['moon','deep','armed'].some(key=>typeof legend[key]!=='boolean'))throw new Error('Invalid legend');
  if(legend.stage==='unknown'&&(legend.moon||legend.deep)||legend.stage==='heard'&&legend.moon&&legend.deep
    ||['ready','complete'].includes(String(legend.stage))&&(!legend.moon||!legend.deep)||legend.armed&&legend.stage!=='ready')throw new Error('Invalid legend progress');
  if(legend.stage==='complete'&&!save.catalog.F026)throw new Error('Missing legendary discovery');
  if(save.active?.meta.source==='legend'&&(legend.stage!=='ready'||legend.armed))throw new Error('Invalid committed legend');
  for(const [region,value] of Object.entries(object(state.memorials))){
    const memory=object(value);
    if(!isRegionId(region)||!hasMemorial(save.shore,region)||!['letter','light'].includes(String(memory.kind))||!isSpeciesId(memory.species)||species(memory.species).kind==='guest'||!save.catalog[memory.species])throw new Error('Invalid memorial memory');
  }
  const validPicnic=(value:unknown):void=>{
    const picnic=object(value);
    if(!isGuestId(picnic.guest)||save.life.guests[picnic.guest].stage<1||!isRegionId(picnic.region)||!Object.hasOwn(PICNIC_MENUS,String(picnic.menu))||!Object.hasOwn(PICNIC_MOODS,String(picnic.mood))||!isSpeciesId(picnic.species))throw new Error('Invalid picnic');
    const def=species(picnic.species);if(def.kind!=='fish'||(def.rarity??9)>2||!save.catalog[def.id])throw new Error('Invalid picnic meal');
  };
  if(state.picnic!==null)validPicnic(state.picnic);
  if(!Array.isArray(state.album)||state.album.length>64)throw new Error('Invalid picnic album');
  state.album.forEach(validPicnic);
  if(new Set((state.album as Picnic[]).map(picnicKey)).size!==state.album.length)throw new Error('Duplicate picnic memory');
}
