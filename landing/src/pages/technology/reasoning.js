/* ============================================================
   REASONING BUDGETS — the control that defines the family
   ============================================================ */

import { MODES } from "../../data/models.js";
import { icon } from "../../lib/icons.js";
import { moveSegThumb } from "../../lib/motion.js";
import { pageHead, sectionHead, textLink, button, codeBlock, ctaBand, calloutBox, accordion } from "../../components/ui.js";
import { onLeave } from "../../lib/router.js";

const DETAIL = {
  Fast: {
    cost: "1×", quality: 74, latencyMs: 300,
    when: "Formatting, classification, routing, short conversational turns, anything where the answer is retrieval rather than reasoning.",
    avoid: "Multi-step maths, novel code, anything where a wrong answer is expensive.",
    example: "Rewrite this paragraph in a plainer register."
  },
  Medium: {
    cost: "1.4×", quality: 86, latencyMs: 2000,
    when: "The default for production traffic. A short planning pass catches most reasoning slips for almost no latency.",
    avoid: "Nothing in particular — this is the safe default when you are unsure.",
    example: "Which of these three vendors best fits our constraints, and why?"
  },
  High: {
    cost: "3.1×", quality: 94,  latencyMs: 12000,
    when: "Code that has to compile, analysis that has to hold up, maths with more than two steps, and any review where being wrong is costly.",
    avoid: "Interactive UI where a user is watching a cursor blink.",
    example: "Find the race condition in this scheduler and propose a minimal fix."
  },
  "Extra High": {
    cost: "8–40×", quality: 99,
    latencyMs: 600000,
    when: "Research, long-horizon agents, and genuinely novel problems. Runs tools mid-thought and checkpoints its progress.",
    avoid: "Anything a human is waiting on synchronously.",
    example: "Reconstruct the regulatory history of this clause and tell me what changed and when."
  }
};

const PRINCIPLES = [
  { icon: "sliders", title: "Deliberation is a dial, not a mode switch", body: "You set a token budget. The model spends it planning, checking, and discarding — then answers. There is no separate 'reasoning model' to route to." },
  { icon: "eye", title: "Summaries, not raw thought", body: "The API returns a structured summary of how the conclusion was reached. Raw chain-of-thought stays internal, so it cannot leak into a user-facing surface." },
  { icon: "plug", title: "Thinking interleaves with tools", body: "In High and Extra High, the model can call a tool mid-deliberation, read the result, and continue thinking. The loop does not restart." },
  { icon: "target", title: "Budgets are ceilings, not quotas", body: "The model stops thinking when it is confident. An 8,000-token budget on an easy question typically spends 400 and bills for 400." }
];

const FAQ_ITEMS = [
  { q: "Am I charged for thinking tokens?", a: "<p>Yes — thinking tokens bill at the model's output rate, and appear separately in <code class=\"inline\">usage.thinking_tokens</code> so you can see exactly what deliberation cost. Because budgets are ceilings rather than quotas, easy requests inside a large budget cost very little.</p>" },
  { q: "Which mode should I default to?", a: "<p>Medium. It is close enough to High on most production traffic that the difference rarely shows in an eval, and the latency cost is around two seconds. Move individual call sites up to High when your evaluation says the extra deliberation actually changes the answer.</p>" },
  { q: "Can I set a budget without picking a mode?", a: "<p>Yes. Passing <code class=\"inline\">thinking.budget_tokens</code> selects the mode implicitly: 0 is Fast, up to 4K is Medium, up to 32K is High, and above that is Extra High on Apex. Named modes exist because they are easier to reason about in code review.</p>" },
  { q: "Does temperature still apply?", a: "<p>Below 4,000 thinking tokens, yes. Above that the sampler is constrained during deliberation and <code class=\"inline\">temperature</code> is ignored for the thinking phase; it still applies to the final answer.</p>" },
  { q: "What happens if the budget runs out?", a: "<p>The model is told the budget is exhausted and produces the best answer it has, with <code class=\"inline\">stop_reason: \"thinking_budget\"</code>. It never truncates mid-sentence, and it never silently returns a partial conclusion as if it were complete.</p>" },
  { q: "Can I stream the thinking?", a: "<p>You receive <code class=\"inline\">thinking_delta</code> events carrying progress signals and summary fragments — enough to render a genuine 'working' state — without exposing raw reasoning text.</p>" }
];

export default {
  title: "Reasoning budgets",
  description: "Four deliberation depths on one model. How reasoning budgets work in Mere X, what they cost, and when to spend them.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Technology", href: "/technology" }, { label: "Reasoning modes" }],
        eyebrow: "Core concept",
        title: "Thinking is a resource. You decide how much to spend.",
        lead: "Most systems make you choose a different model when a problem gets hard. Mere X makes you choose a budget — on the same model, in the same request, with the same tools available.",
        actions: `${button({ label: "Try it in the playground", href: "/console/playground", icon: "play" }).value}
                  ${button({ label: "Read the docs", href: "/docs/reasoning", variant: "secondary", icon: "book" }).value}`
      }).value}

      <!-- ---- Interactive explorer ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Explore", title: "The four depths." }).value}
          <div class="card card-pad-lg" data-reveal>
            <div class="seg" data-mode-seg role="tablist" style="align-self:flex-start">
              <span class="seg-thumb"></span>
              ${MODES.map((mode, index) => `<button class="seg-btn ${index === 1 ? "is-active" : ""}" role="tab" data-mode="${mode.name}">${mode.name}</button>`).join("")}
            </div>

            <div class="split split-40" style="margin-top:28px;gap:clamp(24px,3vw,44px);align-items:start">
              <div data-mode-body style="min-height:230px"></div>
              <div>
                <div class="stack stack-4">
                  <div>
                    <div class="between xs muted"><span>Relative quality</span><span data-q class="mono">—</span></div>
                    <div class="meter" style="margin-top:8px"><div class="meter-fill" data-q-bar></div></div>
                  </div>
                  <div>
                    <div class="between xs muted"><span>Time to answer</span><span data-l class="mono">—</span></div>
                    <div class="meter" style="margin-top:8px"><div class="meter-fill warning" data-l-bar></div></div>
                  </div>
                  <div>
                    <div class="between xs muted"><span>Relative cost</span><span data-c class="mono">—</span></div>
                    <div class="meter" style="margin-top:8px"><div class="meter-fill accent" data-c-bar></div></div>
                  </div>
                </div>
                <div style="margin-top:24px" data-mode-code></div>
              </div>
            </div>
          </div>
          <p class="xs muted" style="margin-top:14px">Quality is a blended score across our eight capability suites, normalised to the Fast baseline. Illustrative figures.</p>
        </div>
      </section>

      <!-- ---- Principles ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "How it works", title: "Four things that make budgets useful rather than decorative." }).value}
          <div class="grid g-2" data-stagger="90">
            ${PRINCIPLES.map((p) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(p.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${p.title}</h3>
                <p class="small muted" style="line-height:1.6">${p.body}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Code ---- -->
      <section class="section">
        <div class="shell shell-wide">
          <div class="split split-60" style="gap:clamp(24px,3vw,48px);align-items:center">
            <div data-reveal="left">
              ${sectionHead({ eyebrow: "In code", title: "One parameter." }).value}
              <p class="lead measure">Set <code class="inline">thinking.budget_tokens</code> and the model does the rest. Stream <code class="inline">thinking_delta</code> events if you want to show progress; read <code class="inline">usage.thinking_tokens</code> to see what it actually spent.</p>
              <div style="margin-top:26px">
                ${calloutBox("Budgets compose with tools. In High and Extra High the model can call a tool, read the result, and keep thinking — the deliberation and the tool loop are the same loop.", { variant: "accent", icon: "plug" }).value}
              </div>
            </div>
            <div data-reveal="right">
              ${codeBlock({
                Python: `message = client.messages.create(
    model="mere-apex-4",
    max_tokens=8192,
    thinking={"type": "enabled", "budget_tokens": 32_000},
    messages=[{"role": "user", "content": prompt}],
)

print(message.usage.thinking_tokens)   # what it actually spent
print(message.thinking.summary)        # how it got there
print(message.content[0].text)         # the answer`,
                TypeScript: `const message = await client.messages.create({
  model: "mere-apex-4",
  max_tokens: 8192,
  thinking: { type: "enabled", budget_tokens: 32_000 },
  messages: [{ role: "user", content: prompt }],
});

console.log(message.usage.thinking_tokens);
console.log(message.thinking.summary);
console.log(message.content[0].text);`,
                cURL: `curl https://api.merex.ai/v1/messages \\
  -H "x-api-key: $MERE_X_API_KEY" \\
  -H "mere-x-version: 2026-06-18" \\
  -d '{
    "model": "mere-apex-4",
    "max_tokens": 8192,
    "thinking": {"type": "enabled", "budget_tokens": 32000},
    "messages": [{"role": "user", "content": "..."}]
  }'`
              }).value}
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Choosing ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Choosing",
            title: "A rule of thumb that holds up.",
            lead: "Start every call site at Medium. Move it when your evaluation — not your intuition — says the extra deliberation changes the answer."
          }).value}
          <div class="table-wrap" data-reveal>
            <table class="data">
              <thead><tr><th>If the request…</th><th>Use</th><th>Because</th></tr></thead>
              <tbody>
                <tr><td>has a user watching a cursor</td><td><strong>Fast</strong></td><td class="small muted">Perceived latency dominates perceived quality below about 400 ms.</td></tr>
                <tr><td>is ordinary product traffic</td><td><strong>Medium</strong></td><td class="small muted">Catches most reasoning slips for roughly two seconds.</td></tr>
                <tr><td>produces code that must run</td><td><strong>High</strong></td><td class="small muted">Self-checking finds the compile error before your CI does.</td></tr>
                <tr><td>would take a person an hour</td><td><strong>High</strong></td><td class="small muted">Below the threshold where Extra High's overhead pays for itself.</td></tr>
                <tr><td>would take a person a day</td><td><strong>Extra High</strong></td><td class="small muted">Tool use, retrieval, and checkpointing become worth the cost.</td></tr>
                <tr><td>is a batch job with no deadline</td><td><strong>High + Batch</strong></td><td class="small muted">Half price, and nobody is waiting.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ---- FAQ ---- -->
      <section class="section">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "Things people ask." }).value}
          ${accordion(FAQ_ITEMS, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "Watch a budget change an answer.",
        body: "The playground runs the same prompt at two depths side by side.",
        primary: { label: "Open the playground", href: "/console/playground", icon: "arrow-ne" },
        secondary: { label: "Reasoning docs", href: "/docs/reasoning" }
      }).value}
    `;
  },

  mount(root) {
    const seg = root.querySelector("[data-mode-seg]");
    const bodyHost = root.querySelector("[data-mode-body]");
    const codeHost = root.querySelector("[data-mode-code]");
    if (!seg || !bodyHost) return;

    const maxLatency = Math.log10(600000);

    const paint = (name) => {
      const mode = MODES.find((m) => m.name === name);
      const detail = DETAIL[name];
      bodyHost.innerHTML = `
        <p class="eyebrow bare">${mode.budget}</p>
        <h3 style="font-size:var(--t-h3);margin-top:12px">${mode.name}</h3>
        <p class="small ink-3" style="margin-top:12px;line-height:1.65">${mode.summary}</p>
        <div class="stack stack-3" style="margin-top:22px">
          <div><span class="xs muted upper">Reach for it when</span><p class="small" style="margin-top:5px">${detail.when}</p></div>
          <div><span class="xs muted upper">Avoid it when</span><p class="small" style="margin-top:5px">${detail.avoid}</p></div>
          <div><span class="xs muted upper">Typical prompt</span><p class="small mono" style="margin-top:5px;color:var(--ink-3)">${detail.example}</p></div>
        </div>`;

      root.querySelector("[data-q]").textContent = `${detail.quality}`;
      root.querySelector("[data-l]").textContent = mode.latency;
      root.querySelector("[data-c]").textContent = detail.cost;
      requestAnimationFrame(() => {
        root.querySelector("[data-q-bar]").style.width = `${detail.quality}%`;
        root.querySelector("[data-l-bar]").style.width = `${Math.min(100, (Math.log10(detail.latencyMs) / maxLatency) * 100)}%`;
        root.querySelector("[data-c-bar]").style.width = `${{ Fast: 8, Medium: 14, High: 34, "Extra High": 100 }[name]}%`;
      });

      codeHost.innerHTML = `<div class="secret-reveal" style="font-size:11.5px;line-height:1.7">thinking: { type: "${name === "Fast" ? "disabled" : "enabled"}"${name === "Fast" ? "" : `, budget_tokens: ${{ Medium: "4_000", High: "32_000", "Extra High": "256_000" }[name]}`} }</div>`;
    };

    seg.addEventListener("click", (event) => {
      const btn = event.target.closest(".seg-btn");
      if (!btn) return;
      seg.querySelectorAll(".seg-btn").forEach((node) => node.classList.toggle("is-active", node === btn));
      moveSegThumb(seg);
      paint(btn.dataset.mode);
    });

    paint("Medium");
    const thumbFrame = requestAnimationFrame(() => moveSegThumb(seg));
    const onResize = () => moveSegThumb(seg);
    window.addEventListener("resize", onResize, { passive: true });
    onLeave(() => {
      cancelAnimationFrame(thumbFrame);
      window.removeEventListener("resize", onResize);
    });
  }
};
