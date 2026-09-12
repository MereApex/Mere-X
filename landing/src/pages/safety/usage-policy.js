/* ============================================================
   SAFETY — usage policy
   ============================================================ */

import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, calloutBox, accordion } from "../../components/ui.js";

const PROHIBITED = [
  { icon: "alert", t: "Weapons and mass harm", d: "Developing biological, chemical, nuclear, or radiological weapons; designing or acquiring conventional weapons for illegal use; planning attacks on infrastructure or people." },
  { icon: "code", t: "Malicious cyber activity", d: "Creating malware, ransomware, or exploits for unauthorised use; credential harvesting; building tooling whose primary purpose is compromising systems you do not own or have permission to test." },
  { icon: "user", t: "Exploitation of minors", d: "Any sexualisation of minors, grooming, or generation of child sexual abuse material. Reported to the relevant authorities without exception." },
  { icon: "fingerprint", t: "Deception and fraud", d: "Impersonating a real person or organisation without consent; generating fraudulent documents, reviews, or identities; romance and investment scams; academic ghostwriting sold as original." },
  { icon: "users", t: "Manipulation at scale", d: "Coordinated inauthentic behaviour, astroturfing, political microtargeting designed to deceive, and mass-generated content presented as independent voices." },
  { icon: "eye", t: "Surveillance and profiling", d: "Facial recognition of individuals without consent; predictive policing; tracking or profiling by race, religion, sexuality, health status, or political affiliation." },
  { icon: "scale", t: "Consequential decisions without a human", d: "Fully automated decisions on employment, credit, housing, insurance, education, or benefits. Mere X may assist a reviewer; it may not be the reviewer." },
  { icon: "heart", t: "Unsupervised professional advice", d: "Presenting model output as medical, legal, financial, or psychological advice from a licensed professional, without a qualified human in the loop." }
];

const HIGH_CARE = [
  { t: "Healthcare", d: "Clinical documentation, literature review, and patient communication drafting are fine with clinician review. Diagnosis and treatment decisions are not." },
  { t: "Legal", d: "Research, drafting, and review are fine under supervision by a qualified practitioner. Filing generated work unreviewed is not." },
  { t: "Security research", d: "Explicitly permitted with authorisation. We support vulnerability research, red-teaming, and CTF work — say what the context is and the model will engage." },
  { t: "Elections", d: "Voter information and civic education are permitted. Generating persuasive political content at scale, or content impersonating a candidate, is not." },
  { t: "Content moderation", d: "Permitted and encouraged, including exposure to harmful content for classification purposes." },
  { t: "Minors", d: "Products aimed at under-18s require an age-appropriate configuration and additional review. Talk to us before launching." }
];

const FAQ_ITEMS = [
  { q: "How is the policy enforced?", a: "<p>Automated classification flags potential violations; a human reviews before any account action. First-time low-severity issues get a warning and an explanation. Severe violations — CSAM, weapons development, coordinated fraud — result in immediate termination and, where legally required, a report.</p>" },
  { q: "Can I appeal an enforcement action?", a: "<p>Yes. Every action includes the specific policy section and an appeal link. Appeals are reviewed by someone who was not involved in the original decision, within five business days. Around 12% of appeals succeed, which we publish in the transparency report.</p>" },
  { q: "Does the model refuse everything in the prohibited list?", a: "<p>It refuses most of it, but refusal is not the same as policy. The model is one control among several; you are responsible for your application's use regardless of whether a given prompt happened to get through.</p>" },
  { q: "What if my legitimate use case gets refused?", a: "<p>Tell us. Over-refusal is a bug we track. Security researchers, clinicians, and content moderators are the most common false positives, and deployment-level threshold tuning usually resolves it.</p>" },
  { q: "Do these rules apply to open-weight models?", a: "<p>We do not currently release open weights. If we do, the policy for them will be published alongside, and we will be explicit about which controls are enforceable and which are not.</p>" }
];

export default {
  title: "Usage policy",
  description: "What Mere X may and may not be used for, how the policy is enforced, and how to appeal.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Safety", href: "/safety" }, { label: "Usage policy" }],
        eyebrow: "Effective 18 June 2026",
        title: "What Mere X may and may not be used for.",
        lead: "Written so a person building something can tell which side of the line they are on. Where a rule is genuinely ambiguous we say so, rather than leaving you to find out through enforcement.",
        actions: `${button({ label: "Report a violation", href: "/company/contact", icon: "arrow-ne" }).value}
                  ${button({ label: "Transparency reports", href: "/safety/transparency", variant: "secondary", icon: "eye" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell">
          <div class="prose" data-reveal>
            <p class="lead">
              This policy applies to everyone using Mere X — through the assistant, the API, or any
              product built on it. It is enforced against applications, not just prompts: an application
              designed to do a prohibited thing violates the policy even if each individual request
              looks innocuous.
            </p>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Prohibited",
            title: "Eight things you may not do.",
            lead: "These are hard limits. There is no tier, contract, or use case that unlocks them."
          }).value}
          <div class="grid g-2" data-stagger="70">
            ${PROHIBITED.map((item) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon" style="color:var(--danger);border-color:var(--danger-soft);background:var(--danger-soft)">${icon(item.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${item.t}</h3>
                <p class="small ink-3" style="line-height:1.62">${item.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Permitted, with care",
            title: "Six areas where the line is worth stating.",
            lead: "These are allowed. They come with conditions, and the conditions are the point."
          }).value}
          <div class="grid g-3" data-stagger="70">
            ${HIGH_CARE.map((item) => `
              <div class="card card-sunken card-pad-sm" data-reveal>
                <h3 style="font-size:var(--t-sm);font-weight:500">${item.t}</h3>
                <p class="xs muted" style="line-height:1.6">${item.d}</p>
              </div>`).join("")}
          </div>
          <div style="margin-top:26px;max-width:76ch">
            ${calloutBox("Security research is explicitly permitted. If you are a professional working on authorised testing, CTFs, or defensive tooling and the model refuses, say what the context is — and if it still refuses, <a class=\"link-plain\" href=\"/company/contact\">tell us</a>, because that is a bug on our side.", { variant: "accent", icon: "shield" }).value}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Your obligations", title: "If you build on Mere X." }).value}
          <div class="grid g-2" data-stagger="80">
            ${[
              ["Disclose AI involvement", "Users interacting with a Mere X-powered system should be able to find that out. You do not need a banner on every message; you do need to not actively conceal it."],
              ["Keep a human in the loop", "For any consequential decision — employment, credit, housing, health, benefits — a qualified person must make the call, with the authority and the time to disagree."],
              ["Do not present output as professional advice", "Model output is not legal, medical, or financial advice from a licensed professional, and should not be labelled as though it were."],
              ["Handle safety signals responsibly", "If Guard flags self-harm, abuse, or crisis content, route it appropriately. Do not discard the signal to keep a funnel clean."],
              ["Respect your users' data", "Do not send data through the API that your own privacy policy does not permit you to process this way."],
              ["Report abuse you discover", "If your product is being used to violate this policy, tell us. We would much rather help you shut it down than find it ourselves."]
            ].map(([t, d]) => `
              <div class="card card-pad-sm" data-reveal style="flex-direction:row;gap:14px;align-items:flex-start">
                <span style="color:var(--ink);margin-top:3px">${icon("check", "icon").value}</span>
                <div>
                  <div class="small" style="color:var(--ink)">${t}</div>
                  <p class="xs muted" style="margin-top:5px;line-height:1.6">${d}</p>
                </div>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell">
          ${sectionHead({ eyebrow: "Enforcement", title: "How this is applied." }).value}
          ${accordion(FAQ_ITEMS, { open: 0 }).value}
        </div>
      </section>

      ${ctaBand({
        title: "See the enforcement numbers.",
        body: "Volumes, categories, and appeal outcomes, published twice a year.",
        primary: { label: "Transparency reports", href: "/safety/transparency", icon: "arrow-ne" },
        secondary: { label: "Report something", href: "/company/contact" }
      }).value}
    `;
  }
};
