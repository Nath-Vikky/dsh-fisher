import { REGIONS, SPECIES } from './content.ts';
import { levelInfo, regionUnlocked } from './progression.ts';
import { completeThemes } from './decor.ts';
import { GUEST_IDS } from './guests.ts';
import type { Reward } from './quests.ts';
import type { LifeContext } from './life.ts';

export const ACHIEVEMENT_IDS=['H01','H02','H03','H04','H05','H06','H07','H08','H09','H10','H11','H12',
  'H13','H14','H15','H16','H17','H18','H19','H20','H21','H22','H23','H24'] as const;
export type AchievementId=typeof ACHIEVEMENT_IDS[number];
export interface Achievement { id:AchievementId; name:string; description:string; total:number; reward:Reward }
const rows: readonly [string,string,number,number,number][]=[
  ['第一竿','首次成功钓鱼',1,20,0],['码头熟面孔','成功 10 次',10,30,0],['小小钓手','成功 50 次',50,60,0],['百竿留影','成功 100 次',100,100,0],
  ['四处摸鱼','解锁全部 4 个地区',4,0,2],['手册写满','达到 Lv.20',20,200,0],['不太正常','首次发现奇珍异兽',1,30,0],['奇珍异兽收藏家','发现全部 13 项奇珍异兽',13,100,0],
  ['正经钓鱼','发现全部 28 种正常鱼',28,150,0],['海岸考古','发现全部 4 件遗物',4,0,3],['客人都来了','认识全部 4 位来客',4,0,3],['摸鱼海岸图鉴',`发现全部 ${SPECIES.length} 项，另获纪念卡边框`,SPECIES.length,200,0],
  ['比想象大','首次获得巨物或冠军尺寸',1,40,0],['冠军这一条','首次获得冠军尺寸',1,80,0],['珠光初见','首次获得珠光外观',1,30,0],['星砂落水','首次获得星砂外观',1,60,0],
  ['纪录更新中','3 次非首次的长度纪录更新',3,50,0],['小也很好','累计获得 10 个迷你个体',10,40,0],['放流的心','累计放流 20 个生物',20,0,2],['海岸好邻居','完成 10 个委托',10,100,0],
  ['热闹鱼缸','同时拥有并布置 8 个生物展示位',8,60,0],['一个主题','拥有一套完整的 6 件装饰',1,80,0],['装饰也收齐','拥有全部 24 件装饰',24,200,0],['常来坐坐','4 位来客均成为海岸常客，解锁合影卡样式',4,0,0],
];
export const ACHIEVEMENTS: readonly Achievement[]=ACHIEVEMENT_IDS.map((id,i)=>{
  const [name,description,total,coins,tokens]=rows[i]!;return {id,name,description,total,reward:{coins,tokens}};
});
export function achievement(id:AchievementId): Achievement { return ACHIEVEMENTS.find(item=>item.id===id)!; }
export function isAchievementId(value:unknown): value is AchievementId { return ACHIEVEMENT_IDS.some(id=>id===value); }
export function achievementProgress(id:AchievementId,context:LifeContext): number {
  const life=context.life,journey=context.journey;
  const discovered=(kind:string)=>SPECIES.filter(item=>item.kind===kind&&context.catalog[item.id]).length;
  switch(id) {
    case 'H01': case 'H02': case 'H03': case 'H04': return journey.totalCaught;
    case 'H05':return REGIONS.filter(item=>regionUnlocked(item.id,context.experience,context.research)).length;
    case 'H06':return levelInfo(context.experience).level;
    case 'H07': case 'H08':return discovered('abstract');
    case 'H09':return discovered('fish');
    case 'H10':return discovered('relic');
    case 'H11':return discovered('guest');
    case 'H12':return Object.keys(context.catalog).length;
    case 'H13':return life.bestQuality>=950?1:0;
    case 'H14':return life.bestQuality>=990?1:0;
    case 'H15':return Object.values(context.catalog).some(item=>!!item.variants.pearl)?1:0;
    case 'H16':return Object.values(context.catalog).some(item=>!!item.variants.starsand)?1:0;
    case 'H17':return journey.lengthRecords;
    case 'H18':return journey.miniCaught;
    case 'H19':return context.released;
    case 'H20':return life.questsCompleted;
    case 'H21':return life.aquarium.filter(Boolean).length;
    case 'H22':return completeThemes(life.ownedDecor).length;
    case 'H23':return life.ownedDecor.length;
    case 'H24':return GUEST_IDS.filter(id=>life.guests[id].stage===3).length;
  }
}
