/* ============================================================
   FOOTER — sitemap, status, legal, and the outlined wordmark
   ============================================================ */

import { FOOTER, LEGAL_LINKS, COMPANY } from "../data/site.js";

export function renderFooter() {
  const year = new Date().getFullYear();
  return `
    <footer class="site-footer">
      <div class="shell shell-wide">
        <div class="footer-top">
          <div>
            <a class="brand" href="/" aria-label="Mere X home" style="font-size:clamp(1.1rem,0.8vw+0.8rem,1.5rem)">
              <span>MERE X</span><span class="brand-deg" aria-hidden="true">˚</span>
            </a>
            <p class="footer-mission">${COMPANY.mission}</p>
            <a class="badge" href="/status" style="margin-top:20px;gap:8px">
              <span class="dot dot-live"></span> All systems operational
            </a>
          </div>
          ${FOOTER.map((col) => `
            <div class="footer-col">
              <p class="footer-col-title">${col.title}</p>
              ${col.links.map((link) => `<a href="${link.href}">${link.label}</a>`).join("")}
            </div>`).join("")}
        </div>

        <div class="footer-word" aria-hidden="true">Mere X</div>

        <div class="footer-bottom">
          <span>Mere X © ${year} — Future Forward Intelligence</span>
          <div class="row row-tight">
            ${LEGAL_LINKS.map((link) => `<a href="${link.href}" class="link-plain">${link.label}</a>`).join('<span class="nav-sep" aria-hidden="true">|</span>')}
          </div>
        </div>
      </div>
    </footer>`;
}
