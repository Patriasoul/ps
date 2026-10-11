const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const required = [
  "index.html",
  "stranice/domoljubni-forum.html",
  "stranice/poruke-obavijesti.html",
  "stranice/vrijeme.html",
  "stranice/na-danasnji-dan.html",
  "stranice/prijava.html",
  "stranice/registracija.html",
  "stranice/racun.html",
  "stranice/administracija.html",
  "stranice/pretraga.html",
  "kviz/index.html",
  "assets/js/portal.js",
  "assets/js/auth.js",
  "assets/js/admin.js",
  "data/navigation.json"
];
const missing = required.filter(p => !fs.existsSync(path.join(root, p)));
if (missing.length) {
  console.error("ZAJEDNICA QA FAIL — nedostaju datoteke:", missing);
  process.exit(1);
}
const content = Object.fromEntries(["index.html", "assets/js/portal.js", "data/navigation.json", "stranice/administracija.html"].map(p => [p, fs.readFileSync(path.join(root, p), "utf8")]));
const stale = [
  ["index.html", /(?:clanci\/|kategorije\/|stranice\/najnovije\.html|cuvari-nasljedja\/prijavi-pricu\.html)/],
  ["assets/js/portal.js", /(?:kategorije\/|stranice\/najnovije\.html|cuvari-nasljedja\/prijavi-pricu\.html)/],
  ["stranice/administracija.html", /(?:data-admin-tab="content"|data-admin-tab="editorial"|data-admin-tab="ai"|data-admin-tab="archive"|assets\/js\/ai-article\.js|assets\/js\/article-editor\.js)/]
];
const staleFound = stale.filter(([file, regex]) => regex.test(content[file])).map(([file]) => file);
if (staleFound.length) {
  console.error("ZAJEDNICA QA FAIL — navigacija još sadrži poveznice na uklonjene stranice:", staleFound);
  process.exit(1);
}
const nav = JSON.parse(content["data/navigation.json"]);
if (!Array.isArray(nav.main) || !Array.isArray(nav.secondary)) throw new Error("navigation.json nije valjan.");
for (const label of ["Forum", "Hrvatski kviz", "Poruke i obavijesti", "Vrijeme", "Na današnji dan"]) {
  if (!content["index.html"].includes(label)) throw new Error("Naslovnica nema sačuvanu funkciju: " + label);
}
const admin = content["stranice/administracija.html"];
for (const label of ["admin-dashboard", "admin-denied", "data-admin-tab=\\"community\\"", "data-admin-tab=\\"forum\\"", "data-admin-tab=\\"users\\""]) {
  if (!admin.includes(label)) throw new Error("Administracija nema potrebnu kontrolu: " + label);
}
console.log("ZAJEDNICA QA OK — ključne stranice postoje, stare uredničke kartice uklonjene su iz navigacije.");
