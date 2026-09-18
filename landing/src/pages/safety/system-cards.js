/* ============================================================
   SAFETY — system cards
   ============================================================ */

import { SAFETY_EVALS, BENCHMARKS, BENCH_SERIES } from "../../data/models.js";
import { icon } from "../../lib/icons.js";
import { pct, dateFull } from "../../lib/format.js";
import { pageHead, sectionHead, textLink, button, ctaBand, benchBars, calloutBox, dataTable, entryList } from "../../components/ui.js";

const CARDS = [
  { model: "Mere Apex 4 · Orion 3 · Nyx 2", date: "2026-06-18", rev: "rev 2 · 30 July 2026", pages: 118, level: "CSL-3", note: "Apex, Orion, and Nyx in one document, with per-model evaluation tables." },
  { model: "Mere Code agent", date: "2026-09-10", rev: "rev 1", pages: 72, level: "CSL-3", note: "Autonomous editing, destructive-action gating, prompt injection through repository contents, and secret handling." },
  { model: "Mere Apex 3 · Orion 2", date: "2026-02-12", rev: "rev 3", pages: 96, level: "CSL-2", note: "The first release under the Responsible Scaling Policy." },
  { model: "Mere Aegis", date: "2026-01-09", rev: "rev 1", pages: 38, level: "n/a", note: "Taxonomy definitions, training data, and human-rater disagreement rates." }
];

const CONTENTS = [
  { icon: "target", t: "Intended use", d: "What the model is for, and the deployment contexts we consider inappropriate." },
  { icon: "gauge", t: "Capability evaluations", d: "Every suite, with methodology, variance, and contamination screening." },
  { icon: "shield", t: "Safety evaluations", d: "Refusal accuracy, over-refusal, jailbreak resistance, and bias measurement." },
  { icon: "scale", t: "RSP determination", d: "Which capability level the model landed in, the evidence, and the safeguards implemented." },
  { icon: "alert", t: "Known limitations", d: "Tasks the model fails, named specifically enough to be actionable." },
  { icon: "fingerprint", t: "Red-team findings", d: "What the exercises found, what was fixed, and what remains as residual risk." },
  { icon: "users", t: "Societal impact", d: "Labour, access, and language-coverage analysis, including where coverage is poor." },
  { icon: "refresh", t: "Post-launch updates", d: "Revisions with new evaluation data and failure modes discovered in production." }
];

const LIMITS = [
  { area: "Symbolic mathematics", detail: "Integration beyond undergraduate level is unreliable; the model does not consistently recognise when it is out of depth." },
  { area: "Spatial reasoning", detail: "Multi-hop reasoning over floor plans and physical layouts degrades sharply past three hops." },
  { area: "Long-form fiction", detail: "Character and plot consistency degrades past roughly 40,000 words without external structure." },
  { area: "Current events", detail: "No knowledge after March 2026 unless a search tool is attached. The model will say so, but users often do not ask." },
  { area: "Low-resource languages", detail: "Quality outside the 22 evaluated languages is materially worse and not systematically measured." },
  { area: "Numerical precision", detail: "Arithmetic over more than about eight significant figures should go through a tool, not the model." }
];

export default {
  title: "System cards",
  description: "Per-release capability, safety, and limitation reporting for every Mere X model.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Safety", href: "/safety" }, { label: "System cards" }],
        eyebrow: "Per-release reporting",
        title: "Everything we know about a model, published with it.",
        lead: "A system card is not a summary of the good results. It is the capability evaluations, the safety evaluations, the RSP determination, the red-team findings, and a specific list of what the model still gets wrong.",
        actions: `${button({ label: "Mere Code system card", href: "#mere-x-4", icon: "arrow-down" }).value}
                  ${button({ label: "Responsible Scaling Policy", href: "/safety/scaling-policy", variant: "secondary", icon: "scale" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Published", title: "Five cards." }).value}
          ${entryList(CARDS.map((card) => ({
            meta: `${dateFull(card.date)}<br><span style="color:var(--faint)">${card.rev}</span>`,
            title: `${card.model} system card`,
            desc: `${card.note} · ${card.pages} pages · RSP determination ${card.level}`,
            tags: [card.level, `${card.pages} pages`],
            href: "#mere-x-4"
          }))).value}
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Structure",
            title: "What is in every card.",
            lead: "The same eight sections, in the same order, so cards can be compared across releases."
          }).value}
          <div class="grid g-4" data-stagger="70">
            ${CONTENTS.map((item) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(item.icon).value}</div>
                <h3 style="font-size:var(--t-sm);font-weight:500">${item.t}</h3>
                <p class="xs muted" style="line-height:1.55">${item.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section" id="mere-x-4">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Mere Apex 4 · revision 2",
            title: "Extract from the current card.",
            lead: "The sections below are reproduced from the full 118-page document."
          }).value}

          <div class="stack stack-6">
            <div class="card card-pad-lg" data-reveal>
              <h3 style="font-size:var(--t-h4);font-weight:400">Capability evaluations</h3>
              ${benchBars(BENCHMARKS, BENCH_SERIES).value}
              <p class="xs muted" style="margin-top:20px;padding-top:14px;border-top:1px solid var(--line)">
                Five-run mean, temperature 1, High mode. Contamination screening excluded 0.9% of items across all suites.
              </p>
            </div>

            <div class="card card-pad-lg" data-reveal>
              <h3 style="font-size:var(--t-h4);font-weight:400;margin-bottom:16px">Safety evaluations</h3>
              <div class="grid g-auto" style="gap:16px">
                ${SAFETY_EVALS.map((row) => `
                  <div>
                    <div class="between" style="align-items:baseline">
                      <span class="small">${row.name}</span>
                      <span class="mono small">${pct(row.value, 1)}</span>
                    </div>
                    <div class="meter" style="margin-top:8px"><div class="meter-fill ${row.invert ? "warning" : "positive"}" style="width:${(row.invert ? 1 - row.value : row.value) * 100}%"></div></div>
                    <p class="xs muted" style="margin-top:6px">${row.note}</p>
                  </div>`).join("")}
              </div>
            </div>

            <div data-reveal>
              <h3 style="font-size:var(--t-h4);font-weight:400;margin-bottom:16px">Known limitations</h3>
              ${dataTable({
                columns: [
                  { key: "area", label: "Area", render: (r) => `<strong>${r.area}</strong>` },
                  { key: "detail", label: "What goes wrong" }
                ],
                rows: LIMITS
              }).value}
            </div>

            <div class="card card-pad-lg card-sunken" data-reveal>
              <h3 style="font-size:var(--t-h4);font-weight:400">Red-team findings</h3>
              <div class="stack stack-4" style="margin-top:16px">
                ${[
                  ["Closed", "Chain-level routing bypass", "Long tool-use chains could reach restricted content by splitting a request across steps that individually passed classification. Mitigated with trajectory-level classification. Release delayed six weeks."],
                  ["Closed", "Refusal steering via long context", "A sufficiently long adversarial prefix could shift refusal behaviour. Mitigated in post-training; residual effect measured at under 0.4%."],
                  ["Residual", "Over-refusal in clinical contexts", "The model still occasionally refuses legitimate medication-interaction questions from healthcare workers. Reduced but not eliminated; deployment-level threshold tuning is the current mitigation."],
                  ["Residual", "Multilingual jailbreak asymmetry", "Adversarial robustness is measurably lower in six of the twenty-two evaluated languages. Additional coverage is in progress."]
                ].map(([state, title, body]) => `
                  <div class="row row-top" style="flex-wrap:nowrap;gap:14px">
                    <span class="badge ${state === "Closed" ? "badge-positive" : "badge-warning"}" style="flex:0 0 auto">${state}</span>
                    <div>
                      <div class="small" style="color:var(--ink)">${title}</div>
                      <p class="xs muted" style="margin-top:5px;line-height:1.6">${body}</p>
                    </div>
                  </div>`).join("")}
              </div>
            </div>
          </div>

          <div style="margin-top:26px;max-width:78ch">
            ${calloutBox("Revision 2 was published six weeks after launch with three failure modes discovered in production and the mitigations shipped for each. Cards are living documents; the revision history is part of the record.", { icon: "refresh" }).value}
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Read the policy behind these determinations.",
        body: "Capability levels, thresholds, and the safeguards each one requires.",
        primary: { label: "Responsible Scaling Policy", href: "/safety/scaling-policy", icon: "arrow-ne" },
        secondary: { label: "Transparency reports", href: "/safety/transparency" }
      }).value}
    `;
  }
};
