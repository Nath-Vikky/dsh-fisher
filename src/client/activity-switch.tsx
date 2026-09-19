import type * as ReactTypes from 'react';
import {createCoastIcon} from './coast-icons.tsx';
import type {CoastIconName} from './coast-icons.tsx';

export function createActivitySwitch(React:typeof ReactTypes){
  const Icon=createCoastIcon(React);
  return function ActivitySwitch({title,description,icon,enabled,disabled,compact=false,onChange,children}:{title:string;description:string;icon:CoastIconName;enabled:boolean;disabled:boolean;compact?:boolean;onChange:(enabled:boolean)=>void;children:ReactTypes.ReactNode}){
    return <div className="dsh-fisher-activity-controls" data-compact={compact}>
      <button type="button" className="dsh-fisher-activity-switch" role="switch" aria-label={title} aria-checked={enabled} disabled={disabled} onClick={()=>onChange(!enabled)}>
        <span className="dsh-fisher-activity-emblem"><Icon name={icon}/></span>
        <span className="dsh-fisher-activity-switch-copy"><strong>{title}</strong><small>{description}</small></span>
        <span className="dsh-fisher-activity-switch-track" aria-hidden="true"><span>{enabled?'开':'关'}</span><i/></span>
      </button>{children}
    </div>;
  };
}
