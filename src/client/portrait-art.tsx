import type * as ReactTypes from 'react';
import {API} from '../protocol.ts';
import {thumbnailAsset} from '../game/art.ts';
import {guestPicture,WORLD_PLAYER_ART} from '../game/visuals.ts';
import type {Outfit} from '../game/visuals.ts';
import type {GuestId} from '../game/guests.ts';
import {DecodedCache} from './decoded-cache.ts';

const portraits=new DecodedCache<{picture:HTMLImageElement;url:string}>(async(file,signal)=>{
  const response=await fetch(`${API}/assets/${file}`,{credentials:'same-origin',signal,priority:'low'});
  if(!response.ok)throw new Error('Portrait unavailable');
  const blob=await response.blob();signal.throwIfAborted();
  const url=URL.createObjectURL(blob),picture=new Image();picture.decoding='async';picture.src=url;
  try{await picture.decode();return {picture,url};}
  catch(error){picture.removeAttribute('src');URL.revokeObjectURL(url);throw error;}
},({picture,url})=>{picture.removeAttribute('src');URL.revokeObjectURL(url);},({picture})=>picture.naturalWidth*picture.naturalHeight*4,16*1024*1024);

// Only the present/selected guest is warmed; closing the game releases all leases.
export function retainConversationArt(guest:GuestId|null|undefined,outfit:Outfit='base',delay=600):()=>void{
  if(!guest)return ()=>{};
  let leases:ReturnType<typeof portraits.acquire>[]=[];
  const timer=setTimeout(()=>{leases=[WORLD_PLAYER_ART.idle,guestPicture(guest,outfit,'portrait')!].map(file=>portraits.acquire(file));for(const lease of leases)void lease.ready.catch(()=>{});},delay);
  return ()=>{clearTimeout(timer);for(const lease of leases)lease.release();};
}

export function createPreparedPortrait(React:typeof ReactTypes){
  return function PreparedPortrait({file,alt}:{file:string;alt:string}){
    const [ready,setReady]=React.useState<{file:string;url:string}|null>(null),[failed,setFailed]=React.useState('');
    React.useEffect(()=>{
      let active=true;setFailed('');const lease=portraits.acquire(file);
      void lease.ready.then(value=>{if(active)setReady({file,url:value.url});}).catch(error=>{if(active)setFailed(error instanceof Error?error.message:'Portrait unavailable');});
      return ()=>{active=false;lease.release();};
    },[file]);
    const picture=ready?.file===file?ready:portraits.peek(file);
    return <img src={picture?picture.url:`${API}/assets/${thumbnailAsset(file)}`} alt={alt} decoding="async" draggable={false} data-art-state={picture?'ready':failed?'preview':'loading'} data-art-error={failed||undefined}/>;
  };
}
