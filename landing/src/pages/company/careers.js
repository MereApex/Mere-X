/* ============================================================
   COMPANY — careers
   ============================================================ */

import { CAREERS, BENEFITS } from "../../data/content.js";
import { COMPANY } from "../../data/site.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, ctaBand, statTile, accordion, calloutBox } from "../../components/ui.js";

const PROCESS = [
  { t: "Apply", d: "A CV and a short note on why this role. No cover letter, no take-home before we have spoken." },
  { t: "First conversation", d: "Forty-five minutes with the hiring manager about your work and the problem the role exists to solve." },
  { t: "Technical round", d: "Two to three conversations, depending on the role. You may use documentation, a model, and anything else you would use at work." },
  { t: "Team conversations", d: "Meet the people you would work with, including at least one person outside your function." },
  { t: "Offer", d: "Within a week of the final conversation, with the band and the equity methodology explained. We do not use exploding offers." }
];

const FAQ_ITEMS = [
  { q: "Do you hire remotely?", a: "<p>For some roles, yes — they are marked as remote in the listing. Research roles are in person, because most of what makes research work is the unplanned conversation and we have not found a substitute.</p>" },
  { q: "Do you sponsor visas?", a: "<p>Yes, in all five office locations, and we start the process early enough that it is not a scramble. Relocation is covered end to end.</p>" },
  { q: "How do you handle compensation?", a: "<p>Published bands internally, equity for every employee, and a strike-price methodology we explain rather than obscure. We do not negotiate against other offers by asking what they are.</p>" },
  { q: "What if I do not match the listing exactly?", a: "<p>Apply anyway. Listings describe a shape, not a checklist, and several of our strongest hires would have screened themselves out. Say what you would bring instead of what is listed.</p>" },
  { q: "How long does the process take?", a: "<p>Three to four weeks from application to offer, and we tell you where you are at each stage. If we are slow, it is because of scheduling rather than indecision, and we will say so.</p>" },
  { q: "Is there an interview prep guide?", a: "<p>Yes — every candidate gets one before the technical round, covering exactly what each conversation will assess and what a strong answer looks like. Interviews should test whether you can do the job, not whether you guessed the format.</p>" }
];

const TEAMS = ["All", "Research", "Safety", "Systems", "Product", "Policy", "Security", "Go-to-market"];

export default {
  title: "Careers",
  description: "Open roles at Mere X across research, safety, systems, product, and policy.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Company", href: "/company" }, { label: "Careers" }],
        eyebrow: `${CAREERS.length} open roles`,
        title: "Come work on the part that is actually hard.",
        lead: `${COMPANY.people} people across ${COMPANY.offices.length} offices, a third of them in research. We hire people who would keep thinking about the problem on the walk home.`,
        actions: `${button({ label: "See open roles", href: "#roles", icon: "arrow-down" }).value}
                  ${button({ label: "The residency", href: "/research/residency", variant: "secondary", icon: "graduation" }).value}`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="grid g-4" data-stagger="90">
            ${statTile({ value: CAREERS.length, label: "Open roles", note: "Updated weekly" }).value}
            ${statTile({ value: COMPANY.offices.length, label: "Offices", note: "Plus remote roles" }).value}
            ${statTile({ value: 26, label: "Weeks parental leave", note: "For any parent, at full pay" }).value}
            ${statTile({ value: 12000, prefix: "$", label: "Learning budget", note: "Per person, per year" }).value}
          </div>
        </div>
      </section>

      <!-- ---- Roles ---- -->
      <section class="section section-line" id="roles">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Open roles",
            title: "Where we need people.",
            action: textLink("Ask about something not listed", "/company/contact").value
          }).value}

          <div class="row row-tight" data-team-filter data-reveal style="margin-bottom:22px">
            ${TEAMS.map((team, i) => `<button class="btn ${i === 0 ? "btn-secondary" : "btn-ghost"} btn-sm" data-team="${team}">${team}</button>`).join("")}
          </div>

          <div class="entry-list" data-role-list>
            ${CAREERS.map((role) => `
              <a class="entry" href="/company/contact" data-role data-team-value="${role.team}">
                <div class="entry-meta">${role.team}<br><span style="color:var(--faint)">${role.level}</span></div>
                <div>
                  <h3 class="entry-title">${role.title}</h3>
                  <div class="entry-tags">
                    <span class="badge badge-plain">${icon("building", "icon").value.replace('class="icon"', 'class="icon" style="width:11px;height:11px;margin-right:4px"')}${role.location}</span>
                    <span class="badge badge-plain">${role.type}</span>
                  </div>
                </div>
                <span class="entry-arrow">${icon("arrow-ne").value}</span>
              </a>`).join("")}
          </div>
          <div class="empty" data-empty hidden style="margin-top:24px">${icon("search").value}<p>No roles in that team right now.</p></div>
        </div>
      </section>

      <!-- ---- Benefits ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Benefits", title: "What you get, stated plainly." }).value}
          <div class="grid g-3" data-stagger="70">
            ${BENEFITS.map((b) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(b.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${b.title}</h3>
                <p class="small muted" style="line-height:1.6">${b.body}</p>
              </div>`).join("")}
          </div>
          <div style="margin-top:26px;max-width:76ch">
            ${calloutBox("The four-week leave minimum is enforced, not encouraged. If you have not taken it by October your manager's manager gets a note, because unlimited leave that nobody takes is a pay cut.", { variant: "accent", icon: "clock" }).value}
          </div>
        </div>
      </section>

      <!-- ---- Process ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(28px,4vw,56px);align-items:start">
            <div data-reveal="left">
              <p class="eyebrow">Process</p>
              <h2 style="margin-top:18px">Three to four weeks, and you always know where you are.</h2>
              <p class="lead" style="margin-top:18px">
                No whiteboard algorithms, no take-home before we have spoken, and a prep guide before
                the technical round that says exactly what each conversation assesses.
              </p>
              <div style="margin-top:24px">${textLink("Read about the residency", "/research/residency").value}</div>
            </div>
            <div class="timeline" data-reveal="right">
              ${PROCESS.map((step) => `
                <div class="tl-item">
                  <div class="tl-title" style="font-size:var(--t-body)">${step.t}</div>
                  <p class="tl-body">${step.d}</p>
                </div>`).join("")}
            </div>
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
        title: "Nothing quite fits?",
        body: "Tell us what you would work on. Several of our roles were created after someone wrote in.",
        primary: { label: "Get in touch", href: "/company/contact", icon: "arrow-ne" },
        secondary: { label: "Our research", href: "/research" }
      }).value}
    `;
  },

  mount(root) {
    const roles = Array.from(root.querySelectorAll("[data-role]"));
    const empty = root.querySelector("[data-empty]");

    root.querySelector("[data-team-filter]")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-team]");
      if (!btn) return;
      const team = btn.dataset.team;
      root.querySelectorAll("[data-team]").forEach((node) => {
        node.classList.toggle("btn-secondary", node === btn);
        node.classList.toggle("btn-ghost", node !== btn);
      });
      let visible = 0;
      roles.forEach((role) => {
        const show = team === "All" || role.dataset.teamValue === team;
        role.style.display = show ? "" : "none";
        if (show) visible += 1;
      });
      empty.hidden = visible > 0;
    });
  }
};
