/* ============================================================
   FOOTER — sitemap, status pill, legal, oversized wordmark
   ============================================================ */

import { FOOTER, LEGAL_LINKS, COMPANY } from "../data/site.js";
import { icon, mereXMark, mereXWordmark } from "../lib/icons.js";

export function renderFooter() {
  const year = new Date().getFullYear();
  return `
    <footer class="site-footer">
      <div class="shell shell-wide">
        <div class="footer-top">
          <div>
            <a class="brand" href="/" style="margin-bottom:18px">
              <span class="brand-mark">${mereXMark(30).value}</span><span class="brand-word">${mereXWordmark(15).value}</span><span class="sr-only">Mere X</span>
            </a>
            <p class="small muted measure-sm" style="max-width:34ch">${COMPANY.mission}</p>
            <a class="badge badge-plain" href="/status" style="margin-top:20px;gap:8px">
              <span class="dot dot-live"></span> All systems operational
            </a>
            <div class="row row-tight" style="margin-top:22px">
              <a class="icon-btn" href="/company/contact" aria-label="Contact">${icon("mail").value}</a>
              <a class="icon-btn" href="/changelog" aria-label="Changelog">${icon("list").value}</a>
              <a class="icon-btn" href="/docs" aria-label="Documentation">${icon("book").value}</a>
              <a class="icon-btn" href="/console" aria-label="Console">${icon("terminal").value}</a>
            </div>
          </div>
          ${FOOTER.map((col) => `
            <div class="footer-col">
              <p class="footer-col-title">${col.title}</p>
              ${col.links.map((link) => `<a href="${link.href}">${link.label}</a>`).join("")}
            </div>`).join("")}
        </div>

        <div class="footer-word" aria-hidden="true">Mere X</div>

        <div class="footer-bottom">
          <span>© ${year} ${COMPANY.name}, PBC · ${COMPANY.hq}</span>
          <div class="row row-tight">
            ${LEGAL_LINKS.map((link) => `<a href="${link.href}" class="link-plain">${link.label}</a>`).join('<span class="nav-sep"></span>')}
          </div>
        </div>
      </div>
    </footer>`;
}
