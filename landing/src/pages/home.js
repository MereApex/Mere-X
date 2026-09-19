/* ============================================================
   HOME — the full-viewport composition, then the product.
   Wordmark and nav, the headline with its checker, one CTA, the
   dual-portrait reveal behind it all; below, the workspace
   working on a real change, the three modes, the three models,
   the four depths, and what it means for a codebase.
   ============================================================ */

import { icon } from "../lib/icons.js";
import { heroMarkup, tickerMarkup, mountHero } from "../components/hero.js";
import { initCursorLight, initScrollProgress, initSpotlight, initWordReveal, initSignals, initTilt } from "../lib/alive.js";
import { initReveal } from "../lib/motion.js";
import { sectionHead, button, textLink, ctaBand } from "../components/ui.js";
import { demoMarkup, mountDemo } from "../components/demo.js";
import { MODELS, MODES } from "../data/models.js";
import { escapeHtml } from "../lib/dom.js";
import { onLeave } from "../lib/router.js";

const CHAT_MODELS = ["mere-4-2-peak", "mere-4-2-core", "mere-4-0-lite"].map((id) => MODELS.find((model) => model.id === id));

const FEATURES = [
  { icon: "search", title: "Reads before it writes", body: "It searches, opens the files that matter and follows the call graph — instead of guessing from the file you happen to have open." },
  { icon: "scan", title: "Minimal, exact edits", body: "Changes land as precise replacements in the surrounding style. No opportunistic rewrites, no reformatting of lines nobody asked about." },
  { icon: "branch", title: "Checkpoints and review", body: "Every prompt is a checkpoint. Every touched file is a diff you accept or revert, right in the thread." },
  { icon: "hash", title: "Context on demand", body: "Mention a file, a folder, a selection or the whole codebase with @. Project rules in AGENTS.md are read automatically." },
  { icon: "folder", title: "Your files, no install", body: "Open a folder on your computer and the agent reads and writes it directly from the browser. Or start a project that lives in the browser." },
  { icon: "globe", title: "Docs when it needs them", body: "Allow web search and the agent looks up the framework version you are actually on, with sources." },
  { icon: "plug", title: "GitHub, Linear, Figma", body: "Connect the services around your code so the agent can read the issue, the design and the repository history while it works." },
  { icon: "shield", title: "Nothing silent", body: "Deletions ask first. Tool calls are listed as they happen. The agent never claims to have run something it did not." }
];
const NUMBERS = [
  { value: 1000000, label: "Token context", note: "4.2 Peak and 4.2 Core" },
  { value: 3, label: "Models", note: "4.2 Peak · 4.2 Core · 4.0 Lite" },
  { value: 4, label: "Thinking depths", note: "Fast to Extra High" },
  { value: 14, label: "Agent tools", note: "Read, search, edit, run, delegate" },
  { value: 99.96, decimals: 2, suffix: "%", label: "Uptime", note: "Mere Studio, last 90 days" }
];

const WORKSPACE_FACTS = [
  { icon: "terminal", title: "Reads before it writes", body: "Searches the project, reads the files it needs and writes a plan you can see." },
  { icon: "branch", title: "Every prompt is a checkpoint", body: "Roll the project back to any earlier turn, file by file." },
  { icon: "folder", title: "Your files, in your browser", body: "Open a local folder; nothing is uploaded to be edited." },
  { icon: "orbit", title: "Three models, four depths", body: "4.2 Peak, 4.2 Core and 4.0 Lite, with Fast, Medium, High and Extra High thinking." }
];

function modelCard(model, index = 0) {
  return `
    <a class="home-model" href="/technology/models/${model.id}" data-reveal data-tilt="5">
      <span class="home-model-tier">${escapeHtml(model.tier)}</span>
      <span class="home-model-name">${escapeHtml(model.name)}</span>
      <span class="home-model-tag">${escapeHtml(model.tagline)}</span>
      <span class="home-model-signal" data-signal="${index + 1}"></span>
      <dl class="home-model-spec">
        <div><dt>Context</dt><dd>${model.context >= 1_000_000 ? "1M" : `${Math.round(model.context / 1000)}K`} tokens</dd></div>
        <div><dt>First token</dt><dd>${escapeHtml(model.latency.split(" median")[0])}</dd></div>
        <div><dt>Thinking</dt><dd>${escapeHtml(model.modes.join(" · "))}</dd></div>
      </dl>
      <span class="home-model-more">${icon("arrow-ne", "icon").value}</span>
    </a>`;
}

export default {
  title: "Future Forward Intelligence",
  description:
    "Mere Studio is the coding agent that works on your project in the browser — powered by Mere 4.2 Peak, 4.2 Core and 4.0 Lite, with four depths of thinking and every edit reviewable.",

  render() {
    return `
    ${heroMarkup()}
    ${tickerMarkup()}

    <section class="section home-demo-section" id="how-it-works">
      <div class="shell shell-wide">
        ${sectionHead({ eyebrow: "How it works", title: "Hand it the task. Watch it work.", lead: "Mere Studio replaying one real change: it reads the code it needs, writes the plan, edits the files and hands you the diff. Every step is a row in the thread. Nothing happens silently." }).value}
        ${demoMarkup()}
        <div class="demo-facts" data-stagger="80" data-spotlight>
          ${WORKSPACE_FACTS.map((fact) => `<div class="demo-fact" data-reveal>${icon(fact.icon, "icon").value}<div><strong>${escapeHtml(fact.title)}</strong><span>${escapeHtml(fact.body)}</span></div></div>`).join("")}
        </div>
      </div>
    </section>

    <section class="section section-line">
      <div class="shell shell-wide">
        ${sectionHead({ eyebrow: "Three modes", title: "Decide how much it does.", lead: "Agent finishes the task. Plan writes the steps and waits. Ask only reads. Switch in the composer, mid-thread, whenever you like." }).value}
        <div class="home-modes" data-stagger="90" data-spotlight>
          <div class="home-mode" data-reveal data-tilt="4">
            <span class="home-mode-key">Agent<i class="home-mode-activity is-agent"><b></b><b></b><b></b><b></b></i></span>
            <h3>Reads, edits, creates.</h3>
            <p>Finishes the task end to end: explores the code, applies precise edits, verifies its own change and summarises. Deletions ask first.</p>
          </div>
          <div class="home-mode" data-reveal data-tilt="4">
            <span class="home-mode-key">Plan<i class="home-mode-activity is-plan"><b></b><b></b><b></b><b></b></i></span>
            <h3>Proposes, changes nothing.</h3>
            <p>Investigates the codebase and returns numbered steps — which files, what changes, in what order, with the risks — then waits for you.</p>
          </div>
          <div class="home-mode" data-reveal data-tilt="4">
            <span class="home-mode-key">Ask<i class="home-mode-activity is-ask"><b></b><b></b><b></b><b></b></i></span>
            <h3>Explains, read-only.</h3>
            <p>Answers questions about the project by actually reading it. Wants a change? It writes the diff and tells you to switch to Agent.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-line has-aurora">
      <div class="shell shell-wide">
        ${sectionHead({ eyebrow: "Three models", title: "Pick the mind for the job.", lead: "One family, three lines. Each has its own generation and its own reason to exist.", action: textLink("Compare all models", "/technology").value }).value}
        <div class="home-models" data-stagger="90" data-spotlight>
          ${CHAT_MODELS.map((model, index) => modelCard(model, index)).join("")}
        </div>
        <div class="home-numbers" data-stagger="80">
          ${NUMBERS.map((item) => `
            <div class="home-number" data-reveal>
              <strong><span data-count="${item.value}" data-count-decimals="${item.decimals || 0}" data-count-suffix="${item.suffix || ""}" data-count-duration="1800">0</span></strong>
              <span class="home-number-label">${escapeHtml(item.label)}</span>
              <span class="home-number-note">${escapeHtml(item.note)}</span>
            </div>`).join("")}
        </div>
      </div>
    </section>

    <section class="section section-line has-aurora is-right">
      <div class="shell shell-wide">
        ${sectionHead({ eyebrow: "Four depths", title: "Decide how long it thinks.", lead: "Fast for the rename you could almost type yourself. Extra High for the migration that has to be right the first time. The dial is in the composer.", action: textLink("How thinking budgets work", "/technology/reasoning").value }).value}
        <div class="mode-strip" data-reveal>
          ${MODES.map((mode) => `
            <div class="mode-cell">
              <span class="eyebrow bare"><i class="depth-pulse"></i>${escapeHtml(mode.name)}</span>
              <div class="mode-bar"><i style="--v:${mode.depth}"></i></div>
              <p class="small">${escapeHtml(mode.summary)}</p>
              <p class="micro muted">${escapeHtml(mode.use)}</p>
            </div>`).join("")}
        </div>
      </div>
    </section>

    <section class="section section-line">
      <div class="shell shell-wide">
        ${sectionHead({ eyebrow: "Built for a codebase", title: "Everything an agent needs to be trusted with real code." }).value}
        <div class="home-features" data-stagger="60" data-spotlight>
          ${FEATURES.map((feature) => `
            <div class="home-feature-card" data-reveal>
              <span class="home-feature-icon">${icon(feature.icon, "icon").value}</span>
              <h3>${escapeHtml(feature.title)}</h3>
              <p>${escapeHtml(feature.body)}</p>
            </div>`).join("")}
        </div>
      </div>
    </section>

    <section class="section section-line">
      <div class="shell shell-wide">
        <div class="home-privacy" data-reveal="scale">
          <div>
            <p class="eyebrow">Your code stays yours</p>
            <h2>Read on demand. Never trained on.</h2>
          </div>
          <div class="home-privacy-points">
            <p>Local folders are read by your browser and only the files the agent opens are sent for that turn. Browser projects live in your browser's storage.</p>
            <p>Nothing you write or the agent reads is used to train models. Threads sync to your account; files never leave your machine unless the agent reads them for you.</p>
          </div>
        </div>
      </div>
    </section>

    ${ctaBand({
      eyebrow: "Mere Studio",
      title: "Open a folder and start.",
      body: "No install, no extension, no setup. Sign in, open the project, describe the change.",
      primary: { label: "Open Mere Studio", href: "/app", icon: "arrow-ne" },
      secondary: { label: "See pricing", href: "/pricing" }
    }).value}`;
  },

  mount(root) {
    const stopHero = mountHero(root);

    /* The page-wide effects: headings rise word by word, cards carry a
       spotlight, the model cards run a signal, section rules light up,
       a light follows the cursor and a line tracks the scroll. */
    root.querySelectorAll(".sec-head h2, .home-privacy h2").forEach((node) => node.setAttribute("data-words", ""));
    initWordReveal(root);
    initSignals(root);
    const stopReveal = initReveal(root);
    const stopSpotlight = initSpotlight(root);
    const stopTilt = initTilt(root);
    root.querySelectorAll(".sec-head").forEach((node) => node.setAttribute("data-parallax", "0.08"));
    const stopLight = initCursorLight();
    const stopProgress = initScrollProgress();
    const rules = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-lit"); rules.unobserve(entry.target); }
    }, { threshold: 0.05 });
    root.querySelectorAll(".section-line").forEach((node) => rules.observe(node));

    const stopDemo = mountDemo(root.querySelector("[data-demo-stage]"));

    onLeave(() => {
      stopHero();
      stopDemo();
      stopReveal();
      stopSpotlight();
      stopTilt();
      stopLight();
      stopProgress();
      rules.disconnect();
    });
  }
};
