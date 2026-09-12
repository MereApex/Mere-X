/* ============================================================
   BENCHMARKS — the full evaluation report
   ============================================================ */

import { BENCHMARKS, BENCH_SERIES, SAFETY_EVALS, MODELS } from "../../data/models.js";
import { icon } from "../../lib/icons.js";
import { pct } from "../../lib/format.js";
import { pageHead, sectionHead, textLink, button, ctaBand, benchBars, calloutBox, dataTable, accordion } from "../../components/ui.js";

const METHOD = [
  { icon: "refresh", t: "Five runs, reported with variance", d: "Every number is the mean of five independent runs at temperature 1. Where the spread exceeds one point we say so rather than reporting the best run." },
  { icon: "scan", t: "Contamination screening", d: "Each suite is checked against the pretraining corpus with a 13-gram overlap detector. Contaminated items are excluded and the exclusion count is published." },
  { icon: "file", t: "Prompts published", d: "The exact prompt, system message, and parsing logic for every suite is in the evaluation repository. If you cannot reproduce a number, that is a bug we want reported." },
  { icon: "scale", t: "No cherry-picked mode", d: "Unless stated, every model is evaluated in High mode — including the smaller ones, where that is not flattering." }
];

const LONG_CONTEXT = [
  { depth: "10K", apex: 100, orion: 100, nyx: 99.8 },
  { depth: "50K", apex: 100, orion: 99.9, nyx: 98.4 },
  { depth: "128K", apex: 99.8, orion: 99.4, nyx: 96.1 },
  { depth: "256K", apex: 99.6, orion: 98.8, nyx: 93.2 },
  { depth: "512K", apex: 99.3, orion: 98.1, nyx: null },
  { depth: "1M", apex: 99.1, orion: 97.4, nyx: null }
];

const NOTES = [
  { q: "Why don't you publish parameter counts alongside these?", a: "<p>Because the comparison it invites is misleading. A sparse model and a dense model with the same nominal count behave nothing alike, and the number tells you nothing about whether the model will work for your task. Throughput, latency, context, and evaluation results do.</p>" },
  { q: "Where does Mere X 5.5 still lose?", a: "<p>Several places, and we would rather say so. Symbolic integration beyond undergraduate level; multi-hop spatial reasoning over floor plans; sustained consistency in fiction past roughly 40,000 words; and any task requiring genuinely current information without a search tool attached. The system card enumerates these with examples.</p>" },
  { q: "Do you evaluate against competitors?", a: "<p>Internally, yes; publicly, no. Cross-lab comparisons are almost always run under conditions that favour whoever published them, and we do not think ours would be an exception. We publish our own numbers, our methodology, and our prompts so you can run the comparison yourself.</p>" },
  { q: "How often are these refreshed?", a: "<p>On every model release, and whenever a suite is revised. The date on each table is the date the run happened, not the date the page was edited.</p>" }
];

export default {
  title: "Benchmarks",
  description: "Full evaluation results for the Mere X 5.5 family, with methodology, variance, and the tasks the models still fail.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Technology", href: "/technology" }, { label: "Benchmarks" }],
        eyebrow: "Evaluations · June 2026",
        title: "Results, methodology, and the parts that are not flattering.",
        lead: "Benchmarks are a weak proxy for usefulness. We publish them anyway, with enough surrounding detail that you can judge how much weight they deserve.",
        actions: `${button({ label: "Evaluation methodology", href: "/research/evaluations", icon: "arrow-right" }).value}
                  ${button({ label: "System cards", href: "/safety/system-cards", variant: "secondary", icon: "file" }).value}`
      }).value}

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Capability suites", title: "Eight suites, four models." }).value}
          <div class="card card-pad-lg" data-reveal>
            ${benchBars(BENCHMARKS, BENCH_SERIES).value}
          </div>
          <p class="xs muted" style="margin-top:16px">
            Scores are percentages. All models evaluated in High mode, temperature 1, five-run mean.
            Figures on this site are illustrative for the Mere X platform build.
          </p>
        </div>
      </section>

      <!-- ---- Long context ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Long context",
            title: "Recall at depth.",
            lead: "Eight needles, adversarial distractors that share surface form with the target, uniformly distributed insertion points. Single-needle tests overstate this considerably."
          }).value}
          ${dataTable({
            columns: [
              { key: "depth", label: "Context depth" },
              { key: "apex", label: "Mere Apex 5.5", align: "right", render: (r) => `${r.apex.toFixed(1)}%` },
              { key: "orion", label: "Mere Orion 5.5", align: "right", render: (r) => `${r.orion.toFixed(1)}%` },
              { key: "nyx", label: "Mere Nyx 5.5", align: "right", render: (r) => (r.nyx == null ? '<span class="muted">beyond window</span>' : `${r.nyx.toFixed(1)}%`) }
            ],
            rows: LONG_CONTEXT
          }).value}
          <div style="margin-top:20px;max-width:74ch">
            ${calloutBox("Recall is not the same as reasoning over what was recalled. A model that finds every needle can still fail to synthesise them, which is why the agentic suites matter more than this table does.", { icon: "info" }).value}
          </div>
        </div>
      </section>

      <!-- ---- Safety evals ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Safety",
            title: "Behaviour under pressure.",
            action: textLink("Our safety approach", "/safety").value
          }).value}
          <div class="grid g-auto" data-stagger="80">
            ${SAFETY_EVALS.map((row) => `
              <div class="card card-hover" data-reveal>
                <div class="between" style="align-items:flex-start">
                  <span class="stat-value" style="font-size:2.1rem">${pct(row.value, 1)}</span>
                  ${row.invert ? '<span class="badge badge-plain">lower is better</span>' : ""}
                </div>
                <div style="font-size:var(--t-sm);color:var(--ink);margin-top:2px">${row.name}</div>
                <p class="xs muted" style="line-height:1.5">${row.note}</p>
                <div class="meter" style="margin-top:8px"><div class="meter-fill ${row.invert ? "warning" : "positive"}" style="width:${(row.invert ? 1 - row.value : row.value) * 100}%"></div></div>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Methodology ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Methodology",
            title: "How these numbers were produced.",
            lead: "A benchmark result without its methodology is a marketing claim. Here is ours."
          }).value}
          <div class="grid g-4" data-stagger="80">
            ${METHOD.map((m) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(m.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${m.t}</h3>
                <p class="small muted" style="line-height:1.6">${m.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Latency & throughput ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Performance", title: "Speed, measured from the caller." }).value}
          ${dataTable({
            columns: [
              { key: "name", label: "Model", render: (r) => `<a class="link-plain" href="/technology/models/${r.id}"><strong>${r.name}</strong></a>` },
              { key: "latency", label: "Median first token", align: "right" },
              { key: "throughput", label: "Output throughput", align: "right" },
              { key: "modes", label: "Modes", render: (r) => (r.modes.length ? r.modes.join(" · ") : "—") }
            ],
            rows: MODELS
          }).value}
          <p class="xs muted" style="margin-top:14px">Measured from us-east with a 2,000-token prompt in Medium mode, p50 over 10,000 requests.</p>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell">
          ${sectionHead({ eyebrow: "Notes", title: "What these numbers do not tell you." }).value}
          ${accordion(NOTES, { open: 1 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "Run your own evaluation.",
        body: "Our harness is open, and the cookbook has a working recipe for grading your prompts against your data.",
        primary: { label: "Evaluation cookbook", href: "/docs/cookbook", icon: "arrow-ne" },
        secondary: { label: "Research methodology", href: "/research/evaluations" }
      }).value}
    `;
  }
};
