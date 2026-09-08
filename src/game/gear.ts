export const GEAR_IDS = ['D01','D02','D03','D04','D05','D06','N01','N02','N03','N04','U01','U02','U03','U04'] as const;
export type GearId = typeof GEAR_IDS[number];
export const GEAR_ART: Partial<Record<GearId,string>> = {D01:'d01-pixel-v4.png'};
export type GearSlot = 'rod' | 'line' | 'float';
export interface Gear { id: GearId; name: string; slot: GearSlot; price: number; level: number; description: string }
export const GEAR: readonly Gear[] = [
  {id:'D01',name:'旧木竿',slot:'rod',price:0,level:1,description:'可靠的开始。收线速度 80。'},
  {id:'D02',name:'软梢竿',slot:'rod',price:120,level:3,description:'收线稍慢，收线带来的张力减少 15%。'},
  {id:'D03',name:'快收竿',slot:'rod',price:180,level:3,description:'收线速度 94，收线张力增加 12%。'},
  {id:'D04',name:'深水竿',slot:'rod',price:450,level:6,description:'收线速度 88，略微减轻重拉抗力。'},
  {id:'D05',name:'观潮竿',slot:'rod',price:680,level:9,description:'提前 0.2 秒提醒爆发。'},
  {id:'D06',name:'悠游竿',slot:'rod',price:960,level:12,description:'收线速度 84，安全区危险恢复更快。'},
  {id:'N01',name:'普通鱼线',slot:'line',price:0,level:1,description:'适合每一片水的基础鱼线。'},
  {id:'N02',name:'弹性线',slot:'line',price:100,level:1,description:'爆发推力减少 10%，收线速度减少 3%。'},
  {id:'N03',name:'耐盐线',slot:'line',price:250,level:1,description:'重拉的持续推力减少 10%。'},
  {id:'N04',name:'丝滑线',slot:'line',price:500,level:1,description:'低张力回退减少 30%，收线速度减少 5%。'},
  {id:'U01',name:'小白漂',slot:'float',price:0,level:1,description:'清楚的小白点，跟着涟漪轻轻摇。'},
  {id:'U02',name:'贝壳漂',slot:'float',price:60,level:1,description:'咬钩时有一声轻轻的贝壳音。'},
  {id:'U03',name:'萤光漂',slot:'float',price:180,level:1,description:'夜色里留一颗光点。'},
  {id:'U04',name:'纪录旗漂',slot:'float',price:260,level:1,description:'新纪录时举起一面小旗。'},
];
export type Loadout = Record<GearSlot, GearId>;
export interface Modifiers { speed: number; reelTension: number; burst: number; heavyPush: number; heavyResistance: number; slack: number; warningTicks: number; recovery: number }
export function gear(id: GearId): Gear { const result = GEAR.find(item=>item.id===id); if (!result) throw new Error('Unknown gear'); return result; }
export function isGearId(value: unknown): value is GearId { return GEAR_IDS.some(id=>id===value); }
export function modifiers(loadout: Loadout): Modifiers {
  const rod = loadout.rod, line = loadout.line;
  const base = rod === 'D02' ? 76 : rod === 'D03' ? 94 : rod === 'D04' ? 88 : rod === 'D06' ? 84 : 80;
  return {speed:Math.max(60,Math.min(110,Math.round(base*(line==='N02'?.97:line==='N04'?.95:1)))),
    reelTension:rod==='D02'?850:rod==='D03'?1120:1000, burst:line==='N02'?900:1000,
    heavyPush:line==='N03'?900:1000, heavyResistance:rod==='D04'?920:1000, slack:line==='N04'?700:1000,
    warningTicks:rod==='D05'?4:0, recovery:rod==='D06'?100:80};
}
