import { pageHead, button } from "../components/ui.js";
import { icon } from "../lib/icons.js";

export default {
  title: "Page not found",
  description: "That page does not exist on merex.ai.",
  render(ctx) {
    return `
      ${pageHead({
        eyebrow: "404",
        title: "That page is not here.",
        lead: `Nothing is published at <code class="inline">${ctx.path}</code>. It may have moved, or it may never have existed.`
      }).value}
      <section class="section">
        <div class="shell">
          <div class="grid g-auto" data-stagger="80">
            ${[
              { icon: "download", title: "Download for desktop", body: "Mere Code with a real terminal and git, on your computer.", href: "/download" },
              { icon: "orbit", title: "The Mere X family", body: "Every model, with specs and pricing side by side.", href: "/technology" },
              { icon: "card", title: "Pricing", body: "Plans for people who ship every day.", href: "/pricing" },
              { icon: "search", title: "Search", body: "Look across the whole site.", href: "/search" }
            ].map((item) => `
              <a class="card card-hover card-spot" href="${item.href}" data-reveal>
                <div class="card-icon">${icon(item.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${item.title}</h3>
                <p class="small muted">${item.body}</p>
              </a>`).join("")}
          </div>
          <div class="row" style="margin-top:34px">
            ${button({ label: "Back to home", href: "/", icon: "arrow-right" }).value}
          </div>
        </div>
      </section>`;
  }
};
