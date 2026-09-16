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
let renderSequence = 0;
let progressResetTimer = 0;

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
  routes.push({ pattern, ...compile(pattern), view, meta, resolved: null, pending: null });
}

export function fallback(view, meta = {}) {
  notFound = { view, meta, resolved: null, pending: null };
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
    if (force) void render({ scroll });
    else if (url.hash) scrollToHash(url.hash);
    return;
  }
  history[replace ? "replaceState" : "pushState"]({ scroll: 0 }, "", next);
  void render({ scroll });
}

/** Re-render the current route in place — for views that mutate their own data. */
export function refresh({ scroll = false } = {}) {
  void render({ scroll });
}

function scrollToHash(hash) {
  const target = document.getElementById(hash.slice(1));
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startProgress() {
  if (!progressEl) return;
  clearTimeout(progressResetTimer);
  progressEl.classList.remove("is-active", "is-done");
  // Reset a completed bar before starting the next navigation.
  void progressEl.offsetWidth;
  progressEl.classList.add("is-active");
  outlet?.classList.add("is-route-pending");
  outlet?.setAttribute("aria-busy", "true");
}
function endProgress(sequence) {
  if (sequence !== renderSequence) return;
  outlet?.classList.remove("is-route-pending");
  outlet?.setAttribute("aria-busy", "false");
  if (!progressEl) return;
  progressEl.classList.remove("is-active");
  progressEl.classList.add("is-done");
  progressResetTimer = setTimeout(() => progressEl.classList.remove("is-done"), 420);
}

function normalizeView(value) {
  return value && typeof value.default === "object" ? value.default : value;
}

async function loadView(entry, ctx) {
  if (!entry) return null;
  if (typeof entry.view !== "function") return entry.view;
  if (entry.meta?.cache === false) return normalizeView(await entry.view(ctx));
  if (entry.resolved) return entry.resolved;
  if (!entry.pending) {
    entry.pending = Promise.resolve(entry.view(ctx))
      .then(normalizeView)
      .then((resolved) => {
        entry.resolved = resolved;
        return resolved;
      })
      .finally(() => { entry.pending = null; });
  }
  return entry.pending;
}

function contextFor(url) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const found = match(path);
  return {
    entry: found ? found.entry : notFound,
    ctx: {
      path,
      params: found ? found.params : {},
      query: new URLSearchParams(url.search),
      hash: url.hash,
      meta: found ? found.entry.meta : (notFound?.meta || {})
    }
  };
}

function preload(anchor) {
  if (!isInternalLink(anchor)) return;
  const url = new URL(anchor.getAttribute("href"), location.origin);
  const { entry, ctx } = contextFor(url);
  if (!entry || entry.meta?.prefetch === false) return;
  void loadView(entry, ctx).catch(() => { /* navigation will show the real error */ });
}

async function render({ scroll = true } = {}) {
  const sequence = ++renderSequence;
  const { entry, ctx } = contextFor(new URL(location.href));
  const { path } = ctx;

  startProgress();
  let resolved;
  try {
    resolved = await loadView(entry, ctx);
  } catch (error) {
    if (sequence !== renderSequence) return;
    console.error("[route load]", path, error);
    endProgress(sequence);
    return;
  }
  // A slower, older import must never repaint over a newer navigation.
  if (sequence !== renderSequence) return;
  if (!resolved) { endProgress(sequence); return; }

  let markup = "";
  try {
    markup = resolved.render ? resolved.render(ctx) : "";
  } catch (error) {
    console.error("[route render]", path, error);
    endProgress(sequence);
    return;
  }

  currentCleanups.forEach((fn) => { try { fn(); } catch { /* teardown must not break navigation */ } });
  currentCleanups = [];

  const title = typeof resolved.title === "function" ? resolved.title(ctx) : resolved.title;
  document.title = title ? `${title} — Mere X` : "Mere X";
  const description = typeof resolved.description === "function" ? resolved.description(ctx) : resolved.description;
  if (description) {
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) { tag = document.createElement("meta"); tag.name = "description"; document.head.append(tag); }
    tag.content = description;
  }

  const root = document.createElement("div");
  root.className = "route-view";
  root.innerHTML = markup;
  outlet.replaceChildren(root);

  currentPath = path;
  listeners.forEach((fn) => { try { fn(ctx); } catch (error) { console.error("[route listener]", path, error); } });

  if (typeof resolved.mount === "function") {
    try { resolved.mount(root, ctx); } catch (error) { console.error("[route mount]", path, error); }
  }

  if (scroll) {
    if (ctx.hash) requestAnimationFrame(() => scrollToHash(ctx.hash));
    else window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
  }
  endProgress(sequence);
}

function isInternalLink(anchor) {
  if (!anchor) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.dataset.external !== undefined) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  const url = new URL(href, location.origin);
  const serverOwned = /^\/(?:app|checkout|login|register)(?:\/|$)/.test(url.pathname);
  const enteringConsole = /^\/console(?:\/|$)/.test(url.pathname) && !/^\/console(?:\/|$)/.test(location.pathname);
  if (serverOwned || enteringConsole) return false;
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

  document.addEventListener("pointerover", (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a") : null;
    preload(anchor);
  }, { passive: true });
  document.addEventListener("focusin", (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a") : null;
    preload(anchor);
  });

  window.addEventListener("popstate", () => { void render({ scroll: true }); });
  void render({ scroll: false });
}
