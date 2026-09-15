export interface ImageLease<T> {ready:Promise<T>;cached:boolean;release:()=>void}
interface Entry<T> {ready:Promise<T>;controller:AbortController;value?:T;bytes:number;users:number;used:number;timer?:ReturnType<typeof setTimeout>}

// Decoded pixels can outlive a scene; GPU textures always belong to that scene.
export class DecodedCache<T> {
  private entries=new Map<string,Entry<T>>();private clock=0;
  private load:(file:string,signal:AbortSignal)=>Promise<T>;private destroy:(value:T)=>void;private size:(value:T)=>number;private budget:number;private keepMs:number;
  constructor(load:(file:string,signal:AbortSignal)=>Promise<T>,destroy:(value:T)=>void,size:(value:T)=>number,budget:number,keepMs=60000){this.load=load;this.destroy=destroy;this.size=size;this.budget=budget;this.keepMs=keepMs;}
  acquire(file:string):ImageLease<T>{
    let entry=this.entries.get(file);const cached=!!entry?.value;
    if(!entry){
      const controller=new AbortController();
      const created:Entry<T>={ready:undefined!,controller,bytes:0,users:0,used:0};
      this.entries.set(file,created);
      const timeout=setTimeout(()=>controller.abort(),15000);
      created.ready=Promise.resolve().then(()=>this.load(file,controller.signal)).then(value=>{
        if(controller.signal.aborted||this.entries.get(file)!==created){this.destroy(value);throw new Error('Image loading stopped');}
        created.value=value;created.bytes=this.size(value);this.trim();return value;
      }).catch(error=>{
        if(this.entries.get(file)===created)this.entries.delete(file);
        clearTimeout(created.timer);throw error;
      }).finally(()=>clearTimeout(timeout));
      // A scene can close before its first await is installed.
      void created.ready.catch(()=>{});entry=created;
    }
    clearTimeout(entry.timer);entry.users++;entry.used=++this.clock;
    const current=entry;let released=false;
    return {ready:entry.ready,cached,release:()=>{
      if(released)return;released=true;current.users--;current.used=++this.clock;
      if(current.users||this.entries.get(file)!==current)return;
      if(!current.value){this.drop(file,current);return;}
      current.timer=setTimeout(()=>this.drop(file,current),this.keepMs);this.trim();
    }};
  }
  get bytes():number{return [...this.entries.values()].reduce((sum,entry)=>sum+entry.bytes,0);}
  peek(file:string):T|undefined{return this.entries.get(file)?.value;}
  clearIdle():void{for(const [file,entry] of this.entries)if(!entry.users)this.drop(file,entry);}
  private drop(file:string,entry:Entry<T>):void{
    if(entry.users||this.entries.get(file)!==entry)return;
    this.entries.delete(file);clearTimeout(entry.timer);entry.controller.abort();if(entry.value)this.destroy(entry.value);
  }
  private trim():void{
    let bytes=this.bytes;
    for(const [file,entry] of [...this.entries].filter(([,value])=>!value.users).sort((a,b)=>a[1].used-b[1].used)){
      if(bytes<=this.budget)break;bytes-=entry.bytes;this.drop(file,entry);
    }
  }
}
