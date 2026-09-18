/* ============================================================
   MERE X — application entry
   Builds the shell, registers every route, and starts the
   global motion layer.
   ============================================================ */

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/shell.css";
import "./styles/site.css";
import "./styles/console.css";
import "./styles/hero.css";
import "./styles/home.css";
import "./styles/demo.css";
import "./styles/alive.css";
import "./styles/download.css";

import { renderNav, mountNav } from "./components/nav.js";
import { renderFooter } from "./components/footer.js";
import { route, fallback, start, onNavigate } from "./lib/router.js";
import { initReveal, initMagnetic, initScrollParallax } from "./lib/motion.js";
import { mountCodeBlocks, mountAccordions } from "./components/ui.js";
import { hydrateConsole } from "./lib/store.js";

/* ------------------------------------------------------------
   Shell
   ------------------------------------------------------------ */
const app = document.getElementById("app");
app.innerHTML = `
  <div class="route-progress" id="routeProgress"></div>
  ${renderNav()}
  <main id="main"></main>
  ${renderFooter()}
`;
app.removeAttribute("aria-busy");

mountNav(app);

/* The home composition fills exactly one viewport beneath the header,
   so the header's rendered height is published as a custom property. */
const header = app.querySelector("#siteNav");
const publishHeaderHeight = () => {
  document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
};
window.addEventListener("resize", publishHeaderHeight, { passive: true });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(publishHeaderHeight);

/* ------------------------------------------------------------
   Routes
   ------------------------------------------------------------ */
route("/", () => import("./pages/home.js"));
route("/download", () => import("./pages/download.js"));

/* Research */
route("/research", () => import("./pages/research/overview.js"));
route("/research/publications", () => import("./pages/research/publications.js"));
route("/research/interpretability", () => import("./pages/research/interpretability.js"));
route("/research/alignment", () => import("./pages/research/alignment.js"));
route("/research/evaluations", () => import("./pages/research/evaluations.js"));
route("/research/residency", () => import("./pages/research/residency.js"));

/* Technology */
route("/technology", () => import("./pages/technology/overview.js"));
route("/technology/models/:id", () => import("./pages/technology/model.js"));
route("/technology/reasoning", () => import("./pages/technology/reasoning.js"));
route("/technology/architecture", () => import("./pages/technology/architecture.js"));
route("/technology/infrastructure", () => import("./pages/technology/infrastructure.js"));
route("/technology/benchmarks", () => import("./pages/technology/benchmarks.js"));

/* Products */
route("/products", () => import("./pages/products/overview.js"));
route("/products/mere-x", () => import("./pages/products/code.js"));
route("/products/code", () => import("./pages/products/code.js"));
route("/products/api", () => import("./pages/products/api.js"));
route("/products/enterprise", () => import("./pages/products/enterprise.js"));
route("/pricing", () => import("./pages/pricing.js"));

/* Safety */
route("/safety", () => import("./pages/safety/overview.js"));
route("/safety/scaling-policy", () => import("./pages/safety/scaling.js"));
route("/safety/system-cards", () => import("./pages/safety/system-cards.js"));
route("/safety/usage-policy", () => import("./pages/safety/usage-policy.js"));
route("/safety/transparency", () => import("./pages/safety/transparency.js"));
route("/safety/disclosure", () => import("./pages/safety/disclosure.js"));

/* Company */
route("/company", () => import("./pages/company/about.js"));
route("/company/careers", () => import("./pages/company/careers.js"));
route("/company/news", () => import("./pages/company/news.js"));
route("/company/customers", () => import("./pages/company/customers.js"));
route("/company/trust", () => import("./pages/company/trust.js"));
route("/company/contact", () => import("./pages/company/contact.js"));

/* Resources */
route("/docs", () => import("./pages/docs.js"));
route("/docs/:slug", () => import("./pages/docs.js"));
route("/changelog", () => import("./pages/resources/changelog.js"));
route("/status", () => import("./pages/resources/status.js"));
route("/support", () => import("./pages/resources/support.js"));
route("/search", () => import("./pages/search.js"));

/* Legal */
route("/legal/:slug", () => import("./pages/legal.js"));

/* Console */
const consolePage = (loader) => async () => {
  await hydrateConsole();
  return loader();
};
route("/console", consolePage(() => import("./console/dashboard.js")));
route("/console/keys", consolePage(() => import("./console/keys.js")));
route("/console/playground", consolePage(() => import("./console/playground.js")));
route("/console/usage", consolePage(() => import("./console/usage.js")));
route("/console/logs", consolePage(() => import("./console/logs.js")));
route("/console/billing", consolePage(() => import("./console/billing.js")));
route("/console/webhooks", consolePage(() => import("./console/webhooks.js")));
route("/console/limits", consolePage(() => import("./console/limits.js")));
route("/console/organization", consolePage(() => import("./console/organization.js")));
route("/console/settings", consolePage(() => import("./console/settings.js")));

fallback(() => import("./pages/not-found.js"));

/* ------------------------------------------------------------
   Global behaviour that re-arms on every navigation
   ------------------------------------------------------------ */
const main = document.getElementById("main");
let pageCleanups = [];
let motionFrame = 0;

onNavigate((ctx) => {
  document.body.dataset.route = ctx.path === "/" ? "home" : "page";
  publishHeaderHeight();

  pageCleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
  pageCleanups = [];

  // A navigation that lands before the previous frame fires must not
  // arm motion against a view that has already been replaced.
  if (motionFrame) cancelAnimationFrame(motionFrame);
  motionFrame = requestAnimationFrame(() => {
    motionFrame = 0;
    pageCleanups.push(initReveal(main));
    pageCleanups.push(initScrollParallax(main));
    pageCleanups.push(initMagnetic(main));
    mountCodeBlocks(main);
    mountAccordions(main);
  });
});

document.body.dataset.route = location.pathname.replace(/\/+$/, "") === "" ? "home" : "page";
publishHeaderHeight();

start({ mount: main, progress: document.getElementById("routeProgress") });
