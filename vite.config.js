import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const outDir = path.resolve(root, "dist", "app");

// Every root-level *.html file is a page, so new pages need no config change.
const pages = fs
  .readdirSync(root)
  .filter((file) => file.endsWith(".html"))
  .map((file) => file.slice(0, -".html".length));

const cleanPathFor = (page) => (page === "index" ? "/" : `/${page}`);

// Keeps ".html" out of the address bar: any request for /page.html is redirected
// to /page, which Vite (dev) and the directory-style build output (preview/prod)
// both resolve back to the same document.
function cleanUrls() {
  const redirectHtmlRequests = (req, res, next) => {
    const [pathname, search = ""] = req.url.split("?");
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return next();
    }

    if (!decoded.endsWith(".html")) return next();

    const page = decoded.replace(/^\//, "").replace(/\.html$/, "").replace(/\/index$/, "");
    if (!pages.includes(page || "index")) return next();

    res.statusCode = 301;
    res.setHeader("Location", cleanPathFor(page || "index") + (search ? `?${search}` : ""));
    res.end();
  };

  return {
    name: "mere-x-clean-urls",
    configureServer(server) {
      server.middlewares.use(redirectHtmlRequests);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirectHtmlRequests);
    },
    // Ship dist/pricing/index.html instead of dist/pricing.html so /pricing resolves
    // on any static host without extra rewrite rules.
    closeBundle: {
      sequential: true,
      order: "post",
      handler() {
        for (const page of pages) {
          if (page === "index") continue;
          const flat = path.join(outDir, `${page}.html`);
          if (!fs.existsSync(flat)) continue;
          const nested = path.join(outDir, page, "index.html");
          fs.mkdirSync(path.dirname(nested), { recursive: true });
          fs.renameSync(flat, nested);
        }
      }
    }
  };
}

export default defineConfig({
  base: "/app/",
  plugins: [cleanUrls()],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page === "index" ? "main" : page, fileURLToPath(new URL(`./${page}.html`, import.meta.url))])
      )
    }
  }
});
