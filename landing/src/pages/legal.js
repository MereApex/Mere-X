/* ============================================================
   LEGAL — privacy, terms, cookies
   ============================================================ */

import { COMPANY } from "../data/site.js";
import { icon } from "../lib/icons.js";
import { slugify } from "../lib/format.js";
import { pageHead, ctaBand, calloutBox, dataTable, textLink } from "../components/ui.js";

const PAGES = {
  privacy: {
    title: "Privacy policy",
    updated: "18 June 2026",
    lead: "What we collect, why, how long we keep it, and what we will never do with it.",
    sections: [
      { h: "The short version", blocks: [
        { t: "callout", v: { text: "<strong>We do not train on your data.</strong> API inputs and outputs are never used to train Mere X models. Mere X Studio conversations are excluded by default; contributing them is opt-in and revocable.", variant: "accent", icon: "shield" } },
        { t: "p", v: "Everything below is the detail behind that sentence. If any of it contradicts the sentence, the sentence is what we meant and the detail is a drafting error we would like to hear about." }
      ]},
      { h: "What we collect", blocks: [
        { t: "table", v: {
          columns: [{ key: "cat", label: "Category" }, { key: "what", label: "What" }, { key: "why", label: "Why" }],
          rows: [
            { cat: "Account data", what: "Name, email, organisation, billing details", why: "To operate your account and bill you" },
            { cat: "Request content", what: "Prompts, files, and responses", why: "To generate a response, and for abuse monitoring" },
            { cat: "Usage metadata", what: "Token counts, latency, model, endpoint, request ID", why: "Billing, rate limiting, and the usage page" },
            { cat: "Technical data", what: "IP address, user agent, timestamps", why: "Security, fraud prevention, and debugging" },
            { cat: "Support data", what: "Tickets and their contents", why: "To answer you" }
          ]
        }}
      ]},
      { h: "Retention", blocks: [
        { t: "p", v: "Request content is retained for 30 days by default, for abuse monitoring and debugging, then deleted. You can reduce this to 7 days, or to zero with zero-retention mode, in <a href=\"/console/settings\">console settings</a>." },
        { t: "p", v: "Zero-retention means nothing is written to disk beyond the life of the request. Request logs continue to show metadata — model, tokens, latency, status — but no prompt or response content." },
        { t: "p", v: "Account and billing records are retained for seven years where tax law requires it. Everything else is deleted within 30 days of account closure, including from backups." }
      ]},
      { h: "Who can see your data", blocks: [
        { t: "p", v: "A small on-call group, only in response to a specific incident or abuse investigation, with every access logged and reviewed weekly. Never for product development, never for training, and never for evaluating your business." },
        { t: "p", v: "Sub-processors are listed in the <a href=\"/company/trust\">trust centre</a>. We give 30 days' notice before adding one, and you may object." }
      ]},
      { h: "Your rights", blocks: [
        { t: "p", v: "Under GDPR, UK GDPR, CCPA, and equivalent laws you may access, correct, export, or delete your data, and object to processing. Exercise any of these through the console or by writing to us — we do not require a form, and we do not charge." },
        { t: "p", v: "Requests are answered within 30 days, usually within three. If we refuse one, we will say which exemption we are relying on rather than declining without explanation." }
      ]},
      { h: "International transfers", blocks: [
        { t: "p", v: "Pin a residency policy and requests are refused rather than routed outside it. Where transfers do occur, they rely on Standard Contractual Clauses and the UK Addendum, with a transfer impact assessment available on request." },
        { t: "p", v: "Billing metadata is aggregated in the United States. That exception is stated in the DPA rather than hidden in it." }
      ]},
      { h: "Contact", blocks: [
        { t: "p", v: `Privacy questions go to <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>. Our EU representative and Data Protection Officer are named in the trust centre.` }
      ]}
    ]
  },

  terms: {
    title: "Terms of service",
    updated: "18 June 2026",
    lead: "The agreement between you and Mere X. Written to be read.",
    sections: [
      { h: "Agreement", blocks: [
        { t: "p", v: "By using Mere X services you agree to these terms and to the <a href=\"/safety/usage-policy\">usage policy</a>. If you are agreeing on behalf of an organisation, you confirm you have authority to do so." },
        { t: "p", v: "Enterprise customers usually operate under a negotiated master services agreement instead. Where one exists, it takes precedence over these terms." }
      ]},
      { h: "Your content and outputs", blocks: [
        { t: "p", v: "You retain ownership of what you send us. As between you and Mere X, you own the outputs generated from your inputs, subject to the usage policy." },
        { t: "p", v: "You grant us the limited licence needed to process your inputs and deliver outputs — nothing broader. That licence does not extend to training, and it ends when the data is deleted." },
        { t: "callout", v: { text: "Outputs are not guaranteed to be unique. Similar prompts from different customers can produce similar outputs, and neither of you owns the other's.", icon: "info" } }
      ]},
      { h: "Acceptable use", blocks: [
        { t: "p", v: "The <a href=\"/safety/usage-policy\">usage policy</a> forms part of these terms. It applies to applications as well as prompts: an application designed to do a prohibited thing violates the policy even if each individual request looks innocuous." }
      ]},
      { h: "Fees and payment", blocks: [
        { t: "p", v: "Usage is billed per token at the rates published on the <a href=\"/pricing\">pricing page</a>. Prepaid credits are consumed first. Monthly invoices are due 30 days from issue." },
        { t: "p", v: "We give 30 days' notice of a price increase, and it never applies to a committed-term agreement already in force." }
      ]},
      { h: "Service levels", blocks: [
        { t: "p", v: "Shared capacity targets 99.9% monthly availability; provisioned throughput targets 99.95% with service credits. The full SLA is available on Enterprise agreements." }
      ]},
      { h: "Warranties and liability", blocks: [
        { t: "p", v: "Services are provided as-is. Model outputs may be inaccurate; you are responsible for reviewing them before relying on them, and for keeping a qualified human in the loop for consequential decisions." },
        { t: "p", v: "Liability is capped at fees paid in the preceding twelve months, except for breaches of confidentiality, indemnification obligations, and anything that cannot be limited by law." },
        { t: "p", v: "Enterprise agreements include copyright indemnification for outputs, subject to the usage policy and the conditions in the MSA." }
      ]},
      { h: "Termination", blocks: [
        { t: "p", v: "Either party may terminate for convenience with 30 days' notice, or immediately for material breach. On termination you may export your data for 30 days, in JSON, through the API or the console. There is no exit fee and no proprietary format to unwind." }
      ]}
    ]
  },

  cookies: {
    title: "Cookie policy",
    updated: "18 June 2026",
    lead: "What we set, why, and how to turn it off.",
    sections: [
      { h: "What we use", blocks: [
        { t: "table", v: {
          columns: [{ key: "name", label: "Cookie" }, { key: "purpose", label: "Purpose" }, { key: "type", label: "Type" }, { key: "life", label: "Lifetime" }],
          rows: [
            { name: "merex_session", purpose: "Keeps you signed in", type: "Essential", life: "Session" },
            { name: "merex_csrf", purpose: "Cross-site request forgery protection", type: "Essential", life: "Session" },
            { name: "mere-x.theme", purpose: "Remembers light or dark", type: "Preference", life: "1 year" },
            { name: "merex_org", purpose: "Remembers your selected organisation", type: "Preference", life: "90 days" },
            { name: "merex_analytics", purpose: "Aggregate page metrics, no cross-site tracking", type: "Analytics", life: "90 days" }
          ]
        }}
      ]},
      { h: "What we do not use", blocks: [
        { t: "p", v: "No advertising cookies, no cross-site tracking pixels, no data brokers, and no third-party analytics that build a profile of you across the web. Our analytics are first-party and aggregate." }
      ]},
      { h: "Turning them off", blocks: [
        { t: "p", v: "Analytics and preference cookies can be declined without affecting functionality — the theme setting simply falls back to your system preference. Essential cookies cannot be disabled while signed in, because they are what keeps you signed in." },
        { t: "p", v: "Browser-level blocking works fine here. We do not detect it, and we do not degrade the site in response." }
      ]}
    ]
  }
};

export default {
  title: (ctx) => PAGES[ctx.params.slug]?.title || "Legal",
  description: (ctx) => PAGES[ctx.params.slug]?.lead || "Legal information for Mere X.",

  render(ctx) {
    const page = PAGES[ctx.params.slug];
    if (!page) {
      return `
        <section class="section">
          <div class="shell">
            <div class="empty">${icon("file").value}
              <h2 style="font-size:var(--t-h3)">No such document</h2>
              <p class="small">Try ${Object.entries(PAGES).map(([slug, p]) => `<a class="link-plain" href="/legal/${slug}">${p.title}</a>`).join(", ")}.</p>
            </div>
          </div>
        </section>`;
    }

    const renderBlock = (block) => {
      if (block.t === "p") return `<p>${block.v}</p>`;
      if (block.t === "callout") return calloutBox(block.v.text, { variant: block.v.variant, icon: block.v.icon }).value;
      if (block.t === "table") return dataTable(block.v).value;
      return "";
    };

    return `
      ${pageHead({
        crumb: [{ label: "Legal" }, { label: page.title }],
        eyebrow: `Last updated ${page.updated}`,
        title: page.title,
        lead: page.lead
      }).value}

      <section class="section">
        <div class="shell shell-wide">
          <div class="docs" style="grid-template-columns:220px minmax(0,1fr);padding-top:0">
            <nav class="docs-nav" aria-label="Sections">
              <p class="docs-nav-title">On this page</p>
              ${page.sections.map((s) => `<a href="#${slugify(s.h)}">${s.h}</a>`).join("")}
              <div class="docs-nav-group" style="margin-top:26px">
                <p class="docs-nav-title">Other documents</p>
                ${Object.entries(PAGES).filter(([slug]) => slug !== ctx.params.slug)
                  .map(([slug, p]) => `<a href="/legal/${slug}">${p.title}</a>`).join("")}
                <a href="/safety/usage-policy">Usage policy</a>
                <a href="/company/trust">Trust centre</a>
              </div>
            </nav>

            <article class="prose" style="max-width:74ch">
              ${page.sections.map((section) => `
                <section style="margin-top:2.4em">
                  <h2 id="${slugify(section.h)}">${section.h}</h2>
                  ${section.blocks.map(renderBlock).join("")}
                </section>`).join("")}

              <section style="margin-top:2.8em;padding-top:24px;border-top:1px solid var(--line)">
                <p class="small muted">
                  Questions about this document go to <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>.
                  We revise these pages rather than silently amending them; the last-updated date at the
                  top is the date of the most recent substantive change.
                </p>
              </section>
            </article>
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "The trust centre has the rest.",
        body: "Certifications, sub-processors, data handling, and the documents your review needs.",
        primary: { label: "Trust centre", href: "/company/trust", icon: "arrow-ne" },
        secondary: { label: "Contact us", href: "/company/contact" }
      }).value}
    `;
  }
};
