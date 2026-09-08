export const DECOR_IDS = ['C001','C002','C003','C004','C005','C006','C007','C008','C009','C010','C011','C012',
  'C013','C014','C015','C016','C017','C018','C019','C020','C021','C022','C023','C024'] as const;
export type DecorId = typeof DECOR_IDS[number];
export const DECOR_SLOTS = ['ground','seat','lamp','sign','background','shelf'] as const;
export type DecorSlot = typeof DECOR_SLOTS[number];
export const SLOT_NAMES: Record<DecorSlot,string> = {ground:'地面',seat:'座椅',lamp:'灯具',sign:'招牌',background:'鱼缸背景',shelf:'陈列架'};
export const THEMES = ['afternoon','coral','moon','deep'] as const;
export type DecorTheme = typeof THEMES[number];
export const THEME_NAMES: Record<DecorTheme,string> = {afternoon:'午后摸鱼',coral:'珊瑚假日',moon:'月光邮局',deep:'深海终端'};
export interface Decor { id: DecorId; name: string; slot: DecorSlot; theme: DecorTheme; price: number }
const names = ['旧木板地台','藤编小凳','玻璃小风灯','今日适合摸鱼','荷叶水影','松木小架',
  '浅沙地台','贝壳躺椅','珊瑚串灯','海风营业中','珊瑚窗景','漂流木架',
  '月纹地毯','夜航软椅','萤火纸灯','信已寄给月亮','月色池底','星图书架',
  '深蓝拼板','鲸尾靠椅','小灯塔','连接海洋成功','浮光深海','珍珠展示柜'];
const prices = [80,60,80,50,90,100,140,120,160,90,160,170,220,180,240,150,240,260,300,260,360,200,360,400];
export const DECOR: readonly Decor[] = DECOR_IDS.map((id,index)=>({id,name:names[index]!,price:prices[index]!,slot:DECOR_SLOTS[index%6]!,theme:THEMES[Math.floor(index/6)]!}));
export function isDecorId(value: unknown): value is DecorId { return DECOR_IDS.some(id=>id===value); }
export function isDecorSlot(value: unknown): value is DecorSlot { return DECOR_SLOTS.some(id=>id===value); }
export function decor(id: DecorId): Decor { return DECOR.find(item=>item.id===id)!; }
export function completeThemes(owned: readonly DecorId[]): DecorTheme[] {
  return THEMES.filter(theme=>DECOR.filter(item=>item.theme===theme).every(item=>owned.includes(item.id)));
}
