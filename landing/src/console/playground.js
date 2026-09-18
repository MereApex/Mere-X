/* ============================================================
   CONSOLE — live workspace handoff
   ============================================================ */

import { getState } from "../lib/store.js";
import { icon } from "../lib/icons.js";
import { consoleShell, panel } from "./shell.js";
import { codeBlock } from "../components/ui.js";

export default {
  title: "Playground",
  description: "Open the authenticated Mere X Studio or use a scoped API key.",

  render() {
    const state = getState();
    const body = `
      <div class="grid g-2" style="gap:16px;align-items:start">
        ${panel({
          title: "Mere X Studio",
          desc: "Run real conversations with your account, projects, files, tools, and Live Voice.",
          body: `
            <div class="stack stack-4">
              <p class="small muted">Studio uses your authenticated account and stores its state in the Mere X database.</p>
              <a class="btn btn-primary" href="/app">${icon("play", "icon").value}<span>Open Mere X</span></a>
            </div>`
        }).value}

        ${panel({
          title: "API access",
          desc: `${state.keys.filter((key) => key.status === "active").length} active key${state.keys.filter((key) => key.status === "active").length === 1 ? "" : "s"}`,
          body: `
            <div class="stack stack-4">
              ${codeBlock({
                cURL: `curl https://api.merex.ai/v1/messages \\
  -H "x-api-key: $MERE_X_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{"model":"mere-orion-3","messages":[{"role":"user","content":"Hello"}]}'`
              }).value}
              <a class="btn btn-secondary btn-sm" href="/console/keys">${icon("key", "icon").value}<span>Manage API keys</span></a>
            </div>`
        }).value}
      </div>`;

    return consoleShell({
      active: "/console/playground",
      title: "Playground",
      sub: "Real account access only — no simulated responses or sample usage.",
      body
    });
  }
};
