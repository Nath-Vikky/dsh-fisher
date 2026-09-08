export const styles = `
.dsh-fisher,.dsh-fisher-settings{--fisher-paper:#f4efdb;--fisher-raised:#fcf8e9;--fisher-ink:#293f46;--fisher-muted:#536d70;--fisher-sea:#afd3c6;--fisher-coral:#e6b296;font:14px/1.6 system-ui,-apple-system,"Microsoft YaHei",sans-serif;color:var(--fisher-ink);box-sizing:border-box}
.dsh-fisher *,.dsh-fisher-settings *{box-sizing:border-box;font-family:inherit}
.dsh-fisher button,.dsh-fisher-settings button{font:inherit;cursor:pointer;border:1px solid var(--fisher-ink);border-radius:2px;padding:8px 13px;color:var(--fisher-ink);background:var(--fisher-raised);line-height:1.4;box-shadow:2px 2px 0 var(--fisher-paper),3px 3px 0 var(--fisher-ink)}
.dsh-fisher button:hover,.dsh-fisher-settings button:hover{background:var(--fisher-sea)}
.dsh-fisher button:active,.dsh-fisher-settings button:active{box-shadow:1px 1px 0 var(--fisher-ink)}
.dsh-fisher button:focus-visible,.dsh-fisher-settings button:focus-visible,.dsh-fisher-settings input:focus-visible{outline:2px solid #236b7a;outline-offset:4px}
.dsh-fisher-launcher{position:fixed;right:92px;bottom:20px;z-index:90}
.dsh-fisher .dsh-fisher-open{border-radius:3px;padding:11px 16px;background:var(--fisher-paper);display:flex;gap:10px;align-items:center;font-weight:600;box-shadow:3px 3px 0 var(--fisher-paper),4px 4px 0 var(--fisher-ink)}
.dsh-fisher-mark{display:block;width:23px;height:23px;flex-shrink:0;shape-rendering:crispEdges}
.dsh-fisher-panel{position:fixed;z-index:100;display:flex;flex-direction:column;overflow:hidden;background:var(--fisher-paper);border:1px solid var(--fisher-ink);border-radius:4px 4px 2px 2px;box-shadow:4px 4px 0 var(--fisher-paper),5px 5px 0 var(--fisher-ink);min-width:0;min-height:0}
.dsh-fisher-header{position:relative;display:flex;align-items:center;justify-content:space-between;padding:11px 15px 15px;border-bottom:1px solid var(--fisher-ink);gap:12px;cursor:grab;touch-action:none;user-select:none;flex-shrink:0}
.dsh-fisher-header:after{content:"";position:absolute;bottom:3px;left:0;right:0;height:3px;background:repeating-linear-gradient(125deg,transparent 0 5px,#293f4666 5px 6px);pointer-events:none}
.dsh-fisher-header:active{cursor:grabbing}
.dsh-fisher-brand{display:flex;align-items:center;gap:12px}
.dsh-fisher-brand>.dsh-fisher-mark{width:31px;height:31px;border:1px solid var(--fisher-ink);padding:4px;background:var(--fisher-sea);box-shadow:2px 2px 0 var(--fisher-paper),3px 3px 0 var(--fisher-ink)}
.dsh-fisher-brand strong{font-size:18px;letter-spacing:.08em;font-weight:650}
.dsh-fisher-brand small{display:block;color:var(--fisher-muted);font:9px/1.5 ui-monospace,monospace;letter-spacing:.15em}
.dsh-fisher .dsh-fisher-icon{width:32px;height:32px;padding:0;font-size:23px;line-height:1;border:1px solid var(--fisher-ink);background:var(--fisher-raised);border-radius:1px;box-shadow:none}
.dsh-fisher-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;scrollbar-color:#809fae var(--fisher-paper);scrollbar-width:thin}
.dsh-fisher-loading{padding:32px 24px;margin:auto;text-align:center;color:var(--fisher-muted)}
.dsh-fisher .dsh-fisher-resize{position:absolute;right:0;bottom:0;width:27px;height:27px;cursor:nwse-resize;touch-action:none;border:0;padding:0;background:transparent;box-shadow:none;z-index:2}
.dsh-fisher-resize:after{content:"";position:absolute;right:5px;bottom:5px;width:12px;height:12px;background:repeating-linear-gradient(135deg,transparent 0 3px,var(--fisher-ink) 3px 4px);clip-path:polygon(100% 0,100% 100%,0 100%)}
.dsh-fisher-settings{padding:20px;max-width:620px;background:var(--fisher-paper);border:1px solid var(--fisher-ink);box-shadow:3px 3px 0 var(--fisher-paper),4px 4px 0 var(--fisher-ink)}
.dsh-fisher-settings h3{font-size:18px;margin:0 0 6px;letter-spacing:.05em}
.dsh-fisher-settings p{color:var(--fisher-muted);margin:0 0 20px}
.dsh-fisher-setting-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:18px 0}
.dsh-fisher-setting-row>span{min-width:70px;color:var(--fisher-muted)}
.dsh-fisher-settings label{display:flex;align-items:center;gap:8px}
.dsh-fisher-settings input[type=number]{background:var(--fisher-raised);border:1px solid var(--fisher-ink);border-radius:1px;padding:7px;width:90px;color:var(--fisher-ink);font:inherit}
.dsh-fisher-settings input[type=checkbox]{accent-color:#39676b;width:16px;height:16px}
.dsh-fisher-game{min-height:100%;display:flex;flex-direction:column;padding:12px;gap:11px}
.dsh-fisher-location{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0;padding:0 3px}
.dsh-fisher-location h2{font-size:18px;line-height:1.35;margin:0;font-weight:600;letter-spacing:.12em}
.dsh-fisher-location small{display:block;font-size:10px;letter-spacing:.12em;color:var(--fisher-muted)}
.dsh-fisher-tide{display:flex;align-items:center;gap:7px;padding:4px 9px;border:1px solid var(--fisher-ink);background:var(--fisher-sea);font-size:12px;white-space:nowrap}
.dsh-fisher-tide i{display:block;width:12px;height:9px;border-top:1px solid var(--fisher-ink);border-bottom:1px solid var(--fisher-ink);position:relative}
.dsh-fisher-tide i:after{content:"";position:absolute;top:3px;left:3px;width:9px;border-top:1px solid var(--fisher-ink)}
.dsh-fisher-scene{position:relative;flex:1;min-height:220px;border:1px solid var(--fisher-ink);background:var(--fisher-sea);overflow:hidden}
.dsh-fisher-scene canvas{display:block;width:100%;height:100%;position:absolute;inset:0;image-rendering:pixelated}
.dsh-fisher-scene-label{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;pointer-events:none}
.dsh-fisher-scene-label span{display:block;border:1px solid var(--fisher-ink);padding:5px 8px;background:var(--fisher-raised);font-size:11px;letter-spacing:.08em;box-shadow:2px 2px 0 #293f4640}
.dsh-fisher-scene-label b{display:block;padding:2px 4px;font:10px/1.5 ui-monospace,monospace;letter-spacing:.08em;background:var(--fisher-paper);border-bottom:1px solid var(--fisher-ink);font-weight:400}
.dsh-fisher-scene-loading{position:absolute;inset:0;display:grid;place-content:center;gap:12px;padding:22px;text-align:center;background:var(--fisher-paper);color:var(--fisher-muted);font-size:13px}
.dsh-fisher-note{position:absolute;bottom:12px;left:12px;max-width:calc(100% - 24px);border:1px solid var(--fisher-ink);padding:7px 10px;color:var(--fisher-ink);background:var(--fisher-raised);font-size:12px;box-shadow:2px 2px 0 var(--fisher-ink)}
.dsh-fisher-footer{position:relative;padding:14px 14px 12px;flex-shrink:0;background:var(--fisher-raised);border:1px solid var(--fisher-ink)}
.dsh-fisher-footer:before{content:"";position:absolute;top:0;left:0;bottom:0;width:5px;border-right:1px solid var(--fisher-ink);background:repeating-linear-gradient(135deg,var(--fisher-paper) 0 4px,#809fae99 4px 5px)}
.dsh-fisher-footer h3{font-size:16px;font-weight:550;letter-spacing:.04em;margin:0 0 4px;padding-left:3px}
.dsh-fisher-footer p{font-size:12px;color:var(--fisher-muted);margin:0 0 12px;padding-left:3px}
.dsh-fisher-connection{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid #293f464d;font-size:11px;color:var(--fisher-muted)}
.dsh-fisher-connection .dsh-fisher-dot{width:6px;height:6px;border:1px solid var(--fisher-ink);background:#659b83;display:inline-block;margin-right:6px}
.dsh-fisher-connection[data-state=error] .dsh-fisher-dot{background:#ce8b72}
.dsh-fisher-preview-label{border:1px solid #809fae;padding:1px 5px;letter-spacing:.07em;white-space:nowrap}
@media(prefers-reduced-motion:reduce){.dsh-fisher *{scroll-behavior:auto!important}}
`;
