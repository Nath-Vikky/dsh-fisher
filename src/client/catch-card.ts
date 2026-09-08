import { API } from '../protocol.ts';
import { VARIANT_NAMES,region,sizeLabel,species,spriteName } from '../game/content.ts';
import type { Catch } from '../game/engine.ts';
import { FRAME_NAMES } from '../game/life.ts';
import type { FrameId } from '../game/life.ts';
import { GUEST_IDS } from '../game/guests.ts';
import { guestPicture } from '../game/visuals.ts';
import { thumbnailAsset } from '../game/art.ts';

const PALETTES:Record<FrameId,[string,string,string]>={
  plain:['#f4efdb','#293f46','#afd3c6'],afternoon:['#f4efdb','#3d5447','#c9d7a0'],
  coral:['#fbf0df','#344f61','#efc0aa'],moon:['#eeeafa','#3c4565','#c4c3e7'],
  deep:['#182d40','#f1ecda','#355869'],catalog:['#f7efda','#61512f','#e9d39b'],guests:['#f8edde','#4d485a','#d7c6dd'],
};
async function loadPicture(filename:string):Promise<HTMLImageElement> {
  return new Promise((resolve,reject)=>{
    const picture=new Image();
    const timer=setTimeout(()=>{picture.onload=null;picture.onerror=null;picture.removeAttribute('src');reject(new Error('插图加载较慢，请稍后再保存'));},15000);
    picture.onload=()=>{clearTimeout(timer);picture.onload=null;picture.onerror=null;resolve(picture);};
    picture.onerror=()=>{clearTimeout(timer);picture.onload=null;picture.onerror=null;reject(new Error('插图暂时没有展开，请重试'));};
    picture.src=`${API}/assets/${filename}`;
  });
}
function paragraph(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,width:number,lineHeight:number,maxLines:number) {
  let line='',row=0;
  for(const char of value) {
    if(ctx.measureText(line+char).width>width&&line){ctx.fillText(line,x,y+row*lineHeight);line='';if(++row===maxLines)return;}
    line+=char;
  }
  if(line)ctx.fillText(line,x,y+row*lineHeight);
}
export async function createCatchCard(item:Catch,frame:FrameId):Promise<Blob> {
  const definition=species(item.speciesId),filename=spriteName(item.speciesId,item.variant);
  if(!filename)throw new Error('这份收获的插图暂时无法打开');
  const picture=await loadPicture(filename),canvas=document.createElement('canvas');canvas.width=800;canvas.height=1200;
  const portraits=frame==='guests'?await Promise.all(GUEST_IDS.flatMap(id=>{const file=guestPicture(id,'base','chibi');return file?[loadPicture(thumbnailAsset(file))]:[];})):[];
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('当前浏览器无法保存图片');
  const [paper,ink,accent]=PALETTES[frame];
  ctx.fillStyle=paper;ctx.fillRect(0,0,800,1200);ctx.strokeStyle=ink;ctx.fillStyle=ink;
  ctx.lineWidth=2;ctx.strokeRect(28,28,744,1144);ctx.strokeRect(38,38,724,1124);
  ctx.fillStyle=accent;ctx.fillRect(40,40,720,120);ctx.fillStyle=ink;ctx.strokeRect(40,40,720,120);
  ctx.font='600 34px "Microsoft YaHei",system-ui,sans-serif';ctx.fillText('摸鱼海岸',68,95);
  ctx.font='16px ui-monospace,monospace';ctx.fillText('FISHER / COAST NOTES',68,133);
  ctx.textAlign='right';ctx.font='18px "Microsoft YaHei",system-ui,sans-serif';ctx.fillText(FRAME_NAMES[frame],730,114);
  ctx.textAlign='left';ctx.font='16px ui-monospace,monospace';ctx.fillText(definition.id,70,213);
  ctx.textAlign='center';ctx.font='600 36px "Microsoft YaHei",system-ui,sans-serif';ctx.fillText(definition.name,400,268,650);
  ctx.imageSmoothingEnabled=false;
  const pictureHeight=portraits.length?320:420;
  const scale=Math.min(620/picture.naturalWidth,pictureHeight/picture.naturalHeight);
  const width=Math.round(picture.naturalWidth*scale),height=Math.round(picture.naturalHeight*scale);
  ctx.drawImage(picture,Math.round((800-width)/2),Math.round(315+(pictureHeight-height)/2),width,height);
  portraits.forEach((portrait,index)=>{const ratio=Math.min(105/portrait.naturalWidth,105/portrait.naturalHeight),w=portrait.naturalWidth*ratio,h=portrait.naturalHeight*ratio;ctx.drawImage(portrait,170+index*150-w/2,747-h,w,h);portrait.removeAttribute('src');});
  ctx.fillStyle=accent;ctx.fillRect(70,770,660,110);ctx.strokeRect(70,770,660,110);ctx.fillStyle=ink;
  ctx.font='26px "Microsoft YaHei",system-ui,sans-serif';
  ctx.fillText(item.lengthMm===null?'一份海岸纪念':`${(item.lengthMm/10).toFixed(1)} cm · ${item.weightG} g`,400,814);
  ctx.font='20px "Microsoft YaHei",system-ui,sans-serif';
  ctx.fillText(item.variant?`${sizeLabel(item.quality)} · ${VARIANT_NAMES[item.variant]}`:definition.kind==='guest'?'来客相遇':'海边收藏',400,853);
  ctx.textAlign='left';ctx.font='22px "Microsoft YaHei",system-ui,sans-serif';paragraph(ctx,definition.description,82,930,636,36,3);
  ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(70,1060);ctx.lineTo(730,1060);ctx.stroke();
  ctx.font='18px "Microsoft YaHei",system-ui,sans-serif';ctx.fillText(region(item.region).name,82,1102);
  ctx.textAlign='right';ctx.fillText(new Date(item.caughtAt).toLocaleDateString(),718,1102);
  for(let index=0;index<12;index++){ctx.beginPath();ctx.moveTo(600+index*10,1124);ctx.lineTo(593+index*10,1136);ctx.stroke();}
  picture.removeAttribute('src');
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
    canvas.width=1;canvas.height=1;
    if(blob)resolve(blob);else reject(new Error('图片未能保存，请重试'));
  },'image/png'));
}
export async function downloadCatchCard(item:Catch,frame:FrameId):Promise<void> {
  const blob=await createCatchCard(item,frame),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`dsh-fisher-${item.speciesId}-${item.variant??'memory'}.png`;link.hidden=true;
  document.body.append(link);
  try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
