/* ============================================================
   RESOURCES — support for Mere Studio
   ============================================================ */

import { FAQ } from "../../data/content.js";
import { COMPANY } from "../../data/site.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, accordion, dataTable, calloutBox } from "../../components/ui.js";

const ROUTES = [
  { icon: "terminal", t: "How it works", d: "What Agent, Plan and Ask do, how the four thinking depths behave, and what the agent may and may not touch.", href: "/products/studio", cta: "Read how it works" },
  { icon: "activity", t: "Status", d: "Before you write to us, check whether it is us. Live health for the workspace, the models and the account service.", href: "/status", cta: "Check status" },
  { icon: "card", t: "Plans and limits", d: "Which models and thinking depths each plan includes, and how many agent turns you get in five hours.", href: "/pricing", cta: "Compare plans" },
  { icon: "mail", t: "Email support", d: `Write to ${COMPANY.support} with the thread title and roughly when it happened. It cuts resolution time about in half.`, href: `mailto:${COMPANY.support}`, cta: "Email us" },
  { icon: "shield", t: "Security", d: "Vulnerability reports and model behaviour findings go through coordinated disclosure, with safe harbour for good-faith research.", href: "/safety/disclosure", cta: "Report a vulnerability" }
];

const TIERS = [
  { tier: "Free", response: "Self-serve", channels: "This page and status", hours: "—" },
  { tier: "Starter · Plus", response: "1 business day", channels: "Email", hours: "Business hours" },
  { tier: "Pro · Max", response: "4 business hours", channels: "Email, priority queue", hours: "Extended hours" },
  { tier: "Business", response: "1 hour · 24/7 for Sev 1", channels: "Email, chat, shared Slack", hours: "24/7" }
];

const TROUBLESHOOT = [
  {
    q: "The agent says there is no project open",
    a: "<p>Mere works on a folder you choose. In the browser, open one from the project menu — Chrome and Edge can hand a local folder to the page, and any browser can hold a project in its own storage.</p><p>If the folder was opened in a previous session and the browser has forgotten permission, open it again; the agent never keeps a handle you did not grant.</p>"
  },
  {
    q: "It cannot find a file I know exists",
    a: "<p>Files ignored by <code class=\"inline\">.gitignore</code>, and folders like <code class=\"inline\">node_modules</code> and <code class=\"inline\">.git</code>, are left out of the index on purpose. Very large files are skipped too.</p><p>Mention the file directly with <code class=\"inline\">@</code> in the composer to put it in front of the agent regardless.</p>"
  },
  {
    q: "I ran out of agent turns",
    a: "<p>Every plan has a number of turns per five hours, and a weekly ceiling. The account menu shows how much is left and when it resets. A turn is one prompt, however many tools the agent uses inside it.</p><p>Fast and Medium thinking on 4.0 Lite stretch a plan the furthest; Extra High on 4.2 Peak uses the most.</p>"
  },
  {
    q: "An edit went in that I did not want",
    a: "<p>Nothing is final. Every touched file sits in Changes until you accept or reject it, and rejecting restores the exact bytes from before the turn.</p><p>To undo a whole exchange, use <em>Restore checkpoint</em> on your prompt: the files go back to how they were before that message and the later messages leave the thread.</p>"
  }
];

export default {
  title: "Support",
  description: "Get help with Mere Studio — troubleshooting, plans and limits, and human support.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Support" }],
        eyebrow: "Help",
        title: "Something not working?",
        lead: "Start with the troubleshooting below — it covers most of what people write to us about. If none of it fits, send an email and a person will read it.",
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
            title: "Six things that come up most often.",
            lead: "With the actual fix rather than a link to a generic article."
          }).value}
          ${accordion(TROUBLESHOOT, { open: 0 }).value}
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
            ${calloutBox("Tell us the thread title and roughly when it happened. Threads sync to your account, so that is usually enough for us to find the exchange — we never read project files.", { icon: "info" }).value}
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
        body: `Write to ${COMPANY.support} with the thread title and what you expected to happen.`,
        primary: { label: "Email support", href: `mailto:${COMPANY.support}`, icon: "arrow-ne" },
        secondary: { label: "Talk to sales", href: "/company/contact" }
      }).value}
    `;
  }
};
