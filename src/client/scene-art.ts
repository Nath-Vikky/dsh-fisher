import { API } from '../protocol.ts';

// Each mounted scene owns only its visible images; leaving it releases all references.
export class SceneArt {
  private pictures=new Map<string,HTMLImageElement>();
  private pending=new Map<string,{picture:HTMLImageElement;timer:ReturnType<typeof setTimeout>;controller:AbortController;url?:string}>();
  private failed=new Set<string>();
  private disposed=false;
  constructor(private changed:()=>void) {}
  get(file:string|undefined):HTMLImageElement|undefined {return file?this.pictures.get(file):undefined;}
  hasError():boolean {return this.failed.size>0;}
  status(){return {loaded:this.pictures.size,pending:this.pending.size,failed:[...this.failed]};}
  select(files:readonly string[],retry=false):void {
    if(this.disposed)return;
    const wanted=new Set(files);
    for(const [file,picture] of this.pictures)if(!wanted.has(file)){picture.removeAttribute('src');this.pictures.delete(file);}
    for(const file of this.pending.keys())if(!wanted.has(file))this.cancel(file);
    for(const file of this.failed)if(!wanted.has(file)||retry)this.failed.delete(file);
    for(const file of wanted) {
      if(this.pictures.has(file)||this.pending.has(file)||this.failed.has(file))continue;
      const picture=new Image(),controller=new AbortController();
      const fail=()=>{if(this.pending.get(file)!==request)return;this.cancel(file);if(!this.disposed){this.failed.add(file);this.changed();}};
      const timer=setTimeout(fail,15000),request:{picture:HTMLImageElement;timer:ReturnType<typeof setTimeout>;controller:AbortController;url?:string}={picture,timer,controller};this.pending.set(file,request);
      void (async()=>{
        const response=await fetch(`${API}/assets/${file}`,{credentials:'same-origin',signal:controller.signal});
        if(!response.ok)throw new Error('Scene image unavailable');
        const blob=await response.blob();if(this.pending.get(file)!==request)return;
        request.url=URL.createObjectURL(blob);picture.src=request.url;
        // Finish decoding every frame before it can be selected by the animation.
        await picture.decode();if(this.pending.get(file)!==request)return;
        clearTimeout(timer);this.pending.delete(file);URL.revokeObjectURL(request.url);
        this.pictures.set(file,picture);this.changed();
      })().catch(fail);
    }
  }
  private cancel(file:string):void {
    const pending=this.pending.get(file);if(!pending)return;
    clearTimeout(pending.timer);pending.controller.abort();if(pending.url)URL.revokeObjectURL(pending.url);
    pending.picture.removeAttribute('src');this.pending.delete(file);
  }
  dispose():void {
    this.disposed=true;
    for(const file of this.pending.keys())this.cancel(file);
    for(const picture of this.pictures.values())picture.removeAttribute('src');
    this.pictures.clear();this.failed.clear();
  }
}

export function drawSprite(ctx:CanvasRenderingContext2D,picture:HTMLImageElement|undefined,x:number,y:number,width:number,height:number,flip=false):void {
  if(!picture)return;
  const scale=Math.min(width/picture.naturalWidth,height/picture.naturalHeight);
  const w=Math.round(picture.naturalWidth*scale),h=Math.round(picture.naturalHeight*scale);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));if(flip)ctx.scale(-1,1);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(picture,-Math.round(w/2),-h,w,h);ctx.restore();
}
