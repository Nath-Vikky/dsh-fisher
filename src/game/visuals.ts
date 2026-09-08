import type { RegionId } from './content.ts';
import type { GuestId } from './guests.ts';
import type { DecorId } from './decor.ts';
import type { BaitId } from './progression.ts';

export type Outfit = 'base' | 'alternate';
export type PlayerPose = 'idle' | 'cast' | 'hold' | 'reel' | 'surprise';
export const SCENE_ART: Record<RegionId,string> = {
  L01:'l01-coast-pixel-v1.webp',L02:'l02-coralbay-pixel-v1.webp',
  L03:'l03-moonpond-pixel-v1.webp',L04:'l04-deepsea-pixel-v1.webp',
};
export const GUEST_ART: Record<GuestId,Record<Outfit,{portrait:string;chibi:string}>> = {
  G001:{base:{portrait:'g001-beiyou-base-pixel-v6.webp',chibi:'g001-beiyou-base-chibi-pixel-v2.webp'},
    alternate:{portrait:'g001-beiyou-alternate-pixel-v4.webp',chibi:'g001-beiyou-alternate-chibi-pixel-v2.webp'}},
  G002:{base:{portrait:'g002-jingxi-base-pixel-v6.webp',chibi:'g002-jingxi-base-chibi-pixel-v2.webp'},
    alternate:{portrait:'g002-jingxi-alternate-pixel-v4.webp',chibi:'g002-jingxi-alternate-chibi-pixel-v3.webp'}},
  G003:{base:{portrait:'g003-naiwa-base-pixel-v1.webp',chibi:'g003-naiwa-base-chibi-pixel-v1.webp'},
    alternate:{portrait:'g003-naiwa-alternate-pixel-v4.webp',chibi:'g003-naiwa-alternate-chibi-pixel-v3.webp'}},
  G004:{base:{portrait:'g004-yingzhou-base-pixel-v6.webp',chibi:'g004-yingzhou-base-chibi-pixel-v2.webp'},
    alternate:{portrait:'g004-yingzhou-alternate-pixel-v4.webp',chibi:'g004-yingzhou-alternate-chibi-pixel-v2.webp'}},
};
export const DECOR_ART: Record<DecorId,string> = {
  C001:'c001-woodplatform-pixel-v1.webp',C002:'c002-wickerstool-pixel-v1.webp',
  C003:'c003-glasslantern-pixel-v1.webp',C004:'c004-fishesign-pixel-v1.webp',
  C005:'c005-lotuspanel-pixel-v1.webp',C006:'c006-pineshelf-pixel-v1.webp',
  C007:'c007-sandplatform-pixel-v1.webp',C008:'c008-shellchair-pixel-v1.webp',
  C009:'c009-corallamp-pixel-v2.webp',C010:'c010-breezesign-pixel-v2.webp',
  C011:'c011-coralpanel-pixel-v1.webp',C012:'c012-driftshelf-pixel-v1.webp',
  C013:'c013-moonrug-pixel-v1.webp',C014:'c014-nightchair-pixel-v1.webp',
  C015:'c015-fireflylamp-pixel-v1.webp',C016:'c016-moonsign-pixel-v1.webp',
  C017:'c017-moonpanel-pixel-v1.webp',C018:'c018-starshelf-pixel-v2.webp',
  C019:'c019-blueplatform-pixel-v2.webp',C020:'c020-whalechair-pixel-v1.webp',
  C021:'c021-lighthouselamp-pixel-v1.webp',C022:'c022-oceansign-pixel-v1.webp',
  C023:'c023-deeppanel-pixel-v1.webp',C024:'c024-pearlshelf-pixel-v1.webp',
};
export const BAIT_ART: Record<BaitId,string> = {
  B01:'b01-dough-pixel-v1.webp',B02:'b02-grain-pixel-v1.webp',
  B03:'b03-seasalt-pixel-v1.webp',B04:'b04-glowbait-pixel-v1.webp',
  B05:'b05-oddbait-pixel-v1.webp',B06:'b06-deepbait-pixel-v1.webp',
  B07:'b07-targetbait-pixel-v1.webp',B08:'b08-invitebait-pixel-v1.webp',
};
export const PLAYER_ART: Record<PlayerPose,readonly [string,string]> = {
  idle:['p001-player-idle1-pixel-v2.webp','p001-player-idle2-pixel-v2.webp'],
  cast:['p001-player-cast1-pixel-v2.webp','p001-player-cast2-pixel-v2.webp'],
  hold:['p001-player-hold1-pixel-v2.webp','p001-player-hold2-pixel-v3.webp'],
  reel:['p001-player-reel1-pixel-v2.webp','p001-player-reel2-pixel-v2.webp'],
  surprise:['p001-player-surprise1-pixel-v2.webp','p001-player-surprise2-pixel-v2.webp'],
};
export function guestPicture(id:GuestId,outfit:Outfit,kind:'portrait'|'chibi'):string|undefined {
  return GUEST_ART[id]?.[outfit][kind];
}
export function visualIllustrations():string[] {
  return [...Object.values(GUEST_ART).flatMap(outfits=>Object.values(outfits).flatMap(item=>[item.portrait,item.chibi])),
    ...Object.values(DECOR_ART),...Object.values(BAIT_ART),...Object.values(PLAYER_ART).flat()];
}
