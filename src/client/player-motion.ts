import {WORLD_PLAYER_ART} from '../game/visuals.ts';
import type {PlayerPose} from '../game/visuals.ts';

export type ActorPose=PlayerPose|'walk';
export const PLAYER_FOOT=.9375;
export const PLAYER_DRAWN_HEIGHT=.875;
// Coordinates refer to the shared, registered sprite canvas.
export const PLAYER_HANDS:Record<string,readonly [number,number]>={
  [WORLD_PLAYER_ART.hold]:[.62461,.63612],
  [WORLD_PLAYER_ART.cast]:[.69458,.51726],
  [WORLD_PLAYER_ART.reel]:[.61769,.5946],
};

export function playerMotion(pose:ActorPose,elapsed:number,reduced=false){
  const t=reduced?0:Math.max(0,elapsed);
  let file:string=WORLD_PLAYER_ART.idle,bob=0,rotation=0,stretch=1,rodLift=0;
  if(pose==='walk'){
    const steps=[WORLD_PLAYER_ART.walkA,WORLD_PLAYER_ART.idle,WORLD_PLAYER_ART.walkB,WORLD_PLAYER_ART.idle];
    file=reduced?WORLD_PLAYER_ART.idle:steps[Math.floor(t*6)%steps.length]!;
    if(!reduced){bob=Math.abs(Math.sin(t*Math.PI*3))*.03;rotation=Math.sin(t*Math.PI*3)*.009;}
  }else if(pose==='cast'){
    file=t<.25?WORLD_PLAYER_ART.cast:WORLD_PLAYER_ART.hold;
    rodLift=reduced?0:Math.cos(Math.min(1,t/.55)*Math.PI)*.8;
  }else if(pose==='hold'){
    file=WORLD_PLAYER_ART.hold;
    if(!reduced)stretch=1+Math.sin(t*1.8)*.004;
  }else if(pose==='reel'){
    file=Math.floor(t*3)%2===0?WORLD_PLAYER_ART.reel:WORLD_PLAYER_ART.hold;
    if(!reduced){rotation=Math.sin(t*6)*.008;rodLift=Math.sin(t*6)*.07;}
  }else if(pose==='surprise'){
    file=WORLD_PLAYER_ART.surprise;
    if(!reduced)bob=(1-Math.cos(Math.min(t,1)*Math.PI*2))*.025*Math.exp(-t*2);
  }else{
    const blink=t%4.8;
    if(!reduced&&blink>=4.55&&blink<4.72)file=WORLD_PLAYER_ART.blink;
    if(!reduced)stretch=1+Math.sin(t*1.6)*.005;
  }
  return {file,bob,rotation,stretch,rodLift};
}
