(() => {
  "use strict";
  const script = document.currentScript;
  const root = new URL("../../", script?.src || location.href).href;
  const form = document.querySelector("form");
  const input = document.querySelector("#q");
  const output = document.querySelector("[data-search-results]");
  if (!form || !input || !output) return;

  const params = new URLSearchParams(location.search);
  input.value = params.get("q") || "";
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  async function search(query) {
    const terms = query.toLocaleLowerCase("hr-HR").split(/\s+/).filter(Boolean);
    if (!terms.length) {
      output.innerHTML = "<p>Upiši pojam koji želiš pronaći.</p>";
      return;
    }
    output.innerHTML = "<p>Pretražujem postojeće stranice portala…</p>";
    try {
      const response = await fetch(root + "data/search-index.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Indeks pretraživanja nije dostupan.");
      const pages = await response.json();
      const results = pages.filter(page => {
        const text = [page.title, page.description, page.category, page.text].join(" ").toLocaleLowerCase("hr-HR");
        return terms.every(term => text.includes(term));
      }).slice(0, 30);
      output.innerHTML = results.length
        ? results.map(page => '<article class="ps-search-result"><p class="ps-kicker">' + escapeHtml(page.category || "PatriaSoul") + '</p><h2><a href="' + escapeHtml(root + page.url) + '">' + escapeHtml(page.title) + '</a></h2><p>' + escapeHtml(page.description || "") + '</p></article>').join("")
        : '<p>Nema rezultata za <strong>' + escapeHtml(query) + '</strong>.</p>';
    } catch (error) {
      console.error("PatriaSoul pretraga nije dostupna", error);
      output.innerHTML = "<p>Pretraga trenutačno nije dostupna. Pokušaj ponovno kasnije.</p>";
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const query = input.value.trim();
    history.replaceState(null, "", "?q=" + encodeURIComponent(query));
    search(query);
  });
  if (input.value) search(input.value);
})();
