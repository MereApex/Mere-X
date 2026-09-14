/* ============================================================
   CONSOLE — database-backed workspace identity and audit
   ============================================================ */

import { getState } from "../lib/store.js";
import { icon } from "../lib/icons.js";
import { dateShort, nf } from "../lib/format.js";
import { copyText, escapeHtml } from "../lib/dom.js";
import { toast } from "../lib/toast.js";
import { consoleShell, panel, metric } from "./shell.js";
import { dataTable } from "../components/ui.js";

export default {
  title: "Organisation",
  description: "The members, identifiers, and administrative events stored for this Studio.",

  render() {
    const state = getState();
    const active = state.members.filter((member) => member.status === "active");
    const auditBody = state.audit.length
      ? dataTable({
          columns: [
            { key: "at", label: "When", render: (row) => dateShort(row.at) },
            { key: "actor", label: "Actor", render: (row) => `<code class="mono small">${escapeHtml(row.actor)}</code>` },
            { key: "action", label: "Action", render: (row) => `<span class="badge badge-plain mono" style="font-size:10px">${escapeHtml(row.action)}</span>` },
            { key: "target", label: "Detail" }
          ],
          rows: state.audit
        }).value
      : `<div class="empty" style="border:0">${icon("list").value}<p>No administrative events recorded yet.</p></div>`;

    const body = `
      <div class="metrics" style="margin-bottom:16px">
        ${metric({ label: "Active members", value: nf(active.length) }).value}
        ${metric({ label: "Plan", value: state.org.plan }).value}
        ${metric({ label: "Region", value: state.org.region }).value}
        ${metric({ label: "Created", value: dateShort(state.org.created) }).value}
      </div>

      <div class="stack stack-4">
        ${panel({
          title: "Members",
          desc: "Accounts currently stored for this Studio",
          flush: true,
          body: active.map((member) => {
            const initials = member.name.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2);
            return `
              <div class="key-row">
                <span class="avatar">${escapeHtml(initials)}</span>
                <div style="min-width:0;flex:1 1 220px">
                  <div class="key-name">${escapeHtml(member.name)}</div>
                  <div class="key-value" style="font-family:var(--font-ui);font-size:var(--t-2xs)">${escapeHtml(member.email)}</div>
                </div>
                <span class="badge badge-plain">${escapeHtml(member.role)}</span>
                <div class="key-meta" style="min-width:110px;text-align:right">Added ${dateShort(member.added)}</div>
              </div>`;
          }).join("")
        }).value}

        ${panel({
          title: "Administrative activity",
          desc: "Key, webhook, and preference changes stored in the database",
          body: auditBody
        }).value}

        ${panel({
          title: "Studio identifiers",
          flush: true,
          body: [
            ["Organisation ID", state.org.id],
            ["Name", state.org.name],
            ["Region", state.org.region],
            ["Plan", state.org.plan]
          ].map(([label, value]) => `
            <div class="setting-row">
              <div class="setting-label">${label}</div>
              <div class="row row-tight">
                <code class="mono small">${escapeHtml(value)}</code>
                <button class="icon-btn" data-copy="${escapeHtml(value)}" title="Copy" style="width:28px;height:28px;flex-basis:28px">${icon("copy").value}</button>
              </div>
            </div>`).join("")
        }).value}
      </div>`;

    return consoleShell({
      active: "/console/organization",
      title: state.org.name,
      sub: `${state.org.id} · ${state.org.plan}`,
      body
    });
  },

  mount(root) {
    root.addEventListener("click", async (event) => {
      const copy = event.target.closest("[data-copy]");
      if (!copy) return;
      const ok = await copyText(copy.dataset.copy);
      toast(ok ? "Copied" : "Could not copy", { icon: ok ? "check" : "alert" });
    });
  }
};
