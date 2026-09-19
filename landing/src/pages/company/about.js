/* ============================================================
   COMPANY — about
   ============================================================ */

import { COMPANY, VALUES, MILESTONES, LEADERSHIP } from "../../data/site.js";
import { icon } from "../../lib/icons.js";
import { mereXSeal } from "../../components/orb.js";
import { pageHead, sectionHead, textLink, button, ctaBand, statTile, personCard, calloutBox } from "../../components/ui.js";

export default {
  title: "About Mere X",
  description: "Who we are, how we got here, what we believe, and who runs the place.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Company" }],
        eyebrow: `Founded ${COMPANY.founded}`,
        title: COMPANY.tagline,
        lead: COMPANY.mission,
        actions: `${button({ label: "Open roles", href: "/company/careers", icon: "arrow-ne" }).value}
                  ${button({ label: "Our research", href: "/research", variant: "secondary", icon: "flask" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="grid g-4" data-stagger="90">
            ${statTile({ value: COMPANY.people, label: "People", note: `Across ${COMPANY.offices.length} offices` }).value}
            ${statTile({ value: COMPANY.researchers, label: "In research", note: "A third of the company" }).value}
            ${statTile({ value: 2023, label: "Founded", note: COMPANY.hq }).value}
            ${statTile({ value: 62, label: "Countries served", note: "Through the API and the app" }).value}
          </div>
        </div>
      </section>

      <!-- ---- Story ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="split split-60" style="gap:clamp(28px,4vw,64px);align-items:center">
            <div class="prose" data-reveal="left">
              <p class="eyebrow">Why we exist</p>
              <h2 style="margin-top:18px;margin-bottom:22px">The bet.</h2>
              <p>
                Mere X started in 2023 with eleven people and one conviction: that capability and
                understanding have to advance together, or neither is worth much. Plenty of labs could
                make a model larger. Fewer were willing to slow down to find out what the larger model
                was actually doing.
              </p>
              <p>
                That conviction shows up in unglamorous places. A third of the company is in research,
                and the largest single group works on interpretability. The safety organisation holds
                the release gate rather than advising the people who do. Our system cards enumerate the
                tasks our models fail, which is not a marketing decision.
              </p>
              <p>
                We build two things: <strong>Mere X</strong>, a model family engineered around the idea
                that thinking should be a resource you control, and a platform for putting it to work —
                an agent that works in your codebase, in your browser.
              </p>
              <p>${textLink("Read our research", "/research").value}</p>
            </div>
            <div class="center" data-reveal="right" style="display:grid;place-items:center;padding:20px">
              <div style="width:min(280px,72%)">${mereXSeal({ size: 280 }).value}</div>
              <p class="xs muted" style="margin-top:40px;text-align:center;max-width:28ch">
                The Mere X mark. Three arcs around a common centre — capability, understanding, and use.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Values ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "What we believe",
            title: "Four things we actually argue about.",
            lead: "Values are only useful when they rule something out. These do."
          }).value}
          <div class="grid g-2" data-stagger="90">
            ${VALUES.map((value, i) => `
              <article class="card card-pad-lg card-hover card-spot" data-reveal>
                <div class="between" style="align-items:flex-start">
                  <div class="card-icon" style="width:46px;height:46px">${icon(value.icon).value}</div>
                  <span class="card-num">${String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 style="font-size:var(--t-h3)">${value.title}</h3>
                <p class="ink-3" style="line-height:1.66">${value.body}</p>
              </article>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Timeline ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(28px,4vw,64px);align-items:start">
            <div data-reveal="left">
              <p class="eyebrow">History</p>
              <h2 style="margin-top:18px">Six moments.</h2>
              <p class="lead" style="margin-top:18px">
                From a converted print shop in the Mission to five offices and a model family that
                serves four trillion tokens a day.
              </p>
              <div style="margin-top:24px">
                ${calloutBox("Mere 3.5 was never released. It existed to prove the training stack and the evaluation harness worked end to end. Shipping it would have been easy and wrong.", { icon: "info" }).value}
              </div>
            </div>
            <div class="timeline" data-reveal="right">
              ${MILESTONES.map((m) => `
                <div class="tl-item">
                  <div class="tl-date">${m.date}</div>
                  <div class="tl-title">${m.title}</div>
                  <p class="tl-body">${m.body}</p>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Leadership ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Leadership", title: "Who runs the place." }).value}
          <div class="grid g-3" data-stagger="80">
            ${LEADERSHIP.map((person) => personCard(person).value).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Offices ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Where we are", title: `${COMPANY.offices.length} offices.` }).value}
          <div class="grid g-auto-sm" data-stagger="70">
            ${[
              ["San Francisco", "Headquarters · research, product, systems", "312 people"],
              ["London", "Research, safety, policy", "148 people"],
              ["Zürich", "Policy, legal, EU operations", "42 people"],
              ["Tokyo", "Go-to-market, APAC solutions", "56 people"],
              ["Tbilisi", "Inference systems, developer platform", "82 people"]
            ].map(([city, focus, size]) => `
              <div class="card card-hover card-spot card-pad-sm" data-reveal>
                <div class="card-icon" style="width:34px;height:34px">${icon("building").value}</div>
                <h3 style="font-size:var(--t-sm);font-weight:500">${city}</h3>
                <p class="xs muted" style="line-height:1.55">${focus}</p>
                <p class="xs" style="color:var(--faint);margin-top:auto;padding-top:8px">${size}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Structure ---- -->
      <section class="section">
        <div class="shell shell-wide">
          <div class="panel-dark" data-reveal>
            <div class="split split-60" style="gap:clamp(28px,4vw,56px);align-items:center">
              <div>
                <p class="eyebrow">Structure</p>
                <h2 style="margin-top:18px;font-size:var(--t-h2)">A public benefit corporation, with a long-term trust.</h2>
                <p style="margin-top:20px;color:rgba(255,255,255,.66);line-height:1.68;max-width:52ch">
                  Mere X is incorporated as a public benefit corporation, which obliges the board to
                  weigh the mission alongside shareholder return. A separate long-term benefit trust
                  holds a class of shares with the right to appoint a minority of directors — a structural
                  brake that does not depend on any individual continuing to care.
                </p>
                <div class="row" style="margin-top:26px;gap:18px">
                  <a class="link" href="/safety" style="color:#fff"><span>Our safety approach</span>${icon("arrow-ne", "icon").value}</a>
                  <a class="link" href="/company/trust" style="color:#fff"><span>Trust centre</span>${icon("arrow-ne", "icon").value}</a>
                </div>
              </div>
              <div class="grid g-2" style="gap:12px">
                ${[["PBC", "Corporate form"], ["Trust", "Appoints directors"], ["$1.4B", "Series C, March 2026"], ["100%", "Employees hold equity"]].map(([v, l]) => `
                  <div style="padding:18px;border:1px solid rgba(255,255,255,.14);border-radius:var(--r-md)">
                    <div style="font-size:1.5rem;font-weight:300;letter-spacing:-.03em">${v}</div>
                    <div class="xs" style="color:rgba(255,255,255,.5);margin-top:3px">${l}</div>
                  </div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </section>

      ${ctaBand({
        eyebrow: "Careers",
        title: "We are hiring across research, product, and systems.",
        body: `${COMPANY.people} people in ${COMPANY.offices.length} offices, and a twelve-month residency for people early in the field.`,
        primary: { label: "See open roles", href: "/company/careers", icon: "arrow-ne" },
        secondary: { label: "Get in touch", href: "/company/contact" }
      }).value}
    `;
  }
};
