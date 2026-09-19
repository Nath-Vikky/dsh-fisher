import type { Bootstrap } from '../../protocol.ts';
import type { PlayerPose } from '../../game/visuals.ts';
import type {Simulation} from '../../game/engine.ts';
import type {FacilityId} from './facilities.ts';
export interface WorldProps {
  data:Bootstrap; pose:PlayerPose; paused:boolean; blocked:boolean; overlay:boolean;
  lowPerformance:boolean; reducedMotion:boolean; guarded?:boolean;
  companionPlay?:number;
  simulation?:Simulation|undefined;
  onFacility:(id:FacilityId)=>void;
  onFish:(spot:'pier'|'cove')=>void; onGuest:()=>void; onGear:()=>void; onFallback:()=>void;
}
