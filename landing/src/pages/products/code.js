/* ============================================================
   MERE X CODE — the coding agent
   ============================================================ */

import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, codeBlock, ctaBand, calloutBox, accordion } from "../../components/ui.js";

const SURFACES = [
  { icon: "terminal", t: "Terminal", d: "The primary surface. Runs in your repository, reads what it needs, and shows every command before it runs it.", cmd: "npm install -g @mere-x/code" },
  { icon: "code", t: "IDE extensions", d: "VS Code and JetBrains. Same agent, same session, with inline diffs and a review pane.", cmd: "code --install-extension merex.mere-x-code" },
  { icon: "branch", t: "CI and code review", d: "Review every pull request, or hand it an issue and let it open the PR itself.", cmd: "uses: mere-x/mere-x-code-action@v2" },
  { icon: "cloud", t: "Cloud sessions", d: "Long-running agents on our infrastructure for refactors that take hours rather than minutes.", cmd: "mere-x run --cloud --task refactor.md" }
];

const ABILITIES = [
  { icon: "search", t: "Reads before it writes", d: "It greps, opens the files that matter, and follows the call graph — rather than pattern-matching on the file you happened to have open." },
  { icon: "scan", t: "Minimal correct changes", d: "Trained to make the smallest change that fixes the problem, in the style of the surrounding code, without opportunistic rewrites nobody asked for." },
  { icon: "check", t: "Runs your tests", d: "It executes the suite, reads the failure, and iterates. A test that fails for the wrong reason is treated as a failure." },
  { icon: "branch", t: "Git-native", d: "Branches, commits with real messages, opens PRs, and responds to review comments on its own work." },
  { icon: "alert", t: "Says when it is stuck", d: "Calibrated uncertainty matters most here. It stops and asks rather than inventing an API that does not exist." },
  { icon: "shield", t: "Permissioned by default", d: "Every command, file write, and network call goes through a permission layer you configure once and can tighten per repository." }
];

const FAQ_ITEMS = [
  { q: "Does it send my whole codebase to the API?", a: "<p>No. It reads the files it decides it needs, and shows you which ones. You can restrict paths with a config file, and in zero-retention mode nothing that is read is written to disk on our side at all.</p>" },
  { q: "Which model does it use?", a: "<p>Apex in High mode by default, dropping to Orion for mechanical edits and rising to DEEP for large refactors. You can pin a model and a mode if you would rather control the bill precisely.</p>" },
  { q: "How is it billed?", a: "<p>Through your API key, at standard token rates. There is no separate seat licence. Consumer plans from Pro upward include a monthly allowance before API billing begins.</p>" },
  { q: "Can it run unattended in CI?", a: "<p>Yes, with a scoped key and a permission policy. We strongly recommend it opens pull requests rather than pushing to a protected branch — the review step is where most of the value lands.</p>" }
];

export default {
  title: "Mere X Code",
  description: "A terminal-native coding agent that reads your repository, makes minimal correct changes, runs the tests, and explains what it did.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Products", href: "/products" }, { label: "Mere X Code" }],
        eyebrow: "For engineers",
        title: "An agent that lives in your repository.",
        lead: "Not autocomplete. A colleague that reads unfamiliar code, makes the smallest change that works, runs the suite, and tells you what it could not figure out.",
        actions: `${button({ label: "Install the CLI", href: "/docs/quickstart", icon: "terminal", magnetic: true }).value}
                  ${button({ label: "See it in the docs", href: "/docs/agents", variant: "secondary", icon: "book" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(24px,3vw,48px);align-items:center">
            <div data-reveal="left">
              ${sectionHead({ eyebrow: "In the terminal", title: "One command." }).value}
              <p class="lead measure">
                Point it at a repository and describe the change. It plans, edits, tests, and hands you a
                diff — with the reasoning summary attached so you can see why it made each call.
              </p>
              <div class="row" style="margin-top:24px;gap:12px">
                ${button({ label: "Quickstart", href: "/docs/quickstart", variant: "secondary", size: "btn-sm", icon: "arrow-right" }).value}
                ${textLink("Agent documentation", "/docs/agents").value}
              </div>
            </div>
            <div data-reveal="right">
              ${codeBlock({
                Terminal: `$ npm install -g @mere-x/code
$ cd ~/projects/checkout-service
$ mere-x

  mere-x code 2.2.0 · mere-apex-5-5 · High

> the retry wrapper double-counts failures when the
  circuit breaker is half-open. find it and fix it.

  read  src/resilience/breaker.ts        (218 lines)
  read  src/resilience/retry.ts          (94 lines)
  read  test/resilience/breaker.test.ts  (311 lines)

  thinking ......................... 6,240 tokens

  The half-open probe increments failureCount before
  onResult() runs, so a successful probe still counts.

  edit  src/resilience/breaker.ts        (-4 +6)
  edit  test/resilience/breaker.test.ts  (+22)
  run   npm test -- resilience

  ✓ 47 passing  (1 new)

  Opened PR #418 · "fix: don't count half-open probes"`,
                Config: `# .mere-x/config.toml
model      = "mere-apex-5-5"
mode       = "high"
max_steps  = 200

[permissions]
read       = ["src/**", "test/**", "package.json"]
write      = ["src/**", "test/**"]
deny       = [".env", "secrets/**", "infra/prod/**"]
commands   = ["npm test", "npm run lint", "git *"]
network    = false

[review]
open_pr        = true
push_protected = false`
              }).value}
            </div>
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

      <!-- ---- Surfaces ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Where it runs", title: "Four surfaces, one session." }).value}
          <div class="grid g-2" data-stagger="80">
            ${SURFACES.map((s) => `
              <div class="card card-pad-lg card-hover card-spot" data-reveal>
                <div class="card-icon" style="width:46px;height:46px">${icon(s.icon).value}</div>
                <h3 style="font-size:var(--t-h3)">${s.t}</h3>
                <p class="ink-3" style="line-height:1.62">${s.d}</p>
                <code class="mono xs" style="display:block;margin-top:auto;padding:11px 13px;border-radius:var(--r-xs);background:var(--paper-sunken);color:var(--ink-2);word-break:break-all">${s.cmd}</code>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Permissions ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="panel-dark" data-reveal>
            <div class="split split-60" style="gap:clamp(28px,4vw,56px);align-items:center">
              <div>
                <p class="eyebrow">Control</p>
                <h2 style="margin-top:18px;font-size:var(--t-h2)">It cannot do anything you have not allowed.</h2>
                <p style="margin-top:20px;color:rgba(255,255,255,.66);line-height:1.68;max-width:52ch">
                  Reads, writes, shell commands, and network access each go through a permission layer.
                  Configure it once per repository, tighten it for CI, and audit every action afterwards.
                  There is no mode in which it decides for itself that a rule does not apply.
                </p>
                <div class="row" style="margin-top:26px">
                  <a class="link" href="/safety" style="color:#fff"><span>Our safety approach</span>${icon("arrow-ne", "icon").value}</a>
                </div>
              </div>
              <div class="stack stack-2">
                ${[
                  ["read", "Which paths it may open", "allow"],
                  ["write", "Which paths it may modify", "allow"],
                  ["commands", "Which shell commands may run", "prompt"],
                  ["network", "Outbound requests from tools", "deny"],
                  ["push_protected", "Direct pushes to protected branches", "deny"]
                ].map(([k, d, state]) => `
                  <div class="between" style="padding:12px 14px;border:1px solid rgba(255,255,255,.14);border-radius:var(--r-sm);gap:14px">
                    <div style="min-width:0">
                      <code class="mono" style="font-size:12px;color:#fff">${k}</code>
                      <div class="xs" style="color:rgba(255,255,255,.5);margin-top:2px">${d}</div>
                    </div>
                    <span class="badge ${state === "deny" ? "badge-danger" : state === "prompt" ? "badge-warning" : "badge-positive"}">${state}</span>
                  </div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "What teams ask first." }).value}
          ${accordion(FAQ_ITEMS, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "Point it at a repository.",
        body: "Install takes one command, and the first task is usually one you have been avoiding.",
        primary: { label: "Get started", href: "/docs/quickstart", icon: "arrow-ne" },
        secondary: { label: "Agent docs", href: "/docs/agents" }
      }).value}
    `;
  }
};
