import { API,isLauncherStatus } from '../protocol.ts';
import type { PluginPreferences,LauncherStatus } from '../protocol.ts';

export function createPluginStore(){
  let state={enabled:false,writable:false,ready:false,busy:false,error:null as string|null,launcher:'shore' as LauncherStatus,visible:!document.hidden},disposed=false,loading=false,preferenceRevision=0;
  let request:AbortController|undefined;
  let stream:EventSource|undefined,reconnect:ReturnType<typeof setTimeout>|undefined;
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('dsh-fisher:preferences'):undefined;
  const listeners=new Set<()=>void>();
  const publish=(patch:Partial<typeof state>)=>{if(disposed||Object.entries(patch).every(([key,value])=>state[key as keyof typeof state]===value))return;state={...state,...patch};for(const listener of listeners)listener();};
  const stopStatus=()=>{stream?.close();stream=undefined;if(reconnect!==undefined)clearTimeout(reconnect);reconnect=undefined;};
  const watchStatus=()=>{
    if(disposed||document.hidden||!state.enabled){stopStatus();return;}
    if(stream)return;
    const source=new EventSource(`${API}/events`);stream=source;
    source.addEventListener('revision',event=>{
      if(disposed||stream!==source)return;
      try{
        const data=JSON.parse((event as MessageEvent<string>).data) as {pluginEnabled?:unknown;launcher?:unknown};
        if(typeof data.pluginEnabled!=='boolean')return;
        preferenceRevision++;
        publish({enabled:data.pluginEnabled,launcher:isLauncherStatus(data.launcher)?data.launcher:'shore'});
        if(!data.pluginEnabled)stopStatus();
      }catch{/* Keep the last confirmed state until a valid event arrives. */}
    });
    source.onerror=()=>{
      if(disposed||stream!==source)return;
      stopStatus();publish({launcher:state.launcher==='shore'?'shore':'waiting'});
      if(!document.hidden&&state.enabled)reconnect=setTimeout(()=>{reconnect=undefined;watchStatus();},5000);
    };
  };
  const read=async(enabled?:boolean)=>{
    const controller=new AbortController();request=controller;const timer=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(`${API}/preferences`,{credentials:'same-origin',cache:'no-store',signal:controller.signal,
        ...(enabled===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled})})});
      const data:unknown=await response.json();
      if(!response.ok||!data||typeof data!=='object'||!('enabled' in data)||typeof data.enabled!=='boolean'||!('writable' in data)||typeof data.writable!=='boolean')throw new Error('海岸设置暂时无法同步，请重试');
      return {enabled:data.enabled,writable:data.writable,launcher:'launcher' in data&&isLauncherStatus(data.launcher)?data.launcher:'shore'} satisfies PluginPreferences;
    }finally{clearTimeout(timer);if(request===controller)request=undefined;}
  };
  const refresh=async()=>{
    if(disposed||loading||state.busy||document.hidden)return;
    loading=true;const revision=preferenceRevision;
    try{const data=await read();if(revision===preferenceRevision)publish({...data,ready:true,error:null});}
    catch(error){if(revision===preferenceRevision)publish({error:error instanceof Error?error.message:'海岸设置尚未连接'});}
    finally{loading=false;watchStatus();}
  };
  const visibility=()=>{publish({visible:!document.hidden});if(document.hidden)stopStatus();else void refresh();};
  if(channel)channel.onmessage=()=>{void refresh();};
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('focus',refresh);
  void refresh();
  return {
    getSnapshot:()=>state,
    subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};},
    refresh,
    receiveEnabled(enabled:boolean){if(enabled!==state.enabled){preferenceRevision++;publish({enabled,...(!enabled?{launcher:'shore' as const}:{})});watchStatus();}},
    async setEnabled(enabled:boolean){
      if(disposed||state.busy||!state.ready||!state.writable)return;
      preferenceRevision++;publish({busy:true,error:null});
      try{publish({...await read(enabled),ready:true});channel?.postMessage('updated');}
      catch(error){try{publish(await read());}catch{/* Keep the last confirmed preference. */}publish({error:error instanceof Error?error.message:'设置没有保存，请重试'});}
      finally{publish({busy:false});watchStatus();}
    },
    dispose(){disposed=true;stopStatus();request?.abort();channel?.close();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',refresh);listeners.clear();}
  };
}
export type PluginStore=ReturnType<typeof createPluginStore>;
