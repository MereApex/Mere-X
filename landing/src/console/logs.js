/* ============================================================
   CONSOLE — stored request metadata
   ============================================================ */

import { getState } from "../lib/store.js";
import { icon } from "../lib/icons.js";
import { nf, compact, dateTime, relative, ms } from "../lib/format.js";
import { copyText } from "../lib/dom.js";
import { toast } from "../lib/toast.js";
import { consoleShell, panel, metric } from "./shell.js";

const statusColor = (status) => status < 400 ? "var(--positive)" : status === 429 ? "var(--warning)" : "var(--danger)";

function detailFor(log) {
  const fields = [
    ["Request ID", log.id],
    ["Received", dateTime(log.at)],
    ["Endpoint", log.endpoint],
    ["Model", log.model],
    ["Credential", log.key],
    ["HTTP status", log.status],
    ["Latency", ms(log.latency)],
    ["Input tokens", nf(log.input)],
    ["Output tokens", nf(log.output)],
    ["Stop reason", log.stop || "Not recorded"],
    ["Error code", log.error || "None"]
  ];
  return `
    <div class="log-detail" style="padding:16px 20px">
      <div class="grid g-2" style="gap:10px 28px">
        ${fields.map(([label, value]) => `<div class="between xs" style="gap:16px"><span class="muted">${label}</span><span class="mono" style="text-align:right;overflow-wrap:anywhere">${value}</span></div>`).join("")}
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn btn-ghost btn-sm" data-copy-id="${log.id}">${icon("copy", "icon").value}<span>Copy request ID</span></button>
      </div>
    </div>`;
}

export default {
  title: "Request logs",
  description: "Inspect request metadata recorded by your authenticated workspace.",

  render(ctx) {
    const state = getState();
    const filter = ctx.query.get("status") || "all";
    const search = (ctx.query.get("q") || "").toLowerCase();
    let logs = state.logs;
    if (filter === "errors") logs = logs.filter((log) => log.status >= 400);
    else if (filter === "ok") logs = logs.filter((log) => log.status < 400);
    if (search) logs = logs.filter((log) => `${log.id} ${log.model} ${log.endpoint} ${log.key}`.toLowerCase().includes(search));

    const errors = state.logs.filter((log) => log.status >= 400).length;
    const errorRate = state.logs.length ? errors / state.logs.length : 0;
    const orderedLatency = [...state.logs].sort((a, b) => a.latency - b.latency);
    const p95 = orderedLatency.length ? orderedLatency[Math.min(orderedLatency.length - 1, Math.ceil(orderedLatency.length * 0.95) - 1)] : null;

    const body = `
      <div class="metrics" style="margin-bottom:16px">
        ${metric({ label: "Recorded requests", value: nf(state.logs.length) }).value}
        ${metric({ label: "Errors", value: nf(errors), sub: `${(errorRate * 100).toFixed(1)}%` }).value}
        ${metric({ label: "p95 latency", value: p95 ? ms(p95.latency) : "—" }).value}
        ${metric({ label: "Stored fields", value: "Metadata only" }).value}
      </div>

      ${panel({
        title: "Requests",
        desc: `${nf(logs.length)} matching · newest first`,
        actions: `
          <div class="row row-tight">
            <input class="input" data-search value="${search}" placeholder="Filter by ID, model, endpoint…" style="width:230px;padding-block:7px">
            <div class="seg">
              <span class="seg-thumb" style="display:none"></span>
              ${[["all", "All"], ["ok", "2xx/3xx"], ["errors", "Errors"]].map(([id, label]) => `
                <button class="seg-btn ${filter === id ? "is-active" : ""}" data-filter="${id}" style="${filter === id ? "background:var(--surface);box-shadow:var(--shadow-sm)" : ""}">${label}</button>`).join("")}
            </div>
          </div>`,
        flush: true,
        body: `
          <div style="max-height:66vh;overflow-y:auto">
            <div class="log-row head">
              <span>Time</span><span>Status</span><span>Endpoint · model</span><span>Latency</span><span>Tokens</span>
            </div>
            ${logs.length ? logs.slice(0, 80).map((log) => `
              <div class="log-row" data-log="${log.id}">
                <span class="muted" title="${dateTime(log.at)}">${relative(log.at)}</span>
                <span class="log-status" style="color:${statusColor(log.status)}"><i class="dot" style="background:currentColor"></i>${log.status}</span>
                <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                  ${log.endpoint} · <span class="muted">${log.model}</span>
                  ${log.error ? `<span class="badge badge-danger" style="margin-left:8px">${log.error}</span>` : ""}
                </span>
                <span class="muted">${ms(log.latency)}</span>
                <span class="muted">${compact(log.input + log.output, 1)}</span>
              </div>
              <div data-detail-for="${log.id}" hidden></div>`).join("")
              : `<div class="empty" style="border:0">${icon("search").value}<p>No requests match this filter.</p></div>`}
          </div>`,
        foot: "Request and response bodies are not stored in developer request logs."
      }).value}`;

    return consoleShell({
      active: "/console/logs",
      title: "Request logs",
      sub: "Click a row to inspect the metadata actually stored in the database.",
      body
    });
  },

  mount(root) {
    root.addEventListener("click", async (event) => {
      const copyButton = event.target.closest("[data-copy-id]");
      if (copyButton) {
        event.stopPropagation();
        const ok = await copyText(copyButton.dataset.copyId);
        toast(ok ? "Request ID copied" : "Could not copy", { icon: ok ? "check" : "alert" });
        return;
      }

      const filterButton = event.target.closest("[data-filter]");
      if (filterButton) {
        const { navigate } = await import("../lib/router.js");
        navigate(`/console/logs?status=${filterButton.dataset.filter}`, { scroll: false });
        return;
      }

      const row = event.target.closest("[data-log]");
      if (!row) return;
      const host = root.querySelector(`[data-detail-for="${row.dataset.log}"]`);
      if (!host) return;
      if (!host.hidden) {
        host.hidden = true;
        host.innerHTML = "";
        return;
      }
      root.querySelectorAll("[data-detail-for]").forEach((node) => {
        node.hidden = true;
        node.innerHTML = "";
      });
      const log = getState().logs.find((item) => item.id === row.dataset.log);
      if (log) {
        host.innerHTML = detailFor(log);
        host.hidden = false;
      }
    });

    const search = root.querySelector("[data-search]");
    if (search) {
      let timer = 0;
      search.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const { navigate } = await import("../lib/router.js");
          const params = new URLSearchParams(location.search);
          if (search.value) params.set("q", search.value); else params.delete("q");
          navigate(`/console/logs?${params.toString()}`, { scroll: false, replace: true });
          root.querySelector("[data-search]")?.focus();
        }, 320);
      });
    }
  }
};
