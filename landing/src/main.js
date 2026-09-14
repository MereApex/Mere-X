/* ============================================================
   MERE X — application entry
   Builds the shell, registers every route, and starts the
   global motion layer.
   ============================================================ */

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/site.css";
import "./styles/hero-cinematic.css";
import "./styles/console.css";

import { renderNav, mountNav } from "./components/nav.js";
import { renderFooter } from "./components/footer.js";
import { route, fallback, start, onNavigate } from "./lib/router.js";
import { initReveal, initSpotlights, initCursorGlow, initMagnetic, initScrollParallax } from "./lib/motion.js";
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

/* ------------------------------------------------------------
   Routes
   ------------------------------------------------------------ */
route("/", () => import("./pages/home.js"));

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
route("/technology/multimodal", () => import("./pages/technology/multimodal.js"));
route("/technology/infrastructure", () => import("./pages/technology/infrastructure.js"));
route("/technology/benchmarks", () => import("./pages/technology/benchmarks.js"));

/* Products */
route("/products", () => import("./pages/products/overview.js"));
route("/products/mere-x", () => import("./pages/products/mere-x.js"));
route("/products/work", () => import("./pages/products/work.js"));
route("/products/code", () => import("./pages/products/code.js"));
route("/products/api", () => import("./pages/products/api.js"));
route("/products/connectors", () => import("./pages/products/connectors.js"));
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

onNavigate(() => {
  pageCleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
  pageCleanups = [];

  requestAnimationFrame(() => {
    pageCleanups.push(initReveal(main));
    pageCleanups.push(initScrollParallax(main));
    pageCleanups.push(initMagnetic(main));
    mountCodeBlocks(main);
    mountAccordions(main);
  });
});

initSpotlights(document);
initCursorGlow();

start({ mount: main, progress: document.getElementById("routeProgress") });
