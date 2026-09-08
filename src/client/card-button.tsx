import type * as ReactTypes from 'react';
import type { Catch } from '../game/engine.ts';
import type { FrameId } from '../game/life.ts';
import { spriteName } from '../game/content.ts';
import { downloadCatchCard } from './catch-card.ts';
export function createCardButton(React:typeof ReactTypes) {
  return function CardButton({item,frame,onStart}:{item:Catch;frame:FrameId;onStart:()=>void}) {
    const [busy,setBusy]=React.useState(false),[message,setMessage]=React.useState<string|null>(null);
    const live=React.useRef(true);React.useEffect(()=>{live.current=true;return ()=>{live.current=false;};},[]);
    if(!spriteName(item.speciesId,item.variant))return null;
    const save=async()=>{
      onStart();setBusy(true);setMessage(null);
      try{await downloadCatchCard(item,frame);if(live.current)setMessage('收获卡已交给浏览器保存');}
      catch(error){if(live.current)setMessage(error instanceof Error?error.message:'保存图片没有完成，请重试');}
      finally{if(live.current)setBusy(false);}
    };
    return <div className="dsh-fisher-card-download"><button disabled={busy} onClick={()=>void save()}>{busy?'正在绘制收获卡…':'保存收获卡'}</button>{message&&<small role="status">{message}</small>}</div>;
  };
}
