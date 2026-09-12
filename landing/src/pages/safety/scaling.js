/* ============================================================
   SAFETY — Responsible Scaling Policy
   ============================================================ */

import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, calloutBox, dataTable, accordion } from "../../components/ui.js";

const LEVELS = [
  {
    level: "CSL-1", name: "No meaningful uplift", state: "Passed",
    definition: "The model provides no material assistance beyond a search engine on any tracked risk domain.",
    safeguards: "Standard safety training, Guard classification, published usage policy.",
    models: "Mere 3.5, Mere 4.0"
  },
  {
    level: "CSL-2", name: "Marginal uplift", state: "Passed",
    definition: "The model provides some assistance on tracked domains, but not beyond what a determined non-expert could assemble from public sources.",
    safeguards: "Everything in CSL-1, plus red-team sign-off, refusal calibration, and enforcement tooling.",
    models: "Mere 4.5, Mere 5.0"
  },
  {
    level: "CSL-3", name: "Significant uplift", state: "Current",
    definition: "The model meaningfully lowers the effort required by a non-expert in at least one tracked risk domain, or shows early autonomous-replication capability.",
    safeguards: "Everything above, plus enhanced classifiers on tracked domains, mandatory KYC for high-throughput access, weights-security controls at the level of a well-resourced attacker, and an incident response plan with named owners.",
    models: "Mere X 5.5"
  },
  {
    level: "CSL-4", name: "Expert-level uplift", state: "Not reached",
    definition: "The model provides assistance comparable to a domain expert on a tracked risk domain, or can autonomously acquire resources and replicate.",
    safeguards: "Everything above, plus deployment restricted to vetted customers under contract, hardware-backed weights isolation, insider-threat controls, and independent third-party evaluation before release.",
    models: "—"
  },
  {
    level: "CSL-5", name: "Undefined", state: "Not reached",
    definition: "Capabilities beyond CSL-4 that we cannot currently specify safeguards for.",
    safeguards: "We do not have a safeguard set that we would be willing to stand behind. If evaluations indicate a model is approaching CSL-5, we halt deployment and training scale-up until we do.",
    models: "—"
  }
];

const DOMAINS = [
  { d: "Biological and chemical weapons", how: "Expert-designed uplift trials comparing task completion with and without model access, run by external subject-matter experts under controlled conditions." },
  { d: "Cyber operations", how: "Capture-the-flag suites at escalating difficulty, plus end-to-end exploit-development trials measured against professional baselines." },
  { d: "Autonomous replication", how: "Agentic environments testing whether a model can acquire compute, evade shutdown, and persist without human assistance." },
  { d: "Large-scale manipulation", how: "Persuasion trials with human participants, measuring attitude change against human-written control content." },
  { d: "Model self-improvement", how: "Whether the model can meaningfully accelerate its own training pipeline or discover architectural improvements unaided." }
];

const FAQ_ITEMS = [
  { q: "Who decides that a threshold has been crossed?", a: "<p>The safety organisation, on the basis of pre-registered evaluations agreed before the training run begins. Pre-registration matters: deciding what counts as crossing a threshold after you have seen the results is not a policy, it is a negotiation.</p>" },
  { q: "What happens if you cannot meet the safeguards?", a: "<p>The model does not ship. If evaluations during training indicate a model will land above the level we can safeguard, we pause the scale-up. This is a public commitment because a private one is worth nothing.</p>" },
  { q: "Does this apply to internal use?", a: "<p>Yes. Internal deployment of a model above the safeguarded level is treated identically to external release. Most historical AI incidents began with an internal exception.</p>" },
  { q: "How often is the policy revised?", a: "<p>At least annually, and after any release where the evaluations proved inadequate. Every revision is published with a changelog explaining what changed and why — including revisions that loosened a requirement, which are the ones that deserve the most scrutiny.</p>" },
  { q: "Is this audited externally?", a: "<p>Partly. Uplift trials in the biological and cyber domains are run by external experts. The overall determination is ours, which is a limitation we state rather than obscure. We support the development of an independent auditing regime and would submit to one.</p>" }
];

export default {
  title: "Responsible Scaling Policy",
  description: "Capability thresholds, the safeguards each triggers, and what happens when we cannot meet them.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Safety", href: "/safety" }, { label: "Responsible Scaling Policy" }],
        eyebrow: "Version 2.3 · revised July 2026",
        title: "What has to be true before a model ships.",
        lead: "Five capability levels, each with a defined threshold and a defined set of safeguards. If we cannot implement the safeguards for the level a model lands in, the model does not ship and the scale-up pauses.",
        actions: `${button({ label: "Download the full policy", href: "#", variant: "secondary", icon: "download" }).value}
                  ${button({ label: "System cards", href: "/safety/system-cards", variant: "ghost", icon: "file" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell">
          <div class="prose" data-reveal>
            <p class="lead">
              This policy exists because the alternative is deciding, in the week before a launch, how
              much risk is acceptable — with a shipping date already announced. Pre-registering the
              thresholds removes that pressure from the decision.
            </p>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Capability levels", title: "Five levels, each with its own gate." }).value}
          <div class="stack stack-4" data-stagger="80">
            ${LEVELS.map((level) => `
              <article class="card card-pad-lg card-spot ${level.state === "Current" ? "" : ""}" data-reveal
                       style="${level.state === "Current" ? "border-color:var(--ink);box-shadow:var(--shadow-md)" : ""}">
                <div class="between" style="align-items:flex-start;gap:16px">
                  <div>
                    <div class="row row-tight">
                      <span class="mono" style="font-size:1.1rem;color:var(--ink)">${level.level}</span>
                      <span class="badge ${level.state === "Current" ? "badge-solid" : level.state === "Passed" ? "badge-positive" : "badge-plain"}">${level.state}</span>
                    </div>
                    <h3 style="font-size:var(--t-h4);font-weight:400;margin-top:8px">${level.name}</h3>
                  </div>
                  <span class="xs muted mono nowrap">${level.models}</span>
                </div>
                <div class="split" style="gap:clamp(16px,2vw,32px);margin-top:6px">
                  <div>
                    <div class="xs muted upper" style="margin-bottom:6px">Threshold</div>
                    <p class="small ink-3" style="line-height:1.6">${level.definition}</p>
                  </div>
                  <div>
                    <div class="xs muted upper" style="margin-bottom:6px">Required safeguards</div>
                    <p class="small ink-3" style="line-height:1.6">${level.safeguards}</p>
                  </div>
                </div>
              </article>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Tracked domains",
            title: "What we evaluate against.",
            lead: "Each domain has a pre-registered evaluation protocol, agreed before the training run begins."
          }).value}
          ${dataTable({
            columns: [
              { key: "d", label: "Risk domain", render: (r) => `<strong>${r.d}</strong>` },
              { key: "how", label: "How it is evaluated" }
            ],
            rows: DOMAINS
          }).value}
          <div style="margin-top:22px;max-width:76ch">
            ${calloutBox("Uplift trials in the biological and cyber domains are run by external subject-matter experts under controlled conditions. We do not grade our own homework in the two domains where the consequences of being wrong are highest.", { variant: "accent", icon: "microscope" }).value}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "In practice", title: "The gate has been used." }).value}
          <div class="split split-60" style="gap:clamp(24px,3vw,48px);align-items:center">
            <div class="prose" data-reveal="left">
              <p>
                In April 2026, six weeks before the planned Mere X 5.5 launch, a red-team exercise found
                that long tool-use chains could be steered into producing operational detail we had
                classified as CSL-3-restricted — by routing the request across enough intermediate steps
                that no single step triggered the classifier.
              </p>
              <p>
                We did not have a mitigation we were confident in. The launch moved six weeks while we
                built chain-level classification rather than per-message classification. The finding, the
                delay, and the fix are documented in the Mere X 5.5 system card.
              </p>
              <p>
                We are describing this because a policy nobody has ever been inconvenienced by is not
                a policy. The relevant question about any release gate is not whether it exists but
                whether it has ever changed a date.
              </p>
              <p>${textLink("Read the system card", "/safety/system-cards").value}</p>
            </div>
            <div class="timeline" data-reveal="right">
              ${[
                ["April 2026", "Red-team finding", "Chain-level routing bypasses per-message classification."],
                ["April 2026", "Gate closed", "Safety organisation blocks the release. Launch date withdrawn."],
                ["May 2026", "Mitigation built", "Chain-level classification across the whole tool-use trajectory."],
                ["June 2026", "Re-evaluated", "Finding closed; residual risk documented in the system card."],
                ["18 June 2026", "Released", "Six weeks later than planned."]
              ].map(([date, title, body]) => `
                <div class="tl-item">
                  <div class="tl-date">${date}</div>
                  <div class="tl-title" style="font-size:var(--t-body)">${title}</div>
                  <p class="tl-body">${body}</p>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "How the policy works." }).value}
          ${accordion(FAQ_ITEMS, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "See how it applied to the current model.",
        body: "The Mere X 5.5 system card documents the evaluations, the findings, and the residual risks.",
        primary: { label: "Read the system card", href: "/safety/system-cards", icon: "arrow-ne" },
        secondary: { label: "Our safety approach", href: "/safety" }
      }).value}
    `;
  }
};
