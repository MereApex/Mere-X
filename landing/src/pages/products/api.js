/* ============================================================
   THE API — the developer platform product page
   ============================================================ */

import { SAMPLES, SDK_LIST, RATE_TIERS, API_GROUPS } from "../../data/docs.js";
import { CHAT_MODELS, PRICING_NOTES } from "../../data/models.js";
import { icon } from "../../lib/icons.js";
import { perMillion, compact } from "../../lib/format.js";
import { pageHead, sectionHead, textLink, button, codeBlock, ctaBand, calloutBox, dataTable, featureCard } from "../../components/ui.js";

const SURFACE = [
  { icon: "message", t: "Messages", d: "One endpoint for chat, agents, vision, tools, and structured output. Streaming or not, your choice per request.", href: "/docs/messages" },
  { icon: "package", t: "Batch", d: "Up to a million requests per job at half price, with results streaming back as they complete.", href: "/docs/batch" },
  { icon: "network", t: "Embeddings", d: "Multilingual vectors with Matryoshka truncation from 3072 down to 256 dimensions.", href: "/docs/embeddings" },
  { icon: "image", t: "Images", d: "Generation and masked editing through Vision 2, with instruction-level control.", href: "/docs/vision" },
  { icon: "wave", t: "Audio", d: "Transcription, synthesis, and duplex realtime sessions with tool calling.", href: "/docs/api" },
  { icon: "shield", t: "Guard", d: "Standalone safety classification so you can apply your own thresholds before generation.", href: "/docs/safety" },
  { icon: "file", t: "Files", d: "Upload once, reference by ID across requests and batch jobs.", href: "/docs/api" },
  { icon: "building", t: "Organisation", d: "Programmatic usage, cost, and key management for your own internal tooling.", href: "/docs/api" }
];

const DEV_EXPERIENCE = [
  { icon: "bolt", t: "Two-minute first call", d: "Install, set an environment variable, send a message. No provisioning step, no model deployment, no waitlist." },
  { icon: "stack", t: "Typed everywhere", d: "Pydantic models in Python, full generics in TypeScript, and typed errors that tell you whether retrying will help." },
  { icon: "refresh", t: "Retries that are correct", d: "Idempotency keys on every mutating call, automatic backoff in the SDKs, and rate-limit headers you can actually act on." },
  { icon: "scan", t: "Observability by default", d: "Every response carries a request-id. Paste it into the console and see the exact prompt, tools, thinking budget, and token accounting." },
  { icon: "lock", t: "Versioned, not shifting", d: "Pin a date header and behaviour is frozen. Breaking changes ship behind a new version with a migration guide." },
  { icon: "card", t: "Costs you can model", d: "Count tokens before you send, cache prefixes at a tenth of the price, and set hard per-key spend limits." }
];

export default {
  title: "The Mere X API",
  description: "One API for messages, batch, embeddings, images, audio, and safety — with six SDKs and a console built for production.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Products", href: "/products" }, { label: "API" }],
        eyebrow: "Developer platform",
        title: "Build Mere X into your product.",
        lead: "One endpoint for everything conversational, agentic, and multimodal. Six SDKs, a console that shows you what your application is really doing, and pricing you can model before you ship.",
        actions: `${button({ label: "Get an API key", href: "/console/keys", icon: "key", magnetic: true }).value}
                  ${button({ label: "Read the docs", href: "/docs", variant: "secondary", icon: "book" }).value}`,
        meta: `
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">$10</span><span class="stat-label">Free starting credit</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">6</span><span class="stat-label">Official SDKs</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">99.98%</span><span class="stat-label">Uptime</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">50%</span><span class="stat-label">Batch discount</span></div>`
      }).value}

      <!-- ---- First call ---- -->
      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(24px,3vw,48px);align-items:center">
            <div data-reveal="left">
              ${sectionHead({ eyebrow: "Two minutes", title: "From nothing to an answer." }).value}
              <ol class="stack stack-4" style="counter-reset:s">
                ${[
                  ["Create a key", "In the console, scoped to what this service actually needs."],
                  ["Set the environment variable", "<code class=\"inline\">MERE_X_API_KEY</code>. The SDKs read it automatically."],
                  ["Send a message", "Pick a model, set max_tokens, and go."]
                ].map(([t, d], i) => `
                  <li class="row row-top" style="flex-wrap:nowrap;gap:14px">
                    <span class="avatar" style="width:28px;height:28px;flex-basis:28px;font-size:11px">${i + 1}</span>
                    <span><strong style="font-weight:400">${t}</strong><br><span class="small muted">${d}</span></span>
                  </li>`).join("")}
              </ol>
              <div class="row" style="margin-top:26px;gap:12px">
                ${button({ label: "Get a key", href: "/console/keys", variant: "secondary", size: "btn-sm", icon: "key" }).value}
                ${textLink("Full quickstart", "/docs/quickstart").value}
              </div>
            </div>
            <div data-reveal="right">${codeBlock(SAMPLES.firstCall).value}</div>
          </div>
        </div>
      </section>

      <!-- ---- Surface ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "API surface",
            title: "Eight endpoint groups, one key.",
            lead: "No separate products to provision, no per-service credentials, no different billing account for images."
          }).value}
          <div class="grid g-4" data-stagger="70">
            ${SURFACE.map((item) => `
              <a class="card card-hover card-spot" href="${item.href}" data-reveal>
                <div class="card-icon">${icon(item.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${item.t}</h3>
                <p class="small muted" style="line-height:1.58">${item.d}</p>
              </a>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Tools & structured ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "The two features people ship on", title: "Tool use and guaranteed-valid output." }).value}
          <div class="split" style="gap:clamp(24px,3vw,40px)">
            <div class="stack stack-4" data-reveal="left">
              <div>
                <h3 style="font-size:var(--t-h4);font-weight:400">Tool use</h3>
                <p class="small muted" style="margin-top:8px;line-height:1.62">
                  Describe your tools as JSON Schema and Mere X decides when to call them — often several
                  at once. Server-side tools for web search, code execution, and file handling run inside
                  our infrastructure, so an agent works before you have built a sandbox.
                </p>
              </div>
              ${codeBlock(SAMPLES.tools).value}
            </div>
            <div class="stack stack-4" data-reveal="right">
              <div>
                <h3 style="font-size:var(--t-h4);font-weight:400">Structured output</h3>
                <p class="small muted" style="margin-top:8px;line-height:1.62">
                  Constrained decoding enforces your schema at the token level. A response that fails
                  validation is unreachable — which means the retry-and-repair layer most applications
                  end up writing simply does not need to exist.
                </p>
              </div>
              ${codeBlock(SAMPLES.structured).value}
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Developer experience ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Developer experience", title: "The things you notice on day three." }).value}
          <div class="grid g-3" data-stagger="70">
            ${DEV_EXPERIENCE.map((item) => featureCard({ icon: item.icon, title: item.t, body: item.d }).value).join("")}
          </div>
        </div>
      </section>

      <!-- ---- SDKs ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "SDKs",
            title: "Pick your language.",
            action: textLink("SDK documentation", "/docs/sdks").value
          }).value}
          <div class="grid g-3" data-stagger="70">
            ${SDK_LIST.map((sdk) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="between" style="align-items:flex-start">
                  <div class="card-icon">${icon(sdk.icon).value}</div>
                  <span class="badge badge-plain mono">v${sdk.version}</span>
                </div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${sdk.name}</h3>
                <p class="small muted" style="line-height:1.58">${sdk.note}</p>
                <code class="mono xs" style="display:block;margin-top:auto;padding:10px 12px;border-radius:var(--r-xs);background:var(--paper-sunken);color:var(--ink-2);word-break:break-all">${sdk.install}</code>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Caching and batch ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="split split-60" style="gap:clamp(24px,3vw,48px);align-items:center">
            <div data-reveal="left">
              <p class="eyebrow">Economics</p>
              <h2 style="margin-top:18px">Two levers that cut most bills in half.</h2>
              <p class="lead" style="margin-top:18px">
                Prompt caching makes a stable prefix — a corpus, a system prompt, a tool schema —
                cost a tenth to re-read. Batch halves everything for work nobody is waiting on.
                Used together they routinely take a production bill down by 60–70%.
              </p>
              <div class="grid g-2" style="margin-top:28px;gap:12px">
                ${PRICING_NOTES.map((note) => `
                  <div class="card card-sunken card-pad-sm" data-reveal>
                    <div class="xs muted upper">${note.label}</div>
                    <div style="font-size:var(--t-body);margin-top:4px">${note.value}</div>
                    <div class="xs muted" style="margin-top:4px">${note.detail}</div>
                  </div>`).join("")}
              </div>
              <div class="row" style="margin-top:24px">${textLink("Cost optimisation guide", "/docs/pricing-guide").value}</div>
            </div>
            <div class="stack stack-4" data-reveal="right">
              ${codeBlock(SAMPLES.caching).value}
              ${codeBlock(SAMPLES.batch).value}
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Pricing table ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Pricing", title: "Per million tokens.", action: textLink("Full pricing", "/pricing").value }).value}
          ${dataTable({
            columns: [
              { key: "name", label: "Model", render: (m) => `<a class="link-plain" href="/technology/models/${m.id}"><strong>${m.name}</strong><div class="xs muted mono">${m.id}</div></a>` },
              { key: "context", label: "Context", align: "right", render: (m) => compact(m.context, 0) },
              { key: "in", label: "Input", align: "right", render: (m) => perMillion(m.price.input) },
              { key: "out", label: "Output", align: "right", render: (m) => (m.price.output ? perMillion(m.price.output) : "Free") },
              { key: "cw", label: "Cache write", align: "right", render: (m) => (m.price.cacheWrite != null ? perMillion(m.price.cacheWrite) : "—") },
              { key: "cr", label: "Cache read", align: "right", render: (m) => (m.price.cacheRead != null ? perMillion(m.price.cacheRead) : "—") }
            ],
            rows: CHAT_MODELS,
            hint: "Batch runs at 50% of these rates. Guard classification is free on every request."
          }).value}
        </div>
      </section>

      <!-- ---- Rate limits ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Rate limits",
            title: "Tiers that rise automatically.",
            lead: "No forms, no sales call to get more throughput. Tiers advance on deposit history, and every response tells you where you stand.",
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
          <div style="margin-top:20px;max-width:74ch">
            ${calloutBox("Need guaranteed capacity rather than a shared pool? Provisioned throughput reserves inference for you with a latency SLA and no 529s.", { variant: "accent", icon: "server" }).value}
          </div>
        </div>
      </section>

      <!-- ---- Reference preview ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Reference", title: "Every endpoint, documented.", action: textLink("Full API reference", "/docs/api").value }).value}
          <div class="grid g-4" data-stagger="60">
            ${API_GROUPS.map((group) => `
              <a class="card card-hover card-pad-sm" href="/docs/api" data-reveal>
                <h3 style="font-size:var(--t-sm);font-weight:500">${group.name}</h3>
                <p class="xs muted" style="line-height:1.5">${group.description}</p>
                <div class="row row-tight" style="margin-top:auto;padding-top:10px">
                  ${group.endpoints.slice(0, 3).map((e) => `<span class="method ${e.method}">${e.method === "del" ? "delete" : e.method}</span>`).join("")}
                  ${group.endpoints.length > 3 ? `<span class="xs muted">+${group.endpoints.length - 3}</span>` : ""}
                </div>
              </a>`).join("")}
          </div>
        </div>
      </section>

      ${ctaBand({
        eyebrow: "Ten dollars, no card",
        title: "Your first request is two minutes away.",
        primary: { label: "Get an API key", href: "/console/keys", icon: "arrow-ne" },
        secondary: { label: "Read the quickstart", href: "/docs/quickstart" }
      }).value}
    `;
  }
};
