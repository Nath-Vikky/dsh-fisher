import type * as ReactTypes from 'react';

export function createDialog(React:typeof ReactTypes) {
  return function Dialog({title,children,onClose,busy=false,returnFocus,closeLabel='返回',dismissOnBackdrop=true,closeDisabled=false,hint,className='',error,onRetry}:{title:string;children:ReactTypes.ReactNode;onClose:()=>void;busy?:boolean;returnFocus?:HTMLElement|null;closeLabel?:string;dismissOnBackdrop?:boolean;closeDisabled?:boolean;hint?:string;className?:string;error?:string|null;onRetry?:()=>void}) {
    const element=React.useRef<HTMLDialogElement>(null),outsideDown=React.useRef(false);
    const titleId=React.useId();
    React.useEffect(()=>{
      const dialog=element.current,previous=returnFocus??document.activeElement;
      dialog?.showModal();dialog?.focus({preventScroll:true});
      return ()=>{
        dialog?.close();
        if(previous instanceof HTMLElement&&previous.isConnected&&!previous.matches(':disabled')&&previous.closest('dialog')?.open!==false)previous.focus({preventScroll:true});
        if(document.activeElement===document.body||document.activeElement===dialog){const parent=[...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1);parent?.focus({preventScroll:true});}
      };
    },[]);
    React.useLayoutEffect(()=>{element.current?.querySelector('.dsh-fisher-dialog-content')?.scrollTo({top:0});if(element.current?.open)element.current.focus({preventScroll:true});},[title]);
    const canClose=!busy&&!closeDisabled;
    const outside=(event:ReactTypes.PointerEvent<HTMLDialogElement>)=>{const box=event.currentTarget.getBoundingClientRect();return event.target===event.currentTarget&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom);};
    return <dialog ref={element} tabIndex={-1} className={`dsh-fisher-dialog ${className}`} aria-labelledby={titleId}
      onPointerDown={event=>{outsideDown.current=outside(event);}}
      onPointerUp={event=>{if(outsideDown.current&&outside(event)&&dismissOnBackdrop&&canClose)onClose();outsideDown.current=false;}}
      onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}
      onCancel={event=>{event.preventDefault();if(canClose)onClose();}}>
      <header className="dsh-fisher-dialog-header"><h3 id={titleId}>{title}</h3><button aria-label={`关闭${title}`} disabled={!canClose} onClick={onClose}>×</button></header>
      <div className="dsh-fisher-dialog-content">{children}</div>
      {error&&<div className="dsh-fisher-dialog-error" role="alert"><span>{error}</span>{onRetry&&<button disabled={busy} onClick={onRetry}>重试保存</button>}</div>}
      <footer className="dsh-fisher-dialog-footer">{hint&&<small>{hint}</small>}<button disabled={!canClose} onClick={onClose}>{closeLabel}</button></footer>
    </dialog>;
  };
}
