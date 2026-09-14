/* ============================================================
   CONSOLE — usage and analytics from recorded requests
   ============================================================ */

import { getState, usageWindow, usageTotals, spendByModel } from "../lib/store.js";
import { icon } from "../lib/icons.js";
import { compact, money, nf, ms, pct } from "../lib/format.js";
import { moveSegThumb } from "../lib/motion.js";
import { consoleShell, panel, metric } from "./shell.js";
import { areaChart, barChart, proportionBars, donut, dayLabel } from "../components/charts.js";
import { sparkline, dataTable } from "../components/ui.js";
import { navigate } from "../lib/router.js";

const WINDOWS = [7, 30, 90];
const empty = (message) => `<div class="empty" style="border:0">${icon("chart").value}<p>${message}</p></div>`;

function grouped(logs, field, valueFor) {
  const values = new Map();
  logs.forEach((log) => {
    const label = log[field] || "Unknown";
    values.set(label, (values.get(label) || 0) + valueFor(log));
  });
  return [...values.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function exportUsage(rows) {
  const headings = ["date", "input_tokens", "output_tokens", "requests", "errors", "average_latency_ms", "recorded_cost_usd"];
  const lines = rows.map((row) => [row.date, row.input, row.output, row.requests, row.errors, row.latency, row.cost].join(","));
  const blob = new Blob([[headings.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mere-x-usage-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default {
  title: "Usage",
  description: "Recorded tokens, request volume, latency, and errors.",

  render(ctx) {
    const days = WINDOWS.includes(Number(ctx.query.get("days"))) ? Number(ctx.query.get("days")) : 30;
    const state = getState();
    const rows = usageWindow(days);
    const totals = usageTotals(days);
    const cutoff = Date.now() - days * 86_400_000;
    const logs = state.logs.filter((log) => log.at >= cutoff);
    const byModel = spendByModel(days);
    const byKey = grouped(logs, "key", (log) => Number(log.input || 0) + Number(log.output || 0));
    const byEndpoint = grouped(logs, "endpoint", () => 1);
    const spend = rows.reduce((sum, row) => sum + Number(row.cost || 0), 0);
    const areaRows = rows.map((row) => ({ label: dayLabel(row.date), values: [row.input, row.output] }));

    const body = `
      <div class="between" style="margin-bottom:16px">
        <div class="seg" data-window-seg>
          <span class="seg-thumb"></span>
          ${WINDOWS.map((window) => `<button class="seg-btn ${window === days ? "is-active" : ""}" data-days="${window}">${window} days</button>`).join("")}
        </div>
        <div class="row row-tight">
          <button class="btn btn-ghost btn-sm" data-export>${icon("download", "icon").value}<span>Download CSV</span></button>
          <a class="btn btn-ghost btn-sm" href="/console/logs">${icon("list", "icon").value}<span>Request logs</span></a>
        </div>
      </div>

      <div class="metrics" style="margin-bottom:16px">
        ${metric({ label: "Total tokens", value: compact(totals.tokens, 1), spark: sparkline(rows.map((row) => row.input + row.output)).value }).value}
        ${metric({ label: "Input tokens", value: compact(totals.input, 1), spark: sparkline(rows.map((row) => row.input), { color: "var(--s1)" }).value }).value}
        ${metric({ label: "Output tokens", value: compact(totals.output, 1), spark: sparkline(rows.map((row) => row.output), { color: "var(--s2)" }).value }).value}
        ${metric({ label: "Recorded API cost", value: money(spend), spark: sparkline(rows.map((row) => row.cost), { color: "var(--s2)" }).value }).value}
        ${metric({ label: "Requests", value: compact(totals.requests, 1), spark: sparkline(rows.map((row) => row.requests), { color: "var(--s3)" }).value }).value}
        ${metric({ label: "Error rate", value: pct(totals.errorRate, 2), spark: sparkline(rows.map((row) => row.errors), { color: "var(--s6)" }).value }).value}
      </div>

      <div class="stack stack-4">
        ${panel({
          title: "Tokens over time",
          desc: `Recorded input and output, last ${days} days`,
          body: areaChart(areaRows, {
            series: [{ label: "Input", color: "var(--s1)" }, { label: "Output", color: "var(--s2)" }],
            height: 260
          }).value
        }).value}

        <div class="grid g-2" style="gap:16px;align-items:start">
          ${panel({
            title: "Usage by model",
            desc: `Recorded tokens and cost, last ${days} days`,
            body: byModel.length ? proportionBars(
              byModel.map((row, index) => ({ label: row.model, value: row.tokens, note: money(row.cost), color: `var(--s${index + 1})` })),
              { format: (value) => `${compact(value, 1)} tokens` }
            ).value : empty("No model usage recorded in this period.")
          }).value}

          ${panel({
            title: "Traffic by endpoint",
            desc: "Recorded request count",
            body: byEndpoint.length ? donut(byEndpoint.map((row, index) => ({ ...row, color: `var(--s${index + 1})` }))).value : empty("No endpoint traffic recorded in this period.")
          }).value}
        </div>

        <div class="grid g-2" style="gap:16px;align-items:start">
          ${panel({
            title: "Requests per day",
            body: barChart(rows.map((row) => ({ label: dayLabel(row.date), value: row.requests })), { height: 190 }).value
          }).value}

          ${panel({
            title: "Average latency",
            desc: "Milliseconds for completed requests",
            body: barChart(rows.map((row) => ({ label: dayLabel(row.date), value: row.latency })), { height: 190, color: "var(--s4)", format: (value) => `${Math.round(value)}` }).value
          }).value}
        </div>

        ${panel({
          title: "Usage by credential",
          desc: "Recorded tokens by Studio session or API key",
          body: byKey.length ? proportionBars(byKey, { format: (value) => `${compact(value, 1)} tokens` }).value : empty("No credential usage recorded in this period.")
        }).value}

        ${panel({
          title: "Detail by model",
          body: byModel.length ? dataTable({
            columns: [
              { key: "model", label: "Model", render: (row) => `<code class="mono small">${row.model}</code>` },
              { key: "input", label: "Input tokens", align: "right", render: (row) => nf(row.input) },
              { key: "output", label: "Output tokens", align: "right", render: (row) => nf(row.output) },
              { key: "tokens", label: "Total", align: "right", render: (row) => nf(row.tokens) },
              { key: "cost", label: "Recorded cost", align: "right", render: (row) => money(row.cost) }
            ],
            rows: byModel
          }).value : empty("No model detail is available for this period.")
        }).value}
      </div>`;

    return consoleShell({
      active: "/console/usage",
      title: "Usage",
      sub: `${state.org.name} · ${days}-day window · average latency ${ms(totals.avgLatency)}`,
      body
    });
  },

  mount(root) {
    const seg = root.querySelector("[data-window-seg]");
    if (seg) {
      requestAnimationFrame(() => moveSegThumb(seg));
      seg.addEventListener("click", (event) => {
        const button = event.target.closest(".seg-btn");
        if (button) navigate(`/console/usage?days=${button.dataset.days}`, { scroll: false });
      });
    }
    root.querySelector("[data-export]")?.addEventListener("click", () => exportUsage(usageWindow(Number(new URLSearchParams(location.search).get("days")) || 30)));
  }
};
