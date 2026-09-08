export const REGION_IDS = ['L01', 'L02', 'L03', 'L04'] as const;
export type RegionId = typeof REGION_IDS[number];
export const SPECIES_IDS = [
  'F001','F002','F003','F004','F005','F006','F007','F008','F009','F010','F011','F012','F013','F014',
  'F015','F016','F017','F018','F019','F020','F021','F022','F023','F024','F025','F026','F027','F028',
  'A001','A002','A003','A004','A005','A006','A007','A008','A009','A010','A011','A012',
  'R001','R002','R003','R004','G001','G002','G003','G004',
] as const;
export type SpeciesId = typeof SPECIES_IDS[number];
export const PATTERNS = ['steady', 'dart', 'heavy', 'pulse', 'rollback', 'feint'] as const;
export type Pattern = typeof PATTERNS[number];
export const VARIANTS = ['original', 'pearl', 'starsand'] as const;
export type Variant = typeof VARIANTS[number];
export type Tag = 'grain' | 'marine' | 'glow' | 'deep';
export interface Species {
  id: SpeciesId; name: string; region: RegionId; kind: 'fish' | 'abstract' | 'relic' | 'guest'; creature: boolean;
  pattern: Pattern; rarity: number | null; poolWeight: number; tags: readonly Tag[];
  min: number | null; mode: number | null; max: number | null; weight: number | null; price: number; description: string;
}
export const REGIONS = [
  { id: 'L01', name: '摸鱼塘', level: 1, research: 0, prices: 1, weights: [90, 7, 3], mood: '荷叶摇一摇，时间慢一点。' },
  { id: 'L02', name: '热梗湾', level: 3, research: 5, prices: 1.15, weights: [65, 28, 7], mood: '海风把奇妙的东西带来了。' },
  { id: 'L03', name: '月光池', level: 6, research: 12, prices: 1.35, weights: [80, 12, 8], mood: '一封没有落款的月光来信。' },
  { id: 'L04', name: '深潜海', level: 10, research: 20, prices: 1.6, weights: [75, 15, 10], mood: '灯塔亮着，远方也有回音。' },
] as const;
type FishRow = readonly [SpeciesId, string, RegionId, number, number, number, number, number, Pattern, readonly Tag[], string];
const fishRows: readonly FishRow[] = [
  ['F001','鲫鱼','L01',1,8,20,35,180,'steady',['grain'],'平凡的银色，也能接住一整个下午的光。'],
  ['F002','麦穗鱼','L01',1,3,8,14,9,'dart',['glow'],'小小一尾，总觉得下一片水更有意思。'],
  ['F003','餐条','L01',1,5,15,28,40,'dart',['grain'],'像一道迟迟不肯落下的银色闪电。'],
  ['F004','鲤鱼','L01',2,15,40,80,1100,'heavy',['grain'],'胡须轻轻一动，水底的故事就开了头。'],
  ['F005','泥鳅','L01',2,5,16,30,45,'pulse',['glow'],'会拐弯的小逗号，藏在池塘的句子里。'],
  ['F006','鲈鱼','L01',3,12,35,65,650,'dart',['grain'],'背鳍是一排小山，越过它就是水面的风。'],
  ['F007','锦鲤','L01',4,15,45,90,1500,'heavy',['grain','glow'],'愿望不用大声说，它已经听见了。'],
  ['F008','沙丁鱼','L02',1,7,18,28,75,'steady',['marine'],'一张随身携带的银色船票。'],
  ['F009','凤尾鱼','L02',1,5,13,23,22,'dart',['glow'],'尾巴替海风写了一个轻快的结尾。'],
  ['F010','鲻鱼','L02',1,12,35,60,550,'heavy',['marine'],'它知道每一处暖流，偶尔也走回头路。'],
  ['F011','鲭鱼','L02',2,14,30,55,350,'pulse',['marine'],'身上的波纹，是海浪留下的笔记。'],
  ['F012','比目鱼','L02',2,10,28,55,400,'steady',['deep'],'侧身躺一会儿，也算一种看海姿势。'],
  ['F013','红鲷','L02',3,12,38,70,950,'heavy',['marine'],'把珊瑚的颜色，带到了你的掌心。'],
  ['F014','翻车鱼','L02',4,35,100,200,35000,'heavy',['deep'],'今天也圆圆满满地路过。'],
  ['F015','青鳉','L03',1,2,4,7,1,'steady',['glow'],'一小滴有方向的月光。'],
  ['F016','鳑鲏','L03',1,3,7,12,6,'dart',['grain'],'悄悄把晚霞藏在鳞片边上。'],
  ['F017','太阳鱼','L03',1,5,13,24,55,'pulse',['glow'],'太阳下班后，它还在值夜。'],
  ['F018','鲶鱼','L03',2,15,45,90,1200,'heavy',['deep'],'长胡须替它摸清了夜色的边界。'],
  ['F019','虹鳟','L03',2,12,35,65,550,'dart',['glow'],'一条很窄的彩虹，也足够照亮池塘。'],
  ['F020','鳗鲡','L03',3,20,60,110,850,'pulse',['deep'],'绕过石头，绕过月影，仍然向前。'],
  ['F021','银龙鱼','L03',4,20,60,100,1600,'heavy',['glow'],'像从水面升起的一片银色屋檐。'],
  ['F022','灯笼鱼','L04',1,3,9,18,12,'steady',['glow'],'深处的小灯，总有人在认真点亮。'],
  ['F023','鳕鱼','L04',1,20,65,120,2300,'heavy',['marine'],'带着冷海的清醒，和慢半拍的温柔。'],
  ['F024','鼠尾鳕','L04',1,15,45,90,500,'pulse',['deep'],'细长尾巴把深海的句号拖得很远。'],
  ['F025','鮟鱇鱼','L04',2,15,45,90,1800,'feint',['deep'],'门前灯已亮，请先慢慢靠近。'],
  ['F026','宝石鱼','L04',2,20,55,100,2000,'dart',['marine'],'沉默的光，藏在不必打磨的鳞片里。'],
  ['F027','皱鳃鲨','L04',3,50,120,200,4500,'pulse',['deep'],'从古老海流里游来，今天也只是散步。'],
  ['F028','皇带鱼','L04',4,100,350,700,45000,'heavy',['deep','glow'],'一条很长的银带，把灯塔系在海上。'],
];
type AbstractRow = readonly [SpeciesId, string, RegionId, number, Pattern, number | null, number | null, number | null, number | null, string];
const abstractRows: readonly AbstractRow[] = [
  ['A001','回滚河豚','L01',25,'rollback',8,18,35,150,'它刚刚撤回了一次挣扎，然后又撤回了撤回。'],
  ['A002','已读不回章鱼','L01',35,'feint',10,30,60,500,'八只手都很忙，已读的小灯倒一直亮着。'],
  ['A003','摸鱼许可证','L01',45,'steady',null,null,null,null,'被水泡软了边角，有效期写着：今天也可以。'],
  ['A004','祖传补丁鱼','L02',30,'pulse',10,25,50,260,'每一块补丁，都有自己的上一块补丁。'],
  ['A005','缓存鲨','L02',45,'dart',25,70,140,1800,'口袋很多，刚放进去的东西却总想不起在哪。'],
  ['A006','我的刀盾·狗狗浮标','L02',60,'feint',null,null,null,null,'认真守着小小的海面，偶尔朝浪花汪一声。'],
  ['A007','上下文折叠鳗','L03',35,'rollback',20,90,220,800,'展开很长，折起来恰好能放进今晚。'],
  ['A008','404 漂流瓶','L03',50,'steady',null,null,null,null,'地址没有找到，漂流却没有停下。'],
  ['A009','周一水母','L03',65,'pulse',8,25,55,300,'缓缓上浮，缓缓醒来，周一也可以很柔软。'],
  ['A010','进度条带鱼','L04',40,'heavy',30,120,260,1800,'它的尾巴还在加载，前半截已经出发。'],
  ['A011','内存泄漏水母','L04',60,'pulse',12,45,100,850,'路过的地方留下几颗小光点，回头又去捡。'],
  ['A012','永不沉底工单','L04',80,'rollback',null,null,null,null,'浪花盖过一行字，它又浮起来说声你好。'],
];
const otherRows: readonly (readonly [SpeciesId, string, RegionId, 'relic' | 'guest', string])[] = [
  ['R001','旧码头铜铃','L01','relic','锈色下面，还留着第一班渡船的清晨。'],
  ['R002','不指北的潮汐罗盘','L02','relic','指针不指北，它指向下一次想去的地方。'],
  ['R003','月光唱片','L03','relic','轻轻放下唱针，夜色有了回声。'],
  ['R004','灯塔旧信','L04','relic','纸上的海风已经干了，问候还没有。'],
  ['G001','潮汐信使·贝邮','L01','guest','她把未寄出的心事，装进一只防水邮袋。'],
  ['G002','鲸汐·鲸鱼娘','L04','guest','披风拂过水面，像一头温柔的鲸。'],
  ['G003','奶泡来客·奶娃','L02','guest','一朵认真旅行的奶泡，带着杯沿上的小雨。'],
  ['G004','夜航灯使·萤舟','L03','guest','她照亮水边的小路，也照亮回家的那一段。'],
];
export const SPECIES: readonly Species[] = [
  ...fishRows.map(([id,name,region,rarity,min,mode,max,weight,pattern,tags,description]): Species =>
    ({id,name,region,rarity,min:min*10,mode:mode*10,max:max*10,weight,pattern,tags,description,
      kind:'fish',creature:true,poolWeight:1,price:[0,10,18,40,90][rarity]!})),
  ...abstractRows.map(([id,name,region,price,pattern,min,mode,max,weight,description],index): Species =>
    ({id,name,region,price,pattern,min:min===null?null:min*10,mode:mode===null?null:mode*10,max:max===null?null:max*10,
      weight,description,kind:'abstract',creature:min!==null,rarity:null,poolWeight:[50,30,20][index%3]!,tags:[]})),
  ...otherRows.map(([id,name,region,kind,description]): Species =>
    ({id,name,region,kind,description,creature:false,pattern:'steady',rarity:null,poolWeight:1,tags:[],min:null,mode:null,max:null,weight:null,price:0})),
];
const speciesById = new Map(SPECIES.map(item => [item.id, item]));
export function species(id: SpeciesId): Species {
  const found = speciesById.get(id);
  if (!found) throw new Error('Unknown species');
  return found;
}
export function isSpeciesId(value: unknown): value is SpeciesId { return typeof value === 'string' && speciesById.has(value as SpeciesId); }
export function isRegionId(value: unknown): value is RegionId { return REGION_IDS.some(id => id === value); }
export function region(id: RegionId) { return REGIONS.find(item => item.id === id)!; }
export const VARIANT_NAMES: Record<Variant, string> = { original:'原色', pearl:'珠光', starsand:'星砂' };
// Register only produced assets; absent art remains explicit during development.
export const SPRITES: Partial<Record<SpeciesId, Partial<Record<Variant, string>>>> = {
  F001:{original:'f001-pixel-v1.png'}, F002:{original:'f002-pixel-v2.png'},
  F003:{original:'f003-pixel-v2.png'}, A001:{original:'a001-pixel-v2.png'},
  F004:{original:'f004-pixel-v1.png'},F005:{original:'f005-pixel-v2.png'},
  F006:{original:'f006-pixel-v1.png'},F007:{original:'f007-pixel-v1.png'},
  A002:{original:'a002-pixel-v1.png'},A003:{original:'a003-pixel-v1.png'},R001:{original:'r001-pixel-v3.png'},
};
export function spriteName(id: SpeciesId, variant: Variant | null = 'original'): string | undefined { return SPRITES[id]?.[variant ?? 'original']; }
export function sizeLabel(quality: number | null): string {
  return quality === null ? '' : quality < 100 ? '迷你' : quality < 750 ? '标准' : quality < 950 ? '大型' : quality < 990 ? '巨物' : '冠军尺寸';
}
