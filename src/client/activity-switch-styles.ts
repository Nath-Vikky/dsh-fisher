export const activitySwitchStyles=`
.dsh-fisher-activity-controls{display:flex;align-items:center;gap:9px;margin:0 0 16px;padding:0;border:0}
.dsh-fisher .dsh-fisher-activity-switch{flex:1;min-width:0;display:flex;align-items:center;gap:12px;text-align:left;min-height:86px;padding:13px 14px;background:var(--fisher-raised);border:2px solid var(--fisher-edge);border-left:5px solid var(--fisher-muted);box-shadow:inset 1px 1px var(--fisher-light),2px 3px var(--fisher-shade)}
.dsh-fisher .dsh-fisher-activity-switch:hover{background:color-mix(in srgb,var(--fisher-sea) 40%,var(--fisher-raised))}
.dsh-fisher .dsh-fisher-activity-switch[aria-checked=true]{background:color-mix(in srgb,var(--fisher-sea) 64%,var(--fisher-raised));border-left-color:#397d77}
.dsh-fisher-activity-emblem{display:grid;place-items:center;width:38px;height:38px;background:var(--fisher-sea);border:1px solid var(--fisher-edge);flex-shrink:0}.dsh-fisher-activity-emblem svg{width:28px;height:28px}
.dsh-fisher-activity-switch-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:5px}.dsh-fisher-activity-switch-copy strong{font-size:18px;letter-spacing:.08em}.dsh-fisher-activity-switch-copy small{font-size:11px;line-height:1.55;color:var(--fisher-muted)}
.dsh-fisher-activity-switch-track{position:relative;width:60px;height:32px;flex-shrink:0;border:2px solid var(--fisher-edge);background:color-mix(in srgb,var(--fisher-muted) 24%,var(--fisher-paper));box-shadow:inset 1px 2px var(--fisher-shade)}
.dsh-fisher-activity-switch-track i{position:absolute;top:3px;left:3px;width:22px;height:22px;background:var(--fisher-light);border:1px solid var(--fisher-edge);box-shadow:1px 1px var(--fisher-shade);transition:transform .15s}
.dsh-fisher-activity-switch-track>span{position:absolute;right:6px;top:3px;font-size:12px;line-height:22px;color:var(--fisher-ink)}
.dsh-fisher-activity-switch[aria-checked=true] .dsh-fisher-activity-switch-track{background:#397d77;border-color:#386b67}.dsh-fisher-activity-switch[aria-checked=true] .dsh-fisher-activity-switch-track i{transform:translateX(28px)}.dsh-fisher-activity-switch[aria-checked=true] .dsh-fisher-activity-switch-track>span{left:6px;right:auto;color:#fff8de}
.dsh-fisher-activity-controls[data-compact=true] .dsh-fisher-activity-switch{min-height:64px;padding:9px 10px;gap:9px}.dsh-fisher-activity-controls[data-compact=true] .dsh-fisher-activity-emblem{display:none}
.dsh-fisher[data-reduced-motion=true] .dsh-fisher-activity-switch-track i{transition:none}
@media(prefers-reduced-motion:reduce){.dsh-fisher-activity-switch-track i{transition:none}}
@container(max-height:600px){.dsh-fisher-activity-controls{margin-bottom:10px}.dsh-fisher .dsh-fisher-activity-switch{min-height:64px;padding:9px 10px;gap:8px}.dsh-fisher-activity-emblem{width:30px;height:30px}.dsh-fisher-activity-emblem svg{width:24px;height:24px}.dsh-fisher-activity-switch-copy strong{font-size:16px}.dsh-fisher-activity-switch-copy small{font-size:10px}}
@container(max-width:380px){.dsh-fisher-activity-emblem{display:none}.dsh-fisher .dsh-fisher-activity-switch{gap:8px;padding-inline:10px}.dsh-fisher-activity-switch-copy strong{font-size:16px}}
`;
