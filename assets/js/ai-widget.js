(() => {
  "use strict";
  const script = document.currentScript;
  if (!script || /patria-ai-puter-test\.html$/i.test(location.pathname)) return;
  if (document.getElementById("ps-ai-widget")) return;
  const base = new URL("../../", script.src);
  const logo = new URL("assets/images/patriasoul-logo.jpg", base).href;
  const chatUrl = new URL("stranice/patria-ai-puter-test.html?embed=1", base).href;
  const style = document.createElement("style");
  style.textContent = "\n#ps-ai-widget{position:fixed;right:22px;bottom:22px;z-index:2147483000;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;color:#f6f7f9}\n#ps-ai-widget *{box-sizing:border-box}\n#ps-ai-widget .ps-ai-launch{display:flex;align-items:center;gap:10px;border:1px solid #d6a63d;border-radius:999px;padding:7px 15px 7px 7px;background:linear-gradient(135deg,#161b24,#080a0e);color:#fff;box-shadow:0 8px 28px #0005;cursor:pointer;font-weight:800;font-size:13px;transition:transform .18s,box-shadow .18s}\n#ps-ai-widget .ps-ai-launch:hover{transform:translateY(-2px);box-shadow:0 12px 32px #0007}\n#ps-ai-widget .ps-ai-launch img{width:44px;height:44px;object-fit:contain;border-radius:50%;background:#050505;border:1px solid #d6a63d}\n#ps-ai-widget .ps-ai-panel{position:fixed;right:22px;bottom:88px;width:min(430px,calc(100vw - 28px));height:min(680px,calc(100dvh - 112px));min-height:330px;display:none;flex-direction:column;overflow:hidden;border:1px solid #4a2630;border-radius:19px;background:#0b0e13;box-shadow:0 24px 80px #0009}\n#ps-ai-widget .ps-ai-panel[aria-hidden=\"false\"]{display:flex}\n#ps-ai-widget .ps-ai-head{height:54px;flex:0 0 54px;display:flex;align-items:center;gap:10px;padding:8px 12px;background:linear-gradient(115deg,#a80e24,#1a1117);border-bottom:1px solid #4a2630}\n#ps-ai-widget .ps-ai-head img{width:34px;height:34px;object-fit:contain;border-radius:50%;border:1px solid #d6a63d;background:#050505}\n#ps-ai-widget .ps-ai-title{font-size:13px;font-weight:900;line-height:1.2}\n#ps-ai-widget .ps-ai-subtitle{font-size:10px;color:#f2c8ce;margin-top:3px}\n#ps-ai-widget .ps-ai-close{margin-left:auto;width:34px;height:34px;border:1px solid #ffffff40;border-radius:50%;background:#ffffff12;color:#fff;font-size:22px;line-height:1;cursor:pointer}\n#ps-ai-widget iframe{display:block;width:100%;height:calc(100% - 54px);flex:1;border:0;background:#07090d}\n#ps-ai-widget .ps-ai-launch:focus-visible,#ps-ai-widget .ps-ai-close:focus-visible{outline:3px solid #f2c35e;outline-offset:3px}\n@media(max-width:600px){#ps-ai-widget{right:12px;bottom:12px}#ps-ai-widget .ps-ai-launch{padding:6px}#ps-ai-widget .ps-ai-launch img{width:48px;height:48px}#ps-ai-widget .ps-ai-launch span{display:none}#ps-ai-widget .ps-ai-panel{right:8px;bottom:76px;width:calc(100vw - 16px);height:min(76dvh,680px);min-height:300px;border-radius:16px}}\n@media(prefers-reduced-motion:reduce){#ps-ai-widget .ps-ai-launch{transition:none}}\n";
  document.head.appendChild(style);
  const root = document.createElement("div");
  root.id = "ps-ai-widget";
  root.innerHTML = '<section class="ps-ai-panel" aria-label="Razgovor s PatriaSoul AI" aria-hidden="true"><header class="ps-ai-head"><img alt="" src="' + logo + '"><div><div class="ps-ai-title"><a href="${new URL("stranice/patria-ai.html", base).href}" target="_top" style="color:inherit;text-decoration:none">PatriaSoul AI</a></div><div class="ps-ai-subtitle">Razgovarajte s Hrvatskom</div></div><button class="ps-ai-close" type="button" aria-label="Zatvori razgovor">×</button></header><iframe title="PatriaSoul AI — razgovor" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></section><button class="ps-ai-launch" type="button" aria-label="Otvori PatriaSoul AI" aria-expanded="false"><img alt="" src="' + logo + '"><span>Pitaj PatriaSoul AI</span></button>';
  document.body.appendChild(root);
  const panel = root.querySelector(".ps-ai-panel");
  const launch = root.querySelector(".ps-ai-launch");
  const close = root.querySelector(".ps-ai-close");
  const frame = root.querySelector("iframe");
  let loaded = false;
  function openPanel() {
    if (!loaded) { frame.src = chatUrl; loaded = true; }
    panel.setAttribute("aria-hidden", "false");
    launch.setAttribute("aria-expanded", "true");
    close.focus({preventScroll:true});
  }
  function closePanel() {
    panel.setAttribute("aria-hidden", "true");
    launch.setAttribute("aria-expanded", "false");
    launch.focus({preventScroll:true});
  }
  launch.addEventListener("click", () => panel.getAttribute("aria-hidden") === "false" ? closePanel() : openPanel());
  close.addEventListener("click", closePanel);
  document.addEventListener("keydown", event => { if (event.key === "Escape" && panel.getAttribute("aria-hidden") === "false") closePanel(); });
})();