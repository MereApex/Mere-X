/* ============================================================
   ARCHITECTURE — how Mere X is built
   ============================================================ */

import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, calloutBox, accordion } from "../../components/ui.js";

const STACK = [
  {
    n: "01", icon: "atom", title: "Sparse mixture of experts",
    body: "Each Mere model activates a fraction of its parameters per token. Routing is learned without auxiliary load-balancing losses, which removes the training instability that usually accompanies sparse models at this scale.",
    facts: ["Learned routing, no auxiliary loss", "Expert utilisation within 4% of uniform", "Activated parameters scale with reasoning depth"]
  },
  {
    n: "02", icon: "layers", title: "Hierarchical attention",
    body: "A million-token window is not one attention pattern. Local windows handle nearby structure, a sparse global tier carries long-range dependencies, and a learned retrieval head pulls specific spans back into focus on demand.",
    facts: ["Local · global · retrieval tiers", "Sub-quadratic cost above 128K tokens", "Recall measured adversarially, not by position"]
  },
  {
    n: "03", icon: "sliders", title: "The deliberation head",
    body: "Thinking is a separate decoding phase with its own head and its own budget. It can call tools, revise, and abandon lines of reasoning without any of it reaching the output stream.",
    facts: ["Separate thinking and answering phases", "Interleaved tool calls mid-deliberation", "Structured summaries, not raw chain-of-thought"]
  },
  {
    n: "04", icon: "image", title: "Unified multimodal encoder",
    body: "Text, images, documents, and audio enter the same residual stream through modality-specific encoders trained jointly. A chart and its caption end up in comparable representational space, which is why cross-modal questions work.",
    facts: ["Joint training across four modalities", "Layout-preserving document encoder", "Shared representation space"]
  },
  {
    n: "05", icon: "shield", title: "The safety layer",
    body: "Guard runs as a parallel head rather than a post-processing pass, so classification costs almost nothing and cannot be bypassed by output streaming. Refusal behaviour is trained, measured, and — thanks to interpretability work — locatable in the residual stream.",
    facts: ["Parallel classification head", "Free on every request", "Refusal directions identified and monitored"]
  },
  {
    n: "06", icon: "stack", title: "Constrained decoding",
    body: "JSON Schema enforcement happens at the token level during sampling. A response that violates your schema is not merely discouraged — it is unreachable.",
    facts: ["Token-level grammar constraints", "No measurable quality penalty", "Streaming partial objects"]
  }
];

const TRAINING = [
  { phase: "Pretraining", detail: "A mixture weighted toward reasoning-dense sources: mathematics, source code with its tests, scientific text, and long-form argument. Deduplicated at document and passage level, with contamination screening against every published evaluation we use." },
  { phase: "Mid-training", detail: "Long-context extension to one million tokens, multimodal alignment, and the deliberation phase — where the model learns that thinking longer is sometimes worth it, and often is not." },
  { phase: "Post-training", detail: "Preference optimisation against human and model feedback, with explicit training for calibrated uncertainty. A model that says 'I am not sure' when it is not sure was a target, not a side effect." },
  { phase: "Safety training", detail: "Adversarial fine-tuning against the red-team corpus, refusal calibration to reduce over-refusal, and the Guard head trained jointly against the harm taxonomy." },
  { phase: "Evaluation gate", detail: "The Responsible Scaling Policy thresholds are evaluated before release. The safety organisation holds the gate; product does not." }
];

const FAQ_ITEMS = [
  { q: "How large are the Mere models?", a: "<p>We do not publish parameter counts. They correlate poorly with capability across architectures, and publishing them mostly fuels comparisons that mislead. What we do publish is throughput, latency, context, and evaluation results — the things that determine whether a model works for your problem.</p>" },
  { q: "Is the tokenizer shared across the family?", a: "<p>Yes. Peak, Core, and Lite share a 200,000-entry tokenizer, so token counts and therefore costs are directly comparable between them. Switching model is genuinely a one-line change.</p>" },
  { q: "What does 'sub-quadratic above 128K' mean in practice?", a: "<p>That cost grows close to linearly rather than quadratically once the context exceeds 128,000 tokens. Concretely: a one-million-token prompt costs roughly eight times a 128K prompt, not sixty.</p>" },
  { q: "Do you distil the smaller models from Peak?", a: "<p>Partly. Core and Lite are trained with Peak as one of several teachers, but they are not pure distillations — each has its own post-training and its own safety pass, which is why their refusal behaviour is calibrated separately.</p>" }
];

export default {
  title: "Architecture",
  description: "How Mere X is built: sparse routing, hierarchical attention, the deliberation head, and a safety layer that runs in parallel.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Technology", href: "/technology" }, { label: "Architecture" }],
        eyebrow: "Under the hood",
        title: "Six design decisions that shaped the Mere models.",
        lead: "We publish architecture, not parameter counts. What follows is the set of choices that determine how the model behaves — and where each of them still falls short.",
        actions: `${button({ label: "Read the technical report", href: "/research/publications", icon: "arrow-ne" }).value}
                  ${button({ label: "Infrastructure", href: "/technology/infrastructure", variant: "secondary", icon: "server" }).value}`
      }).value}

      <section class="section">
        <div class="shell shell-wide">
          <div class="stack stack-4" data-stagger="80">
            ${STACK.map((item) => `
              <article class="card card-pad-lg card-spot card-hover" data-reveal style="flex-direction:row;gap:clamp(20px,3vw,44px);align-items:flex-start;flex-wrap:wrap">
                <div style="flex:0 0 auto;display:flex;gap:18px;align-items:center;min-width:200px">
                  <div class="card-icon" style="width:52px;height:52px">${icon(item.icon).value}</div>
                  <div>
                    <div class="card-num">${item.n}</div>
                    <h3 style="font-size:var(--t-h4);font-weight:400;margin-top:2px">${item.title}</h3>
                  </div>
                </div>
                <div style="flex:1 1 340px;min-width:0">
                  <p class="ink-3" style="line-height:1.68">${item.body}</p>
                  <div class="row" style="margin-top:16px;gap:8px">
                    ${item.facts.map((fact) => `<span class="badge badge-plain">${fact}</span>`).join("")}
                  </div>
                </div>
              </article>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Training pipeline ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(28px,4vw,64px);align-items:start">
            <div data-reveal="left">
              <p class="eyebrow">Training</p>
              <h2 style="margin-top:18px">Five stages, one gate.</h2>
              <p class="lead" style="margin-top:18px">
                Capability work and safety work are not sequential phases where one waits for the other.
                They run in parallel and meet at a release gate that the safety organisation controls.
              </p>
              <div style="margin-top:26px">
                ${calloutBox("We have used the gate. Mere Code slipped six weeks because a red-team finding on tool-use chains had no mitigation we were confident in. The finding is documented in the system card.", { variant: "accent", icon: "shield" }).value}
              </div>
              <div style="margin-top:22px">${textLink("Read the Responsible Scaling Policy", "/safety/scaling-policy").value}</div>
            </div>
            <div class="timeline" data-reveal="right">
              ${TRAINING.map((stage) => `
                <div class="tl-item">
                  <div class="tl-title" style="font-size:var(--t-h4)">${stage.phase}</div>
                  <p class="tl-body">${stage.detail}</p>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Diagram ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Request path", title: "What happens between your call and the first token." }).value}
          <div class="panel-dark" data-reveal>
            <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0;align-items:stretch">
              ${[
                ["Ingress", "TLS, auth, rate-limit accounting", "lock"],
                ["Guard (in)", "Harm classification, free", "shield"],
                ["Cache lookup", "Prefix match, 10% of input price", "database"],
                ["Deliberation", "Thinking budget spent here", "atom"],
                ["Tool loop", "Server-side and your tools", "plug"],
                ["Decode", "Constrained if a schema is set", "stack"],
                ["Guard (out)", "Output classification", "shield"],
                ["Stream", "SSE to your client", "activity"]
              ].map(([title, body, ic], index, arr) => `
                <div style="padding:20px 18px;border-right:${index === arr.length - 1 ? "0" : "1px solid rgba(255,255,255,.12)"}">
                  <div style="color:rgba(255,255,255,.55);margin-bottom:12px">${icon(ic).value}</div>
                  <div style="font-size:var(--t-sm);color:#fff">${title}</div>
                  <div class="xs" style="color:rgba(255,255,255,.5);margin-top:5px;line-height:1.5">${body}</div>
                </div>`).join("")}
            </div>
            <p class="xs" style="color:rgba(255,255,255,.45);margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,.12)">
              Median overhead outside the model itself: 34 ms. Guard adds under 8 ms because it runs as a parallel head, not a second pass.
            </p>
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "What we get asked." }).value}
          ${accordion(FAQ_ITEMS, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "The details are in the papers.",
        body: "Technical reports, evaluation methodology, and the interpretability tooling — published rather than summarised.",
        primary: { label: "Read our research", href: "/research/publications", icon: "arrow-ne" },
        secondary: { label: "Infrastructure", href: "/technology/infrastructure" }
      }).value}
    `;
  }
};
