/* ============================================================
   CONSOLE — authenticated workspace dashboard
   ============================================================ */

import { getState, usageWindow, usageTotals, spendByModel, maskedKeyString } from "../lib/store.js";
import { icon } from "../lib/icons.js";
import { compact, money, ms, pct, relative } from "../lib/format.js";
import { consoleShell, panel, metric } from "./shell.js";
import { areaChart, proportionBars, heatStrip, dayLabel } from "../components/charts.js";
import { sparkline, button } from "../components/ui.js";
import { escapeHtml } from "../lib/dom.js";

const empty = (message, iconName = "activity") => `
  <div class="empty" style="border:0">
    ${icon(iconName).value}
    <p>${message}</p>
  </div>`;

export default {
  title: "Console",
  description: "Your authenticated Mere X Studio, usage, keys, logs, and billing.",

  render() {
    const state = getState();
    const rows = usageWindow(30);
    const totals = usageTotals(30);
    const byModel = spendByModel(30);
    const activeKeys = state.keys.filter((key) => key.status === "active");
    const spend = rows.reduce((sum, row) => sum + Number(row.cost || 0), 0);
    const chartRows = rows.map((row) => ({
      label: dayLabel(row.date),
      values: [row.input, row.output]
    }));

    const recentRequests = state.logs.length
      ? state.logs.slice(0, 8).map((log) => `
          <div class="log-row">
            <span class="muted">${relative(log.at)}</span>
            <span class="log-status" style="color:${log.status < 400 ? "var(--positive)" : log.status === 429 ? "var(--warning)" : "var(--danger)"}">
              <i class="dot" style="background:currentColor"></i>${log.status}
            </span>
            <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(log.endpoint)} · <span class="muted">${escapeHtml(log.model)}</span></span>
            <span class="muted">${ms(log.latency)}</span>
            <span class="muted">${compact(log.input + log.output, 1)}</span>
          </div>`).join("")
      : empty("No authenticated API requests have been recorded yet.", "list");

    const keyRows = activeKeys.length
      ? activeKeys.slice(0, 4).map((key) => `
          <div class="key-row" style="padding:13px 20px">
            <span class="key-icon">${icon("key").value}</span>
            <div style="min-width:0;flex:1 1 auto">
              <div class="key-name">${escapeHtml(key.name)}</div>
              <div class="key-value">${escapeHtml(maskedKeyString(key))}</div>
            </div>
            <span class="badge badge-plain">${key.env}</span>
          </div>`).join("")
      : empty("No active API keys. Create one when your integration is ready.", "key");

    const modelBody = byModel.length
      ? proportionBars(
          byModel.map((row, index) => ({
            label: row.model,
            value: row.tokens,
            note: money(row.cost),
            color: `var(--s${index + 1})`
          })),
          { format: (value) => `${compact(value, 1)} tokens` }
        ).value
      : empty("Model usage will appear after your first request.", "chart");

    const body = `
      <div class="metrics" style="margin-bottom:16px">
        ${metric({ label: "Tokens · 30 days", value: compact(totals.tokens, 1), spark: sparkline(rows.map((row) => row.input + row.output)).value }).value}
        ${metric({ label: "Requests · 30 days", value: compact(totals.requests, 1), spark: sparkline(rows.map((row) => row.requests), { color: "var(--s3)" }).value }).value}
        ${metric({ label: "Recorded API cost", value: money(spend), spark: sparkline(rows.map((row) => row.cost), { color: "var(--s2)" }).value }).value}
        ${metric({ label: "Average latency", value: ms(totals.avgLatency), spark: sparkline(rows.map((row) => row.latency), { color: "var(--s4)" }).value }).value}
        ${metric({ label: "Error rate", value: pct(totals.errorRate, 2), spark: sparkline(rows.map((row) => row.errors), { color: "var(--s6)" }).value }).value}
      </div>

      <div class="grid" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:16px;align-items:start" data-console-grid>
        <div class="stack stack-4">
          ${panel({
            title: "Token usage",
            desc: "Recorded input and output tokens, last 30 days",
            actions: `<a class="btn btn-ghost btn-sm" href="/console/usage">Full usage${icon("arrow-right", "icon").value}</a>`,
            body: areaChart(chartRows, {
              series: [{ label: "Input tokens", color: "var(--s1)" }, { label: "Output tokens", color: "var(--s2)" }],
              height: 240
            }).value
          }).value}

          ${panel({
            title: "Usage by model",
            desc: "Recorded token totals and API cost, last 30 days",
            body: modelBody
          }).value}

          ${panel({
            title: "Recent requests",
            desc: "Newest recorded requests",
            actions: `<a class="btn btn-ghost btn-sm" href="/console/logs">All logs${icon("arrow-right", "icon").value}</a>`,
            flush: true,
            body: state.logs.length ? `
              <div class="log-row head">
                <span>Time</span><span>Status</span><span>Endpoint · model</span><span>Latency</span><span>Tokens</span>
              </div>${recentRequests}` : recentRequests
          }).value}
        </div>

        <div class="stack stack-4">
          ${panel({
            title: "Studio",
            body: `
              <div class="stack stack-3">
                <div class="between small"><span class="muted">Plan</span><strong>${state.org.plan}</strong></div>
                <div class="between small"><span class="muted">Region</span><span class="mono">${state.org.region}</span></div>
                <div class="between small"><span class="muted">Members</span><span>${state.members.length}</span></div>
                <div class="between small"><span class="muted">Active API keys</span><span>${activeKeys.length}</span></div>
              </div>`
          }).value}

          ${panel({
            title: "API keys",
            actions: `<a class="btn btn-ghost btn-sm" href="/console/keys">Manage</a>`,
            flush: true,
            body: keyRows
          }).value}

          ${panel({
            title: "Service limits",
            actions: `<a class="btn btn-ghost btn-sm" href="/console/limits">Details</a>`,
            body: `
              <div class="stack stack-3">
                <div class="between small"><span class="muted">All API requests / minute</span><span class="mono">${state.limits.rpm}</span></div>
                <div class="between small"><span class="muted">Generation requests / minute</span><span class="mono">${state.limits.generationRpm || 20}</span></div>
                <div class="between small"><span class="muted">Authentication attempts / 15 min</span><span class="mono">${state.limits.authAttemptsPer15m || 30}</span></div>
              </div>`
          }).value}

          ${panel({
            title: "Open Mere X",
            desc: "Use your authenticated creative Studio",
            body: `<a class="btn btn-primary" href="/app">${icon("play", "icon").value}<span>Launch Studio</span></a>`
          }).value}
        </div>
      </div>

      <div style="margin-top:16px">
        ${panel({
          title: "Activity",
          desc: "Recorded requests per day, last 90 days",
          body: heatStrip(state.usage90.map((row) => ({ label: row.date, value: row.requests })), { label: "requests" }).value
        }).value}
      </div>`;

    return consoleShell({
      active: "/console",
      title: `Welcome back, ${state.user.name.split(" ")[0]}`,
      sub: `${state.org.name} · ${state.org.plan}`,
      actions: `${button({ label: "Studio", href: "/app", variant: "secondary", size: "btn-sm", icon: "play" }).value}
                ${button({ label: "Create key", href: "/console/keys", size: "btn-sm", icon: "plus" }).value}`,
      body
    });
  },

  mount(root) {
    const grid = root.querySelector("[data-console-grid]");
    const apply = () => {
      if (grid) grid.style.gridTemplateColumns = window.innerWidth < 1180 ? "minmax(0,1fr)" : "minmax(0,1.7fr) minmax(0,1fr)";
    };
    apply();
    window.addEventListener("resize", apply, { passive: true });
    import("../lib/router.js").then(({ onLeave }) => onLeave(() => window.removeEventListener("resize", apply)));
  }
};
