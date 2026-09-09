import { API } from '../protocol.ts';
import type { PluginPreferences } from '../protocol.ts';

export function createPluginStore(){
  let state={enabled:false,writable:false,ready:false,busy:false,error:null as string|null},disposed=false,loading=false,preferenceRevision=0;
  let request:AbortController|undefined;
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('dsh-fisher:preferences'):undefined;
  const listeners=new Set<()=>void>();
  const publish=(patch:Partial<typeof state>)=>{if(disposed)return;state={...state,...patch};for(const listener of listeners)listener();};
  const read=async(enabled?:boolean)=>{
    const controller=new AbortController();request=controller;const timer=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(`${API}/preferences`,{credentials:'same-origin',cache:'no-store',signal:controller.signal,
        ...(enabled===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled})})});
      const data:unknown=await response.json();
      if(!response.ok||!data||typeof data!=='object'||!('enabled' in data)||typeof data.enabled!=='boolean'||!('writable' in data)||typeof data.writable!=='boolean')throw new Error('海岸设置暂时无法同步，请重试');
      return data as PluginPreferences;
    }finally{clearTimeout(timer);if(request===controller)request=undefined;}
  };
  const refresh=async()=>{
    if(disposed||loading||state.busy||document.hidden)return;
    loading=true;const revision=preferenceRevision;
    try{const data=await read();if(revision===preferenceRevision)publish({...data,ready:true,error:null});}
    catch(error){if(revision===preferenceRevision)publish({error:error instanceof Error?error.message:'海岸设置尚未连接'});}
    finally{loading=false;}
  };
  const visibility=()=>{if(!document.hidden)void refresh();};
  if(channel)channel.onmessage=()=>{void refresh();};
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('focus',refresh);
  void refresh();
  return {
    getSnapshot:()=>state,
    subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};},
    refresh,
    receiveEnabled(enabled:boolean){if(enabled!==state.enabled){preferenceRevision++;publish({enabled});}},
    async setEnabled(enabled:boolean){
      if(disposed||state.busy||!state.ready||!state.writable)return;
      preferenceRevision++;publish({busy:true,error:null});
      try{publish({...await read(enabled),ready:true});channel?.postMessage('updated');}
      catch(error){try{publish(await read());}catch{/* Keep the last confirmed preference. */}publish({error:error instanceof Error?error.message:'设置没有保存，请重试'});}
      finally{publish({busy:false});}
    },
    dispose(){disposed=true;request?.abort();channel?.close();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',refresh);listeners.clear();}
  };
}
export type PluginStore=ReturnType<typeof createPluginStore>;
