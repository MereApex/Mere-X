/* ============================================================
   DOCS — nav, block renderer, API reference, cookbook, prompts
   ============================================================ */

import { DOCS_NAV, DOCS_ORDER, API_GROUPS, SAMPLES } from "../data/docs.js";
import { DOC_PAGES } from "../data/docs-pages.js";
import { RECIPES, PROMPT_PATTERNS } from "../data/content.js";
import { icon } from "../lib/icons.js";
import { slugify } from "../lib/format.js";
import { codeBlock, dataTable, calloutBox, textLink, ctaBand, button } from "../components/ui.js";
import { onLeave } from "../lib/router.js";

/* ---------- block renderer ---------- */

function renderBlock(block) {
  switch (block.t) {
    case "p":
      return `<p>${block.v}</p>`;
    case "h2":
      return `<h2 id="${slugify(block.v)}">${block.v}</h2>`;
    case "h3":
      return `<h3 id="${slugify(block.v)}">${block.v}</h3>`;
    case "ul":
      return `<ul>${block.v.map((item) => `<li>${item}</li>`).join("")}</ul>`;
    case "ol":
      return `<ol>${block.v.map((item) => `<li>${item}</li>`).join("")}</ol>`;
    case "code":
      return codeBlock(block.v.samples, { caption: block.v.caption }).value;
    case "callout":
      return calloutBox(block.v.text, { variant: block.v.variant, icon: block.v.icon || "info" }).value;
    case "table":
      return dataTable(block.v).value;
    case "cards":
      return `<div class="grid g-2" style="margin-top:1.4em">${block.v.map((card) => `
        <a class="card card-hover card-spot card-pad-sm" href="${card.href}">
          <div class="card-icon" style="width:34px;height:34px">${icon(card.icon).value}</div>
          <h4 style="font-weight:500;font-size:var(--t-sm)">${card.title}</h4>
          <p class="xs muted" style="line-height:1.55">${card.body}</p>
        </a>`).join("")}</div>`;
    case "steps":
      return `<div class="timeline" style="margin-top:1.4em">${block.v.map((step) => `
        <div class="tl-item is-in">
          <div class="tl-title" style="font-size:var(--t-body)">${step.title}</div>
          <p class="tl-body">${step.body}</p>
        </div>`).join("")}</div>`;
    default:
      return "";
  }
}

/* ---------- special pages ---------- */

function renderApiReference() {
  return `
    <h1>API reference</h1>
    <p class="lead" style="margin-bottom:26px">
      Base URL <code class="inline">https://api.merex.ai</code>. Every request needs an
      <code class="inline">x-api-key</code> header and a <code class="inline">mere-x-version</code> header.
    </p>

    ${API_GROUPS.map((group) => `
      <section style="margin-top:3em">
        <h2 id="${slugify(group.name)}">${group.name}</h2>
        <p class="muted" style="margin-bottom:1.2em">${group.description}</p>
        <div class="stack stack-4">
          ${group.endpoints.map((endpoint) => `
            <div class="endpoint">
              <div class="endpoint-head">
                <span class="method ${endpoint.method}">${endpoint.method === "del" ? "delete" : endpoint.method}</span>
                <code class="endpoint-path">${endpoint.path}</code>
                <span class="endpoint-desc">${endpoint.title}</span>
              </div>
              <div class="endpoint-body">
                <p class="small ink-3" style="margin-bottom:14px">${endpoint.description}</p>
                <div class="params">
                  ${endpoint.params.map((param) => `
                    <div class="param">
                      <div>
                        <div class="param-name">${param.name}${param.required ? '<span class="param-req">required</span>' : ""}</div>
                        <div class="param-type">${param.type}</div>
                      </div>
                      <div class="param-desc">${param.desc}</div>
                    </div>`).join("")}
                </div>
                <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line-soft)">
                  <span class="xs muted upper">Returns</span>
                  <p class="small ink-3" style="margin-top:5px">${endpoint.returns}</p>
                </div>
              </div>
            </div>`).join("")}
        </div>
      </section>`).join("")}

    <section style="margin-top:3em">
      <h2 id="headers">Headers</h2>
      ${dataTable({
        columns: [{ key: "h", label: "Header" }, { key: "req", label: "Required" }, { key: "d", label: "Description" }],
        rows: [
          { h: "<code class=\"inline\">x-api-key</code>", req: "Yes", d: "Your API key." },
          { h: "<code class=\"inline\">mere-x-version</code>", req: "Yes", d: "API version date, e.g. 2026-06-18. Pin it in production." },
          { h: "<code class=\"inline\">content-type</code>", req: "Yes", d: "application/json for all JSON endpoints." },
          { h: "<code class=\"inline\">idempotency-key</code>", req: "No", d: "Replays the original response if the same key arrives twice within 24 hours." },
          { h: "<code class=\"inline\">mere-x-beta</code>", req: "No", d: "Comma-separated beta feature flags." }
        ]
      }).value}
    </section>`;
}

function renderCookbook() {
  return `
    <h1>Cookbook</h1>
    <p class="lead" style="margin-bottom:26px">
      Working recipes for the patterns that keep coming up. Each one is a complete, runnable
      example rather than a fragment.
    </p>
    <div class="grid g-2" style="margin-bottom:2.4em">
      ${RECIPES.map((recipe) => `
        <a class="card card-hover card-spot" href="/docs/cookbook#${recipe.slug}">
          <div class="between" style="align-items:flex-start">
            <div class="card-icon" style="width:38px;height:38px">${icon(recipe.icon).value}</div>
            <span class="badge badge-plain">${recipe.level}</span>
          </div>
          <h3 style="font-size:var(--t-h4);font-weight:400">${recipe.title}</h3>
          <p class="small muted" style="line-height:1.55">${recipe.summary}</p>
          <div class="row row-tight xs muted" style="margin-top:auto;padding-top:10px">
            ${icon("clock", "icon").value}<span>${recipe.time}</span>
            <span class="nav-sep"></span>
            <span>${recipe.langs.join(", ")}</span>
          </div>
        </a>`).join("")}
    </div>

    <h2 id="streaming-chat">Streaming chat with tool use</h2>
    <p>The complete loop: stream tokens, handle a tool call mid-stream, resume.</p>
    ${codeBlock(SAMPLES.streaming).value}
    ${codeBlock(SAMPLES.tools).value}

    <h2 id="structured-extraction">Guaranteed-valid structured extraction</h2>
    <p>Pull typed records out of messy documents. The schema is enforced during sampling, so there is no repair step.</p>
    ${codeBlock(SAMPLES.structured).value}

    <h2 id="long-context">Working a million-token corpus</h2>
    <p>Load the whole thing, cache the prefix, and query it repeatedly at a tenth of the input price.</p>
    ${codeBlock(SAMPLES.caching).value}

    <h2 id="batch-pipeline">Half-price batch pipelines</h2>
    <p>Classify a million records overnight. Results stream back as they complete.</p>
    ${codeBlock(SAMPLES.batch).value}

    <h2 id="rag-citations">RAG with real citations</h2>
    <p>Embed, retrieve, and answer with every claim pointing at a source span.</p>
    ${codeBlock(SAMPLES.embeddings).value}

    <h2 id="agent-loop">A durable agent loop</h2>
    <p>Long-horizon agents with compaction, checkpoints, and resumption after failure.</p>
    ${codeBlock(SAMPLES.agent).value}

    <h2 id="vision-documents">Reading scanned documents</h2>
    <p>PDFs and photographs in, structured layout-aware output back.</p>
    ${codeBlock(SAMPLES.vision).value}

    <h2 id="evals">Evaluating your own prompts</h2>
    <p>Fifty real examples graded by someone who knows what good looks like will tell you more than any public benchmark.</p>
    ${codeBlock({
      Python: `from mere_x.evals import Suite, Case, judge

suite = Suite(
    name="support-triage",
    cases=[Case(input=row["ticket"], expect=row["queue"]) for row in golden],
)

report = suite.run(
    model="mere-orion-3",
    thinking={"type": "enabled", "budget_tokens": 4000},
    grader=judge.exact_match,
    runs=5,
)

print(report.mean, report.stdev)
for failure in report.failures[:10]:
    print(failure.input, "->", failure.got, "expected", failure.expect)`
    }).value}`;
}

function renderPrompts() {
  return `
    <h1>Prompt library</h1>
    <p class="lead" style="margin-bottom:26px">
      Patterns that hold up in production, with the reason each one works.
    </p>
    <div class="grid g-2" style="margin-bottom:2.4em">
      ${PROMPT_PATTERNS.map((pattern) => `
        <div class="card card-hover card-spot">
          <span class="badge badge-plain">${pattern.tag}</span>
          <h3 style="font-size:var(--t-h4);font-weight:400">${pattern.title}</h3>
          <p class="small muted" style="line-height:1.6">${pattern.body}</p>
        </div>`).join("")}
    </div>

    <h2 id="a-good-system-prompt">Anatomy of a system prompt</h2>
    ${codeBlock({
      Text: `You are a contract analyst for a mid-market SaaS company.       ← role

Extract the commercial terms from agreements the user provides.  ← task

Rules:                                                            ← constraints
- If a term is not stated, return null. Never infer one.
- Quote the exact clause text you relied on.
- If the document is not a contract, say so and stop.
- Do not offer legal advice or opinions on enforceability.

Return JSON matching the provided schema. No prose.               ← format`
    }, { caption: "Role, task, constraints, format — in that order. Format last, because later instructions carry slightly more weight." }).value}

    <h2 id="giving-an-out">Giving the model an out</h2>
    <p>Models confabulate most when every path except answering has been closed off. Naming the escape hatch is the single highest-return prompt change most applications can make.</p>
    ${codeBlock({
      Text: `Weak:
  "Extract the governing law from this contract."

Better:
  "Extract the governing law. If the contract does not specify one,
   return null — do not infer it from the parties' addresses or from
   the choice of forum."`
    }).value}

    <h2 id="long-context-order">Ordering a long prompt</h2>
    ${codeBlock({
      Text: `1. System prompt          stable  →  cached
2. Tool definitions       stable  →  cached
3. Corpus / documents     stable  →  cached, breakpoint here
4. Conversation history   varies
5. The question           last

Order matters for quality as well as cost: the model weights later
instructions slightly higher, so a question buried above 400K tokens
of context genuinely receives less attention than one at the end.`
    }).value}

    <h2 id="naming-the-failure">Naming the failure you fear</h2>
    <p>A general instruction to "be accurate" does almost nothing. An instruction that names the specific error you are worried about does a great deal.</p>
    ${codeBlock({
      Text: `Instead of:  "Be careful with dates."

Write:       "Dates in this corpus appear in both DD/MM and MM/DD form.
              If a date is ambiguous, return the raw string in
              date_raw and leave date_iso null."`
    }).value}`;
}

/* ---------- page ---------- */

export default {
  title: (ctx) => {
    const slug = ctx.params.slug || "";
    if (slug === "api") return "API reference";
    if (slug === "cookbook") return "Cookbook";
    if (slug === "prompts") return "Prompt library";
    return DOC_PAGES[slug]?.title || "Documentation";
  },
  description: (ctx) => DOC_PAGES[ctx.params.slug || ""]?.lead || "Mere X developer documentation.",

  render(ctx) {
    const slug = ctx.params.slug || "";
    const index = DOCS_ORDER.findIndex((item) => item.slug === slug);
    const prev = index > 0 ? DOCS_ORDER[index - 1] : null;
    const next = index >= 0 && index < DOCS_ORDER.length - 1 ? DOCS_ORDER[index + 1] : null;

    let body;
    let headings = [];

    if (slug === "api") {
      body = renderApiReference();
      headings = API_GROUPS.map((g) => ({ id: slugify(g.name), text: g.name })).concat([{ id: "headers", text: "Headers" }]);
    } else if (slug === "cookbook") {
      body = renderCookbook();
      headings = [
        ["streaming-chat", "Streaming chat"], ["structured-extraction", "Structured extraction"],
        ["long-context", "Long context"], ["batch-pipeline", "Batch pipelines"],
        ["rag-citations", "RAG with citations"], ["agent-loop", "Agent loop"],
        ["vision-documents", "Scanned documents"], ["evals", "Evaluating prompts"]
      ].map(([id, text]) => ({ id, text }));
    } else if (slug === "prompts") {
      body = renderPrompts();
      headings = [
        ["a-good-system-prompt", "Anatomy of a system prompt"], ["giving-an-out", "Giving the model an out"],
        ["long-context-order", "Ordering a long prompt"], ["naming-the-failure", "Naming the failure"]
      ].map(([id, text]) => ({ id, text }));
    } else {
      const page = DOC_PAGES[slug];
      if (!page) {
        body = `
          <h1>Not in the documentation</h1>
          <p class="lead">There is no page at <code class="inline">/docs/${slug}</code>. Try the navigation, or start at the <a href="/docs">introduction</a>.</p>`;
      } else {
        headings = page.blocks.filter((b) => b.t === "h2").map((b) => ({ id: slugify(b.v), text: b.v }));
        body = `
          <h1>${page.title}</h1>
          ${page.lead ? `<p class="lead" style="margin-bottom:26px">${page.lead}</p>` : ""}
          ${page.blocks.map(renderBlock).join("")}`;
      }
    }

    return `
      <div class="shell shell-wide">
        <div class="docs">
          <!-- ---- side nav ---- -->
          <nav class="docs-nav" aria-label="Documentation">
            <div style="margin-bottom:22px">
              <input class="input" data-docs-search placeholder="Search docs…" style="padding-block:8px;font-size:var(--t-xs)">
            </div>
            ${DOCS_NAV.map((group) => `
              <div class="docs-nav-group" data-nav-group>
                <p class="docs-nav-title">${group.title}</p>
                ${group.items.map((item) => `
                  <a href="/docs${item.slug ? `/${item.slug}` : ""}"
                     class="${item.slug === slug ? "is-active" : ""}"
                     data-nav-item data-label="${item.title.toLowerCase()}">${item.title}</a>`).join("")}
              </div>`).join("")}
            <div class="docs-nav-group">
              <p class="docs-nav-title">More</p>
              <a href="/console" data-nav-item data-label="console">Developer console</a>
              <a href="/changelog" data-nav-item data-label="changelog">Changelog</a>
              <a href="/status" data-nav-item data-label="status">Status</a>
              <a href="/support" data-nav-item data-label="support">Support</a>
            </div>
          </nav>

          <!-- ---- body ---- -->
          <article class="docs-body prose" style="max-width:none">
            ${body}
            ${(prev || next) ? `
              <div class="docs-pager">
                ${prev ? `<a href="/docs${prev.slug ? `/${prev.slug}` : ""}"><div class="dir">Previous</div><div class="ttl">${prev.title}</div></a>` : "<span></span>"}
                ${next ? `<a class="next" href="/docs${next.slug ? `/${next.slug}` : ""}"><div class="dir">Next</div><div class="ttl">${next.title}</div></a>` : "<span></span>"}
              </div>` : ""}
          </article>

          <!-- ---- toc ---- -->
          <aside class="docs-toc">
            ${headings.length ? `
              <p class="docs-toc-title">On this page</p>
              ${headings.map((h) => `<a href="#${h.id}" data-toc="${h.id}">${h.text}</a>`).join("")}` : ""}
            <div style="margin-top:26px;padding-top:18px;border-top:1px solid var(--line)">
              <a class="link" href="/console" style="font-size:var(--t-xs)"><span>Open the console</span>${icon("arrow-ne", "icon").value}</a>
            </div>
          </aside>
        </div>
      </div>

      ${ctaBand({
        title: "Build it.",
        body: "Ten dollars of credit and an API key in under a minute.",
        primary: { label: "Open the console", href: "/console", icon: "arrow-ne" },
        secondary: { label: "Cookbook", href: "/docs/cookbook" }
      }).value}
    `;
  },

  mount(root) {
    /* ---- nav search ---- */
    const search = root.querySelector("[data-docs-search]");
    if (search) {
      search.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        root.querySelectorAll("[data-nav-item]").forEach((link) => {
          link.style.display = !query || link.dataset.label.includes(query) ? "" : "none";
        });
        root.querySelectorAll("[data-nav-group]").forEach((group) => {
          const visible = Array.from(group.querySelectorAll("[data-nav-item]")).some((l) => l.style.display !== "none");
          group.style.display = visible ? "" : "none";
        });
      });
    }

    /* ---- scroll-spy on the table of contents ---- */
    const tocLinks = Array.from(root.querySelectorAll("[data-toc]"));
    if (!tocLinks.length) return;

    const targets = tocLinks
      .map((link) => document.getElementById(link.dataset.toc))
      .filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        tocLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.toc === entry.target.id));
      });
    }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });

    targets.forEach((target) => observer.observe(target));
    onLeave(() => observer.disconnect());
  }
};
