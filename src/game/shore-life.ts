import type { LifeContext } from './life.ts';
import type { GuestId } from './guests.ts';
import { species } from './content.ts';
import { decor } from './decor.ts';

export function collectionRemark(data:LifeContext,visitor:GuestId):string|null {
  const fish=data.inventory.find(item=>data.life.aquarium.includes(item.id));
  if(fish){
    const name=species(fish.speciesId).name;
    const lines:Record<GuestId,string>={G001:`我在鱼缸旁看了好一会儿这只${name}。下次的明信片，就画它吧。`,G002:`你留下的${name}，让我想起一段航程。海里的相遇，也可以在岸上继续。`,G003:`${name}刚刚是不是朝我看了一眼？我给它留了一个靠窗的位置！`,G004:`灯光落在${name}身上，像一封很慢的回信。今晚可以一起看看它。`};
    return lines[visitor];
  }
  const seat=data.life.decor.seat;
  if(seat)return `你摆的${decor(seat).name}很舒服。我在这里歇一会儿，等你带回新的海上故事。`;
  if(data.life.shelf.some(Boolean))return '陈列架上的这些小东西，每一件都有自己的来路。下次说给我听吧。';
  return null;
}
