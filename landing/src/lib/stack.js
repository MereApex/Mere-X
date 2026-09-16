/* ============================================================
   STACK — the models a visitor has picked from the catalog.
   Lives in sessionStorage so it survives a reload, and notifies
   subscribers so the header badge and drawer stay in sync.
   ============================================================ */

const KEY = "mere-x.stack";
const listeners = new Set();
let items = load();

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function persist() {
  try { sessionStorage.setItem(KEY, JSON.stringify(items)); } catch { /* session-only is fine */ }
  listeners.forEach((fn) => { try { fn(items); } catch { /* a listener must not break the store */ } });
}

export function getStack() {
  return items.slice();
}

export function inStack(id) {
  return items.includes(id);
}

export function addToStack(id) {
  if (!id || items.includes(id)) return false;
  items = [...items, id];
  persist();
  return true;
}

export function removeFromStack(id) {
  if (!items.includes(id)) return false;
  items = items.filter((item) => item !== id);
  persist();
  return true;
}

export function clearStack() {
  items = [];
  persist();
}

export function onStackChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
