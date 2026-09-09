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
.dsh-fisher-game{min-height:100%;flex-shrink:0;display:flex;flex-direction:column;padding:12px;gap:11px}
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
.dsh-fisher-tabs{position:sticky;top:0;z-index:3;display:flex;border:1px solid var(--fisher-ink);background:var(--fisher-raised);flex-shrink:0}
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
.dsh-fisher-harbor label.dsh-fisher-toggle{display:flex;align-items:center;gap:7px}
.dsh-fisher-collection input[type=checkbox]{width:14px;height:14px;flex-shrink:0;margin:0}
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
.dsh-fisher-subtabs{display:flex;gap:6px;flex-wrap:wrap}.dsh-fisher-subtabs button{flex:1;padding:7px 4px;font-size:12px}
.dsh-fisher-subtabs button[aria-pressed=true]{background:var(--fisher-sea)}
.dsh-fisher-paper-card{padding:12px;border:1px solid var(--fisher-ink);background:var(--fisher-raised);box-shadow:2px 2px 0 #293f4633}
.dsh-fisher-paper-card h4{font-size:12px;margin:8px 0 4px}.dsh-fisher-paper-card p{margin:7px 0;font-size:12px;line-height:1.8}
.dsh-fisher-paper-card>small{display:block;margin:5px 0 9px;color:var(--fisher-muted);font-size:10px}
.dsh-fisher-card-heading{display:flex;align-items:center;gap:8px;justify-content:space-between}.dsh-fisher-card-heading small{font-size:10px;white-space:nowrap;color:var(--fisher-muted)}
.dsh-fisher-life fieldset{min-width:0;margin:0;padding:12px;border:1px solid var(--fisher-ink);background:var(--fisher-raised)}
.dsh-fisher-life legend{font-size:12px;padding:0 6px}.dsh-fisher-life p{font-size:12px}.dsh-fisher-life details{margin:8px 0}.dsh-fisher-life summary{cursor:pointer;font-size:12px;padding:5px 0}
.dsh-fisher-life select{max-width:100%;min-width:0;padding:6px;border:1px solid var(--fisher-ink);color:var(--fisher-ink);background:var(--fisher-paper);font-size:11px}
.dsh-fisher-check-row{display:flex;align-items:flex-start;gap:7px;margin:8px 0;font-size:11px;line-height:1.7;cursor:pointer}
.dsh-fisher .dsh-fisher-check-row input{width:15px;height:15px;flex:0 0 15px;margin:3px 0 0;accent-color:#39676b}.dsh-fisher-check-row small{display:block;color:var(--fisher-muted);font-size:10px}
.dsh-fisher .dsh-fisher-delivery{margin:10px 0;padding:8px}.dsh-fisher-delivery .dsh-fisher-check-row{border-bottom:1px dashed #293f4633;padding-bottom:7px}
.dsh-fisher-goal-progress{font-variant-numeric:tabular-nums;color:#39676b}.dsh-fisher-inline-confirm{border-top:1px dashed var(--fisher-ink);margin-top:12px;padding-top:3px}
.dsh-fisher-guest-heading{display:flex;gap:12px;align-items:center}.dsh-fisher-guest-heading small{font-size:10px;color:var(--fisher-muted)}
.dsh-fisher-dialogue{padding:8px 10px;border-left:2px solid #6c998c;background:var(--fisher-paper)}
.dsh-fisher-guest-request{border-top:1px dashed #293f4666;margin-top:12px;padding-top:5px}.dsh-fisher-guest-request select{display:block;margin-top:6px;width:100%}
.dsh-fisher-story{border-top:1px solid #293f4633}.dsh-fisher-story p{line-height:2}
.dsh-fisher-select-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:10px 0;font-size:11px}.dsh-fisher-select-row select{flex:1;max-width:72%}
.dsh-fisher-display-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dsh-fisher-display-slot{min-width:0;border:1px solid #293f4633;padding:7px;background:var(--fisher-paper)}
.dsh-fisher-display-slot .dsh-fisher-fish-art{margin:0 auto 5px;max-width:100%}.dsh-fisher-display-slot label{display:block;font-size:10px}.dsh-fisher-display-slot select{display:block;width:100%;margin-top:4px}
.dsh-fisher-vacant{height:85px;display:grid;place-items:center;font-size:30px;color:#7f9e93}
.dsh-fisher-visitor{border:1px solid var(--fisher-ink);padding:10px 12px;background:var(--fisher-raised);font-size:11px}.dsh-fisher-visitor p{margin:5px 0}.dsh-fisher-visitor button{padding:4px 7px;font-size:10px}
.dsh-fisher-harbor label.dsh-fisher-toggle{justify-content:flex-start}
.dsh-fisher-harbor label.dsh-fisher-check-row{justify-content:flex-start;align-items:flex-start}
.dsh-fisher-card-download{margin:7px 0}.dsh-fisher-card-download button{font-size:11px;padding:5px 8px}.dsh-fisher-card-download small{display:block;font-size:10px;margin-top:4px;color:var(--fisher-muted)}
.dsh-fisher-catalog-filters{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px;margin:10px 0}.dsh-fisher-catalog-filters label{font-size:11px}.dsh-fisher-catalog-filters select{display:block;width:100%;margin-top:4px}
.dsh-fisher-catalog-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dsh-fisher-catalog-item{min-width:0;border:1px solid var(--fisher-ink);background:var(--fisher-raised)}.dsh-fisher-catalog-item.is-open{grid-column:1/-1}
.dsh-fisher .dsh-fisher-catalog-open{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;min-height:166px;background:transparent;border:0;box-shadow:none;padding:9px;white-space:normal}.dsh-fisher-catalog-open b{font-size:14px;font-weight:550}.dsh-fisher-catalog-open small{font-size:10px;color:var(--fisher-muted)}.dsh-fisher-catalog-detail{border-top:1px solid var(--fisher-ink);padding:10px;font-size:12px}.dsh-fisher-catalog-detail .dsh-fisher-fish-art{margin:auto}
.dsh-fisher-showcase{margin:0;border:1px solid var(--fisher-ink);background:var(--fisher-paper)}
.dsh-fisher-showcase canvas{display:block;width:100%;height:340px;image-rendering:pixelated}.dsh-fisher-showcase figcaption{padding:8px 10px;font-size:11px;color:var(--fisher-muted);line-height:1.7;border-top:1px solid var(--fisher-ink)}
.dsh-fisher-portrait img{display:block;max-height:420px;width:100%;object-fit:contain;image-rendering:pixelated;background:var(--fisher-paper)}
.dsh-fisher-catalog-thumbnail,.dsh-fisher-guest-thumbnail{width:96px;height:85px;object-fit:contain;image-rendering:pixelated;flex-shrink:0}
.dsh-fisher-float img{position:absolute;width:40px;height:56px;object-fit:contain;image-rendering:pixelated;left:-12px;bottom:0}
.dsh-fisher-float[data-glow=true] img{filter:drop-shadow(0 0 4px #bdffeb)}
.dsh-fisher-record-flag{position:absolute;top:46%;left:62%;background:#ebbd66;color:#263643;padding:4px 8px;border:1px solid #263643;font-size:12px;box-shadow:-3px 3px 0 #263643}
.dsh-fisher[data-theme=dark],.dsh-fisher-settings[data-theme=dark]{--fisher-paper:#172636;--fisher-raised:#22384b;--fisher-ink:#edf3f8;--fisher-muted:#b4c7cf;--fisher-sea:#34566b;--fisher-coral:#c7907b}
@media(prefers-color-scheme:dark){.dsh-fisher[data-theme=system],.dsh-fisher-settings[data-theme=system]{--fisher-paper:#172636;--fisher-raised:#22384b;--fisher-ink:#edf3f8;--fisher-muted:#b4c7cf;--fisher-sea:#34566b;--fisher-coral:#c7907b}}
.dsh-fisher-panel,.dsh-fisher-settings{font-size:var(--fisher-font,14px)}
.dsh-fisher-game p,.dsh-fisher-game label,.dsh-fisher-game input,.dsh-fisher-game select,.dsh-fisher-play-card button,.dsh-fisher-dialog button,.dsh-fisher-paper-card button{font-size:var(--fisher-font,14px)}
.dsh-fisher-game small,.dsh-fisher-dialog small,.dsh-fisher-connection,.dsh-fisher-showcase figcaption,.dsh-fisher-catalog-filters label{font-size:max(12px,calc(var(--fisher-font,14px)*.86));line-height:1.6}
.dsh-fisher-tabs button,.dsh-fisher-subtabs button{min-height:44px;font-size:max(12px,calc(var(--fisher-font,14px)*.86));white-space:normal}.dsh-fisher-tabs small{display:block;margin:0;font-size:10px}
.dsh-fisher-header-actions{display:flex;gap:8px;align-items:center}.dsh-fisher .dsh-fisher-icon{width:36px;height:36px}.dsh-fisher .dsh-fisher-header-settings{padding:6px 8px;min-height:36px;font-size:13px;box-shadow:none}
.dsh-fisher-body>.dsh-fisher-settings{margin:10px;max-width:none;flex-shrink:0;padding:14px}.dsh-fisher-settings select{font:inherit;max-width:100%;padding:6px;background:var(--fisher-raised);color:var(--fisher-ink);border:1px solid var(--fisher-ink)}
.dsh-fisher-settings input[type=range]{width:100px}.dsh-fisher-settings button{min-height:40px}.dsh-fisher-settings label{flex-wrap:wrap}
.dsh-fisher[data-reduced-motion=true] *{animation:none!important;transition:none!important}.dsh-fisher-game button:focus-visible,.dsh-fisher-game select:focus-visible,.dsh-fisher-game input:focus-visible{outline:2px solid var(--fisher-ink);outline-offset:3px}
.dsh-fisher-goal-progress{color:var(--fisher-ink)}.dsh-fisher-location{flex-wrap:wrap}.dsh-fisher-catalog-detail .dsh-fisher-actions button{white-space:normal}
.dsh-fisher-dialog{color:var(--fisher-ink);background:var(--fisher-paper);border:1px solid var(--fisher-ink);padding:0;width:min(480px,calc(100vw - 24px));max-height:min(720px,calc(100dvh - 32px));overflow:hidden;box-shadow:4px 4px 0 var(--fisher-ink);font:inherit;overscroll-behavior:contain}.dsh-fisher-dialog[open]{display:flex;flex-direction:column}.dsh-fisher-dialog::backdrop{background:#17263688}.dsh-fisher-dialog h3{margin:0;font-size:17px;line-height:1.5}.dsh-fisher-dialog-content{padding:16px;overflow:auto;min-height:0;overscroll-behavior:contain}.dsh-fisher-dialog .dsh-fisher-actions{margin:12px 0}
.dsh-fisher-dialog-header{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--fisher-ink);flex-shrink:0;background:var(--fisher-raised)}.dsh-fisher-dialog-header button{flex-shrink:0;width:32px;height:32px;padding:0;font-size:22px;box-shadow:none}.dsh-fisher-dialog-footer{display:flex;justify-content:flex-end;gap:14px;align-items:center;padding:12px 16px;border-top:1px solid var(--fisher-ink);flex-shrink:0;background:var(--fisher-raised)}.dsh-fisher-dialog-footer small{margin-right:auto;color:var(--fisher-muted);line-height:1.6}.dsh-fisher-dialog-footer button{flex-shrink:0;min-width:88px}.dsh-fisher-dialog-error{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 16px;font-size:12px;background:var(--fisher-coral);color:#293f46}.dsh-fisher-dialog-error button{flex-shrink:0}
.dsh-fisher-harbor-scene{height:116px;min-height:116px;flex:0 0 116px}
.dsh-fisher-file-input{display:block;margin:15px 0}.dsh-fisher-file-input input{display:block;margin-top:8px;width:100%;font-size:12px}.dsh-fisher-storage .dsh-fisher-dialog input[type=text],.dsh-fisher-storage .dsh-fisher-dialog input:not([type]){display:block;width:100%;margin:8px 0 15px}
.dsh-fisher-menu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.dsh-fisher-menu-grid>button{min-width:0;white-space:normal}.dsh-fisher .dsh-fisher-menu-button{position:relative;display:flex;flex-direction:column;gap:8px;align-items:flex-start;text-align:left;padding:12px;min-height:76px}.dsh-fisher-menu-button strong{font-size:14px;line-height:1.5;font-weight:550}.dsh-fisher-menu-button>small{font-size:11px;color:var(--fisher-muted);padding-right:10px}.dsh-fisher-menu-button>span{position:absolute;right:8px;top:8px;font:13px ui-monospace,monospace}
.dsh-fisher-guests-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;border-block:1px solid var(--fisher-ink);padding:6px 0;background:var(--fisher-raised)}.dsh-fisher-guests-strip button{padding:3px;border:0;box-shadow:none;background:transparent;min-width:0}.dsh-fisher-guests-strip img{display:block;width:100%;height:64px;object-fit:contain;image-rendering:pixelated}.dsh-fisher-guests-strip small{font-size:12px}
.dsh-fisher-compact-list{display:grid;gap:10px;margin-top:12px}.dsh-fisher-list-button{display:flex;flex-direction:column;gap:8px;text-align:left;position:relative;min-width:0}.dsh-fisher-list-button>strong{padding-right:50px;font-size:14px}.dsh-fisher-list-button>small{line-height:1.7;color:var(--fisher-muted)}.dsh-fisher-list-button>span{position:absolute;right:10px;top:10px;font-size:11px}.dsh-fisher-achievement-button,.dsh-fisher-guest-button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:74px}.dsh-fisher-achievement-button strong,.dsh-fisher-guest-button strong{font-size:14px}.dsh-fisher-guest-button{min-height:132px}.dsh-fisher-detail-window .dsh-fisher-subtabs{margin:10px 0 14px}.dsh-fisher-detail-window .dsh-fisher-menu-grid{margin-top:12px}.dsh-fisher-detail-window .dsh-fisher-showcase{margin:12px 0}.dsh-fisher-detail-window .dsh-fisher-paper-card{box-shadow:none;border:0;padding:0}.dsh-fisher-portrait>button{width:100%;min-height:100px;margin:16px 0;background:repeating-linear-gradient(125deg,var(--fisher-raised) 0 8px,var(--fisher-paper) 8px 9px)}
.dsh-fisher-pagination{display:flex;align-items:center;justify-content:center;gap:20px;padding-top:10px;margin-top:auto;flex-shrink:0}.dsh-fisher-pagination button{padding:7px 12px;font-size:12px}.dsh-fisher-pagination span{font:12px ui-monospace,monospace;color:var(--fisher-muted)}
.dsh-fisher-help{display:inline-flex;flex:0 0 auto;vertical-align:middle}.dsh-fisher .dsh-fisher-help-button{display:grid;place-content:center;width:24px;height:24px;min-width:24px;padding:0;border:1px solid var(--fisher-ink);border-radius:50%;font:bold 14px/1 ui-monospace,monospace;background:var(--fisher-raised);box-shadow:none}.dsh-fisher-help-tip{position:fixed;inset:auto;margin:0;padding:12px 14px;width:min(320px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;color:var(--fisher-ink);background:var(--fisher-raised);border:1px solid var(--fisher-ink);box-shadow:3px 3px 0 var(--fisher-ink);font-size:12px;line-height:1.8}.dsh-fisher-help-tip strong{font-size:13px}.dsh-fisher-game .dsh-fisher-help-tip p{font-size:12px;margin:8px 0;line-height:1.8}.dsh-fisher-help-tip p:last-child{margin-bottom:0}
.dsh-fisher-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.dsh-fisher-stat-grid>div{padding:12px;border:1px solid var(--fisher-ink);text-align:center;background:var(--fisher-raised)}.dsh-fisher-stat-grid strong{display:block;font:26px ui-monospace,monospace}.dsh-fisher-stat-grid span{font-size:12px;color:var(--fisher-muted)}.dsh-fisher-stat-grid small{font-size:12px}.dsh-fisher-item-preview{display:flex;align-items:center;gap:12px;margin:14px 0}.dsh-fisher-item-preview img{height:100px;width:80px}.dsh-fisher-item-preview p{margin:0}
.dsh-fisher-search-row{display:flex;gap:8px;margin-top:10px}.dsh-fisher .dsh-fisher-search-row input{margin:0;min-width:0;flex:1;width:0}.dsh-fisher-search-row button{flex-shrink:0;font-size:12px}.dsh-fisher-catalog .dsh-fisher-card-heading{margin-bottom:8px}.dsh-fisher .dsh-fisher-catalog-open{min-height:116px;padding:8px;gap:4px}.dsh-fisher-catalog-open .dsh-fisher-catalog-thumbnail,.dsh-fisher-catalog-open .dsh-fisher-undiscovered{width:64px;height:56px}.dsh-fisher-catalog-open small{font-size:10px;line-height:1.3}.dsh-fisher-catalog-open b{font-size:13px}.dsh-fisher-catalog-detail{border:0;padding:0}.dsh-fisher .dsh-fisher-inventory-item{display:flex;flex-direction:column;align-items:center;gap:4px;min-height:122px;min-width:0;padding:9px}.dsh-fisher-inventory-item .dsh-fisher-fish-art{width:70px;height:62px;border:0;background:transparent}.dsh-fisher-inventory-item strong{font-size:13px}.dsh-fisher-inventory-item small{font-size:11px;line-height:1.4}
.dsh-fisher-catch-dialog .dsh-fisher-fish-art.is-large{height:170px}.dsh-fisher-catch-dialog .dsh-fisher-fish-art.is-large img{height:170px;width:240px}.dsh-fisher-catch-dialog .dsh-fisher-flavor{text-align:center;line-height:1.8}.dsh-fisher-catch-dialog .dsh-fisher-card-download{text-align:center}.dsh-fisher-reward-items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.dsh-fisher-reward-item{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;border:1px solid var(--fisher-ink);padding:12px;background:var(--fisher-raised)}.dsh-fisher-reward-item:only-child{grid-column:1/-1}.dsh-fisher-reward-item img{width:100%;height:110px;object-fit:contain;image-rendering:pixelated}.dsh-fisher-reward-item strong{font-size:15px}.dsh-fisher-reward-mark{display:grid;place-content:center;height:80px;color:var(--fisher-muted);font:42px ui-monospace,monospace}
`;
