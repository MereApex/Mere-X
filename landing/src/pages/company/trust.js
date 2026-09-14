/* ============================================================
   COMPANY — trust centre
   ============================================================ */

import { SECURITY_CERTS, FAQ } from "../../data/content.js";
import { COMPANY } from "../../data/site.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, dataTable, accordion, calloutBox } from "../../components/ui.js";

const PRACTICES = [
  { icon: "lock", t: "Encryption", d: "TLS 1.3 in transit, AES-256 at rest, and per-tenant key derivation. Prompt caches are encrypted with keys scoped to the organisation." },
  { icon: "fingerprint", t: "Access control", d: "Least privilege enforced through short-lived credentials. Production access requires hardware keys, a documented reason, and is logged and reviewed weekly." },
  { icon: "shield", t: "Isolation", d: "Every request runs in a per-tenant sandbox. Server-side code execution runs in a gVisor-isolated pool with no network egress unless you enable it." },
  { icon: "scan", t: "Testing", d: "Annual third-party penetration test, continuous automated scanning, and an internal red team that targets the platform rather than the model." },
  { icon: "server", t: "Resilience", d: "Multi-region with quarterly unannounced failover drills. Backups are tested by restoring them, not by checking that they exist." },
  { icon: "users", t: "People", d: "Background checks where the law permits, mandatory security training, and immediate de-provisioning through SCIM on departure." }
];

const SUBPROCESSORS = [
  { name: "Amazon Web Services", purpose: "Primary compute and storage", regions: "US, EU, APAC" },
  { name: "Google Cloud", purpose: "Secondary compute, training capacity", regions: "US, EU" },
  { name: "Cloudflare", purpose: "Edge termination, DDoS protection", regions: "Global" },
  { name: "Stripe", purpose: "Payment processing", regions: "US" },
  { name: "Datadog", purpose: "Infrastructure telemetry (no request content)", regions: "US, EU" },
  { name: "Zendesk", purpose: "Support ticketing", regions: "US, EU" }
];

const DATA_FACTS = [
  { q: "Is my data used to train models?", a: "No. API inputs and outputs are never used to train Mere X models. Mere X Studio conversations are excluded by default; contributing them is opt-in and revocable." },
  { q: "How long is it kept?", a: "Thirty days by default for abuse monitoring and debugging, then deleted. Configurable to seven days, or zero with zero-retention mode." },
  { q: "Who can see it?", a: "A small on-call group, only in response to a specific incident or abuse investigation, with every access logged and reviewed. Never for product development." },
  { q: "Where is it processed?", a: "In the region you pin. Requests are refused rather than routed outside your residency policy — there is no silent fallback." },
  { q: "Can I delete it?", a: "Yes, through the API or the console, immediately and permanently. Deletion propagates to backups within 30 days." }
];

export default {
  title: "Trust centre",
  description: "Security, privacy, compliance, sub-processors, and data handling at Mere X.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Company", href: "/company" }, { label: "Trust centre" }],
        eyebrow: "Security, privacy & compliance",
        title: "The answers your security review is about to ask for.",
        lead: "Certifications, sub-processors, data handling, and the architecture underneath — published here rather than gated behind a call, so your review can start before we speak.",
        actions: `${button({ label: "Request the SOC 2 report", href: "/company/contact", icon: "arrow-ne" }).value}
                  ${button({ label: `Email ${COMPANY.security}`, href: `mailto:${COMPANY.security}`, variant: "secondary", icon: "mail" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Certifications", title: "Audited and attested." }).value}
          <div class="grid g-3" data-stagger="70">
            ${SECURITY_CERTS.map((cert) => `
              <div class="card card-hover card-spot" data-reveal style="flex-direction:row;align-items:center;gap:16px">
                <div class="card-icon">${icon(cert.icon).value}</div>
                <div>
                  <div style="font-size:var(--t-body)">${cert.name}</div>
                  <div class="xs muted">${cert.detail}</div>
                </div>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Practices", title: "How the platform is secured." }).value}
          <div class="grid g-3" data-stagger="70">
            ${PRACTICES.map((p) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(p.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${p.t}</h3>
                <p class="small muted" style="line-height:1.6">${p.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Your data",
            title: "Five questions, answered directly.",
            action: textLink("Privacy policy", "/legal/privacy").value
          }).value}
          <div class="grid g-2" data-stagger="80">
            ${DATA_FACTS.map((fact) => `
              <div class="card card-sunken card-pad-lg" data-reveal>
                <h3 style="font-size:var(--t-h4);font-weight:400">${fact.q}</h3>
                <p class="small ink-3" style="line-height:1.66">${fact.a}</p>
              </div>`).join("")}
          </div>
          <div style="margin-top:26px;max-width:78ch">
            ${calloutBox("Residency covers request content, prompt caches, uploaded files, and request logs. It does not cover billing metadata, which is aggregated in the United States. That exception is in the DPA rather than hidden in it.", { icon: "globe" }).value}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Sub-processors",
            title: "Who else touches your data.",
            lead: "We give 30 days' notice before adding a sub-processor, and you may object."
          }).value}
          ${dataTable({
            columns: [
              { key: "name", label: "Sub-processor", render: (r) => `<strong>${r.name}</strong>` },
              { key: "purpose", label: "Purpose" },
              { key: "regions", label: "Regions" }
            ],
            rows: SUBPROCESSORS
          }).value}
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Documents", title: "What we can send you." }).value}
          <div class="grid g-3" data-stagger="70">
            ${[
              ["SOC 2 Type II report", "Under NDA, usually same day", "file"],
              ["Penetration test summary", "Most recent annual test", "scan"],
              ["Data processing agreement", "GDPR Article 28, pre-signed", "scale"],
              ["Business associate agreement", "For HIPAA-eligible workloads", "heart"],
              ["Security questionnaire", "CAIQ and SIG Lite, pre-completed", "list"],
              ["Architecture documentation", "Data flows and isolation model", "network"]
            ].map(([t, d, ic]) => `
              <a class="card card-hover card-spot" href="/company/contact" data-reveal>
                <div class="card-icon">${icon(ic).value}</div>
                <h3 style="font-size:var(--t-sm);font-weight:500">${t}</h3>
                <p class="xs muted">${d}</p>
                <div style="margin-top:auto;padding-top:10px">${textLink("Request", "/company/contact", { icon: "arrow-ne" }).value}</div>
              </a>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "Common ones." }).value}
          ${accordion(FAQ.slice(0, 6), { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "Start your review before the first call.",
        body: "Tell us what your process needs and we will send the whole pack up front.",
        primary: { label: "Request documentation", href: "/company/contact", icon: "arrow-ne" },
        secondary: { label: "Report a vulnerability", href: "/safety/disclosure" }
      }).value}
    `;
  }
};
