/* ============================================================
   NAV — sticky header with mega-menus, mobile drawer,
   theme toggle, and command palette entry point.
   ============================================================ */

import { NAV } from "../data/site.js";
import { icon, mereXMark, mereXWordmark } from "../lib/icons.js";
import { onNavigate, navigate } from "../lib/router.js";

function panel(group) {
  return `
    <div class="nav-panel ${group.panelWide ? "nav-panel-wide" : ""}" role="menu">
      <div class="nav-panel-grid">
        ${group.links.map((link) => `
          <a class="nav-link" href="${link.href}" role="menuitem">
            <span class="nav-link-icon">${icon(link.icon).value}</span>
            <span>
              <span class="nav-link-title">${link.title}</span>
              <span class="nav-link-desc" style="display:block">${link.desc}</span>
            </span>
          </a>`).join("")}
      </div>
      <div class="nav-panel-foot">
        <span class="xs muted">${group.footNote || "Everything in " + group.label}</span>
        <a class="link" href="${group.href}"><span>Overview</span>${icon("arrow-ne", "icon").value}</a>
      </div>
    </div>`;
}

export function renderNav() {
  return `
    <header class="site-nav" id="siteNav">
      <div class="nav-inner">
        <a class="brand" href="/" aria-label="Mere X home">
          <span class="brand-mark">${mereXMark(32).value}</span><span class="brand-word">${mereXWordmark(16).value}</span><span class="sr-only">Mere X</span>
        </a>

        <nav class="nav-links" aria-label="Main">
          ${NAV.map((group, index) => `
            ${index ? '<span class="nav-sep" aria-hidden="true"></span>' : ""}
            <div class="nav-item" data-nav-item="${group.id}">
              <a class="nav-trigger" href="${group.href}" aria-haspopup="true" aria-expanded="false">
                ${group.label}${icon("chevron-down", "icon").value}
              </a>
              ${panel(group)}
            </div>`).join("")}
        </nav>

        <div class="nav-actions">
          <button class="icon-btn" data-search-open title="Search  ⌘K" aria-label="Search">${icon("search").value}</button>
          <button class="icon-btn" data-theme-toggle aria-label="Switch theme">${icon("moon").value}</button>
          <a class="btn btn-ghost btn-sm" href="/console" data-console-link>Developers</a>
          <a class="nav-cta" href="/app">
            <span>Try Mere X</span>${icon("arrow-ne", "icon").value}
          </a>
          <button class="icon-btn nav-burger" data-burger aria-label="Open menu" aria-expanded="false">${icon("menu").value}</button>
        </div>
      </div>
    </header>

    <div class="nav-drawer" id="navDrawer" aria-hidden="true">
      <div class="nav-drawer-head">
        <a class="brand" href="/"><span class="brand-mark">${mereXMark(32).value}</span><span class="brand-word">${mereXWordmark(16).value}</span><span class="sr-only">Mere X</span></a>
        <span class="spacer"></span>
        <button class="icon-btn" data-drawer-close aria-label="Close menu">${icon("close").value}</button>
      </div>
      <div class="nav-drawer-body">
        ${NAV.map((group) => `
          <div class="drawer-group" data-drawer-group>
            <button class="drawer-group-head" type="button">${group.label}${icon("chevron-down", "icon").value}</button>
            <div class="drawer-links"><div>
              ${group.links.map((link) => `<a href="${link.href}">${link.title}</a>`).join("")}
            </div></div>
          </div>`).join("")}
        <div class="row" style="margin-top:28px;gap:10px">
          <a class="btn btn-primary btn-block" href="/console">Developer console</a>
          <a class="btn btn-secondary btn-block" href="/app">Try Mere X</a>
        </div>
      </div>
    </div>`;
}

export function mountNav(root) {
  const nav = root.querySelector("#siteNav");
  const drawer = root.querySelector("#navDrawer");
  const items = Array.from(root.querySelectorAll("[data-nav-item]"));
  let openTimer = null;
  let closeTimer = null;

  /* --- sticky state --- */
  const onScroll = () => nav.classList.toggle("is-stuck", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* --- mega menus: hover on fine pointers, click elsewhere --- */
  const closeAll = () => items.forEach((item) => {
    item.classList.remove("is-open");
    item.querySelector(".nav-trigger")?.setAttribute("aria-expanded", "false");
  });

  const open = (item) => {
    closeAll();
    item.classList.add("is-open");
    item.querySelector(".nav-trigger")?.setAttribute("aria-expanded", "true");
  };

  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  items.forEach((item) => {
    if (fine) {
      item.addEventListener("pointerenter", () => {
        clearTimeout(closeTimer);
        openTimer = setTimeout(() => open(item), 60);
      });
      item.addEventListener("pointerleave", () => {
        clearTimeout(openTimer);
        closeTimer = setTimeout(closeAll, 140);
      });
    }
    item.querySelector(".nav-trigger").addEventListener("click", (event) => {
      if (!fine) {
        event.preventDefault();
        const isOpen = item.classList.contains("is-open");
        closeAll();
        if (!isOpen) open(item);
      }
    });
  });

  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeAll(); });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-nav-item]")) closeAll();
  });

  /* --- drawer --- */
  const setDrawer = (state) => {
    drawer.classList.toggle("is-open", state);
    drawer.setAttribute("aria-hidden", String(!state));
    document.body.style.overflow = state ? "hidden" : "";
    root.querySelector("[data-burger]")?.setAttribute("aria-expanded", String(state));
  };
  root.querySelector("[data-burger]")?.addEventListener("click", () => setDrawer(true));
  root.querySelector("[data-drawer-close]")?.addEventListener("click", () => setDrawer(false));
  drawer.addEventListener("click", (event) => {
    const head = event.target.closest(".drawer-group-head");
    if (head) { head.parentElement.classList.toggle("is-open"); return; }
    if (event.target.closest("a")) setDrawer(false);
  });

  /* --- theme --- */
  const themeButton = root.querySelector("[data-theme-toggle]");
  const paintThemeIcon = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    themeButton.innerHTML = icon(dark ? "sun" : "moon").value;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0d0d0b" : "#f6f3ec");
  };
  paintThemeIcon();
  themeButton.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.dataset.themePreference = next;
    try { localStorage.setItem("mere-x.theme", next); } catch { /* session-only theme is fine */ }
    paintThemeIcon();
  });

  /* --- active section highlight --- */
  const markActive = (ctx) => {
    const path = (ctx && ctx.path) || location.pathname;
    items.forEach((item) => {
      const group = NAV.find((g) => g.id === item.dataset.navItem);
      const active = group.links.some((link) => path === link.href || (link.href !== "/" && path.startsWith(`${link.href}/`)))
        || path === group.href
        || (group.href !== "/" && path.startsWith(`${group.href}/`));
      item.classList.toggle("is-active", Boolean(active));
    });
    root.querySelector("[data-console-link]")?.classList.toggle("btn-primary", path.startsWith("/console"));
  };
  markActive();
  onNavigate(markActive);

  /* --- search shortcut --- */
  const openSearch = () => navigate("/search");
  root.querySelector("[data-search-open]")?.addEventListener("click", openSearch);
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
    }
  });
}
