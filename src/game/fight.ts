import type { Challenge, Simulation } from './engine.ts';
import { modifiers } from './gear.ts';
const BASE = modifiers({rod:'D01',line:'N01',float:'U01'});
const clamp = (n:number, max:number) => Math.max(0, Math.min(max, Math.round(n)));
export function behavior(tick: number, challenge: Challenge): {push:number; resistance:number; burst:boolean; hint:string} {
  const extra = challenge.modifiers?.warningTicks ?? 0;
  const offset = challenge.seed % 20;
  const beat = (tick + offset) % 160;
  const result = {push:20,resistance:0,burst:false,hint:''};
  const event = (start:number, end:number, push:number, label:string): void => {
    if (beat >= start-12-extra && beat < start) result.hint = `${label}将至 · 准备松线`;
    if (beat >= start && beat < end) { result.push=push; result.burst=true; result.hint=`${label}中 · 稳住`; }
  };
  switch (challenge.pattern) {
    case 'steady': result.push=12+((Math.floor(tick/40)+challenge.seed)%3)*8; break;
    case 'dart': event(80,100,240,'短冲'); break;
    case 'heavy': result.push=48; result.resistance=13; result.hint='持续重拉 · 留意张力'; break;
    case 'pulse': event(40,52,210,'第一波'); event(82,96,230,'第二波'); break;
    case 'rollback': result.push=25; result.hint='留意回游 · 分段慢慢收'; break;
    case 'feint': event(40,48,90,'轻试探'); event(78,98,270,'真正冲刺'); break;
  }
  return result;
}
export function stepCurrent(sim:Simulation, challenge:Challenge, input:boolean): Simulation {
  const next = {...sim,tick:sim.tick+1,fightTicks:sim.fightTicks+1,reel:input};
  const gear=challenge.modifiers ?? BASE;
  const safety=next.fightTicks>=3000;
  const guided=challenge.mode==='guided';
  const assisted=challenge.mode!=='standard';
  let reel=input;
  if (assisted || safety) {
    if (sim.tension>=650000) next.assistedRelease=true;
    else if (sim.tension<=300000) next.assistedRelease=false;
    reel=(reel||safety)&&!next.assistedRelease;
  }
  const effect=behavior(next.fightTicks,challenge);
  const size=challenge.size ?? 500;
  const push=safety?0:effect.push*(.85+.3*size/1000)*(effect.burst?gear.burst/1000:challenge.pattern==='heavy'?gear.heavyPush/1000:1);
  const resistance=safety?0:effect.resistance*gear.heavyResistance/1000;
  next.tension=clamp(sim.tension+(reel?140*gear.reelTension/1000+push:-260+push)*50,1000000);
  const regress=(sim.tension<80000?35*gear.slack/1000:15)*(assisted?.7:1);
  next.progress=clamp(sim.progress+(reel?(safety?140:Math.max(45,gear.speed-resistance)):-regress)*50,1000000);
  if (next.tension>850000) next.danger=clamp(sim.danger+5000,300000);
  else if (next.tension<=720000) next.danger=clamp(sim.danger-gear.recovery*50,300000);
  next.peakDanger=Math.max(sim.peakDanger??sim.danger,next.danger);
  if (!safety && challenge.pattern==='rollback' && next.rollbacks<2 && next.progress>=(next.rollbacks===0?350000:700000)) {
    next.rollbacks++;next.progress=Math.max(0,next.progress-80000);
  }
  if (next.progress>=1000000) next.phase='caught';
  else if (next.danger>=300000) {
    if (guided) { next.danger=150000;next.tension=500000;next.assistedRelease=true; }
    else next.phase='escaped';
  } else if (next.fightTicks>=3600) { next.phase='recovery';next.reel=false; }
  return next;
}
