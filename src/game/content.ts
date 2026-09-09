export const REGION_IDS = ['L01', 'L02', 'L03', 'L04'] as const;
export type RegionId = typeof REGION_IDS[number];
export const SPECIES_IDS = [
  'F001','F002','F003','F004','F005','F006','F007','F008','F009','F010','F011','F012','F013','F014',
  'F015','F016','F017','F018','F019','F020','F021','F022','F023','F024','F025','F026','F027','F028',
  'A001','A002','A003','A004','A005','A006','A007','A008','A009','A010','A011','A012','A013',
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
  ['A001','耄耋','L01',25,'rollback',8,18,35,150,'嘴上很有气势，爪子已经悄悄往后挪了半步。'],
  ['A002','我的刀盾狗','L01',35,'feint',10,30,60,500,'刀和盾都备好了，今天要守护的是岸边这块空地。'],
  ['A003','野生狗奶','L01',45,'steady',null,null,null,null,'一盒从浪花里漂来的奇妙饮品，包装上的小狗十分认真。'],
  ['A004','香蕉猫','L02',30,'pulse',10,25,50,260,'披着一身香蕉黄，把小小的委屈交给海风。'],
  ['A005','Maxwell 猫','L02',45,'dart',25,70,140,1800,'它把自己收成一团，转到哪里都像在家。'],
  ['A006','电子木鱼','L02',60,'feint',null,null,null,null,'轻轻一声，给忙碌的脑袋留一点空白。'],
  ['A007','Pop Cat','L03',35,'rollback',20,90,220,800,'嘴巴一张一合，仿佛在替水面的气泡配音。'],
  ['A008','水泥封心','L03',50,'steady',null,null,null,null,'封得很结实，却还是为一朵浪花留了一道缝。'],
  ['A009','Happy Cat','L03',65,'pulse',8,25,55,300,'快乐先举起了爪子，烦恼随后再说。'],
  ['A010','Doge','L04',40,'heavy',30,120,260,1800,'侧过脸看你一眼，像是已经想好了很多感叹词。'],
  ['A011','卡皮巴拉','L04',60,'pulse',12,45,100,850,'头顶一颗橘子，稳稳地把今天过得很慢。'],
  ['A012','黄金切尔西','L04',80,'rollback',null,null,null,null,'海底也要讲究出场，鞋尖已经接住了灯塔的光。'],
  ['A013','奶蛙','L02',45,'pulse',12,32,65,900,'草帽还没坐稳，捧着肚子的笑声已经传到码头。'],
];
const otherRows: readonly (readonly [SpeciesId, string, RegionId, 'relic' | 'guest', string])[] = [
  ['R001','旧码头铜铃','L01','relic','锈色下面，还留着第一班渡船的清晨。'],
  ['R002','不指北的潮汐罗盘','L02','relic','指针不指北，它指向下一次想去的地方。'],
  ['R003','月光唱片','L03','relic','轻轻放下唱针，夜色有了回声。'],
  ['R004','灯塔旧信','L04','relic','纸上的海风已经干了，问候还没有。'],
  ['G001','潮汐信使·贝邮','L01','guest','她把未寄出的心事，装进一只防水邮袋。'],
  ['G002','鲸汐·鲸鱼娘','L04','guest','披风拂过水面，像一头温柔的鲸。'],
  ['G003','奶泡来客·泡芙','L02','guest','一朵认真旅行的奶泡，带着杯沿上的小雨。'],
  ['G004','夜航灯使·萤舟','L03','guest','她照亮水边的小路，也照亮回家的那一段。'],
];
export const SPECIES: readonly Species[] = [
  ...fishRows.map(([id,name,region,rarity,min,mode,max,weight,pattern,tags,description]): Species =>
    ({id,name,region,rarity,min:min*10,mode:mode*10,max:max*10,weight,pattern,tags,description,
      kind:'fish',creature:true,poolWeight:1,price:[0,10,18,40,90][rarity]!})),
  ...abstractRows.map(([id,name,region,price,pattern,min,mode,max,weight,description],index): Species =>
    ({id,name,region,price,pattern,min:min===null?null:min*10,mode:mode===null?null:mode*10,max:max===null?null:max*10,
      weight,description,kind:'abstract',creature:min!==null,rarity:null,poolWeight:id==='A013'?30:[50,30,20][index%3]!,tags:[]})),
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
export const SPRITES: Record<SpeciesId, Partial<Record<Variant, string>>> = {
  F001:{original:'f001-original-v1.webp',pearl:'f001-pearl-pixel-v1.webp',starsand:'f001-starsand-pixel-v2.webp'},
  F002:{original:'f002-original-v2.webp',pearl:'f002-pearl-pixel-v2.webp',starsand:'f002-starsand-pixel-v2.webp'},
  F003:{original:'f003-original-v2.webp',pearl:'f003-pearl-pixel-v2.webp',starsand:'f003-starsand-pixel-v2.webp'},
  F004:{original:'f004-original-v1.webp',pearl:'f004-pearl-pixel-v2.webp',starsand:'f004-starsand-pixel-v1.webp'},
  F005:{original:'f005-original-v2.webp',pearl:'f005-pearl-pixel-v2.webp',starsand:'f005-starsand-pixel-v2.webp'},
  F006:{original:'f006-original-v1.webp',pearl:'f006-pearl-pixel-v2.webp',starsand:'f006-starsand-pixel-v2.webp'},
  F007:{original:'f007-original-v1.webp',pearl:'f007-pearl-pixel-v2.webp',starsand:'f007-starsand-pixel-v2.webp'},
  F008:{original:'f008-sardine-pixel-v1.webp',pearl:'f008-pearl-pixel-v2.webp',starsand:'f008-starsand-pixel-v2.webp'},
  F009:{original:'f009-anchovy-pixel-v2.webp',pearl:'f009-pearl-pixel-v2.webp',starsand:'f009-starsand-pixel-v2.webp'},
  F010:{original:'f010-mullet-pixel-v1.webp',pearl:'f010-pearl-pixel-v2.webp',starsand:'f010-starsand-pixel-v2.webp'},
  F011:{original:'f011-mackerel-pixel-v1.webp',pearl:'f011-pearl-pixel-v2.webp',starsand:'f011-starsand-pixel-v2.webp'},
  F012:{original:'f012-flounder-pixel-v1.webp',pearl:'f012-pearl-pixel-v2.webp',starsand:'f012-starsand-pixel-v2.webp'},
  F013:{original:'f013-seabream-pixel-v1.webp',pearl:'f013-pearl-pixel-v2.webp',starsand:'f013-starsand-pixel-v2.webp'},
  F014:{original:'f014-sunfish-pixel-v1.webp',pearl:'f014-pearl-pixel-v2.webp',starsand:'f014-starsand-pixel-v2.webp'},
  F015:{original:'f015-medaka-pixel-v1.webp',pearl:'f015-pearl-pixel-v2.webp',starsand:'f015-starsand-pixel-v2.webp'},
  F016:{original:'f016-bitterling-pixel-v1.webp',pearl:'f016-pearl-pixel-v2.webp',starsand:'f016-starsand-pixel-v2.webp'},
  F017:{original:'f017-sunfishfresh-pixel-v1.webp',pearl:'f017-pearl-pixel-v2.webp',starsand:'f017-starsand-pixel-v2.webp'},
  F018:{original:'f018-catfish-pixel-v2.webp',pearl:'f018-pearl-pixel-v1.webp',starsand:'f018-starsand-pixel-v2.webp'},
  F019:{original:'f019-rainbowtrout-pixel-v1.webp',pearl:'f019-pearl-pixel-v2.webp',starsand:'f019-starsand-pixel-v2.webp'},
  F020:{original:'f020-eel-pixel-v1.webp',pearl:'f020-pearl-pixel-v2.webp',starsand:'f020-starsand-pixel-v2.webp'},
  F021:{original:'f021-arowana-pixel-v2.webp',pearl:'f021-pearl-pixel-v2.webp',starsand:'f021-starsand-pixel-v2.webp'},
  F022:{original:'f022-lanternfish-pixel-v2.webp',pearl:'f022-pearl-pixel-v2.webp',starsand:'f022-starsand-pixel-v2.webp'},
  F023:{original:'f023-cod-pixel-v1.webp',pearl:'f023-pearl-pixel-v2.webp',starsand:'f023-starsand-pixel-v2.webp'},
  F024:{original:'f024-grenadier-pixel-v1.webp',pearl:'f024-pearl-pixel-v2.webp',starsand:'f024-starsand-pixel-v2.webp'},
  F025:{original:'f025-anglerfish-pixel-v1.webp',pearl:'f025-pearl-pixel-v2.webp',starsand:'f025-starsand-pixel-v2.webp'},
  F026:{original:'f026-gemfish-pixel-v1.webp',pearl:'f026-pearl-pixel-v2.webp',starsand:'f026-starsand-pixel-v2.webp'},
  F027:{original:'f027-frilledshark-pixel-v2.webp',pearl:'f027-pearl-pixel-v2.webp',starsand:'f027-starsand-pixel-v2.webp'},
  F028:{original:'f028-oarfish-pixel-v1.webp',pearl:'f028-pearl-pixel-v2.webp',starsand:'f028-starsand-pixel-v2.webp'},
  A001:{original:'a001-reference-original-v3.webp',pearl:'a001-reference-pearl-v2.webp',starsand:'a001-reference-starsand-v2.webp'},
  A002:{original:'a002-reference-original-v3.webp',pearl:'a002-reference-pearl-v2.webp',starsand:'a002-reference-starsand-v2.webp'},
  A003:{original:'a003-reference-original-v3.webp'},
  A004:{original:'a004-bananacat-pixel-v1.webp',pearl:'a004-pearl-pixel-v2.webp',starsand:'a004-starsand-pixel-v2.webp'},
  A005:{original:'a005-maxwell-pixel-v1.webp',pearl:'a005-pearl-pixel-v2.webp',starsand:'a005-starsand-pixel-v1.webp'},
  A006:{original:'a006-woodfish-pixel-v1.webp'},
  A007:{original:'a007-popcat-pixel-v1.webp',pearl:'a007-pearl-pixel-v1.webp',starsand:'a007-starsand-pixel-v1.webp'},
  A008:{original:'a008-cementheart-pixel-v1.webp'},
  A009:{original:'a009-happycat-pixel-v2.webp',pearl:'a009-pearl-pixel-v2.webp',starsand:'a009-starsand-pixel-v2.webp'},
  A010:{original:'a010-doge-pixel-v2.webp',pearl:'a010-pearl-pixel-v2.webp',starsand:'a010-starsand-pixel-v2.webp'},
  A011:{original:'a011-capybara-pixel-v1.webp',pearl:'a011-pearl-pixel-v2.webp',starsand:'a011-starsand-pixel-v2.webp'},
  A012:{original:'a012-goldboots-pixel-v1.webp'},
  A013:{original:'a013-reference-original-v5.webp',pearl:'a013-reference-pearl-v1.webp',starsand:'a013-reference-starsand-v1.webp'},R001:{original:'r001-original-v3.webp'},
  R002:{original:'r002-tidecompass-pixel-v1.webp'},R003:{original:'r003-moonrecord-pixel-v1.webp'},
  R004:{original:'r004-lighthouseletter-pixel-v1.webp'},
  G001:{original:'g001-beiyou-base-chibi-pixel-v2.webp'},G002:{original:'g002-jingxi-base-chibi-pixel-v2.webp'},
  G003:{original:'g003-naiwa-base-chibi-pixel-v1.webp'},G004:{original:'g004-yingzhou-base-chibi-pixel-v2.webp'},
};
export function spriteName(id: SpeciesId, variant: Variant | null = 'original'): string | undefined { return SPRITES[id]?.[variant ?? 'original']; }
export function sizeLabel(quality: number | null): string {
  return quality === null ? '' : quality < 100 ? '迷你' : quality < 750 ? '标准' : quality < 950 ? '大型' : quality < 990 ? '巨物' : '冠军尺寸';
}
