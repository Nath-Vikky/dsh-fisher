import type * as ReactTypes from 'react';

export type PortalRenderer = (children:ReactTypes.ReactNode,container:Element) => ReactTypes.ReactPortal;
let renderPortal:PortalRenderer;
export function configureDialogs(portal:PortalRenderer):void { renderPortal=portal; }

const stacks=new WeakMap<HTMLElement,{layers:HTMLElement[];inert:Map<HTMLElement,boolean>}>();
function registerLayer(panel:HTMLElement,layer:HTMLElement):()=>void {
  let stack=stacks.get(panel);
  if(!stack){stack={layers:[],inert:new Map()};stacks.set(panel,stack);}
  const current=stack;current.layers.push(layer);
  const sync=()=>{
    const top=current.layers.at(-1);
    for(const child of panel.children)if(child instanceof HTMLElement){
      if(!current.inert.has(child))current.inert.set(child,child.inert);
      child.inert=top?child!==top:current.inert.get(child)??false;
    }
  };
  sync();
  const observer=new MutationObserver(sync);observer.observe(panel,{childList:true});
  return ()=>{
    observer.disconnect();current.layers=current.layers.filter(item=>item!==layer);sync();
    if(!current.layers.length){for(const [child,inert] of current.inert)child.inert=inert;stacks.delete(panel);}
  };
}

export function createDialog(React:typeof ReactTypes) {
  return function Dialog({title,children,onClose,busy=false,returnFocus,closeLabel='返回',dismissOnBackdrop=true,closeDisabled=false,hint,className='',error,onRetry}:{title:string;children:ReactTypes.ReactNode;onClose:()=>void;busy?:boolean;returnFocus?:HTMLElement|null;closeLabel?:string;dismissOnBackdrop?:boolean;closeDisabled?:boolean;hint?:string;className?:string;error?:string|null;onRetry?:()=>void}) {
    const anchor=React.useRef<HTMLSpanElement>(null),element=React.useRef<HTMLDialogElement>(null),layer=React.useRef<HTMLDivElement>(null),outsideDown=React.useRef(false);
    const [panel,setPanel]=React.useState<HTMLElement|null>(null),titleId=React.useId();
    React.useLayoutEffect(()=>{setPanel(anchor.current?.closest<HTMLElement>('.dsh-fisher-panel')??null);},[]);
    React.useLayoutEffect(()=>{
      const dialog=element.current,overlay=layer.current;if(!panel||!dialog||!overlay)return;
      const previous=returnFocus??document.activeElement,unregister=registerLayer(panel,overlay);
      dialog.focus({preventScroll:true});
      return ()=>{
        const shouldRestore=document.activeElement===document.body||overlay.contains(document.activeElement);
        unregister();
        if(!shouldRestore)return;
        if(previous instanceof HTMLElement&&previous.isConnected&&!previous.matches(':disabled')&&!previous.closest('[inert]'))previous.focus({preventScroll:true});
        if(document.activeElement===document.body||overlay.contains(document.activeElement)){
          const parent=stacks.get(panel)?.layers.at(-1)?.querySelector<HTMLDialogElement>('dialog');parent?.focus({preventScroll:true});
        }
      };
    },[panel]);
    React.useLayoutEffect(()=>{element.current?.querySelector('.dsh-fisher-dialog-content')?.scrollTo({top:0});element.current?.focus({preventScroll:true});},[title]);
    const canClose=!busy&&!closeDisabled;
    const content=<div ref={layer} className="dsh-fisher-dialog-layer"
      onPointerDown={event=>{outsideDown.current=event.target===event.currentTarget;}}
      onPointerUp={event=>{if(outsideDown.current&&event.target===event.currentTarget&&dismissOnBackdrop&&canClose)onClose();outsideDown.current=false;}}
      onKeyDown={event=>{
        if(event.defaultPrevented)return;
        if(event.key==='Escape'){event.stopPropagation();event.preventDefault();if(canClose)onClose();}
        if(event.key==='Tab'){
          const dialog=element.current;if(!dialog)return;
          const focusable=[...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(item=>item.getClientRects().length&&!item.closest('[inert]'));
          const first=focusable[0],last=focusable.at(-1),active=document.activeElement;
          if(!first){event.preventDefault();dialog.focus();}
          else if(event.shiftKey&&(active===first||active===dialog)){event.preventDefault();last?.focus();}
          else if(!event.shiftKey&&(active===last||active===dialog)){event.preventDefault();first.focus();}
        }
      }}>
      <dialog ref={element} open tabIndex={-1} className={`dsh-fisher-dialog ${className}`} aria-labelledby={titleId}>
        <header className="dsh-fisher-dialog-header"><h3 id={titleId}>{title}</h3><button aria-label={`关闭${title}`} disabled={!canClose} onClick={onClose}>×</button></header>
        <div className="dsh-fisher-dialog-content">{children}</div>
        {error&&<div className="dsh-fisher-dialog-error" role="alert"><span>{error}</span>{onRetry&&<button disabled={busy} onClick={onRetry}>重试保存</button>}</div>}
        <footer className="dsh-fisher-dialog-footer">{hint&&<small>{hint}</small>}<button disabled={!canClose} onClick={onClose}>{closeLabel}</button></footer>
      </dialog>
    </div>;
    return <><span ref={anchor} hidden/>{panel&&renderPortal(content,panel)}</>;
  };
}
