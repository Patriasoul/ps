#!/usr/bin/env node
"use strict";

// PatriaSoul pregled dana: prikuplja javne RSS izvore, sažima ih i sprema dnevni JSON.
// Namjerno se ne objavljuje ništa ako izvori ne daju nijednu provjerljivu stavku.

const fs = require("node:fs/promises");
const path = require("node:path");

const OUT = path.join(process.cwd(), "data", "vazne-obavijesti.json");
const TZ = "Europe/Zagreb";
const FEEDS = [
  { url: "https://feed.hrt.hr/vijesti/hrvatska.xml", category: "Hrvatska" },
  { url: "https://feed.hrt.hr/vijesti/page.xml", category: "Hrvatska i svijet" },
  { url: "https://feed.hrt.hr/sport/page.xml", category: "Sport" },
];

function localDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const pick = key => parts.find(p => p.type === key)?.value;
  return { year: Number(pick("year")), month: Number(pick("month")), day: Number(pick("day")) };
}
function dateKey(date = new Date()) {
  const p = localDateParts(date);
  return [p.year, String(p.month).padStart(2, "0"), String(p.day).padStart(2, "0")].join("-");
}
function xmlText(block, tag) {
  const match = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  if (!match) return "";
  return decodeEntities(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch { return ""; }
}
async function readFeed(feed) {
  const response = await fetch(feed.url, {
    headers: { "user-agent": "PatriaSoul-PregledDana/1.0 (+https://ps.patriasoul.workers.dev/)", accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("RSS HTTP " + response.status + " za " + feed.url);
  const xml = await response.text();
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match, i) => {
    const block = match[1];
    const title = xmlText(block, "title");
    const link = safeUrl(xmlText(block, "link"));
    const description = xmlText(block, "description").slice(0, 900);
    const pubDate = xmlText(block, "pubDate") || xmlText(block, "dc:date");
    if (!title || !link) return null;
    const parsedDate = pubDate && !Number.isNaN(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : null;
    return { title, url: link, description, publishedAt: parsedDate, category: feed.category, _order: i };
  }).filter(Boolean);
}
function easterSunday(year) {
  // Gregorian computus (Meeus/Jones/Butcher).
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
function addDays(date, days) { const out = new Date(date); out.setUTCDate(out.getUTCDate() + days); return out; }
function calendarItems(today) {
  const p = localDateParts(today), y = p.year;
  const easter = easterSunday(y);
  const fixed = [
    ["01-01", "Nova godina", "Blagdan", "Početak nove kalendarske godine."],
    ["01-06", "Bogojavljenje – Sveta tri kralja", "Blagdan", "Katolički blagdan Bogojavljenja."],
    ["05-01", "Praznik rada", "Blagdan", "Dan posvećen radu i radničkim pravima."],
    ["05-30", "Dan državnosti Republike Hrvatske", "Obljetnica", "Hrvatska obilježava Dan državnosti."],
    ["06-22", "Dan antifašističke borbe", "Obljetnica", "Državni spomendan posvećen antifašističkoj borbi."],
    ["08-05", "Dan pobjede i domovinske zahvalnosti i Dan hrvatskih branitelja", "Obljetnica", "Hrvatska se prisjeća pobjede u Domovinskom ratu i odaje počast braniteljima."],
    ["08-15", "Velika Gospa", "Blagdan", "Svetkovina Uznesenja Blažene Djevice Marije."],
    ["11-01", "Svi sveti", "Blagdan", "Dan spomena na sve svete."],
    ["11-18", "Dan sjećanja na žrtve Domovinskog rata i Dan sjećanja na žrtvu Vukovara i Škabrnje", "Obljetnica", "Dan sjećanja na žrtve Domovinskog rata, Vukovara i Škabrnje."],
    ["12-25", "Božić", "Blagdan", "Kršćani slave rođenje Isusa Krista."],
    ["12-26", "Sveti Stjepan", "Blagdan", "Blagdan svetog Stjepana prvomučenika."],
  ];
  const entries = fixed.filter(([md]) => md === String(p.month).padStart(2, "0") + "-" + String(p.day).padStart(2, "0"))
    .map(([md, title, category, summary]) => ({ id: "calendar-" + y + "-" + md, category, title, summary, source: "Kalendar blagdana i spomendana PatriaSoul", sourceUrl: "https://gov.hr/", eventDate: dateKey(today), priority: 4 }));
  const movable = [
    [easter, "Uskrs", "Blagdan", "Kršćani slave uskrsnuće Isusa Krista."],
    [addDays(easter, 1), "Uskrsni ponedjeljak", "Blagdan", "Dan nakon Uskrsa."],
    [addDays(easter, 49), "Duhovi", "Blagdan", "Kršćanski blagdan silaska Duha Svetoga."],
    [addDays(easter, 60), "Tijelovo", "Blagdan", "Katolička svetkovina Presvetoga Tijela i Krvi Kristove."],
  ];
  for (const [date, title, category, summary] of movable) {
    if (date.toISOString().slice(0, 10) === dateKey(today)) entries.push({ id: "calendar-" + y + "-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), category, title, summary, source: "Liturgijski kalendar", sourceUrl: "https://hbk.hr/", eventDate: dateKey(today), priority: 4 });
  }
  return entries;
}
async function aiCurate(articles, today) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const payload = {
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: "Ti si urednik hrvatskog portala PatriaSoul. Pišeš na hrvatskom standardnom jeziku. Koristi ISKLJUČIVO činjenice iz dostavljenih RSS zapisa. Ne izmišljaj događaje, datume, rezultate, izjave ni poveznice. Ako je opis nepotpun, sažetak formuliraj oprezno samo iz naslova. Odaberi najvažnije i različite stavke za današnji pregled; izbjegni duplikate, senzacionalizam i trivijalnosti. Svaki sažetak ima jednu ili dvije kratke rečenice. Vrati samo valjani JSON objekt oblika {\"items\":[{\"title\":\"...\",\"summary\":\"...\",\"category\":\"Hrvatska|Svijet|Sport|Kultura|Gospodarstvo\",\"sourceUrl\":\"točan URL iz ulaza\",\"publishedAt\":\"ISO datum ili null\",\"priority\":1}]}. Ne dodaj Markdown." },
      { role: "user", content: "Pripremi PatriaSoul pregled dana za datum " + today + ". Odaberi najviše 10 stavki iz ovih RSS zapisa. Prioritet 1 znači najvažnije. Ulazni zapisi: " + JSON.stringify(articles.slice(0, 45)) }
    ],
    response_format: { type: "json_object" },
  };
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { authorization: "Bearer " + process.env.OPENROUTER_API_KEY, "content-type": "application/json", "HTTP-Referer": "https://ps.patriasoul.workers.dev/", "X-Title": "PatriaSoul pregled dana" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error("OpenRouter HTTP " + response.status + ": " + (await response.text()).slice(0, 500));
  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter nije vratio sadržaj.");
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.items)) throw new Error("AI odgovor nema polje items.");
  const allowed = new Map(articles.map(item => [item.url, item]));
  return parsed.items.slice(0, 10).map((item, i) => {
    const original = allowed.get(safeUrl(item.sourceUrl));
    if (!original || !item.title || !item.summary) return null;
    return {
      id: "news-" + dateKey(new Date()) + "-" + i,
      category: ["Hrvatska", "Svijet", "Sport", "Kultura", "Gospodarstvo"].includes(item.category) ? item.category : original.category,
      title: String(item.title).trim().slice(0, 180),
      summary: String(item.summary).trim().slice(0, 500),
      source: "HRT",
      sourceUrl: original.url,
      publishedAt: original.publishedAt,
      priority: Math.max(1, Math.min(3, Number(item.priority) || 2)),
    };
  }).filter(Boolean);
}
function fallbackSummaries(articles) {
  const seen = new Set();
  return articles.filter(item => {
    const key = item.title.toLocaleLowerCase("hr-HR");
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 10).map((item, i) => ({
    id: "rss-" + dateKey(new Date()) + "-" + i,
    category: item.category,
    title: item.title,
    summary: item.description || item.title,
    source: "HRT",
    sourceUrl: item.url,
    publishedAt: item.publishedAt,
    priority: item.category === "Sport" ? 2 : 1,
  }));
}
async function main() {
  const now = new Date();
  const date = dateKey(now);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const localHour = Number(parts.find(p => p.type === "hour")?.value);
  if (process.env.GITHUB_EVENT_NAME === "schedule" && localHour !== 5) {
    console.log("Preskačem duplu UTC zakazanu provjeru; lokalno vrijeme u Hrvatskoj nije 05:00.");
    return;
  }
  const results = await Promise.allSettled(FEEDS.map(readFeed));
  const articles = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
  for (const result of results) if (result.status === "rejected") console.warn("RSS upozorenje:", result.reason?.message || result.reason);
  const cutoff = now.getTime() - 48 * 60 * 60 * 1000;
  const fresh = articles.filter(item => !item.publishedAt || Date.parse(item.publishedAt) >= cutoff);
  if (!fresh.length) throw new Error("RSS izvori nisu vratili svježe stavke; postojeći pregled ostaje sačuvan.");
  let items;
  try {
    items = await aiCurate(fresh, date);
  } catch (error) {
    console.warn("AI sažimanje nije uspjelo; koristim sažetke iz izvornog RSS-a:", error.message);
    items = null;
  }
  if (!items?.length) items = fallbackSummaries(fresh);
  items = [...calendarItems(now), ...items].slice(0, 14);
  const output = { date, generatedAt: now.toISOString(), source: "PatriaSoul · HRT RSS" + (process.env.OPENROUTER_API_KEY ? " · AI sažimanje" : ""), items };
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log("Spremljen PatriaSoul pregled dana:", date, "stavki:", items.length, "AI:", Boolean(process.env.OPENROUTER_API_KEY));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
