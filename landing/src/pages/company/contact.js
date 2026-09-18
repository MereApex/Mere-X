/* ============================================================
   COMPANY — contact
   ============================================================ */

import { COMPANY } from "../../data/site.js";
import { icon } from "../../lib/icons.js";
import { toast } from "../../lib/toast.js";
import { pageHead, sectionHead, textLink, button, ctaBand, calloutBox } from "../../components/ui.js";

const CHANNELS = [
  { icon: "briefcase", t: "Sales", d: "Enterprise deployment, provisioned throughput, residency, and pricing for volume.", email: COMPANY.email, note: "One business day" },
  { icon: "help", t: "Support", d: "Something broken, something confusing, or an over-refusal you want us to fix.", email: COMPANY.support, note: "See support tiers" },
  { icon: "news", t: "Press", d: "Interviews, fact-checking, and the press kit. We fact-check quickly and without conditions.", email: COMPANY.press, note: "One business day" },
  { icon: "shield", t: "Security", d: "Vulnerability reports, model behaviour findings, and coordinated disclosure.", email: COMPANY.security, note: "Four hours for critical" }
];

const OFFICES = [
  { city: "San Francisco", detail: "Headquarters", address: "1140 Folsom Street\nSan Francisco, CA 94103\nUnited States" },
  { city: "London", detail: "Research & safety", address: "40 Rathbone Place\nLondon W1T 1HX\nUnited Kingdom" },
  { city: "Zürich", detail: "Policy & EU operations", address: "Bahnhofstrasse 52\n8001 Zürich\nSwitzerland" },
  { city: "Tokyo", detail: "APAC go-to-market", address: "2-11-3 Meguro\nTokyo 153-0063\nJapan" },
  { city: "Tbilisi", detail: "Inference & platform", address: "12 Shota Rustaveli Ave\nTbilisi 0108\nGeorgia" }
];

export default {
  title: "Contact",
  description: "Talk to sales, support, press, or the security team at Mere X.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Company", href: "/company" }, { label: "Contact" }],
        eyebrow: "Get in touch",
        title: "Tell us what you are trying to do.",
        lead: "We will tell you honestly whether Mere X is the right fit — including when it is not, which happens more often than a sales page usually admits.",
        actions: `${button({ label: "Talk to sales", href: "#form", icon: "arrow-down" }).value}
                  ${button({ label: "Open Mere Code", href: "/app", variant: "secondary", icon: "arrow-ne" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="grid g-4" data-stagger="70">
            ${CHANNELS.map((c) => `
              <a class="card card-hover card-spot" href="mailto:${c.email}" data-reveal>
                <div class="card-icon">${icon(c.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${c.t}</h3>
                <p class="small muted" style="line-height:1.58">${c.d}</p>
                <div style="margin-top:auto;padding-top:12px;border-top:1px solid var(--line-soft)">
                  <div class="mono xs" style="color:var(--ink-2);word-break:break-all">${c.email}</div>
                  <div class="xs" style="color:var(--faint);margin-top:3px">${c.note}</div>
                </div>
              </a>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Form ---- -->
      <section class="section section-line" id="form">
        <div class="shell shell-wide">
          <div class="split split-60" style="gap:clamp(28px,4vw,60px);align-items:start">
            <div data-reveal="left">
              ${sectionHead({ eyebrow: "Sales enquiry", title: "A real person reads this." }).value}
              <p class="lead measure">
                Enterprise deployment, provisioned throughput, data residency, or a security review that
                needs to start now. Tell us the workload and the constraints and we will route it to
                someone who can actually answer.
              </p>
              <div style="margin-top:26px">
                ${calloutBox("Trying it out? You do not need to talk to anyone — <a class=\"link-plain\" href=\"/app\">open Mere Code</a>, point it at a folder, and start.", { variant: "accent", icon: "bolt" }).value}
              </div>
              <div class="stack stack-3" style="margin-top:28px">
                ${[
                  ["Typical first response", "One business day"],
                  ["Security review", "Two to three weeks, documentation sent up front"],
                  ["Pilot to production", "Around six weeks with a named architect"]
                ].map(([k, v]) => `
                  <div class="between" style="padding-bottom:12px;border-bottom:1px solid var(--line-soft)">
                    <span class="small muted">${k}</span><span class="small">${v}</span>
                  </div>`).join("")}
              </div>
            </div>

            <form class="card card-pad-lg" data-contact-form data-reveal="right" novalidate>
              <div class="stack stack-4">
                <div class="split" style="gap:14px">
                  <div class="field">
                    <label class="field-label" for="c-name">Name</label>
                    <input class="input" id="c-name" name="name" required autocomplete="name">
                  </div>
                  <div class="field">
                    <label class="field-label" for="c-email">Work email</label>
                    <input class="input" id="c-email" name="email" type="email" required autocomplete="email">
                  </div>
                </div>
                <div class="split" style="gap:14px">
                  <div class="field">
                    <label class="field-label" for="c-company">Company</label>
                    <input class="input" id="c-company" name="company" autocomplete="organization">
                  </div>
                  <div class="field">
                    <label class="field-label" for="c-size">Team size</label>
                    <select class="select" id="c-size" name="size">
                      <option>1–10</option><option>11–50</option><option>51–200</option>
                      <option>201–1,000</option><option>1,000+</option>
                    </select>
                  </div>
                </div>
                <div class="field">
                  <label class="field-label" for="c-topic">What is this about?</label>
                  <select class="select" id="c-topic" name="topic">
                    <option>Enterprise deployment</option>
                    <option>Provisioned throughput</option>
                    <option>Data residency or compliance</option>
                    <option>Pricing for volume</option>
                    <option>Partnership</option>
                    <option>Something else</option>
                  </select>
                </div>
                <div class="field">
                  <label class="field-label" for="c-message">What are you building?</label>
                  <textarea class="textarea" id="c-message" name="message" rows="5" placeholder="The workload, the constraints, and what would make this a success."></textarea>
                  <span class="field-hint">The more specific, the more useful the first reply will be.</span>
                </div>
                <div class="row row-tight">
                  <button class="btn btn-primary" type="submit">${icon("arrow-ne", "icon").value}<span>Send enquiry</span></button>
                  <span class="xs muted" data-form-status></span>
                </div>
                <p class="xs muted" style="line-height:1.5">
                  By sending this you agree to our <a class="link-plain" href="/legal/privacy">privacy policy</a>.
                  We will not add you to a marketing list.
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      <!-- ---- Offices ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Offices", title: "Where to find us." }).value}
          <div class="grid g-auto-sm" data-stagger="70">
            ${OFFICES.map((office) => `
              <div class="card card-hover card-spot card-pad-sm" data-reveal>
                <div class="card-icon" style="width:34px;height:34px">${icon("building").value}</div>
                <h3 style="font-size:var(--t-sm);font-weight:500">${office.city}</h3>
                <p class="xs muted">${office.detail}</p>
                <p class="xs" style="color:var(--faint);margin-top:auto;padding-top:10px;line-height:1.6;white-space:pre-line">${office.address}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Or just start building.",
        body: "Open a folder and hand the agent a real task. No card, no setup.",
        primary: { label: "Open Mere Code", href: "/app", icon: "arrow-ne" },
        secondary: { label: "How it works", href: "/products/code" }
      }).value}
    `;
  },

  mount(root) {
    const form = root.querySelector("[data-contact-form]");
    const status = root.querySelector("[data-form-status]");
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = form.querySelector("#c-name");
      const email = form.querySelector("#c-email");

      if (!name.value.trim()) { status.textContent = "Add your name."; name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { status.textContent = "That email does not look right."; email.focus(); return; }

      status.textContent = "";
      toast("Enquiry sent — we will reply within one business day", { icon: "mail" });
      form.reset();
    });
  }
};
