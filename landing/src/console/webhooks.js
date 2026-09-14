/* ============================================================
   CONSOLE — database-backed webhook endpoints
   ============================================================ */

import { getState, addWebhook, removeWebhook } from "../lib/store.js";
import { icon } from "../lib/icons.js";
import { dateShort } from "../lib/format.js";
import { copyText, escapeHtml } from "../lib/dom.js";
import { toast, modal } from "../lib/toast.js";
import { consoleShell, panel, metric } from "./shell.js";
import { refresh } from "../lib/router.js";

const EVENTS = [
  ["batch.completed", "Batch completed"],
  ["batch.failed", "Batch failed"],
  ["usage.threshold", "Usage threshold"],
  ["key.created", "API key created"],
  ["key.revoked", "API key revoked"],
  ["limit.reached", "Limit reached"],
  ["file.processed", "File processed"]
];

function webhookRow(webhook) {
  const events = Array.isArray(webhook.events) ? webhook.events : [];
  return `
    <div class="key-row" data-webhook="${escapeHtml(webhook.id)}">
      <span class="key-icon">${icon("webhook").value}</span>
      <div style="min-width:0;flex:1 1 320px">
        <div class="key-name" style="overflow-wrap:anywhere">${escapeHtml(webhook.url)}</div>
        <div class="row row-tight" style="margin-top:7px">
          ${events.map((event) => `<span class="badge badge-plain mono">${escapeHtml(event)}</span>`).join("")}
        </div>
      </div>
      <div class="key-meta" style="text-align:right">
        <div>${escapeHtml(webhook.status || "active")}</div>
        <div style="margin-top:2px">Created ${dateShort(webhook.created)}</div>
      </div>
      <div class="key-actions">
        <button class="icon-btn" data-copy-url title="Copy endpoint">${icon("copy").value}</button>
        <button class="icon-btn" data-remove title="Remove endpoint">${icon("trash").value}</button>
      </div>
    </div>`;
}

export default {
  title: "Webhooks",
  description: "Store and manage authenticated HTTPS event destinations.",

  render() {
    const state = getState();
    const active = state.webhooks.filter((webhook) => webhook.status === "active");
    const delivered = state.webhooks.reduce((sum, webhook) => sum + Number(webhook.delivered || 0), 0);
    const failed = state.webhooks.reduce((sum, webhook) => sum + Number(webhook.failed || 0), 0);
    const body = `
      <div class="metrics" style="margin-bottom:16px">
        ${metric({ label: "Active endpoints", value: String(active.length) }).value}
        ${metric({ label: "Recorded deliveries", value: String(delivered) }).value}
        ${metric({ label: "Recorded failures", value: String(failed) }).value}
      </div>

      ${panel({
        title: "Endpoints",
        desc: "Only public HTTPS destinations are accepted. Signing secrets are shown once.",
        actions: `<button class="btn btn-primary btn-sm" data-new-webhook>${icon("plus", "icon").value}<span>Add endpoint</span></button>`,
        flush: true,
        body: state.webhooks.length
          ? state.webhooks.map(webhookRow).join("")
          : `<div class="empty" style="border:0">${icon("webhook").value}<p>No webhook endpoints have been added.</p></div>`
      }).value}`;

    return consoleShell({
      active: "/console/webhooks",
      title: "Webhooks",
      sub: `${state.org.name} · database-backed endpoint configuration`,
      body
    });
  },

  mount(root) {
    root.addEventListener("click", async (event) => {
      if (event.target.closest("[data-new-webhook]")) {
        const choice = await modal({
          title: "Add a webhook endpoint",
          body: `
            <div class="stack stack-4">
              <div class="field">
                <label class="field-label" for="webhook-url">HTTPS endpoint</label>
                <input class="input" id="webhook-url" type="url" inputmode="url" autocomplete="url" placeholder="https://example.com/mere-x/events">
              </div>
              <div class="field">
                <span class="field-label">Events</span>
                <div class="stack stack-2" style="margin-top:6px">
                  ${EVENTS.map(([value, label], index) => `
                    <label class="row row-top" style="flex-wrap:nowrap;gap:10px;cursor:pointer">
                      <input type="checkbox" value="${value}"${index < 2 ? " checked" : ""}>
                      <span class="small">${label}</span>
                    </label>`).join("")}
                </div>
              </div>
            </div>`,
          actions: [
            { label: "Cancel", value: "cancel", class: "btn-ghost" },
            { label: "Add endpoint", value: "create", class: "btn-primary" }
          ],
          collect: (dialog) => ({
            url: dialog.querySelector("#webhook-url").value.trim(),
            events: Array.from(dialog.querySelectorAll('input[type="checkbox"]:checked')).map((node) => node.value)
          })
        });
        if (choice.action !== "create") return;
        if (!choice.data.url || !choice.data.events.length) return toast("Enter an HTTPS endpoint and select at least one event", { icon: "alert" });
        try {
          const created = await addWebhook(choice.data.url, choice.data.events);
          const secretAction = await modal({
            title: "Save the signing secret",
            body: `<p class="small ink-3" style="margin-bottom:16px">This secret is shown once. Store it in your server's secret manager.</p><div class="secret-reveal" id="webhook-secret">${escapeHtml(created.secret || "")}</div>`,
            actions: [
              { label: "I've saved it", value: "done", class: "btn-ghost" },
              { label: "Copy secret", value: "copy", class: "btn-primary" }
            ]
          });
          if (secretAction === "copy") {
            const copied = await copyText(created.secret || "");
            toast(copied ? "Signing secret copied" : "Could not copy — select the secret manually", { icon: copied ? "check" : "alert" });
          } else {
            toast("Webhook endpoint added", { icon: "check" });
          }
          refresh();
        } catch (error) {
          toast(error.message, { icon: "alert" });
        }
        return;
      }

      const row = event.target.closest("[data-webhook]");
      if (!row) return;
      const webhook = getState().webhooks.find((item) => item.id === row.dataset.webhook);
      if (!webhook) return;

      if (event.target.closest("[data-copy-url]")) {
        const copied = await copyText(webhook.url);
        toast(copied ? "Endpoint copied" : "Could not copy", { icon: copied ? "check" : "alert" });
        return;
      }

      if (event.target.closest("[data-remove]")) {
        const action = await modal({
          title: "Remove webhook endpoint?",
          body: `<p class="small ink-3">Mere X will stop sending events to <strong>${escapeHtml(webhook.url)}</strong>.</p>`,
          actions: [
            { label: "Cancel", value: "cancel", class: "btn-ghost" },
            { label: "Remove", value: "remove", class: "btn-danger" }
          ]
        });
        if (action !== "remove") return;
        try {
          await removeWebhook(webhook.id);
          toast("Webhook endpoint removed", { icon: "check" });
          refresh();
        } catch (error) {
          toast(error.message, { icon: "alert" });
        }
      }
    });
  }
};
