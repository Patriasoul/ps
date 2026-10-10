(() => {
  "use strict";
  const script = document.currentScript;
  if (!script || /patria-ai-puter-test\.html$/i.test(location.pathname)) return;
  if (document.getElementById("ps-ai-widget")) return;
  const base = new URL("../../", script.src);
  const logo = new URL("assets/images/patriasoul-logo.jpg", base).href;
  const chatUrl = new URL("stranice/patria-ai-puter-test.html?embed=1", base).href;
  const style = document.createElement("style");
  style.textContent = "\n#ps-ai-widget{position:fixed;right:22px;bottom:22px;z-index:2147483000;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;color:#f6f7f9}\n#ps-ai-widget *{box-sizing:border-box}\n#ps-ai-widget .ps-ai-launch{display:flex;align-items:center;gap:10px;border:1px solid #d6a63d;border-radius:999px;padding:7px 15px 7px 7px;background:linear-gradient(135deg,#161b24,#080a0e);color:#fff;box-shadow:0 8px 28px #0005;cursor:pointer;font-weight:800;font-size:13px;transition:transform .18s,box-shadow .18s}\n#ps-ai-widget .ps-ai-launch:hover{transform:translateY(-2px);box-shadow:0 12px 32px #0007}\n#ps-ai-widget .ps-ai-launch img{width:44px;height:44px;object-fit:contain;border-radius:50%;background:#050505;border:1px solid #d6a63d}\n#ps-ai-widget .ps-ai-panel{position:fixed;right:22px;bottom:88px;width:min(430px,calc(100vw - 28px));height:min(680px,calc(100dvh - 112px));min-height:330px;display:none;flex-direction:column;overflow:hidden;border:1px solid #4a2630;border-radius:19px;background:#0b0e13;box-shadow:0 24px 80px #0009}\n#ps-ai-widget .ps-ai-panel[aria-hidden=\"false\"]{display:flex}\n/* Mali chat ostaje nepromijenjen; dodatni sadržaj prikazuje se samo u proširenom prikazu. */\n#ps-ai-widget .ps-ai-panel:not(.ps-ai-fullscreen) .ps-ai-full-tools{display:none!important}\n#ps-ai-widget .ps-ai-panel:not(.ps-ai-fullscreen) iframe{display:block;width:100%;height:calc(100% - 54px);min-height:0;flex:1 1 auto}\n#ps-ai-widget .ps-ai-head{height:54px;flex:0 0 54px;display:flex;align-items:center;gap:10px;padding:8px 12px;background:linear-gradient(115deg,#a80e24,#1a1117);border-bottom:1px solid #4a2630}\n#ps-ai-widget .ps-ai-head img{width:34px;height:34px;object-fit:contain;border-radius:50%;border:1px solid #d6a63d;background:#050505}\n#ps-ai-widget .ps-ai-title{font-size:13px;font-weight:900;line-height:1.2}\n#ps-ai-widget .ps-ai-subtitle{font-size:10px;color:#f2c8ce;margin-top:3px}\n#ps-ai-widget .ps-ai-actions{margin-left:auto;display:flex;align-items:center;gap:6px}#ps-ai-widget .ps-ai-expand,#ps-ai-widget .ps-ai-close{width:34px;height:34px;border:1px solid #ffffff40;border-radius:50%;background:#ffffff12;color:#fff;font-size:18px;line-height:1;cursor:pointer}#ps-ai-widget .ps-ai-close{font-size:22px}\n#ps-ai-widget iframe{display:block;width:100%;height:calc(100% - 54px);flex:1;border:0;background:#07090d}\n#ps-ai-widget .ps-ai-launch:focus-visible,#ps-ai-widget .ps-ai-close:focus-visible,#ps-ai-widget .ps-ai-expand:focus-visible{outline:3px solid #f2c35e;outline-offset:3px}\n#ps-ai-widget .ps-ai-panel.ps-ai-fullscreen{inset:0!important;width:100vw!important;height:100dvh!important;max-height:none!important;min-height:0!important;right:0!important;bottom:0!important;border-radius:0!important;border:0!important;z-index:2147483001}\n#ps-ai-widget .ps-ai-panel.ps-ai-fullscreen .ps-ai-head{height:62px;flex-basis:62px;padding-left:max(14px,env(safe-area-inset-left));padding-right:max(14px,env(safe-area-inset-right))}\n#ps-ai-widget .ps-ai-panel.ps-ai-fullscreen iframe{height:auto;min-height:0;flex:1}
#ps-ai-widget .ps-ai-full-tools{display:none;flex:0 0 auto;padding:12px 16px 10px;background:linear-gradient(180deg,#101720,#0b1017);border-bottom:1px solid #303744;gap:9px}
#ps-ai-widget .ps-ai-panel.ps-ai-fullscreen .ps-ai-full-tools{display:flex;flex-direction:column}
#ps-ai-widget .ps-ai-shortcuts{display:flex;flex-wrap:wrap;gap:8px}
#ps-ai-widget .ps-ai-shortcut{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:8px 13px;border:1px solid #5a3540;border-radius:10px;background:linear-gradient(135deg,#24151c,#171d27);color:#fff;text-decoration:none;font-size:12px;font-weight:850;white-space:nowrap}
#ps-ai-widget .ps-ai-shortcut:hover{border-color:#d6a63d;background:#2a1a20}
#ps-ai-widget .ps-ai-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
#ps-ai-widget .ps-ai-info{min-width:0;padding:9px 12px;border:1px solid #2e3948;border-radius:11px;background:#111720}
#ps-ai-widget .ps-ai-info-label{display:block;margin-bottom:3px;color:#e6b8c0;font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
#ps-ai-widget .ps-ai-info p{margin:0;color:#e0e5ec;font-size:11px;line-height:1.45}
#ps-ai-widget .ps-ai-info a{color:#f0c4cb;text-decoration:none;font-weight:800}
#ps-ai-widget .ps-ai-info a:hover{text-decoration:underline}
@media(max-width:700px){#ps-ai-widget .ps-ai-panel.ps-ai-fullscreen .ps-ai-full-tools{padding:8px 10px;gap:7px}#ps-ai-widget .ps-ai-shortcuts{gap:6px}#ps-ai-widget .ps-ai-shortcut{flex:1 1 calc(50% - 6px);padding:7px 8px;white-space:normal;font-size:11px}#ps-ai-widget .ps-ai-info-grid{grid-template-columns:1fr 1fr;gap:6px}#ps-ai-widget .ps-ai-info{padding:7px 8px}#ps-ai-widget .ps-ai-info p{font-size:10px}}
@media(max-width:390px){#ps-ai-widget .ps-ai-info-grid{grid-template-columns:1fr}#ps-ai-widget .ps-ai-info:nth-child(1){display:none}}\n@media(max-width:600px){#ps-ai-widget{right:12px;bottom:12px}#ps-ai-widget .ps-ai-launch{padding:6px}#ps-ai-widget .ps-ai-launch img{width:48px;height:48px}#ps-ai-widget .ps-ai-launch span{display:none}#ps-ai-widget .ps-ai-panel{right:8px;bottom:76px;width:calc(100vw - 16px);height:min(76dvh,680px);min-height:300px;border-radius:16px}}\n@media(prefers-reduced-motion:reduce){#ps-ai-widget .ps-ai-launch{transition:none}}\n";
  document.head.appendChild(style);
  const root = document.createElement("div");
  root.id = "ps-ai-widget";
  root.innerHTML = '<section class="ps-ai-panel" aria-label="Razgovor s PatriaSoul AI" aria-hidden="true"><header class="ps-ai-head"><img alt="" src="' + logo + '"><div><div class="ps-ai-title"><a href="' + new URL("stranice/patria-ai.html", base).href + '" target="_top" style="color:inherit;text-decoration:none">PatriaSoul AI</a></div><div class="ps-ai-subtitle">Razgovarajte s Hrvatskom</div></div><div class="ps-ai-actions"><button class="ps-ai-expand" type="button" aria-label="Povećaj razgovor na cijeli zaslon" title="Povećaj na cijeli zaslon">⛶</button><button class="ps-ai-close" type="button" aria-label="Zatvori razgovor">×</button></div></header><div class="ps-ai-full-tools" aria-label="Brzi pristup PatriaSoul sadržajima"><nav class="ps-ai-shortcuts" aria-label="Brze poveznice"><a class="ps-ai-shortcut" href="' + new URL("kviz/public/brani-svoj-grad/", base).href + '" target="_top">🛡️ Brani svoj grad</a><a class="ps-ai-shortcut" href="' + new URL("stranice/domoljubni-forum.html", base).href + '" target="_top">💬 Domoljubni forum</a><a class="ps-ai-shortcut" href="' + new URL("stranice/poruke-obavijesti.html#obavijesti", base).href + '" target="_top">🔔 Obavijesti portala</a></nav><div class="ps-ai-info-grid"><div class="ps-ai-info"><span class="ps-ai-info-label">PatriaSoul obavijest</span><p>Portal raste uz vas. Istražujte nove sadržaje, podijelite svoju priču i pomozite sačuvati hrvatsku baštinu. <a href="' + new URL("stranice/poruke-obavijesti.html#obavijesti", base).href + '" target="_top">Pogledaj obavijesti →</a></p></div><div class="ps-ai-info"><span class="ps-ai-info-label">Riječ iz Biblije · Psalam 119,105</span><p>„Tvoja riječ nozi je mojoj svjetiljka i svjetlost mojoj stazi.”</p></div></div></div><iframe title="PatriaSoul AI — razgovor" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></section><button class="ps-ai-launch" type="button" aria-label="Otvori PatriaSoul AI" aria-expanded="false"><img alt="" src="' + logo + '"><span>Pitaj PatriaSoul AI</span></button>';
  document.body.appendChild(root);
  const panel = root.querySelector(".ps-ai-panel");
  const launch = root.querySelector(".ps-ai-launch");
  const close = root.querySelector(".ps-ai-close");
  const expand = root.querySelector(".ps-ai-expand");
  const frame = root.querySelector("iframe");
  let loaded = false;
  function toggleFullscreen() {
    const full = panel.classList.toggle("ps-ai-fullscreen");
    expand.textContent = full ? "⤢" : "⛶";
    expand.setAttribute("aria-label", full ? "Vrati razgovor na manju veličinu" : "Povećaj razgovor na cijeli zaslon");
    expand.title = full ? "Vrati manju veličinu" : "Povećaj na cijeli zaslon";
  }
  function openPanel() {
    if (!loaded) { frame.src = chatUrl; loaded = true; }
    panel.setAttribute("aria-hidden", "false");
    launch.setAttribute("aria-expanded", "true");
    close.focus({preventScroll:true});
  }
  function closePanel() {
    panel.setAttribute("aria-hidden", "true");
    panel.classList.remove("ps-ai-fullscreen");
    expand.textContent = "⛶";
    expand.setAttribute("aria-label", "Povećaj razgovor na cijeli zaslon");
    expand.title = "Povećaj na cijeli zaslon";
    launch.setAttribute("aria-expanded", "false");
    launch.focus({preventScroll:true});
  }
  launch.addEventListener("click", () => panel.getAttribute("aria-hidden") === "false" ? closePanel() : openPanel());
  close.addEventListener("click", closePanel);
  expand.addEventListener("click", toggleFullscreen);
  document.addEventListener("keydown", event => { if (event.key === "Escape" && panel.getAttribute("aria-hidden") === "false") closePanel(); });
})();