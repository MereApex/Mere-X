/* ============================================================
   CONSOLE — database-backed billing history
   ============================================================ */

import { getState, usageTotals } from "../lib/store.js";
import { icon } from "../lib/icons.js";
import { money, dateShort } from "../lib/format.js";
import { consoleShell, panel, metric } from "./shell.js";
import { dataTable, calloutBox } from "../components/ui.js";

export default {
  title: "Billing",
  description: "Current plan and completed payment history for this Mere X account.",

  render() {
    const state = getState();
    const usage = usageTotals(30);
    const paid = state.billing.invoices.filter((invoice) => ["COMPLETED", "paid", "captured"].includes(invoice.status));
    const paidTotal = paid.reduce((sum, invoice) => sum + Number(invoice.amountUsd || 0), 0);

    const invoiceTable = state.billing.invoices.length
      ? dataTable({
          columns: [
            { key: "period", label: "Period", render: (row) => `<strong>${row.period}</strong>` },
            { key: "plan", label: "Plan" },
            { key: "issued", label: "Date", render: (row) => dateShort(row.issued) },
            { key: "amountUsd", label: "Amount", align: "right", render: (row) => `${money(row.amountUsd)} ${row.currency || "USD"}` },
            { key: "status", label: "Status", render: (row) => `<span class="badge ${["COMPLETED", "paid", "captured"].includes(row.status) ? "badge-positive" : "badge-plain"}">${row.status}</span>` },
            { key: "id", label: "Order", align: "right", render: (row) => `<code class="mono small">${row.id}</code>` }
          ],
          rows: state.billing.invoices
        }).value
      : `<div class="empty" style="border:0">${icon("card").value}<p>No payments yet.</p></div>`;

    const body = `
      <div class="metrics" style="margin-bottom:16px">
        ${metric({ label: "Current plan", value: state.org.plan }).value}
        ${metric({ label: "Payments", value: String(state.billing.invoices.length) }).value}
        ${metric({ label: "Total paid", value: money(paidTotal) }).value}
        ${metric({ label: "Recorded API cost · 30 days", value: money(usage.cost) }).value}
      </div>

      <div class="grid" style="grid-template-columns:minmax(0,1.55fr) minmax(280px,.8fr);gap:16px;align-items:start" data-billing-grid>
        ${panel({
          title: "Payment history",
          desc: "Orders captured through the Mere X checkout and stored in the database",
          body: invoiceTable
        }).value}

        <div class="stack stack-4">
          ${panel({
            title: "Plan management",
            body: `
              <div class="stack stack-4">
                <div class="stat"><span class="stat-value" style="font-size:2rem">${state.org.plan}</span><span class="stat-label">Active account plan</span></div>
                <a class="btn btn-primary btn-block" href="/pricing">${icon("card", "icon").value}<span>View plans</span></a>
              </div>`
          }).value}

          ${panel({
            title: "Secure checkout",
            body: calloutBox("PayPal, cards, Apple Pay, and Google Pay are presented only through the secure checkout when available for the buyer and device.", { icon: "lock" }).value
          }).value}
        </div>
      </div>`;

    return consoleShell({
      active: "/console/billing",
      title: "Billing",
      sub: `${state.org.name} · ${state.org.plan}`,
      actions: `<a class="btn btn-secondary btn-sm" href="/pricing">${icon("card", "icon").value}<span>Pricing</span></a>`,
      body
    });
  },

  mount(root) {
    const grid = root.querySelector("[data-billing-grid]");
    const apply = () => {
      if (grid) grid.style.gridTemplateColumns = window.innerWidth < 980 ? "minmax(0,1fr)" : "minmax(0,1.55fr) minmax(280px,.8fr)";
    };
    apply();
    window.addEventListener("resize", apply, { passive: true });
    import("../lib/router.js").then(({ onLeave }) => onLeave(() => window.removeEventListener("resize", apply)));
  }
};
