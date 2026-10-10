#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ijimozjfdffejbczwyzb.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_SvuPtQUmXamt1a1_JpU6Jg_Bf3Fshqr";
const BASE_URL = "https://ps.patriasoul.workers.dev/";
const categorySlugs = {
  "domovina": "domovina", "povijest": "povijest", "vjera": "vjera",
  "čuvari nasljeđa": "cuvari-nasljedja", "cuvari nasljedja": "cuvari-nasljedja"
};
const categoryLabels = { domovina: "Domovina", povijest: "Povijest", vjera: "Vjera", "cuvari-nasljedja": "Čuvari nasljeđa" };
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
const slugify = value => String(value || "").toLocaleLowerCase("hr-HR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const normalizeImageUrl = value => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(?:https?:|data:|blob:|\/\/)/i.test(raw)) return raw.startsWith("//") ? "https:"+raw : raw;
  return BASE_URL + raw.replace(/^\.\//, "").replace(/^\//, "");
};
const normalizeBodyImages = html => String(html || "").replace(/(<img\b[^>]*\bsrc\s*=\s*)(["'])([^"']+)\2/gi, (all, before, quote, src) => before + quote + normalizeImageUrl(src) + quote);
const formatDate = value => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("hr-HR", { day:"numeric", month:"long", year:"numeric", timeZone:"Europe/Zagreb" }).format(d);
};
async function main() {
  const endpoint = new URL("/rest/v1/portal_articles", SUPABASE_URL);
  endpoint.searchParams.set("select", "id,slug,path,title,kicker,category,subcategory,excerpt,body_html,image_url,image_alt,author_display,status,published_at,source_data");
  endpoint.searchParams.set("status", "eq.published");
  endpoint.searchParams.set("order", "published_at.desc.nullslast");
  const response = await fetch(endpoint, { headers: { apikey:SUPABASE_KEY, Authorization:"Bearer "+SUPABASE_KEY, Accept:"application/json" } });
  if (!response.ok) throw new Error("CMS članci nisu dohvaćeni iz Supabasea (HTTP "+response.status+"): "+(await response.text()).slice(0,400));
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Supabase nije vratio popis članaka.");
  let created = 0;
  const seen = new Set();
  for (const article of rows) {
    const key = String(article.category || "").toLocaleLowerCase("hr-HR").trim();
    const category = categorySlugs[key] || "";
    if (!category) throw new Error("Nepoznata CMS kategorija: "+(article.title || article.id)+" ("+article.category+")");
    // The CMS public path is the source of truth; otherwise a stale slug can
    // generate the page at a different URL than the one shown in administration.
    const storedPath = String(article.path || "").replace(/^\/+/, "");
    const safeStoredPath = storedPath.match(/^clanci\/(domovina|povijest|vjera|cuvari-nasljedja)\/(clanak-[a-z0-9-]+\.html)$/i);
    let relativePath;
    let slug;
    if (safeStoredPath && safeStoredPath[1].toLowerCase() === category) {
      relativePath = "clanci/" + category + "/" + safeStoredPath[2];
      slug = safeStoredPath[2].replace(/^clanak-/, "").replace(/\.html$/i, "");
    } else {
      slug = slugify(article.slug || path.basename(storedPath, ".html").replace(/^clanak-/, ""));
      if (!slug) throw new Error("Članak nema valjan slug: "+(article.title || article.id));
      relativePath = "clanci/"+category+"/clanak-"+slug+".html";
      if (storedPath && storedPath !== relativePath) console.log("PATH_NORMALIZED "+article.id+" "+storedPath+" -> "+relativePath);
    }
    if (seen.has(relativePath)) throw new Error("Dvostruka javna putanja u CMS-u: "+relativePath);
    seen.add(relativePath);
    const output = path.join(process.cwd(), relativePath);
    fs.mkdirSync(path.dirname(output), { recursive:true });
    const title = String(article.title || "PatriaSoul članak");
    const author = article.author_display && article.author_display !== "Čuvari nasljeđa" ? article.author_display : "PatriaSoul";
    const description = String(article.source_data?.seo?.description || article.excerpt || title).slice(0,300);
    const rawImageUrl = String(article.image_url || "").trim();
    // A PDF/document URL is not a usable <img> source. Never publish it as a hero image.
    const image = /\\.pdf(?:[?#]|$)/i.test(rawImageUrl) ? "" : normalizeImageUrl(rawImageUrl);
    const imageCredit = article.source_data?.image_credit && article.source_data?.image_source
      ? '<small class="article-image-credit">Kredit: <a href="'+esc(article.source_data.image_source)+'" target="_blank" rel="noopener noreferrer">'+esc(article.source_data.image_credit)+'</a> · licenca <a href="https://creativecommons.org/licenses/by-sa/3.0/hr/deed.hr" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0 HR</a></small>'
      : "";
    const imageAlt = String(article.image_alt || title);
    const label = categoryLabels[category] || "PatriaSoul";
    const date = formatDate(article.published_at);
    const sources = Array.isArray(article.source_data?.sources) ? article.source_data.sources.filter(x => typeof x === "string" && /^https?:\/\//i.test(x)) : [];
    const sourcesHtml = sources.length ? '<section class="article-sources"><h2>Izvori</h2><ul>'+sources.map(url=>'<li><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(url.replace(/^https?:\/\//i,"").slice(0,140))+'</a></li>').join("")+'</ul></section>' : "";
    const imageHtml = image ? '<figure class="article-figure"><img class="article-hero" src="'+esc(image)+'" alt="'+esc(imageAlt)+'" loading="eager" decoding="async"><figcaption>'+esc(imageAlt)+imageCredit+'</figcaption></figure>' : "";
    const canonical = BASE_URL+relativePath;
    const page = [
      '<!doctype html><html lang="hr" data-patriasoul-cms="true"><head>',
      '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>'+esc(article.source_data?.seo?.title || title)+' · PatriaSoul</title>',
      '<meta name="description" content="'+esc(description)+'"><meta name="author" content="'+esc(author)+'">',
      '<link rel="canonical" href="'+esc(canonical)+'">',
      '<meta property="og:type" content="article"><meta property="og:site_name" content="PatriaSoul"><meta property="og:locale" content="hr_HR">',
      '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(canonical)+'">',
      image ? '<meta property="og:image" content="'+esc(image)+'">' : "",
      '<link rel="stylesheet" href="../../assets/css/modern-articles.css"></head><body>',
      '<main class="container article-page" data-modern-article="true"><span class="kicker">'+esc(label.toLocaleUpperCase("hr-HR"))+(article.subcategory ? " · "+esc(article.subcategory) : "")+'</span>',
      '<h1>'+esc(title)+'</h1>',
      article.excerpt ? '<p class="article-deck">'+esc(article.excerpt)+'</p>' : "",
      '<div class="article-meta">Autor: '+esc(author)+(date ? " · "+esc(date) : "")+'</div>',
      imageHtml, '<article class="article-body">'+normalizeBodyImages(article.body_html || "")+'</article>', sourcesHtml,
      '<p class="editorial-note"><strong>PatriaSoul — Čuvari nasljeđa</strong><br>Čuvamo priče. Provjeravamo činjenice. Prenosimo nasljeđe.</p></main>',
      '<footer class="site-footer"><div class="container"><strong>PatriaSoul</strong><p>Čuvamo priče. Provjeravamo činjenice. Prenosimo nasljeđe.</p></div></footer>',
      '<script src="../../assets/js/portal.js"></script></body></html>'
    ].join("\n");
    if (fs.existsSync(output) && !fs.readFileSync(output,"utf8").includes('data-patriasoul-cms="true"')) throw new Error("CMS putanja bi prepisala postojeći ručni članak: "+relativePath);
    if (!fs.existsSync(output) || fs.readFileSync(output,"utf8") !== page) { fs.writeFileSync(output,page,"utf8"); created++; }
    if (article.path !== relativePath) console.log("PATH_MISMATCH "+article.id+" "+relativePath+" (DB: "+article.path+")");
    console.log("CMS_PAGE "+relativePath+" | "+title);
  }
  console.log("CMS statične stranice: "+rows.length+" objavljenih zapisa, "+created+" stranica izrađeno/ažurirano.");
}
main().catch(error=>{console.error(error);process.exit(1);});
