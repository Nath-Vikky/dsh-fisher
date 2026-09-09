import type { RegionId } from './content.ts';
import { SPECIES } from './content.ts';
import { regionUnlocked } from './progression.ts';
import type { Goal, GoalTask } from './goals.ts';
import type { LifeContext } from './life.ts';

export const GUEST_IDS=['G001','G002','G003','G004'] as const;
export type GuestId=typeof GUEST_IDS[number];
export interface GuestState { stage:0|1|2|3; invitationEarned:boolean; task:GoalTask|null; outfit:'base'|'alternate' }
export interface GuestDefinition { id:GuestId; name:string; region:RegionId; alternate:string; requirement:string; lines:readonly string[]; stories:readonly [string,string] }
export const GUESTS: readonly GuestDefinition[]=[
  {id:'G001',name:'贝邮',region:'L01',alternate:'雨天邮差装',requirement:'摸鱼塘发现 5 项条目，累计成功 10 竿',lines:[
    '你好，你的名字我还没写上信封。','原来这里也有人等海回信。','今天的邮袋，装了一点好天气。','这张空明信片，留给下一次相遇。',
    '风把地址吹歪了，路倒没有走错。','你坐着就好，我认得这个码头。','新朋友的名字，值得好好写一遍。','图鉴又多了一封回信。',
    '这条纪录，我帮你盖个小小的章。','这一竿可以等，海不会催你。','以后有你的信，我都送到这里。','雨再大，这个地址也不会弄丢。'],stories:[
    '贝邮的邮袋里总放着一叠空白明信片。她说，并不是每封信都必须写好才出门，有时先坐到岸边，听几声水响，就知道想寄给谁了。那天她看了很久鱼缸，最后在一张卡片上画下你留下的小鱼。收件人的位置仍然空着，背面却郑重写了一句：这里有人把它照顾得很好。',
    '雨从下午落到黄昏，贝邮穿着新雨衣走上码头。邮袋是干的，鞋尖却沾着一路的浅水。她没有急着递信，而是先把椅子擦干，放下一只小小的防水盒。盒子里是她这些日子收集的邮戳，每一个都指向这里。她说，走过那么多地址，终于有一处可以不用按门铃。']},
  {id:'G002',name:'鲸汐',region:'L04',alternate:'夜航外套',requirement:'解锁深潜海，并在这里发现 5 项条目',lines:[
    '从海面看过来，这盏灯很容易认。','我叫鲸汐，今晚的潮水很安静。','深处的浪，到了岸边会轻一些。','外套借你挡风，我并不冷。',
    '不用每一次都潜到最深的地方。','有时浮起来，也是一种前进。','这位新朋友，我在很远的地方见过。','你的海，比昨天又宽了一点。',
    '超过昨天就很好，不必超过整片海。','先歇一会儿，绳结交给我看着。','这处码头，我已经记在航线上。','下次夜航结束，我会先来这里。'],stories:[
    '鲸汐曾经沿着一串海底灯火远行。那些光彼此隔得很远，她便把每一次看见它们的位置记在袖口的小本子上。你问她哪一盏最亮，她想了一会儿，指向码头上的普通风灯。原来她记下的不只是灯，还有灯下肯等人回来的人。现在，那本小册子终于多了一个能停留的地址。',
    '夜航外套的内衬绣着几条细细的银线，看上去像鱼，也像风经过水面的路。鲸汐说，那是旅途中没能说完的话，缝进衣服里，就不会被浪冲散。临走前，她把一枚光滑的小贝壳放在鱼缸旁，约好下次回来时再讲它的来处。这一次，她的航线有了明确的归途。']},
  {id:'G003',name:'泡芙',region:'L02',alternate:'奶泡小雨衣',requirement:'在热梗湾发现 5 项条目',lines:[
    '先别晃，我的奶泡帽子要歪啦。','这就是岸上吗？闻起来像小饼干。','我带了一点轻飘飘的好心情。','今天适合认真发一会儿呆。',
    '杯沿那么窄，我也走过来啦。','这张小凳子刚好够我坐。','这也能钓到？快让我再看一眼。','新朋友的形状，真有自己的想法。',
    '哇，这么大！我的帽子都站起来了。','我替你看着浮漂，你先歇歇。','现在我也认识回码头的路啦。','下雨也能来，因为我有小雨衣了。'],stories:[
    '泡芙第一次出远门时，只带了一只比自己还小的旅行杯。她把沿途听见的笑声想象成糖粒，认真数过以后装进杯里，虽然别人什么也看不见。到了热梗湾，她发现这里的收藏一个比一个奇怪，便决定暂时不走了。那天晚上，她给杯子贴了新标签，上面写着：在这里，奇怪也是一种欢迎。',
    '小雨衣做好那天，天上偏偏一朵雨云也没有。泡芙仍然穿着它，在码头和鱼缸之间走了好几趟，检查帽沿会不会遮住眼睛。后来一阵风送来两滴水，她高兴得像等到了一整场雨。你替她挪开椅子上的叶片，她便把那里宣布为自己的固定座位，还给明天也留了一个位置。']},
  {id:'G004',name:'萤舟',region:'L03',alternate:'星夜灯罩装',requirement:'在月光池发现 5 项条目',lines:[
    '灯先放在这里，会照着你上岸。','我叫萤舟，认路时喜欢慢一点。','月亮没出来的时候，小灯也够用。','这一盏留给来路，那一盏留给归途。',
    '你看，鱼影也会替水面写字。','这里的夜色，适合少说一句话。','又一颗小小的光，落进图鉴里了。','今晚多认识一位邻居，真好。',
    '把这条纪录留下，给以后的你看。','灯还亮着，你可以慢慢回来。','下次经过，我会认得这处布置。','从今以后，这盏灯就在这里等你。'],stories:[
    '萤舟说，做灯的人不一定比别人更熟悉黑夜。她最初学会点灯，是因为总在同一个岔路口走错。后来她把灯留在那里，自己不再迷路，陌生人也偶尔朝她挥手。看见你布置好的码头，她悄悄把提灯转了半圈，让光落在上岸的第一块木板上。她说，欢迎有时不必挂成招牌。',
    '新的星夜灯罩并没有让光变得更亮，只是在边缘多出几枚细小的星孔。萤舟把它放低，星点便落在椅背、鱼缸和你的袖口上。她没有数这些光点，因为风一吹，它们就会重新排队。收拾东西时，她把常用的灯芯留进抽屉，说既然以后常来，就不用每次把整段夜路都背在身上。']},
];
export function guest(id:GuestId): GuestDefinition { return GUESTS.find(item=>item.id===id)!; }
export function isGuestId(value:unknown): value is GuestId { return GUEST_IDS.some(id=>id===value); }
export function guestEligible(id:GuestId,context:LifeContext): boolean {
  const def=guest(id),known=SPECIES.filter(item=>item.region===def.region&&context.catalog[item.id]).length;
  return regionUnlocked(def.region,context.experience,context.research)&&known>=5&&(id!=='G001'||context.journey.totalCaught>=10);
}
export function guestGoal(id:GuestId,stage:0|1|2|3,route?:'record'|'catches'): Goal|null {
  if(stage===3)return null;
  if(stage===0) {
    if(id==='G001')return {kind:'release',required:5};
    if(id==='G003')return {kind:'catch',required:2,region:'L02',group:'abstract'};
    return {kind:'catch',required:3,region:guest(id).region,group:'fish'};
  }
  if(stage===1) {
    if(id==='G001')return {kind:'display',required:1,region:'L01'};
    if(id==='G002')return route==='catches'?{kind:'catch',required:12,region:'L04',group:'any'}:{kind:'record',required:1};
    if(id==='G003')return {kind:'release',required:8};
    return {kind:'decorate-catch',required:3};
  }
  if(id==='G002')return {kind:'display',required:3,region:'L04'};
  if(id==='G003')return {kind:'distinct-fish',required:3};
  return {kind:'quests',required:3};
}
