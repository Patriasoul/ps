export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Server-side RSS proxy: avoids browser CORS failures without using a third-party proxy.
    if (url.pathname === "/api/rss") {
      if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { "Allow": "GET" } });
      const raw = url.searchParams.get("url");
      if (!raw || raw.length > 2048) return new Response("Nedostaje ili je preduga RSS poveznica.", { status: 400 });
      let feedUrl;
      try { feedUrl = new URL(raw); } catch { return new Response("RSS poveznica nije valjana.", { status: 400 }); }
      if (feedUrl.protocol !== "https:" || feedUrl.username || feedUrl.password) {
        return new Response("RSS izvor mora biti sigurna HTTPS poveznica.", { status: 400 });
      }
      const allowedHosts = new Set(["index.hr", "www.index.hr", "vecernji.hr", "www.vecernji.hr"]);
      const isAllowedFeedUrl = candidate => {
        try {
          const parsed = new URL(candidate);
          return parsed.protocol === "https:" && !parsed.username && !parsed.password && allowedHosts.has(parsed.hostname.toLowerCase());
        } catch { return false; }
      };
      if (!isAllowedFeedUrl(feedUrl.toString())) {
        return new Response("RSS izvor nije na popisu odobrenih PatriaSoul izvora.", { status: 403 });
      }
      try {
        let target = feedUrl;
        let upstream;
        for (let redirects = 0; redirects <= 3; redirects++) {
          upstream = await fetch(target.toString(), {
            headers: { "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*", "User-Agent": "PatriaSoul-RSS/1.0" },
            redirect: "manual",
            signal: AbortSignal.timeout(10000)
          });
          if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
          const location = upstream.headers.get("location");
          if (!location || redirects === 3) return new Response("RSS izvor ima previše preusmjeravanja.", { status: 502 });
          const next = new URL(location, target);
          if (!isAllowedFeedUrl(next.toString())) return new Response("Preusmjeravanje RSS izvora nije dopušteno.", { status: 403 });
          target = next;
        }
        if (!upstream || !upstream.ok) return new Response("RSS izvor vratio je HTTP " + (upstream?.status || 502), { status: 502 });
        const type = upstream.headers.get("content-type") || "application/xml; charset=utf-8";
        const body = await upstream.text();
        if (body.length > 1500000) return new Response("RSS odgovor je prevelik (maks. 1,5 MB).", { status: 413 });
        if (!/<(?:rss|feed|rdf:RDF|RDF)(?:\s|>)/i.test(body)) {
          return new Response("Odgovor ne izgleda kao RSS/Atom/XML feed.", { status: 422 });
        }
        return new Response(body, { status: 200, headers: {
          "Content-Type": type.includes("xml") || type.includes("rss") || type.includes("atom") ? type : "application/xml; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        }});
      } catch (error) {
        return new Response("RSS izvor nije dostupan: " + (error?.name === "TimeoutError" ? "isteklo je vrijeme čekanja." : "mrežna pogreška."), { status: 502 });
      }
    }

    // Javni sadržaj ima kratke, kanonske URL-ove u korijenu domene.
    // Stari /stranice/... URL-ovi ostaju podržani radi postojećih poveznica.
    // Kategorije zadržavaju vlastitu strukturu, npr. /kategorije/domovina/.
    const rootPageAliases = {
      "/o-patriasoul": "/stranice/o-patriasoul.html",
      "/kontakt": "/stranice/kontakt.html",
      "/kolacici": "/stranice/kolacici.html",
      "/na-danasnji-dan": "/stranice/na-danasnji-dan.html",
      "/najnovije": "/stranice/najnovije.html",
      "/vazne-obavijesti": "/stranice/vazne-obavijesti.html",
      "/newsletter": "/stranice/newsletter.html",
      "/domoljubni-forum": "/stranice/domoljubni-forum.html",
      "/pravila-foruma": "/stranice/pravila-foruma.html",
      "/pravila-koristenja-i-sigurnosti": "/stranice/pravila-koristenja-i-sigurnosti.html",
      "/pravilnik-o-igranju-kvizova": "/stranice/pravilnik-o-igranju-kvizova.html",
      "/pravne-informacije": "/stranice/pravne-informacije.html",
      "/pretraga": "/stranice/pretraga.html",
      "/privatnost": "/stranice/privatnost.html",
      "/urednicki-standard": "/stranice/urednicki-standard.html",
      "/vrijeme": "/stranice/vrijeme.html",
      "/prijava": "/stranice/prijava.html",
      "/registracija": "/stranice/registracija.html",
      "/racun": "/stranice/racun.html",
      "/poruke-obavijesti": "/stranice/poruke-obavijesti.html",
    };

    // Čuvari nasljeđa sada imaju kanonsku kategoriju pod /kategorije/.
    // Stare adrese kategorije preusmjeravamo na nju na razini Workera,
    // bez oslanjanja na meta-refresh u HTML-u.
    if (request.method === "GET" || request.method === "HEAD") {
      if (["/cuvari-nasljedja", "/cuvari-nasljedja/", "/cuvari-nasljedja/index.html"].includes(url.pathname)) {
        const canonicalCategoryUrl = new URL("/kategorije/cuvari-nasljedja/", url);
        canonicalCategoryUrl.search = url.search;
        return Response.redirect(canonicalCategoryUrl.toString(), 301);
      }
    }

    // Izravno razriješi glavne kategorije na njihov index.html.
    // Time se ne oslanjamo na implicitno razrješavanje direktorija u statičkom asset sloju.
    if ((request.method === "GET" || request.method === "HEAD")) {
      const categoryMatch = url.pathname.match(/^\/kategorije\/(domovina|povijest|vjera|cuvari-nasljedja)\/?$/);
      if (categoryMatch) {
        const categoryIndexUrl = new URL(url);
        categoryIndexUrl.pathname = `/kategorije/${categoryMatch[1]}/index.html`;
        const categoryIndexResponse = await env.ASSETS.fetch(new Request(categoryIndexUrl, request));
        if (categoryIndexResponse.status !== 404) return categoryIndexResponse;
      }
    }

    // Kanoniziraj stare javne /stranice/... adrese na kratke URL-ove.
    // Zadržavamo query string, a stari URL-ovi i dalje rade preko preusmjeravanja.
    if (request.method === "GET" || request.method === "HEAD") {
      const legacyMatch = url.pathname.match(/^\/stranice\/([^/]+?)(?:\.html)?\/?$/);
      if (legacyMatch) {
        const legacySlug = legacyMatch[1];
        if (rootPageAliases["/" + legacySlug]) {
          const canonicalUrl = new URL(url);
          canonicalUrl.pathname = "/" + legacySlug + "/";
          return Response.redirect(canonicalUrl.toString(), 302);
        }
      }

      // Podrži URL-ove s kosom crtom i bez nje. Zadržavamo query string.
      const aliasKey = url.pathname.replace(/\/+$/, "") || "/";
      const aliasedAsset = rootPageAliases[aliasKey];
      if (aliasedAsset) {
        const aliasUrl = new URL(url);
        aliasUrl.pathname = aliasedAsset;
        return env.ASSETS.fetch(new Request(aliasUrl, request));
      }

      // Podrži direktorijske URL-ove i čiste URL-ove bez nastavka.
      // Primjer: /stranice/o-patriasoul -> /stranice/o-patriasoul.html
      const lastSegment = url.pathname.split("/").filter(Boolean).at(-1) || "";
      const isDirectoryUrl = url.pathname.endsWith("/");
      const isExtensionlessPath = !isDirectoryUrl && !lastSegment.includes(".");

      if (isExtensionlessPath) {
        const htmlUrl = new URL(url);
        htmlUrl.pathname = `${url.pathname}.html`;
        const htmlResponse = await env.ASSETS.fetch(new Request(htmlUrl, request));
        if (htmlResponse.status !== 404) {
          return htmlResponse;
        }
      }

      if (isDirectoryUrl || isExtensionlessPath) {
        const indexUrl = new URL(url);
        indexUrl.pathname = isDirectoryUrl
          ? `${url.pathname}index.html`
          : `${url.pathname}/index.html`;

        const indexResponse = await env.ASSETS.fetch(new Request(indexUrl, request));
        if (indexResponse.status !== 404) {
          return indexResponse;
        }
      }
    }

    // CMS članak može biti objavljen u Supabaseu prije nego što ga sljedeći
    // statički build upiše u _site. Ako statička datoteka nedostaje, posluži
    // objavljeni CMS zapis odmah; tako gumb „Otvori članak” nikad ne ovisi o
    // desetominutnom rasporedu izgradnje.
    const assetResponse = await env.ASSETS.fetch(request);
    const cmsPathMatch = url.pathname.match(/^\/clanci\/(domovina|povijest|vjera|cuvari-nasljedja)\/(clanak-[a-z0-9-]+\.html)$/i);
    if (assetResponse.status !== 404 || !cmsPathMatch || !["GET", "HEAD"].includes(request.method)) {
      return assetResponse;
    }

    try {
      const cmsUrl = "https://ijimozjfdffejbczwyzb.supabase.co/rest/v1/portal_articles";
      const cmsKey = "sb_publishable_SvuPtQUmXamt1a1_JpU6Jg_Bf3Fshqr";
      const publicPath = url.pathname.replace(/^\//, "");
      const query = new URL(cmsUrl);
      query.searchParams.set("select", "path,title,kicker,category,subcategory,excerpt,body_html,image_url,image_alt,author_display,published_at,source_data,status");
      query.searchParams.set("path", "eq." + publicPath);
      query.searchParams.set("status", "eq.published");
      query.searchParams.set("limit", "1");
      const cmsResponse = await fetch(query.toString(), {
        headers: { apikey: cmsKey, Authorization: "Bearer " + cmsKey, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store"
      });
      if (!cmsResponse.ok) return assetResponse;
      const cmsRows = await cmsResponse.json();
      const article = Array.isArray(cmsRows) ? cmsRows[0] : null;
      if (!article || article.status !== "published" || article.path !== publicPath) return assetResponse;

      const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[ch]));
      const safeBody = String(article.body_html || "")
        .replace(/<\s*(script|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
        .replace(/<\s*(script|iframe|object|embed|form)\b[^>]*\/?>/gi, "")
        .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "");
      const title = String(article.title || "PatriaSoul članak");
      const author = article.author_display && article.author_display !== "Čuvari nasljeđa" ? article.author_display : "PatriaSoul";
      const description = String(article.source_data?.seo?.description || article.excerpt || title).slice(0, 300);
      const categoryLabels = { domovina: "Domovina", povijest: "Povijest", vjera: "Vjera", "cuvari-nasljedja": "Čuvari nasljeđa" };
      const categoryLabel = categoryLabels[cmsPathMatch[1].toLowerCase()] || "PatriaSoul";
      const imageRaw = String(article.image_url || "").trim();
      const image = imageRaw && /^(https?:|data:|blob:|\/\/)/i.test(imageRaw)
        ? (imageRaw.startsWith("//") ? "https:" + imageRaw : imageRaw)
        : imageRaw ? "https://ps.patriasoul.workers.dev/" + imageRaw.replace(/^\.\//, "").replace(/^\//, "") : "";
      const date = article.published_at ? new Intl.DateTimeFormat("hr-HR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zagreb" }).format(new Date(article.published_at)) : "";
      const sources = Array.isArray(article.source_data?.sources)
        ? article.source_data.sources.filter(value => typeof value === "string" && /^https?:\/\//i.test(value))
        : [];
      const sourcesHtml = sources.length
        ? '<section class="article-sources"><h2>Izvori</h2><ul>' + sources.map(source => '<li><a href="' + escapeHtml(source) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(source.replace(/^https?:\/\//i, "").slice(0, 140)) + '</a></li>').join("") + '</ul></section>'
        : "";
      const canonical = "https://ps.patriasoul.workers.dev/" + publicPath;
      const html = [
        '<!doctype html><html lang="hr" data-patriasoul-cms="true"><head>',
        '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
        '<title>' + escapeHtml(article.source_data?.seo?.title || title) + ' · PatriaSoul</title>',
        '<meta name="description" content="' + escapeHtml(description) + '"><meta name="author" content="' + escapeHtml(author) + '">',
        '<link rel="canonical" href="' + escapeHtml(canonical) + '">',
        '<meta property="og:type" content="article"><meta property="og:site_name" content="PatriaSoul"><meta property="og:locale" content="hr_HR">',
        '<meta property="og:title" content="' + escapeHtml(title) + '"><meta property="og:description" content="' + escapeHtml(description) + '"><meta property="og:url" content="' + escapeHtml(canonical) + '">',
        image ? '<meta property="og:image" content="' + escapeHtml(image) + '">' : "",
        '<link rel="stylesheet" href="/assets/css/modern-articles.css"></head><body>',
        '<main class="container article-page" data-modern-article="true"><span class="kicker">' + escapeHtml(categoryLabel.toLocaleUpperCase("hr-HR")) + (article.subcategory ? " · " + escapeHtml(article.subcategory) : "") + '</span>',
        '<h1>' + escapeHtml(title) + '</h1>',
        article.excerpt ? '<p class="article-deck">' + escapeHtml(article.excerpt) + '</p>' : "",
        '<div class="article-meta">Autor: ' + escapeHtml(author) + (date ? " · " + escapeHtml(date) : "") + '</div>',
        image ? '<figure class="article-figure"><img class="article-hero" src="' + escapeHtml(image) + '" alt="' + escapeHtml(article.image_alt || title) + '" loading="eager" decoding="async"><figcaption>' + escapeHtml(article.image_alt || title) + '</figcaption></figure>' : "",
        '<article class="article-body">' + safeBody + '</article>', sourcesHtml,
        '<p class="editorial-note"><strong>PatriaSoul — Čuvari nasljeđa</strong><br>Čuvamo priče. Provjeravamo činjenice. Prenosimo nasljeđe.</p></main>',
        '<footer class="site-footer"><div class="container"><strong>PatriaSoul</strong><p>Čuvamo priče. Provjeravamo činjenice. Prenosimo nasljeđe.</p></div></footer>',
        '<script src="/assets/js/portal.js"></script></body></html>'
      ].join("\n");
      return new Response(request.method === "HEAD" ? null : html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          "X-Content-Type-Options": "nosniff"
        }
      });
    } catch (error) {
      console.error("CMS article fallback failed", error);
      return assetResponse;
    }
  },
};
