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

// The fixed camera looks along (-10, -17, -15). Keep the last facing on lateral motion.
export function playerFacing(dx:number,dz:number,previous={right:true,back:false}){
  const length=Math.hypot(dx,dz);if(length<.0001)return previous;
  const horizontal=dx*.832-dz*.555,depth=dx*.555+dz*.832;
  return {right:Math.abs(horizontal)>length*.18?horizontal>=0:previous.right,back:Math.abs(depth)>length*.2?depth<0:previous.back};
}

export function playerMotion(pose:ActorPose,elapsed:number,reduced=false,back=false){
  const t=reduced?0:Math.max(0,elapsed);
  const idle=back?WORLD_PLAYER_ART.rearIdle:WORLD_PLAYER_ART.idle;
  let file:string=idle,bob=0,rotation=0,stretch=1,rodLift=0;
  if(pose==='walk'){
    const steps=back?[WORLD_PLAYER_ART.rearWalkA,idle,WORLD_PLAYER_ART.rearWalkB,idle]:[WORLD_PLAYER_ART.walkA,idle,WORLD_PLAYER_ART.walkB,idle];
    file=reduced?idle:steps[Math.floor(t*6)%steps.length]!;
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
    if(!back&&!reduced&&blink>=4.55&&blink<4.72)file=WORLD_PLAYER_ART.blink;
    if(!reduced)stretch=1+Math.sin(t*1.6)*.005;
  }
  return {file,bob,rotation,stretch,rodLift};
}
