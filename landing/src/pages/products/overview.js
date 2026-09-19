/* ============================================================
   PRODUCTS — overview
   ============================================================ */

import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand } from "../../components/ui.js";
import { mereXSeal } from "../../components/orb.js";

const PRODUCTS = [
  {
    icon: "terminal", name: "Mere Code", href: "/products/code", tag: "For engineers",
    tagline: "The coding agent, in your browser.",
    body: "Open a folder, describe the change, and watch Mere read, plan, edit and explain. Every diff is reviewable, every turn has a checkpoint, and nothing needs installing.",
    points: ["Agent, Plan and Ask modes", "Four thinking depths", "Checkpoints and per-file review", "Works on your local files"]
  },
  {
    icon: "building", name: "Enterprise", href: "/products/enterprise", tag: "For institutions",
    tagline: "Deployment on your terms.",
    body: "Private tenancy, committed throughput, data residency, air-gapped installations, and a named solutions architect.",
    points: ["Private VPC and dedicated capacity", "US / EU / APAC residency", "99.95% SLA with credits", "Named architect and 24/7 support"]
  }
];

export default {
  title: "Products",
  description: "Mere Code in the browser, and enterprise deployment.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Products" }],
        eyebrow: "Products",
        title: "One model family. Three ways to put it to work.",
        lead: "For one engineer or a whole institution, it is the same agent and the same Mere family underneath — same safety layer, same thinking budgets, same bill.",
        actions: `${button({ label: "Open Mere Code", href: "/app", icon: "arrow-ne" }).value}
                  ${button({ label: "See pricing", href: "/pricing", variant: "secondary", icon: "card" }).value}`
      }).value}

      <section class="section">
        <div class="shell shell-wide">
          <div class="grid g-2" data-stagger="90">
            ${PRODUCTS.map((product) => `
              <a class="card card-pad-lg card-hover card-spot" href="${product.href}" data-reveal>
                <div class="between" style="align-items:flex-start">
                  <div class="card-icon" style="width:48px;height:48px">${icon(product.icon).value}</div>
                  <span class="badge">${product.tag}</span>
                </div>
                <div>
                  <h2 style="font-size:var(--t-h3)">${product.name}</h2>
                  <p style="font-size:var(--t-lead);color:var(--ink-2);margin-top:8px;line-height:1.4">${product.tagline}</p>
                  <p class="small muted" style="margin-top:12px;line-height:1.62">${product.body}</p>
                </div>
                <ul class="stack stack-2" style="margin-top:6px">
                  ${product.points.map((point) => `<li class="row row-tight small ink-3" style="flex-wrap:nowrap;align-items:flex-start">${icon("check", "icon").value}<span>${point}</span></li>`).join("")}
                </ul>
                <div style="margin-top:auto;padding-top:14px">${textLink(`Explore ${product.name}`, product.href).value}</div>
              </a>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Which one ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Choosing", title: "Which one do you need?" }).value}
          <div class="table-wrap" data-reveal>
            <table class="data">
              <thead><tr><th>If you want to…</th><th>Start with</th><th>And add</th></tr></thead>
              <tbody>
                <tr><td>hand a task to an agent</td><td><a class="link-plain" href="/products/code"><strong>Mere Code</strong></a></td><td class="small muted">In the browser, on your own files</td></tr>
                <tr><td>roll it out to a team</td><td><a class="link-plain" href="/products/enterprise"><strong>Enterprise</strong></a></td><td class="small muted">SSO and a retention policy</td></tr>
                <tr><td>ship code faster</td><td><a class="link-plain" href="/products/code"><strong>Mere Code</strong></a></td><td class="small muted">CI integration for review on every PR</td></tr>
                <tr><td>deploy inside a regulated estate</td><td><a class="link-plain" href="/products/enterprise"><strong>Enterprise</strong></a></td><td class="small muted">Residency pinning and zero retention</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          <div class="split split-60" style="align-items:center;gap:clamp(28px,4vw,64px)">
            <div data-reveal="left">
              <p class="eyebrow">The common layer</p>
              <h2 style="margin-top:18px">Everything runs on the same model.</h2>
              <p class="lead" style="margin-top:18px">
                The assistant, the coding agent, and your own application all call the same Mere X
                models through the same safety layer. A behaviour you verify in the playground is the
                behaviour you get in production — and the behaviour your colleagues get in the app.
              </p>
              <div class="row" style="margin-top:26px;gap:16px">
                ${button({ label: "The model family", href: "/technology", variant: "secondary", size: "btn-sm", icon: "arrow-right" }).value}
                ${textLink("Safety approach", "/safety").value}
              </div>
            </div>
            <div class="center" data-reveal="right" style="display:grid;place-items:center;padding:30px">
              <div style="width:min(240px,64%)">${mereXSeal({ size: 240 }).value}</div>
            </div>
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Start wherever makes sense.",
        body: "The free plan takes about a minute. Sign in, open a folder, describe the change.",
        primary: { label: "Try Mere X", href: "/app", icon: "arrow-ne" },
        secondary: { label: "See pricing", href: "/pricing" }
      }).value}
    `;
  }
};
