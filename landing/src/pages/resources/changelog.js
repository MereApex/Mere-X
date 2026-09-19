/* ============================================================
   RESOURCES — changelog
   ============================================================ */

import { CHANGELOG } from "../../data/content.js";
import { LIFECYCLE } from "../../data/models.js";
import { icon } from "../../lib/icons.js";
import { dateFull, dateShort } from "../../lib/format.js";
import { pageHead, sectionHead, textLink, button, ctaBand, dataTable, calloutBox } from "../../components/ui.js";

const KIND_STYLE = {
  added: "badge-positive",
  changed: "badge-info",
  fixed: "badge-plain",
  deprecated: "badge-warning",
  removed: "badge-danger"
};

const AREAS = ["All", "API", "Models", "SDKs", "Console", "Models", "Studio"];

export default {
  title: "Changelog",
  description: "Every API, model, SDK, and console change, dated.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Changelog" }],
        eyebrow: "Product updates",
        title: "What shipped, and when.",
        lead: "Every change to the API, the models, the SDKs, and the console. Breaking changes ship behind a new version header and are never applied to a pinned one.",
        actions: `${button({ label: "Get support", href: "/support", variant: "secondary", icon: "help" }).value}
                  ${button({ label: "RSS", href: "#", variant: "ghost", icon: "activity" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="row row-tight" data-area-filter data-reveal>
            ${AREAS.map((area, i) => `<button class="btn ${i === 0 ? "btn-secondary" : "btn-ghost"} btn-sm" data-area="${area}">${area}</button>`).join("")}
          </div>
        </div>
      </section>

      <section class="section" style="padding-top:clamp(24px,3vw,40px)">
        <div class="shell shell-wide">
          <div class="stack stack-6" data-log-list>
            ${CHANGELOG.map((entry) => `
              <article class="split split-40" data-entry data-area-value="${entry.version}" style="gap:clamp(20px,3vw,44px);align-items:start;padding-bottom:30px;border-bottom:1px solid var(--line)">
                <div data-reveal="left">
                  <div class="tl-date">${dateFull(entry.date)}</div>
                  <h2 style="font-size:var(--t-h3);margin-top:8px">${entry.version}</h2>
                  <div class="row row-tight" style="margin-top:12px">
                    ${Array.from(new Set(entry.items.map((i) => i.kind))).map((kind) => `<span class="badge ${KIND_STYLE[kind]}">${kind}</span>`).join("")}
                  </div>
                </div>
                <div class="stack stack-3" data-reveal="right">
                  ${entry.items.map((item) => `
                    <div class="row row-top" style="flex-wrap:nowrap;gap:14px">
                      <span class="badge ${KIND_STYLE[item.kind]}" style="flex:0 0 auto;min-width:84px;justify-content:center">${item.kind}</span>
                      <p class="small ink-3" style="line-height:1.6">${item.text}</p>
                    </div>`).join("")}
                </div>
              </article>`).join("")}
          </div>
          <div class="empty" data-empty hidden style="margin-top:24px">${icon("search").value}<p>No entries for that area.</p></div>
        </div>
      </section>

      <!-- ---- Deprecations ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Model lifecycle",
            title: "Deprecations and retirements.",
            lead: "At least six months' notice, a migration guide with behavioural diffs, and the model serving throughout the window.",
            action: textLink("Model reference", "/technology").value
          }).value}
          ${dataTable({
            columns: [
              { key: "model", label: "Model ID", render: (r) => `<code class="mono small">${r.model}</code>` },
              { key: "released", label: "Released", render: (r) => dateShort(r.released) },
              { key: "deprecates", label: "Deprecated", render: (r) => (r.deprecates === "—" ? "—" : dateShort(r.deprecates)) },
              { key: "retires", label: "Retires", render: (r) => (r.retires === "—" ? "—" : dateShort(r.retires)) },
              { key: "state", label: "State", render: (r) => `<span class="badge ${r.state === "Current" ? "badge-positive" : r.state === "Legacy" ? "badge-warning" : "badge-danger"}">${r.state}</span>` }
            ],
            rows: LIFECYCLE
          }).value}
          <div style="margin-top:22px;max-width:76ch">
            ${calloutBox("A pinned snapshot ID never changes behaviour. If you are on <code class=\"inline\">mere-4-2-peak-20260910</code>, that model behaves identically until its retirement date — we do not silently update what a pinned ID points at.", { icon: "lock" }).value}
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Never miss a breaking change.",
        body: "Turn on deprecation notices in the console and we will tell you six months ahead.",
        primary: { label: "Get support", href: "/support", icon: "arrow-ne" },
        secondary: { label: "See pricing", href: "/pricing" }
      }).value}
    `;
  },

  mount(root) {
    const entries = Array.from(root.querySelectorAll("[data-entry]"));
    const empty = root.querySelector("[data-empty]");

    root.querySelector("[data-area-filter]")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-area]");
      if (!btn) return;
      const area = btn.dataset.area;
      root.querySelectorAll("[data-area]").forEach((node) => {
        node.classList.toggle("btn-secondary", node === btn);
        node.classList.toggle("btn-ghost", node !== btn);
      });
      let visible = 0;
      entries.forEach((entry) => {
        const show = area === "All" || entry.dataset.areaValue === area;
        entry.style.display = show ? "" : "none";
        if (show) visible += 1;
      });
      empty.hidden = visible > 0;
    });
  }
};
