/* ============================================================
   PRICING — the plans
   ============================================================ */

import { CONSUMER_PLANS } from "../data/models.js";
import { FAQ } from "../data/content.js";
import { icon } from "../lib/icons.js";
import { pageHead, sectionHead, button, ctaBand, accordion } from "../components/ui.js";
import { onLeave } from "../lib/router.js";

export default {
  title: "Pricing",
  description: "Plans for individuals and teams — every one of them includes the agent, your own files, and reviewable diffs.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Pricing" }],
        eyebrow: "Pricing",
        title: "Priced so you can predict the bill.",
        lead: "One agent, three models, four thinking depths. Plans differ in which models you can reach, how long they may think, and how many turns you get.",
        actions: `${button({ label: "Start free", href: "/app", icon: "arrow-ne" }).value}`
      }).value}

      <!-- ---- Plans ---- -->
      <section class="section">
        <div class="shell shell-wide">
          <div class="price-grid" data-stagger="70">
            ${CONSUMER_PLANS.map((plan) => `
              <article class="price-card ${plan.featured ? "featured" : ""}" data-reveal>
                ${plan.featured ? '<span class="price-badge">Most popular</span>' : ""}
                <div>
                  <div style="font-size:var(--t-h4)">${plan.name}</div>
                  <div class="price-amount" style="margin-top:10px">
                    <span class="cur">$</span><span class="val">${plan.price === 0 ? "0" : plan.price.toFixed(plan.price % 1 ? 2 : 0)}</span>
                    <span class="per">${plan.plus ? "+ " : ""}/ ${plan.cadence}</span>
                  </div>
                  <p class="small muted" style="margin-top:12px;min-height:3.4em">${plan.summary}</p>
                </div>
                <ul class="price-features">
                  ${plan.features.map((f) => `<li>${icon("check", "icon").value}<span>${f}</span></li>`).join("")}
                </ul>
                <a class="btn ${plan.featured ? "btn-primary" : "btn-secondary"} btn-block" href="${plan.name === "Business" ? "/company/contact" : plan.name === "Free" ? "/app" : `/checkout?plan=${encodeURIComponent(plan.name)}`}">${plan.cta}</a>
              </article>`).join("")}
          </div>
          <p class="xs muted center" style="margin-top:26px">
            Paid individual plans include 30 days of access. Starter includes 4.0 Lite and 4.2 Core; Plus, Pro, and Max include the full Mere model family with Extra High thinking. Free includes Mere 4.0 Lite.
            Education and non-profit pricing is available — <a class="link-plain" href="/company/contact">ask us</a>.
          </p>
        </div>
      </section>

      <section class="section">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "About billing and data." }).value}
          ${accordion(FAQ, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "Start on the free plan.",
        body: "Open a folder and hand the agent a real task. Upgrade when you run out of turns, not before.",
        primary: { label: "Open Mere Code", href: "/app", icon: "arrow-ne" },
        secondary: { label: "Download for desktop", href: "/download" }
      }).value}
    `;
  },

  mount(root) {
    /* The plans are static; nothing to wire up beyond the shared reveal. */
    void root;
  }
};
