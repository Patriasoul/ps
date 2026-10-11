const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const requiredFiles = [
  "index.html",
  "assets/js/portal.js",
  "assets/js/auth.js",
  "stranice/domoljubni-forum.html",
  "stranice/poruke-obavijesti.html",
  "stranice/vrijeme.html",
  "stranice/na-danasnji-dan.html",
  "stranice/prijava.html",
  "stranice/registracija.html",
  "stranice/racun.html",
  "stranice/administracija.html",
  "kviz/index.html",
  "kviz/package.json",
  "data/navigation.json",
  "scripts/qa/qa-links.js",
  ".github/workflows/pages.yml"
];
const missing = requiredFiles.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("STRUKTURA FAIL — nedostaju potrebne datoteke:", missing);
  process.exit(1);
}

for (const directory of ["assets", "data", "scripts", "stranice", "kviz"]) {
  if (!fs.statSync(path.join(root, directory)).isDirectory()) {
    console.error("STRUKTURA FAIL — očekivana mapa nije mapa:", directory);
    process.exit(1);
  }
}

const nav = JSON.parse(fs.readFileSync(path.join(root, "data/navigation.json"), "utf8"));
if (!Array.isArray(nav.main) || !Array.isArray(nav.secondary)) {
  console.error("STRUKTURA FAIL — navigation.json mora imati polja main i secondary.");
  process.exit(1);
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const label of ["Domoljubni forum", "Hrvatski kviz", "Poruke i obavijesti", "Vrijeme u Hrvatskoj", "Na današnji dan"]) {
  if (!index.includes(label)) {
    console.error("STRUKTURA FAIL — naslovnica ne spominje sačuvanu funkciju:", label);
    process.exit(1);
  }
}

console.log("STRUKTURA OK — postojeće funkcije zajednice i njihove ulazne datoteke su sačuvane.");
