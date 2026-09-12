/* ============================================================
   DOM — tiny templating + query helpers
   Pages return HTML strings; `html` escapes interpolations by
   default so page data can never inject markup by accident.
   Use `raw()` for trusted, already-built fragments.
   ============================================================ */

const RAW = Symbol("raw");

export function raw(value) {
  return { [RAW]: true, value: String(value ?? "") };
}

export function isRaw(value) {
  return Boolean(value) && typeof value === "object" && value[RAW] === true;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolve(value) {
  if (value == null || value === false) return "";
  if (isRaw(value)) return value.value;
  if (Array.isArray(value)) return value.map(resolve).join("");
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return escapeHtml(value);
}

/** Tagged template producing an escaped HTML string. */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += resolve(values[i]) + strings[i + 1];
  }
  return out;
}

/** Mark a composed string as trusted so `html` won't re-escape it. */
export function frag(strings, ...values) {
  return raw(html(strings, ...values));
}

export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value != null && value !== false) node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of [].concat(children)) {
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Delegated listener; returns an unsubscribe function. */
export function on(scope, type, selector, handler, options) {
  const listener = (event) => {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (target && scope.contains(target)) handler(event, target);
  };
  scope.addEventListener(type, listener, options);
  return () => scope.removeEventListener(type, listener, options);
}

export function setHtml(node, markup) {
  if (node) node.innerHTML = markup;
  return node;
}

/** Repeat a template across items with an index. */
export function map(items, fn) {
  return raw((items || []).map((item, index) => resolve(fn(item, index))).join(""));
}

/** Conditional fragment. */
export function when(condition, value, fallback = "") {
  return condition ? value : fallback;
}

export function classes(...parts) {
  return parts
    .flatMap((part) => {
      if (!part) return [];
      if (typeof part === "string") return [part];
      return Object.entries(part).filter(([, v]) => v).map(([k]) => k);
    })
    .join(" ");
}

/** Copy text to the clipboard with a graceful fallback. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.append(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
