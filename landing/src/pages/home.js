/* ============================================================
   HOME — the flagship page
   ============================================================ */

import { COMPANY, HERO_STATS, TRUST_LOGOS } from "../data/site.js";
import { MODELS, MODES, CAPABILITIES, BENCHMARKS, BENCH_SERIES } from "../data/models.js";
import { PUBLICATIONS, CUSTOMERS } from "../data/content.js";
import { SAMPLES } from "../data/docs.js";
import { icon, pillarIcon } from "../lib/icons.js";
import { mereXOrb } from "../components/orb.js";
import { splitWords, initOrbParallax } from "../lib/motion.js";
import { compact } from "../lib/format.js";
import {
  button, textLink, sectionHead, featureCard, codeBlock, ctaBand, benchBars, entryList
} from "../components/ui.js";

const PILLARS = [
  { icon: "reticle", title: "Frontier reasoning", body: "Four deliberation depths on one model — instant answers or hours of structured thought." },
  { icon: "plates", title: "Safety by construction", body: "Guard classification on every request, and a scaling policy that gates every release." },
  { icon: "nodes", title: "A million tokens", body: "Whole repositories, depositions, and archives held in a single window with reliable recall." },
  { icon: "burst", title: "Built for builders", body: "One API, six SDKs, a console that shows you exactly what your application is doing." }
];

const PLATFORM_PANELS = [
  { icon: "key", title: "API keys with real controls", body: "Scoped keys, per-key spend limits, instant revocation, and a full audit trail of who created what.", href: "/console/keys" },
  { icon: "chart", title: "Usage you can actually read", body: "Tokens, spend, latency, and error rate broken down by model, key, and endpoint — updated within the minute.", href: "/console/usage" },
  { icon: "play", title: "A playground that mirrors prod", body: "Every parameter the API takes, side by side with the exact request body you would send.", href: "/console/playground" },
  { icon: "list", title: "Request logs, in full", body: "Inspect any request: prompt, tools, thinking budget, stop reason, token accounting, and latency breakdown.", href: "/console/logs" },
  { icon: "card", title: "Billing without surprises", body: "Prepaid credits, auto-reload, monthly caps, and alerts before you hit them rather than after.", href: "/console/billing" },
  { icon: "webhook", title: "Webhooks and automation", body: "Batch completion, spend thresholds, key lifecycle — pushed to your systems as they happen.", href: "/console/webhooks" }
];

export default {
  title: "Building intelligence that advances humanity",
  description:
    "Mere X is an AI research and product company. We build Mere X — a frontier model family engineered for reasoning, safety, and real work.",

  render() {
    const featured = MODELS.filter((model) => ["mere-apex-5-5", "mere-orion-5-5", "mere-nyx-5-5"].includes(model.id));

    return `
    <!-- ============ HERO ============ -->
    <section class="hero">
      <div class="hero-bg" data-parallax="0.06"></div>
      <div class="shell shell-wide">
        <div class="hero-inner">
          <div>
            <p class="eyebrow">AI research &amp; products</p>
            <h1 class="hero-title" data-hero-title>Building intelligence that advances humanity.</h1>
            <p class="lead hero-lead">
              Mere X creates safe, reliable, and genuinely useful AI through world-class research
              and engineering. Our model family is called <strong style="font-weight:400;color:var(--ink)">Mere X</strong>.
            </p>
            <div class="hero-actions">
              ${button({ label: "Explore our research", href: "/research", icon: "arrow-ne", magnetic: true }).value}
              ${textLink("Start building with the API", "/docs/quickstart").value}
            </div>
            <div class="hero-meta">
              ${HERO_STATS.map((stat) => `
                <div class="hero-meta-item">
                  <span class="hero-meta-value" data-reveal="fade">${stat.value}${stat.suffix}</span>
                  <span class="hero-meta-label">${stat.label}</span>
                </div>`).join("")}
            </div>
          </div>
          ${mereXOrb({ label: "Mere X 5.5 · live" }).value}
        </div>
      </div>
    </section>

    <!-- ============ PILLARS ============ -->
    <section class="section-tight">
      <div class="shell shell-wide">
        <div class="feature-row" data-stagger="90">
          ${PILLARS.map((pillar) => `
            <div data-reveal>
              ${pillarIcon(pillar.icon).value}
              <div>
                <h3 style="font-size:var(--t-body);font-weight:400">${pillar.title}</h3>
                <p class="small muted" style="margin-top:6px;line-height:1.55">${pillar.body}</p>
              </div>
            </div>`).join("")}
        </div>
      </div>
    </section>

    <!-- ============ TRUST ============ -->
    <section style="padding-block:26px 10px">
      <div class="shell shell-wide">
        <div class="row" style="gap:34px;align-items:center">
          <span class="xs muted nowrap">Trusted by teams building in production</span>
          <div class="marquee" style="flex:1 1 340px;min-width:0">
            <div class="marquee-track">${TRUST_LOGOS.map((name) => `<span class="marquee-item">${icon("orbit").value}${name}</span>`).join("")}</div>
            <div class="marquee-track" aria-hidden="true">${TRUST_LOGOS.map((name) => `<span class="marquee-item">${icon("orbit").value}${name}</span>`).join("")}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ THE MERE X FAMILY ============ -->
    <section class="section">
      <div class="shell shell-wide">
        ${sectionHead({
          eyebrow: "The model family",
          title: "One family. Three points on the frontier.",
          lead: "Apex, Orion, and Nyx share a training run, a tokenizer, and a safety layer. They differ in how much they can afford to think.",
          action: textLink("Compare every model", "/technology").value
        }).value}

        <div class="grid g-3" data-stagger="110">
          ${featured.map((model) => `
            <article class="model-card ${model.flagship ? "is-flagship" : ""} card-spot" data-reveal>
              <div class="between" style="align-items:flex-start">
                <div class="model-glyph">${icon(model.icon).value}</div>
                <span class="badge ${model.flagship ? "badge-solid" : ""}">${model.tier}</span>
              </div>
              <div>
                <h3 style="font-size:var(--t-h3)">${model.name}</h3>
                <p class="small muted" style="margin-top:8px;line-height:1.55;min-height:3.1em">${model.tagline}</p>
              </div>
              <dl class="model-spec">
                <div class="model-spec-row"><dt>Context</dt><dd>${compact(model.context, 0)} tokens</dd></div>
                <div class="model-spec-row"><dt>Max output</dt><dd>${compact(model.maxOutput, 0)}</dd></div>
                <div class="model-spec-row"><dt>Modes</dt><dd>${model.modes.join(" · ")}</dd></div>
              </dl>
              <div style="margin-top:auto;padding-top:6px">
                ${textLink("Model details", `/technology/models/${model.id}`).value}
              </div>
            </article>`).join("")}
        </div>

        <div class="row" style="margin-top:22px;gap:10px">
          ${MODELS.filter((m) => !["mere-apex-5-5", "mere-orion-5-5", "mere-nyx-5-5"].includes(m.id)).map((model) => `
            <a class="conn" href="/technology/models/${model.id}" style="flex:1 1 200px">
              <span class="conn-mark">${icon(model.icon, "icon").value}</span>
              <span style="min-width:0">
                <span style="display:block">${model.name}</span>
                <span class="xs muted" style="display:block">${model.tier}</span>
              </span>
            </a>`).join("")}
        </div>
      </div>
    </section>

    <!-- ============ REASONING MODES ============ -->
    <section class="section section-line">
      <div class="shell shell-wide">
        ${sectionHead({
          eyebrow: "Reasoning budgets",
          title: "You decide how long it thinks.",
          lead: "The same model, four depths of deliberation. Pay for reasoning only where it changes the answer."
        }).value}

        <div class="mode-strip" data-reveal>
          ${MODES.map((mode) => `
            <div class="mode-cell" style="--v:${mode.depth}">
              <div class="between" style="gap:8px">
                <strong style="font-weight:500;font-size:var(--t-body)">${mode.name}</strong>
                <span class="xs muted mono">${mode.latency}</span>
              </div>
              <div class="mode-bar"><i></i></div>
              <p class="xs muted" style="line-height:1.55">${mode.summary}</p>
              <p class="xs" style="color:var(--faint);margin-top:auto;padding-top:8px">${mode.budget}</p>
            </div>`).join("")}
        </div>

        <div class="row" style="margin-top:26px">
          ${textLink("How reasoning budgets work", "/technology/reasoning").value}
        </div>
      </div>
    </section>

    <!-- ============ ABOUT + CODE ============ -->
    <section class="section">
      <div class="shell shell-wide">
        <div class="split split-40" style="align-items:stretch">
          <div class="panel-dark" data-reveal="left">
            <svg class="panel-wave" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true">
              ${Array.from({ length: 16 }, (_, i) => `<path d="M0 ${40 + i * 22} Q 100 ${20 + i * 22} 200 ${44 + i * 22} T 400 ${28 + i * 22}"/>`).join("")}
            </svg>
            <p class="eyebrow">About Mere X</p>
            <h2 style="font-size:var(--t-h2);margin-top:20px;max-width:15ch">
              We are an AI research and product company building the next generation of intelligent systems.
            </h2>
            <p style="margin-top:22px;max-width:44ch;color:rgba(246,243,236,.62);line-height:1.65">
              ${COMPANY.people} people across ${COMPANY.offices.length} offices, ${COMPANY.researchers} of them
              in research. Founded in ${COMPANY.founded} on a simple bet: that capability and understanding
              have to advance together, or neither is worth much.
            </p>
            <div class="row" style="margin-top:34px;gap:20px">
              <a class="link" href="/company" style="color:#f6f3ec"><span>Discover our mission</span>${icon("arrow-ne", "icon").value}</a>
            </div>
            <div class="grid g-3" style="margin-top:44px;gap:18px;border-top:1px solid rgba(246,243,236,.14);padding-top:26px">
              ${[["2023", "Founded"], [String(COMPANY.people), "People"], ["5", "Offices"]].map(([v, l]) => `
                <div>
                  <div style="font-size:1.6rem;font-weight:300;letter-spacing:-.03em">${v}</div>
                  <div class="xs" style="color:rgba(246,243,236,.5);margin-top:2px">${l}</div>
                </div>`).join("")}
            </div>
          </div>

          <div class="stack stack-5" data-reveal="right">
            <div>
              <p class="eyebrow">Your first call</p>
              <h2 style="font-size:var(--t-h3);margin-top:14px">Two minutes from key to answer.</h2>
              <p class="small muted" style="margin-top:12px;max-width:52ch">
                Install a client, set an environment variable, send a message. No provisioning,
                no waitlist, no model deployment step.
              </p>
            </div>
            ${codeBlock(SAMPLES.firstCall, { caption: "Every SDK ships the same shape: messages in, content blocks out." }).value}
            <div class="row" style="gap:14px">
              ${button({ label: "Open the quickstart", href: "/docs/quickstart", variant: "secondary", size: "btn-sm", icon: "arrow-right" }).value}
              ${button({ label: "Get an API key", href: "/console/keys", variant: "ghost", size: "btn-sm", icon: "key" }).value}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ CAPABILITIES ============ -->
    <section class="section section-line">
      <div class="shell shell-wide">
        ${sectionHead({
          eyebrow: "Capabilities",
          title: "What Mere X can do.",
          lead: "Not a list of features — a description of the work the model is genuinely good at, and the interfaces that let you use it."
        }).value}
        <div class="grid g-auto-lg" data-stagger="70">
          ${CAPABILITIES.map((cap, index) => featureCard({
            icon: cap.icon,
            title: cap.name,
            body: cap.blurb,
            num: String(index + 1).padStart(2, "0")
          }).value).join("")}
        </div>
        <div class="row" style="margin-top:30px">
          ${textLink("Read the capability documentation", "/docs").value}
        </div>
      </div>
    </section>

    <!-- ============ BENCHMARKS ============ -->
    <section class="section">
      <div class="shell shell-wide">
        ${sectionHead({
          eyebrow: "Evaluations",
          title: "Measured, then published.",
          lead: "Every result below ships with the prompts we used, the variance across five runs, and a contamination check.",
          action: textLink("Full benchmark report", "/technology/benchmarks").value
        }).value}
        <div class="card card-pad-lg" data-reveal>
          ${benchBars(BENCHMARKS.slice(0, 5), BENCH_SERIES).value}
          <p class="xs muted" style="margin-top:24px;padding-top:16px;border-top:1px solid var(--line)">
            Scores are percentages. Figures on this site are illustrative for the Mere X platform build.
          </p>
        </div>
      </div>
    </section>

    <!-- ============ DEVELOPER PLATFORM ============ -->
    <section class="section section-line">
      <div class="shell shell-wide">
        ${sectionHead({
          eyebrow: "Developer platform",
          title: "A console built by people who ship.",
          lead: "Keys, usage, logs, limits, billing, and a playground that produces the exact request body you will paste into your code.",
          action: button({ label: "Open the console", href: "/console", variant: "secondary", size: "btn-sm", icon: "arrow-ne" }).value
        }).value}
        <div class="grid g-3" data-stagger="70">
          ${PLATFORM_PANELS.map((panel) => featureCard(panel).value).join("")}
        </div>
      </div>
    </section>

    <!-- ============ SAFETY ============ -->
    <section class="section">
      <div class="shell shell-wide">
        <div class="split split-60" style="align-items:center;gap:clamp(28px,4vw,72px)">
          <div data-reveal="left">
            <p class="eyebrow">Safety</p>
            <h2 style="margin-top:18px;max-width:16ch">A model ships when it has earned it.</h2>
            <p class="lead" style="margin-top:20px;max-width:52ch">
              Our Responsible Scaling Policy defines the capability thresholds that trigger additional
              safeguards, and the evaluations that decide whether a release has met them. The release
              gate is held by the safety organisation, not the product organisation.
            </p>
            <div class="row" style="margin-top:28px;gap:18px">
              ${button({ label: "Our approach to safety", href: "/safety", variant: "secondary", size: "btn-sm", icon: "arrow-right" }).value}
              ${textLink("Read a system card", "/safety/system-cards").value}
            </div>
          </div>
          <div class="grid g-2" style="gap:14px" data-reveal="right" data-stagger="80">
            ${[
              { icon: "shield", t: "Guard on every call", d: "Free classification across the harm taxonomy, inline with generation." },
              { icon: "scale", t: "Responsible Scaling", d: "Published thresholds, and safeguards that trigger automatically." },
              { icon: "eye", t: "Interpretability", d: "Circuit-level tools for reading what the model is doing internally." },
              { icon: "file", t: "System cards", d: "Per-release capability, limitation, and red-team reporting." }
            ].map((item) => `
              <div class="card card-sunken card-pad-sm" data-reveal>
                <div class="card-icon" style="width:34px;height:34px">${icon(item.icon).value}</div>
                <h4 style="font-size:var(--t-sm);font-weight:500">${item.t}</h4>
                <p class="xs muted" style="line-height:1.55">${item.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </div>
    </section>

    <!-- ============ RESEARCH ============ -->
    <section class="section section-line">
      <div class="shell shell-wide">
        ${sectionHead({
          eyebrow: "Research",
          title: "What we are working on.",
          action: textLink("All publications", "/research/publications").value
        }).value}
        ${entryList(PUBLICATIONS.slice(0, 4).map((paper) => ({
          meta: `${paper.date.slice(0, 7)} · ${paper.kind}`,
          title: paper.title,
          desc: paper.summary,
          tags: paper.tags,
          href: "/research/publications"
        }))).value}
      </div>
    </section>

    <!-- ============ CUSTOMERS ============ -->
    <section class="section">
      <div class="shell shell-wide">
        ${sectionHead({
          eyebrow: "In production",
          title: "What people build on Mere X.",
          action: textLink("All customer stories", "/company/customers").value
        }).value}
        <div class="grid g-3" data-stagger="90">
          ${CUSTOMERS.slice(0, 3).map((story) => `
            <article class="quote-card card-spot card-hover" data-reveal>
              <span class="quote-mark">&ldquo;</span>
              <p class="quote-text">${story.quote}</p>
              <div style="margin-top:auto;padding-top:18px;border-top:1px solid var(--line)">
                <div class="between" style="align-items:flex-end">
                  <div>
                    <div class="small" style="font-weight:400">${story.name}</div>
                    <div class="xs muted">${story.person}</div>
                  </div>
                  <div style="text-align:right">
                    <div style="font-size:1.5rem;font-weight:300;letter-spacing:-.03em">${story.metric}</div>
                    <div class="xs muted" style="max-width:14ch">${story.metricLabel}</div>
                  </div>
                </div>
              </div>
            </article>`).join("")}
        </div>
      </div>
    </section>

    ${ctaBand({
      eyebrow: "Get started",
      title: "Turn an ambitious idea into something real.",
      body: "Start in Mere X Studio, or open the developer console to build through the API.",
      primary: { label: "Try Mere X", href: "/app", icon: "arrow-ne" },
      secondary: { label: "Developer console", href: "/console" }
    }).value}
    `;
  },

  mount(root) {
    splitWords(root.querySelector("[data-hero-title]"), 52, 90, "intelligence");

    const stop = initOrbParallax(root);

    // Mode bars fill as the strip enters view.
    const strip = root.querySelector(".mode-strip");
    if (strip) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            Array.from(strip.children).forEach((cell, index) => {
              setTimeout(() => cell.classList.add("is-in"), index * 120);
            });
            observer.disconnect();
          }
        });
      }, { threshold: 0.3 });
      observer.observe(strip);
    }

    import("../lib/router.js").then(({ onLeave }) => onLeave(stop));
  }
};
