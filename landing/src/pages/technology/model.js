/* ============================================================
   MODEL DETAIL — one page per Mere X model
   ============================================================ */

import { MODEL_BY_ID, MODELS, BENCHMARKS, BENCH_SERIES, MODES, KNOWLEDGE_CUTOFF } from "../../data/models.js";
import { icon } from "../../lib/icons.js";
import { nf, dateFull, compact } from "../../lib/format.js";
import { mereXSeal } from "../../components/orb.js";
import {
 pageHead, sectionHead, textLink, button, ctaBand, benchBars, calloutBox
} from "../../components/ui.js";

const SERIES_KEY = {
  "mere-4-2-peak": "apex",
  "mere-4-2-core": "orion",
  "mere-4-0-lite": "nyx"
};

export default {
  title: (ctx) => MODEL_BY_ID[ctx.params.id]?.name || "Model",
  description: (ctx) => MODEL_BY_ID[ctx.params.id]?.tagline || "A Mere X model.",

  render(ctx) {
    const model = MODEL_BY_ID[ctx.params.id];
    if (!model) {
      return `
        <section class="section">
          <div class="shell">
            <div class="empty">${icon("search").value}
              <h2 style="font-size:var(--t-h3)">No model with that ID</h2>
              <p class="small">Try one of ${MODELS.map((m) => `<a class="link-plain" href="/technology/models/${m.id}"><code class="inline">${m.id}</code></a>`).join(", ")}.</p>
            </div>
          </div>
        </section>`;
    }

    const seriesKey = SERIES_KEY[model.id];
    return `
      ${pageHead({
        crumb: [{ label: "Technology", href: "/technology" }, { label: "Models", href: "/technology" }, { label: model.name }],
        eyebrow: `${model.tier} · ${model.status}`,
        title: model.name,
        lead: model.tagline,
        actions: `${button({ label: "Open Mere Studio", href: "/app", icon: "arrow-ne" }).value}
                  ${button({ label: "Compare the family", href: "/technology", variant: "secondary", icon: "layers" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="split split-60" style="align-items:center;gap:clamp(28px,4vw,60px)">
            <div data-reveal="left">
              <p class="lead">${model.description}</p>
              <div class="row" style="margin-top:26px;gap:8px">
                ${model.modalities.map((m) => `<span class="badge badge-plain">${m}</span>`).join("")}
              </div>
              <div class="grid g-2" style="margin-top:34px;gap:14px">
                ${[
                  ["Context window", `${nf(model.context)} tokens`],
                  ["Max output", `${nf(model.maxOutput)} tokens`],
                  ["Latency", model.latency],
                  ["Throughput", model.throughput],
                  ["Released", dateFull(model.releasedAt)],
                  ["Knowledge cutoff", KNOWLEDGE_CUTOFF]
                ].map(([label, value]) => `
                  <div class="card card-sunken card-pad-sm" data-reveal>
                    <div class="xs muted upper" style="letter-spacing:.1em">${label}</div>
                    <div style="font-size:1.05rem;font-weight:400;margin-top:4px">${value}</div>
                  </div>`).join("")}
              </div>
            </div>
            <div class="center" data-reveal="right" style="display:grid;place-items:center;padding:30px">
              <div style="width:min(300px,72%)">${mereXSeal({ size: 300 }).value}</div>
              <p class="xs muted mono" style="margin-top:34px">${model.id}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Best for ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Where it fits", title: `What ${model.short} is for.` }).value}
          <div class="grid g-4" data-stagger="80">
            ${model.bestFor.map((item, index) => `
              <div class="card card-hover card-spot" data-reveal>
                <span class="card-num">${String(index + 1).padStart(2, "0")}</span>
                <p style="font-size:var(--t-body);line-height:1.5">${item}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      ${model.modes.length ? `
      <!-- ---- Modes available ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Reasoning",
            title: `${model.modes.length} of the four modes.`,
            lead: model.id === "mere-4-2-peak"
              ? "Peak is the only model with Extra High, which unlocks budgets up to 256,000 thinking tokens and multi-hour agent runs."
              : `${model.short} supports ${model.modes.join(", ")}. For deeper deliberation, route the request to Peak.`,
            action: textLink("How modes work", "/technology/reasoning").value
          }).value}
          <div class="mode-strip" data-reveal style="grid-template-columns:repeat(${Math.max(2, model.modes.length)},minmax(0,1fr))">
            ${MODES.filter((mode) => model.modes.includes(mode.name)).map((mode) => `
              <div class="mode-cell is-in" style="--v:${mode.depth}">
                <div class="between" style="gap:8px">
                  <strong style="font-weight:500">${mode.name}</strong>
                  <span class="xs muted mono">${mode.latency}</span>
                </div>
                <div class="mode-bar"><i></i></div>
                <p class="xs muted" style="line-height:1.5">${mode.summary}</p>
                <p class="xs" style="color:var(--faint);margin-top:auto;padding-top:8px">${mode.budget}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>` : ""}

      <!-- ---- Model identifiers ---- -->
      <section class="section">
        <div class="shell shell-wide">
          <div style="max-width:760px" data-reveal>
              ${sectionHead({ eyebrow: "Model IDs", title: "How to reference it." }).value}
              <div class="stack stack-2">
                ${model.aliases.map((alias, index) => `
                  <div class="card card-sunken card-pad-sm" style="flex-direction:row;align-items:center;gap:12px">
                    <code class="mono small" style="flex:1 1 auto;min-width:0;word-break:break-all">${alias}</code>
                    <span class="badge badge-plain">${index === 0 ? "Alias" : "Pinned"}</span>
                  </div>`).join("")}
              </div>
              <div style="margin-top:18px">
                ${calloutBox("Use the alias in development so you always get the newest snapshot; pin the dated ID in production so behaviour never shifts under a running system.", { icon: "info" }).value}
              </div>
              <div class="row" style="margin-top:20px">${textLink("See API rates on Pricing", "/pricing").value}</div>
          </div>
        </div>
      </section>

      ${seriesKey ? `
      <!-- ---- Benchmarks ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Evaluations",
            title: `How ${model.short} scores.`,
            action: textLink("Full benchmark report", "/technology/benchmarks").value
          }).value}
          <div class="card card-pad-lg" data-reveal>
            ${benchBars(BENCHMARKS, BENCH_SERIES.filter((s) => s.key === seriesKey || s.key === "prev")).value}
            <p class="xs muted" style="margin-top:24px;padding-top:16px;border-top:1px solid var(--line)">
              Compared against the previous generation. Figures on this site are illustrative for the Mere X platform build.
            </p>
          </div>
        </div>
      </section>` : ""}

      <!-- ---- Code ---- -->
      <!-- ---- Other models ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Elsewhere in the family", title: "Other models." }).value}
          <div class="grid g-3" data-stagger="80">
            ${MODELS.filter((m) => m.id !== model.id).slice(0, 3).map((other) => `
              <a class="card card-hover card-spot" href="/technology/models/${other.id}" data-reveal>
                <div class="card-icon">${icon(other.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${other.name}</h3>
                <p class="small muted" style="line-height:1.55">${other.tagline}</p>
                <div class="xs mono muted" style="margin-top:auto;padding-top:10px">${compact(other.context, 0)} context</div>
              </a>`).join("")}
          </div>
        </div>
      </section>

      ${ctaBand({
        title: `Put ${model.name} to work.`,
        body: "Open a folder, describe a change, and watch which parts of it this model gets right.",
        primary: { label: "Open Mere Studio", href: "/app", icon: "arrow-ne" },
        secondary: { label: "See pricing", href: "/pricing" }
      }).value}
    `;
  }
};
