/* ============================================================
   INFRASTRUCTURE — the compute behind the models
   ============================================================ */

import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, calloutBox, statTile, dataTable } from "../../components/ui.js";

const REGIONS = [
  { region: "us-east", location: "Virginia, US", services: "All", residency: "United States", latency: "18 ms" },
  { region: "us-west", location: "Oregon, US", services: "All", residency: "United States", latency: "24 ms" },
  { region: "eu-west", location: "Dublin, Ireland", services: "All", residency: "European Union", latency: "21 ms" },
  { region: "eu-central", location: "Frankfurt, Germany", services: "All", residency: "European Union", latency: "19 ms" },
  { region: "ap-northeast", location: "Tokyo, Japan", services: "Messages, Embeddings, Batch", residency: "Japan", latency: "26 ms" },
  { region: "ap-south", location: "Mumbai, India", services: "Messages, Embeddings", residency: "India", latency: "31 ms" }
];

const PILLARS = [
  { icon: "cpu", t: "Training clusters", d: "Two clusters on separate power infrastructure, so a regional outage delays a run rather than destroying it. Checkpoints are written every eleven minutes and verified on restore." },
  { icon: "activity", t: "Inference fleet", d: "Continuous batching, paged attention, and speculative decoding on the smaller models. Capacity is reserved per tier so a spike in shared traffic cannot starve provisioned customers." },
  { icon: "database", t: "The cache tier", d: "Prompt caches are content-addressed and regional. A cached prefix is never transported across a residency boundary, even when that would be faster." },
  { icon: "shield", t: "Isolation", d: "Every request runs in a per-tenant sandbox. Server-side code execution runs in a separate gVisor-isolated pool with no network egress unless you explicitly enable it." },
  { icon: "globe", t: "Edge and routing", d: "Anycast ingress in 34 metros terminates TLS close to the caller and routes to the nearest region that satisfies your residency policy." },
  { icon: "refresh", t: "Failure handling", d: "Region evacuation is a routine drill, not an incident response. We run one unannounced regional failover per quarter during business hours." }
];

const SUSTAIN = [
  { label: "Carbon-free energy", value: 94, suffix: "%", note: "Matched hourly, not annually" },
  { label: "PUE across our fleet", value: 1.09, decimals: 2, note: "Twelve-month trailing average" },
  { label: "Water use effectiveness", value: 0.18, decimals: 2, note: "Litres per kWh" },
  { label: "Hardware reuse", value: 87, suffix: "%", note: "Components redeployed or recycled" }
];

export default {
  title: "Infrastructure",
  description: "The compute, regions, residency options, and reliability engineering behind the Mere X API.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Technology", href: "/technology" }, { label: "Infrastructure" }],
        eyebrow: "Platform",
        title: "The boring part, taken seriously.",
        lead: "A model is only as useful as the hour it is available. This is how the platform underneath it is built, where it runs, and what happens when part of it fails.",
        actions: `${button({ label: "Live status", href: "/status", icon: "activity" }).value}
                  ${button({ label: "Enterprise deployment", href: "/products/enterprise", variant: "secondary", icon: "building" }).value}`,
        meta: `
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">99.98%</span><span class="stat-label">Trailing 12-month uptime</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">6</span><span class="stat-label">Regions</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">34</span><span class="stat-label">Edge metros</span></div>
          <div class="stat"><span class="stat-value" style="font-size:1.5rem">4.1T</span><span class="stat-label">Tokens per day</span></div>`
      }).value}

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "How it is built", title: "Six pillars." }).value}
          <div class="grid g-3" data-stagger="80">
            ${PILLARS.map((p) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(p.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${p.t}</h3>
                <p class="small muted" style="line-height:1.62">${p.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Regions ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Regions",
            title: "Where your data is processed.",
            lead: "Set a residency policy on your organisation and requests are refused rather than routed outside it. There is no silent fallback.",
            action: textLink("Trust centre", "/company/trust").value
          }).value}
          ${dataTable({
            columns: [
              { key: "region", label: "Region", render: (r) => `<code class="inline">${r.region}</code>` },
              { key: "location", label: "Location" },
              { key: "services", label: "Services" },
              { key: "residency", label: "Data residency" },
              { key: "latency", label: "p50 ingress", align: "right" }
            ],
            rows: REGIONS
          }).value}
          <div style="margin-top:20px;max-width:76ch">
            ${calloutBox("Residency covers request content, prompt caches, uploaded files, and request logs. It does not cover billing metadata, which is aggregated in the United States — that is stated plainly in the DPA rather than buried in it.", { icon: "lock" }).value}
          </div>
        </div>
      </section>

      <!-- ---- Reliability ---- -->
      <section class="section">
        <div class="shell shell-wide">
          <div class="split split-60" style="gap:clamp(28px,4vw,60px);align-items:center">
            <div data-reveal="left">
              <p class="eyebrow">Reliability</p>
              <h2 style="margin-top:18px">What we promise, and what we do when we miss.</h2>
              <p class="lead" style="margin-top:18px">
                99.9% monthly availability on shared capacity; 99.95% with provisioned throughput,
                backed by service credits. Every incident over five minutes gets a public post-mortem
                with a timeline, a root cause, and the remediation — including the ones that make us
                look careless.
              </p>
              <div class="row" style="margin-top:26px;gap:16px">
                ${button({ label: "Incident history", href: "/status", variant: "secondary", size: "btn-sm", icon: "arrow-right" }).value}
                ${textLink("Support and SLAs", "/support").value}
              </div>
            </div>
            <div class="grid g-2" style="gap:14px" data-reveal="right" data-stagger="80">
              ${[
                ["99.9%", "Shared capacity SLA"],
                ["99.95%", "Provisioned throughput SLA"],
                ["< 5 min", "Paging threshold"],
                ["Quarterly", "Unannounced failover drills"]
              ].map(([v, l]) => `
                <div class="card card-sunken card-pad-sm" data-reveal>
                  <div style="font-size:1.7rem;font-weight:300;letter-spacing:-.03em">${v}</div>
                  <div class="xs muted">${l}</div>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Sustainability ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Energy",
            title: "The footprint, published.",
            lead: "Training frontier models uses a great deal of power. Pretending otherwise helps nobody, so here are the numbers we hold ourselves to."
          }).value}
          <div class="grid g-4" data-stagger="90">
            ${SUSTAIN.map((item) => statTile({
              value: item.value, suffix: item.suffix || "", label: item.label, note: item.note, decimals: item.decimals || 0
            }).value).join("")}
          </div>
          <p class="xs muted" style="margin-top:26px">
            Figures cover owned and leased capacity for the trailing twelve months. Illustrative values for this platform build.
          </p>
        </div>
      </section>

      ${ctaBand({
        title: "Need dedicated capacity?",
        body: "Provisioned throughput, private tenancy, and regional pinning are configured with a solutions architect, not a form.",
        primary: { label: "Talk to sales", href: "/company/contact", icon: "arrow-ne" },
        secondary: { label: "Enterprise overview", href: "/products/enterprise" }
      }).value}
    `;
  }
};
