/* ============================================================
   NAV — the composition header and the four side drawers.
   MODELS opens the catalog, PLATFORM the developer surfaces,
   RESEARCH the latest dispatches, and the stack icon holds the
   models a visitor has picked to build with.
   ============================================================ */

import { MODEL_BY_ID } from "../data/models.js";
import { PUBLICATIONS } from "../data/content.js";
import { COMPANY } from "../data/site.js";
import { icon } from "../lib/icons.js";
import { escapeHtml } from "../lib/dom.js";
import { compact } from "../lib/format.js";
import { onNavigate, navigate } from "../lib/router.js";
import { getStack, inStack, addToStack, removeFromStack, onStackChange } from "../lib/stack.js";
import { toast } from "../lib/toast.js";

const CATALOG = ["mere-apex-5-5", "mere-orion-5-5", "mere-nyx-5-5", "mere-iris", "mere-lyra"]
  .map((id) => MODEL_BY_ID[id])
  .filter(Boolean);

const PLATFORM = [
  { n: "01", title: "The API", href: "/products/api", desc: "One endpoint, six SDKs, and a million-token window behind every call." },
  { n: "02", title: "Developer console", href: "/console", desc: "Keys, usage, request logs, limits, and billing — read in one place." },
  { n: "03", title: "Mere X Studio", href: "/app", desc: "The assistant workspace for chat, deep research, images, code, and voice." },
  { n: "04", title: "Documentation", href: "/docs", desc: "Quickstart, API reference, cookbook, and the prompt library." },
  { n: "05", title: "Pricing", href: "/pricing", desc: "Flat plans for people, per-token rates for builders, batch at half price." },
  { n: "06", title: "Enterprise", href: "/products/enterprise", desc: "Deployment, data residency, and support for regulated teams." }
];

const INDEX = [
  { label: "Research", href: "/research" },
  { label: "Technology", href: "/technology" },
  { label: "Products", href: "/products" },
  { label: "Safety", href: "/safety" },
  { label: "Company", href: "/company" },
  { label: "Docs", href: "/docs" },
  { label: "Status", href: "/status" }
];

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const stamp = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const readTime = (text) => `${Math.max(2, Math.round(text.split(/\s+/).length / 45))} MIN READ`;

/* ------------------------------------------------------------
   Drawer bodies
   ------------------------------------------------------------ */
function catalogBody() {
  return `
    ${CATALOG.map((model) => `
      <div class="drawer-row" data-model-row="${model.id}">
        <div class="drawer-row-main">
          <span class="drawer-tag">${escapeHtml(model.tier)}</span>
          <a class="drawer-row-title" href="/technology/models/${model.id}">${escapeHtml(model.name)}</a>
          <span class="drawer-price">${compact(model.context, 0)} context · ${escapeHtml(model.latency.split(" median")[0])}</span>
        </div>
        <button class="drawer-add ${inStack(model.id) ? "is-added" : ""}" type="button" data-add="${model.id}" aria-pressed="${inStack(model.id)}">
          ${inStack(model.id) ? "Added" : "Add"}
        </button>
      </div>`).join("")}
    <div class="drawer-links">
      <a class="link" href="/technology"><span>Compare all models</span>${icon("arrow-ne", "icon").value}</a>
      <a class="link link-quiet" href="/technology/benchmarks"><span>Benchmarks</span>${icon("arrow-ne", "icon").value}</a>
      <a class="link link-quiet" href="/technology/reasoning"><span>Reasoning modes</span>${icon("arrow-ne", "icon").value}</a>
    </div>`;
}

function platformBody() {
  return `
    ${PLATFORM.map((item) => `
      <a class="drawer-entry" href="${item.href}">
        <span class="drawer-entry-meta">Series ${item.n}</span>
        <span class="drawer-entry-title" style="display:block">${escapeHtml(item.title)}</span>
        <span class="drawer-entry-desc" style="display:block">${escapeHtml(item.desc)}</span>
      </a>`).join("")}`;
}

function researchBody() {
  return `
    ${PUBLICATIONS.slice(0, 4).map((paper) => `
      <a class="drawer-entry" href="/research/publications#${paper.slug}">
        <span class="drawer-entry-meta">${stamp(paper.date)} — ${escapeHtml(paper.kind)}</span>
        <span class="drawer-entry-title" style="display:block">${escapeHtml(paper.title)}</span>
        <span class="drawer-entry-foot">${readTime(paper.summary)}</span>
      </a>`).join("")}
    <div class="drawer-links">
      <a class="link" href="/research/publications"><span>All publications</span>${icon("arrow-ne", "icon").value}</a>
      <a class="link link-quiet" href="/research/interpretability"><span>Interpretability</span>${icon("arrow-ne", "icon").value}</a>
      <a class="link link-quiet" href="/safety"><span>Safety</span>${icon("arrow-ne", "icon").value}</a>
    </div>`;
}

function stackBody() {
  const ids = getStack();
  if (!ids.length) {
    return `
      <div class="stack-empty">
        ${icon("layers").value}
        <p>Your stack is empty.</p>
        <p class="stack-empty-hint">Add models from the catalog to build with them side by side.</p>
      </div>`;
  }
  return ids.map((id) => {
    const model = MODEL_BY_ID[id];
    if (!model) return "";
    return `
      <div class="drawer-row" data-stack-row="${id}">
        <div class="drawer-row-main">
          <span class="drawer-tag">${escapeHtml(model.tier)}</span>
          <a class="drawer-row-title" href="/technology/models/${id}">${escapeHtml(model.name)}</a>
          <span class="drawer-price">${compact(model.context, 0)} context · ${escapeHtml(model.modes.join(" / ") || "Realtime")}</span>
        </div>
        <button class="stack-remove" type="button" data-remove="${id}">Remove</button>
      </div>`;
  }).join("");
}

const DRAWERS = {
  models: { title: "Model Family", sub: `${escapeHtml(COMPANY.model)} 5.5 lineup`, body: catalogBody },
  platform: { title: "Developer Platform", sub: "Build on Mere X", body: platformBody },
  research: { title: "Research", sub: "Latest dispatches", body: researchBody },
  stack: { title: "Your Stack", sub: "Models to build with", body: stackBody }
};

function drawerFoot(kind) {
  if (kind === "stack" && getStack().length) {
    return `
      <a class="btn btn-primary btn-block drawer-checkout" href="/console" data-stack-go>
        <span>Start building</span>${icon("chevron-right", "icon").value}
      </a>
      <a class="link link-quiet" href="/technology" style="align-self:center"><span>Compare the stack</span>${icon("arrow-ne", "icon").value}</a>`;
  }
  return `
    <nav class="drawer-index" aria-label="Site index">
      ${INDEX.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
    </nav>
    <p class="drawer-copy">Mere X © ${new Date().getFullYear()} — Future Forward Intelligence</p>`;
}

/* ------------------------------------------------------------
   Header markup
   ------------------------------------------------------------ */
export function renderNav() {
  const count = getStack().length;
  return `
    <header class="site-nav" id="siteNav">
      <a class="brand" href="/" aria-label="Mere X home" data-brand>
        <span>MERE X</span><span class="brand-deg" aria-hidden="true">˚</span>
      </a>
      <nav class="nav-links" aria-label="Main">
        <button class="nav-link-btn" type="button" data-drawer-open="models" aria-haspopup="dialog" aria-expanded="false">Models</button>
        <button class="nav-link-btn" type="button" data-drawer-open="platform" aria-haspopup="dialog" aria-expanded="false">Platform</button>
        <button class="nav-link-btn" type="button" data-drawer-open="research" aria-haspopup="dialog" aria-expanded="false">Research</button>
        <span class="nav-sep" aria-hidden="true">|</span>
        <button class="nav-stack" type="button" data-drawer-open="stack" aria-haspopup="dialog" aria-expanded="false" aria-label="Your stack">
          ${icon("layers").value}
          <span class="nav-badge" data-stack-count ${count ? "" : "hidden"}>${count}</span>
        </button>
      </nav>
    </header>

    <div class="drawer-layer" id="drawerLayer" aria-hidden="true">
      <div class="drawer-backdrop" data-drawer-close></div>
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle">
        <div class="drawer-head">
          <h2 class="drawer-title" id="drawerTitle"></h2>
          <button class="icon-btn drawer-close" type="button" data-drawer-close aria-label="Close">${icon("close").value}</button>
        </div>
        <p class="drawer-sub" data-drawer-sub></p>
        <div class="drawer-body" data-drawer-body></div>
        <div class="drawer-foot" data-drawer-foot></div>
      </aside>
    </div>`;
}

/* ------------------------------------------------------------
   Behaviour
   ------------------------------------------------------------ */
export function mountNav(root) {
  const layer = root.querySelector("#drawerLayer");
  const title = layer.querySelector("#drawerTitle");
  const sub = layer.querySelector("[data-drawer-sub]");
  const body = layer.querySelector("[data-drawer-body]");
  const foot = layer.querySelector("[data-drawer-foot]");
  const triggers = Array.from(root.querySelectorAll("[data-drawer-open]"));
  const badge = root.querySelector("[data-stack-count]");
  let current = null;
  let lastTrigger = null;

  const paint = () => {
    if (!current) return;
    const spec = DRAWERS[current];
    title.textContent = spec.title;
    sub.innerHTML = spec.sub;
    body.innerHTML = spec.body();
    foot.innerHTML = drawerFoot(current);
    foot.classList.toggle("is-checkout", current === "stack" && getStack().length > 0);
  };

  const open = (kind, trigger) => {
    if (!DRAWERS[kind]) return;
    current = kind;
    lastTrigger = trigger || null;
    paint();
    layer.classList.add("is-open");
    layer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    triggers.forEach((node) => node.setAttribute("aria-expanded", String(node.dataset.drawerOpen === kind)));
    requestAnimationFrame(() => layer.querySelector(".drawer-close")?.focus({ preventScroll: true }));
  };

  const close = () => {
    if (!current) return;
    current = null;
    layer.classList.remove("is-open");
    layer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    triggers.forEach((node) => node.setAttribute("aria-expanded", "false"));
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    lastTrigger = null;
  };

  triggers.forEach((node) => node.addEventListener("click", () => {
    if (current === node.dataset.drawerOpen) close();
    else open(node.dataset.drawerOpen, node);
  }));
  root.querySelector("[data-brand]")?.addEventListener("click", close);

  layer.addEventListener("click", (event) => {
    if (event.target.closest("[data-drawer-close]")) { close(); return; }

    const add = event.target.closest("[data-add]");
    if (add) {
      const model = MODEL_BY_ID[add.dataset.add];
      if (model && addToStack(model.id)) toast(`Added "${model.name}" to your stack.`, { duration: 3000 });
      return;
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) { removeFromStack(remove.dataset.remove); return; }

    // Any link inside a drawer navigates and closes it. Console and
    // Studio links are server-owned, so those fall through to a full load.
    if (event.target.closest("a[href]")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && current) close();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      close();
      navigate("/search");
    }
  });

  onStackChange((items) => {
    badge.textContent = String(items.length);
    badge.hidden = items.length === 0;
    if (current === "models") {
      body.querySelectorAll("[data-add]").forEach((node) => {
        const added = items.includes(node.dataset.add);
        node.classList.toggle("is-added", added);
        node.setAttribute("aria-pressed", String(added));
        node.textContent = added ? "Added" : "Add";
      });
    } else if (current === "stack") {
      paint();
    }
  });

  onNavigate(close);
}
