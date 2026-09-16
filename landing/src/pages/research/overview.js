/* ============================================================
   RESEARCH — overview
   ============================================================ */

import { RESEARCH_AREAS, PUBLICATIONS } from "../../data/content.js";
import { COMPANY } from "../../data/site.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, entryList, statTile, calloutBox } from "../../components/ui.js";

const PRINCIPLES = [
  {
    n: "01", title: "Capability and understanding advance together",
    body: "A capability we cannot explain is a capability we cannot trust. Every push on what the model can do is matched by investment in reading what it is doing — not as a courtesy to the safety team, but because the two problems turn out to be the same problem."
  },
  {
    n: "02", title: "Measurement is the bottleneck",
    body: "Most disagreements about model capability are really disagreements about evaluation. We spend a disproportionate share of research effort on building suites that resist contamination, gaming, and our own wishful thinking."
  },
  {
    n: "03", title: "Publish the failures",
    body: "A result without its failure modes is advertising. Our technical reports include the tasks the model still cannot do, the evaluations where our own numbers disagree, and the mitigations that did not work."
  },
  {
    n: "04", title: "Research that reaches production",
    body: "Interpretability tooling that only runs on toy models is not interpretability. Every technique we publish has been run against a model that serves real traffic, or we say plainly that it has not."
  }
];

export default {
  title: "Research",
  description: "How Mere X does research: reasoning, interpretability, alignment, evaluation, systems, and societal impact.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Research" }],
        eyebrow: "Research",
        title: "Building systems capable enough to matter, and understood well enough to trust.",
        lead: `${COMPANY.researchers} researchers across six areas. We publish what we find, including the parts that make the work look harder than a press release would.`,
        actions: `${button({ label: "Read our publications", href: "/research/publications", icon: "arrow-right" }).value}
                  ${button({ label: "Join us", href: "/company/careers", variant: "secondary", icon: "briefcase" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="grid g-4" data-stagger="90">
            ${statTile({ value: COMPANY.researchers, label: "Researchers", note: "Across five offices" }).value}
            ${statTile({ value: 41, label: "Publications", note: "Since 2023" }).value}
            ${statTile({ value: 1400, label: "Annotated circuits", note: "Released open source" }).value}
            ${statTile({ value: 6, label: "Research areas", note: "With overlapping membership" }).value}
          </div>
        </div>
      </section>

      <!-- ---- Areas ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Areas",
            title: "Six things we are working on.",
            lead: "Boundaries are soft — the interpretability group and the reasoning group share more people than either would admit to on an org chart."
          }).value}
          <div class="grid g-3" data-stagger="80">
            ${RESEARCH_AREAS.map((area, index) => `
              <article class="card card-pad-lg card-hover card-spot" data-reveal>
                <div class="between" style="align-items:flex-start">
                  <div class="card-icon" style="width:46px;height:46px">${icon(area.icon).value}</div>
                  <span class="card-num">${String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 style="font-size:var(--t-h3)">${area.title}</h3>
                <p class="ink-3" style="line-height:1.65">${area.body}</p>
              </article>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Principles ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "How we work", title: "Four commitments." }).value}
          <div class="grid g-2" data-stagger="90">
            ${PRINCIPLES.map((p) => `
              <div class="card card-pad-lg card-sunken" data-reveal>
                <span class="card-num">${p.n}</span>
                <h3 style="font-size:var(--t-h4);font-weight:400">${p.title}</h3>
                <p class="small ink-3" style="line-height:1.65">${p.body}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Recent work ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Recent work",
            title: "What we have published lately.",
            action: textLink("All publications", "/research/publications").value
          }).value}
          ${entryList(PUBLICATIONS.slice(0, 5).map((paper) => ({
            meta: `${paper.date.slice(0, 7)} · ${paper.kind}`,
            title: paper.title,
            desc: paper.summary,
            tags: paper.tags,
            href: "/research/publications"
          }))).value}
        </div>
      </section>

      <!-- ---- Deep dives ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Go deeper", title: "Three areas with their own pages." }).value}
          <div class="grid g-3" data-stagger="80">
            ${[
              { icon: "microscope", t: "Interpretability", d: "Circuit tracing, attribution graphs, and the feature dictionaries behind them.", href: "/research/interpretability" },
              { icon: "target", t: "Alignment", d: "Training behaviour under pressure to match behaviour under calm.", href: "/research/alignment" },
              { icon: "gauge", t: "Evaluations", d: "How we measure capability and harm, and why we distrust our own numbers.", href: "/research/evaluations" }
            ].map((item) => `
              <a class="card card-hover card-spot card-pad-lg" href="${item.href}" data-reveal>
                <div class="card-icon" style="width:46px;height:46px">${icon(item.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${item.t}</h3>
                <p class="small muted" style="line-height:1.6">${item.d}</p>
                <div style="margin-top:auto;padding-top:12px">${textLink("Read more", item.href).value}</div>
              </a>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Open work ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="panel-dark" data-reveal>
            <div class="split split-60" style="gap:clamp(28px,4vw,56px);align-items:center">
              <div>
                <p class="eyebrow">Open</p>
                <h2 style="margin-top:18px;font-size:var(--t-h2)">The tooling is public, not just the papers.</h2>
                <p style="margin-top:20px;color:rgba(255,255,255,.66);line-height:1.68;max-width:52ch">
                  Our circuit-tracing library, the attribution-graph viewer, 1,400 annotated circuits, and the
                  evaluation harness are all open source. A method nobody else can run is a claim, not a result.
                </p>
                <div class="row" style="margin-top:26px;gap:18px">
                  <a class="link" href="/research/interpretability" style="color:#fff"><span>Interpretability tooling</span>${icon("arrow-ne", "icon").value}</a>
                  <a class="link" href="/docs/cookbook" style="color:#fff"><span>Evaluation harness</span>${icon("arrow-ne", "icon").value}</a>
                </div>
              </div>
              <div class="grid g-2" style="gap:12px">
                ${[["1,400", "Annotated circuits"], ["Open", "Tracing library"], ["8", "Public eval suites"], ["41", "Publications"]].map(([v, l]) => `
                  <div style="padding:18px;border:1px solid rgba(255,255,255,.14);border-radius:var(--r-md)">
                    <div style="font-size:1.5rem;font-weight:300;letter-spacing:-.03em">${v}</div>
                    <div class="xs" style="color:rgba(255,255,255,.5);margin-top:3px">${l}</div>
                  </div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell">
          <div style="max-width:74ch">
            ${calloutBox("Everything on this site describes a design build. Mere X and Mere X are not real products, and the results reported here are illustrative rather than measured.", { icon: "info" }).value}
          </div>
        </div>
      </section>

      ${ctaBand({
        eyebrow: "Careers",
        title: "Come work on the hard part.",
        body: "Research scientists, research engineers, and a twelve-month residency for people early in the field.",
        primary: { label: "Open roles", href: "/company/careers", icon: "arrow-ne" },
        secondary: { label: "The residency", href: "/research/residency" }
      }).value}
    `;
  }
};
