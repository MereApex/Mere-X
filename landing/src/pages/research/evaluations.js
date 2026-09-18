/* ============================================================
   RESEARCH — evaluations
   ============================================================ */

import { BENCHMARKS, BENCH_SERIES } from "../../data/models.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, benchBars, calloutBox, dataTable, codeBlock, accordion } from "../../components/ui.js";

const PROBLEMS = [
  { icon: "scan", t: "Contamination", d: "A benchmark that leaked into pretraining measures memorisation. We screen every suite with a 13-gram overlap detector and publish the exclusion count alongside the score." },
  { icon: "refresh", t: "Variance", d: "Single-run numbers are noise dressed as signal. Everything we publish is a five-run mean, and where the spread exceeds a point we say so rather than reporting the best run." },
  { icon: "target", t: "Construct validity", d: "Most suites measure something adjacent to what they claim. We document what each one actually correlates with in production, including where the correlation is weak." },
  { icon: "eye", t: "Grader bias", d: "Model-graded evaluations inherit the grader's blind spots. We calibrate every automatic grader against expert human raters and publish the disagreement rate." },
  { icon: "clock", t: "Saturation", d: "A suite everyone scores 95% on has stopped being informative. We retire benchmarks on a schedule and say what replaced them." },
  { icon: "users", t: "Coverage", d: "English-language, Western-context evaluation systematically overstates capability elsewhere. Twenty-two languages is better than one, and still not enough." }
];

const SUITES = [
  { name: "GPQA Diamond", measures: "Graduate-level reasoning in physics, biology, chemistry", contaminated: "0.4%", grader: "Exact match", retires: "—" },
  { name: "SWE-bench Verified", measures: "Real GitHub issues resolved with a passing test", contaminated: "1.1%", grader: "Test execution", retires: "—" },
  { name: "AIME 2026", measures: "Competition mathematics, released after cutoff", contaminated: "0%", grader: "Exact match", retires: "2027" },
  { name: "TAU-bench retail", measures: "Multi-turn agentic tool use against a simulated user", contaminated: "0.2%", grader: "State comparison", retires: "—" },
  { name: "MRCR 8-needle", measures: "Adversarial long-context retrieval to 1M tokens", contaminated: "0%", grader: "Exact match", retires: "—" },
  { name: "MMMLU", measures: "Knowledge and reasoning across 22 languages", contaminated: "2.8%", grader: "Exact match", retires: "2027" },
  { name: "MMMU", measures: "Visual reasoning over diagrams, charts, and figures", contaminated: "0.9%", grader: "Model-graded, human-calibrated", retires: "—" },
  { name: "IFEval strict", measures: "Verifiable instruction following", contaminated: "0.1%", grader: "Programmatic", retires: "—" }
];

const FAQ_ITEMS = [
  { q: "Why not just publish the highest number you got?", a: "<p>Because it is not true, and because anyone who deploys on the basis of it will discover that within a week. A five-run mean with a stated spread is less impressive and considerably more useful.</p>" },
  { q: "How do you handle a benchmark you score badly on?", a: "<p>We publish it. The full report includes the suites where the current models underperform the previous generation, and the system card enumerates task categories the model still fails outright.</p>" },
  { q: "Do you evaluate in the mode that flatters the model?", a: "<p>No. Unless stated otherwise every model is evaluated in High mode, including Nyx, where High is not where it looks best. Mixing modes across a comparison table would make the table meaningless.</p>" },
  { q: "Can I run these suites myself?", a: "<p>Yes. The harness, prompts, and parsing logic are open. The cookbook has a recipe for pointing it at your own data, which is a far better predictor of production behaviour than any public benchmark.</p>" }
];

export default {
  title: "Evaluations",
  description: "How Mere X measures capability and harm — methodology, contamination screening, and the limits of our own numbers.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Research", href: "/research" }, { label: "Evaluations" }],
        eyebrow: "Research area",
        title: "Measurement is the bottleneck.",
        lead: "Most disagreements about what a model can do are really disagreements about how it was measured. This group builds suites that resist contamination, gaming, and our own wishful thinking.",
        actions: `${button({ label: "Benchmark results", href: "/technology/benchmarks", icon: "arrow-right" }).value}
                  ${button({ label: "Build your own evals", href: "/docs/cookbook", variant: "secondary", icon: "flask" }).value}`
      }).value}

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Six problems", title: "What goes wrong with evaluation." }).value}
          <div class="grid g-3" data-stagger="70">
            ${PROBLEMS.map((p) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(p.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${p.t}</h3>
                <p class="small muted" style="line-height:1.62">${p.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "The suites",
            title: "What we run, and what each one is worth.",
            lead: "Contamination rate is the share of items excluded after 13-gram screening against the pretraining corpus."
          }).value}
          ${dataTable({
            columns: [
              { key: "name", label: "Suite", render: (r) => `<strong>${r.name}</strong>` },
              { key: "measures", label: "What it measures" },
              { key: "contaminated", label: "Excluded", align: "right" },
              { key: "grader", label: "Grader" },
              { key: "retires", label: "Retires" }
            ],
            rows: SUITES
          }).value}
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Results",
            title: "Current scores.",
            action: textLink("Full report", "/technology/benchmarks").value
          }).value}
          <div class="card card-pad-lg" data-reveal>
            ${benchBars(BENCHMARKS, BENCH_SERIES).value}
            <p class="xs muted" style="margin-top:24px;padding-top:16px;border-top:1px solid var(--line)">
              Five-run mean, temperature 1, High mode. Figures on this site are illustrative for the Mere X platform build.
            </p>
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(24px,3vw,48px);align-items:center">
            <div data-reveal="left">
              ${sectionHead({ eyebrow: "Your evals matter more", title: "Public benchmarks predict production badly." }).value}
              <p class="lead measure">
                The best predictor of whether Mere X will work for your problem is fifty examples of
                your problem, graded by someone who knows what good looks like. Our harness is open so
                you can build that in an afternoon.
              </p>
              <div style="margin-top:22px">
                ${calloutBox("Using a model as a grader is fine — as long as you calibrate it against human raters and publish the disagreement rate. An uncalibrated LLM judge is a random number generator with good manners.", { variant: "accent", icon: "scale" }).value}
              </div>
              <div class="row" style="margin-top:22px">${textLink("Evaluation cookbook", "/docs/cookbook").value}</div>
            </div>
            <div data-reveal="right">
              ${codeBlock({
                Python: `from mere_x.evals import Suite, Case, judge

suite = Suite(
    name="support-triage",
    cases=[Case(input=row["ticket"], expect=row["queue"]) for row in golden],
)

report = suite.run(
    model="mere-orion-3",
    thinking={"type": "enabled", "budget_tokens": 4000},
    grader=judge.exact_match,
    runs=5,                      # report the mean and the spread
)

print(report.mean, report.stdev)
print(report.failures[:5])       # look at these before shipping`
              }).value}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "On honesty in reporting." }).value}
          ${accordion(FAQ_ITEMS, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "Read the full benchmark report.",
        body: "Every suite, every model, with methodology and the results that are not flattering.",
        primary: { label: "Benchmarks", href: "/technology/benchmarks", icon: "arrow-ne" },
        secondary: { label: "Publications", href: "/research/publications" }
      }).value}
    `;
  }
};
