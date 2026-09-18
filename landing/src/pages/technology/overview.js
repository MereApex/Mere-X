/* ============================================================
   TECHNOLOGY — the Mere X family overview and comparison
   ============================================================ */

import { MODELS, MODES, CAPABILITIES, LIFECYCLE, KNOWLEDGE_CUTOFF, GENERATION } from "../../data/models.js";
import { icon } from "../../lib/icons.js";
import { nf, compact, dateShort } from "../../lib/format.js";
import { mereXSeal } from "../../components/orb.js";
import { pageHead, sectionHead, textLink, button, ctaBand, featureCard, calloutBox } from "../../components/ui.js";

export default {
  title: "The Mere X model family",
  description: "Every Mere X model side by side — context windows, reasoning modes, modalities, and latency.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Technology" }],
        eyebrow: GENERATION,
        title: "One family, engineered around a single idea: thinking is a resource you should control.",
        lead: "Three models share a training run, a tokenizer, and a safety layer. What separates them is capability ceiling, latency, and how much deliberation they can afford.",
        actions: `${button({ label: "See the benchmarks", href: "/technology/benchmarks", icon: "arrow-right" }).value}
                  ${button({ label: "How it works", href: "/products/code", variant: "secondary", icon: "arrow-right" }).value}`,
        meta: `
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">${MODELS.length}</span><span class="stat-label">Models</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">1M</span><span class="stat-label">Max context</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">4</span><span class="stat-label">Reasoning modes</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">${KNOWLEDGE_CUTOFF}</span><span class="stat-label">Knowledge cutoff</span></div>`
      }).value}

      <!-- ---- The three core models ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Text & reasoning", title: "The three you will choose between." }).value}
          <div class="grid g-3" data-stagger="110">
            ${MODELS.map((model) => `
              <article class="model-card ${model.flagship ? "is-flagship" : ""} card-spot" data-reveal>
                <div class="between" style="align-items:flex-start">
                  ${mereXSeal({ size: 58 }).value}
                  <span class="badge ${model.flagship ? "badge-solid" : ""}">${model.tier}</span>
                </div>
                <div>
                  <h3 style="font-size:var(--t-h3)">${model.name}</h3>
                  <p class="xs mono muted" style="margin-top:4px">${model.id}</p>
                  <p class="small ink-3" style="margin-top:12px;line-height:1.6;min-height:5.2em">${model.description}</p>
                </div>
                <dl class="model-spec">
                  <div class="model-spec-row"><dt>Context window</dt><dd>${nf(model.context)}</dd></div>
                  <div class="model-spec-row"><dt>Max output</dt><dd>${nf(model.maxOutput)}</dd></div>
                  <div class="model-spec-row"><dt>Reasoning modes</dt><dd>${model.modes.join(" · ")}</dd></div>
                  <div class="model-spec-row"><dt>First token</dt><dd>${model.latency}</dd></div>
                  <div class="model-spec-row"><dt>Throughput</dt><dd>${model.throughput}</dd></div>
                </dl>
                <div style="margin-top:auto;padding-top:10px">${textLink("Full model card", `/technology/models/${model.id}`).value}</div>
              </article>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Comparison table ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Side by side",
            title: "The whole family in one table.",
            action: textLink("API pricing", "/pricing").value
          }).value}
          <div class="table-wrap" data-reveal>
            <table class="data" style="min-width:900px">
              <thead>
                <tr>
                  <th>Model</th><th>Tier</th><th class="num">Context</th><th class="num">Max out</th>
                  <th>Modes</th><th>Modalities</th>
                </tr>
              </thead>
              <tbody>
                ${MODELS.map((model) => `
                  <tr>
                    <td>
                      <a href="/technology/models/${model.id}" style="display:flex;align-items:center;gap:9px">
                        <span style="color:var(--muted)">${icon(model.icon, "icon").value}</span>
                        <span><strong>${model.name}</strong><div class="xs muted mono">${model.id}</div></span>
                      </a>
                    </td>
                    <td><span class="badge badge-plain">${model.tier}</span></td>
                    <td class="num">${compact(model.context, 0)}</td>
                    <td class="num">${compact(model.maxOutput, 0)}</td>
                    <td class="small muted">${model.modes.length ? model.modes.join(" · ") : "—"}</td>
                    <td class="small muted">${model.modalities.join(", ")}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
          <p class="table-scroll-hint">Scroll horizontally for the full capability comparison. Rates are available only on Pricing and API pages.</p>
        </div>
      </section>

      <!-- ---- Modes ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(28px,4vw,64px);align-items:start">
            <div data-reveal="left">
              <p class="eyebrow">Reasoning</p>
              <h2 style="margin-top:18px">The mode matters more than the model.</h2>
              <p class="lead" style="margin-top:18px">
                A Core request in High mode routinely beats a Peak request in Fast mode — and costs a
                fraction as much. Pick the model for capability ceiling; pick the mode for how hard
                this particular request is.
              </p>
              <div style="margin-top:26px">${button({ label: "How reasoning budgets work", href: "/technology/reasoning", variant: "secondary", size: "btn-sm", icon: "arrow-right" }).value}</div>
            </div>
            <div class="stack stack-3" data-reveal="right" data-stagger="80">
              ${MODES.map((mode) => `
                <div class="card card-pad-sm" data-reveal style="flex-direction:row;gap:18px;align-items:center">
                  <div style="flex:0 0 84px">
                    <div style="font-size:var(--t-body);font-weight:500">${mode.name}</div>
                    <div class="xs muted mono">${mode.latency}</div>
                  </div>
                  <div style="flex:1 1 auto;min-width:0">
                    <div class="mode-bar" style="margin-bottom:8px"><i style="transform:scaleX(${mode.depth})"></i></div>
                    <p class="xs muted" style="line-height:1.5">${mode.summary}</p>
                  </div>
                  <div class="xs mono" style="flex:0 0 auto;color:var(--faint);text-align:right;min-width:96px">${mode.budget}</div>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Capabilities ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Capabilities", title: "What the family does, in detail." }).value}
          <div class="grid g-auto-lg" data-stagger="70">
            ${CAPABILITIES.map((cap, index) => featureCard({
              icon: cap.icon, title: cap.name, body: cap.blurb, num: String(index + 1).padStart(2, "0")
            }).value).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Lifecycle ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Lifecycle",
            title: "Nothing changes underneath you.",
            lead: "Pinned snapshot IDs keep their behaviour for life. Deprecation is announced at least six months before retirement, with a migration guide and behavioural diffs."
          }).value}
          <div class="table-wrap" data-reveal>
            <table class="data">
              <thead><tr><th>Model ID</th><th>Released</th><th>Deprecated</th><th>Retires</th><th>State</th></tr></thead>
              <tbody>
                ${LIFECYCLE.map((row) => `
                  <tr>
                    <td class="mono small">${row.model}</td>
                    <td class="small muted">${dateShort(row.released)}</td>
                    <td class="small muted">${row.deprecates === "—" ? "—" : dateShort(row.deprecates)}</td>
                    <td class="small muted">${row.retires === "—" ? "—" : dateShort(row.retires)}</td>
                    <td><span class="badge ${row.state === "Current" ? "badge-positive" : row.state === "Legacy" ? "badge-warning" : "badge-danger"}">${row.state}</span></td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
          <div style="margin-top:20px;max-width:70ch">
            ${calloutBox("Alias IDs such as <code class=\"inline\">mere-4-2-peak-latest</code> always resolve to the newest snapshot. Use them in development and pin a dated snapshot in production.", { icon: "info" }).value}
          </div>
        </div>
      </section>

      ${ctaBand({
        eyebrow: "Start building",
        title: "Pick a model. Send a message. See what it does.",
        body: "Ten dollars of credit and a key in under a minute.",
        primary: { label: "Open Mere Code", href: "/app", icon: "arrow-ne" },
        secondary: { label: "How it works", href: "/products/code" }
      }).value}
    `;
  }
};
