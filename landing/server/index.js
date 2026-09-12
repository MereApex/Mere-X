/* ============================================================
   MERE X — static server for the standalone public production build.
   Serves the root dist/site bundle with an SPA fallback so deep links work on a
   hard refresh. No dependencies: node server/index.js.
   ============================================================ */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../dist/site", import.meta.url)));
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

async function send(res, status, body, type, immutable = false) {
  res.writeHead(status, {
    "content-type": type,
    "content-length": Buffer.byteLength(body),
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin"
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    // normalize() collapses `..`, and the prefix check rejects anything
    // that still tries to climb out of dist/.
    const requested = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!requested.startsWith(ROOT)) return send(res, 403, "Forbidden", TYPES[".txt"]);

    let filePath = requested;
    let info = await stat(filePath).catch(() => null);

    if (info?.isDirectory()) {
      filePath = join(filePath, "index.html");
      info = await stat(filePath).catch(() => null);
    }

    // SPA fallback — any unmatched path renders the app shell.
    if (!info) {
      const shell = await readFile(join(ROOT, "index.html"));
      return send(res, 200, shell, TYPES[".html"]);
    }

    const ext = extname(filePath);
    const body = await readFile(filePath);
    return send(res, 200, body, TYPES[ext] || "application/octet-stream", filePath.includes(`${join(ROOT, "assets")}`));
  } catch (error) {
    console.error("[server]", error);
    return send(res, 500, "Internal server error", TYPES[".txt"]);
  }
});

server.listen(PORT, () => {
  console.log(`\n  Mere X — serving dist/site on http://localhost:${PORT}\n`);
});
