/* ============================================================
   CONSOLE — enforced service limits
   ============================================================ */

import { getState, usageWindow } from "../lib/store.js";
import { icon } from "../lib/icons.js";
import { nf, compact } from "../lib/format.js";
import { consoleShell, panel, metric } from "./shell.js";
import { barChart, dayLabel } from "../components/charts.js";
import { calloutBox } from "../components/ui.js";

export default {
  title: "Rate limits",
  description: "The service limits currently enforced by Mere X.",

  render() {
    const state = getState();
    const rows = usageWindow(14);
    const buckets = new Map();
    state.logs.forEach((log) => {
      const minute = Math.floor(log.at / 60_000);
      buckets.set(minute, (buckets.get(minute) || 0) + 1);
    });
    const recentPeak = buckets.size ? Math.max(...buckets.values()) : 0;
    const limits = [
      { label: "All API requests", value: state.limits.rpm, period: "per minute, per client IP" },
      { label: "AI generation requests", value: state.limits.generationRpm, period: "per minute, per client IP" },
      { label: "Authentication attempts", value: state.limits.authAttemptsPer15m, period: "per 15 minutes, per client IP" },
      { label: "Payment requests", value: state.limits.paymentRpm, period: "per minute, per client IP" }
    ];

    const body = `
      <div class="metrics" style="margin-bottom:16px">
        ${metric({ label: "Account plan", value: state.org.plan }).value}
        ${metric({ label: "API requests / min", value: nf(state.limits.rpm) }).value}
        ${metric({ label: "Generation requests / min", value: nf(state.limits.generationRpm) }).value}
        ${metric({ label: "Recent recorded peak", value: nf(recentPeak), sub: "requests/min" }).value}
      </div>

      <div class="stack stack-4">
        ${panel({
          title: "Enforced limits",
          desc: "These values match the currently deployed application guards",
          body: `
            <div class="stack stack-3">
              ${limits.map((row) => `
                <div class="between" style="gap:20px;padding:10px 0;border-bottom:1px solid var(--line)">
                  <div><div class="small">${row.label}</div><div class="xs muted" style="margin-top:3px">${row.period}</div></div>
                  <strong class="mono">${nf(row.value)}</strong>
                </div>`).join("")}
            </div>`
        }).value}

        ${panel({
          title: "Daily recorded volume",
          desc: "Authenticated requests stored for this Studio, last 14 days",
          body: barChart(rows.map((row) => ({ label: dayLabel(row.date), value: row.requests })), { height: 210, format: (value) => compact(value, 0) }).value
        }).value}

        <div class="grid g-2" style="gap:16px;align-items:start">
          ${panel({
            title: "When a limit is reached",
            body: `
              <div class="stack stack-3">
                ${[
                  ["Respect HTTP 429", "Pause the request and use the standard rate-limit response headers to determine when to retry."],
                  ["Use exponential backoff", "Increase the delay between retries and add jitter so clients do not retry at the same instant."],
                  ["Avoid duplicate work", "Cancel superseded generation requests and reuse completed results when possible."]
                ].map(([title, description]) => `
                  <div class="row row-top" style="flex-wrap:nowrap;gap:11px">
                    <span style="color:var(--ink);margin-top:2px">${icon("check", "icon").value}</span>
                    <span><strong style="font-weight:400;font-size:var(--t-sm)">${title}</strong><br><span class="xs muted">${description}</span></span>
                  </div>`).join("")}
              </div>`
          }).value}

          ${panel({
            title: "What is measured",
            body: `
              <p class="small muted">The recent peak is calculated only from request records stored for this authenticated Studio. It is not an invented utilisation estimate and may be lower than the server's per-IP counter when several accounts share one network.</p>
              <p class="small muted" style="margin-top:12px">Token-per-minute and batch quotas are not displayed until those controls are actually enforced by the service.</p>`
          }).value}
        </div>

        ${calloutBox("Limits protect service availability. If your production traffic needs a different ceiling, contact support with the expected request pattern.", { variant: "accent", icon: "server" }).value}
      </div>`;

    return consoleShell({
      active: "/console/limits",
      title: "Rate limits",
      sub: `${state.org.name} · live application limits`,
      actions: `<a class="btn btn-secondary btn-sm" href="/support">${icon("help", "icon").value}<span>Support</span></a>`,
      body
    });
  }
};
