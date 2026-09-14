/* ============================================================
   CONSOLE — account-backed settings
   ============================================================ */

import { getState } from "../lib/store.js";
import { icon } from "../lib/icons.js";
import { toast } from "../lib/toast.js";
import { consoleShell, panel } from "./shell.js";
import { escapeHtml } from "../lib/dom.js";

export default {
  title: "Settings",
  description: "Account, Studio, security, and API version information.",

  render() {
    const state = getState();
    const initials = state.user.name.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2);
    const body = `
      <div class="grid" style="grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:16px;align-items:start" data-settings-grid>
        <div class="stack stack-4">
          ${panel({
            title: "Your account",
            desc: "The identity currently authorised to use this console",
            flush: true,
            body: `
              <div class="setting-row">
                <div class="row" style="gap:12px">
                  <span class="avatar">${initials}</span>
                  <div>
                    <div class="setting-label">${escapeHtml(state.user.name)}</div>
                    <div class="setting-desc">${escapeHtml(state.user.email)} · ${escapeHtml(state.user.role)}</div>
                  </div>
                </div>
                <a class="btn btn-ghost btn-sm" href="/app">Open Studio</a>
              </div>
              <div class="setting-row">
                <div><div class="setting-label">Session security</div><div class="setting-desc">Protected by an HttpOnly, same-site account session.</div></div>
                <span class="badge badge-positive">active</span>
              </div>`
          }).value}

          ${panel({
            title: "Studio",
            desc: "Stored in the Mere X database",
            flush: true,
            body: [
              ["Studio", state.org.name],
              ["Organisation ID", state.org.id],
              ["Plan", state.org.plan],
              ["Region", state.org.region]
            ].map(([label, value]) => `
              <div class="setting-row">
                <div class="setting-label">${label}</div>
              <code class="mono small">${escapeHtml(value)}</code>
              </div>`).join("")
          }).value}
        </div>

        <div class="stack stack-4">
          ${panel({
            title: "Appearance",
            body: `
              <div class="setting-row" style="padding:0">
                <div><div class="setting-label">Theme</div><div class="setting-desc">Switch between light and dark console themes.</div></div>
                <button class="btn btn-ghost btn-sm" data-theme-jump>${icon("sun", "icon").value}<span>Switch</span></button>
              </div>`
          }).value}

        </div>
      </div>`;

    return consoleShell({
      active: "/console/settings",
      title: "Settings",
      sub: `${state.org.name} · account-backed console`,
      body
    });
  },

  mount(root) {
    const grid = root.querySelector("[data-settings-grid]");
    const apply = () => {
      if (grid) grid.style.gridTemplateColumns = window.innerWidth < 980 ? "minmax(0,1fr)" : "minmax(0,1.35fr) minmax(0,1fr)";
    };
    apply();
    window.addEventListener("resize", apply, { passive: true });
    import("../lib/router.js").then(({ onLeave }) => onLeave(() => window.removeEventListener("resize", apply)));
    root.querySelector("[data-theme-jump]")?.addEventListener("click", () => {
      document.querySelector("[data-theme-toggle]")?.click();
      toast("Theme updated");
    });
  }
};
