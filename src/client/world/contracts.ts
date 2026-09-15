import type { Bootstrap } from '../../protocol.ts';
import type { PlayerPose } from '../../game/visuals.ts';
export interface WorldProps {
  data:Bootstrap; pose:PlayerPose; paused:boolean; blocked:boolean; overlay:boolean;
  lowPerformance:boolean; reducedMotion:boolean;
  onFish:()=>void; onGuest:()=>void; onGear:()=>void; onFallback:()=>void;
}
