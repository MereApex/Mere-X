/* ============================================================
   HOME — one full-viewport composition.
   Wordmark and nav, the headline with its checker, one CTA, the
   globe tagline, and the dual-portrait reveal behind it all.
   ============================================================ */

import { icon, cornerMark, cornerFrame, checkerMark, globeMark } from "../lib/icons.js";
import { renderRevealBackground, mountRevealBackground } from "../components/reveal.js";
import { onLeave } from "../lib/router.js";

const STATUS_LABEL = {
  pending: "Status · Checking",
  ok: "Status · Operational",
  down: "Status · Offline"
};

export default {
  title: "Future Forward Intelligence",
  description:
    "Mere X is an AI research and product company. Future forward intelligence — the Mere X model family, engineered for reasoning, safety, and real work.",

  render() {
    return `
    <section class="home" aria-label="Mere X — Future Forward Intelligence">
      <div class="home-left">
        ${cornerMark("tl").value}
        <h1 class="home-title">
          <span>Future</span>
          <span>Forward</span>
          <span class="with-checker">Intelligence ${checkerMark().value}</span>
        </h1>
        ${cornerMark("bl").value}
        <a class="btn btn-secondary home-cta" href="/app">
          <span>Try Mere X</span>${icon("arrow-ne", "icon icon-arrow").value}
        </a>
        <p class="home-spec">
          <span>Mere X 5.5</span><i></i>
          <span>Apex · Orion · Nyx</span><i></i>
          <span>1,000,000-token context</span><i></i>
          <span>Four reasoning depths</span>
        </p>
      </div>

      <aside class="home-feature" aria-label="Mere X">
        ${cornerFrame().value}
        ${globeMark().value}
        <p class="home-tagline">Beyond benchmarks.<br>Built for real work.</p>
        <p class="home-status" data-home-status data-state="pending">
          <span class="dot"></span><span data-status-label>${STATUS_LABEL.pending}</span>
        </p>
      </aside>
    </section>

    <section class="home-still">
      <div class="home-still-frame" role="img" aria-label="A portrait in white — the Mere X visual identity"></div>
    </section>`;
  },

  mount(root) {
    // The background is fixed and must not live inside the animating route
    // view, so it mounts on the app shell and leaves with the page.
    const app = document.getElementById("app");
    app.insertAdjacentHTML("afterbegin", renderRevealBackground());
    const bg = app.querySelector("[data-reveal-bg]");
    const stopReveal = mountRevealBackground(app);

    // Live platform status from the public health endpoint.
    const status = root.querySelector("[data-home-status]");
    const label = root.querySelector("[data-status-label]");
    const controller = new AbortController();
    const setState = (state) => {
      if (!status || !label) return;
      status.dataset.state = state;
      label.textContent = STATUS_LABEL[state];
    };
    fetch("/api/health", { signal: controller.signal, headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data) => setState(data && data.ok ? "ok" : "down"))
      .catch((error) => { if (error.name !== "AbortError") setState("down"); });

    onLeave(() => {
      stopReveal();
      bg?.remove();
      controller.abort();
    });
  }
};
