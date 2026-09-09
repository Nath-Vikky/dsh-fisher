import type * as ReactTypes from 'react';

export function createHelp(React:typeof ReactTypes) {
  return function Help({label,children}:{label:string;children:ReactTypes.ReactNode}) {
    const [open,setOpen]=React.useState(false),button=React.useRef<HTMLButtonElement>(null),tip=React.useRef<HTMLDivElement>(null);
    const timer=React.useRef<ReturnType<typeof setTimeout>>(),id=React.useId();
    const enter=()=>{clearTimeout(timer.current);setOpen(true);};
    const leave=()=>{clearTimeout(timer.current);timer.current=setTimeout(()=>setOpen(false),160);};
    React.useEffect(()=>()=>clearTimeout(timer.current),[]);
    React.useLayoutEffect(()=>{
      const element=tip.current,anchor=button.current;if(!element||!anchor)return;
      element.setAttribute('popover','manual');
      if(!open)return;
      element.showPopover();
      const panel=anchor.closest<HTMLElement>('.dsh-fisher-panel');
      const position=()=>{
        const bounds=panel?.getBoundingClientRect()??{left:0,top:0,right:window.innerWidth,bottom:window.innerHeight,width:window.innerWidth,height:window.innerHeight};
        element.style.width=`${Math.max(1,Math.min(320,bounds.width-24))}px`;element.style.maxHeight=`${Math.max(1,bounds.height-24)}px`;
        const box=anchor.getBoundingClientRect(),height=element.offsetHeight,width=element.offsetWidth;
        element.style.left=`${Math.max(bounds.left+12,Math.min(bounds.right-width-12,box.right-width))}px`;
        element.style.top=`${Math.max(bounds.top+12,Math.min(bounds.bottom-height-12,box.bottom+height+12<bounds.bottom?box.bottom+8:box.top-height-8))}px`;
      };
      position();const dismiss=(event:PointerEvent)=>{if(event.target instanceof Node&&!element.contains(event.target)&&!anchor.contains(event.target))setOpen(false);};
      const observer=new MutationObserver(position);if(panel)observer.observe(panel,{attributes:true,attributeFilter:['style']});
      window.addEventListener('resize',position);document.addEventListener('scroll',position,true);document.addEventListener('pointerdown',dismiss);
      return ()=>{observer.disconnect();element.hidePopover();window.removeEventListener('resize',position);document.removeEventListener('scroll',position,true);document.removeEventListener('pointerdown',dismiss);};
    },[open]);
    return <span className="dsh-fisher-help" onKeyDown={event=>{if(event.key==='Escape'&&open){event.stopPropagation();event.preventDefault();setOpen(false);}}}>
      <button ref={button} type="button" className="dsh-fisher-help-button" aria-label={label} aria-describedby={open?id:undefined} aria-expanded={open}
        onMouseEnter={enter} onMouseLeave={leave} onFocus={enter} onBlur={leave} onClick={()=>{clearTimeout(timer.current);setOpen(true);}}>!</button>
      <div ref={tip} id={id} role="tooltip" className="dsh-fisher-help-tip" onMouseEnter={enter} onMouseLeave={leave}><strong>{label}</strong>{children}</div>
    </span>;
  };
}

export function createPager(React:typeof ReactTypes) {
  return function Pager({page,count,onChange}:{page:number;count:number;onChange:(page:number)=>void}) {
    if(count<=1)return null;
    return <nav className="dsh-fisher-pagination" aria-label="列表分页"><button disabled={page<=0} onClick={()=>onChange(page-1)}>上一页</button><span>{page+1} / {count}</span><button disabled={page>=count-1} onClick={()=>onChange(page+1)}>下一页</button></nav>;
  };
}
