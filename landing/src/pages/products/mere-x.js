/* ============================================================
   MERE X — the assistant product page
   ============================================================ */

import { MODES } from "../../data/models.js";
import { CONNECTORS, FAQ } from "../../data/content.js";
import { icon } from "../../lib/icons.js";
import { mereXOrb } from "../../components/orb.js";
import { initOrbParallax } from "../../lib/motion.js";
import { sectionHead, textLink, button, ctaBand, accordion } from "../../components/ui.js";

const SURFACES = [
  { icon: "chat", t: "Chat", d: "The everyday surface. Switch reasoning depth per message, attach anything, and branch a conversation without losing the original." },
  { icon: "microscope", t: "Deep research", d: "Give it a question that would take you a day. It plans, searches, reads, cross-checks, and returns a cited report with its working shown." },
  { icon: "file", t: "Canvas", d: "A document that you and the model edit together. Select a paragraph, say what is wrong, watch only that paragraph change." },
  { icon: "folder", t: "Projects", d: "Persistent context for an ongoing piece of work — files, instructions, and history that every conversation in the project inherits." },
  { icon: "wand", t: "Images", d: "Generate and edit with instruction-level control, including masked edits that leave the rest of the frame untouched." },
  { icon: "wave", t: "Voice", d: "Sub-300 ms spoken conversation that handles interruption, and can call your connectors mid-sentence." },
  { icon: "atom", t: "Memory", d: "Remembers what matters across conversations, shows you exactly what it stored, and lets you delete any of it." },
  { icon: "plug", t: "Connectors", d: "Eighty tools it can read from and act in, each with permissions you grant individually and revoke instantly." }
];

const HIGHLIGHTS = [
  "Unified Mere X 5.5 intelligence — Fast, Medium, High, and DEEP in one model",
  "Deep research with current, cited sources",
  "Private by default; your conversations are never training data"
];

export default {
  title: "Mere X",
  description: "Mere X is the Mere X assistant: chat, deep research, canvas, projects, memory, voice, and eighty connectors.",

  render() {
    return `
      <section class="hero">
        <div class="hero-bg" data-parallax="0.05"></div>
        <div class="shell shell-wide">
          <div class="hero-inner">
            <div>
              <p class="eyebrow">Mere X · the assistant</p>
              <h1 class="hero-title" style="font-size:var(--t-h1)">Everything you make, in one considered place.</h1>
              <p class="lead hero-lead">
                Research, writing, code, and analysis — held together by a single model and a
                workspace that stays out of the way.
              </p>
              <ul class="stack stack-3" style="margin-top:28px;max-width:46ch">
                ${HIGHLIGHTS.map((item) => `
                  <li class="row row-tight" style="flex-wrap:nowrap;align-items:flex-start;color:var(--ink-2)">
                    <span style="color:var(--ink);margin-top:2px">${icon("check", "icon").value}</span>
                    <span class="small">${item}</span>
                  </li>`).join("")}
              </ul>
              <div class="hero-actions">
                ${button({ label: "Try Mere X", href: "/app", icon: "arrow-ne", magnetic: true }).value}
                ${textLink("Compare plans", "/pricing").value}
              </div>
              <p class="xs muted" style="margin-top:20px">No card required. Free forever on Nyx and limited Orion.</p>
            </div>
            ${mereXOrb({ label: "Mere X 5.5 · workspace" }).value}
          </div>
        </div>
      </section>

      <!-- ---- Surfaces ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "The workspace",
            title: "Eight surfaces, one context.",
            lead: "Move between chat, a document, a research report, and a voice call without re-explaining anything. They all read from the same project."
          }).value}
          <div class="grid g-4" data-stagger="70">
            ${SURFACES.map((item) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(item.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${item.t}</h3>
                <p class="small muted" style="line-height:1.6">${item.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Modes in the app ---- -->
      <section class="section">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(28px,4vw,56px);align-items:center">
            <div data-reveal="left">
              <p class="eyebrow">Depth control</p>
              <h2 style="margin-top:18px">A slider for how hard it thinks.</h2>
              <p class="lead" style="margin-top:18px">
                Most assistants hide the trade-off between speed and quality. Mere X puts it in the
                composer: four depths, switchable mid-conversation, with the cost of each visible
                before you send.
              </p>
              <div style="margin-top:24px">${textLink("How reasoning budgets work", "/technology/reasoning").value}</div>
            </div>
            <div class="mode-strip" data-reveal="right" style="grid-template-columns:repeat(2,minmax(0,1fr))">
              ${MODES.map((mode) => `
                <div class="mode-cell is-in" style="--v:${mode.depth}">
                  <div class="between"><strong style="font-weight:500">${mode.name}</strong><span class="xs muted mono">${mode.latency}</span></div>
                  <div class="mode-bar"><i></i></div>
                  <p class="xs muted" style="line-height:1.5">${mode.use}</p>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Connectors ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Connectors",
            title: "It can use the tools you already use.",
            lead: "Read a thread, file an issue, update a record, pull a report. Every connector asks for permission per scope, and every action it takes is logged.",
            action: textLink("All connectors", "/products/connectors").value
          }).value}
          <div class="conn-grid" data-reveal>
            ${CONNECTORS.flatMap((group) => group.items).slice(0, 24).map((name) => `
              <div class="conn"><span class="conn-mark">${name.slice(0, 2).toUpperCase()}</span><span>${name}</span></div>`).join("")}
          </div>
          <p class="xs muted" style="margin-top:16px">…and 56 more, plus any MCP server you point it at.</p>
        </div>
      </section>

      <!-- ---- Privacy ---- -->
      <section class="section">
        <div class="shell shell-wide">
          <div class="panel-dark" data-reveal>
            <div class="split split-60" style="gap:clamp(28px,4vw,56px);align-items:center">
              <div>
                <p class="eyebrow">Privacy</p>
                <h2 style="margin-top:18px;font-size:var(--t-h2)">Your conversations are not training data.</h2>
                <p style="margin-top:20px;color:rgba(246,243,236,.66);line-height:1.68;max-width:52ch">
                  Not by default, not with an obscure toggle buried three settings deep. Contributing
                  conversations to training is opt-in, revocable, and revoking removes the data from
                  future runs. API traffic is excluded entirely, with no opt-in available.
                </p>
                <div class="row" style="margin-top:28px;gap:18px">
                  <a class="link" href="/legal/privacy" style="color:#f6f3ec"><span>Privacy policy</span>${icon("arrow-ne", "icon").value}</a>
                  <a class="link" href="/company/trust" style="color:#f6f3ec"><span>Trust centre</span>${icon("arrow-ne", "icon").value}</a>
                </div>
              </div>
              <div class="grid g-2" style="gap:12px">
                ${[["Opt-in", "Training contribution"], ["30 days", "Default retention"], ["0 days", "Zero-retention mode"], ["Any time", "Delete everything"]].map(([v, l]) => `
                  <div style="padding:18px;border:1px solid rgba(246,243,236,.14);border-radius:var(--r-md)">
                    <div style="font-size:1.4rem;font-weight:300;letter-spacing:-.02em">${v}</div>
                    <div class="xs" style="color:rgba(246,243,236,.5);margin-top:3px">${l}</div>
                  </div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Plans live on Pricing ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Plans",
            title: "Start free. Move when you need to.",
            lead: "Consumer plans and developer API rates are kept together on one transparent pricing page.",
            action: button({ label: "See pricing", href: "/pricing", variant: "secondary", size: "btn-sm", icon: "arrow-right" }).value
          }).value}
        </div>
      </section>

      <!-- ---- FAQ ---- -->
      <section class="section">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "Before you sign up." }).value}
          ${accordion(FAQ.slice(0, 5), { open: 0 }).value}
          <div style="margin-top:26px">${textLink("More questions", "/support").value}</div>
        </div>
      </section>

      ${ctaBand({
        title: "Try it on something real.",
        body: "The free tier is genuinely usable — not a demo with a countdown on it.",
        primary: { label: "Try Mere X", href: "/app", icon: "arrow-ne" },
        secondary: { label: "Mere X for Work", href: "/products/work" }
      }).value}
    `;
  },

  mount(root) {
    const stop = initOrbParallax(root);
    import("../../lib/router.js").then(({ onLeave }) => onLeave(stop));
  }
};
