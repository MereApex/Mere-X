/* ============================================================
   SEARCH — site-wide index
   ============================================================ */

import { NAV } from "../data/site.js";
import { MODELS } from "../data/models.js";
import { PUBLICATIONS, NEWS, CAREERS } from "../data/content.js";
import { icon } from "../lib/icons.js";
import { pageHead } from "../components/ui.js";
import { onLeave } from "../lib/router.js";

/* Flatten everything searchable into one index. */
function buildIndex() {
  const entries = [];

  NAV.forEach((group) => {
    group.links.forEach((link) => {
      entries.push({ kind: group.label, title: link.title, desc: link.desc, href: link.href, icon: link.icon });
    });
  });

  MODELS.forEach((model) => {
    entries.push({ kind: "Model", title: model.name, desc: model.tagline, href: `/technology/models/${model.id}`, icon: model.icon });
  });

  PUBLICATIONS.forEach((paper) => {
    entries.push({ kind: "Research", title: paper.title, desc: paper.summary, href: "/research/publications", icon: "flask" });
  });

  NEWS.forEach((item) => {
    entries.push({ kind: "News", title: item.title, desc: item.summary, href: "/company/news", icon: "news" });
  });

  CAREERS.forEach((role) => {
    entries.push({ kind: "Careers", title: role.title, desc: `${role.team} · ${role.location} · ${role.type}`, href: "/company/careers", icon: "briefcase" });
  });

  entries.push(
    { kind: "Product", title: "Mere Studio", desc: "The coding agent that works on your project", href: "/products/studio", icon: "terminal" },
    { kind: "Pricing", title: "Pricing", desc: "Plans for every way of working", href: "/pricing", icon: "card" },
    { kind: "Status", title: "Platform status", desc: "Live health for every service and region", href: "/status", icon: "activity" }
  );

  return entries;
}

const INDEX = buildIndex();

const SUGGESTIONS = [
  "thinking depths", "Mere 4.2 Peak", "pricing", "agent mode",
  "checkpoints", "long context", "safety", "system card", "benchmarks"
];

function score(entry, query) {
  const title = entry.title.toLowerCase();
  const desc = (entry.desc || "").toLowerCase();
  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.includes(query)) return 60;
  if (desc.includes(query)) return 30;
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => `${title} ${desc}`.includes(w))) return 20;
  return 0;
}

function renderResults(query) {
  if (!query) {
    return `
      <p class="eyebrow" style="margin-bottom:16px">Popular</p>
      <div class="row" style="gap:8px">
        ${SUGGESTIONS.map((s) => `<button class="badge badge-plain" data-suggest="${s}" style="cursor:pointer;padding:8px 15px;font-size:var(--t-xs)">${s}</button>`).join("")}
      </div>`;
  }

  const results = INDEX
    .map((entry) => ({ entry, s: score(entry, query) }))
    .filter((row) => row.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 40);

  if (!results.length) {
  }

  return `
    <p class="xs muted" style="margin-bottom:14px">${results.length} result${results.length === 1 ? "" : "s"}</p>
    <div class="stack stack-2">
      ${results.map(({ entry }) => `
        <a class="card card-hover card-pad-sm" href="${entry.href}" style="flex-direction:row;align-items:flex-start;gap:14px">
          <span class="conn-mark" style="flex:0 0 30px">${icon(entry.icon, "icon").value}</span>
          <span style="min-width:0;flex:1 1 auto">
            <span class="row row-tight" style="gap:8px">
              <span class="small" style="color:var(--ink)">${entry.title}</span>
              <span class="badge badge-plain" style="font-size:10px">${entry.kind}</span>
            </span>
            <span class="xs muted" style="display:block;margin-top:3px;line-height:1.5">${entry.desc}</span>
          </span>
          <span style="color:var(--muted);flex:0 0 auto">${icon("arrow-ne", "icon").value}</span>
        </a>`).join("")}
    </div>`;
}

export default {
  title: "Search",
  description: "Search everything on merex.ai — docs, models, research, and the console.",

  render(ctx) {
    const query = (ctx.query.get("q") || "").trim();

    return `
      ${pageHead({
        eyebrow: `${INDEX.length} indexed pages`,
        title: "Search everything.",
        lead: "Documentation, models, research, product pages, and the console."
      }).value}

      <section class="section" style="padding-top:clamp(28px,3vw,44px)">
        <div class="shell shell-narrow">
          <div class="row" style="gap:10px;flex-wrap:nowrap" data-reveal>
            <div style="flex:1 1 auto;position:relative">
              <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none">${icon("search", "icon").value}</span>
              <input class="input" data-search value="${query.replace(/"/g, "&quot;")}"
                     placeholder="Search docs, models, research…" autofocus
                     style="padding-left:42px;padding-block:14px;font-size:var(--t-body)">
            </div>
            <span class="kbd">esc</span>
          </div>

          <div style="margin-top:28px" data-results>${renderResults(query.toLowerCase())}</div>
        </div>
      </section>
    `;
  },

  mount(root) {
    const input = root.querySelector("[data-search]");
    const results = root.querySelector("[data-results]");
    if (!input) return;

    let timer = 0;
    const run = (value) => {
      results.innerHTML = renderResults(value.trim().toLowerCase());
      const url = value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : "/search";
      history.replaceState(history.state, "", url);
    };

    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => run(input.value), 140);
    });

    root.addEventListener("click", (event) => {
      const suggest = event.target.closest("[data-suggest]");
      if (!suggest) return;
      input.value = suggest.dataset.suggest;
      run(input.value);
      input.focus();
    });

    const onKey = (event) => {
      if (event.key === "Escape") { input.value = ""; run(""); }
    };
    document.addEventListener("keydown", onKey);
    onLeave(() => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    });

    input.focus();
  }
};
