import type * as ReactTypes from 'react';

export function createDialog(React:typeof ReactTypes) {
  return function Dialog({title,children,onClose,busy=false,returnFocus}:{title:string;children:ReactTypes.ReactNode;onClose:()=>void;busy?:boolean;returnFocus?:HTMLElement|null}) {
    const element=React.useRef<HTMLDialogElement>(null),cancel=React.useRef<HTMLButtonElement>(null);
    const titleId=React.useId();
    React.useEffect(()=>{
      const dialog=element.current,previous=returnFocus??document.activeElement;
      dialog?.showModal();cancel.current?.focus();
      return ()=>{dialog?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};
    },[]);
    return <dialog ref={element} className="dsh-fisher-dialog" aria-labelledby={titleId}
      onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}
      onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
      <h3 id={titleId}>{title}</h3><div className="dsh-fisher-dialog-content">{children}</div>
      <button ref={cancel} disabled={busy} onClick={onClose}>返回</button>
    </dialog>;
  };
}
