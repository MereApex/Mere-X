/* ============================================================
   UI — shared building blocks used across every page
   ============================================================ */

import { html, raw, map, when, escapeHtml, copyText } from "../lib/dom.js";
import { icon } from "../lib/icons.js";
import { highlight } from "../lib/highlight.js";

/* ---- Buttons & links ----------------------------------- */

export function button({ label, href, variant = "primary", size = "", icon: name, magnetic = false, attrs = "" }) {
  const tag = href ? "a" : "button";
  const iconMarkup = name ? icon(name, `icon ${name === "arrow-ne" ? "icon-arrow" : ""}`).value : "";
  return raw(`<${tag} ${href ? `href="${href}"` : 'type="button"'} class="btn btn-${variant} ${size}" ${magnetic ? 'data-magnetic="0.18"' : ""} ${attrs}>
    <span>${label}</span>${iconMarkup}
  </${tag}>`);
}

export function textLink(label, href, { icon: name = "arrow-ne", quiet = false } = {}) {
  return raw(`<a class="link ${quiet ? "link-quiet" : ""}" href="${href}"><span>${label}</span>${icon(name, "icon").value}</a>`);
}

/* ---- Section scaffolding ------------------------------- */

export function sectionHead({ eyebrow, title, lead, center = false, action }) {
  const head = html`
    <div class="sec-head ${center ? "center" : ""}">
      ${when(eyebrow, raw(`<p class="eyebrow">${eyebrow}</p>`))}
      ${when(title, raw(`<h2>${title}</h2>`))}
      ${when(lead, raw(`<p class="lead">${lead}</p>`))}
    </div>`;
  if (!action) return raw(head);
  return raw(`<div class="sec-head-row" data-reveal>${head}${action}</div>`);
}

export function pageHead({ crumb = [], eyebrow, title, lead, actions, meta }) {
  return raw(`
    <header class="page-head">
      <div class="shell">
        ${crumb.length ? `<nav class="crumb" data-reveal="fade">${crumb
          .map((item, index) => (item.href
            ? `<a href="${item.href}">${item.label}</a>`
            : `<span>${item.label}</span>`) + (index < crumb.length - 1 ? '<span class="sep">/</span>' : ""))
          .join("")}</nav>` : ""}
        ${eyebrow ? `<p class="eyebrow" data-reveal>${eyebrow}</p>` : ""}
        <h1 data-reveal style="--reveal-delay:60ms;margin-top:${eyebrow ? "18px" : "0"}">${title}</h1>
        ${lead ? `<p class="lead measure" data-reveal style="--reveal-delay:120ms;margin-top:20px">${lead}</p>` : ""}
        ${actions ? `<div class="row" data-reveal style="--reveal-delay:180ms;margin-top:30px">${actions}</div>` : ""}
        ${meta ? `<div class="row" data-reveal style="--reveal-delay:220ms;margin-top:28px;gap:26px">${meta}</div>` : ""}
      </div>
    </header>`);
}

/* ---- Cards --------------------------------------------- */

export function featureCard({ icon: name, title, body, href, num }) {
  const inner = `
    ${num ? `<span class="card-num">${num}</span>` : ""}
    ${name ? `<div class="card-icon">${icon(name).value}</div>` : ""}
    <h3 style="font-size:var(--t-h4);font-weight:400">${title}</h3>
    <p class="small muted" style="line-height:1.6">${body}</p>
    ${href ? `<div style="margin-top:auto;padding-top:10px">${textLink("Read more", href).value}</div>` : ""}`;
  return raw(`<article class="card card-hover card-spot" data-reveal>${inner}</article>`);
}

export function statTile({ value, suffix = "", prefix = "", label, note, decimals = 0 }) {
  return raw(`
    <div class="stat" data-reveal>
      <span class="stat-value" data-count="${value}" data-count-decimals="${decimals}" data-count-prefix="${prefix}" data-count-suffix="${suffix}">${prefix}0${suffix}</span>
      <span class="stat-label">${label}</span>
      ${note ? `<span class="stat-note">${note}</span>` : ""}
    </div>`);
}

export function calloutBox(body, { variant = "", icon: name = "info" } = {}) {
  return raw(`<div class="callout ${variant ? `callout-${variant}` : ""}">${icon(name).value}<div>${body}</div></div>`);
}

/* ---- Code block with language tabs ---------------------- */

let codeBlockSeq = 0;

export function codeBlock(samples, { caption, defaultLang } = {}) {
  const languages = Object.keys(samples);
  const active = defaultLang && languages.includes(defaultLang) ? defaultLang : languages[0];
  const id = `cb-${(codeBlockSeq += 1)}`;

  const langKey = (lang) => {
    const l = lang.toLowerCase();
    if (l.includes("curl") || l.includes("bash") || l.includes("shell")) return "bash";
    if (l.includes("python")) return "python";
    if (l.includes("json")) return "json";
    return "js";
  };

  return raw(`
    <div class="code-block" data-code="${id}" data-reveal="fade">
      <div class="code-head">
        <div class="code-tabs" role="tablist">
          ${languages.map((lang) => `<button class="code-tab ${lang === active ? "is-active" : ""}" role="tab" data-lang="${lang}" aria-selected="${lang === active}">${lang}</button>`).join("")}
        </div>
        <button class="code-copy" data-copy type="button">${icon("copy").value}<span>Copy</span></button>
      </div>
      ${languages
        .map((lang) => `<pre class="code-body" data-panel="${lang}" ${lang === active ? "" : "hidden"}><code>${highlight(samples[lang], langKey(lang))}</code></pre>`)
        .join("")}
      ${caption ? `<p class="code-caption">${caption}</p>` : ""}
    </div>`);
}

/** Wire tab switching + copy for every code block inside `root`. */
export function mountCodeBlocks(root, onCopy) {
  root.querySelectorAll("[data-code]").forEach((block) => {
    const panels = Array.from(block.querySelectorAll("[data-panel]"));
    block.addEventListener("click", async (event) => {
      const tab = event.target.closest(".code-tab");
      if (tab) {
        block.querySelectorAll(".code-tab").forEach((node) => {
          const on = node === tab;
          node.classList.toggle("is-active", on);
          node.setAttribute("aria-selected", String(on));
        });
        panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== tab.dataset.lang; });
        return;
      }
      const copy = event.target.closest("[data-copy]");
      if (copy) {
        const visible = panels.find((panel) => !panel.hidden);
        const ok = await copyText(visible ? visible.textContent : "");
        copy.querySelector("span").textContent = ok ? "Copied" : "Press ⌘C";
        setTimeout(() => { copy.querySelector("span").textContent = "Copy"; }, 1600);
        if (ok && onCopy) onCopy();
      }
    });
  });
}

/* ---- Tables -------------------------------------------- */

export function dataTable({ columns, rows, hint }) {
  return raw(`
    <div data-reveal>
      <div class="table-wrap">
        <table class="data">
          <thead><tr>${columns.map((col) => `<th class="${col.align === "right" ? "num" : ""}">${col.label}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.map((row) => `<tr>${columns.map((col) => `<td class="${col.align === "right" ? "num" : ""}">${col.render ? col.render(row) : escapeHtml(row[col.key] ?? "—")}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
      ${hint ? `<p class="table-scroll-hint">${hint}</p>` : ""}
    </div>`);
}

/* ---- Accordion ----------------------------------------- */

export function accordion(items, { open = -1 } = {}) {
  return raw(`
    <div class="accordion" data-accordion>
      ${items.map((item, index) => `
        <div class="acc-item ${index === open ? "is-open" : ""}">
          <button class="acc-head" type="button" aria-expanded="${index === open}">
            <span>${item.q || item.title}</span>
            <span class="acc-sign">${icon("plus").value}</span>
          </button>
          <div class="acc-body"><div><div style="padding-bottom:24px">${item.a || item.body}</div></div></div>
        </div>`).join("")}
    </div>`);
}

export function mountAccordions(root) {
  root.querySelectorAll("[data-accordion]").forEach((acc) => {
    acc.addEventListener("click", (event) => {
      const head = event.target.closest(".acc-head");
      if (!head) return;
      const item = head.parentElement;
      const open = item.classList.toggle("is-open");
      head.setAttribute("aria-expanded", String(open));
    });
  });
}

/* ---- CTA band ------------------------------------------ */

export function ctaBand({ eyebrow, title, body, primary, secondary } = {}) {
  return raw(`
    <section class="section">
      <div class="shell">
        <div class="cta-band" data-reveal="scale">
          <span class="cta-band-grid"></span>
          ${eyebrow ? `<p class="eyebrow bare" style="justify-content:center;color:rgba(246,243,236,.5)">${eyebrow}</p>` : ""}
          <h2 style="max-width:20ch;margin:14px auto 0;font-size:var(--t-h2)">${title}</h2>
          ${body ? `<p style="max-width:56ch;margin:18px auto 0">${body}</p>` : ""}
          <div class="row" style="justify-content:center;margin-top:32px">
            ${primary ? button({ ...primary, variant: "invert", magnetic: true }).value : ""}
            ${secondary ? `<a class="link" href="${secondary.href}" style="color:#f6f3ec"><span>${secondary.label}</span>${icon("arrow-ne", "icon").value}</a>` : ""}
          </div>
        </div>
      </div>
    </section>`);
}

/* ---- Benchmark bars ------------------------------------ */

export function benchBars(rows, series, { max = 100 } = {}) {
  return raw(`
    <div class="bench" data-reveal>
      ${rows.map((row) => `
        <div class="bench-row">
          <div class="bench-name">${row.name}<small>${row.detail}</small></div>
          <div class="bench-bars">
            ${series.map((s, i) => `
              <div class="bench-bar">
                <div class="bench-track">
                  <div class="bench-fill" style="--v:${(row[s.key] / max).toFixed(4)};--bd:${i * 90}ms;background:${s.color}"></div>
                </div>
                <span class="bench-val">${row[s.key].toFixed(1)}</span>
              </div>`).join("")}
          </div>
        </div>`).join("")}
    </div>
    <div class="bench-legend" style="margin-top:26px">
      ${series.map((s) => `<span><i class="bench-swatch" style="background:${s.color}"></i>${s.label}</span>`).join("")}
    </div>`);
}

/* ---- Sparkline / line chart ---------------------------- */

export function sparkline(values, { width = 200, height = 30, area = true, color = "var(--ink)" } = {}) {
  if (!values.length) return raw("");
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1 || 1);
  const points = values.map((value, index) => [index * step, height - ((value - min) / span) * (height - 4) - 2]);
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const areaPath = `${line} L${width} ${height} L0 ${height} Z`;
  return raw(`<svg class="metric-spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
    ${area ? `<path class="area" d="${areaPath}"/>` : ""}
    <path d="${line}" style="stroke:${color}"/>
  </svg>`);
}

/* ---- Person / logo helpers ----------------------------- */

export function personCard({ name, role, bio }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
  return raw(`
    <article class="person" data-reveal>
      <div class="person-portrait"><span class="person-initials">${initials}</span></div>
      <div>
        <h4 style="font-weight:400">${name}</h4>
        <p class="xs muted" style="margin-top:2px">${role}</p>
        ${bio ? `<p class="small ink-3" style="margin-top:10px;line-height:1.55">${bio}</p>` : ""}
      </div>
    </article>`);
}

export function logoWall(names) {
  return raw(`<div class="logo-wall" data-reveal>${names.map((name) => `<div class="logo-cell">${name}</div>`).join("")}</div>`);
}

export function marquee(items) {
  const track = `<div class="marquee-track">${items.map((item) => `<span class="marquee-item">${icon("orbit").value}${item}</span>`).join("")}</div>`;
  return raw(`<div class="marquee">${track}${track.replace("marquee-track", "marquee-track")}</div>`);
}

/* ---- Entry list (articles, news, publications) ---------- */

export function entryList(entries) {
  return raw(`<div class="entry-list">${entries.map((entry) => `
    <a class="entry" href="${entry.href || "#"}" data-reveal="fade">
      <div class="entry-meta">${entry.meta}</div>
      <div>
        <h3 class="entry-title">${entry.title}</h3>
        ${entry.desc ? `<p class="entry-desc">${entry.desc}</p>` : ""}
        ${entry.tags?.length ? `<div class="entry-tags">${entry.tags.map((tag) => `<span class="badge badge-plain">${tag}</span>`).join("")}</div>` : ""}
      </div>
      <span class="entry-arrow">${icon("arrow-ne").value}</span>
    </a>`).join("")}</div>`);
}

export { map, when, html, raw };
