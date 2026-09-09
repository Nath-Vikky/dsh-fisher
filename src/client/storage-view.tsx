import type * as ReactTypes from 'react';
import { API } from '../protocol.ts';
import type { Bootstrap,SavePreview } from '../protocol.ts';
import type { GameController } from './controller.ts';
import { createDialog } from './dialog.tsx';
import { createHelp } from './compact-ui.tsx';

function download(blob:Blob,name:string):void {
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.hidden=true;document.body.append(link);
  try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
export function createStorageView(React:typeof ReactTypes) {
  const Dialog=createDialog(React);
  const Help=createHelp(React);
  return function Storage({data,controller,busy}:{data:Bootstrap;controller:GameController;busy:boolean}) {
    const [working,setWorking]=React.useState(false),[message,setMessage]=React.useState('');
    const [preview,setPreview]=React.useState<SavePreview|null>(null),[confirmed,setConfirmed]=React.useState(false);
    const [deleting,setDeleting]=React.useState(false),[confirmation,setConfirmation]=React.useState('');
    const request=React.useRef<AbortController>(),live=React.useRef(true);
    const returnFocus=React.useRef<HTMLElement|null>(null);
    React.useEffect(()=>{live.current=true;return ()=>{live.current=false;request.current?.abort();};},[]);
    const disabled=busy||working;
    const begin=()=>{returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;controller.pause();setMessage('');setWorking(true);request.current?.abort();const abort=new AbortController();request.current=abort;return abort;};
    const check=async(response:Response)=>{if(!response.ok){const body=await response.json() as {error?:string};throw new Error(body.error??'存档操作没有完成');}};
    const exportSave=async()=>{
      const abort=begin(),timer=setTimeout(()=>abort.abort(),15000);
      try {
        const response=await fetch(`${API}/save/export`,{credentials:'same-origin',cache:'no-store',signal:abort.signal});await check(response);
        const blob=await response.blob();if(live.current){download(blob,'dsh-fisher-save.json');setMessage('已生成存档文件，请留好下载副本。');}
      }catch(error){if(live.current)setMessage(error instanceof Error?error.message:'导出没有完成');}
      finally{clearTimeout(timer);if(live.current)setWorking(false);}
    };
    const prepare=async(source:'file'|'backup',file?:File)=>{
      const abort=begin(),timer=setTimeout(()=>abort.abort(),15000);
      try {
        if(file&&file.size>2*1024*1024)throw new Error('存档超过 2 MiB 上限，原文件没有修改');
        const text=file?await file.text():undefined;
        const response=await fetch(`${API}/save/preview`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({source,text}),signal:abort.signal});
        await check(response);const result=await response.json() as SavePreview;
        if(typeof result.id!=='string'||!Number.isInteger(result.inventory)||!Number.isInteger(result.discovered))throw new Error('存档预览未能识别');
        if(live.current){setPreview(result);setConfirmed(false);}
      }catch(error){if(live.current)setMessage(error instanceof Error?error.message:'存档预览没有完成');}
      finally{clearTimeout(timer);if(live.current)setWorking(false);}
    };
    const replace=async()=>{
      if(!preview||!confirmed)return;
      await controller.action({type:'save.import',previewId:preview.id,confirmed:true});
      const result=controller.getSnapshot();
      if(!live.current)return;
      if(!result.error){setPreview(null);setMessage('存档已恢复。工作补给保持关闭，需要时可重新启用。');}else setMessage(result.error);
    };
    const erase=async()=>{
      await controller.action({type:'save.delete',confirmation});const result=controller.getSnapshot();
      if(!live.current)return;
      if(!result.error){setDeleting(false);setConfirmation('');setMessage('海岸已重新开始，工作补给保持关闭。');}else setMessage(result.error);
    };
    return <fieldset className="dsh-fisher-storage"><legend>本机存档</legend>
      <div className="dsh-fisher-card-heading"><small>{data.inventory.length} 件收藏 · {Object.keys(data.catalog).length} 项图鉴</small><Help label="存档说明"><p>进度自动保存在本机。可以导出带走，也可导入已有文件；导入会先预览，确认后才替换。</p><p>替换前保留当前文件的恢复副本。导入后暂停原来的竿，关闭工作补给，已有储备保留。卸载插件默认保留存档。</p></Help></div>
      <div className="dsh-fisher-actions"><button disabled={disabled} onClick={()=>void exportSave()}>导出存档</button>
        <button disabled={disabled||!data.storage.canManage} onClick={()=>void prepare('backup')}>预览上次备份</button></div>
      <label className="dsh-fisher-file-input">选择存档文件<input type="file" accept=".json,application/json" disabled={disabled||!data.storage.canManage} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void prepare('file',file);}}/></label>
      <button disabled={disabled||!data.storage.canManage} onClick={()=>{controller.pause();setDeleting(true);setConfirmation('');setMessage('');}}>删除海岸进度…</button>
      {!data.storage.canManage&&<p>当前存档被另一个宿主占用，或写入锁不可用，暂时只能导出。</p>}
      {message&&<p role="status">{message}</p>}
      {preview&&<Dialog title={preview.source==='backup'?'恢复上次备份':'导入存档预览'} busy={working||controller.getSnapshot().busy} error={controller.getSnapshot().error} onRetry={()=>void controller.retry()} returnFocus={returnFocus.current} onClose={()=>setPreview(null)}>
        <p>文件：{preview.inventory} 件背包收藏、{preview.discovered} 项图鉴、{preview.coins} 壳币。</p>
        <p>当前：{data.inventory.length} 件背包收藏、{Object.keys(data.catalog).length} 项图鉴、{data.coins} 壳币。</p>
        <p>来源格式 {preview.format} · 内容版本 {preview.content}。{preview.hasCast?'文件中的未完成竿会保留，并等待你继续。':''}</p>
        <label className="dsh-fisher-check-row"><input type="checkbox" checked={confirmed} disabled={disabled} onChange={event=>setConfirmed(event.target.checked)}/><span>我确认用文件中的进度替换当前进度，并关闭工作补给。</span></label>
        <button disabled={disabled||!confirmed} onClick={()=>void replace()}>确认替换存档</button>{message&&<p role="status">{message}</p>}
      </Dialog>}
      {deleting&&<Dialog title="删除海岸进度" busy={working||controller.getSnapshot().busy} error={controller.getSnapshot().error} onRetry={()=>void controller.retry()} onClose={()=>setDeleting(false)}>
        <p>将清空摸鱼海岸的渔获、图鉴、货币和游戏备份，并关闭工作补给。可以先返回并导出存档。</p>
        <label>请输入“删除摸鱼海岸”<input aria-label="删除确认文字" value={confirmation} disabled={disabled} autoComplete="off" onChange={event=>setConfirmation(event.target.value)}/></label>
        <button disabled={disabled||confirmation!=='删除摸鱼海岸'} onClick={()=>void erase()}>确认删除全部海岸进度</button>{message&&<p role="status">{message}</p>}
      </Dialog>}
    </fieldset>;
  };
}
