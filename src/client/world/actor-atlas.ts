import type {Texture,Sprite} from 'three';

export interface ActionAtlas {file:string;size:readonly [number,number];frames:readonly (readonly [number,number,number,number])[];referenceHeight:number;seatLift:number;mirrored?:readonly number[]}
export function frameRect(atlas:ActionAtlas,index:number,right=true){
  if(atlas.mirrored?.includes(index))right=!right;
  const [x,y,w,h]=atlas.frames[index]??atlas.frames[0]!;
  return {x:right?x/atlas.size[0]:(x+w)/atlas.size[0],y:1-(y+h)/atlas.size[1],w:(right?1:-1)*w/atlas.size[0],h:h/atlas.size[1],width:w/atlas.referenceHeight,height:h/atlas.referenceHeight};
}
export function applyAtlas(sprite:Sprite,texture:Texture,atlas:ActionAtlas,index:number,height:number,right=true):void{
  const rect=frameRect(atlas,index,right);texture.repeat.set(rect.w,rect.h);texture.offset.set(rect.x,rect.y);sprite.center.set(.5,0);sprite.scale.set(rect.width*height,rect.height*height,1);
}
