(function () {
  const root = document.documentElement;
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme) root.dataset.theme = storedTheme;

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const nextTheme = root.dataset.theme === "dark" ? "" : "dark";
      if (nextTheme) {
        root.dataset.theme = nextTheme;
        localStorage.setItem("theme", nextTheme);
      } else {
        root.removeAttribute("data-theme");
        localStorage.removeItem("theme");
      }
    });
  }

  const paperList = document.getElementById("paperList");
  if (!paperList) return;

  const state = {
    papers: [],
    query: "",
    year: "",
    type: "",
  };

  const searchInput = document.getElementById("paperSearch");
  const yearFilter = document.getElementById("yearFilter");
  const typeFilter = document.getElementById("typeFilter");
  const stats = document.getElementById("paperStats");
  const dialog = document.getElementById("bibDialog");
  const bibText = document.getElementById("bibText");
  const copyBib = document.getElementById("copyBib");

  fetch("rob_papers.bib", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Could not load rob_papers.bib");
      return response.text();
    })
    .then((bib) => {
      state.papers = parseBibtex(bib);
      populateFilters(state.papers);
      render();
    })
    .catch((error) => {
      stats.textContent = "Could not load rob_papers.bib. If you opened this as a local file, run a small web server and reload.";
      paperList.innerHTML = `<p class="notice">${escapeHtml(error.message)}</p>`;
    });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim().toLowerCase();
    render();
  });

  yearFilter.addEventListener("change", () => {
    state.year = yearFilter.value;
    render();
  });

  typeFilter.addEventListener("change", () => {
    state.type = typeFilter.value;
    render();
  });

  document.querySelectorAll("[data-paper-search]").forEach((link) => {
    link.addEventListener("click", () => {
      state.query = link.dataset.paperSearch.toLowerCase();
      searchInput.value = link.dataset.paperSearch;
      render();
    });
  });

  paperList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bibkey]");
    if (!button) return;
    const paper = state.papers.find((item) => item.key === button.dataset.bibkey);
    if (!paper) return;
    bibText.textContent = paper.raw;
    if (dialog && typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      window.prompt("BibTeX", paper.raw);
    }
  });

  if (copyBib) {
    copyBib.addEventListener("click", () => {
      navigator.clipboard.writeText(bibText.textContent);
      copyBib.textContent = "Copied";
      setTimeout(() => {
        copyBib.textContent = "Copy BibTeX";
      }, 1200);
    });
  }

  function populateFilters(papers) {
    const years = [...new Set(papers.map((paper) => paper.fields.year).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
    const types = [...new Set(papers.map((paper) => paper.type).filter(Boolean))].sort();

    yearFilter.innerHTML = `<option value="">All years</option>${years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join("")}`;
    typeFilter.innerHTML = `<option value="">All types</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}`;
  }

  function render() {
    const filtered = state.papers.filter(matchesFilters);
    stats.textContent = `${filtered.length} of ${state.papers.length} entries shown`;
    paperList.innerHTML = filtered.map(renderPaper).join("");
  }

  function matchesFilters(paper) {
    if (state.year && paper.fields.year !== state.year) return false;
    if (state.type && paper.type !== state.type) return false;
    if (!state.query) return true;
    const haystack = [
      paper.fields.title,
      paper.fields.author,
      paper.fields.booktitle,
      paper.fields.journal,
      paper.fields.year,
      paper.fields.note,
      paper.key,
    ].join(" ").toLowerCase();
    return haystack.includes(state.query);
  }

  function renderPaper(paper) {
    const fields = paper.fields;
    const title = cleanLatex(fields.title || "Untitled");
    const authors = cleanLatex(fields.author || "").replaceAll(" and ", ", ");
    const venue = cleanLatex(fields.booktitle || fields.journal || fields.publisher || paper.type);
    const meta = [fields.year, venue].filter(Boolean).join(" / ");
    const note = fields.note ? `<div class="paper-note">${escapeHtml(cleanLatex(fields.note))}</div>` : "";
    const primaryUrl = fields.url || doiUrl(fields.doi) || arxivUrl(fields.eprint);

    return `
      <article class="paper-item">
        <div>
          <h3 class="paper-title">${primaryUrl ? `<a href="${escapeAttr(primaryUrl)}" target="_blank" rel="noopener">${escapeHtml(title)}</a>` : escapeHtml(title)}</h3>
          <span class="paper-authors">${escapeHtml(authors)}</span>
          <span class="paper-meta">${escapeHtml(meta)}</span>
          ${note}
          <div class="paper-actions">
            ${renderActions(paper)}
            <button class="paper-button" type="button" data-bibkey="${escapeAttr(paper.key)}">BibTeX</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderActions(paper) {
    const fields = paper.fields;
    const actions = [];
    const used = new Set();

    addAction(actions, used, "Preprint", fields.preprint || fields.pdf || arxivUrl(fields.eprint) || (isArxiv(fields.url) ? fields.url : ""));
    addAction(actions, used, "Publication", fields.publication || fields.proceedings || (!isArxiv(fields.url) ? fields.url : ""));
    addAction(actions, used, "DOI", doiUrl(fields.doi));
    addAction(actions, used, "Correction", fields.correction);
    addAction(actions, used, "Code", fields.code);
    addAction(actions, used, "Slides", fields.slides);
    addAction(actions, used, "Poster", fields.poster);
    addAction(actions, used, "Data", fields.data);

    return actions.join("");
  }

  function addAction(actions, used, label, url) {
    if (!url || used.has(url)) return;
    used.add(url);
    actions.push(`<a class="paper-button" href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`);
  }

  function parseBibtex(text) {
    const entries = [];
    let index = 0;

    while (index < text.length) {
      const at = text.indexOf("@", index);
      if (at === -1) break;
      const open = text.indexOf("{", at);
      if (open === -1) break;

      let depth = 0;
      let close = open;
      for (; close < text.length; close += 1) {
        const char = text[close];
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
        if (depth === 0) break;
      }

      const raw = text.slice(at, close + 1);
      const header = raw.match(/^@(\w+)\s*\{\s*([^,]+),/);
      if (header) {
        entries.push({
          type: header[1].toLowerCase(),
          key: header[2].trim(),
          fields: parseFields(raw.slice(header[0].length, -1)),
          raw: raw.trim(),
        });
      }
      index = close + 1;
    }

    return entries;
  }

  function parseFields(body) {
    const fields = {};
    let index = 0;

    while (index < body.length) {
      while (/[\s,]/.test(body[index])) index += 1;
      const nameMatch = body.slice(index).match(/^([A-Za-z][\w-]*)\s*=/);
      if (!nameMatch) break;
      const name = nameMatch[1].toLowerCase();
      index += nameMatch[0].length;
      while (/\s/.test(body[index])) index += 1;

      const parsed = readValue(body, index);
      fields[name] = parsed.value.trim();
      index = parsed.index;
    }

    return fields;
  }

  function readValue(text, index) {
    const opener = text[index];
    if (opener === "{") {
      let depth = 0;
      let end = index;
      for (; end < text.length; end += 1) {
        if (text[end] === "{") depth += 1;
        if (text[end] === "}") depth -= 1;
        if (depth === 0) break;
      }
      return { value: text.slice(index + 1, end), index: end + 1 };
    }
    if (opener === '"') {
      let end = index + 1;
      while (end < text.length && text[end] !== '"') end += 1;
      return { value: text.slice(index + 1, end), index: end + 1 };
    }
    const end = text.slice(index).search(/,\s*[A-Za-z][\w-]*\s*=|$/);
    return { value: text.slice(index, index + end).replace(/,$/, ""), index: index + end };
  }

  function cleanLatex(value) {
    return String(value)
      .replace(/\\&/g, "&")
      .replace(/\\_/g, "_")
      .replace(/\\%/g, "%")
      .replace(/\\\{/g, "{")
      .replace(/\\\}/g, "}")
      .replace(/\{\\'([A-Za-z])\}/g, "$1")
      .replace(/\{\\`([A-Za-z])\}/g, "$1")
      .replace(/\{\\\"([A-Za-z])\}/g, "$1")
      .replace(/\{\\\^([A-Za-z])\}/g, "$1")
      .replace(/\{\\c\{([A-Za-z])\}\}/g, "$1")
      .replace(/\{\\v\{([A-Za-z])\}\}/g, "$1")
      .replace(/\\[a-zA-Z]+\s*/g, "")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function arxivUrl(eprint) {
    return eprint ? `https://arxiv.org/abs/${encodeURIComponent(eprint)}` : "";
  }

  function doiUrl(doi) {
    return doi ? `https://doi.org/${doi}` : "";
  }

  function isArxiv(url) {
    return /arxiv\.org/.test(url || "");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
}());
