/* ============================================================
   PUBLICATIONS — filterable index
   ============================================================ */

import { PUBLICATIONS } from "../../data/content.js";
import { icon } from "../../lib/icons.js";
import { dateFull } from "../../lib/format.js";
import { pageHead, sectionHead, textLink, button, ctaBand } from "../../components/ui.js";

const KINDS = ["All", "Paper", "Technical report", "Interpretability", "Position"];

export default {
  title: "Publications",
  description: "Papers, technical reports, and research notes from Mere X.",

  render() {
    const tags = Array.from(new Set(PUBLICATIONS.flatMap((p) => p.tags))).sort();

    return `
      ${pageHead({
        crumb: [{ label: "Research", href: "/research" }, { label: "Publications" }],
        eyebrow: `${PUBLICATIONS.length} publications`,
        title: "What we have found, including what did not work.",
        lead: "Papers, technical reports, interpretability notes, and the occasional position piece. Every result ships with its methodology and its failure modes.",
        actions: `${button({ label: "Research overview", href: "/research", variant: "secondary", icon: "arrow-left" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="between" data-reveal style="gap:16px">
            <div class="row row-tight" data-kind-filter>
              ${KINDS.map((kind, i) => `<button class="btn ${i === 0 ? "btn-secondary" : "btn-ghost"} btn-sm" data-kind="${kind}">${kind}</button>`).join("")}
            </div>
            <div class="row row-tight">
              <input class="input" data-search placeholder="Search titles and abstracts…" style="width:260px;padding-block:8px">
            </div>
          </div>
        </div>
      </section>

      <section class="section" style="padding-top:0">
        <div class="shell shell-wide">
          <div class="entry-list" data-pub-list>
            ${PUBLICATIONS.map((paper) => `
              <a class="entry" href="#${paper.slug}" data-pub data-kind-value="${paper.kind}" data-text="${(paper.title + " " + paper.summary + " " + paper.tags.join(" ")).toLowerCase()}">
                <div class="entry-meta">
                  ${dateFull(paper.date)}<br>
                  <span style="color:var(--faint)">${paper.kind}</span>
                </div>
                <div>
                  <h3 class="entry-title">${paper.title}</h3>
                  <p class="entry-desc">${paper.summary}</p>
                  <div class="row" style="margin-top:11px;gap:14px">
                    <span class="xs muted">${paper.authors}</span>
                  </div>
                  <div class="entry-tags">${paper.tags.map((tag) => `<span class="badge badge-plain">${tag}</span>`).join("")}</div>
                </div>
                <span class="entry-arrow">${icon("download").value}</span>
              </a>`).join("")}
          </div>
          <div class="empty" data-empty hidden style="margin-top:24px">
            ${icon("search").value}
            <p>Nothing matches that filter.</p>
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Topics", title: "Browse by tag." }).value}
          <div class="row" data-reveal style="gap:8px">
            ${tags.map((tag) => `<button class="badge badge-plain" data-tag="${tag}" style="cursor:pointer;padding:7px 14px;font-size:var(--t-xs)">${tag}</button>`).join("")}
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Reproduce anything here.",
        body: "Prompts, harnesses, and the tracing tooling are open. If a number does not reproduce, that is a bug we want reported.",
        primary: { label: "Evaluation methodology", href: "/research/evaluations", icon: "arrow-ne" },
        secondary: { label: "Contact the team", href: "/company/contact" }
      }).value}
    `;
  },

  mount(root) {
    const entries = Array.from(root.querySelectorAll("[data-pub]"));
    const empty = root.querySelector("[data-empty]");
    const search = root.querySelector("[data-search]");
    let kind = "All";
    let query = "";

    const apply = () => {
      let visible = 0;
      entries.forEach((entry) => {
        const kindOk = kind === "All" || entry.dataset.kindValue === kind;
        const textOk = !query || entry.dataset.text.includes(query);
        const show = kindOk && textOk;
        entry.style.display = show ? "" : "none";
        if (show) visible += 1;
      });
      empty.hidden = visible > 0;
    };

    root.querySelector("[data-kind-filter]")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-kind]");
      if (!btn) return;
      kind = btn.dataset.kind;
      root.querySelectorAll("[data-kind]").forEach((node) => {
        node.classList.toggle("btn-secondary", node === btn);
        node.classList.toggle("btn-ghost", node !== btn);
      });
      apply();
    });

    search?.addEventListener("input", () => { query = search.value.trim().toLowerCase(); apply(); });

    root.addEventListener("click", (event) => {
      const tag = event.target.closest("[data-tag]");
      if (!tag) return;
      query = tag.dataset.tag.toLowerCase();
      if (search) search.value = tag.dataset.tag;
      kind = "All";
      root.querySelectorAll("[data-kind]").forEach((node, i) => {
        node.classList.toggle("btn-secondary", i === 0);
        node.classList.toggle("btn-ghost", i !== 0);
      });
      apply();
      root.querySelector("[data-pub-list]")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
};
