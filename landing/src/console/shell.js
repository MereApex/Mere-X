/* ============================================================
   CONSOLE SHELL — the rail, header, and shared chrome
   ============================================================ */

import { getState } from "../lib/store.js";
import { icon } from "../lib/icons.js";
import { raw, escapeHtml } from "../lib/dom.js";

export const RAIL = [
  {
    title: "Build",
    links: [
      { href: "/console", label: "Dashboard", icon: "grid" },
      { href: "/console/playground", label: "Playground", icon: "play" },
      { href: "/console/keys", label: "API keys", icon: "key" }
    ]
  },
  {
    title: "Observe",
    links: [
      { href: "/console/usage", label: "Usage", icon: "chart" },
      { href: "/console/logs", label: "Request logs", icon: "list" },
      { href: "/console/limits", label: "Rate limits", icon: "gauge" }
    ]
  },
  {
    title: "Manage",
    links: [
      { href: "/console/billing", label: "Billing", icon: "card" },
      { href: "/console/webhooks", label: "Webhooks", icon: "webhook" },
      { href: "/console/organization", label: "Organisation", icon: "users" },
      { href: "/console/settings", label: "Settings", icon: "settings" }
    ]
  }
];

function rail(active) {
  const state = getState();
  const initials = state.org.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return `
    <aside class="console-rail">
      <button class="rail-org" type="button">
        <span class="rail-org-mark">${escapeHtml(initials)}</span>
        <span style="min-width:0;text-align:left">
          <span class="rail-org-name" style="display:block">${escapeHtml(state.org.name)}</span>
          <span class="rail-org-plan" style="display:block">${escapeHtml(state.org.plan)} · ${escapeHtml(state.limits.tier)}</span>
        </span>
        <span class="spacer"></span>
        ${icon("chevron-down", "icon").value}
      </button>

      ${RAIL.map((group) => `
        <p class="rail-title">${group.title}</p>
        ${group.links.map((link) => `
          <a class="rail-link ${link.href === active ? "is-active" : ""}" href="${link.href}">
            ${icon(link.icon).value}<span>${link.label}</span>
            ${link.href === "/console/keys" ? `<span class="rail-count">${state.keys.filter((k) => k.status === "active").length}</span>` : ""}
          </a>`).join("")}`).join("")}

      <div class="rail-foot">
        <a class="rail-link" href="/docs">${icon("book").value}<span>Documentation</span></a>
        <a class="rail-link" href="/support">${icon("help").value}<span>Support</span></a>
      </div>
    </aside>`;
}

/**
 * Wrap a console page body in the shared shell.
 * `head` is the title block; `body` is the page content.
 */
export function consoleShell({ active, title, sub, actions, body }) {
  return `
    <div class="console">
      ${rail(active)}
      <div class="console-main">
        <div class="console-head">
          <div>
            <h1 class="console-title">${escapeHtml(title)}</h1>
            ${sub ? `<p class="console-sub">${escapeHtml(sub)}</p>` : ""}
          </div>
          ${actions ? `<div class="row row-tight">${actions}</div>` : ""}
        </div>
        ${body}
      </div>
    </div>`;
}

/** A small panel wrapper used across console pages. */
export function panel({ title, desc, actions, body, foot, flush = false }) {
  return raw(`
    <section class="panel" data-reveal>
      ${title ? `<div class="panel-head">
        <div><div class="panel-title">${title}</div>${desc ? `<div class="panel-desc">${desc}</div>` : ""}</div>
        ${actions ? `<div class="row row-tight">${actions}</div>` : ""}
      </div>` : ""}
      <div class="panel-body ${flush ? "panel-body-flush" : ""}">${body}</div>
      ${foot ? `<div class="panel-foot">${foot}</div>` : ""}
    </section>`);
}

export function metric({ label, value, sub, delta, spark }) {
  const dir = delta == null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return raw(`
    <div class="metric" data-reveal>
      <span class="metric-label">${label}</span>
      <span class="metric-value">${value}${sub ? `<small>${sub}</small>` : ""}</span>
      ${dir ? `<span class="metric-delta ${dir}">${icon(dir === "up" ? "arrow-up" : dir === "down" ? "arrow-down" : "minus", "icon").value.replace('class="icon"', 'class="icon" style="width:11px;height:11px"')}${Math.abs(delta * 100).toFixed(1)}% vs previous period</span>` : ""}
      ${spark || ""}
    </div>`);
}
