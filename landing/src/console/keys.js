/* ============================================================
   CONSOLE — database-backed API credentials
   ============================================================ */

import {
  getState, createKey, revokeKey, deleteKey, renameKey,
  maskedKeyString, fullKeyString
} from "../lib/store.js";
import { icon } from "../lib/icons.js";
import { dateShort, relative } from "../lib/format.js";
import { copyText, escapeHtml } from "../lib/dom.js";
import { toast, modal } from "../lib/toast.js";
import { consoleShell, panel } from "./shell.js";
import { codeBlock } from "../components/ui.js";
import { refresh, onLeave } from "../lib/router.js";

const SCOPES = [
  { id: "messages", label: "Messages", desc: "Use the authenticated chat endpoint" },
  { id: "embeddings", label: "Embeddings", desc: "Create embeddings" },
  { id: "audio", label: "Audio", desc: "Transcribe, synthesise, and open realtime sessions" },
  { id: "files", label: "Files", desc: "Upload and access Studio files" },
  { id: "admin", label: "Admin", desc: "Use all currently available developer API endpoints" }
];

function keyRow(key) {
  const revoked = key.status === "revoked";
  return `
    <div class="key-row" data-key="${escapeHtml(key.id)}" style="${revoked ? "opacity:.55" : ""}">
      <span class="key-icon">${icon(revoked ? "lock" : "key").value}</span>
      <div style="min-width:0;flex:1 1 240px">
        <div class="key-name">
          ${escapeHtml(key.name)}
          <span class="badge badge-plain" style="margin-left:8px">${escapeHtml(key.env)}</span>
          ${revoked ? '<span class="badge badge-danger" style="margin-left:4px">revoked</span>' : ""}
        </div>
        <div class="key-value"><code>${escapeHtml(maskedKeyString(key))}</code></div>
      </div>
      <div class="key-meta" style="flex:0 0 auto;text-align:right">
        <div>${key.lastUsed ? `Used ${relative(key.lastUsed)}` : "Never used"}</div>
        <div style="margin-top:2px">Created ${dateShort(key.created)}</div>
      </div>
      <div class="key-actions">
        ${revoked
          ? `<button class="icon-btn" data-delete title="Delete permanently">${icon("trash").value}</button>`
          : `<button class="icon-btn" data-rename title="Rename">${icon("wand").value}</button>
             <button class="icon-btn" data-revoke title="Revoke">${icon("close").value}</button>`}
      </div>
    </div>`;
}

export default {
  title: "API keys",
  description: "Create, scope, use, and revoke Mere X API keys.",

  render() {
    const state = getState();
    const active = state.keys.filter((key) => key.status === "active");
    const revoked = state.keys.filter((key) => key.status === "revoked");
    const origin = location.origin;
    const body = `
      <div class="stack stack-4">
        ${panel({
          title: "Active keys",
          desc: `${active.length} key${active.length === 1 ? "" : "s"} · masked after creation`,
          actions: `<button class="btn btn-primary btn-sm" data-new-key>${icon("plus", "icon").value}<span>Create key</span></button>`,
          flush: true,
          body: active.length ? active.map(keyRow).join("") : `<div class="empty" style="border:0">${icon("key").value}<p>No active keys yet.</p></div>`
        }).value}

        ${revoked.length ? panel({
          title: "Revoked keys",
          desc: "Revoked credentials cannot authenticate future requests.",
          flush: true,
          body: revoked.map(keyRow).join("")
        }).value : ""}

        <div class="grid g-2" style="gap:16px;align-items:start">
          ${panel({
            title: "Authenticated request",
            desc: "This example targets the API running on the current Mere X host",
            body: codeBlock({
              Shell: `export MERE_X_API_KEY="merex-live-..."`,
              cURL: `curl ${origin}/api/chat \\
  -H "x-api-key: $MERE_X_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{"messages":[{"role":"user","text":"hello"}],
       "context":{"model":"orion"}}'`
            }).value
          }).value}

          ${panel({
            title: "Credential security",
            body: `
              <div class="stack stack-3">
                ${[
                  ["One key per service", "A compromised credential can then be revoked without affecting every integration."],
                  ["Use the narrowest scope", "The server rejects API-key requests that do not have the required endpoint scope."],
                  ["Store keys on the server", "Never ship a secret API key inside browser or mobile client code."],
                  ["Rotate exposed keys", "Create a replacement, update the service, and revoke the old credential."]
                ].map(([title, description]) => `
                  <div class="row row-top" style="flex-wrap:nowrap;gap:11px">
                    <span style="color:var(--ink);margin-top:2px">${icon("check", "icon").value}</span>
                    <span><strong style="font-weight:400;font-size:var(--t-sm)">${title}</strong><br><span class="xs muted">${description}</span></span>
                  </div>`).join("")}
              </div>`
          }).value}
        </div>
      </div>`;

    return consoleShell({
      active: "/console/keys",
      title: "API keys",
      sub: "Full secrets are shown once and only a keyed hash is stored in the database.",
      body
    });
  },

  mount(root) {
    const rerender = () => refresh();
    const copyNewKey = async (event) => {
      if (!event.target.closest("#copy-new-key")) return;
      const value = document.querySelector("#new-key-value")?.textContent?.trim() || "";
      const ok = await copyText(value);
      toast(ok ? "Key copied" : "Could not copy — select the key manually", { icon: ok ? "check" : "alert" });
    };
    document.addEventListener("click", copyNewKey);
    onLeave(() => document.removeEventListener("click", copyNewKey));

    root.addEventListener("click", async (event) => {
      if (event.target.closest("[data-new-key]")) {
        const choice = await modal({
          title: "Create an API key",
          body: `
            <div class="stack stack-4">
              <div class="field">
                <label class="field-label" for="k-name">Name</label>
                <input class="input" id="k-name" placeholder="e.g. production-service" autocomplete="off">
              </div>
              <div class="field">
                <label class="field-label" for="k-env">Environment</label>
                <select class="select" id="k-env"><option value="live">Live</option><option value="test">Test</option></select>
              </div>
              <div class="field">
                <span class="field-label">Scopes</span>
                <div class="stack stack-2" style="margin-top:4px">
                  ${SCOPES.map((scope) => `
                    <label class="row row-top" style="flex-wrap:nowrap;gap:10px;cursor:pointer">
                      <input type="checkbox" value="${scope.id}" ${scope.id === "messages" ? "checked" : ""} style="margin-top:4px">
                      <span><span class="small">${scope.label}</span><br><span class="xs muted">${scope.desc}</span></span>
                    </label>`).join("")}
                </div>
              </div>
            </div>`,
          actions: [
            { label: "Cancel", value: "cancel", class: "btn-ghost" },
            { label: "Create key", value: "create", class: "btn-primary" }
          ],
          collect: (dialog) => ({
            name: dialog.querySelector("#k-name").value.trim(),
            env: dialog.querySelector("#k-env").value,
            scopes: Array.from(dialog.querySelectorAll('input[type="checkbox"]:checked')).map((node) => node.value)
          })
        });
        if (choice.action !== "create") return;
        if (!choice.data.name) {
          toast("Give the key a name first", { icon: "alert" });
          return;
        }
        try {
          const created = await createKey({ ...choice.data, limitUsd: 0, scopes: choice.data.scopes.length ? choice.data.scopes : ["messages"] });
          await modal({
            title: "Copy your key now",
            body: `<p class="small ink-3" style="margin-bottom:16px">This is the only time the full key is shown. Store it in a secret manager.</p>
                   <div class="secret-reveal" id="new-key-value">${escapeHtml(fullKeyString(created))}</div>
                   <button class="btn btn-secondary btn-sm" id="copy-new-key" type="button" style="margin-top:14px">Copy to clipboard</button>`,
            actions: [{ label: "Done", value: "done", class: "btn-primary" }]
          });
          toast("API key created", { icon: "check" });
          rerender();
        } catch (error) {
          toast(error.message, { icon: "alert" });
        }
        return;
      }

      const row = event.target.closest("[data-key]");
      if (!row) return;
      const id = row.dataset.key;
      const key = getState().keys.find((item) => item.id === id);
      if (!key) return;

      if (event.target.closest("[data-rename]")) {
        const name = window.prompt("Rename key", key.name)?.trim();
        if (name) {
          try { await renameKey(id, name); toast("Key renamed"); rerender(); } catch (error) { toast(error.message, { icon: "alert" }); }
        }
        return;
      }

      if (event.target.closest("[data-revoke]")) {
        const choice = await modal({
          title: `Revoke “${escapeHtml(key.name)}”?`,
          body: '<p class="small ink-3">The key cannot be reactivated. Future requests using it will be rejected.</p>',
          actions: [{ label: "Cancel", value: "cancel", class: "btn-ghost" }, { label: "Revoke key", value: "revoke", class: "btn-danger" }]
        });
        if (choice === "revoke") {
          try { await revokeKey(id); toast("Key revoked", { icon: "check" }); rerender(); } catch (error) { toast(error.message, { icon: "alert" }); }
        }
        return;
      }

      if (event.target.closest("[data-delete]")) {
        const choice = await modal({
          title: "Delete permanently?",
          body: `<p class="small ink-3">This permanently removes the revoked credential record for <strong>${escapeHtml(key.name)}</strong>.</p>`,
          actions: [{ label: "Cancel", value: "cancel", class: "btn-ghost" }, { label: "Delete", value: "delete", class: "btn-danger" }]
        });
        if (choice === "delete") {
          try { await deleteKey(id); toast("Key deleted"); rerender(); } catch (error) { toast(error.message, { icon: "alert" }); }
        }
      }
    });
  }
};
