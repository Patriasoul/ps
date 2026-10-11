const BASE_URL = (process.env.BASE_URL || "https://ps.patriasoul.workers.dev").replace(/\/$/, "");
const routes = [
  "/",
  "/stranice/domoljubni-forum.html",
  "/stranice/poruke-obavijesti.html",
  "/stranice/vrijeme.html",
  "/stranice/na-danasnji-dan.html",
  "/stranice/prijava.html",
  "/stranice/registracija.html",
  "/stranice/racun.html",
  "/stranice/administracija.html",
  "/stranice/pretraga.html",
  "/stranice/o-patriasoul.html",
  "/stranice/kontakt.html",
  "/kviz/",
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkRoute(route) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${route}`, {
        redirect: "follow",
        headers: { "user-agent": "PatriaSoul-live-QA/2.0" },
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.text();
      const type = response.headers.get("content-type") || "";
      const isHtml = /text\/html/i.test(type) || /<html[\s>]/i.test(body);
      const looksLikeError = /<title[^>]*>\s*(?:404|not found|error|patriasoul\s*[—-]\s*stranica nije pronađena)[^<]*<\/title>/i.test(body)
        || /<h1[^>]*>\s*(?:stranica nije pronađena|page not found)\s*<\/h1>/i.test(body);
      if (response.status === 200 && isHtml && !looksLikeError && body.length > 200) {
        console.log(`OK ${response.status} ${route} (${body.length} znakova)`);
        return true;
      }
      lastError = new Error(`HTTP ${response.status}; content-type=${type}; HTML=${isHtml}; error-page=${looksLikeError}; duljina=${body.length}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 5) await sleep(attempt * 2000);
  }
  console.error(`FAIL ${route}: ${lastError?.message || lastError}`);
  return false;
}

async function checkJson(path, validate) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, { redirect: "follow", signal: AbortSignal.timeout(15000) });
    const type = response.headers.get("content-type") || "";
    const body = await response.text();
    let data;
    try { data = JSON.parse(body); } catch { throw new Error("Odgovor nije valjan JSON."); }
    if (!response.ok || !/application\/json|text\/json/i.test(type) || !validate(data)) {
      throw new Error(`HTTP ${response.status}; content-type=${type}; JSON nije prošao provjeru.`);
    }
    console.log(`OK JSON ${path} (${body.length} znakova)`);
    return true;
  } catch (error) {
    console.error(`FAIL JSON ${path}: ${error?.message || error}`);
    return false;
  }
}

async function checkAsset(path, expectedType, validate) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, { redirect: "follow", signal: AbortSignal.timeout(15000) });
    const body = await response.text();
    const type = response.headers.get("content-type") || "";
    if (!response.ok || !expectedType.test(type) || !validate(body)) {
      console.error(`FAIL ASSET ${path}: HTTP ${response.status}; content-type=${type}; duljina=${body.length}`);
      return false;
    }
    console.log(`OK ASSET ${path} (${body.length} znakova)`);
    return true;
  } catch (error) {
    console.error(`FAIL ASSET ${path}: ${error?.message || error}`);
    return false;
  }
}

(async () => {
  console.log(`Provjera portala uživo: ${BASE_URL}`);
  const results = await Promise.all(routes.map(checkRoute));
  const jsonChecks = [
    checkJson("/data/navigation.json", data => Array.isArray(data.main) && Array.isArray(data.secondary)),
    checkJson("/data/search-index.json", data => Array.isArray(data) && data.length > 0),
    checkJson("/data/dhmz-data.json", data => Boolean(data && typeof data === "object")),
    checkJson("/data/na-danasnji-dan.json", data => Array.isArray(data) || Boolean(data && typeof data === "object")),
  ];
  const assetChecks = [
    checkAsset("/assets/js/portal.js", /javascript|ecmascript|text\/plain/i, body => body.length > 100),
    checkAsset("/assets/js/auth.js", /javascript|ecmascript|text\/plain/i, body => body.includes("PatriaSoulAuth")),
    checkAsset("/assets/js/search.js", /javascript|ecmascript|text\/plain/i, body => body.includes("data/search-index.json")),
    checkAsset("/assets/css/weather-page.css", /text\/css|text\/plain/i, body => body.length > 100),
  ];
  const allJson = (await Promise.all(jsonChecks)).every(Boolean);
  const allAssets = (await Promise.all(assetChecks)).every(Boolean);
  const failed = routes.filter((_, index) => !results[index]);
  console.log(`Rezultat: ${routes.length - failed.length}/${routes.length} stranica ispravno odgovorilo.`);
  if (failed.length || !allJson || !allAssets) {
    if (failed.length) console.error("Neispravne stranice:", failed.join(", "));
    process.exit(1);
  }
  console.log("LIVE QA OK — zajednica, kviz, JSON podaci i ključne skripte provjereni.");
})();
