import type * as ReactTypes from 'react';
import { API } from '../protocol.ts';
import type { GuestDefinition } from '../game/guests.ts';
import { guestPicture, WORLD_PLAYER_ART } from '../game/visuals.ts';
import type { Outfit } from '../game/visuals.ts';
import { createDialog } from './dialog.tsx';

export function createConversation(React:typeof ReactTypes) {
  const Dialog=createDialog(React);
  return function Conversation({definition,outfit,opening,onClose,onJournal}:{definition:GuestDefinition;outfit:Outfit;opening?:string;onClose:()=>void;onJournal?:()=>void}) {
    const [turn,setTurn]=React.useState(0),[speaking,setSpeaking]=React.useState<'guest'|'player'>('guest');
    const playerLines=['再陪我聊一会儿吧。','嗯，我在听。','坐在这里，慢慢说就好。'];
    const line=speaking==='player'?playerLines[turn%playerLines.length]:turn===0&&opening?opening:definition.lines[2+turn%4];
    const name=speaking==='player'?'我':definition.name;
    return <Dialog title={`与${definition.name}交谈`} className="dsh-fisher-conversation" layerClassName="dsh-fisher-conversation-layer" showFooter={false} onClose={onClose}>
      <div className="dsh-fisher-talk-portraits" aria-label="交谈人物" data-speaker={speaking}>
        <div className="dsh-fisher-talk-bust is-player" data-active={speaking==='player'}><img src={`${API}/assets/${WORLD_PLAYER_ART.idle}`} alt="主角的半身立绘" decoding="async" draggable={false}/></div>
        <div className="dsh-fisher-talk-bust is-guest" data-guest={definition.id} data-active={speaking==='guest'}><img src={`${API}/assets/${guestPicture(definition.id,outfit,'portrait')}`} alt={`${definition.name}的半身立绘`} decoding="async" draggable={false}/></div>
      </div>
      <section className="dsh-fisher-talk-paper" data-speaker={speaking} aria-label="当前对话">
        <div className="dsh-fisher-speaker-name"><span aria-hidden="true">✦</span>{name}<span aria-hidden="true">✦</span></div>
        <div className="dsh-fisher-talk-line" role="status" aria-live="polite" aria-atomic="true"><span className="dsh-fisher-sr-only">{name}：</span><p>{line}</p></div>
        <div className="dsh-fisher-talk-choices">
          {speaking==='player'?<button className="dsh-fisher-talk-next" onClick={()=>{setTurn(value=>value+1);setSpeaking('guest');}}>继续 <span aria-hidden="true">▸</span></button>:<button className="dsh-fisher-talk-next" onClick={()=>setSpeaking('player')}>再聊一句 <span aria-hidden="true">▸</span></button>}
        </div>
        <div className="dsh-fisher-talk-links">{onJournal&&<button onClick={onJournal}>翻开来客手记</button>}<button onClick={onClose}>结束交谈</button></div>
      </section>
    </Dialog>;
  };
}
