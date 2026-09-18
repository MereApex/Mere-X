/* ============================================================
   RESOURCES — support
   ============================================================ */

import { FAQ } from "../../data/content.js";
import { ERROR_CODES } from "../../data/docs.js";
import { COMPANY } from "../../data/site.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, accordion, dataTable, calloutBox } from "../../components/ui.js";

const ROUTES = [
  { icon: "book", t: "Documentation", d: "Guides, concepts, and the full API reference. Most questions are answered faster here than by us.", href: "/docs", cta: "Read the docs" },
  { icon: "flask", t: "Cookbook", d: "Working recipes for the patterns that keep coming up — RAG, agents, batch, structured extraction.", href: "/docs/cookbook", cta: "Browse recipes" },
  { icon: "activity", t: "Status", d: "Before you file a ticket, check whether it is us. Live health for every service and region.", href: "/status", cta: "Check status" },
  { icon: "list", t: "Request logs", d: "Paste a request ID into the console and see exactly what happened — prompt, tools, tokens, stop reason.", href: "/console/logs", cta: "Open logs" },
  { icon: "mail", t: "Email support", d: `Write to ${COMPANY.support} with a request ID if you have one. It cuts resolution time roughly in half.`, href: `mailto:${COMPANY.support}`, cta: "Email us" },
  { icon: "shield", t: "Security", d: "Vulnerability reports and model behaviour findings go through coordinated disclosure, with safe harbour.", href: "/safety/disclosure", cta: "Report securely" }
];

const TIERS = [
  { tier: "Free", response: "Community and docs", channels: "Documentation", hours: "—" },
  { tier: "Standard", response: "1 business day", channels: "Email", hours: "Business hours" },
  { tier: "Priority", response: "4 business hours", channels: "Email, chat", hours: "Extended hours" },
  { tier: "Enterprise", response: "1 hour · 24/7 for Sev 1", channels: "Email, chat, phone, shared Slack", hours: "24/7" }
];

const TROUBLESHOOT = [
  {
    q: "My requests are returning 429",
    a: "<p>You are over your requests-per-minute or tokens-per-minute limit. Check the <code class=\"inline\">mere-x-ratelimit-*</code> headers on the response for your exact remaining budget and reset time, then back off with jitter.</p><p>Longer term: move offline work to the Batch API (separate quota, half price), route easy calls to Nyx, and cache stable prefixes. Your current headroom is visible in <a class=\"link-plain\" href=\"/console/limits\">rate limits</a>.</p>"
  },
  {
    q: "The model refuses something legitimate",
    a: "<p>Over-refusal is a bug we track, not a policy outcome. Security research, clinical questions, and content moderation are the most common false positives.</p><p>First, state the professional context in the system prompt — it genuinely changes behaviour. If it still refuses, send us the prompt: we use these reports directly in refusal calibration.</p>"
  },
  {
    q: "Streaming cuts off mid-response",
    a: "<p>Check <code class=\"inline\">stop_reason</code> on the final message. <code class=\"inline\">max_tokens</code> means you hit your own ceiling; <code class=\"inline\">thinking_budget</code> means deliberation ran out. Neither is an error.</p><p>If there is no final message at all, it is a transport issue — the SDKs reconnect automatically, so this usually means a proxy in between is buffering or timing out.</p>"
  },
  {
    q: "Costs are higher than I expected",
    a: "<p>Look at <code class=\"inline\">usage.thinking_tokens</code> first — a High or Extra High budget on a call site that did not need it is the most common cause. Then check your cache hit rate: a stable prefix should be reading at 10% of input price.</p><p>The <a class=\"link-plain\" href=\"/console/usage\">usage page</a> breaks this down by model and key.</p>"
  },
  {
    q: "Structured output is not matching my schema",
    a: "<p>With <code class=\"inline\">response_format: { type: \"json_schema\" }</code> it cannot fail validation — the constraint is enforced during sampling. If you are seeing invalid output, the schema is probably not being sent, or you are parsing the wrong content block.</p><p>Check the request body in <a class=\"link-plain\" href=\"/console/logs\">request logs</a> to confirm what actually arrived.</p>"
  },
  {
    q: "Long-context recall is worse than expected",
    a: "<p>Order matters. Put the corpus at the top and the instruction at the bottom — the model weights later instructions slightly higher, and a question buried above 400,000 tokens of context genuinely gets less attention.</p><p>Also check that you are not exceeding the model's window: Nyx is 400K, not 1M.</p>"
  }
];

export default {
  title: "Support",
  description: "Get help with Mere X and the Mere X API — docs, troubleshooting, and human support.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Support" }],
        eyebrow: "Help",
        title: "Something not working?",
        lead: "Start with the troubleshooting below — it covers roughly three quarters of the tickets we get. If none of it fits, write to us with a request ID.",
        actions: `${button({ label: `Email ${COMPANY.support}`, href: `mailto:${COMPANY.support}`, icon: "mail" }).value}
                  ${button({ label: "Check platform status", href: "/status", variant: "secondary", icon: "activity" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="grid g-3" data-stagger="70">
            ${ROUTES.map((route) => `
              <a class="card card-hover card-spot" href="${route.href}" data-reveal>
                <div class="card-icon">${icon(route.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${route.t}</h3>
                <p class="small muted" style="line-height:1.6">${route.d}</p>
                <div style="margin-top:auto;padding-top:12px">${textLink(route.cta, route.href).value}</div>
              </a>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Troubleshooting ---- -->
      <section class="section section-line">
        <div class="shell">
          ${sectionHead({
            eyebrow: "Troubleshooting",
            title: "Six things that go wrong most often.",
            lead: "With the actual fix rather than a link to a generic article."
          }).value}
          ${accordion(TROUBLESHOOT, { open: 0 }).value}
        </div>
      </section>

      <!-- ---- Errors ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Errors",
            title: "Status codes, and whether retrying helps.",
            action: textLink("Full error reference", "/docs/errors").value
          }).value}
          ${dataTable({
            columns: [
              { key: "code", label: "Code", render: (r) => `<code class="inline">${r.code}</code>` },
              { key: "type", label: "Type", render: (r) => `<code class="mono small">${r.type}</code>` },
              { key: "meaning", label: "What it means" },
              { key: "action", label: "What to do" }
            ],
            rows: ERROR_CODES
          }).value}
        </div>
      </section>

      <!-- ---- Tiers ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Support tiers", title: "Who answers, and how fast." }).value}
          ${dataTable({
            columns: [
              { key: "tier", label: "Plan", render: (r) => `<strong>${r.tier}</strong>` },
              { key: "response", label: "First response" },
              { key: "channels", label: "Channels" },
              { key: "hours", label: "Coverage" }
            ],
            rows: TIERS
          }).value}
          <div style="margin-top:22px;max-width:76ch">
            ${calloutBox("Include a <code class=\"inline\">request-id</code> from any response header. It lets us look at the exact request — prompt, tools, tokens, and latency breakdown — and roughly halves resolution time.", { variant: "accent", icon: "scan" }).value}
          </div>
        </div>
      </section>

      <!-- ---- FAQ ---- -->
      <section class="section">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "About data, billing, and models." }).value}
          ${accordion(FAQ, { open: -1 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "Still stuck?",
        body: `Write to ${COMPANY.support} with a request ID and what you expected to happen.`,
        primary: { label: "Email support", href: `mailto:${COMPANY.support}`, icon: "arrow-ne" },
        secondary: { label: "Talk to sales", href: "/company/contact" }
      }).value}
    `;
  }
};
