/* ============================================================
   RESEARCH — interpretability
   ============================================================ */

import { PUBLICATIONS } from "../../data/content.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, entryList, calloutBox, codeBlock, statTile } from "../../components/ui.js";

const METHODS = [
  {
    icon: "network", n: "01", title: "Attribution graphs",
    body: "For a given output, we trace which internal features contributed and by how much, producing a directed graph from input tokens through intermediate computation to the final logit. It is the closest thing we have to a stack trace for a forward pass.",
    limits: "Graphs get unwieldy past a few hundred nodes, and pruning them requires judgement we have not yet automated."
  },
  {
    icon: "scan", n: "02", title: "Feature dictionaries",
    body: "Sparse autoencoders decompose the residual stream into interpretable features — 'legal citation format', 'the user is frustrated', 'this code path handles an error'. Roughly 62% of features in Core have a human-legible description.",
    limits: "The other 38% are either polysemantic or genuinely alien. We do not know which, and that distinction matters."
  },
  {
    icon: "branch", n: "03", title: "Circuit tracing",
    body: "Reusable computational motifs that appear across many tasks: entity binding, arithmetic carry, refusal routing. We have annotated 1,400 of them and released the set.",
    limits: "Circuits identified in one checkpoint do not always survive further training. Stability is an open problem."
  },
  {
    icon: "sliders", n: "04", title: "Activation steering",
    body: "Once a direction in activation space is identified, it can be amplified or suppressed. Steering refusal directions is a safety tool; it is also, uncomfortably, a jailbreak surface.",
    limits: "Steering degrades general capability in ways that are hard to bound. We do not ship it in production."
  }
];

const FINDINGS = [
  { t: "Refusal is low-dimensional", d: "Refusal behaviour in Mere X concentrates along a small number of residual directions. This makes it monitorable — and steerable, which is why we treat the finding as a vulnerability as much as a result." },
  { t: "Arithmetic uses a lookup, then a check", d: "Two-digit addition resolves through an approximate lookup followed by a verification circuit. When the verification circuit is ablated, the model becomes confidently wrong rather than uncertain." },
  { t: "Planning happens before the first token", d: "For structured outputs, features corresponding to the final section appear in the residual stream while the model is still emitting the opening line. The model is not improvising forward." },
  { t: "Deliberation reuses answering circuits", d: "Thinking tokens activate largely the same machinery as answering, at higher precision. Deliberation is not a separate faculty — it is the same computation, run more carefully." }
];

export default {
  title: "Interpretability",
  description: "Attribution graphs, feature dictionaries, and circuit tracing at production scale — with the tooling released.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Research", href: "/research" }, { label: "Interpretability" }],
        eyebrow: "Research area",
        title: "Reading what the model is actually doing.",
        lead: "A capability we cannot explain is a capability we cannot trust. This group builds the tools that turn a forward pass from a black box into something you can argue about.",
        actions: `${button({ label: "Read the papers", href: "/research/publications", icon: "arrow-right" }).value}
                  ${button({ label: "The tooling", href: "#tooling", variant: "secondary", icon: "code" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="grid g-4" data-stagger="90">
            ${statTile({ value: 1400, label: "Circuits annotated", note: "Released open source" }).value}
            ${statTile({ value: 62, suffix: "%", label: "Features described", note: "Human-legible in Core" }).value}
            ${statTile({ value: 34, label: "Researchers", note: "Largest single group" }).value}
            ${statTile({ value: 9, label: "Publications", note: "In this area" }).value}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Methods",
            title: "Four techniques, and where each one breaks.",
            lead: "Every method below has been run against a model serving real traffic. The limits are stated because they are the interesting part."
          }).value}
          <div class="stack stack-4" data-stagger="80">
            ${METHODS.map((m) => `
              <article class="card card-pad-lg card-spot card-hover" data-reveal style="flex-direction:row;gap:clamp(20px,3vw,40px);flex-wrap:wrap">
                <div style="flex:0 0 auto;display:flex;gap:16px;align-items:flex-start;min-width:190px">
                  <div class="card-icon" style="width:46px;height:46px">${icon(m.icon).value}</div>
                  <div><div class="card-num">${m.n}</div><h3 style="font-size:var(--t-h4);font-weight:400;margin-top:2px">${m.title}</h3></div>
                </div>
                <div style="flex:1 1 340px;min-width:0">
                  <p class="ink-3" style="line-height:1.66">${m.body}</p>
                  <p class="xs" style="margin-top:12px;padding-left:14px;border-left:2px solid var(--line-strong);color:var(--muted);line-height:1.55">
                    <strong style="font-weight:500;color:var(--ink-3)">Where it breaks:</strong> ${m.limits}
                  </p>
                </div>
              </article>`).join("")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Findings", title: "Four things we did not expect." }).value}
          <div class="grid g-2" data-stagger="90">
            ${FINDINGS.map((f, i) => `
              <div class="card card-sunken card-pad-lg" data-reveal>
                <span class="card-num">${String(i + 1).padStart(2, "0")}</span>
                <h3 style="font-size:var(--t-h4);font-weight:400">${f.t}</h3>
                <p class="small ink-3" style="line-height:1.66">${f.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line" id="tooling">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(24px,3vw,48px);align-items:center">
            <div data-reveal="left">
              ${sectionHead({ eyebrow: "Open tooling", title: "Run it yourself." }).value}
              <p class="lead measure">
                The tracing library, the attribution-graph viewer, and 1,400 annotated circuits are
                published. A method nobody outside the lab can run is a claim, not a result.
              </p>
              <div style="margin-top:22px">
                ${calloutBox("The tooling runs against open-weight models as well as ours. We would rather the field converge on shared instruments than each lab keep its own.", { variant: "accent", icon: "microscope" }).value}
              </div>
              <div class="row" style="margin-top:22px">${textLink("Read the circuit-tracing paper", "/research/publications").value}</div>
            </div>
            <div data-reveal="right">
              ${codeBlock({
                Python: `from mere_x.trace import AttributionGraph

graph = AttributionGraph.from_forward_pass(
    model="mere-4-2-core",
    prompt="The capital of the country north of France is",
    target_token=" Brussels",
)

# Which features carried the answer?
for node in graph.top_contributors(k=8):
    print(f"{node.layer:>3}  {node.weight:+.3f}  {node.description}")

#  14  +0.412  geographic-adjacency
#  19  +0.318  country-to-capital lookup
#  22  +0.204  European capitals cluster
#  17  -0.118  "north of" directional parse
graph.render("attribution.html")`
              }).value}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Publications", title: "Work from this group.", action: textLink("All publications", "/research/publications").value }).value}
          ${entryList(PUBLICATIONS.filter((p) => p.tags.includes("Interpretability")).map((paper) => ({
            meta: `${paper.date.slice(0, 7)} · ${paper.kind}`,
            title: paper.title,
            desc: paper.summary,
            tags: paper.tags,
            href: "/research/publications"
          }))).value}
        </div>
      </section>

      ${ctaBand({
        title: "This group is hiring.",
        body: "Research scientists and research engineers, in San Francisco and London.",
        primary: { label: "Open roles", href: "/company/careers", icon: "arrow-ne" },
        secondary: { label: "The residency", href: "/research/residency" }
      }).value}
    `;
  }
};
