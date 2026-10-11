const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const base = "https://ps.patriasoul.workers.dev/";
const excluded = new Set([
  "404.html",
  "googlef31b6b8a66adf403.html",
  "stranice/prijava.html",
  "stranice/registracija.html",
  "stranice/racun.html",
  "stranice/administracija.html",
  "stranice/newsletter.html",
  "stranice/kolacici.html",
  "stranice/pretraga.html"
]);
const publicPages = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "_site", "kviz", "clanci", "kategorije"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
      continue;
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".html")) continue;
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (excluded.has(relative)) continue;
    const html = fs.readFileSync(absolute, "utf8");
    const strip = value => String(value || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ")
      .trim();
    const title = strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]) || relative;
    const descriptionTag = html.match(/<meta\b[^>]*name=["']description["'][^>]*>/i);
    const description = descriptionTag
      ? strip((descriptionTag[0].match(/content=["']([^"']*)["']/i) || [])[1])
      : "";
    const body = (html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i) || [])[1] || html;
    const text = strip(body).slice(0, 5000);
    const url = relative === "index.html" ? base : base + relative;
    publicPages.push({ title, description, category: "PatriaSoul", url: relative === "index.html" ? "" : relative, text });
  }
}

walk(root);
publicPages.sort((a, b) => a.title.localeCompare(b.title, "hr"));
const urls = new Set([base, ...publicPages.map(page => base + page.url)]);
if (fs.existsSync(path.join(root, "kviz", "index.html"))) urls.add(base + "kviz/");
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  [...urls].sort().map(url => "  <url><loc>" + url + "</loc></url>").join("\n") +
  "\n</urlset>\n";
fs.writeFileSync("sitemap.xml", sitemap);
fs.writeFileSync("robots.txt", "User-agent: *\nAllow: /\nSitemap: " + base + "sitemap.xml\n");
fs.writeFileSync("data/search-index.json", JSON.stringify(publicPages, null, 2) + "\n");

const rss = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<rss version="2.0"><channel>' +
  '<title>PatriaSoul — Zajednica čuvara nasljeđa</title>' +
  '<link>' + base + '</link>' +
  '<description>RSS feed portala PatriaSoul. U ovoj fazi portal je usmjeren na zajednicu, forum i kviz.</description>' +
  '<language>hr</language>' +
  '</channel></rss>\n';
fs.writeFileSync("rss.xml", rss);

console.log("DISCOVERY: generirano", urls.size, "javnih URL-ova i", publicPages.length, "stranica za pretraživanje.");
