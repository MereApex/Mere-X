/* ============================================================
   SAFETY — coordinated disclosure
   ============================================================ */

import { COMPANY } from "../../data/site.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, calloutBox, dataTable, codeBlock, accordion } from "../../components/ui.js";

const SCOPE = [
  { in: true, item: "Model behaviour that bypasses safety training — jailbreaks, prompt injection, refusal steering" },
  { in: true, item: "Vulnerabilities in the API, console, or Mere Studio: authentication, authorisation, injection, SSRF" },
  { in: true, item: "Data exposure across tenant boundaries, including cache or log leakage" },
  { in: true, item: "Weaknesses in Guard classification that allow prohibited content through at scale" },
  { in: true, item: "Supply-chain issues in our published SDKs" },
  { in: false, item: "Single-prompt refusal failures with no reliable reproduction" },
  { in: false, item: "Factual errors, hallucinations, or quality complaints — those go to support" },
  { in: false, item: "Denial of service, rate-limit exhaustion, or volumetric attacks" },
  { in: false, item: "Social engineering of Mere X staff, or physical access attempts" },
  { in: false, item: "Findings from automated scanners without demonstrated impact" }
];

const REWARDS = [
  { severity: "Critical", example: "Cross-tenant data access; remote code execution; reliable extraction of restricted CSL-3 content", reward: "$15,000 – $60,000", response: "4 hours" },
  { severity: "High", example: "Authentication bypass; reliable jailbreak generalising across prompts and languages", reward: "$5,000 – $15,000", response: "1 business day" },
  { severity: "Medium", example: "Scoped authorisation flaw; Guard evasion in a specific category", reward: "$1,000 – $5,000", response: "3 business days" },
  { severity: "Low", example: "Information disclosure with limited impact; inconsistent safety behaviour", reward: "$250 – $1,000", response: "5 business days" }
];

const FAQ_ITEMS = [
  { q: "What is the safe-harbour commitment?", a: "<p>If you research in good faith, stay within the scope above, do not access or retain data belonging to others, and give us reasonable time to fix an issue, we will not pursue legal action and will not ask your employer to. We consider your work authorised under the Computer Fraud and Abuse Act and equivalent legislation.</p>" },
  { q: "How long before I can publish?", a: "<p>Ninety days from first report, or sooner if we have shipped a fix and agree. If we need longer we will say so and explain why. We will never ask for indefinite silence, and we do not require pre-publication approval of your write-up.</p>" },
  { q: "Do you credit researchers?", a: "<p>Yes, in the advisory and the system card revision, unless you prefer to remain anonymous. Around 40% of reporters choose anonymity and that is entirely fine.</p>" },
  { q: "Can I use automated tooling?", a: "<p>Against your own account, within rate limits, yes. Do not run scanners against other tenants, do not attempt to exhaust shared capacity, and do not use production traffic from real users as your test corpus.</p>" },
  { q: "What if I find something involving another customer's data?", a: "<p>Stop immediately, do not download or retain it, and tell us at once. Reports handled this way have never resulted in an adverse action against the reporter, and the reward is unaffected.</p>" }
];

export default {
  title: "Coordinated disclosure",
  description: "How to report a model or platform vulnerability to Mere X, with safe harbour and a response SLA.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Safety", href: "/safety" }, { label: "Disclosure" }],
        eyebrow: "Security & model vulnerabilities",
        title: "Found something? We want to hear it.",
        lead: "A real coordinated disclosure process with a safe-harbour commitment, a response SLA, and rewards. Model behaviour counts as a vulnerability here, not just code.",
        actions: `${button({ label: `Email ${COMPANY.security}`, href: `mailto:${COMPANY.security}`, icon: "mail", magnetic: true }).value}
                  ${button({ label: "PGP key", href: "#pgp", variant: "secondary", icon: "lock" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell">
          <div style="max-width:78ch">
            ${calloutBox("<strong>Safe harbour.</strong> Research in good faith within the scope below and we will not pursue legal action, will not contact your employer, and consider your work authorised. This commitment survives even if the finding turns out to be out of scope.", { variant: "accent", icon: "shield" }).value}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Scope", title: "What is in, and what is not." }).value}
          <div class="split" style="gap:clamp(20px,3vw,40px)">
            <div data-reveal="left">
              <h3 style="font-size:var(--t-h4);font-weight:400;margin-bottom:16px;color:var(--positive)">In scope</h3>
              <div class="stack stack-3">
                ${SCOPE.filter((s) => s.in).map((s) => `
                  <div class="row row-top" style="flex-wrap:nowrap;gap:11px">
                    <span style="color:var(--positive);margin-top:2px">${icon("check", "icon").value}</span>
                    <span class="small ink-3" style="line-height:1.55">${s.item}</span>
                  </div>`).join("")}
              </div>
            </div>
            <div data-reveal="right">
              <h3 style="font-size:var(--t-h4);font-weight:400;margin-bottom:16px;color:var(--muted)">Out of scope</h3>
              <div class="stack stack-3">
                ${SCOPE.filter((s) => !s.in).map((s) => `
                  <div class="row row-top" style="flex-wrap:nowrap;gap:11px">
                    <span style="color:var(--faint);margin-top:2px">${icon("close", "icon").value}</span>
                    <span class="small muted" style="line-height:1.55">${s.item}</span>
                  </div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Rewards",
            title: "What we pay, and how fast we respond.",
            lead: "Severity is assessed on demonstrated impact, not on how alarming the report sounds. We will explain the rating either way."
          }).value}
          ${dataTable({
            columns: [
              { key: "severity", label: "Severity", render: (r) => `<strong>${r.severity}</strong>` },
              { key: "example", label: "Typical example" },
              { key: "reward", label: "Reward", align: "right" },
              { key: "response", label: "First response", align: "right" }
            ],
            rows: REWARDS
          }).value}
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(24px,3vw,48px);align-items:start">
            <div data-reveal="left">
              ${sectionHead({ eyebrow: "How to report", title: "What to send." }).value}
              <div class="timeline">
                ${[
                  ["Reproduce it", "A reliable reproduction is the single most valuable thing in a report. For model behaviour, that means the exact prompts and a success rate across attempts."],
                  ["Assess impact", "What could an attacker actually do? A jailbreak that works once in fifty attempts is a different finding from one that works consistently."],
                  ["Email us", `Send it to ${COMPANY.security}, encrypted if it is sensitive. Include your preferred name for credit, or say that you would rather stay anonymous.`],
                  ["Give us time", "Ninety days, or sooner if we ship a fix. We will keep you updated rather than going quiet."]
                ].map(([title, body]) => `
                  <div class="tl-item">
                    <div class="tl-title" style="font-size:var(--t-body)">${title}</div>
                    <p class="tl-body">${body}</p>
                  </div>`).join("")}
              </div>
            </div>
            <div data-reveal="right" id="pgp">
              ${codeBlock({
                Template: `To: ${COMPANY.security}
Subject: [Disclosure] Short description

Summary
  One or two sentences on what the issue is.

Impact
  What an attacker could do, and at what scale.

Reproduction
  1. …
  2. …
  Success rate: 47/50 attempts

Affected
  Model / endpoint / console page, and versions.

Credit
  Name for the advisory, or "anonymous".`,
                PGP: `-----BEGIN PGP PUBLIC KEY BLOCK-----

mQINBGa1xQ0BEADQ7vK9mF2xJnT8pR4wYcL6dHsA1oE3bN5uZqW0kXfV9jGtMpRy
... (truncated for display — download the full key from
    https://merex.ai/.well-known/security.txt)

Fingerprint:
  8F2A 41C9 B7E0 4D3B  A651 2CF0 E93D 7A18 4B22 9E60
-----END PGP PUBLIC KEY BLOCK-----`
              }).value}
            </div>
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "Before you report." }).value}
          ${accordion(FAQ_ITEMS, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: `Send it to ${COMPANY.security}`,
        body: "First response within four hours for critical findings, five business days for everything else.",
        primary: { label: "Email the security team", href: `mailto:${COMPANY.security}`, icon: "arrow-ne" },
        secondary: { label: "Trust centre", href: "/company/trust" }
      }).value}
    `;
  }
};
