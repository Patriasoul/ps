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
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("ZAJEDNICA QA FAIL — nedostaju datoteke:", missing);
  process.exit(1);
}

const files = ["index.html", "assets/js/portal.js", "data/navigation.json", "stranice/administracija.html"];
const contentByFile = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(root, file), "utf8")]));
const stalePatterns = [
  ["index.html", /(?:clanci\/|kategorije\/|stranice\/najnovije\.html|cuvari-nasljedja\/prijavi-pricu\.html)/],
  ["assets/js/portal.js", /(?:kategorije\/|stranice\/najnovije\.html|cuvari-nasljedja\/prijavi-pricu\.html)/],
  ["stranice/administracija.html", /(?:data-admin-tab="content"|data-admin-tab="editorial"|data-admin-tab="ai"|data-admin-tab="archive"|assets\/js\/ai-article\.js|assets\/js\/article-editor\.js)/]
];
const staleFound = stalePatterns.filter(([file, pattern]) => pattern.test(contentByFile[file])).map(([file]) => file);
if (staleFound.length) {
  console.error("ZAJEDNICA QA FAIL — pronađene su zastarjele poveznice ili CMS kartice:", staleFound);
  process.exit(1);
}

const nav = JSON.parse(contentByFile["data/navigation.json"]);
if (!Array.isArray(nav.main) || !Array.isArray(nav.secondary)) throw new Error("navigation.json nije valjan.");
for (const label of ["Forum", "Hrvatski kviz", "Poruke i obavijesti", "Vrijeme", "Na današnji dan"]) {
  if (!contentByFile["index.html"].includes(label)) throw new Error("Naslovnica nema sačuvanu funkciju: " + label);
}
const admin = contentByFile["stranice/administracija.html"];
for (const label of ["admin-dashboard", "admin-denied", 'data-admin-tab="community"', 'data-admin-tab="forum"', 'data-admin-tab="users"']) {
  if (!admin.includes(label)) throw new Error("Administracija nema potrebnu kontrolu: " + label);
}
const adminJs = fs.readFileSync(path.join(root, "assets/js/admin.js"), "utf8");
for (const label of ["auth.getUser()", 'from("profiles")', "manageForum(c", "manageStories(c)", "manageComments(c)"]) {
  if (!adminJs.includes(label)) throw new Error("Nedostaje administratorska funkcija zajednice: " + label);
}
console.log("ZAJEDNICA QA OK — ključne stranice i administratorske funkcije postoje; stare CMS kartice nisu u navigaciji.");
