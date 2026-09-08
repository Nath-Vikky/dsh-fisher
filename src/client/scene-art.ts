import { API } from '../protocol.ts';

// Each mounted scene owns only its visible images; leaving it releases all references.
export class SceneArt {
  private pictures=new Map<string,HTMLImageElement>();
  private pending=new Map<string,{picture:HTMLImageElement;timer:ReturnType<typeof setTimeout>}>();
  private failed=new Set<string>();
  private disposed=false;
  constructor(private changed:()=>void) {}
  get(file:string|undefined):HTMLImageElement|undefined {return file?this.pictures.get(file):undefined;}
  hasError():boolean {return this.failed.size>0;}
  select(files:readonly string[],retry=false):void {
    if(this.disposed)return;
    const wanted=new Set(files);
    for(const [file,picture] of this.pictures)if(!wanted.has(file)){picture.removeAttribute('src');this.pictures.delete(file);}
    for(const file of this.pending.keys())if(!wanted.has(file))this.cancel(file);
    for(const file of this.failed)if(!wanted.has(file)||retry)this.failed.delete(file);
    for(const file of wanted) {
      if(this.pictures.has(file)||this.pending.has(file)||this.failed.has(file))continue;
      const picture=new Image();
      const fail=()=>{this.cancel(file);if(!this.disposed){this.failed.add(file);this.changed();}};
      const timer=setTimeout(fail,15000);this.pending.set(file,{picture,timer});
      picture.onload=()=>{
        if(this.disposed||!this.pending.has(file))return;
        clearTimeout(timer);this.pending.delete(file);picture.onload=null;picture.onerror=null;
        this.pictures.set(file,picture);this.changed();
      };
      picture.onerror=fail;
      picture.src=`${API}/assets/${file}`;
    }
  }
  private cancel(file:string):void {
    const pending=this.pending.get(file);if(!pending)return;
    clearTimeout(pending.timer);pending.picture.onload=null;pending.picture.onerror=null;
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
