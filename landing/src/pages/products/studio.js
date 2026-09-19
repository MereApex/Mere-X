/* ============================================================
   MERE STUDIO — the coding agent, in the browser
   ============================================================ */

import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, codeBlock, ctaBand, accordion } from "../../components/ui.js";

const STEPS = [
  { n: "01", t: "Open a folder", d: "Chrome and Edge can hand the browser a folder on your computer. Mere Studio indexes it in seconds and reads or writes files only when the agent needs to. No install, no extension, no upload." },
  { n: "02", t: "Describe the change", d: "Plain language, with @ to pin a file, a folder, a selection or the whole codebase. Rules in AGENTS.md or MERE.md are read automatically. Choose Agent, Plan or Ask, a model and a thinking depth." },
  { n: "03", t: "Watch it work", d: "Every tool call is a row in the thread — searched, read, edited — with the arguments and the result one click away. The reasoning summary streams while the model thinks." },
  { n: "04", t: "Review the diff", d: "Changed files appear as a review card. Open one and the editor shows a unified diff with accept and reject per hunk. Keep everything, revert everything, or restore the checkpoint before any prompt." }
];

const ABILITIES = [
  { icon: "search", t: "Reads before it writes", d: "It greps, opens the files that matter, and follows the call graph — rather than pattern-matching on the file you happened to have open." },
  { icon: "scan", t: "Minimal correct changes", d: "Trained to make the smallest change that fixes the problem, in the style of the surrounding code, with exact replacements instead of rewrites." },
  { icon: "list", t: "Plans in the open", d: "Multi-step work shows a live task list that ticks off as it goes, so you always know which part of the change is in progress." },
  { icon: "branch", t: "Checkpoints everywhere", d: "Each prompt is a restore point. Revert a single file, a whole turn, or rewind the thread to before a prompt and try again." },
  { icon: "alert", t: "Says when it is stuck", d: "Calibrated uncertainty matters most here. It stops and asks rather than inventing an API that does not exist." },
  { icon: "shield", t: "Nothing runs unseen", d: "There is no hidden shell. Deletions ask first, edits are reviewable, and the agent never claims to have run a build or a test it could not run." }
];

const FAQ_ITEMS = [
  { q: "Does it upload my whole codebase?", a: "<p>No. Your browser reads the folder and the agent receives only the files it opens for that turn, plus a compact file tree. Nothing is stored server-side beyond your threads, and nothing is used for training.</p>" },
  { q: "Which browsers can open a local folder?", a: "<p>Chrome and Edge, through the File System Access API. Other browsers can still use Mere Studio with a project that lives in the browser, or with a folder dropped onto the window, which copies its text files in.</p>" },
  { q: "Which model should I use?", a: "<p>4.2 Core in High for most work. Drop to 4.0 Lite in Fast for mechanical edits and quick questions, and rise to 4.2 Peak with Extra High for a refactor that spans many files or a bug nobody has managed to reproduce.</p>" },
  { q: "Can it run my tests?", a: "<p>Not yet — the browser has no shell. It can run an isolated JavaScript snippet to check logic, and it will tell you exactly which command to run yourself.</p>" },
  { q: "How is it billed?", a: "<p>By agent turns: one prompt and every tool round it needs counts once against a rolling 5-hour and weekly limit. Plans from Free upward include a monthly allowance; the API bills per token.</p>" }
];

export default {
  title: "Mere Studio",
  description: "The coding agent that works on your project in the browser. Open a folder, describe the change, review the diff. Powered by Mere 4.2 Peak, 4.2 Core and 4.0 Lite.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Product", href: "/products" }, { label: "Mere Studio" }],
        eyebrow: "For engineers",
        title: "The agent that works in your codebase.",
        lead: "Not autocomplete. A colleague that reads unfamiliar code, makes the smallest change that works, shows you the diff, and tells you what it could not figure out. In the browser, on your own files.",
        actions: `${button({ label: "Open Mere Studio", href: "/app", icon: "arrow-ne", magnetic: true }).value}
                  ${button({ label: "See pricing", href: "/pricing", variant: "secondary", icon: "card" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(24px,3vw,48px);align-items:center">
            <div data-reveal="left">
              ${sectionHead({ eyebrow: "In the thread", title: "One prompt." }).value}
              <p class="lead measure">
                Describe the change. It plans, reads, edits with exact replacements and hands you a diff —
                with the reasoning summary attached so you can see why it made each call.
              </p>
              <div class="row" style="margin-top:24px;gap:12px">
                ${button({ label: "Open the workspace", href: "/app", variant: "secondary", size: "btn-sm", icon: "arrow-right" }).value}
                ${textLink("How thinking depths work", "/technology/reasoning").value}
              </div>
            </div>
            <div data-reveal="right">
              ${codeBlock({
                Thread: `> the retry wrapper double-counts failures when the
  circuit breaker is half-open. find it and fix it.

  Thought for 4s

  Searched   "halfOpen"                      6 results
  Read       src/resilience/breaker.ts       L1-218
  Read       src/resilience/retry.ts         L40-94

  The half-open probe increments failureCount before
  onResult() runs, so a successful probe still counts.

  Edited     src/resilience/breaker.ts       +6 −4
  Edited     test/breaker.test.ts            +18 −0

  2 files changed   [ Review ] [ Accept all ] [ Reject all ]`,
                Rules: `# MERE.md — read at the start of every turn

- TypeScript strict; no \`any\` in src/**.
- Tests live next to the code they test.
- Never edit files under generated/.
- Keep functions under 40 lines; split instead.
- Run \`npm test\` yourself and paste failures back.`
              }).value}
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Steps ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "How it works", title: "Four steps, no setup." }).value}
          <div class="grid g-4" data-stagger="80">
            ${STEPS.map((step) => `
              <div class="card card-hover card-spot" data-reveal>
                <span class="card-num">${step.n}</span>
                <h3 style="font-size:var(--t-h4);font-weight:600;margin-top:12px">${step.t}</h3>
                <p class="small muted" style="line-height:1.62;margin-top:10px">${step.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Abilities ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "What it does well", title: "Six behaviours that make it worth the tokens." }).value}
          <div class="grid g-3" data-stagger="70">
            ${ABILITIES.map((item) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(item.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${item.t}</h3>
                <p class="small muted" style="line-height:1.6">${item.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Control ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="panel-dark" data-reveal>
            <div class="split split-60" style="gap:clamp(28px,4vw,56px);align-items:center">
              <div>
                <p class="eyebrow">Control</p>
                <h2 style="margin-top:18px;font-size:var(--t-h2)">Three modes, one rule: nothing lands silently.</h2>
                <p class="lead" style="margin-top:20px;line-height:1.68;max-width:52ch">
                  Agent edits. Plan proposes. Ask explains. In every mode the thread lists each tool call as it happens,
                  and in Agent mode every changed file waits for your decision.
                </p>
                <div class="row" style="margin-top:26px">
                  <a class="link" href="/safety"><span>Our safety approach</span>${icon("arrow-ne", "icon").value}</a>
                </div>
              </div>
              <div class="stack stack-2">
                ${[
                  ["read_file · search_files", "Read anything in the project", "always"],
                  ["edit_file · write_file", "Applied, then reviewable per hunk", "review"],
                  ["delete_file", "Waits for your approval", "prompt"],
                  ["run_javascript", "Isolated sandbox, no filesystem", "sandbox"],
                  ["web_search", "Off unless you switch it on", "opt-in"]
                ].map(([k, d, state]) => `
                  <div class="between" style="padding:12px 14px;border:1px solid var(--line-strong);border-radius:var(--r-sm);gap:14px">
                    <div style="min-width:0">
                      <code class="mono" style="font-size:12px;color:var(--ink)">${k}</code>
                      <div class="xs muted" style="margin-top:2px">${d}</div>
                    </div>
                    <span class="badge">${state}</span>
                  </div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "What engineers ask first." }).value}
          ${accordion(FAQ_ITEMS, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "Open a folder and start.",
        body: "The first task is usually one you have been avoiding.",
        primary: { label: "Open Mere Studio", href: "/app", icon: "arrow-ne" },
        secondary: { label: "Compare the models", href: "/technology" }
      }).value}
    `;
  }
};
