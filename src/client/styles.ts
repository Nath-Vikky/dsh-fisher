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
.dsh-fisher button:disabled{opacity:.48;cursor:default;box-shadow:none}
.dsh-fisher-wallet{text-align:right;font-size:12px;white-space:nowrap}
.dsh-fisher-wallet b{font:600 20px/1.2 ui-monospace,monospace;margin-left:5px}
.dsh-fisher-wallet small{display:block;font-size:10px;color:var(--fisher-muted)}
.dsh-fisher-tabs{display:flex;border:1px solid var(--fisher-ink);background:var(--fisher-raised);flex-shrink:0}
.dsh-fisher-tabs button{flex:1;border:0;border-right:1px solid var(--fisher-ink);border-radius:0;box-shadow:none;padding:7px 4px;font-size:12px}
.dsh-fisher-tabs button:last-child{border-right:0}
.dsh-fisher-tabs button[aria-current=page]{background:var(--fisher-sea);box-shadow:inset 0 -3px 0 var(--fisher-ink)}
.dsh-fisher-tabs small{font:10px ui-monospace,monospace;margin-left:4px}
.dsh-fisher-play-scene{min-height:160px;flex:1 0 160px}
.dsh-fisher-play-scene .dsh-fisher-note{font-size:11px;bottom:9px;left:9px;padding:5px 8px}
.dsh-fisher-play-scene.is-fighting{min-height:130px;flex-basis:130px}
.dsh-fisher-float{position:absolute;left:62%;top:53%;width:7px;height:17px;background:#f6edcc;border:2px solid #293f46;box-shadow:0 8px 0 -2px #293f46;pointer-events:none}
.dsh-fisher-float:before{content:"";position:absolute;left:0;right:0;top:0;height:6px;background:#d47a59}
.dsh-fisher-float:after{content:"";position:absolute;width:25px;height:7px;left:-11px;top:13px;border-top:2px solid #f9f5dc;border-bottom:2px solid #f9f5dc}
.dsh-fisher-float[data-phase=bite]{transform:translateY(8px)}
.dsh-fisher-float[data-phase=bite] i:before{content:"!";position:absolute;bottom:20px;left:-6px;font:bold 22px ui-monospace,monospace;background:var(--fisher-raised);padding:0 4px;border:1px solid var(--fisher-ink)}
.dsh-fisher-play-card{position:relative;flex-shrink:0;padding:12px;background:var(--fisher-raised);border:1px solid var(--fisher-ink);box-shadow:2px 2px 0 var(--fisher-ink)}
.dsh-fisher-play-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:repeating-linear-gradient(135deg,transparent 0 4px,#293f4655 4px 5px);border-right:1px solid #293f4644}
.dsh-fisher-play-heading{display:flex;align-items:center;justify-content:space-between;gap:5px}
.dsh-fisher-play-card h3,.dsh-fisher-collection h3{margin:0;font-size:15px;font-weight:600;letter-spacing:.03em}
.dsh-fisher-play-card p,.dsh-fisher-collection p,.dsh-fisher-confirm p{font-size:11px;color:var(--fisher-muted);margin:6px 0 10px}
.dsh-fisher-play-heading small{font-size:10px;color:var(--fisher-muted)}
.dsh-fisher .dsh-fisher-primary{width:100%;padding:10px 8px;margin:5px 0 2px;background:var(--fisher-sea);font-size:14px;letter-spacing:.08em;font-weight:600}
.dsh-fisher .dsh-fisher-reel{touch-action:none;user-select:none}
.dsh-fisher .dsh-fisher-reel.is-reeling{background:var(--fisher-ink);color:var(--fisher-paper);box-shadow:inset 0 0 0 2px var(--fisher-sea)}
.dsh-fisher-toggle{display:flex;align-items:center;gap:5px;font-size:11px;margin:8px 0;color:var(--fisher-muted);flex-wrap:wrap}
.dsh-fisher-toggle input{accent-color:#39676b;width:14px;height:14px;margin:0 2px 0 0}
.dsh-fisher-toggle span{font-size:10px;opacity:.85;margin-left:auto}
.dsh-fisher-meter-row{margin:7px 0}
.dsh-fisher-meter-row>div:first-child{display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px}
.dsh-fisher-meter-row b{font:10px ui-monospace,monospace}
.dsh-fisher-meter{height:9px;border:1px solid var(--fisher-ink);background:var(--fisher-paper);position:relative;overflow:hidden}
.dsh-fisher-meter i{display:block;background:#73a697;height:100%}
.dsh-fisher-meter.is-tension i{background:#b5c68a}
.dsh-fisher-meter.is-tension:after{content:"";position:absolute;top:0;bottom:0;left:85%;width:15%;border-left:1px dashed var(--fisher-ink);background:repeating-linear-gradient(125deg,transparent 0 3px,#ca805a99 3px 4px)}
.dsh-fisher-danger{display:flex;gap:5px;font-size:10px;color:var(--fisher-muted)}
.dsh-fisher-danger span{margin-left:auto}
.dsh-fisher-danger[data-danger=true]{color:#a74428}
.dsh-fisher-quiet-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:6px}
.dsh-fisher-quiet-actions button{padding:2px 0;border:0;border-bottom:1px solid #293f4677;box-shadow:none;font-size:10px;background:transparent}
.dsh-fisher-catch-heading{text-align:center}
.dsh-fisher-catch-heading small{display:inline-block;padding:1px 7px;font-size:10px;border:1px solid var(--fisher-ink);background:var(--fisher-coral);margin-bottom:4px}
.dsh-fisher-fish-art{width:85px;height:85px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--fisher-paper);border:1px solid #293f4633}
.dsh-fisher-fish-art img{display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}
.dsh-fisher-fish-art.is-large{width:100%;height:115px;background:transparent;border:0;margin:3px auto}
.dsh-fisher-fish-art.is-large img{width:180px;height:115px;max-width:100%}
.dsh-fisher-fish-art button{font-size:10px;padding:3px}
.dsh-fisher-catch-stats{display:flex;justify-content:center;gap:15px;border-top:1px solid #293f4633;border-bottom:1px solid #293f4633;padding:5px;font:11px ui-monospace,monospace}
.dsh-fisher-play-card .dsh-fisher-flavor{text-align:center;margin:6px 0 8px}
.dsh-fisher-actions{display:flex;gap:8px}
.dsh-fisher-actions button{flex:1;font-size:11px;padding:7px 5px;white-space:nowrap}
.dsh-fisher-collection{display:flex;flex-direction:column;gap:10px;flex:1}
.dsh-fisher-collection-intro{padding:5px 3px}
.dsh-fisher-entry{display:flex;gap:10px;padding:10px;border:1px solid var(--fisher-ink);background:var(--fisher-raised);box-shadow:2px 2px 0 #293f4633;align-items:center}
.dsh-fisher-entry>div:last-child{min-width:0;flex:1}
.dsh-fisher-entry small{font-size:9px;line-height:1.5;color:var(--fisher-muted)}
.dsh-fisher-entry h3{font-size:13px}
.dsh-fisher-entry p{font-size:10px;margin:4px 0 7px}
.dsh-fisher-undiscovered{width:85px;height:85px;display:grid;place-items:center;flex-shrink:0;font:30px ui-monospace,monospace;color:#718e88;background:repeating-linear-gradient(125deg,#e6ebd6 0 7px,#829a8644 7px 8px);border:1px solid #293f4633}
.dsh-fisher-empty{margin:auto;text-align:center;padding:25px 0}
.dsh-fisher-empty>span{font:60px ui-monospace,monospace;color:#719c96}
.dsh-fisher-confirm{border:1px solid var(--fisher-ink);padding:12px;background:#f3ddbd;box-shadow:2px 2px 0 var(--fisher-ink);flex-shrink:0}
.dsh-fisher-game>.dsh-fisher-connection{flex-shrink:0;font-size:10px;min-height:25px;margin-top:auto;padding:7px 5px 2px}
.dsh-fisher-connection button{font-size:10px;white-space:nowrap;padding:5px}
@media(prefers-reduced-motion:reduce){.dsh-fisher *{scroll-behavior:auto!important}}
.dsh-fisher-harbor fieldset{margin:0;padding:10px;border:1px solid var(--fisher-ink);background:var(--fisher-raised);min-width:0;box-shadow:2px 2px 0 #293f4633}
.dsh-fisher-harbor legend{font-size:12px;letter-spacing:.06em;padding:0 7px;background:var(--fisher-paper)}
.dsh-fisher-harbor label{display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:11px}
.dsh-fisher-harbor select,.dsh-fisher-collection input{min-width:0;max-width:100%;padding:7px 5px;font:11px inherit;color:var(--fisher-ink);background:var(--fisher-paper);border:1px solid var(--fisher-ink)}
.dsh-fisher-harbor select{flex:1;font-size:11px}
.dsh-fisher-collection input{box-sizing:border-box;width:100%;margin-top:10px;font-size:12px}
.dsh-fisher-harbor details{margin-top:10px;border-top:1px solid #293f4633;padding-top:8px}
.dsh-fisher-harbor summary{font-size:11px;cursor:pointer;line-height:1.6}
.dsh-fisher-shop-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px dashed #293f4633;font-size:12px}
.dsh-fisher-shop-row>div{flex:1;min-width:0}.dsh-fisher-shop-row small{display:block;font-size:10px;color:var(--fisher-muted);line-height:1.6}
.dsh-fisher-shop-row button{flex-shrink:0;font-size:11px;padding:7px}
.dsh-fisher-art-note{font-size:11px;text-align:center;color:var(--fisher-muted);padding:4px}.dsh-fisher-art-note small{display:block;font-size:9px;margin-top:5px}
.dsh-fisher .dsh-fisher-lock{font-size:10px;padding:3px 6px;margin-bottom:7px;background:var(--fisher-paper)}
.dsh-fisher .dsh-fisher-lock[aria-pressed=true]{background:var(--fisher-coral)}
.dsh-fisher-actions button[aria-pressed=true]{background:var(--fisher-sea)}
.dsh-fisher-entry small{display:block}.dsh-fisher-catch-stats{flex-wrap:wrap;gap:5px 12px}
.dsh-fisher-overflow{font-size:10px;color:#a74428;margin:0}
.dsh-fisher-gear-art{width:58px;height:68px;object-fit:contain;image-rendering:pixelated;flex-shrink:0}
`;
