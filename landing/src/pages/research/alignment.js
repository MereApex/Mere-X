/* ============================================================
   RESEARCH — alignment
   ============================================================ */

import { SAFETY_EVALS } from "../../data/models.js";
import { icon } from "../../lib/icons.js";
import { pct } from "../../lib/format.js";
import { pageHead, sectionHead, textLink, button, ctaBand, calloutBox, accordion, dataTable } from "../../components/ui.js";

const THREADS = [
  {
    icon: "target", title: "Specification gaming",
    body: "Models optimise what you measure, not what you meant. We build environments where the gap between the two is deliberately wide, then study which training regimes close it and which merely hide it.",
    open: "We can detect gaming in environments we designed. Detecting it in environments we did not design remains unsolved."
  },
  {
    icon: "scale", title: "Calibrated honesty",
    body: "A model that says 'I don't know' when it does not know is more useful than one that is right slightly more often. We train for calibration explicitly and measure it as a first-class capability rather than a safety afterthought.",
    open: "Calibration degrades under adversarial pressure faster than accuracy does. We do not fully understand why."
  },
  {
    icon: "eye", title: "Behaviour under pressure",
    body: "Alignment that holds in evaluation and fails under a determined user is not alignment. Red-team findings feed directly into training, and the corpus is versioned so we can tell whether a fix generalised or was memorised.",
    open: "Generalisation from red-team data is uneven. Some categories transfer; others need explicit coverage."
  },
  {
    icon: "orbit", title: "Long-horizon agency",
    body: "An agent that runs for six hours has six hours to drift. We study goal stability, context compaction, and the failure modes that only appear after several hundred steps.",
    open: "Most long-horizon failures are context-management failures rather than reasoning failures — which is good news, because those are fixable."
  },
  {
    icon: "users", title: "Value pluralism",
    body: "Many questions have no single correct answer across cultures and contexts. We train the model to represent disagreement rather than flatten it, and to be explicit about which framing it is using.",
    open: "Deciding when a question is genuinely contested and when it merely looks contested is a judgement we currently make by hand."
  },
  {
    icon: "shield", title: "Refusal calibration",
    body: "Over-refusal is a real harm. A model that will not discuss medication interactions with a nurse has failed, even if it failed safely. We measure over-refusal as carefully as we measure under-refusal.",
    open: "The two error rates trade off, and the exchange rate is a values judgement we make explicitly rather than let training decide."
  }
];

const FAQ_ITEMS = [
  { q: "Do you use reinforcement learning from human feedback?", a: "<p>Yes, alongside model-generated feedback and a constitutional-style critique loop. No single technique carries the alignment load; the mix is documented per release in the system card.</p>" },
  { q: "How do you avoid training the model to appear aligned?", a: "<p>We cannot fully. What we do is hold out evaluation environments the model has never seen during training, evaluate under distribution shift, and use interpretability tools to check whether the behaviour has an internal mechanism or is surface mimicry. Where the two disagree, we trust the mechanism.</p>" },
  { q: "What happens when alignment work conflicts with capability work?", a: "<p>The release gate is held by the safety organisation. Mere X 5.5 slipped six weeks over a red-team finding on tool-use chains — that is the mechanism working, and we document it rather than quietly absorbing the delay.</p>" },
  { q: "Is over-refusal actually a safety problem?", a: "<p>Yes. A model that refuses legitimate medical, legal, or security questions pushes people toward worse sources. We treat a false refusal as a harm with a real cost, not as the safe default.</p>" }
];

export default {
  title: "Alignment",
  description: "Training capable systems whose behaviour under pressure matches what was intended under calm.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Research", href: "/research" }, { label: "Alignment" }],
        eyebrow: "Research area",
        title: "Behaviour under pressure should match behaviour under calm.",
        lead: "Alignment is not a filter bolted on after training. It is a set of properties — honesty, calibration, goal stability, appropriate refusal — that have to be trained for and measured directly.",
        actions: `${button({ label: "Responsible Scaling Policy", href: "/safety/scaling-policy", icon: "arrow-right" }).value}
                  ${button({ label: "System cards", href: "/safety/system-cards", variant: "secondary", icon: "file" }).value}`
      }).value}

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Threads",
            title: "Six problems, and what remains open on each.",
            lead: "The open questions are listed because a research page without them is a brochure."
          }).value}
          <div class="grid g-2" data-stagger="80">
            ${THREADS.map((t) => `
              <article class="card card-pad-lg card-hover card-spot" data-reveal>
                <div class="card-icon" style="width:46px;height:46px">${icon(t.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${t.title}</h3>
                <p class="small ink-3" style="line-height:1.66">${t.body}</p>
                <p class="xs" style="margin-top:auto;padding-top:12px;padding-left:14px;border-left:2px solid var(--line-strong);color:var(--muted);line-height:1.55">
                  <strong style="font-weight:500;color:var(--ink-3)">Open:</strong> ${t.open}
                </p>
              </article>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Measured",
            title: "What the current model scores.",
            lead: "These figures come from the Mere X 5.5 system card and are re-run on every release.",
            action: textLink("Full system card", "/safety/system-cards").value
          }).value}
          ${dataTable({
            columns: [
              { key: "name", label: "Evaluation" },
              { key: "note", label: "What it measures" },
              { key: "value", label: "Score", align: "right", render: (r) => `${pct(r.value, 1)}${r.invert ? " ↓" : ""}` }
            ],
            rows: SAFETY_EVALS,
            hint: "↓ marks metrics where lower is better. Illustrative figures for this platform build."
          }).value}
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          <div class="panel-dark" data-reveal>
            <div class="split split-60" style="gap:clamp(28px,4vw,56px);align-items:center">
              <div>
                <p class="eyebrow">The trade-off we name</p>
                <h2 style="margin-top:18px;font-size:var(--t-h2)">Over-refusal is a harm too.</h2>
                <p style="margin-top:20px;color:rgba(255,255,255,.66);line-height:1.68;max-width:52ch">
                  A model that will not discuss medication interactions with a nurse, or explain an
                  exploit to the engineer patching it, has failed — safely, but it has failed. We publish
                  our over-refusal rate next to our refusal accuracy, because optimising one without
                  the other produces a model nobody wants to use.
                </p>
                <div class="row" style="margin-top:26px">
                  <a class="link" href="/safety/usage-policy" style="color:#fff"><span>What Mere X will and will not do</span>${icon("arrow-ne", "icon").value}</a>
                </div>
              </div>
              <div class="stack stack-3">
                ${[["99.4%", "Correct refusal of genuinely harmful requests"], ["0.8%", "Benign requests wrongly refused"], ["97.1%", "Resistance to a 41K-prompt adversarial suite"]].map(([v, l]) => `
                  <div style="padding:20px;border:1px solid rgba(255,255,255,.14);border-radius:var(--r-md)">
                    <div style="font-size:1.8rem;font-weight:300;letter-spacing:-.03em">${v}</div>
                    <div class="xs" style="color:rgba(255,255,255,.55);margin-top:5px;line-height:1.5">${l}</div>
                  </div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "What we get asked." }).value}
          ${accordion(FAQ_ITEMS, { open: 0 }).value}
          <div style="margin-top:26px;max-width:74ch">
            ${calloutBox("Alignment work at Mere X reports into the safety organisation, which holds the release gate. That reporting line is a deliberate structural choice, not an accident of the org chart.", { icon: "shield" }).value}
          </div>
        </div>
      </section>

      ${ctaBand({
        title: "Read how this reaches production.",
        body: "The Responsible Scaling Policy sets out what has to be true before a model ships.",
        primary: { label: "Responsible Scaling Policy", href: "/safety/scaling-policy", icon: "arrow-ne" },
        secondary: { label: "Our safety approach", href: "/safety" }
      }).value}
    `;
  }
};
