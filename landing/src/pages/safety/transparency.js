/* ============================================================
   SAFETY — transparency reports
   ============================================================ */

import { icon } from "../../lib/icons.js";
import { nf, pct } from "../../lib/format.js";
import { pageHead, sectionHead, textLink, button, ctaBand, dataTable, statTile, calloutBox } from "../../components/ui.js";
import { barChart, donut, proportionBars } from "../../components/charts.js";

const ENFORCEMENT = [
  { category: "Fraud and deception", flagged: 41280, actioned: 6114, terminated: 812, appeals: 214, upheld: 31 },
  { category: "Malicious cyber activity", flagged: 28940, actioned: 3208, terminated: 496, appeals: 388, upheld: 92 },
  { category: "Exploitation of minors", flagged: 1104, actioned: 1104, terminated: 1104, appeals: 12, upheld: 0 },
  { category: "Manipulation at scale", flagged: 19660, actioned: 2740, terminated: 302, appeals: 141, upheld: 22 },
  { category: "Weapons and mass harm", flagged: 8420, actioned: 640, terminated: 188, appeals: 94, upheld: 18 },
  { category: "Surveillance and profiling", flagged: 5210, actioned: 511, terminated: 76, appeals: 63, upheld: 11 },
  { category: "Automated consequential decisions", flagged: 3880, actioned: 402, terminated: 41, appeals: 88, upheld: 24 }
];

const REQUESTS = [
  { type: "Law enforcement — data", received: 84, complied: 41, partial: 12, refused: 31 },
  { type: "Law enforcement — preservation", received: 36, complied: 34, partial: 0, refused: 2 },
  { type: "Civil subpoena", received: 22, complied: 6, partial: 3, refused: 13 },
  { type: "Government content removal", received: 14, complied: 2, partial: 1, refused: 11 },
  { type: "National security", received: "0–249", complied: "—", partial: "—", refused: "—" }
];

const HALF_YEARS = ["H1 2026", "H2 2025", "H1 2025", "H2 2024"];

export default {
  title: "Transparency reports",
  description: "Enforcement volumes, appeal outcomes, government requests, and incident reporting.",

  render() {
    const totals = ENFORCEMENT.reduce((acc, row) => ({
      flagged: acc.flagged + row.flagged,
      actioned: acc.actioned + row.actioned,
      terminated: acc.terminated + row.terminated,
      appeals: acc.appeals + row.appeals,
      upheld: acc.upheld + row.upheld
    }), { flagged: 0, actioned: 0, terminated: 0, appeals: 0, upheld: 0 });

    return `
      ${pageHead({
        crumb: [{ label: "Safety", href: "/safety" }, { label: "Transparency" }],
        eyebrow: "H1 2026 · published 15 August 2026",
        title: "What enforcement actually looked like.",
        lead: "Twice a year we publish what we flagged, what we actioned, how many people appealed, and how often they were right. The last number is the one that matters most.",
        actions: `${button({ label: "Download the report", href: "#", variant: "secondary", icon: "download" }).value}
                  ${button({ label: "Usage policy", href: "/safety/usage-policy", variant: "ghost", icon: "list" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="grid g-4" data-stagger="90">
            ${statTile({ value: totals.flagged, label: "Conversations flagged", note: "Automated classification" }).value}
            ${statTile({ value: totals.actioned, label: "Actions taken", note: "After human review" }).value}
            ${statTile({ value: totals.terminated, label: "Accounts terminated", note: "Severe or repeat violations" }).value}
            ${statTile({ value: 11.9, decimals: 1, suffix: "%", label: "Appeals upheld", note: "We were wrong this often" }).value}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Enforcement",
            title: "By policy category.",
            lead: "Flagged means an automated classifier raised it. Actioned means a person reviewed it and agreed."
          }).value}
          ${dataTable({
            columns: [
              { key: "category", label: "Category", render: (r) => `<strong>${r.category}</strong>` },
              { key: "flagged", label: "Flagged", align: "right", render: (r) => nf(r.flagged) },
              { key: "actioned", label: "Actioned", align: "right", render: (r) => nf(r.actioned) },
              { key: "rate", label: "Confirm rate", align: "right", render: (r) => pct(r.actioned / r.flagged, 1) },
              { key: "terminated", label: "Terminated", align: "right", render: (r) => nf(r.terminated) },
              { key: "appeals", label: "Appeals", align: "right", render: (r) => nf(r.appeals) },
              { key: "upheld", label: "Upheld", align: "right", render: (r) => `${nf(r.upheld)} (${pct(r.upheld / r.appeals, 0)})` }
            ],
            rows: ENFORCEMENT,
            hint: "Confirm rate is the share of automated flags a human reviewer agreed with. A low rate means the classifier is noisy, which is our problem rather than the user's."
          }).value}

          <div class="grid g-2" style="margin-top:26px;gap:16px;align-items:start">
            <div class="card card-pad-lg" data-reveal>
              <h3 style="font-size:var(--t-h4);font-weight:400;margin-bottom:16px">Share of actions</h3>
              ${donut(ENFORCEMENT.map((row, i) => ({
                label: row.category, value: row.actioned, color: `var(--s${(i % 6) + 1})`
              }))).value}
            </div>
            <div class="card card-pad-lg" data-reveal>
              <h3 style="font-size:var(--t-h4);font-weight:400;margin-bottom:16px">Appeals upheld, by category</h3>
              ${proportionBars(ENFORCEMENT.map((row, i) => ({
                label: row.category,
                value: row.appeals ? row.upheld / row.appeals : 0,
                color: `var(--s${(i % 6) + 1})`
              })), { format: (v) => pct(v, 0) }).value}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Government and legal requests",
            title: "What we received, and what we gave.",
            lead: "We require valid legal process, notify affected users unless legally prohibited, and refuse requests that are overbroad."
          }).value}
          ${dataTable({
            columns: [
              { key: "type", label: "Request type", render: (r) => `<strong>${r.type}</strong>` },
              { key: "received", label: "Received", align: "right" },
              { key: "complied", label: "Complied fully", align: "right" },
              { key: "partial", label: "Partial", align: "right" },
              { key: "refused", label: "Refused", align: "right" }
            ],
            rows: REQUESTS,
            hint: "National security requests are reported in permitted bands. We publish the band even when it is zero, so that the absence of a report cannot itself become a signal."
          }).value}
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Over time", title: "Four reporting periods." }).value}
          <div class="card card-pad-lg" data-reveal>
            ${barChart([
              { label: "H2 2024", value: 24100 },
              { label: "H1 2025", value: 41800 },
              { label: "H2 2025", value: 78200 },
              { label: "H1 2026", value: totals.flagged }
            ], { height: 200, format: (v) => nf(Math.round(v)) }).value}
            <p class="xs muted" style="margin-top:16px">
              Flagged conversations by reporting period. Volume growth tracks platform growth; the confirm rate
              has stayed within four points across all four periods.
            </p>
          </div>
          <div class="row" style="margin-top:22px;gap:10px">
            ${HALF_YEARS.map((period, i) => `<a class="btn ${i === 0 ? "btn-secondary" : "btn-ghost"} btn-sm" href="#">${period} report</a>`).join("")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell">
          <div style="max-width:78ch">
            ${calloutBox("The number we watch hardest is the appeal-upheld rate. At 11.9% it means roughly one in eight enforcement decisions was wrong — which is too high, and is the metric this team is measured on.", { variant: "warning", icon: "alert" }).value}
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Read the policy these numbers enforce.",
        primary: { label: "Usage policy", href: "/safety/usage-policy", icon: "arrow-ne" },
        secondary: { label: "Report a vulnerability", href: "/safety/disclosure" }
      }).value}
    `;
  }
};
