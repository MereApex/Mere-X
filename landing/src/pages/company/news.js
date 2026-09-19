/* ============================================================
   COMPANY — news
   ============================================================ */

import { NEWS } from "../../data/content.js";
import { COMPANY } from "../../data/site.js";
import { icon } from "../../lib/icons.js";
import { dateFull } from "../../lib/format.js";
import { pageHead, sectionHead, textLink, button, ctaBand, entryList, calloutBox } from "../../components/ui.js";

const KINDS = ["All", "Product", "Research", "Safety", "Company"];

export default {
  title: "News",
  description: "Announcements, product releases, and press from Mere X.",

  render() {
    const [lead, ...rest] = NEWS;

    return `
      ${pageHead({
        crumb: [{ label: "Company", href: "/company" }, { label: "News" }],
        eyebrow: "Newsroom",
        title: "What we have announced.",
        lead: "Product releases, research results, safety publications, and company news. Press enquiries go to the address at the bottom of this page.",
        actions: `${button({ label: "Changelog", href: "/changelog", variant: "secondary", icon: "list" }).value}
                  ${button({ label: "Press kit", href: "#press", variant: "ghost", icon: "download" }).value}`
      }).value}

      <!-- ---- Featured ---- -->
      <section class="section-tight">
        <div class="shell shell-wide">
          <a class="panel-dark" href="/technology" data-reveal style="display:block">
            <div class="split split-60" style="gap:clamp(28px,4vw,56px);align-items:center">
              <div>
                <div class="row row-tight">
                  <span class="badge" style="background:rgba(255,255,255,.12);color:#fff;border-color:transparent">${lead.kind}</span>
                  <span class="xs" style="color:rgba(255,255,255,.5)">${dateFull(lead.date)}</span>
                </div>
                <h2 style="margin-top:18px;font-size:var(--t-h2);max-width:16ch">${lead.title}</h2>
                <p style="margin-top:18px;color:rgba(255,255,255,.66);line-height:1.68;max-width:50ch">${lead.summary}</p>
                <span class="link" style="color:#fff;margin-top:26px"><span>Read more</span>${icon("arrow-ne", "icon").value}</span>
              </div>
              <div class="grid g-2" style="gap:12px">
                ${[["1M", "Token context"], ["4", "Reasoning modes"], ["7", "Models"], ["50%", "Batch discount"]].map(([v, l]) => `
                  <div style="padding:20px;border:1px solid rgba(255,255,255,.14);border-radius:var(--r-md)">
                    <div style="font-size:1.6rem;font-weight:300;letter-spacing:-.03em">${v}</div>
                    <div class="xs" style="color:rgba(255,255,255,.5);margin-top:3px">${l}</div>
                  </div>`).join("")}
              </div>
            </div>
          </a>
        </div>
      </section>

      <!-- ---- List ---- -->
      <section class="section">
        <div class="shell shell-wide">
          <div class="row row-tight" data-kind-filter data-reveal style="margin-bottom:22px">
            ${KINDS.map((kind, i) => `<button class="btn ${i === 0 ? "btn-secondary" : "btn-ghost"} btn-sm" data-kind="${kind}">${kind}</button>`).join("")}
          </div>

          <div class="entry-list" data-news-list>
            ${NEWS.map((item) => `
              <a class="entry" href="#" data-news data-kind-value="${item.kind}">
                <div class="entry-meta">${dateFull(item.date)}<br><span style="color:var(--faint)">${item.kind}</span></div>
                <div>
                  <h3 class="entry-title">${item.title}</h3>
                  <p class="entry-desc">${item.summary}</p>
                </div>
                <span class="entry-arrow">${icon("arrow-ne").value}</span>
              </a>`).join("")}
          </div>
          <div class="empty" data-empty hidden style="margin-top:24px">${icon("search").value}<p>Nothing in that category yet.</p></div>
        </div>
      </section>

      <!-- ---- Press ---- -->
      <section class="section section-line" id="press">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Press",
            title: "For journalists.",
            lead: "Logos, product screenshots, executive headshots, and a company fact sheet."
          }).value}
          <div class="grid g-3" data-stagger="70">
            ${[
              { icon: "download", t: "Brand assets", d: "Logo files in SVG and PNG, in light and dark variants, with clear-space rules." },
              { icon: "image", t: "Product imagery", d: "Screenshots of Mere Studio and the console at press resolution." },
              { icon: "file", t: "Fact sheet", d: "Founding date, headcount, offices, funding, and product timeline in one page." },
              { icon: "users", t: "Executive bios", d: "Headshots and approved biographies for the leadership team." },
              { icon: "book", t: "Research summaries", d: "Plain-language summaries of our published work, written for non-specialists." },
              { icon: "mail", t: "Media enquiries", d: `Write to ${COMPANY.press}. We aim to respond within one business day.` }
            ].map((item) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(item.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${item.t}</h3>
                <p class="small muted" style="line-height:1.6">${item.d}</p>
              </div>`).join("")}
          </div>
          <div style="margin-top:26px;max-width:76ch">
            ${calloutBox(`We will not review a story before publication, and we do not offer exclusives in exchange for framing. We will fact-check anything you send us, quickly and without conditions. Write to <a class="link-plain" href="mailto:${COMPANY.press}">${COMPANY.press}</a>.`, { icon: "news" }).value}
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Follow what ships.",
        body: "The changelog covers every model and product change.",
        primary: { label: "Read the changelog", href: "/changelog", icon: "arrow-ne" },
        secondary: { label: "Contact us", href: "/company/contact" }
      }).value}
    `;
  },

  mount(root) {
    const items = Array.from(root.querySelectorAll("[data-news]"));
    const empty = root.querySelector("[data-empty]");

    root.querySelector("[data-kind-filter]")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-kind]");
      if (!btn) return;
      const kind = btn.dataset.kind;
      root.querySelectorAll("[data-kind]").forEach((node) => {
        node.classList.toggle("btn-secondary", node === btn);
        node.classList.toggle("btn-ghost", node !== btn);
      });
      let visible = 0;
      items.forEach((item) => {
        const show = kind === "All" || item.dataset.kindValue === kind;
        item.style.display = show ? "" : "none";
        if (show) visible += 1;
      });
      empty.hidden = visible > 0;
    });
  }
};
