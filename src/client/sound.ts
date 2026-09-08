export type SoundCue='cast'|'bite'|'shell'|'hook'|'catch'|'new'|'record'|'escape'|'reward'|'select'|'page'|'error';
const NOTES:Record<SoundCue,readonly number[]>={cast:[240,320],bite:[740,980,740],shell:[1046,1318],hook:[440,660],
  catch:[523,659,784],new:[523,659,784,1046],record:[659,784,1046,1318],escape:[440,330],reward:[659,880],select:[520],page:[350],error:[300,260]};

// Short synthesized tones have no network, media files, voices or continuous audio loop.
export class CoastSound {
  private context:AudioContext|undefined;
  private voices=new Set<OscillatorNode>();
  private enabled=false;
  private volume=.35;
  private disposed=false;
  configure(enabled:boolean,volume:number):void {this.enabled=enabled;this.volume=Math.max(0,Math.min(1,volume));if(!enabled)this.quiet();}
  activate():void {
    if(!this.enabled||this.disposed||document.hidden)return;
    try{this.context??=new AudioContext();if(this.context.state==='suspended')void this.context.resume().catch(()=>{});}catch{/* Audio is optional. */}
  }
  play(cue:SoundCue):void {
    const context=this.context;
    if(!this.enabled||!this.volume||this.disposed||document.hidden||!context||context.state!=='running')return;
    this.stopVoices();
    NOTES[cue].forEach((frequency,index)=>{
      const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+index*.085;
      oscillator.type=cue==='shell'?'sine':'triangle';oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,this.volume*.06),at+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,at+.13);oscillator.connect(gain);gain.connect(context.destination);
      this.voices.add(oscillator);oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
      oscillator.start(at);oscillator.stop(at+.15);
    });
  }
  private stopVoices():void {for(const voice of this.voices){try{voice.stop();}catch{/* Already ended. */}}this.voices.clear();}
  quiet():void {this.stopVoices();if(this.context?.state==='running')void this.context.suspend().catch(()=>{});}
  dispose():void {this.disposed=true;this.stopVoices();if(this.context)void this.context.close().catch(()=>{});this.context=undefined;}
}
