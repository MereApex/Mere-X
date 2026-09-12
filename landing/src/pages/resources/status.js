/* ============================================================
   RESOURCES — platform status
   ============================================================ */

import { STATUS_SERVICES, STATUS_INCIDENTS } from "../../data/content.js";
import { icon } from "../../lib/icons.js";
import { dateFull, pct, seeded } from "../../lib/format.js";
import { pageHead, sectionHead, textLink, button, ctaBand, dataTable, calloutBox } from "../../components/ui.js";

const REGIONS = [
  { region: "us-east", state: "operational", latency: 18 },
  { region: "us-west", state: "operational", latency: 24 },
  { region: "eu-west", state: "degraded", latency: 61 },
  { region: "eu-central", state: "operational", latency: 19 },
  { region: "ap-northeast", state: "operational", latency: 26 },
  { region: "ap-south", state: "operational", latency: 31 }
];

const STATE_STYLE = {
  operational: { color: "var(--positive)", label: "Operational", badge: "badge-positive" },
  degraded: { color: "var(--warning)", label: "Degraded performance", badge: "badge-warning" },
  outage: { color: "var(--danger)", label: "Outage", badge: "badge-danger" },
  maintenance: { color: "var(--info)", label: "Maintenance", badge: "badge-info" }
};

/** 90-day uptime strip, deterministic per service. */
function uptimeStrip(service) {
  const rand = seeded(service.name);
  let bars = "";
  for (let i = 0; i < 90; i += 1) {
    const roll = rand();
    const state = i === 0 && service.state === "degraded" ? "degraded" : roll > 0.985 ? "degraded" : roll > 0.997 ? "outage" : "operational";
    const color = STATE_STYLE[state].color;
    bars += `<span title="${90 - i} days ago — ${STATE_STYLE[state].label}" style="flex:1 1 0;min-width:2px;height:26px;border-radius:2px;background:${color};opacity:${state === "operational" ? 0.55 : 1}"></span>`;
  }
  return `<div style="display:flex;gap:2px;margin-top:10px">${bars}</div>`;
}

export default {
  title: "Status",
  description: "Live platform health for the Mere X API, console, and workspace.",

  render() {
    const degraded = STATUS_SERVICES.filter((s) => s.state !== "operational");
    const allGood = degraded.length === 0;

    return `
      ${pageHead({
        crumb: [{ label: "Status" }],
        eyebrow: "Platform health",
        title: allGood ? "All systems operational." : `${degraded.length} service${degraded.length === 1 ? "" : "s"} degraded.`,
        lead: "Live status for every service and region, ninety days of history, and a public post-mortem for every incident over five minutes.",
        actions: `${button({ label: "Subscribe to updates", href: "/console/settings", icon: "bell" }).value}
                  ${button({ label: "Incident history", href: "#incidents", variant: "secondary", icon: "list" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          ${degraded.length ? `
            <div style="margin-bottom:22px" data-reveal>
              ${calloutBox(`<strong>${degraded.map((s) => s.name).join(", ")}</strong> — ${STATUS_INCIDENTS[0].title}. ${STATUS_INCIDENTS[0].body}`, { variant: "warning", icon: "alert" }).value}
            </div>` : ""}

          <div class="stack stack-4">
            ${STATUS_SERVICES.map((service) => {
              const style = STATE_STYLE[service.state];
              return `
                <div class="card card-pad-lg" data-reveal>
                  <div class="between" style="align-items:flex-start">
                    <div>
                      <div class="row row-tight">
                        <span class="dot ${service.state === "operational" ? "dot-live" : ""}" style="background:${style.color}"></span>
                        <h3 style="font-size:var(--t-h4);font-weight:400">${service.name}</h3>
                      </div>
                      <p class="xs muted" style="margin-top:5px">${style.label}</p>
                    </div>
                    <div style="text-align:right">
                      <div class="mono small">${service.uptime.toFixed(2)}%</div>
                      <div class="xs muted">90-day uptime</div>
                    </div>
                  </div>
                  ${uptimeStrip(service)}
                  <div class="between xs muted" style="margin-top:8px">
                    <span>90 days ago</span><span>Today</span>
                  </div>
                </div>`;
            }).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Regions ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Regions",
            title: "By location.",
            action: textLink("Infrastructure detail", "/technology/infrastructure").value
          }).value}
          ${dataTable({
            columns: [
              { key: "region", label: "Region", render: (r) => `<code class="inline">${r.region}</code>` },
              { key: "state", label: "State", render: (r) => `<span class="badge ${STATE_STYLE[r.state].badge}">${STATE_STYLE[r.state].label}</span>` },
              { key: "latency", label: "p50 ingress", align: "right", render: (r) => `${r.latency} ms` }
            ],
            rows: REGIONS
          }).value}
        </div>
      </section>

      <!-- ---- Incidents ---- -->
      <section class="section" id="incidents">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "History",
            title: "Recent incidents.",
            lead: "Anything over five minutes gets a public post-mortem with a timeline, a root cause, and the remediation."
          }).value}
          <div class="entry-list">
            ${STATUS_INCIDENTS.map((incident) => `
              <div class="entry" style="cursor:default">
                <div class="entry-meta">${dateFull(incident.date)}</div>
                <div>
                  <div class="row row-tight" style="margin-bottom:8px">
                    <span class="badge ${incident.state === "resolved" ? "badge-positive" : "badge-warning"}">${incident.state}</span>
                  </div>
                  <h3 class="entry-title">${incident.title}</h3>
                  <p class="entry-desc">${incident.body}</p>
                </div>
                <span class="entry-arrow">${icon("file").value}</span>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- SLA ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Commitments", title: "What we promise." }).value}
          <div class="grid g-4" data-stagger="80">
            ${[
              ["99.9%", "Shared capacity SLA", "Monthly availability, service credits on miss"],
              ["99.95%", "Provisioned throughput", "With a latency SLA and no overload errors"],
              ["< 5 min", "Paging threshold", "On-call is woken before most users notice"],
              ["Public", "Post-mortems", "For every incident over five minutes"]
            ].map(([v, l, d]) => `
              <div class="card card-sunken card-pad-sm" data-reveal>
                <div style="font-size:1.7rem;font-weight:300;letter-spacing:-.03em">${v}</div>
                <div class="small" style="margin-top:2px">${l}</div>
                <div class="xs muted" style="margin-top:5px;line-height:1.5">${d}</div>
              </div>`).join("")}
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Get told before you notice.",
        body: "Incident notices for your region, delivered by email and webhook.",
        primary: { label: "Notification settings", href: "/console/settings", icon: "arrow-ne" },
        secondary: { label: "Contact support", href: "/support" }
      }).value}
    `;
  }
};
