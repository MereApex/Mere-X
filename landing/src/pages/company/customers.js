/* ============================================================
   COMPANY — customers
   ============================================================ */

import { CUSTOMERS } from "../../data/content.js";
import { TRUST_LOGOS } from "../../data/site.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, logoWall, statTile } from "../../components/ui.js";

const PATTERNS = [
  { icon: "file", t: "Document-heavy work", d: "Contracts, filings, clinical notes, and case files — read whole rather than chunked, with every claim traceable to a page.", who: "Legal, healthcare, financial services" },
  { icon: "orbit", t: "Long-running agents", d: "Exception handling, ticket resolution, and back-office workflows that run for hours and escalate when they genuinely should.", who: "Logistics, operations, support" },
  { icon: "code", t: "Engineering throughput", d: "Repository-scale changes, test authoring, and review that reads like a careful colleague's rather than a linter's.", who: "Software teams of every size" },
  { icon: "image", t: "Visual understanding", d: "Schematics, charts, screenshots, and hand annotation — the pixel work that used to require a bespoke pipeline.", who: "Manufacturing, insurance, media" },
  { icon: "search", t: "Retrieval you can trust", d: "RAG where the citations are real and the model says so when the corpus does not contain the answer.", who: "Research, compliance, knowledge work" },
  { icon: "translate", t: "Multilingual operations", d: "Twenty-two evaluated languages with quality measured rather than assumed, plus realtime speech translation.", who: "Global support and field teams" }
];

export default {
  title: "Customers",
  description: "What teams build on Mere X, and the results they report.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Company", href: "/company" }, { label: "Customers" }],
        eyebrow: "In production",
        title: "What people actually build on Mere X.",
        lead: "Six stories, told with the number the team cared about rather than the number that reads best. Figures are self-reported by the customer.",
        actions: `${button({ label: "Talk to sales", href: "/company/contact", icon: "arrow-ne" }).value}
                  ${button({ label: "Open Mere Code", href: "/app", variant: "secondary", icon: "arrow-ne" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="grid g-4" data-stagger="90">
            ${statTile({ value: 62, label: "Countries", note: "Where Mere X is used" }).value}
            ${statTile({ value: 4.1, decimals: 1, suffix: "T", label: "Tokens per day", note: "Across the platform" }).value}
            ${statTile({ value: 99.98, decimals: 2, suffix: "%", label: "Platform uptime", note: "Trailing 12 months" }).value}
            ${statTile({ value: 12, label: "Regulated industries", note: "With signed BAAs or equivalent" }).value}
          </div>
        </div>
      </section>

      <!-- ---- Stories ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Stories", title: "Six teams." }).value}
          <div class="stack stack-4" data-stagger="80">
            ${CUSTOMERS.map((story) => `
              <article class="card card-pad-lg card-spot card-hover" data-reveal style="flex-direction:row;gap:clamp(24px,3vw,48px);flex-wrap:wrap;align-items:center">
                <div style="flex:0 0 auto;min-width:190px">
                  <div class="row row-tight">
                    <span class="conn-mark">${story.name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase()}</span>
                    <div>
                      <div style="font-size:var(--t-body)">${story.name}</div>
                      <div class="xs muted">${story.sector}</div>
                    </div>
                  </div>
                  <div style="margin-top:22px">
                    <div class="stat-value" style="font-size:2.3rem">${story.metric}</div>
                    <div class="xs muted" style="max-width:20ch;margin-top:4px">${story.metricLabel}</div>
                  </div>
                </div>
                <div style="flex:1 1 360px;min-width:0">
                  <p class="quote-text" style="font-size:var(--t-lead)">&ldquo;${story.quote}&rdquo;</p>
                  <p class="xs muted" style="margin-top:16px">${story.person}</p>
                </div>
              </article>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Patterns ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Patterns",
            title: "Six shapes of work that keep coming up.",
            lead: "If your problem looks like one of these, there is a cookbook recipe for it."
          }).value}
          <div class="grid g-3" data-stagger="70">
            ${PATTERNS.map((p) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(p.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${p.t}</h3>
                <p class="small muted" style="line-height:1.6">${p.d}</p>
                <p class="xs" style="color:var(--faint);margin-top:auto;padding-top:10px;border-top:1px solid var(--line-soft)">${p.who}</p>
              </div>`).join("")}
          </div>
          <div class="row" style="margin-top:26px">${textLink("How it works", "/products/code").value}</div>
        </div>
      </section>

      <!-- ---- Logo wall ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Trusted by", title: "Teams building in production." }).value}
          ${logoWall(TRUST_LOGOS).value}
        </div>
      </section>

      ${ctaBand({
        title: "Tell us what you are building.",
        body: "A solutions architect will tell you honestly whether Mere X is the right fit — including when it is not.",
        primary: { label: "Talk to sales", href: "/company/contact", icon: "arrow-ne" },
        secondary: { label: "Start free", href: "/app" }
      }).value}
    `;
  }
};
