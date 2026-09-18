/* ============================================================
   DOWNLOAD — Mere Code for desktop.
   Detects the visitor's platform, offers the right installer from
   the GitHub release, shows the checksums, and replays the app.
   ============================================================ */

import { icon } from "../lib/icons.js";
import { pageHead, sectionHead, button, ctaBand } from "../components/ui.js";
import { demoMarkup, mountDemo } from "../components/demo.js";
import { escapeHtml } from "../lib/dom.js";
import { onLeave } from "../lib/router.js";

export const DESKTOP_VERSION = "0.1.0";
const RELEASE = `https://github.com/MereApex/Mere-X/releases/download/desktop-v${DESKTOP_VERSION}`;
const RELEASE_PAGE = `https://github.com/MereApex/Mere-X/releases/tag/desktop-v${DESKTOP_VERSION}`;

export const BUILDS = [
  { id: "windows", os: "Windows", label: "Download for Windows", sub: "Windows 10 / 11 · x64 · installer, 3 MB", href: `${RELEASE}/MereCode-${DESKTOP_VERSION}-windows-x64-setup.exe`, file: `MereCode-${DESKTOP_VERSION}-windows-x64-setup.exe`, alt: { label: ".msi for managed installs", href: `${RELEASE}/MereCode-${DESKTOP_VERSION}-windows-x64.msi` }, available: true },
  { id: "macos", os: "macOS", label: "macOS", sub: "Apple silicon and Intel · coming next", available: false },
  { id: "linux", os: "Linux", label: "Linux", sub: "AppImage and .deb · coming next", available: false }
];

const STEPS = [
  { n: "01", title: "Download and run the installer", body: "It installs for your user account only — no administrator prompt. WebView2 is added automatically if Windows does not have it yet." },
  { n: "02", title: "Sign in with your Mere X account", body: "The same account, plan and threads as the web. No separate licence, nothing to configure." },
  { n: "03", title: "Open a folder", body: "Mere reads the code it needs, edits with care, runs your tests in the built-in terminal and shows every diff before you keep it." }
];

const INSIDE = [
  { icon: "terminal", title: "A real terminal", body: "Your shell, in the project folder. The agent runs tests, builds and scripts and reads the output back." },
  { icon: "branch", title: "Git, built in", body: "Status, diffs and commits from the ledger. The agent reads the repository; it never rewrites history." },
  { icon: "diff", title: "Review in the editor", body: "Every agent edit opens as a unified diff you accept or reject chunk by chunk. Every prompt is a checkpoint." },
  { icon: "shield", title: "Your files stay on disk", body: "Nothing is uploaded to be edited. Only what the agent reads for a turn is sent, and never used for training." },
  { icon: "bolt", title: "8 MB, native", body: "A native window on WebView2, not a bundled browser. Starts in under a second and stays out of your way." },
  { icon: "refresh", title: "Updates itself", body: "Signed updates arrive in the title bar. One click installs and restarts." }
];

export function detectPlatform() {
  const ua = navigator.userAgent || "";
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return "windows";
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return "macos";
  if (/Linux/i.test(platform) && !/Android/i.test(ua)) return "linux";
  return "windows";
}

function buildCard(build, primary) {
  return `
    <div class="dl-card${primary ? " is-primary" : ""}${build.available ? "" : " is-soon"}" data-reveal data-build="${build.id}">
      <span class="dl-os">${build.os}</span>
      <strong>${escapeHtml(build.label)}</strong>
      <small>${escapeHtml(build.sub)}</small>
      ${build.available
        ? `<a class="btn ${primary ? "btn-primary" : "btn-secondary"}" href="${build.href}" data-download="${build.id}" download><span>${primary ? "Download" : `Get for ${build.os}`}</span>${icon("download", "icon").value}</a>
           ${build.alt ? `<a class="dl-alt" href="${build.alt.href}" download>${escapeHtml(build.alt.label)}</a>` : ""}`
        : `<span class="dl-soon">In development</span>`}
    </div>`;
}

export default {
  title: "Download Mere Code",
  description: "Mere Code for desktop: the coding agent with a real terminal, git and reviewable diffs. Free download for Windows; macOS and Linux next.",

  render() {
    const current = detectPlatform();
    const primary = BUILDS.find((build) => build.id === current && build.available) || BUILDS[0];
    return `
      ${pageHead({
        crumb: [{ label: "Product", href: "/products" }, { label: "Download" }],
        eyebrow: `Mere Code for desktop · v${DESKTOP_VERSION}`,
        title: "The agent, on your computer.",
        lead: "A real terminal, git and reviewable diffs around the same Mere models as the web. One installer, your Mere X account, no setup.",
        actions: `${button({ label: primary.label, href: primary.href, icon: "download", magnetic: true, attrs: `data-download="${primary.id}" download` }).value}
                  ${button({ label: "Open in the browser instead", href: "/app", variant: "secondary", icon: "arrow-ne" }).value}`,
        meta: `<span class="dl-meta">${icon("check", "icon").value}Free with every plan</span><span class="dl-meta">${icon("check", "icon").value}Per-user install, no admin</span><span class="dl-meta">${icon("check", "icon").value}Signed updates</span>`
      }).value}

      <section class="section-tight">
        <div class="shell shell-wide">
          <div class="dl-grid" data-stagger="80">
            ${BUILDS.map((build) => buildCard(build, build.id === primary.id)).join("")}
          </div>
          <p class="dl-checks" data-reveal>SHA-256 · <code data-dl-sum>${escapeHtml(primary.file)}</code> <span data-dl-sum-value>loading…</span> · <a class="link-plain" href="${RELEASE_PAGE}" target="_blank" rel="noopener">All files and checksums</a></p>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Three steps", title: "Installed in a minute." }).value}
          <div class="dl-steps" data-stagger="90">
            ${STEPS.map((step) => `<div class="dl-step" data-reveal><span class="dl-step-n">${step.n}</span><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.body)}</p></div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line home-demo-section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "What you get", title: "This is the program.", lead: "The replay below is the desktop app working through one change: it searches, reads, plans, edits in the editor, writes a test, runs the suite in the terminal and hands you the diff." }).value}
          ${demoMarkup()}
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Inside", title: "Built for a codebase on disk." }).value}
          <div class="home-features" data-stagger="60" data-spotlight>
            ${INSIDE.map((item) => `<div class="home-feature-card" data-reveal><span class="home-feature-icon">${icon(item.icon, "icon").value}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></div>`).join("")}
          </div>
        </div>
      </section>

      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "Requirements", title: "What it needs." }).value}
          <div class="dl-req" data-reveal>
            <div><strong>Windows</strong><p>Windows 10 (1809+) or 11, 64-bit. Microsoft Edge WebView2 (installed automatically). Git on your PATH for the repository panel. About 30 MB of disk.</p></div>
            <div><strong>Account</strong><p>A Mere X account. Free includes Mere Nyx 2 at Fast and Medium; Starter and above unlock Orion 3, Apex 4 and the deeper thinking levels.</p></div>
            <div><strong>Not signed yet</strong><p>The first build is not code-signed, so Windows SmartScreen may ask once: choose “More info → Run anyway”. Compare the SHA-256 above if you want to be sure.</p></div>
          </div>
        </div>
      </section>

      ${ctaBand({
        eyebrow: "Mere Code",
        title: "Download and open a folder.",
        body: "Everything else happens in the thread.",
        primary: { label: primary.label, href: primary.href, icon: "download" },
        secondary: { label: "Read how it works", href: "/products/code" }
      }).value}`;
  },

  mount(root) {
    const stopDemo = mountDemo(root.querySelector("[data-demo-stage]"));
    /* The newest release, read through our server: links, version and the
       checksum can never disagree with the published files. */
    const controller = new AbortController();
    const valueNode = root.querySelector("[data-dl-sum-value]");
    const fileNode = root.querySelector("[data-dl-sum]");
    fetch("/api/desktop/latest", { signal: controller.signal, headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((release) => {
        if (!release?.version) throw new Error("no release");
        root.querySelectorAll('[data-download="windows"]').forEach((link) => link.setAttribute("href", release.windows.setup.url));
        root.querySelectorAll('a[href$=".msi"]').forEach((link) => link.setAttribute("href", release.windows.msi.url));
        root.querySelectorAll(".page-head .eyebrow").forEach((node) => { node.textContent = `Mere Code for desktop · v${release.version}`; });
        if (fileNode) fileNode.textContent = release.windows.setup.file;
        if (valueNode) valueNode.textContent = release.windows.setup.sha256 || "see the release";
      })
      .catch(() => { if (valueNode) valueNode.textContent = "see the release"; });
    onLeave(() => { stopDemo(); controller.abort(); });
  }
};
