/* ============================================================
   ENTERPRISE — deployment, residency, support
   ============================================================ */

import { SECURITY_CERTS } from "../../data/content.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, dataTable, calloutBox, accordion } from "../../components/ui.js";

const DEPLOYMENTS = [
  {
    icon: "cloud", t: "Our cloud", tag: "Standard",
    d: "Everyone signs in with a Mere X account and works against shared capacity, with 99.9% availability. Right for most teams, including large ones.",
    points: ["Fastest to start", "Seat-based billing", "US / EU residency", "Nothing to operate"]
  },
  {
    icon: "server", t: "Provisioned throughput", tag: "Committed",
    d: "Reserved inference capacity with a latency SLA and no overload errors. Priced per unit of throughput per month rather than per token.",
    points: ["Guaranteed capacity", "99.95% SLA with credits", "Predictable monthly cost", "No 529 overload errors"]
  },
  {
    icon: "lock", t: "Private tenancy", tag: "Isolated",
    d: "A dedicated deployment in a region you choose, with isolated compute, isolated caches, and a network boundary your team defines.",
    points: ["Dedicated hardware pool", "VPC peering or PrivateLink", "Custom retention", "Regional pinning enforced"]
  },
  {
    icon: "shield", t: "Air-gapped", tag: "By agreement",
    d: "For workloads that cannot touch a public network at all. Model weights are delivered under separate licence with an on-site update process.",
    points: ["No outbound connectivity", "On-premise or classified estates", "Scheduled model updates", "Requires separate agreement"]
  }
];

const SUPPORT = [
  { tier: "Standard", response: "1 business day", channels: "Email", architect: "—", included: "All paid plans" },
  { tier: "Priority", response: "4 business hours", channels: "Email, chat", architect: "Shared pool", included: "Business" },
  { tier: "Enterprise", response: "1 hour, 24/7 for Sev 1", channels: "Email, chat, phone, shared Slack", architect: "Named", included: "Enterprise" }
];

const FAQ_ITEMS = [
  { q: "How long does a security review usually take?", a: "<p>Most close in two to three weeks. We send the SOC 2 report, penetration test summary, DPA, sub-processor list, and architecture documentation before the first call rather than after the fourth, which is where most of the time normally goes.</p>" },
  { q: "Can you sign our paper rather than yours?", a: "<p>Frequently, yes. We have a standard MSA and DPA, and we redline. For public-sector and healthcare customers we regularly work from the customer's template.</p>" },
  { q: "What is the commercial model for provisioned throughput?", a: "<p>Units of throughput reserved per month, each guaranteeing a floor of tokens per minute. Traffic above your reservation falls back to shared capacity at standard token rates rather than failing.</p>" },
  { q: "Do you offer indemnification?", a: "<p>Yes — copyright indemnification for outputs is included on Enterprise agreements, subject to the usage policy and the conditions set out in the MSA.</p>" },
  { q: "What happens if we want to leave?", a: "<p>Export your threads from Settings → Data controls at any time, in JSON. Your code never left your machines to begin with. There is no proprietary format to unwind and no exit fee. We would rather you stayed because it works.</p>" }
];

export default {
  title: "Enterprise",
  description: "Private tenancy, provisioned throughput, data residency, air-gapped deployment, and named support.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Products", href: "/products" }, { label: "Enterprise" }],
        eyebrow: "For institutions",
        title: "Deployment on your terms, not ours.",
        lead: "Four ways to run Mere X, from our cloud to a fully air-gapped installation — with the compliance documentation ready before your first call.",
        actions: `${button({ label: "Talk to sales", href: "/company/contact", icon: "arrow-ne", magnetic: true }).value}
                  ${button({ label: "Trust centre", href: "/company/trust", variant: "secondary", icon: "shield" }).value}`,
        meta: `
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">99.95%</span><span class="stat-label">SLA with credits</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">6</span><span class="stat-label">Regions</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">1 hour</span><span class="stat-label">Sev 1 response, 24/7</span></div>`
      }).value}

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Deployment", title: "Four ways, one agent." }).value}
          <div class="grid g-2" data-stagger="90">
            ${DEPLOYMENTS.map((dep) => `
              <article class="card card-pad-lg card-hover card-spot" data-reveal>
                <div class="between" style="align-items:flex-start">
                  <div class="card-icon" style="width:46px;height:46px">${icon(dep.icon).value}</div>
                  <span class="badge">${dep.tag}</span>
                </div>
                <h3 style="font-size:var(--t-h3)">${dep.t}</h3>
                <p class="ink-3" style="line-height:1.64">${dep.d}</p>
                <ul class="stack stack-2" style="margin-top:auto;padding-top:8px">
                  ${dep.points.map((p) => `<li class="row row-tight small muted" style="flex-wrap:nowrap;align-items:flex-start">${icon("check", "icon").value}<span>${p}</span></li>`).join("")}
                </ul>
              </article>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Compliance",
            title: "Documentation, ready to send.",
            action: textLink("Trust centre", "/company/trust").value
          }).value}
          <div class="grid g-3" data-stagger="70">
            ${SECURITY_CERTS.map((cert) => `
              <div class="card card-hover" data-reveal style="flex-direction:row;align-items:center;gap:16px">
                <div class="card-icon">${icon(cert.icon).value}</div>
                <div><div style="font-size:var(--t-body)">${cert.name}</div><div class="xs muted">${cert.detail}</div></div>
              </div>`).join("")}
          </div>
          <div style="margin-top:24px;max-width:76ch">
            ${calloutBox("Enterprise agreements include copyright indemnification for model outputs, subject to the usage policy. The conditions are in the MSA rather than a footnote on a marketing page.", { variant: "accent", icon: "scale" }).value}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Support", title: "Who answers, and how fast." }).value}
          ${dataTable({
            columns: [
              { key: "tier", label: "Tier", render: (r) => `<strong>${r.tier}</strong>` },
              { key: "response", label: "First response" },
              { key: "channels", label: "Channels" },
              { key: "architect", label: "Solutions architect" },
              { key: "included", label: "Included with" }
            ],
            rows: SUPPORT
          }).value}
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="panel-dark" data-reveal>
            <p class="eyebrow">Onboarding</p>
            <h2 style="margin-top:18px;font-size:var(--t-h2);max-width:18ch">From first call to production, typically six weeks.</h2>
            <div class="grid g-4" style="margin-top:44px;gap:0">
              ${[
                ["Week 1", "Scoping", "Use cases, data flows, and the residency and retention posture you need."],
                ["Week 2–3", "Security review", "Documentation, questionnaire, and redlines. We send everything up front."],
                ["Week 3–5", "Pilot", "A real workload with a named architect, measured against your own evaluation."],
                ["Week 6", "Production", "Provisioning, runbooks, escalation paths, and a handover that includes your on-call."]
              ].map(([w, t, d], index, arr) => `
                <div style="padding:22px 20px;border-right:${index === arr.length - 1 ? "0" : "1px solid rgba(255,255,255,.12)"}">
                  <div class="xs mono" style="color:rgba(255,255,255,.5)">${w}</div>
                  <div style="font-size:var(--t-body);margin-top:8px;color:#fff">${t}</div>
                  <div class="xs" style="color:rgba(255,255,255,.55);margin-top:8px;line-height:1.55">${d}</div>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "What procurement asks." }).value}
          ${accordion(FAQ_ITEMS, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "Start the conversation.",
        body: "Tell us the workload and the constraints. We will tell you honestly whether we are the right fit.",
        primary: { label: "Contact sales", href: "/company/contact", icon: "arrow-ne" },
        secondary: { label: "Infrastructure detail", href: "/technology/infrastructure" }
      }).value}
    `;
  }
};
