const fs = require("fs");
const path = require("path");

const root = path.resolve(process.argv[2] || process.cwd());
const htmlFiles = [];
const knownFiles = new Set();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "_site"].includes(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else {
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      knownFiles.add(relative);
      if (entry.name.toLowerCase().endsWith(".html")) htmlFiles.push({ absolute, relative });
    }
  }
}
walk(root);

const idsByFile = new Map();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file.absolute, "utf8");
  const ids = new Set();
  for (const match of html.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/gi)) ids.add(match[1]);
  idsByFile.set(file.relative, ids);
}

function resolveLocalPath(fromFile, rawUrl) {
  let decoded = rawUrl;
  try { decoded = decodeURIComponent(rawUrl); } catch {}
  decoded = decoded.split("?")[0].split("#")[0];
  if (!decoded || decoded === "/") return "index.html";
  let target = decoded.startsWith("/")
    ? decoded.replace(/^\/+/, "")
    : path.posix.join(path.posix.dirname(fromFile), decoded);
  target = path.posix.normalize(target).replace(/^\.\//, "");
  if (target === "." || target === "") return "index.html";
  const candidates = [target];
  if (target.endsWith("/")) candidates.push(target + "index.html");
  else if (!path.posix.extname(target)) candidates.push(target + ".html", target + "/index.html");
  return candidates.find(candidate => knownFiles.has(candidate)) || candidates[0];
}

function isDynamicTemplate(url) {
  return /\$\{|\b(?:esc|safeUrl)\s*\(|\b(?:x|a|item|n)\.[A-Za-z_$]|\+\s*(?:esc|safeUrl|root|url|x\.|a\.|item\.|n\.)|['"]\s*\+/i.test(url);
}

const broken = [];
let checked = 0;
const attrPattern = /(?:^|\s)(href|src|action|formaction|poster|data-href|data-url)\s*=\s*(["'])(.*?)\2/gi;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file.absolute, "utf8");
  for (const match of html.matchAll(attrPattern)) {
    const attr = match[1].toLowerCase();
    const url = (match[3] || "").trim();
    if (!url || isDynamicTemplate(url) || /^(?:https?:|mailto:|tel:|javascript:|data:|blob:|\/\/)/i.test(url)) continue;
    if (/^(?:about:blank|#)$/i.test(url)) continue;
    checked++;

    const hashIndex = url.indexOf("#");
    const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
    const rawPath = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    if (!rawPath) {
      if (fragment) {
        let decodedFragment = fragment;
        try { decodedFragment = decodeURIComponent(fragment); } catch {}
        if (!idsByFile.get(file.relative)?.has(decodedFragment)) {
          broken.push({ from: file.relative, attr, url, reason: "nepostojeće sidro na istoj stranici" });
        }
      }
      continue;
    }

    const target = resolveLocalPath(file.relative, rawPath);
    if (!knownFiles.has(target)) {
      broken.push({ from: file.relative, attr, url, target, reason: "datoteka ne postoji" });
      continue;
    }
    if (fragment && target.toLowerCase().endsWith(".html") && idsByFile.has(target)) {
      let decodedFragment = fragment;
      try { decodedFragment = decodeURIComponent(fragment); } catch {}
      if (!idsByFile.get(target).has(decodedFragment)) {
        broken.push({ from: file.relative, attr, url, target, reason: "sidro ne postoji na ciljnoj stranici" });
      }
    }
  }
}

console.log("Provjerena web-mapa:", root);
console.log("HTML stranice:", htmlFiles.length);
console.log("Provjerene lokalne poveznice, slike i obrasci:", checked);
console.log("Pronađene neispravne poveznice:", broken.length);
if (broken.length) {
  for (const item of broken.slice(0, 250)) {
    console.error(`BROKEN: ${item.from} -> ${item.url} [${item.attr}] — ${item.reason}${item.target ? " (" + item.target + ")" : ""}`);
  }
  if (broken.length > 250) console.error("Prikazano prvih 250 od ukupno " + broken.length + ".");
  process.exit(1);
}
console.log("LINK QA OK");
