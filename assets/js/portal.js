(() => {
  "use strict";
  const script = document.currentScript;
  // Svaka stranica portala dobiva isti vizualni shell, neovisno o tome koje je CSS datoteke prethodno imala.
  const coreCss = ["base.css","header.css","navigation.css","footer.css","responsive.css","comments.css","auth.css"];
  const cssRoot = new URL("../css/", script?.src || location.href).href;
  coreCss.forEach((file) => {
    if (!document.querySelector('link[data-ps-core-css="' + file + '"]')) {
      const el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = cssRoot + file;
      el.dataset.psCoreCss = file;
      document.head.append(el);
    }
  });
  const root = new URL("../../", script?.src || location.href).href;
  const link = (p) => root + p;
  const path = location.pathname;
  const authReady = (() => {
    if (window.PatriaSoulAuth) return Promise.resolve(window.PatriaSoulAuth);
    const authSrc = new URL("auth.js?v=20261007-6", script?.src || location.href).href;
    return new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-ps-auth]");
      if (existing) { existing.addEventListener("load", () => resolve(window.PatriaSoulAuth)); existing.addEventListener("error", reject); return; }
      const el = document.createElement("script"); el.src = authSrc; el.async = true; el.dataset.psAuth = "true";
      el.onload = () => window.PatriaSoulAuth ? resolve(window.PatriaSoulAuth) : reject(new Error("PatriaSoul prijava nije učitana."));
      el.onerror = reject; document.head.append(el);
    });
  })();
  window.PatriaSoulAuthReady = authReady;
  const active = (needle) => path.includes(needle) ? " is-active" : "";
  const header = document.createElement("header");
  header.className = "ps-header";
  header.innerHTML = `
    <div class="ps-topline"><div class="ps-container ps-topline-inner">
      <span>PatriaSoul · Hrvatska · Povijest · Znanje · Identitet</span>
      <span><time data-ps-date></time> <strong data-ps-clock></strong></span>
    </div></div>
    <div class="ps-brand-row"><div class="ps-container ps-brand-inner">
      <a class="ps-brand" href="${link("index.html")}"><img class="ps-brand-logo" src="https://raw.githubusercontent.com/Patriasoul/patriasoul/main/images/file_0000000082ec81f4a6fc17bdbd959622_114540.png" alt="PatriaSoul — Krist u srcu, Hrvatska u molitvi."><span class="ps-brand-copy"><strong>PatriaSoul</strong><span>Čuvaj nasljeđe</span></span></a>
      <div class="ps-brand-actions">
        <a class="ps-search-button" href="${link("stranice/pretraga.html")}" aria-label="Pretraži" title="Pretraži"><span class="ps-search-icon" aria-hidden="true">⌕</span><span class="ps-search-label">Pretraži</span></a>
        <a class="ps-tiktok" href="https://www.tiktok.com/@patriasoul" target="_blank" rel="noopener">TikTok</a>
        <a class="ps-quiz-button" href="${link("kviz/")}">Hrvatski kviz</a>
        <a class="ps-forum-button" data-ps-private-link="true" href="${link("stranice/domoljubni-forum.html")}" title="Otvori Domoljubni forum"><span aria-hidden="true">💬</span><span>Domoljubni forum</span></a>
        <a class="ps-forum-button ps-messages-button" data-ps-private-link="true" href="${link("stranice/poruke-obavijesti.html")}" title="Privatne poruke"><span aria-hidden="true">✉</span><span>Poruke</span></a>
        <a class="ps-forum-button ps-notifications-button" data-ps-private-link="true" href="${link("stranice/poruke-obavijesti.html#obavijesti")}" title="Obavijesti"><span aria-hidden="true">♧</span><span>Obavijesti</span></a>
      </div>
    </div></div>
    <nav class="ps-nav" aria-label="Glavna navigacija"><div class="ps-container ps-nav-inner">
      <a class="ps-nav-direct${path.endsWith("/index.html")||path==="/"?" is-active":""}" href="${link("index.html")}">Naslovnica</a>
      <a class="ps-nav-direct${active("/stranice/domoljubni-forum.html")}" href="${link("stranice/domoljubni-forum.html")}">Forum</a>
      <a class="ps-nav-direct${active("/kviz")}" href="${link("kviz/")}">Hrvatski kviz</a>
      <a class="ps-nav-direct${active("/stranice/vrijeme.html")}" href="${link("stranice/vrijeme.html")}">Vrijeme</a>
      <a class="ps-nav-direct${active("/stranice/na-danasnji-dan.html")}" href="${link("stranice/na-danasnji-dan.html")}">Na današnji dan</a>
      <div class="ps-nav-group${active("/stranice/")}">
        <a href="${link("stranice/o-patriasoul.html")}">Više <span>⌄</span></a>
        <div class="ps-dropdown ps-dropdown-right">
          <a href="${link("stranice/poruke-obavijesti.html")}">Poruke i obavijesti</a>
          <a href="${link("stranice/pretraga.html")}">Pretraži portal</a>
          <a href="${link("stranice/o-patriasoul.html")}">O PatriaSoul</a>
          <a href="${link("stranice/kontakt.html")}">Kontakt</a>
          <a href="${link("stranice/pravila-foruma.html")}">Pravila foruma</a>
          <a href="${link("stranice/pravila-koristenja-i-sigurnosti.html")}">Pravila korištenja</a>
        </div>
      </div>
    </div></nav>
    <div class="ps-service"><div class="ps-container ps-service-inner">
      <span class="ps-service-label">PatriaSoul</span>
      <a href="${link("stranice/prijava.html")}">Prijava</a>
      <a href="${link("stranice/registracija.html")}">Registracija</a>
      <a href="${link("stranice/racun.html")}">Moj račun</a>
      <a href="${link("stranice/poruke-obavijesti.html")}">Poruke i obavijesti</a>
      <a href="${link("stranice/vrijeme.html")}">Vrijeme</a>
      <a href="${link("stranice/na-danasnji-dan.html")}">Na današnji dan</a>
    </div></div>
  `;
  // Pristupačan gumb mobilnog izbornika; desktop raspored ostaje nepromijenjen.
  const mobileMenuButton = document.createElement("button");
  mobileMenuButton.type = "button";
  mobileMenuButton.className = "ps-mobile-menu-toggle";
  mobileMenuButton.setAttribute("aria-expanded", "false");
  mobileMenuButton.setAttribute("aria-controls", "ps-main-navigation");
  mobileMenuButton.setAttribute("aria-label", "Otvori mobilni izbornik");
  mobileMenuButton.innerHTML = '<span class="ps-mobile-menu-icon" aria-hidden="true">☰</span><span class="ps-mobile-menu-text">Izbornik</span>';
  header.querySelector(".ps-brand-actions").append(mobileMenuButton);
  const setMobileMenu = (open) => {
    header.classList.toggle("ps-mobile-menu-open", open);
    mobileMenuButton.setAttribute("aria-expanded", String(open));
    mobileMenuButton.setAttribute("aria-label", open ? "Zatvori mobilni izbornik" : "Otvori mobilni izbornik");
    mobileMenuButton.querySelector(".ps-mobile-menu-icon").textContent = open ? "✕" : "☰";
  };
  mobileMenuButton.addEventListener("click", () => setMobileMenu(!header.classList.contains("ps-mobile-menu-open")));
  header.querySelector(".ps-nav").id = "ps-main-navigation";

  document.body.prepend(header);

  // Globalna tipka "Natrag": vraća na prethodnu stranicu portala, a ne napušta portal.
  if (!document.querySelector("[data-ps-back-button]")) {
    const back = document.createElement("button");
    back.type = "button";
    back.dataset.psBackButton = "true";
    back.className = "ps-back-button";
    back.innerHTML = '<span aria-hidden="true">←</span><span>Natrag</span>';
    back.setAttribute("aria-label", "Vrati se na prethodnu stranicu");
    back.title = "Vrati se korak unatrag";
    back.addEventListener("click", () => {
      // Najprije vrati na prethodnu stranicu samo ako je unutar istog portala.
      if (document.referrer) {
        try {
          const previous = new URL(document.referrer);
          if (previous.origin === location.origin && previous.href !== location.href) {
            location.href = previous.href;
            return;
          }
        } catch (_) {}
      }
      // Pouzdan izlaz kad je stranica otvorena izravno ili nema povijesti preglednika.
      location.href = link("index.html");
    });
    document.body.append(back);
    const backStyle = document.createElement("style");
    backStyle.textContent = ".ps-back-button{position:fixed;z-index:9998;left:14px;bottom:16px;display:inline-flex;align-items:center;gap:8px;padding:10px 15px;border:1px solid #cbd5df;border-radius:999px;background:#fff;color:#12304b;font:700 .9rem/1.2 system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.16);cursor:pointer}.ps-back-button:hover{background:#12304b;color:#fff;border-color:#12304b}.ps-back-button:focus-visible{outline:3px solid #c51f2b;outline-offset:3px}.ps-back-button span:first-child{font-size:1.2rem}@media(max-width:680px){.ps-back-button{left:10px;bottom:10px;padding:9px 12px;font-size:.82rem}}";
    document.head.append(backStyle);
  }

  // Na mobitelu strelica otvara podizbornik, a poveznice ostaju izravno dostupne.
  const positionDropdown = (group) => {
    const navRect = header.querySelector(".ps-nav").getBoundingClientRect();
    const dropdown = group.querySelector(".ps-dropdown");
    if (!dropdown) return;
    dropdown.style.top = Math.round(navRect.bottom) + "px";
    dropdown.style.left = "10px";
    dropdown.style.right = "10px";
  };
  header.querySelectorAll(".ps-nav-group > a").forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      if (!window.matchMedia("(max-width: 680px)").matches) return;
      const arrow = event.target.closest("span");
      if (!arrow) {
        setMobileMenu(false);
        return;
      }
      event.preventDefault();
      const group = anchor.parentElement;
      const shouldOpen = !group.classList.contains("is-open");
      header.querySelectorAll(".ps-nav-group.is-open").forEach((open) => {
        if (open !== group) open.classList.remove("is-open");
      });
      if (shouldOpen) {
        group.classList.add("is-open");
        positionDropdown(group);
      } else {
        group.classList.remove("is-open");
      }
    });
  });
  window.addEventListener("resize", () => header.querySelectorAll(".ps-nav-group.is-open").forEach(positionDropdown));
  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) {
      header.querySelectorAll(".ps-nav-group.is-open").forEach((g) => g.classList.remove("is-open"));
      setMobileMenu(false);
    }
  });
  header.querySelectorAll(".ps-nav-inner > a").forEach((anchor) => anchor.addEventListener("click", () => setMobileMenu(false)));

  const footer = document.createElement("footer");
  footer.className = "ps-footer";
  footer.innerHTML = `
    <div class="ps-container ps-footer-grid">
      <div class="ps-footer-brand">
        <img class="ps-footer-logo" src="https://raw.githubusercontent.com/Patriasoul/patriasoul/main/images/file_0000000082ec81f4a6fc17bdbd959622_114540.png" alt="PatriaSoul — Krist u srcu, Hrvatska u molitvi.">
        <strong>PatriaSoul — Čuvaj nasljeđe.</strong>
        <p>Činjenice prije senzacije. Izvor prije tvrdnje.</p>
        <p><a href="mailto:patriasoul@protonmail.com">patriasoul@protonmail.com</a></p>
      </div>
      <div class="ps-footer-col">
        <h3>Informacije</h3>
        <a href="${link("stranice/pravila-koristenja-i-sigurnosti.html")}">Pravila korištenja i sigurnosti</a>
        <a href="${link("stranice/privatnost.html")}">Privatnost i zaštita osobnih podataka</a>
        <a href="${link("stranice/pravila-foruma.html")}">Pravila foruma</a>
      </div>
      <div class="ps-footer-col">
        <h3>PatriaSoul</h3>
        <a href="${link("stranice/o-patriasoul.html")}">O PatriaSoul</a>
        <a href="${link("stranice/kontakt.html")}">Kontakt</a>
        <a href="${link("stranice/pretraga.html")}">Pretraži</a>
        <a href="${link("stranice/newsletter.html")}">Prati PatriaSoul</a>
      </div>
      <div class="ps-footer-col">
        <h3>Na portalu</h3>
        <a href="${link("stranice/domoljubni-forum.html")}">Domoljubni forum</a>
        <a href="${link("kviz/")}">Hrvatski kviz</a>
        <a href="${link("stranice/poruke-obavijesti.html")}">Poruke i obavijesti</a>
        <a href="${link("stranice/vrijeme.html")}">Vrijeme u Hrvatskoj</a>
        <a href="${link("stranice/na-danasnji-dan.html")}">Na današnji dan</a>
      </div>
    </div>
    <div class="ps-container ps-footer-social">
      <div class="ps-footer-social-card">
        <p class="ps-kicker">TikTok</p>
        <h3>PatriaSoul</h3>
        <p>Kratke priče, zanimljivosti i kvizovi kroz koje zajedno upoznajemo Hrvatsku.</p>
        <a class="ps-footer-social-button" href="https://www.tiktok.com/@patriasoul" target="_blank" rel="noopener">Prati nas</a>
      </div>
      <div class="ps-footer-social-card">
        <p class="ps-kicker">Vjera · Yeshua</p>
        <h3>Vjera · Yeshua</h3>
        <p>Vjera, nada i istina kroz priču o Yeshui — Isusu Kristu i Njegovoj riječi.</p>
        <a class="ps-footer-social-button" href="https://www.tiktok.com/@hajdi331?lang=hr" target="_blank" rel="noopener">Prati kanal</a>
      </div>
    </div>
    <div class="ps-container ps-footer-bottom"><small>© 2026 PatriaSoul — Čuvaj nasljeđe. Sva prava pridržana.</small></div>`;
  document.body.append(footer);

  // Forum, poruke i obavijesti uvijek su vidljivi. Ako korisnik nije prijavljen,
  // spremimo odredište i nakon prijave vratimo ga upravo na odabranu stranicu.
  header.querySelectorAll('[data-ps-private-link]').forEach((item) => {
    item.hidden = false;
    item.style.display = '';
    item.removeAttribute('aria-hidden');
    item.addEventListener('click', async (event) => {
      event.preventDefault();
      const destination = new URL(item.href, location.href);
      if (destination.origin !== location.origin) return;
      try {
        const auth = await authReady;
        const userNow = await auth.getUser();
        if (userNow) {
          location.href = destination.href;
          return;
        }
      } catch (_) {}
      const login = new URL(link("stranice/prijava.html"), location.href);
      login.searchParams.set("next", destination.href);
      try { sessionStorage.setItem("patriasoul-login-next", destination.href); } catch (_) {}
      location.href = login.href;
    });
  });

  // Prijavljeno stanje: odmah prikaži račun i odjavu kada je korisnik prijavljen.
  authReady.then(async (auth) => {
    const user = await auth.getUser();
    if (user) {
      try {
        const client = await auth.client();
        const notificationCount = await client.from("user_notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
        const notificationBadge = header.querySelector("[data-ps-notification-count]");
        if (notificationBadge && !notificationCount.error && notificationCount.count > 0) {
          notificationBadge.textContent = String(notificationCount.count > 99 ? "99+" : notificationCount.count);
          notificationBadge.hidden = false;
        }
        const memberships = await client.from("private_conversation_members").select("conversation_id,last_read_at").eq("user_id", user.id);
        if (!memberships.error && memberships.data?.length) {
          const ids = memberships.data.map((item) => item.conversation_id);
          const incoming = await client.from("private_messages").select("conversation_id,created_at").in("conversation_id", ids).neq("sender_id", user.id);
          if (!incoming.error) {
            const unread = incoming.data.filter((item) => {
              const membership = memberships.data.find((entry) => entry.conversation_id === item.conversation_id);
              return !membership?.last_read_at || new Date(item.created_at) > new Date(membership.last_read_at);
            }).length;
            const messageBadge = header.querySelector("[data-ps-message-count]");
            if (messageBadge && unread > 0) {
              messageBadge.textContent = String(unread > 99 ? "99+" : unread);
              messageBadge.hidden = false;
            }
          }
        }
      } catch (_) {}
    }
    if (user) {
      try {
        const client = await auth.client();
        const bump = (selector) => {
          const badge = header.querySelector(selector);
          if (!badge) return;
          const current = Number.parseInt(badge.textContent, 10) || 0;
          badge.textContent = String(Math.min(99, current + 1)) + (current >= 99 ? "+" : "");
          badge.hidden = false;
        };
        const channel = client.channel("patriasoul-header-notifications-" + user.id)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages" }, (payload) => {
            if (payload.new?.sender_id && payload.new.sender_id !== user.id) bump("[data-ps-message-count]");
          })
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_notifications", filter: "user_id=eq." + user.id }, () => {
            bump("[data-ps-notification-count]");
          })
          .subscribe();
        window.addEventListener("pagehide", () => { client.removeChannel(channel); }, { once: true });
      } catch (_) {}
    }
    const loginLink = header.querySelector('.ps-more .ps-dropdown a[href*="prijava.html"]');
    const accountLink = header.querySelector('.ps-more .ps-dropdown a[href*="racun.html"]');
    const roleResult = await auth.getProfile().catch(() => null);
    const role = String(roleResult?.role || "player").toLowerCase();
    const canAdmin = ["editor","admin"].includes(role) || String(user?.email || "").toLowerCase() === "patriasoul@protonmail.com";
    const more = header.querySelector(".ps-more .ps-dropdown");
    const adminExisting = more?.querySelector('[data-ps-admin-link="true"]');
    if (canAdmin && more && !adminExisting) {
      const a = document.createElement("a");
      a.href = link("stranice/administracija.html");
      a.textContent = role === "editor" ? "Uredništvo" : "Administracija";
      a.dataset.psAdminLink = "true";
      more.append(a);
    }
    if (user) {
      if (loginLink) { loginLink.textContent = "Odjavi se"; loginLink.href = "#"; loginLink.dataset.psLogout = "true"; }
      if (accountLink) accountLink.textContent = "Moj račun · " + (user.user_metadata?.display_name || user.email?.split("@")[0] || "račun");
    }
    if (loginLink?.dataset.psLogout === "true") loginLink.addEventListener("click", async (e) => { e.preventDefault(); await auth.signOut(); location.reload(); });
  }).catch(() => {});

  // UX: reading time, sharing, metadata, breadcrumbs and cookie notice
  const searchStyle = document.createElement("style");
  searchStyle.textContent = ".ps-search-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:38px;padding:0 12px;border:1px solid var(--ps-blue);border-radius:7px;background:var(--ps-blue);color:#fff!important;text-decoration:none;font-size:.95rem;font-weight:700;line-height:1;transition:.2s}.ps-search-button .ps-search-icon{font-size:1.25rem;font-weight:800;line-height:1}.ps-search-button .ps-search-label{font-size:.82rem;font-weight:800;line-height:1}.ps-search-button:hover{background:var(--ps-red);color:#fff!important;border-color:var(--ps-red)}.ps-search-button:focus-visible{outline:3px solid rgba(255,255,255,.7);outline-offset:2px}";
  document.head.append(searchStyle);

  const style = document.createElement("style");
  style.textContent = ".ps-reading{color:var(--ps-muted);font-size:.82rem;margin:.35rem 0 1rem}.ps-share{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.ps-share button,.ps-share a{border:1px solid var(--ps-border);background:#fff;padding:9px 13px;border-radius:6px;cursor:pointer;font-weight:800;text-decoration:none;color:var(--ps-blue);font-size:.85rem}.ps-share button:hover,.ps-share a:hover{border-color:var(--ps-red);color:var(--ps-red)}.ps-article-tools{width:100%;max-width:820px;margin:54px auto 34px;padding:24px 0;border-top:1px solid var(--ps-border);border-bottom:1px solid var(--ps-border)}.ps-share-title{font:800 1.05rem/1.3 Georgia,serif;color:var(--ps-blue);margin-bottom:7px}.ps-comments{width:100%;max-width:820px;margin:42px auto 20px;padding:28px 0 10px;border-top:4px solid var(--ps-blue)}.ps-comments-head span{color:var(--ps-red);font-size:.7rem;font-weight:900;letter-spacing:.14em}.ps-comments-head h2{margin:7px 0 4px;color:var(--ps-blue);font:800 1.7rem/1.2 Georgia,serif}.ps-comments-head p{margin:0 0 22px;color:var(--ps-muted);font-size:.9rem}.ps-breadcrumb{font-size:.8rem;color:var(--ps-muted);margin-bottom:12px}.ps-breadcrumb a{color:var(--ps-red);text-decoration:none}.ps-cookie{position:fixed;z-index:9999;left:18px;right:18px;bottom:18px;max-width:760px;margin:auto;background:#10263d;color:#fff;border:1px solid #49627b;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:18px;border-radius:10px;display:flex;gap:18px;align-items:center;justify-content:space-between}.ps-cookie p{margin:0;color:#fff;font-size:.9rem;line-height:1.55}.ps-cookie a{color:#fff!important;font-weight:800;text-decoration:underline;text-underline-offset:3px}.ps-cookie button{border:1px solid #ffb5ba;background:#c51f2b;color:#fff;padding:10px 16px;border-radius:6px;font-weight:800;cursor:pointer}.ps-cookie button:hover{background:#a91823}.ps-cookie button:focus-visible,.ps-cookie a:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:560px){.ps-cookie{left:10px;right:10px;bottom:10px;display:block}.ps-cookie button{margin-top:10px}}";
  document.head.append(style);
  // Jedinstveni pregled fotografija za sve članke (naslovne i slike unutar teksta).
  document.addEventListener("click", event => {
    const img = event.target.closest("article img, main article img, .article-page img, .article-figure img, .article-body img, .article-hero img, img.article-hero");
    if (!img || img.closest(".ps-image-lightbox") || img.classList.contains("ps-brand-logo") || img.classList.contains("ps-footer-logo")) return;
    const src = img.currentSrc || img.src;
    if (!src) return;
    event.preventDefault();
    event.stopPropagation();
    let modal = document.getElementById("ps-image-lightbox");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "ps-image-lightbox";
      modal.className = "ps-image-lightbox";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "Pregled fotografije");
      modal.innerHTML = '<button type="button" class="ps-image-lightbox-close" aria-label="Zatvori fotografiju">×</button><img alt=""><p></p>';
      modal.style.cssText = "position:fixed;inset:0;z-index:10020;display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:24px;background:rgba(4,13,23,.94);box-sizing:border-box";
      const large = modal.querySelector("img");
      large.style.cssText = "display:block;max-width:94vw;max-height:84vh;width:auto;height:auto;object-fit:contain;border-radius:5px;box-shadow:0 10px 40px rgba(0,0,0,.45)";
      const caption = modal.querySelector("p");
      caption.style.cssText = "margin:0;color:#fff;text-align:center;font:600 .9rem/1.4 system-ui,sans-serif";
      const close = () => { modal.style.display = "none"; document.body.style.overflow = ""; };
      modal.querySelector("button").style.cssText = "position:absolute;top:14px;right:18px;border:1px solid #fff;border-radius:50%;width:44px;height:44px;background:#10263d;color:#fff;font-size:30px;line-height:1;cursor:pointer";
      modal.querySelector("button").addEventListener("click", close);
      modal.addEventListener("click", e => { if (e.target === modal) close(); });
      document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.style.display !== "none") close(); });
      document.body.append(modal);
    }
    const large = modal.querySelector("img");
    large.src = src;
    large.alt = img.alt || "Fotografija članka PatriaSoul";
    modal.querySelector("p").textContent = img.alt || "";
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }, true);
  document.querySelectorAll("article img, main article img, .article-page img, .article-figure img, .article-body img, .article-hero img, img.article-hero").forEach(img => {
    if (!img.classList.contains("ps-brand-logo") && !img.classList.contains("ps-footer-logo")) {
      img.style.cursor = "zoom-in";
      img.title = img.title || "Kliknite za povećanje fotografije";
    }
  });

  const article=document.querySelector("article.article-page, .article-page");
  if(article){
    const commentsScript=new URL("comments.js?v=20261007-4", script?.src || location.href);
    const existing=document.querySelector('script[data-ps-comments]');
    if(!existing){
      const loader=document.createElement("script");
      loader.src=commentsScript.href;
      loader.async=false;
      loader.dataset.psComments="true";
      document.body.append(loader);
    }
  }
  const metaDesc=document.querySelector("meta[name=\"description\"]");const desc=metaDesc?.content||"PatriaSoul — Hrvatska, povijest, znanje i identitet.";const canonical=document.querySelector("link[rel=\"canonical\"]")||document.head.appendChild(Object.assign(document.createElement("link"),{rel:"canonical"}));canonical.href=location.href.split("#")[0];
  [["og:title",document.title],["og:description",desc],["og:url",location.href.split("#")[0]],["og:site_name","PatriaSoul"],["og:locale","hr_HR"]].forEach(([k,v])=>{let m=document.querySelector(`meta[property="${k}"]`);if(!m){m=document.createElement("meta");m.setAttribute("property",k);document.head.append(m)}m.content=v});
  if(!localStorage.getItem("ps-cookie-consent-v1")){const box=document.createElement("div");box.className="ps-cookie";box.innerHTML="<p>PatriaSoul koristi nužnu lokalnu pohranu za osnovne funkcije portala. <a href=\""+link("stranice/privatnost.html")+"\">Privatnost i kolačići</a>.</p><button type=\"button\">U redu</button>";document.body.append(box);box.querySelector("button").onclick=()=>{localStorage.setItem("ps-cookie-consent-v1","accepted");box.remove()}};

  const date = header.querySelector("[data-ps-date]");
  const clock = header.querySelector("[data-ps-clock]");
  const tick = () => {
    const now = new Date();
    date.textContent = new Intl.DateTimeFormat("hr-HR",{day:"2-digit",month:"2-digit",year:"numeric"}).format(now);
    clock.textContent = new Intl.DateTimeFormat("hr-HR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(now);
  };
  tick(); setInterval(tick,1000);
  // Globalni plutajući AI pomoćnik: učitava se iz zajedničkog portala i na Cloudflareu,
  // čak i kada se build skripta normalize-shell.js ne pokreće.
  if (!document.getElementById("ps-ai-widget") && !document.querySelector('script[data-ps-ai-widget]')) {
    const aiWidget = document.createElement("script");
    aiWidget.src = new URL("ai-widget.js?v=20261010-11", script?.src || location.href).href;
    aiWidget.defer = true;
    aiWidget.dataset.psAiWidget = "true";
    document.body.append(aiWidget);
  }

})();