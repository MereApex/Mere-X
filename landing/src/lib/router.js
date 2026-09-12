/* ============================================================
   ROUTER — history-based, pattern matched, with a progress bar,
   view transitions and per-route cleanup.
   ============================================================ */

const routes = [];
let notFound = null;
let outlet = null;
let progressEl = null;
let currentCleanups = [];
let currentPath = null;
const listeners = new Set();

function compile(pattern) {
  const keys = [];
  const source = pattern
    .split("/")
    .map((part) => {
      if (!part) return "";
      if (part === "*") { keys.push("wildcard"); return "/(.*)"; }
      if (part.startsWith(":")) { keys.push(part.slice(1)); return "/([^/]+)"; }
      return `/${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
    })
    .join("");
  return { regex: new RegExp(`^${source || "/"}/?$`, "i"), keys };
}

/** Register a route. `view` is `{ title, render(ctx), mount(root, ctx) }` or a loader returning one. */
export function route(pattern, view, meta = {}) {
  routes.push({ pattern, ...compile(pattern), view, meta });
}

export function fallback(view) {
  notFound = view;
}

export function match(path) {
  for (const entry of routes) {
    const found = entry.regex.exec(path);
    if (!found) continue;
    const params = {};
    entry.keys.forEach((key, index) => { params[key] = decodeURIComponent(found[index + 1] || ""); });
    return { entry, params };
  }
  return null;
}

export function onNavigate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function currentRoute() {
  return currentPath;
}

/** Register a teardown for the active view. */
export function onLeave(fn) {
  currentCleanups.push(fn);
}

export function navigate(to, { replace = false, scroll = true, force = false } = {}) {
  const url = new URL(to, location.origin);
  if (url.origin !== location.origin) { location.href = to; return; }
  const next = url.pathname + url.search + url.hash;
  if (next === location.pathname + location.search + location.hash) {
    // Same URL: re-rendering is only ever intentional, so require `force`.
    if (force) render({ scroll });
    else if (url.hash) scrollToHash(url.hash);
    return;
  }
  history[replace ? "replaceState" : "pushState"]({ scroll: 0 }, "", next);
  render({ scroll });
}

/** Re-render the current route in place — for views that mutate their own data. */
export function refresh({ scroll = false } = {}) {
  render({ scroll });
}

function scrollToHash(hash) {
  const target = document.getElementById(hash.slice(1));
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startProgress() {
  if (!progressEl) return;
  progressEl.classList.remove("is-done");
  progressEl.classList.add("is-active");
}
function endProgress() {
  if (!progressEl) return;
  progressEl.classList.remove("is-active");
  progressEl.classList.add("is-done");
  setTimeout(() => progressEl.classList.remove("is-done"), 420);
}

async function render({ scroll = true } = {}) {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const found = match(path);
  const view = found ? found.entry.view : notFound;
  const ctx = {
    path,
    params: found ? found.params : {},
    query: new URLSearchParams(location.search),
    hash: location.hash,
    meta: found ? found.entry.meta : {}
  };

  startProgress();
  currentCleanups.forEach((fn) => { try { fn(); } catch { /* teardown must not break navigation */ } });
  currentCleanups = [];

  let resolved = view;
  if (typeof view === "function") resolved = await view(ctx);
  if (resolved && typeof resolved.default === "object") resolved = resolved.default;
  if (!resolved) { endProgress(); return; }

  const title = typeof resolved.title === "function" ? resolved.title(ctx) : resolved.title;
  document.title = title ? `${title} — Mere X` : "Mere X";
  const description = typeof resolved.description === "function" ? resolved.description(ctx) : resolved.description;
  if (description) {
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) { tag = document.createElement("meta"); tag.name = "description"; document.head.append(tag); }
    tag.content = description;
  }

  outlet.innerHTML = `<div class="route-view">${resolved.render ? resolved.render(ctx) : ""}</div>`;
  const root = outlet.firstElementChild;

  currentPath = path;
  listeners.forEach((fn) => fn(ctx));

  if (typeof resolved.mount === "function") {
    try { resolved.mount(root, ctx); } catch (error) { console.error("[route mount]", path, error); }
  }

  if (scroll) {
    if (ctx.hash) requestAnimationFrame(() => scrollToHash(ctx.hash));
    else window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
  }
  endProgress();
}

function isInternalLink(anchor) {
  if (!anchor) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.dataset.external !== undefined) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (href === "/app" || href.startsWith("/app?") || href.startsWith("/app/") || href === "/checkout" || href.startsWith("/checkout?")) return false;
  return href.startsWith("/") || href.startsWith("#");
}

export function start({ mount, progress }) {
  outlet = mount;
  progressEl = progress;

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a") : null;
    if (!isInternalLink(anchor)) return;
    const href = anchor.getAttribute("href");
    if (href.startsWith("#")) {
      event.preventDefault();
      scrollToHash(href);
      history.replaceState(history.state, "", location.pathname + location.search + href);
      return;
    }
    event.preventDefault();
    navigate(href);
  });

  window.addEventListener("popstate", () => render({ scroll: true }));
  render({ scroll: false });
}
