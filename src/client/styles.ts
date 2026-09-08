export const styles = `
.dsh-fisher,.dsh-fisher-settings{font:14px/1.6 system-ui,-apple-system,"Microsoft YaHei",sans-serif;color:#243449;box-sizing:border-box}
.dsh-fisher *,.dsh-fisher-settings *{box-sizing:border-box}
.dsh-fisher button,.dsh-fisher-settings button{font:inherit;cursor:pointer;border:1px solid #cbd8d4;border-radius:10px;padding:8px 13px;color:#244951;background:#fffdf7;line-height:1.4}
.dsh-fisher button:hover,.dsh-fisher-settings button:hover{background:#e7f3ef;border-color:#91b3ad}
.dsh-fisher button:focus-visible,.dsh-fisher-settings button:focus-visible,.dsh-fisher-settings input:focus-visible{outline:3px solid #236b7a;outline-offset:3px}
.dsh-fisher-launcher{position:fixed;right:92px;bottom:20px;z-index:90}
.dsh-fisher .dsh-fisher-open{border-radius:999px;padding:11px 19px;background:#f8f5e9;box-shadow:0 4px 20px #18394126;display:flex;gap:9px;align-items:center;font-weight:600}
.dsh-fisher-panel{position:fixed;z-index:100;display:flex;flex-direction:column;overflow:hidden;background:#f7f4ec;border:1px solid #b7cac3;border-radius:22px;box-shadow:0 20px 65px #17323b38;min-width:0;min-height:0}
.dsh-fisher-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #dce2d6;gap:12px;cursor:grab;touch-action:none;user-select:none;flex-shrink:0}
.dsh-fisher-header:active{cursor:grabbing}
.dsh-fisher-brand{display:flex;align-items:center;gap:10px}
.dsh-fisher-brand strong{font-size:17px;letter-spacing:.08em}
.dsh-fisher-brand small{display:block;color:#687c7d;font-size:10px;letter-spacing:.17em;line-height:1.4}
.dsh-fisher .dsh-fisher-icon{padding:4px 9px;font-size:23px;border:0;background:transparent;border-radius:8px}
.dsh-fisher-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column}
.dsh-fisher-loading{padding:40px 26px;margin:auto;text-align:center;color:#56657a}
.dsh-fisher-resize{position:absolute;right:0;bottom:0;width:27px;height:27px;cursor:nwse-resize;touch-action:none;border:0!important;padding:0!important;background:transparent!important;z-index:2}
.dsh-fisher-resize:after{content:"";position:absolute;right:7px;bottom:7px;width:10px;height:10px;border-right:2px solid #8ba5a1;border-bottom:2px solid #8ba5a1;border-radius:0 0 3px 0}
.dsh-fisher-settings{padding:18px;max-width:620px}
.dsh-fisher-settings h3{font-size:18px;margin:0 0 5px}
.dsh-fisher-settings p{color:#617473;margin:0 0 20px}
.dsh-fisher-setting-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:14px 0}
.dsh-fisher-setting-row>span{min-width:70px;color:#5c706e}
.dsh-fisher-settings label{display:flex;align-items:center;gap:8px}
.dsh-fisher-settings input[type=number]{background:#fffdf7;border:1px solid #cbd8d4;border-radius:8px;padding:7px;width:90px;color:#243449;font:inherit}
.dsh-fisher-settings input[type=checkbox]{accent-color:#236b7a}
.dsh-fisher-game{min-height:100%;display:flex;flex-direction:column}
.dsh-fisher-scene{position:relative;flex:1;min-height:230px;background:#dceee7;overflow:hidden}
.dsh-fisher-scene canvas{display:block;width:100%;height:100%;position:absolute;inset:0}
.dsh-fisher-scene-label{position:absolute;top:22px;left:22px;pointer-events:none}
.dsh-fisher-scene-label span{display:block;font-size:10px;letter-spacing:.2em;color:#567d79;margin-bottom:5px}
.dsh-fisher-scene-label h2{font-size:23px;font-weight:500;margin:0;letter-spacing:.08em;color:#31585b}
.dsh-fisher-note{position:absolute;bottom:18px;left:18px;right:18px;border:1px solid #ffffff90;border-radius:12px;padding:10px 13px;color:#3a6464;background:#fffcf6d9;font-size:12px}
.dsh-fisher-footer{padding:19px 22px 22px;flex-shrink:0;background:#fffcf6}
.dsh-fisher-footer h3{font-size:18px;font-weight:500;margin:0 0 5px}
.dsh-fisher-footer p{font-size:13px;color:#617778;margin:0 0 17px}
.dsh-fisher-connection{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:#637b74}
.dsh-fisher-connection .dsh-fisher-dot{width:6px;height:6px;border-radius:50%;background:#478b77;display:inline-block;margin-right:6px}
.dsh-fisher-connection[data-state=error] .dsh-fisher-dot{background:#b36e58}
@media(prefers-reduced-motion:reduce){.dsh-fisher *{scroll-behavior:auto!important}}
`;
