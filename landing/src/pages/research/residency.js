/* ============================================================
   RESEARCH — residency & fellows
   ============================================================ */

import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, accordion, calloutBox, statTile, personCard } from "../../components/ui.js";

const TIMELINE = [
  { date: "Applications open", title: "1 October 2026", body: "A short written application: your CV, one page on a problem you find interesting, and a code or writing sample. No cover letter, and no requirement to have published." },
  { date: "First review", title: "November 2026", body: "Every application is read by two researchers. We reply to everyone, including rejections, with at least a sentence of why." },
  { date: "Technical conversation", title: "December 2026", body: "Ninety minutes on a problem, not a whiteboard quiz. You may use documentation, a model, and anything else you would use at work." },
  { date: "Research discussion", title: "January 2027", body: "You present something you have thought about — from the residency application or from your own work — and we argue about it for an hour." },
  { date: "Offers", title: "February 2027", body: "Decisions within two weeks of the final conversation. We do not use exploding offers." },
  { date: "Cohort begins", title: "June 2027", body: "Twelve months, paid at full research-scientist scale, in San Francisco or London." }
];

const WHAT_YOU_GET = [
  { icon: "microscope", t: "A real research problem", d: "Not a support role. Residents own a question, publish under their own name, and present at the weekly research meeting like everyone else." },
  { icon: "users", t: "Two mentors", d: "One in your area and one outside it. The second is deliberate — most useful research feedback comes from someone who does not share your assumptions." },
  { icon: "cpu", t: "Compute", d: "A meaningful allocation, not scraps. Residents have run experiments that consumed more compute than some published papers." },
  { icon: "graduation", t: "No teaching load", d: "Twelve months of research. That is the whole job." },
  { icon: "briefcase", t: "A real path forward", d: "Roughly 60% of residents have converted to full-time roles. The rest have gone to PhDs, other labs, or back to industry, and we help with all three." },
  { icon: "globe", t: "Visa sponsorship", d: "For San Francisco and London. We handle it, and we start early enough that it is not a scramble." }
];

const FAQ_ITEMS = [
  { q: "Do I need a PhD?", a: "<p>No. Roughly a third of our residents have one. We have taken people from physics, software engineering, linguistics, and one from professional poker. What we look for is evidence that you can hold a hard problem in your head for a long time.</p>" },
  { q: "Do I need publications?", a: "<p>No. A blog post that thinks carefully about something is stronger evidence than a fourth-author paper. Send whatever best represents how you think.</p>" },
  { q: "Can I do it remotely?", a: "<p>No. The residency is in person in San Francisco or London. Most of what makes it work is the unplanned conversation, and we have not found a way to reproduce that remotely.</p>" },
  { q: "What if I am mid-career?", a: "<p>Apply. 'Early career' means early in AI research, not early in life. Several residents have arrived with a decade of engineering behind them.</p>" },
  { q: "Is it paid?", a: "<p>Yes, at the same scale as a first-year research scientist, with the same equity, health cover, and relocation support. A residency that does not pay properly selects for people who can afford it, which selects for the wrong thing.</p>" },
  { q: "What happens at the end?", a: "<p>We make a decision about a full-time offer by month nine, so you have three months of certainty either way. If it is a no, we help you land somewhere — introductions, references, and time to interview.</p>" }
];

const ALUMNI = [
  { name: "Jun Park", role: "Resident 2024 · now Research Scientist, long context", bio: "Built the adversarial multi-needle suite that became MRCR 8-needle during the residency." },
  { name: "Sofia Bianchi", role: "Resident 2024 · now PhD, ETH Zürich", bio: "Worked on feature stability across checkpoints; the result became a chapter of her thesis." },
  { name: "Kwame Osei", role: "Resident 2025 · now Research Engineer, evaluation", bio: "Arrived from backend engineering with no publications. Now owns the contamination screening pipeline." }
];

export default {
  title: "Research residency",
  description: "A paid twelve-month research residency at Mere X for people early in AI research.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Research", href: "/research" }, { label: "Residency" }],
        eyebrow: "2027 cohort",
        title: "Twelve months to find out whether this is your field.",
        lead: "A paid residency for people early in AI research — including people arriving from somewhere else entirely. No PhD required, no publications required, and no teaching load.",
        actions: `${button({ label: "Apply from 1 October", href: "/company/careers", icon: "arrow-ne", magnetic: true }).value}
                  ${button({ label: "Read our research", href: "/research/publications", variant: "secondary", icon: "book" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="grid g-4" data-stagger="90">
            ${statTile({ value: 12, label: "Months", note: "Full research-scientist pay" }).value}
            ${statTile({ value: 14, label: "Places", note: "2027 cohort" }).value}
            ${statTile({ value: 60, suffix: "%", label: "Convert to full-time", note: "Across three cohorts" }).value}
            ${statTile({ value: 2, label: "Mentors each", note: "One inside your area, one outside" }).value}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "What you get", title: "Six things, stated plainly." }).value}
          <div class="grid g-3" data-stagger="70">
            ${WHAT_YOU_GET.map((item) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(item.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${item.t}</h3>
                <p class="small muted" style="line-height:1.62">${item.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(28px,4vw,56px);align-items:start">
            <div data-reveal="left">
              <p class="eyebrow">Process</p>
              <h2 style="margin-top:18px">Five months, and we reply to everyone.</h2>
              <p class="lead" style="margin-top:18px">
                No exploding offers, no whiteboard algorithms, and no cover letter. The technical
                conversation uses documentation and a model, because that is how the work actually happens.
              </p>
              <div style="margin-top:24px">
                ${calloutBox("Every application is read by two researchers, and every applicant gets a reply with at least a sentence of reasoning. It costs us time we would rather spend on research, and we do it anyway.", { variant: "accent", icon: "mail" }).value}
              </div>
            </div>
            <div class="timeline" data-reveal="right">
              ${TIMELINE.map((step) => `
                <div class="tl-item">
                  <div class="tl-date">${step.date}</div>
                  <div class="tl-title">${step.title}</div>
                  <p class="tl-body">${step.body}</p>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Alumni", title: "Where people went." }).value}
          <div class="grid g-3" data-stagger="90">
            ${ALUMNI.map((person) => personCard(person).value).join("")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell">
          ${sectionHead({ eyebrow: "Questions", title: "Before you apply." }).value}
          ${accordion(FAQ_ITEMS, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        eyebrow: "2027 cohort",
        title: "Applications open 1 October 2026.",
        body: "A CV, one page on a problem you find interesting, and a sample of your work.",
        primary: { label: "See all open roles", href: "/company/careers", icon: "arrow-ne" },
        secondary: { label: "Ask a question", href: "/company/contact" }
      }).value}
    `;
  }
};
