/* ============================================================
   CONNECTORS — the integration directory
   ============================================================ */

import { CONNECTORS } from "../../data/content.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, codeBlock, ctaBand, calloutBox } from "../../components/ui.js";

const BUILT_IN = [
  { icon: "file", t: "Documents", d: "Draft and edit long-form documents in canvas" },
  { icon: "download", t: "PDF", d: "Read, search, and export PDFs" },
  { icon: "chart", t: "Spreadsheets", d: "Build and analyse spreadsheets" },
  { icon: "grid", t: "Presentations", d: "Turn an outline into a deck" },
  { icon: "globe", t: "Web search", d: "Current sources with citations" },
  { icon: "terminal", t: "Code execution", d: "Run code in an isolated sandbox" }
];

export default {
  title: "Connectors",
  description: "Eighty tools Mere X can read from and act in — with per-scope permissions and a full audit trail.",

  render() {
    const total = CONNECTORS.reduce((sum, group) => sum + group.items.length, 0);

    return `
      ${pageHead({
        crumb: [{ label: "Products", href: "/products" }, { label: "Connectors" }],
        eyebrow: "Integrations",
        title: "Mere X can use the tools you already use.",
        lead: "Reading a thread, filing an issue, updating a record, pulling a report. Every connector grants permission per scope, every action is logged, and you can revoke any of it instantly.",
        actions: `${button({ label: "Browse the directory", href: "#directory", icon: "arrow-down" }).value}
                  ${button({ label: "Build your own", href: "/docs/tools", variant: "secondary", icon: "code" }).value}`,
        meta: `
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">${total}+</span><span class="stat-label">First-party connectors</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">MCP</span><span class="stat-label">Open connector spec</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">Per-scope</span><span class="stat-label">Permission model</span></div>`
      }).value}

      <!-- ---- Built in ---- -->
      <section class="section-tight">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Built in", title: "Six that need no setup." }).value}
          <div class="grid g-3" data-stagger="70">
            ${BUILT_IN.map((item) => `
              <div class="card card-hover card-spot card-pad-sm" data-reveal style="flex-direction:row;align-items:center;gap:14px">
                <div class="card-icon" style="width:36px;height:36px">${icon(item.icon).value}</div>
                <div>
                  <div style="font-size:var(--t-sm)">${item.t}</div>
                  <div class="xs muted">${item.d}</div>
                </div>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Directory ---- -->
      <section class="section section-line" id="directory">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Directory",
            title: `${total} connectors, eight categories.`,
            lead: "Each one asks for the narrowest scope that does the job. Read-only where read-only is enough."
          }).value}
          <div class="stack stack-6">
            ${CONNECTORS.map((group) => `
              <div data-reveal>
                <div class="between" style="margin-bottom:14px">
                  <h3 style="font-size:var(--t-h4);font-weight:400">${group.group}</h3>
                  <span class="xs muted mono">${group.items.length}</span>
                </div>
                <div class="conn-grid">
                  ${group.items.map((name) => `
                    <div class="conn">
                      <span class="conn-mark">${name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase()}</span>
                      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
                    </div>`).join("")}
                </div>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Permissions ---- -->
      <section class="section">
        <div class="shell shell-wide">
          <div class="split split-60" style="gap:clamp(28px,4vw,56px);align-items:center">
            <div data-reveal="left">
              <p class="eyebrow">Permissions</p>
              <h2 style="margin-top:18px">Granted per scope, revoked in one click.</h2>
              <p class="lead" style="margin-top:18px">
                A connector never gets blanket access to an account. It asks for the specific scopes the
                task needs — read a calendar, not write to it; open an issue, not close a repository —
                and an administrator can allow-list which scopes are grantable at all.
              </p>
              <div style="margin-top:24px">
                ${calloutBox("Every connector action appears in the audit log with the conversation it came from, the scope used, and the exact request made.", { icon: "list" }).value}
              </div>
              <div class="row" style="margin-top:22px">${textLink("Governance in Mere X for Work", "/products/work").value}</div>
            </div>
            <div class="stack stack-2" data-reveal="right">
              ${[
                ["gmail.messages.read", "Read messages and threads", "granted"],
                ["gmail.messages.send", "Send mail as you", "denied"],
                ["github.issues.write", "Open and comment on issues", "granted"],
                ["github.contents.write", "Push commits", "denied"],
                ["drive.files.read", "Read files you own or can see", "granted"],
                ["slack.channels.history", "Read channel history", "ask"]
              ].map(([scope, desc, state]) => `
                <div class="card card-pad-sm" style="flex-direction:row;align-items:center;gap:14px">
                  <div style="flex:1 1 auto;min-width:0">
                    <code class="mono xs" style="color:var(--ink)">${scope}</code>
                    <div class="xs muted" style="margin-top:2px">${desc}</div>
                  </div>
                  <span class="badge ${state === "denied" ? "badge-danger" : state === "ask" ? "badge-warning" : "badge-positive"}">${state}</span>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Build your own ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(24px,3vw,48px);align-items:center">
            <div data-reveal="left">
              ${sectionHead({ eyebrow: "Extend it", title: "Build a connector in an afternoon." }).value}
              <p class="lead measure">
                A connector is a tool definition plus an OAuth flow. Define the schema, describe when
                the model should reach for it, and Mere X handles the rest — including deciding not to
                call it. We also speak the Model Context Protocol, so an existing MCP server works as-is.
              </p>
              <div class="row" style="margin-top:24px;gap:12px">
                ${button({ label: "Tool use docs", href: "/docs/tools", variant: "secondary", size: "btn-sm", icon: "arrow-right" }).value}
                ${textLink("MCP specification", "/docs/tools").value}
              </div>
            </div>
            <div data-reveal="right">
              ${codeBlock({
                Python: `connector = {
    "name": "search_inventory",
    "description": (
        "Look up stock levels for a SKU across warehouses. "
        "Use whenever the user asks whether something is available."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "sku": {"type": "string"},
            "region": {"type": "string", "enum": ["emea", "amer", "apac"]},
        },
        "required": ["sku"],
    },
}

response = client.messages.create(
    model="mere-orion-5-5",
    max_tokens=2048,
    tools=[connector],
    messages=[{"role": "user", "content": "Do we have TR-880 in Europe?"}],
)`,
                MCP: `{
  "mcpServers": {
    "inventory": {
      "command": "npx",
      "args": ["-y", "@acme/inventory-mcp"],
      "env": { "ACME_TOKEN": "\${ACME_TOKEN}" }
    }
  }
}`
              }).value}
            </div>
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Connect the first one.",
        body: "Gmail, GitHub, or Drive takes about thirty seconds and immediately changes what the assistant can do.",
        primary: { label: "Try Mere X", href: "/app", icon: "arrow-ne" },
        secondary: { label: "Tool use docs", href: "/docs/tools" }
      }).value}
    `;
  }
};
