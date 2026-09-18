/* ============================================================
   SAFETY — our approach
   ============================================================ */

import { SAFETY_EVALS } from "../../data/models.js";
import { icon } from "../../lib/icons.js";
import { pct } from "../../lib/format.js";
import { pageHead, sectionHead, textLink, button, ctaBand, calloutBox, statTile, featureCard } from "../../components/ui.js";

const LAYERS = [
  { n: "01", icon: "flask", t: "Training", d: "Safety properties — honesty, calibration, appropriate refusal — are trained for directly and measured as capabilities, not filtered for afterwards.", href: "/research/alignment" },
  { n: "02", icon: "scale", t: "The release gate", d: "The Responsible Scaling Policy defines capability thresholds and the safeguards each one triggers. The safety organisation holds the gate, and has used it.", href: "/safety/scaling-policy" },
  { n: "03", icon: "shield", t: "Guard, inline", d: "Every request and response is scored across the harm taxonomy by a parallel classification head. It is free, it adds under 8 ms, and it cannot be bypassed by streaming.", href: "/docs/safety" },
  { n: "04", icon: "list", t: "The usage policy", d: "What Mere X may and may not be used for, written in language a person can act on rather than a lawyer can defend.", href: "/safety/usage-policy" },
  { n: "05", icon: "microscope", t: "Interpretability", d: "Circuit-level tools that let us check whether safe behaviour has an internal mechanism or is surface mimicry. Where they disagree, we trust the mechanism.", href: "/research/interpretability" },
  { n: "06", icon: "eye", t: "Reporting", d: "System cards per release, transparency reports on enforcement, and public post-mortems on incidents — including the ones that make us look careless.", href: "/safety/transparency" }
];

const COMMITMENTS = [
  "We publish a system card for every model release, including capabilities we chose not to ship.",
  "We name the tasks our models still fail, rather than only the ones they pass.",
  "The release gate is held by the safety organisation, not the product organisation.",
  "Over-refusal is measured and published alongside refusal accuracy, because both are harms.",
  "Red-team findings that we could not mitigate are documented rather than quietly deferred.",
  "Incidents over five minutes get a public post-mortem with a timeline and a root cause."
];

export default {
  title: "Safety",
  description: "How Mere X approaches AI safety: training, the release gate, Guard, usage policy, interpretability, and public reporting.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Safety" }],
        eyebrow: "Our approach",
        title: "A model ships when it has earned it.",
        lead: "Safety here is not a review step near the end. It is six layers that run from the training mixture to the incident post-mortem, and a release gate held by people whose job is not to ship.",
        actions: `${button({ label: "Responsible Scaling Policy", href: "/safety/scaling-policy", icon: "arrow-right" }).value}
                  ${button({ label: "Read a system card", href: "/safety/system-cards", variant: "secondary", icon: "file" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="grid g-4" data-stagger="90">
            ${statTile({ value: 41000, label: "Adversarial prompts", note: "In the red-team corpus" }).value}
            ${statTile({ value: 99.4, decimals: 1, suffix: "%", label: "Refusal accuracy", note: "On genuinely harmful requests" }).value}
            ${statTile({ value: 0.8, decimals: 1, suffix: "%", label: "Over-refusal rate", note: "Benign requests wrongly refused" }).value}
            ${statTile({ value: 6, label: "Weeks", note: "Mere Code slipped for a red-team finding" }).value}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Six layers",
            title: "Where safety actually happens.",
            lead: "No single layer is sufficient. The point of having six is that they fail differently."
          }).value}
          <div class="grid g-3" data-stagger="80">
            ${LAYERS.map((layer) => `
              <a class="card card-pad-lg card-hover card-spot" href="${layer.href}" data-reveal>
                <div class="between" style="align-items:flex-start">
                  <div class="card-icon" style="width:46px;height:46px">${icon(layer.icon).value}</div>
                  <span class="card-num">${layer.n}</span>
                </div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${layer.t}</h3>
                <p class="small muted" style="line-height:1.62">${layer.d}</p>
                <div style="margin-top:auto;padding-top:12px">${textLink("Read more", layer.href).value}</div>
              </a>`).join("")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          <div class="panel-dark" data-reveal>
            <div class="split split-60" style="gap:clamp(28px,4vw,56px);align-items:center">
              <div>
                <p class="eyebrow">The gate</p>
                <h2 style="margin-top:18px;font-size:var(--t-h2)">We have used it.</h2>
                <p style="margin-top:20px;color:rgba(255,255,255,.66);line-height:1.68;max-width:52ch">
                  Mere Code slipped six weeks because a red-team finding on long tool-use chains had no
                  mitigation we were confident in. The finding, the delay, and the eventual fix are all
                  in the system card. A gate that has never been closed is decoration.
                </p>
                <div class="row" style="margin-top:26px;gap:18px">
                  <a class="link" href="/safety/system-cards" style="color:#fff"><span>Read the system card</span>${icon("arrow-ne", "icon").value}</a>
                  <a class="link" href="/safety/scaling-policy" style="color:#fff"><span>The policy</span>${icon("arrow-ne", "icon").value}</a>
                </div>
              </div>
              <div class="stack stack-2">
                ${SAFETY_EVALS.map((row) => `
                  <div style="padding:14px 16px;border:1px solid rgba(255,255,255,.14);border-radius:var(--r-sm)">
                    <div class="between" style="gap:14px">
                      <span class="xs" style="color:rgba(255,255,255,.72);line-height:1.4">${row.name}</span>
                      <span class="mono" style="font-size:var(--t-sm);color:#fff">${pct(row.value, 1)}</span>
                    </div>
                  </div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Commitments",
            title: "Six things we hold ourselves to.",
            lead: "Written so that failing to do them would be visible from outside."
          }).value}
          <div class="grid g-2" data-stagger="80">
            ${COMMITMENTS.map((text, i) => `
              <div class="card card-sunken card-pad-sm" data-reveal style="flex-direction:row;gap:14px;align-items:flex-start">
                <span class="card-num" style="flex:0 0 auto;padding-top:3px">${String(i + 1).padStart(2, "0")}</span>
                <p class="small ink-3" style="line-height:1.6">${text}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "For developers", title: "What you get in the API." }).value}
          <div class="grid g-3" data-stagger="70">
            ${[
              { icon: "shield", title: "Guard on every call", body: "Free classification across the harm taxonomy, returned as structured scores so you can apply your own thresholds.", href: "/docs/safety" },
              { icon: "sliders", title: "Tunable refusal", body: "Set thresholds per deployment. A security research tool and a children's product should not behave identically.", href: "/docs/safety" },
              { icon: "lock", title: "Zero-retention mode", body: "Nothing written to disk beyond the life of the request, for workloads where that is a requirement rather than a preference.", href: "/company/trust" },
              { icon: "list", title: "Published usage policy", body: "Clear rules about what Mere X may be used for, and an enforcement process that is documented rather than arbitrary.", href: "/safety/usage-policy" },
              { icon: "fingerprint", title: "Coordinated disclosure", body: "A real process for reporting model vulnerabilities, with a safe-harbour commitment and a response SLA.", href: "/safety/disclosure" },
              { icon: "eye", title: "Transparency reports", body: "Enforcement volumes, categories, and appeal outcomes, published twice a year.", href: "/safety/transparency" }
            ].map((item) => featureCard(item).value).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell">
          <div style="max-width:76ch">
            ${calloutBox("Found something concerning in how a model behaves? The disclosure process has a safe-harbour commitment and a five-day first response. <a class=\"link-plain\" href=\"/safety/disclosure\">Report it here</a>.", { variant: "accent", icon: "fingerprint" }).value}
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Read the policy that gates every release.",
        body: "Capability thresholds, the safeguards each one triggers, and what happens when we cannot meet them.",
        primary: { label: "Responsible Scaling Policy", href: "/safety/scaling-policy", icon: "arrow-ne" },
        secondary: { label: "Transparency reports", href: "/safety/transparency" }
      }).value}
    `;
  }
};
