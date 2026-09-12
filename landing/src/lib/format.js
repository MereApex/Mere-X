/* ============================================================
   FORMAT — numbers, currency, dates, durations, tokens
   ============================================================ */

export const nf = (value, options = {}) => Number(value).toLocaleString("en-US", options);

export function compact(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(digits)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(digits)}M`;
  if (abs >= 1e4) return `${(n / 1e3).toFixed(0)}K`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(digits)}K`;
  return nf(n);
}

export function money(value, { digits, currency = "USD" } = {}) {
  const n = Number(value) || 0;
  const decimals = digits ?? (n < 1 && n > 0 ? Math.min(4, Math.max(2, String(n).split(".")[1]?.length || 2)) : 2);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function pct(value, digits = 1) {
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function ms(value) {
  const n = Number(value);
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(n < 10000 ? 2 : 1)} s`;
}

export function bytes(value) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = Number(value) || 0;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const DATE_FULL = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" });
const DATE_SHORT = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });
const TIME_SHORT = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

export const dateFull = (value) => DATE_FULL.format(new Date(value));
export const dateShort = (value) => DATE_SHORT.format(new Date(value));
export const timeShort = (value) => TIME_SHORT.format(new Date(value));
export const dateTime = (value) => `${DATE_SHORT.format(new Date(value))} · ${TIME_SHORT.format(new Date(value))}`;

export function relative(value) {
  const then = new Date(value).getTime();
  const diff = Date.now() - then;
  const minute = 60000;
  const hour = minute * 60;
  const day = hour * 24;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 30) return `${Math.floor(diff / day)}d ago`;
  return dateShort(value);
}

/** Per-million-token price rendered the way the pricing pages read it. */
export function perMillion(value) {
  return `$${Number(value).toFixed(2)} / MTok`;
}

export function tokens(value) {
  const n = Number(value);
  if (n >= 1000) return `${compact(n)} tokens`;
  return `${nf(n)} tokens`;
}

/** Deterministic pseudo-random generator so demo data is stable per key. */
export function seeded(seed) {
  let h = 2166136261 >>> 0;
  const key = String(seed);
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
