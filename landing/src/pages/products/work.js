/* ============================================================
   MERE X FOR WORK — teams
   ============================================================ */

import { SECURITY_CERTS } from "../../data/content.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, dataTable, calloutBox } from "../../components/ui.js";

const FEATURES = [
  { icon: "folder", t: "Shared projects", d: "A project holds files, instructions, and history. Everyone on it starts from the same context instead of re-uploading the same brief." },
  { icon: "book", t: "Team knowledge", d: "Connect Drive, SharePoint, Notion, or Confluence once and every conversation can draw on it — with the permissions your directory already enforces." },
  { icon: "lock", t: "SSO, SCIM, SAML", d: "Okta, Entra, Google Workspace, and anything SAML 2.0. Provisioning and de-provisioning are automatic, which matters more than it sounds." },
  { icon: "list", t: "Audit logs", d: "Every conversation, connector action, and admin change, exportable to your SIEM. Retention is yours to set." },
  { icon: "shield", t: "Retention controls", d: "Choose 30 days, 7 days, or zero. Zero-retention means nothing is written to disk beyond the life of the request." },
  { icon: "users", t: "Roles that fit", d: "Owner, admin, member, and billing — plus per-project roles, so the legal team's project is not visible to everyone in engineering." },
  { icon: "gauge", t: "Usage visibility", d: "Per-seat and per-project usage, so you can see where the value is landing rather than guessing at renewal." },
  { icon: "plug", t: "Connector governance", d: "Allow-list which connectors the organisation may use, and which scopes are grantable, centrally." }
];

const COMPARE = [
  { feature: "Mere Apex 5.5, Orion, Nyx", pro: "Yes", business: "Yes", enterprise: "Yes" },
  { feature: "DEEP reasoning", pro: "Yes", business: "Yes", enterprise: "Higher budgets" },
  { feature: "Shared projects & knowledge", pro: "—", business: "Yes", enterprise: "Yes" },
  { feature: "SSO / SCIM", pro: "—", business: "Yes", enterprise: "Yes + SAML" },
  { feature: "Audit logs", pro: "—", business: "90 days", enterprise: "Configurable + SIEM export" },
  { feature: "Zero-retention mode", pro: "—", business: "On request", enterprise: "Standard" },
  { feature: "Data residency", pro: "—", business: "US / EU", enterprise: "US / EU / APAC + pinning" },
  { feature: "Private deployment", pro: "—", business: "—", enterprise: "VPC and air-gapped" },
  { feature: "Support", pro: "Email", business: "Priority", enterprise: "24/7 + named architect" },
  { feature: "SLA", pro: "—", business: "99.9%", enterprise: "99.95% with credits" }
];

export default {
  title: "Mere X for Work",
  description: "Shared context, administration, and compliance for teams — SSO, SCIM, audit logs, retention controls, and residency.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Products", href: "/products" }, { label: "Mere X for Work" }],
        eyebrow: "For teams",
        title: "The same assistant, administered properly.",
        lead: "Shared projects so your team stops re-explaining context to a model, and the controls your security review is going to ask about before any of that matters.",
        actions: `${button({ label: "Talk to sales", href: "/company/contact", icon: "arrow-ne" }).value}
                  ${button({ label: "See pricing", href: "/pricing", variant: "secondary", icon: "card" }).value}`,
        meta: `
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">Flexible</span><span class="stat-label">Plans for growing teams</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">SOC 2</span><span class="stat-label">Type II audited</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">0 days</span><span class="stat-label">Retention available</span></div>`
      }).value}

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "What you get", title: "Eight things a single-user plan cannot give you." }).value}
          <div class="grid g-4" data-stagger="70">
            ${FEATURES.map((f) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(f.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${f.t}</h3>
                <p class="small muted" style="line-height:1.58">${f.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Compare",
            title: "Pro, Business, Enterprise.",
            action: textLink("Full pricing", "/pricing").value
          }).value}
          ${dataTable({
            columns: [
              { key: "feature", label: "" },
              { key: "pro", label: "Pro" },
              { key: "business", label: "Business" },
              { key: "enterprise", label: "Enterprise" }
            ],
            rows: COMPARE
          }).value}
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Compliance",
            title: "The certifications your review will ask for.",
            action: textLink("Trust centre", "/company/trust").value
          }).value}
          <div class="grid g-3" data-stagger="70">
            ${SECURITY_CERTS.map((cert) => `
              <div class="card card-hover" data-reveal style="flex-direction:row;align-items:center;gap:16px">
                <div class="card-icon">${icon(cert.icon).value}</div>
                <div>
                  <div style="font-size:var(--t-body)">${cert.name}</div>
                  <div class="xs muted">${cert.detail}</div>
                </div>
              </div>`).join("")}
          </div>
          <div style="margin-top:24px;max-width:74ch">
            ${calloutBox("Business and Enterprise conversations are excluded from training with no opt-in available — the setting does not exist on those plans, so nobody can enable it by accident.", { variant: "accent", icon: "lock" }).value}
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Roll it out without a six-month review.",
        body: "Most security reviews close in under three weeks. We will send the documentation before the first call.",
        primary: { label: "Talk to sales", href: "/company/contact", icon: "arrow-ne" },
        secondary: { label: "Enterprise deployment", href: "/products/enterprise" }
      }).value}
    `;
  }
};
