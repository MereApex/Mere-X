/* ============================================================
   PRICING — consumer plans, API rates, and a cost estimator
   ============================================================ */

import { CONSUMER_PLANS, CHAT_MODELS, MODELS, PRICING_NOTES, MODEL_BY_ID } from "../data/models.js";
import { RATE_TIERS } from "../data/docs.js";
import { FAQ } from "../data/content.js";
import { icon } from "../lib/icons.js";
import { perMillion, money, compact, nf } from "../lib/format.js";
import { moveSegThumb } from "../lib/motion.js";
import { pageHead, sectionHead, textLink, button, ctaBand, dataTable, accordion, calloutBox } from "../components/ui.js";
import { onLeave } from "../lib/router.js";

export default {
  title: "Pricing",
  description: "Plans for individuals and teams, per-token API rates for every Mere X model, and a calculator to estimate a bill.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Pricing" }],
        eyebrow: "Pricing",
        title: "Priced so you can predict the bill.",
        lead: "Flat plans for people, per-token rates for builders. Batch halves it, caching cuts it further, and Guard classification never costs anything.",
        actions: `${button({ label: "Start free", href: "/app", icon: "arrow-ne" }).value}
                  ${button({ label: "Get an API key", href: "/console/keys", variant: "secondary", icon: "key" }).value}`
      }).value}

      <!-- ---- Toggle ---- -->
      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="center" style="display:flex;justify-content:center" data-reveal>
            <div class="seg" data-price-seg>
              <span class="seg-thumb"></span>
              <button class="seg-btn is-active" data-view="plans">Plans</button>
              <button class="seg-btn" data-view="api">API rates</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Plans ---- -->
      <section class="section" data-panel-view="plans">
        <div class="shell shell-wide">
          <div class="price-grid" data-stagger="70">
            ${CONSUMER_PLANS.map((plan) => `
              <article class="price-card ${plan.featured ? "featured" : ""}" data-reveal>
                ${plan.featured ? '<span class="price-badge">Most popular</span>' : ""}
                <div>
                  <div style="font-size:var(--t-h4)">${plan.name}</div>
                  <div class="price-amount" style="margin-top:10px">
                    <span class="cur">$</span><span class="val">${plan.price === 0 ? "0" : plan.price.toFixed(plan.price % 1 ? 2 : 0)}</span>
                    <span class="per">${plan.plus ? "+ " : ""}/ ${plan.cadence}</span>
                  </div>
                  <p class="small muted" style="margin-top:12px;min-height:3.4em">${plan.summary}</p>
                </div>
                <ul class="price-features">
                  ${plan.features.map((f) => `<li>${icon("check", "icon").value}<span>${f}</span></li>`).join("")}
                </ul>
                <a class="btn ${plan.featured ? "btn-primary" : "btn-secondary"} btn-block" href="${plan.name === "Business" ? "/company/contact" : plan.name === "Free" ? "/app" : `/checkout?plan=${encodeURIComponent(plan.name)}`}">${plan.cta}</a>
              </article>`).join("")}
          </div>
          <p class="xs muted center" style="margin-top:26px">
            Paid individual plans include 30 days of access. Starter includes Nyx 2 and Orion 3; Plus, Pro, and Max include the full Mere model family with Extra High thinking. Free includes Mere Nyx 2.
            Education and non-profit pricing is available — <a class="link-plain" href="/company/contact">ask us</a>.
          </p>
        </div>
      </section>

      <!-- ---- API rates ---- -->
      <section class="section" data-panel-view="api" hidden>
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "API", title: "Per million tokens." }).value}
          ${dataTable({
            columns: [
              { key: "name", label: "Model", render: (m) => `<a class="link-plain" href="/technology/models/${m.id}"><strong>${m.name}</strong><div class="xs muted mono">${m.id}</div></a>` },
              { key: "context", label: "Context", align: "right", render: (m) => compact(m.context, 0) },
              { key: "in", label: "Input", align: "right", render: (m) => perMillion(m.price.input) },
              { key: "out", label: "Output", align: "right", render: (m) => (m.price.output ? perMillion(m.price.output) : "Free") },
              { key: "cw", label: "Cache write", align: "right", render: (m) => (m.price.cacheWrite != null ? perMillion(m.price.cacheWrite) : "—") },
              { key: "cr", label: "Cache read", align: "right", render: (m) => (m.price.cacheRead != null ? perMillion(m.price.cacheRead) : "—") },
              { key: "batch", label: "Batch", align: "right", render: (m) => (m.price.batch ? "−50%" : "—") }
            ],
            rows: CHAT_MODELS
          }).value}

          <div class="grid g-4" style="margin-top:26px" data-stagger="70">
            ${PRICING_NOTES.map((note) => `
              <div class="card card-sunken card-pad-sm" data-reveal>
                <div class="xs muted upper">${note.label}</div>
                <div style="font-size:var(--t-body);margin-top:5px">${note.value}</div>
                <div class="xs muted" style="margin-top:5px;line-height:1.5">${note.detail}</div>
              </div>`).join("")}
          </div>

          <div class="grid g-2" style="margin-top:34px;gap:clamp(20px,2.4vw,32px)">
            <div class="card card-pad-lg" data-reveal>
              <h3 style="font-size:var(--t-h4);font-weight:400">Other endpoints</h3>
              <div class="table-wrap" style="border:0">
                <table class="data" style="min-width:0">
                  <tbody>
                    <tr><td>Embeddings — Embed 3</td><td class="num">$0.03 / MTok</td></tr>
                    <tr><td>Embeddings — Atlas</td><td class="num">$0.03 / 1M tokens</td></tr>
                    <tr><td>Classification — Aegis</td><td class="num">Free</td></tr>
                    <tr><td>Batch API</td><td class="num">50% off</td></tr>
                    <tr><td>Cached input</td><td class="num">10% of input</td></tr>
                    <tr><td>Guard classification</td><td class="num">Free</td></tr>
                    <tr><td>File storage</td><td class="num">$0.02 / GB / month</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="card card-pad-lg" data-reveal>
              <h3 style="font-size:var(--t-h4);font-weight:400">Estimate a monthly bill</h3>
              <div class="stack stack-4" style="margin-top:16px">
                <div class="field">
                  <label class="field-label" for="calc-model">Model</label>
                  <select class="select" id="calc-model" data-calc-model>
                    ${CHAT_MODELS.map((m) => `<option value="${m.id}" ${m.id === "mere-orion-3" ? "selected" : ""}>${m.name}</option>`).join("")}
                  </select>
                </div>
                <div class="pg-control">
                  <div class="pg-control-head"><span>Requests per day</span><span data-calc-req-out>10,000</span></div>
                  <input class="slider" type="range" min="100" max="1000000" step="100" value="10000" data-calc-req>
                </div>
                <div class="pg-control">
                  <div class="pg-control-head"><span>Input tokens per request</span><span data-calc-in-out>4,000</span></div>
                  <input class="slider" type="range" min="200" max="200000" step="200" value="4000" data-calc-in>
                </div>
                <div class="pg-control">
                  <div class="pg-control-head"><span>Output tokens per request</span><span data-calc-out-out>800</span></div>
                  <input class="slider" type="range" min="50" max="20000" step="50" value="800" data-calc-out>
                </div>
                <div class="row" style="gap:18px">
                  <label class="row row-tight small" style="cursor:pointer"><span class="switch" role="switch" aria-checked="false" data-calc-cache tabindex="0"></span> 80% cached input</label>
                  <label class="row row-tight small" style="cursor:pointer"><span class="switch" role="switch" aria-checked="false" data-calc-batch tabindex="0"></span> Batch API</label>
                </div>
                <div style="padding-top:16px;border-top:1px solid var(--line)">
                  <div class="between">
                    <span class="xs muted upper">Estimated monthly</span>
                    <span class="stat-value" style="font-size:2rem" data-calc-total>$0</span>
                  </div>
                  <div class="xs muted" style="margin-top:8px" data-calc-detail></div>
                </div>
              </div>
            </div>
          </div>

          <div style="margin-top:30px;max-width:76ch">
            ${calloutBox("The estimator uses list prices and assumes a 30-day month. It is a planning tool, not a quote — actual usage varies with prompt structure and reasoning budget.", { icon: "info" }).value}
          </div>
        </div>
      </section>

      <!-- ---- Rate limits ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Rate limits",
            title: "Throughput rises with usage.",
            action: textLink("Rate limit docs", "/docs/rate-limits").value
          }).value}
          ${dataTable({
            columns: [
              { key: "tier", label: "Tier" },
              { key: "spend", label: "Qualifies at" },
              { key: "rpm", label: "Requests / min", align: "right" },
              { key: "tpm", label: "Tokens / min", align: "right" },
              { key: "tpd", label: "Tokens / day", align: "right" },
              { key: "batch", label: "Concurrent batches", align: "right" }
            ],
            rows: RATE_TIERS
          }).value}
        </div>
      </section>

      <section class="section">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "About billing and data." }).value}
          ${accordion(FAQ, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "Ten dollars of credit is waiting.",
        body: "Enough to build a prototype and find out whether this is the right model for your problem.",
        primary: { label: "Open the console", href: "/console", icon: "arrow-ne" },
        secondary: { label: "Talk to sales", href: "/company/contact" }
      }).value}
    `;
  },

  mount(root) {
    const cleanups = [];
    onLeave(() => cleanups.forEach((cleanup) => cleanup()));

    /* ---- plans / api toggle ---- */
    const seg = root.querySelector("[data-price-seg]");
    if (seg) {
      const show = (view) => {
        root.querySelectorAll("[data-panel-view]").forEach((panel) => {
          panel.hidden = panel.dataset.panelView !== view;
        });
      };
      seg.addEventListener("click", (event) => {
        const btn = event.target.closest(".seg-btn");
        if (!btn) return;
        seg.querySelectorAll(".seg-btn").forEach((node) => node.classList.toggle("is-active", node === btn));
        moveSegThumb(seg);
        show(btn.dataset.view);
      });
      const thumbFrame = requestAnimationFrame(() => moveSegThumb(seg));
      const onResize = () => moveSegThumb(seg);
      window.addEventListener("resize", onResize, { passive: true });
      cleanups.push(() => cancelAnimationFrame(thumbFrame));
      cleanups.push(() => window.removeEventListener("resize", onResize));
    }

    /* ---- cost estimator ---- */
    const modelSelect = root.querySelector("[data-calc-model]");
    if (!modelSelect) return;

    const reqInput = root.querySelector("[data-calc-req]");
    const inInput = root.querySelector("[data-calc-in]");
    const outInput = root.querySelector("[data-calc-out]");
    const cacheSwitch = root.querySelector("[data-calc-cache]");
    const batchSwitch = root.querySelector("[data-calc-batch]");
    const totalOut = root.querySelector("[data-calc-total]");
    const detailOut = root.querySelector("[data-calc-detail]");

    const recalc = () => {
      const model = MODEL_BY_ID[modelSelect.value];
      const requests = Number(reqInput.value);
      const inputTokens = Number(inInput.value);
      const outputTokens = Number(outInput.value);
      const cached = cacheSwitch.getAttribute("aria-checked") === "true";
      const batched = batchSwitch.getAttribute("aria-checked") === "true";

      root.querySelector("[data-calc-req-out]").textContent = nf(requests);
      root.querySelector("[data-calc-in-out]").textContent = nf(inputTokens);
      root.querySelector("[data-calc-out-out]").textContent = nf(outputTokens);

      const monthlyRequests = requests * 30;
      const inputMTok = (monthlyRequests * inputTokens) / 1e6;
      const outputMTok = (monthlyRequests * outputTokens) / 1e6;

      const cachedShare = cached ? 0.8 : 0;
      const inputCost =
        inputMTok * (1 - cachedShare) * model.price.input +
        inputMTok * cachedShare * (model.price.cacheRead ?? model.price.input);
      const outputCost = outputMTok * (model.price.output ?? 0);
      const batchFactor = batched ? 0.5 : 1;
      const total = (inputCost + outputCost) * batchFactor;

      totalOut.textContent = money(total, { digits: total >= 1000 ? 0 : 2 });
      detailOut.innerHTML = `
        ${nf(monthlyRequests)} requests · ${compact(inputMTok * 1e6, 1)} input + ${compact(outputMTok * 1e6, 1)} output tokens
        · ${money(inputCost * batchFactor)} in / ${money(outputCost * batchFactor)} out
        ${cached ? " · 80% cache hit" : ""}${batched ? " · batch discount applied" : ""}`;
    };

    [modelSelect, reqInput, inInput, outInput].forEach((node) => {
      node.addEventListener("input", recalc);
      node.addEventListener("change", recalc);
    });

    [cacheSwitch, batchSwitch].forEach((node) => {
      const toggle = () => {
        node.setAttribute("aria-checked", node.getAttribute("aria-checked") === "true" ? "false" : "true");
        recalc();
      };
      node.addEventListener("click", toggle);
      node.addEventListener("keydown", (event) => {
        if (event.key === " " || event.key === "Enter") { event.preventDefault(); toggle(); }
      });
    });

    recalc();
  }
};
