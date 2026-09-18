/* ============================================================
   LIVE PREVIEW — renders the project's HTML in a sandboxed
   iframe with its relative stylesheets, scripts and images
   inlined from the project file system, and relays the page's
   console and errors back to the workspace.
   ============================================================ */

import { normalizePath, isBinaryPath } from "./project-fs.js";

const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", ico: "image/x-icon", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf" };

const BRIDGE = `<script>(function(){
  var post = function(level, parts){ try { parent.postMessage({ source: "mere-x-preview", level: level, text: parts.map(function(p){ try { return typeof p === "string" ? p : JSON.stringify(p); } catch (e) { return String(p); } }).join(" ") }, "*"); } catch (e) {} };
  ["log","info","warn","error","debug"].forEach(function(level){ var original = console[level]; console[level] = function(){ post(level, Array.prototype.slice.call(arguments)); if (original) original.apply(console, arguments); }; });
  window.addEventListener("error", function(event){ post("error", [String(event.message || event.error || "Error"), event.filename ? "(" + event.filename.split("/").pop() + ":" + event.lineno + ")" : ""]); });
  window.addEventListener("unhandledrejection", function(event){ post("error", ["Unhandled rejection:", String(event.reason && event.reason.message || event.reason)]); });
  document.addEventListener("click", function(event){ var a = event.target.closest && event.target.closest("a[href]"); if (a && /^https?:/.test(a.getAttribute("href"))) { event.preventDefault(); post("info", ["Link blocked in preview:", a.getAttribute("href")]); } });
})();</script>`;

function resolve(from, target) {
  const clean = String(target || "").trim().replace(/^\.\//, "");
  if (!clean || /^(https?:|data:|blob:|\/\/|#|mailto:|javascript:)/i.test(clean)) return null;
  const base = from.split("/").slice(0, -1).join("/");
  return normalizePath(clean.startsWith("/") ? clean.slice(1) : base ? `${base}/${clean}` : clean).split("?")[0].split("#")[0];
}

export function pickEntry(fs, preferred = "") {
  if (preferred && /\.html?$/i.test(preferred) && fs.has(preferred)) return preferred;
  for (const candidate of ["index.html", "public/index.html", "src/index.html", "dist/index.html"]) if (fs.has(candidate)) return candidate;
  return fs.allFiles().find((path) => /\.html?$/i.test(path)) || "";
}

async function inlineCss(fs, css, from, depth = 0) {
  if (depth > 3) return css;
  const urls = [...css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)];
  let out = css;
  for (const match of urls) {
    const path = resolve(from, match[2]);
    if (!path || !fs.has(path) || !isBinaryPath(path)) continue;
    try {
      const file = await fs.readBinary(path);
      const url = URL.createObjectURL(new Blob([file], { type: MIME[path.split(".").pop().toLowerCase()] || "application/octet-stream" }));
      out = out.replace(match[0], `url("${url}")`);
    } catch { /* leave the reference */ }
  }
  return out;
}

/* Builds a self-contained document. Relative <link>, <script> and <img>
   references become inline content or blob URLs; external URLs stay. */
export async function buildPreviewDocument(fs, entry) {
  let html = await fs.read(entry);
  const replacements = [];

  for (const match of html.matchAll(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi)) {
    const href = (match[0].match(/href=["']([^"']+)["']/i) || [])[1];
    const path = resolve(entry, href);
    if (!path || !fs.has(path)) continue;
    try {
      const css = await inlineCss(fs, await fs.read(path), path);
      replacements.push([match[0], `<style data-preview-src="${path}">\n${css}\n</style>`]);
    } catch { /* keep the link */ }
  }
  for (const match of html.matchAll(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi)) {
    const path = resolve(entry, match[2]);
    if (!path || !fs.has(path)) continue;
    try {
      const code = (await fs.read(path)).replace(/<\/script/gi, "<\\/script");
      const attributes = `${match[1]} ${match[3]}`.replace(/\s+/g, " ").trim();
      replacements.push([match[0], `<script ${attributes} data-preview-src="${path}">\n${code}\n</script>`]);
    } catch { /* keep the script tag */ }
  }
  for (const match of html.matchAll(/<(img|source|video|audio)\b[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi)) {
    const path = resolve(entry, match[2]);
    if (!path || !fs.has(path) || !isBinaryPath(path)) continue;
    try {
      const file = await fs.readBinary(path);
      const url = URL.createObjectURL(new Blob([file], { type: MIME[path.split(".").pop().toLowerCase()] || "application/octet-stream" }));
      replacements.push([match[0], match[0].replace(match[2], url)]);
    } catch { /* leave it */ }
  }
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = await inlineCss(fs, match[1], entry);
    if (css !== match[1]) replacements.push([match[0], match[0].replace(match[1], css)]);
  }
  for (const [from, to] of replacements) html = html.replace(from, to);

  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (head) => `${head}\n${BRIDGE}`);
  else html = `${BRIDGE}\n${html}`;
  return html;
}
