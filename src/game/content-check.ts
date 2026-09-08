import { PATTERNS, REGIONS, SPECIES, SPECIES_IDS } from './content.ts';
import { GEAR, GEAR_IDS } from './gear.ts';
import { BAITS, BAIT_IDS } from './progression.ts';
import { QUESTS, QUEST_IDS } from './quests.ts';
import { ACHIEVEMENTS, ACHIEVEMENT_IDS } from './achievements.ts';
import { DECOR, DECOR_IDS, THEMES, DECOR_SLOTS } from './decor.ts';
import { GUESTS, GUEST_IDS } from './guests.ts';
export function verifyContent(): void {
  const require=(valid:boolean)=>{if(!valid)throw new Error('Invalid fishing content configuration');};
  require(SPECIES.length===48&&new Set(SPECIES.map(item=>item.id)).size===48);
  require(SPECIES_IDS.every(id=>SPECIES.some(item=>item.id===id)));
  for (const region of REGIONS) {
    const entries=SPECIES.filter(item=>item.region===region.id);
    require(entries.length===12&&entries.filter(item=>item.kind==='abstract').length===3
      &&entries.filter(item=>item.kind==='relic').length===1&&entries.filter(item=>item.kind==='guest').length===1);
    for (const [rarity,count] of [[1,3],[2,2],[3,1],[4,1]]) require(entries.filter(item=>item.rarity===rarity).length===count);
  }
  for (const entry of SPECIES) {
    require(PATTERNS.includes(entry.pattern)&&Number.isSafeInteger(entry.price)&&entry.price>=0&&entry.poolWeight>0);
    if (entry.creature) require(entry.min!==null&&entry.mode!==null&&entry.max!==null&&entry.weight!==null
      &&entry.min>0&&entry.min<entry.mode&&entry.mode<entry.max&&entry.weight>=1);
    else require(entry.min===null&&entry.mode===null&&entry.max===null&&entry.weight===null);
  }
  require(SPECIES.filter(item=>item.creature).length===36);
  require(GEAR.length===14&&new Set(GEAR.map(item=>item.id)).size===14&&GEAR_IDS.every(id=>GEAR.some(item=>item.id===id)));
  require(BAITS.length===8&&new Set(BAITS.map(item=>item.id)).size===8&&BAIT_IDS.every(id=>BAITS.some(item=>item.id===id)));
  for (const item of GEAR) require(Number.isSafeInteger(item.price)&&item.price>=0&&item.level>=1&&item.level<=20);
  for (const item of BAITS) require(Number.isSafeInteger(item.coins)&&Number.isSafeInteger(item.tokens)&&item.coins>=0&&item.tokens>=0);
  require(QUESTS.length===12&&QUEST_IDS.every(id=>QUESTS.filter(item=>item.id===id).length===1));
  require(ACHIEVEMENTS.length===24&&ACHIEVEMENT_IDS.every(id=>ACHIEVEMENTS.filter(item=>item.id===id).length===1));
  require(DECOR.length===24&&DECOR_IDS.every(id=>DECOR.filter(item=>item.id===id).length===1));
  for(const theme of THEMES)for(const slot of DECOR_SLOTS)require(DECOR.filter(item=>item.theme===theme&&item.slot===slot).length===1);
  require(GUESTS.length===4&&GUEST_IDS.every(id=>GUESTS.filter(item=>item.id===id).length===1));
  for(const item of GUESTS)require(item.lines.length===12&&item.stories.length===2&&SPECIES.some(entry=>entry.id===item.id&&entry.region===item.region));
}
