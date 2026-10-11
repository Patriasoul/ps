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
  "stranice/zid-zajednice.html",
  "stranice/grupe-dogadjaji.html",
  "stranice/profil.html",
  "assets/css/public-profile.css",
  "assets/js/public-profile.js",
  "assets/css/community-hub.css",
  "assets/js/community-hub.js",
  "assets/css/social-wall.css",
  "assets/js/social-wall.js",
  "supabase/migrations/202610110001_social_wall.sql",
  "supabase/migrations/202610110002_my_leaderboard_position.sql",
  "supabase/migrations/202610110003_account_lifecycle_requests.sql",
  "stranice/administracija.html",
  "stranice/pretraga.html",
  "kviz/index.html",
  "assets/js/portal.js",
  "assets/js/auth.js",
  "assets/js/admin.js",
  "data/navigation.json",
  "data/search-index.json",
  "assets/js/search.js",
  "scripts/build/generate-discovery.js"
];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("ZAJEDNICA QA FAIL — nedostaju datoteke:", missing);
  process.exit(1);
}

const files = ["index.html", "assets/js/portal.js", "data/navigation.json", "stranice/administracija.html", "stranice/domoljubni-forum.html", "stranice/grupe-dogadjaji.html", "kviz/src/App.jsx", "worker.js"];
const contentByFile = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(root, file), "utf8")]));
const stalePatterns = [
  ["index.html", /(?:clanci\/|kategorije\/|stranice\/najnovije\.html|cuvari-nasljedja\/prijavi-pricu\.html)/],
  ["assets/js/portal.js", /(?:kategorije\/|stranice\/najnovije\.html|cuvari-nasljedja\/prijavi-pricu\.html)/],
  ["stranice/administracija.html", /(?:data-admin-tab="content"|data-admin-tab="editorial"|data-admin-tab="ai"|data-admin-tab="archive"|assets\/js\/ai-article\.js|assets\/js\/article-editor\.js|id="articles-manage"|id="published-articles-manage"|id="article-editor"|rss_editorial_drafts|portal_articles|Najnoviji članci)/],
  ["worker.js", /(?:portal_articles|\/api\/rss|kategorije\/)/],
  ["assets/js/search.js", /data\/articles\.json/]
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
for (const label of ["auth.getUser()", 'from("profiles")', "manageForum(c", "manageStories(c)", "manageSocialWall(c", "wall-reports-manage", "wall-posts-manage"]) {
  if (!adminJs.includes(label)) throw new Error("Nedostaje administratorska funkcija zajednice: " + label);
}
const wall = fs.readFileSync(path.join(root, "stranice/zid-zajednice.html"), "utf8");
for (const token of ["ps-wall-post-form", "ps-wall-feed", "ps-wall-link-url", "ps-wall-link-title", "social-wall.css", "social-wall.js"]) {
  if (!wall.includes(token)) throw new Error("Zidu zajednice nedostaje element: " + token);
}
for (const [file, token] of [
  ["stranice/domoljubni-forum.html", "data-share-topic"],
  ["stranice/domoljubni-forum.html", "shareType"],
  ["kviz/src/App.jsx", "Podijeli rezultat na zidu"],
  ["kviz/src/App.jsx", "shareType"]
]) {
  if (!contentByFile[file].includes(token)) throw new Error("Nedostaje dijeljenje izvornog sadržaja na zidu: " + file + " · " + token);
}
const wallJs = fs.readFileSync(path.join(root, "assets/js/social-wall.js"), "utf8");
if (!wallJs.includes("cleanReason.length<3")) throw new Error("Prijava sadržaja mora provjeriti minimalnu duljinu razloga.");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/202610110001_social_wall.sql"), "utf8");
for (const token of ["enable row level security", "community_posts", "community_post_reports", "community_user_blocks", "community-media", "link_url", "community_posts_link_url_check", "community_groups", "community_group_members", "community_events", "community_event_attendees", "cover_image_path", "profile_cover.cover_image_path = name", "grant update (cover_image_path) on public.profiles to authenticated;", "revoke update (cover_image_path) on public.profiles from anon;", "community_add_group_owner()", "community_group_add_owner"]) {
  if (!migration.includes(token)) throw new Error("Migraciji društvenog zida nedostaje zaštita ili tablica: " + token);
}
if (!migration.includes("with check(owner_id=auth.uid() or exists(select 1 from public.community_group_members gm where gm.group_id=id and gm.user_id=auth.uid() and gm.role='moderator')")) throw new Error("RLS pravilo ne dopušta moderatoru sigurno uređivanje njegove grupe.");
if (migration.includes("grant select,insert,update on public.community_groups to authenticated;")) throw new Error("Nesigurno: korisnici ne smiju imati opće UPDATE ovlasti nad grupama.");
if (!migration.includes("revoke update on public.community_groups from authenticated;") || !migration.includes("grant update (name,description,visibility,updated_at) on public.community_groups to authenticated;")) throw new Error("Nedostaju ograničene UPDATE ovlasti za uređivanje grupa.");
const profilePage = fs.readFileSync(path.join(root, "stranice/profil.html"), "utf8");
for (const token of ["profile-card", "profile-posts", "profile-cover", "profile-cover-input", "public-profile.js", "public-profile.css"]) { if (!profilePage.includes(token)) throw new Error("Javnom profilu nedostaje element: " + token); }
const profileJs = fs.readFileSync(path.join(root, "assets/js/public-profile.js"), "utf8");
for (const token of ["ps-profile-sidebar", "racun.html", "pravila-koristenja-i-sigurnosti.html", "domoljubni-forum.html", "get_my_leaderboard_position", "profile-rank-status", "requestedId||user.id"]) {
  if (!profilePage.includes(token) && !profileJs.includes(token)) throw new Error("Profilu nedostaje bočna navigacija ili rang-lista: " + token);
}
const rankMigration = fs.readFileSync(path.join(root, "supabase/migrations/202610110002_my_leaderboard_position.sql"), "utf8");
for (const token of ["get_my_leaderboard_position", "auth.uid()", "row_number() over", "grant execute on function public.get_my_leaderboard_position(text) to authenticated"]) {
  if (!rankMigration.includes(token)) throw new Error("Migraciji osobne rang-liste nedostaje zaštita ili funkcija: " + token);
}
const lifecycleMigration = fs.readFileSync(path.join(root, "supabase/migrations/202610110003_account_lifecycle_requests.sql"), "utf8");
for (const token of ["account_lifecycle_requests", "auth.uid()", "members submit own lifecycle requests", "administrators process lifecycle requests", "status in ('pending','in_review','completed','rejected')"]) {
  if (!lifecycleMigration.includes(token)) throw new Error("Migraciji zahtjeva računa nedostaje sigurnosna provjera: " + token);
}
const accountPage = fs.readFileSync(path.join(root, "stranice/racun.html"), "utf8");
for (const token of ['id="sigurnost"', 'id="deaktivacija"', 'updateUser({email})', 'updateUser({password})', "Zatraži deaktivaciju", "Zatraži brisanje računa", "account_lifecycle_requests", "loadLifecycleRequests", "administrator ne obradi zahtjev"]) {
  if (!accountPage.includes(token)) throw new Error("Postavkama računa nedostaje funkcija: " + token);
}
if (!accountPage.includes("ne briše račun automatski")) throw new Error("Zahtjev za brisanje mora jasno objasniti da je potrebna administratorska obrada.");
const hub = fs.readFileSync(path.join(root, "stranice/grupe-dogadjaji.html"), "utf8");
for (const token of ["hub-search-form", "hub-group-form", "hub-event-form", "community-hub.js"]) {
  if (!hub.includes(token)) throw new Error("Stranici grupa i događaja nedostaje element: " + token);
}
if (!contentByFile["assets/js/portal.js"].includes("stranice/grupe-dogadjaji.html")) throw new Error("Grupe i događaji nisu povezani u zajedničkoj navigaciji.");
const hubJs = fs.readFileSync(path.join(root, "assets/js/community-hub.js"), "utf8");
if (hubJs.includes('from("community_group_members").insert({group_id:data.id,user_id:user.id,role:"owner"})')) throw new Error("Vlasničko članstvo mora se stvoriti atomski kroz bazni trigger.");
console.log("ZAJEDNICA QA OK — postojeće funkcije su sačuvane; zid i migracija društvenih funkcija postoje.");
