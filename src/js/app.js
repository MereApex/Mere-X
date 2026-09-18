/* ============================================================
   MERE CODE — the workspace
   One conversation with the agent, a sidebar of threads, and
   the project it works on. Files are read and written on the
   person's machine; every step and every diff shows up in the
   thread. The heavy lifting lives in project-fs.js, agent.js,
   agent-tools.js, thread.js and preview.js.
   ============================================================ */

import {
  supportsLocalFolders, openLocalFolder, createVirtualProject, projectFromDrop, reopenProject,
  forgetProject, changeStore, normalizePath, isBinaryPath
} from "./project-fs.js";
import { runTurn, forgetItems, AssistantError } from "./agent.js";
import { escapeHtml, renderUserMessage, renderAssistantMessage, LiveTurn, renderDiffBlock, paintChanges } from "./thread.js";
import { diffStats } from "./diff.js";
import { highlight } from "./highlight.js";
import { buildPreviewDocument, pickEntry } from "./preview.js";

const body = document.body;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

/* ------------------------------------------------------------
   Elements
   ------------------------------------------------------------ */
const els = {
  sidebarToggle: $("#sidebarToggle"),
  sidebarOpen: $("#sidebarOpen"),
  mobileMenu: $("#mobileMenu"),
  mobileBackdrop: $("#mobileBackdrop"),
  paletteTrigger: $("#paletteTrigger"),
  newThreadButton: $("#newThreadButton"),
  projectTrigger: $("#projectTrigger"),
  projectTriggerLabel: $("#projectTriggerLabel"),
  projectTriggerMeta: $("#projectTriggerMeta"),
  projectPopover: $("#projectPopover"),
  projectList: $("#projectList"),
  closeProjectButton: $("#closeProjectButton"),
  browseFilesButton: $("#browseFilesButton"),
  reindexButton: $("#reindexButton"),
  threadList: $("#threadList"),
  threadEmpty: $("#threadEmpty"),
  profileButton: $("#profileButton"),
  accountPopover: $("#accountPopover"),
  threadTitle: $("#threadTitle"),
  threadTitleButton: $("#threadTitleButton"),
  threadMenu: $("#threadMenu"),
  syncState: $("#syncState"),
  changesChip: $("#changesChip"),
  changesChipLabel: $("#changesChipLabel"),
  previewToggle: $("#previewToggle"),
  threadScroll: $("#threadScroll"),
  thread: $("#thread"),
  welcomeStarters: $("#welcomeStarters"),
  recentProjects: $("#recentProjects"),
  recentProjectList: $("#recentProjectList"),
  commandMenu: $("#commandMenu"),
  mentionMenu: $("#mentionMenu"),
  composerForm: $("#composerForm"),
  composerContext: $("#composerContext"),
  promptInput: $("#promptInput"),
  modeTrigger: $("#modeTrigger"),
  modeLabel: $("#modeLabel"),
  modePopover: $("#modePopover"),
  modelTrigger: $("#modelTrigger"),
  modelLabel: $("#modelLabel"),
  modelPopover: $("#modelPopover"),
  effortTrigger: $("#effortTrigger"),
  effortValue: $("#effortValue"),
  effortPopover: $("#effortPopover"),
  effortSlider: $("#effortSlider"),
  effortRange: $("#effortRange"),
  effortLock: $("#effortLock"),
  effortNote: $("#effortNote"),
  effortHeadingLabel: $("#effortHeadingLabel"),
  mentionButton: $("#mentionButton"),
  attachButton: $("#attachButton"),
  attachmentInput: $("#attachmentInput"),
  webToggle: $("#webToggle"),
  sendButton: $("#sendButton"),
  composerNote: $("#composerNote"),
  previewPane: $("#previewPane"),
  previewFrame: $("#previewFrame"),
  previewEntry: $("#previewEntry"),
  previewSelect: $("#previewSelect"),
  previewLog: $("#previewLog"),
  changesDrawer: $("#changesDrawer"),
  changesPanel: $("#changesPanel"),
  changesEmpty: $("#changesEmpty"),
  dropOverlay: $("#dropOverlay"),
  paletteModal: $("#paletteModal"),
  paletteInput: $("#paletteInput"),
  paletteResults: $("#paletteResults"),
  fileModal: $("#fileModal"),
  fileModalTitle: $("#fileModalTitle"),
  fileModalMeta: $("#fileModalMeta"),
  fileModalBody: $("#fileModalBody"),
  fileModalMention: $("#fileModalMention"),
  fileModalCopy: $("#fileModalCopy"),
  fileModalClose: $("#fileModalClose"),
  settingsModal: $("#settingsModal"),
  settingsNav: $("#settingsNav"),
  settingsPanel: $("#settingsPanel"),
  actionModal: $("#actionModal"),
  actionForm: $("#actionForm"),
  actionBody: $("#actionBody"),
  actionSubmit: $("#actionSubmit"),
  actionTitle: $("#actionTitle"),
  actionEyebrow: $("#actionEyebrow"),
  profilePhotoInput: $("#profilePhotoInput"),
  toast: $("#toast"),
  toastText: $("#toastText")
};

/* ------------------------------------------------------------
   State
   ------------------------------------------------------------ */
const APP_STATE_KEY = "mere-x.code-state";
let workspaceStorageKey = APP_STATE_KEY;
const MODEL_KEYS = ["nyx", "orion", "apex"];
const MODEL_NAMES = Object.freeze({ nyx: "Mere 4.0 Lite", orion: "Mere 4.2 Core", apex: "Mere 4.2 Peak" });
const EFFORT_LEVELS = [
  { name: "Fast", note: "No deliberation. Instant answers and small, obvious edits." },
  { name: "Medium", note: "Brief reasoning. Good for everyday changes and questions." },
  { name: "High", note: "Deliberate reasoning for multi-file work." },
  { name: "Extra High", note: "Longest thinking. For refactors that must be right the first time." }
];
const MODES = Object.freeze({ agent: "Agent", plan: "Plan", ask: "Ask" });
const CLIENT_PLAN_RULES = Object.freeze({
  Free: { models: ["nyx"], defaultModel: "nyx", efforts: ["Fast", "Medium"] },
  Starter: { models: ["nyx", "orion"], defaultModel: "orion", efforts: ["Fast", "Medium", "High"] },
  Plus: { models: MODEL_KEYS, defaultModel: "orion", efforts: ["Fast", "Medium", "High", "Extra High"] },
  Pro: { models: MODEL_KEYS, defaultModel: "apex", efforts: ["Fast", "Medium", "High", "Extra High"] },
  Max: { models: MODEL_KEYS, defaultModel: "apex", efforts: ["Fast", "Medium", "High", "Extra High"] }
});
const DEFAULT_SETTINGS = {
  language: "English",
  "default-effort": "High",
  "model-profile": "apex",
  mode: "agent",
  web: false,
  "ask-before-delete": true,
  "max-rounds": 40,
  "reduced-motion": false,
  "text-size": "Default",
  sound: false,
  "public-profile": false
};

function normalizeWorkspaceState(stored = {}) {
  const value = stored && typeof stored === "object" ? stored : {};
  return {
    settings: { ...DEFAULT_SETTINGS, ...(value.settings || {}) },
    projects: (Array.isArray(value.projects) ? value.projects : []).map((project) => ({
      id: String(project.id || ""), name: String(project.name || "Project"), kind: project.kind === "local" ? "local" : "virtual",
      createdAt: project.createdAt || new Date().toISOString(), openedAt: project.openedAt || project.createdAt || new Date().toISOString(),
      pinned: project.pinned === true, rules: typeof project.rules === "string" ? project.rules : "",
      memory: (Array.isArray(project.memory) ? project.memory : []).filter((note) => note && typeof note.note === "string").slice(0, 60)
    })).filter((project) => project.id),
    conversations: (Array.isArray(value.conversations) ? value.conversations : []).map((conversation) => ({
      ...conversation,
      projectId: conversation.projectId || "",
      pinned: conversation.pinned === true,
      archived: conversation.archived === true,
      messages: Array.isArray(conversation.messages) ? conversation.messages : []
    })),
    plugins: Array.isArray(value.plugins) ? value.plugins : [],
    customInstructions: typeof value.customInstructions === "string" ? value.customInstructions : "",
    username: value.username || "",
    profilePhoto: value.profilePhoto || "",
    billing: value.billing || { email: "", autoRenew: true }
  };
}

function loadWorkspaceState(key = workspaceStorageKey) {
  try {
    return normalizeWorkspaceState(JSON.parse(localStorage.getItem(key) || "{}"));
  } catch {
    return normalizeWorkspaceState({});
  }
}

let appState = loadWorkspaceState();
let currentUser = null;
let accountEntitlements = { plan: "Free", ...CLIENT_PLAN_RULES.Free, limits: {} };
let accountUsage = null;
let selectedModel = appState.settings["model-profile"];
let selectedEffort = appState.settings["default-effort"];
let selectedMode = appState.settings.mode;
let webEnabled = appState.settings.web === true;
let effortIndex = Math.max(0, EFFORT_LEVELS.findIndex((level) => level.name === selectedEffort));

let project = null;              // ProjectFS
let projectRecord = null;        // the entry in appState.projects
let currentConversationId = null;
let composerMentions = [];       // [{ kind, path, label }]
let pendingAttachments = [];
let uploadingFiles = 0;
const runs = new Map();          // conversationId -> { controller, live }
const sessionChanges = new Map();// path -> { path, kind, before, after, added, removed, decision, conversationId, messageId }
let toastTimer = 0;
let deferredInstallPrompt = null;
let viewerPath = "";

/* ------------------------------------------------------------
   Small utilities
   ------------------------------------------------------------ */
function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function showToast(message) {
  els.toastText.textContent = message;
  els.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("visible"), 2600);
}

async function apiJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error("The Mere X server is unavailable.");
  }
  if (response.ok) return response.status === 204 ? null : response.json();
  let payload;
  try { payload = await response.json(); } catch { payload = null; }
  throw new Error(payload?.error?.message || `Request failed (${response.status})`);
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
}

/* ------------------------------------------------------------
   Persistence and sync
   ------------------------------------------------------------ */
let workspaceSyncTimer = 0;
let pendingWorkspaceSync = null;
let workspaceSyncInFlight = null;
let workspaceMutationVersion = 0;
/* Nothing is written while the account is being hydrated: a save at that
   point would outrank the cloud copy and erase what other devices did. */
let booting = false;

function setSyncState(state, label) {
  els.syncState.dataset.state = state;
  els.syncState.querySelector("span").textContent = label;
}

function persistedWorkspaceState() {
  return { ...appState, conversations: appState.conversations.map(compactConversation) };
}

/* The synced snapshot keeps prose and step summaries; tool output beyond a
   short excerpt lives only in this session. */
function compactConversation(conversation) {
  return {
    ...conversation,
    messages: conversation.messages.map((message) => message.role !== "assistant" ? message : {
      ...message,
      parts: (message.parts || []).map((part) => part.type === "call"
        ? { ...part, output: String(part.output || "").slice(0, 400), args: compactArgs(part.args) }
        : part.type === "thought" ? { ...part, text: String(part.text || "").slice(0, 2_000) } : part)
    })
  };
}

function compactArgs(args) {
  if (!args || typeof args !== "object") return args;
  const out = {};
  for (const [key, value] of Object.entries(args)) out[key] = typeof value === "string" ? value.slice(0, 300) : value;
  return out;
}

function queueWorkspaceSync() {
  if (!currentUser) return;
  pendingWorkspaceSync = { userId: String(currentUser.id), state: persistedWorkspaceState() };
  clearTimeout(workspaceSyncTimer);
  workspaceSyncTimer = window.setTimeout(flushWorkspaceSync, 600);
  setSyncState("syncing", "Syncing");
}

async function flushWorkspaceSync() {
  clearTimeout(workspaceSyncTimer);
  workspaceSyncTimer = 0;
  if (!pendingWorkspaceSync || workspaceSyncInFlight) return;
  if (!currentUser || pendingWorkspaceSync.userId !== String(currentUser.id)) { pendingWorkspaceSync = null; return; }
  const { state } = pendingWorkspaceSync;
  pendingWorkspaceSync = null;
  workspaceSyncInFlight = apiJson("/api/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) });
  try {
    await workspaceSyncInFlight;
    setSyncState("synced", "Synced");
  } catch {
    setSyncState("offline", "Local only");
  } finally {
    workspaceSyncInFlight = null;
    if (pendingWorkspaceSync) flushWorkspaceSync();
  }
}

function saveWorkspaceState() {
  if (booting) return;
  workspaceMutationVersion += 1;
  try {
    localStorage.setItem(workspaceStorageKey, JSON.stringify(persistedWorkspaceState()));
    queueWorkspaceSync();
  } catch {
    showToast("Local storage is unavailable");
  }
}

async function hydrateWorkspaceFromDatabase(ifUnchangedSince = workspaceMutationVersion) {
  if (!currentUser) return;
  const remote = await apiJson("/api/workspace");
  if (workspaceMutationVersion !== ifUnchangedSince) return { skipped: true };
  if (remote?.state) appState = normalizeWorkspaceState(remote.state);
  else await apiJson("/api/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: persistedWorkspaceState() }) });
  applySettingsFromState();
}

function applySettingsFromState() {
  selectedEffort = EFFORT_LEVELS.some((level) => level.name === appState.settings["default-effort"]) ? appState.settings["default-effort"] : "High";
  selectedModel = MODEL_KEYS.includes(appState.settings["model-profile"]) ? appState.settings["model-profile"] : accountEntitlements.defaultModel;
  selectedMode = MODES[appState.settings.mode] ? appState.settings.mode : "agent";
  webEnabled = appState.settings.web === true;
  effortIndex = Math.max(0, EFFORT_LEVELS.findIndex((level) => level.name === selectedEffort));
  body.classList.toggle("reduce-motion", appState.settings["reduced-motion"] === true);
  document.documentElement.style.setProperty("--reading-scale", { Compact: "0.94", Default: "1", Large: "1.08" }[appState.settings["text-size"]] || "1");
}

function settingValue(key, fallback = "") {
  return Object.prototype.hasOwnProperty.call(appState.settings, key) ? appState.settings[key] : fallback;
}

function setSetting(key, value) {
  appState.settings[key] = value;
  saveWorkspaceState();
}

/* ------------------------------------------------------------
   Entitlements
   ------------------------------------------------------------ */
function localEntitlements(user = currentUser) {
  const plan = Object.prototype.hasOwnProperty.call(CLIENT_PLAN_RULES, user?.plan) ? user.plan : "Free";
  return { plan, ...CLIENT_PLAN_RULES[plan], limits: {} };
}

function modelAvailable(model) {
  return accountEntitlements.models.includes(model);
}

function applyEntitlementUI(persist = false) {
  let corrected = false;
  if (!modelAvailable(selectedModel)) { selectedModel = accountEntitlements.defaultModel; appState.settings["model-profile"] = selectedModel; corrected = true; }
  if (!accountEntitlements.efforts.includes(selectedEffort)) {
    selectedEffort = accountEntitlements.efforts.at(-1) || "Fast";
    appState.settings["default-effort"] = selectedEffort;
    effortIndex = Math.max(0, EFFORT_LEVELS.findIndex((level) => level.name === selectedEffort));
    corrected = true;
  }
  els.modelPopover.querySelectorAll(".model-choice[data-model]").forEach((choice) => {
    const allowed = modelAvailable(choice.dataset.model);
    choice.disabled = !allowed;
    choice.classList.toggle("is-locked", !allowed);
    choice.title = allowed ? "" : `${MODEL_NAMES[choice.dataset.model]} is not included with ${accountEntitlements.plan}`;
  });
  renderSelectedModel();
  applyEffort(effortIndex, false, false);
  if (corrected && persist) saveWorkspaceState();
  return corrected;
}

async function refreshAccountUsage() {
  if (!currentUser) return;
  try {
    const result = await apiJson("/api/usage");
    accountEntitlements = result?.entitlements || localEntitlements();
    accountUsage = result?.usage || null;
  } catch {
    accountEntitlements = localEntitlements();
  }
  applyEntitlementUI(true);
  if (!els.settingsModal.hidden && currentSettingsCategory === "usage") renderSettings("usage");
}

/* ------------------------------------------------------------
   Popovers
   ------------------------------------------------------------ */
function closePopovers(except = null) {
  $$(".popover").forEach((popover) => { if (popover !== except) popover.hidden = true; });
  $$("[aria-haspopup]").forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
}

function positionPopover(popover, anchor, { align = "left", above = false } = {}) {
  const rect = anchor.getBoundingClientRect();
  popover.hidden = false;
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;
  let left = align === "right" ? rect.right - width : rect.left;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  let top = above ? rect.top - height - 6 : rect.bottom + 6;
  if (!above && top + height > window.innerHeight - 8) top = rect.top - height - 6;
  if (above && top < 8) top = rect.bottom + 6;
  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(Math.max(8, top))}px`;
}

function togglePopover(popover, anchor, options = {}) {
  const open = popover.hidden;
  closePopovers();
  if (!open) return;
  positionPopover(popover, anchor, options);
  anchor.setAttribute("aria-expanded", "true");
}

document.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".popover") || event.target.closest("[aria-haspopup]")) return;
  closePopovers();
}, true);

/* ------------------------------------------------------------
   Sidebar and drawers
   ------------------------------------------------------------ */
function setSidebar(collapsed) {
  body.classList.toggle("sidebar-collapsed", collapsed);
  els.sidebarOpen.hidden = !collapsed;
  try { localStorage.setItem("mere-x.sidebar", collapsed ? "collapsed" : "open"); } catch { /* optional */ }
}
els.sidebarToggle.addEventListener("click", () => setSidebar(true));
els.sidebarOpen.addEventListener("click", () => setSidebar(false));
try { if (localStorage.getItem("mere-x.sidebar") === "collapsed") setSidebar(true); } catch { /* optional */ }

function openMobileSidebar() { body.classList.add("mobile-sidebar"); }
function closeMobileSidebar() { body.classList.remove("mobile-sidebar"); }
els.mobileMenu.addEventListener("click", openMobileSidebar);
els.mobileBackdrop.addEventListener("click", closeMobileSidebar);

function setDrawer(name) {
  els.previewPane.hidden = name !== "preview";
  els.changesDrawer.hidden = name !== "changes";
  els.previewToggle.setAttribute("aria-pressed", String(name === "preview"));
  els.changesChip.setAttribute("aria-pressed", String(name === "changes"));
  if (name !== "preview") els.previewFrame.srcdoc = "";
}
function activeDrawer() {
  if (!els.previewPane.hidden) return "preview";
  if (!els.changesDrawer.hidden) return "changes";
  return "";
}

/* ------------------------------------------------------------
   Projects
   ------------------------------------------------------------ */
function updateProjectUI() {
  const has = Boolean(project);
  body.classList.toggle("has-project", has);
  els.projectTriggerLabel.textContent = has ? project.name : "No project";
  els.projectTriggerMeta.textContent = has
    ? `${project.fileCount()} files · ${project.kind === "local" ? "folder on this computer" : "browser project"}`
    : "Open a folder to begin";
  els.closeProjectButton.hidden = !has;
  els.browseFilesButton.hidden = !has;
  els.reindexButton.hidden = !has;
  els.previewToggle.hidden = !has;
  els.welcomeStarters.hidden = !has;
  renderRecentProjects();
  renderThreadList();
  document.title = has ? `${project.name} — Mere Code` : "Mere Code";
}

function rememberProject(record) {
  const existing = appState.projects.find((item) => item.id === record.id);
  const now = new Date().toISOString();
  if (existing) { existing.openedAt = now; existing.name = record.name; projectRecord = existing; }
  else {
    projectRecord = { id: record.id, name: record.name, kind: record.kind, createdAt: now, openedAt: now, pinned: false, rules: "", memory: [] };
    appState.projects.unshift(projectRecord);
  }
  appState.projects.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
  saveWorkspaceState();
  try { localStorage.setItem("mere-x.last-project", record.id); } catch { /* optional */ }
}

async function activateProject(fs) {
  setDrawer("");
  project = fs;
  rememberProject(fs);
  updateProjectUI();
  els.projectTriggerMeta.textContent = `Indexing ${fs.name}…`;
  try {
    await fs.index();
  } catch (error) {
    showToast(`Could not read the folder: ${error.message}`);
  }
  fs.onChange(onProjectChange);
  updateProjectUI();
  showToast(`${fs.name} · ${fs.fileCount()} files${fs.truncated ? " (index truncated)" : ""}`);
  const latest = appState.conversations.filter((item) => item.projectId === fs.id && !item.archived).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
  if (latest) openConversation(latest.id); else startNewThread(false);
  els.promptInput.focus();
}

function onProjectChange(change) {
  if (change.type === "index") return;
  updateProjectUI();
  schedulePreviewRefresh();
}

async function openFolderAction() {
  if (!supportsLocalFolders) {
    showToast("This browser cannot open local folders. Use Chrome or Edge, or drop a folder.");
    return;
  }
  try {
    const fs = await openLocalFolder();
    await activateProject(fs);
  } catch (error) {
    if (error?.name !== "AbortError") showToast(error.message || "Could not open the folder.");
  }
}

function newProjectAction() {
  openActionModal({
    eyebrow: "NEW PROJECT",
    title: "Create a project",
    submitLabel: "Create",
    content: `
      <label class="action-field"><span>Name</span><input name="name" required maxlength="80" placeholder="my-app" autofocus /></label>
      <label class="action-field"><span>Start with</span>
        <select name="template">
          <option value="empty">Empty project</option>
          <option value="web">Static web page (HTML, CSS, JS)</option>
          <option value="node">Node.js module</option>
          <option value="python">Python script</option>
        </select>
      </label>
      <p class="action-copy">Browser projects are saved in this browser's storage. Open a folder instead to work on files on this computer.</p>`,
    onSubmit: async (data) => {
      const name = String(data.get("name") || "").trim() || "project";
      const fs = await createVirtualProject(name, templateFiles(String(data.get("template") || "empty"), name));
      await activateProject(fs);
    }
  });
}

function templateFiles(template, name) {
  if (template === "web") {
    return {
      "index.html": `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${name}</title>\n    <link rel="stylesheet" href="styles.css" />\n  </head>\n  <body>\n    <main>\n      <h1>${name}</h1>\n      <p>Edit this page, or ask Mere to build it out.</p>\n    </main>\n    <script src="app.js"></script>\n  </body>\n</html>\n`,
      "styles.css": `:root { color-scheme: light dark; font-family: system-ui, sans-serif; }\nbody { margin: 0; display: grid; place-items: center; min-height: 100vh; }\nmain { max-width: 60ch; padding: 2rem; }\n`,
      "app.js": `console.log("${name} ready");\n`
    };
  }
  if (template === "node") {
    return {
      "package.json": `{\n  "name": "${name}",\n  "version": "0.1.0",\n  "type": "module",\n  "main": "index.js",\n  "scripts": { "test": "node --test" }\n}\n`,
      "index.js": `export function greet(who = "world") {\n  return \`Hello, \${who}\`;\n}\n`,
      "index.test.js": `import test from "node:test";\nimport assert from "node:assert/strict";\nimport { greet } from "./index.js";\n\ntest("greets", () => {\n  assert.equal(greet("Mere"), "Hello, Mere");\n});\n`,
      "README.md": `# ${name}\n`
    };
  }
  if (template === "python") {
    return {
      "main.py": `def main() -> None:\n    print("${name} ready")\n\n\nif __name__ == "__main__":\n    main()\n`,
      "README.md": `# ${name}\n`
    };
  }
  return { "README.md": `# ${name}\n\nDescribe what this project is for, then ask Mere to start building.\n` };
}

async function reopenProjectById(id, { request = true } = {}) {
  const result = await reopenProject(id, { request });
  if (result.status === "ready") { await activateProject(result.project); return true; }
  if (result.status === "permission") { showToast(`Allow access to ${result.name} to reopen it.`); return false; }
  showToast("That project is no longer available on this device.");
  appState.projects = appState.projects.filter((item) => item.id !== id);
  saveWorkspaceState();
  renderRecentProjects();
  return false;
}

async function closeProject() {
  if (!project) return;
  if (runs.size && !(await confirmAction("Close project", "The agent is still working. Stop it and close the project?", "Close"))) return;
  for (const id of [...runs.keys()]) stopRun(id);
  setDrawer("");
  project = null;
  projectRecord = null;
  currentConversationId = null;
  try { localStorage.removeItem("mere-x.last-project"); } catch { /* optional */ }
  renderThread(null);
  updateProjectUI();
}

async function handleProjectAction(action) {
  closePopovers();
  if (action === "open-folder") return openFolderAction();
  if (action === "new-project") return newProjectAction();
  if (action === "drop") return showToast("Drag a folder from your computer onto this window.");
  if (action === "close") return closeProject();
  if (action === "files") return openPalette("");
  if (action === "reindex") { if (project) { await project.index(); updateProjectUI(); showToast("Project re-indexed"); } return undefined; }
  return undefined;
}

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-project-action]");
  if (action) handleProjectAction(action.dataset.projectAction);
});

function renderRecentProjects() {
  const projects = appState.projects.slice(0, 6);
  els.recentProjects.hidden = !projects.length || Boolean(project);
  els.recentProjectList.innerHTML = projects.map((item) => `
    <button type="button" class="recent-project" data-open-project="${escapeHtml(item.id)}">
      <svg><use href="#${item.kind === "local" ? "i-folder" : "i-cloud"}"></use></svg>
      <span>${escapeHtml(item.name)}</span>
      <small>${item.kind === "local" ? "folder" : "browser"}</small>
    </button>`).join("");
  els.projectList.innerHTML = projects.length ? projects.map((item) => `
    <button type="button" class="project-row ${project?.id === item.id ? "active" : ""}" data-open-project="${escapeHtml(item.id)}">
      <svg><use href="#${item.kind === "local" ? "i-folder" : "i-cloud"}"></use></svg>
      <span><strong>${escapeHtml(item.name)}</strong><small>${item.kind === "local" ? "Folder on this computer" : "Browser project"}</small></span>
      <span class="project-forget" data-forget-project="${escapeHtml(item.id)}" title="Remove from list" role="button"><svg><use href="#i-close"></use></svg></span>
    </button>`).join("") : `<p class="menu-empty">No projects yet.</p>`;
}

document.addEventListener("click", async (event) => {
  const forget = event.target.closest("[data-forget-project]");
  if (forget) {
    event.stopPropagation();
    const id = forget.dataset.forgetProject;
    const record = appState.projects.find((item) => item.id === id);
    const ok = await confirmAction("Remove project", record?.kind === "virtual" ? `Delete the browser project "${record?.name}" and its files?` : `Remove "${record?.name}" from this list? The folder on disk is untouched.`, "Remove");
    if (!ok) return;
    if (project?.id === id) await closeProject();
    appState.projects = appState.projects.filter((item) => item.id !== id);
    saveWorkspaceState();
    await forgetProject(id).catch(() => {});
    renderRecentProjects();
    return;
  }
  const open = event.target.closest("[data-open-project]");
  if (open) { closePopovers(); reopenProjectById(open.dataset.openProject); }
});

els.projectTrigger.addEventListener("click", (event) => {
  event.stopPropagation();
  renderRecentProjects();
  togglePopover(els.projectPopover, els.projectTrigger);
});

/* Drag and drop a folder */
let dragDepth = 0;
window.addEventListener("dragenter", (event) => {
  if (!event.dataTransfer?.types?.includes("Files")) return;
  dragDepth += 1;
  els.dropOverlay.hidden = false;
});
window.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) els.dropOverlay.hidden = true;
});
window.addEventListener("dragover", (event) => { if (event.dataTransfer?.types?.includes("Files")) event.preventDefault(); });
window.addEventListener("drop", async (event) => {
  dragDepth = 0;
  els.dropOverlay.hidden = true;
  if (!event.dataTransfer?.types?.includes("Files")) return;
  event.preventDefault();
  if (event.target.closest(".composer")) { await uploadAttachments([...event.dataTransfer.files]); return; }
  try {
    const fs = await projectFromDrop(event.dataTransfer);
    await activateProject(fs);
  } catch (error) {
    showToast(error.message);
  }
});

/* ------------------------------------------------------------
   File viewer (read-only)
   ------------------------------------------------------------ */
async function openFileViewer(path, line = 0) {
  if (!project) return;
  const key = normalizePath(path);
  if (!project.has(key) || project.isDirectory(key)) { showToast(`${key} is not a file in this project`); return; }
  if (isBinaryPath(key)) { showToast("Binary files cannot be shown"); return; }
  let text;
  try {
    text = await project.read(key);
  } catch (error) {
    showToast(error.message);
    return;
  }
  viewerPath = key;
  const lines = text.split("\n");
  const extension = key.split(".").pop().toLowerCase();
  const language = ["css", "scss", "less", "html", "xml", "svg", "vue", "svelte"].includes(extension) ? extension : extension === "py" ? "python" : ["sh", "bash"].includes(extension) ? "bash" : extension === "json" ? "json" : "js";
  const html = highlight(text, language).split("\n");
  els.fileModalTitle.textContent = key;
  els.fileModalMeta.textContent = `${lines.length} lines`;
  els.fileModalBody.innerHTML = html.map((content, index) => `<div class="ln ${index + 1 === line ? "is-target" : ""}"><i>${index + 1}</i><span>${content || " "}</span></div>`).join("");
  closePopovers();
  els.fileModal.hidden = false;
  requestAnimationFrame(() => {
    const target = els.fileModalBody.querySelector(".is-target");
    if (target) target.scrollIntoView({ block: "center" });
  });
}
function closeFileViewer() { els.fileModal.hidden = true; }
els.fileModalClose.addEventListener("click", closeFileViewer);
els.fileModal.querySelector(".modal-backdrop").addEventListener("click", closeFileViewer);
els.fileModalMention.addEventListener("click", () => { if (viewerPath) addMention({ kind: "file", path: viewerPath }); closeFileViewer(); els.promptInput.focus(); });
els.fileModalCopy.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(await project.read(viewerPath)); showToast("Copied"); } catch { /* optional */ }
});

/* ------------------------------------------------------------
   Review: diffs in the thread, keep / revert, checkpoints
   ------------------------------------------------------------ */
function changeKey(conversationId, messageId, path) {
  return `${conversationId}:${messageId}:${path}`;
}

async function recordChanges(conversation, message, entries) {
  for (const entry of entries) {
    const stats = diffStats(entry.before || "", entry.after === null ? "" : entry.after || "");
    const record = {
      key: changeKey(conversation.id, message.id, entry.path),
      conversationId: conversation.id,
      messageId: message.id,
      path: entry.path,
      kind: entry.kind,
      before: entry.before,
      after: entry.after,
      added: stats.added,
      removed: stats.removed,
      decision: "",
      at: Date.now()
    };
    try { await changeStore.put(record); } catch { /* the session copy still works */ }
    const existing = sessionChanges.get(entry.path);
    /* Later turns on the same file keep the earliest "before" so a revert
       goes all the way back. */
    sessionChanges.set(entry.path, { ...record, before: existing && !existing.decision ? existing.before : record.before, decision: "" });
  }
  renderChangesPanel();
}

async function openDiff(path, { messageId = "", conversationId = currentConversationId } = {}) {
  if (!project) return;
  let record = sessionChanges.get(path);
  if ((!record || record.messageId !== messageId) && messageId) {
    try { record = (await changeStore.get(changeKey(conversationId, messageId, path))) || record; } catch { /* keep the session record */ }
  }
  if (!record) { showToast("The original version of this file is no longer available"); return; }
  let after = record.after;
  if (after !== null && project.has(path)) {
    try { after = await project.read(path); } catch { /* fall back to the recorded copy */ }
  }
  const card = els.thread.querySelector(`[data-message-id="${CSS.escape(messageId || record.messageId)}"] .changes-card`);
  const anchor = card || els.thread.lastElementChild;
  if (!anchor) return;
  const existing = anchor.parentElement.querySelector(`.diff-block[data-path="${CSS.escape(path)}"]`);
  if (existing) { existing.remove(); return; }
  anchor.parentElement.querySelectorAll(".diff-block").forEach((node) => node.remove());
  const block = renderDiffBlock(path, record.before || "", after === null ? "" : after || "");
  block.dataset.path = path;
  anchor.insertAdjacentElement("afterend", block);
  block.querySelector("[data-close-diff]").addEventListener("click", () => block.remove());
  block.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

async function rejectChange(path) {
  const record = sessionChanges.get(path);
  if (!record || !project) return;
  try {
    if (record.before === null || record.before === undefined) {
      if (project.has(path)) await project.delete(path);
    } else {
      await project.write(path, record.before);
    }
    markDecision(path, "rejected");
    showToast(`Reverted ${path.split("/").pop()}`);
  } catch (error) {
    showToast(`Could not revert ${path}: ${error.message}`);
  }
}

function markDecision(path, decision) {
  const record = sessionChanges.get(path);
  if (record) record.decision = decision;
  for (const conversation of appState.conversations) {
    for (const message of conversation.messages) {
      for (const change of message.changes || []) {
        if (change.path === path && !change.decision && (!record || message.id === record.messageId || decision === "rejected")) change.decision = decision;
      }
    }
  }
  saveWorkspaceState();
  repaintChangeCards();
  renderChangesPanel();
  els.thread.querySelectorAll(`.diff-block[data-path="${CSS.escape(path)}"]`).forEach((node) => node.remove());
}

function repaintChangeCards() {
  const conversation = currentConversation();
  if (!conversation) return;
  for (const message of conversation.messages) {
    if (message.role !== "assistant" || !message.changes?.length) continue;
    const card = els.thread.querySelector(`[data-message-id="${CSS.escape(message.id)}"] .changes-card`);
    if (card) paintChanges(card, message.changes, { reviewed: message.changes.every((change) => change.decision) });
  }
}

async function acceptAllChanges(messageId = "") {
  const targets = [...sessionChanges.values()].filter((change) => !change.decision && (!messageId || change.messageId === messageId));
  for (const change of targets) markDecision(change.path, "accepted");
  const conversation = currentConversation();
  if (conversation && messageId) {
    const message = conversation.messages.find((item) => item.id === messageId);
    (message?.changes || []).forEach((change) => { if (!change.decision) change.decision = "accepted"; });
    saveWorkspaceState();
    repaintChangeCards();
  }
  showToast(targets.length ? `Accepted ${targets.length} file${targets.length === 1 ? "" : "s"}` : "Nothing to accept");
}

async function rejectAllChanges(messageId = "") {
  const targets = [...sessionChanges.values()].filter((change) => !change.decision && (!messageId || change.messageId === messageId));
  if (!targets.length) return showToast("Nothing to reject");
  const ok = await confirmAction("Revert changes", `Restore ${targets.length} file${targets.length === 1 ? "" : "s"} to the version before the agent edited ${targets.length === 1 ? "it" : "them"}?`, "Revert");
  if (!ok) return;
  for (const change of targets) await rejectChange(change.path);
}

async function restoreCheckpoint(messageId) {
  const conversation = currentConversation();
  if (!conversation || !project) return;
  const index = conversation.messages.findIndex((message) => message.id === messageId);
  if (index === -1) return;
  const later = conversation.messages.slice(index).filter((message) => message.role === "assistant");
  const records = [];
  for (const message of later.reverse()) {
    for (const change of message.changes || []) {
      const record = sessionChanges.get(change.path)?.messageId === message.id
        ? sessionChanges.get(change.path)
        : await changeStore.get(changeKey(conversation.id, message.id, change.path)).catch(() => null);
      if (record) records.push(record);
    }
  }
  const ok = await confirmAction("Restore checkpoint", records.length
    ? `Restore ${new Set(records.map((record) => record.path)).size} file(s) to how they were before this message, and remove the later messages from the thread?`
    : "Remove this message and everything after it from the thread?", "Restore");
  if (!ok) return;
  for (const record of records) {
    try {
      if (record.before === null || record.before === undefined) { if (project.has(record.path)) await project.delete(record.path); }
      else await project.write(record.path, record.before);
      sessionChanges.delete(record.path);
    } catch (error) {
      showToast(`Could not restore ${record.path}: ${error.message}`);
    }
  }
  const prompt = conversation.messages[index];
  conversation.messages = conversation.messages.slice(0, index);
  forgetItems(conversation.id);
  saveWorkspaceState();
  renderThread(conversation);
  renderChangesPanel();
  els.promptInput.value = prompt.text || "";
  syncComposer();
  els.promptInput.focus();
}

function renderChangesPanel() {
  const pending = [...sessionChanges.values()].filter((change) => !change.decision);
  els.changesChip.hidden = sessionChanges.size === 0;
  els.changesChipLabel.textContent = pending.length ? `${pending.length} to review` : `${sessionChanges.size} changed`;
  const all = [...sessionChanges.values()].sort((a, b) => b.at - a.at);
  els.changesEmpty.hidden = all.length > 0;
  els.changesPanel.innerHTML = all.map((change) => `
    <div class="change-row" data-decision="${escapeHtml(change.decision || "")}">
      <button type="button" class="change-path" data-view-path="${escapeHtml(change.path)}"><svg><use href="#i-file"></use></svg><span>${escapeHtml(change.path)}</span></button>
      <span class="changes-stat"><b class="add">+${change.added}</b> <b class="del">−${change.removed}</b></span>
      ${change.decision ? `<span class="change-decision">${change.decision === "accepted" ? "Accepted" : "Reverted"}</span>` : `<span class="change-buttons"><button type="button" class="call-mini" data-accept-path="${escapeHtml(change.path)}">Accept</button><button type="button" class="call-mini" data-reject-path="${escapeHtml(change.path)}">Reject</button></span>`}
    </div>`).join("");
}

els.changesChip.addEventListener("click", () => { setDrawer(activeDrawer() === "changes" ? "" : "changes"); renderChangesPanel(); });
els.changesDrawer.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-changes-action]");
  if (action) {
    if (action.dataset.changesAction === "accept-all") acceptAllChanges();
    if (action.dataset.changesAction === "reject-all") rejectAllChanges();
    if (action.dataset.changesAction === "close") setDrawer("");
    return;
  }
  const view = event.target.closest("[data-view-path]");
  if (view) { openFileViewer(view.dataset.viewPath); return; }
  const accept = event.target.closest("[data-accept-path]");
  if (accept) { markDecision(accept.dataset.acceptPath, "accepted"); return; }
  const reject = event.target.closest("[data-reject-path]");
  if (reject) await rejectChange(reject.dataset.rejectPath);
});

/* ------------------------------------------------------------
   Threads
   ------------------------------------------------------------ */
function currentConversation() {
  return appState.conversations.find((item) => item.id === currentConversationId) || null;
}

function projectConversations() {
  return appState.conversations
    .filter((item) => (project ? item.projectId === project.id : !item.projectId) && !item.archived)
    .sort((a, b) => (b.pinned - a.pinned) || (new Date(b.updatedAt) - new Date(a.updatedAt)));
}

function startNewThread(focus = true) {
  currentConversationId = null;
  composerMentions = [];
  renderComposerContext();
  renderThread(null);
  renderThreadList();
  closeMobileSidebar();
  if (focus) els.promptInput.focus();
}

function createConversation() {
  const conversation = {
    id: makeId("thread"),
    projectId: project?.id || "",
    title: "New thread",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: false,
    archived: false,
    mode: selectedMode,
    messages: []
  };
  appState.conversations.unshift(conversation);
  currentConversationId = conversation.id;
  return conversation;
}

function openConversation(id) {
  const conversation = appState.conversations.find((item) => item.id === id);
  if (!conversation) return;
  currentConversationId = id;
  renderThread(conversation);
  renderThreadList();
  closeMobileSidebar();
}

function renderThread(conversation) {
  els.thread.replaceChildren();
  const messages = conversation?.messages || [];
  body.classList.toggle("has-thread", messages.length > 0);
  els.threadTitle.textContent = conversation?.title || "New thread";
  messages.forEach((message, index) => {
    if (message.role === "user") els.thread.append(renderUserMessage(message, { index }));
    else if (message.role === "assistant") els.thread.append(renderAssistantMessage(message));
  });
  const run = conversation ? runs.get(conversation.id) : null;
  if (run?.live) els.thread.append(run.live.node);
  requestAnimationFrame(() => { els.threadScroll.scrollTop = els.threadScroll.scrollHeight; });
}

function threadGroup(value) {
  const date = new Date(value);
  const now = new Date();
  const days = Math.floor((now - date) / 86_400_000);
  if (days < 1 && date.toDateString() === now.toDateString()) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return "This week";
  if (days < 30) return "This month";
  return "Earlier";
}

function renderThreadList() {
  const conversations = projectConversations();
  els.threadEmpty.hidden = conversations.length > 0;
  let group = "";
  els.threadList.innerHTML = conversations.map((conversation) => {
    const label = conversation.pinned ? "Pinned" : threadGroup(conversation.updatedAt);
    const heading = label !== group ? `<div class="thread-group">${label}</div>` : "";
    group = label;
    return `${heading}<button type="button" class="thread-row ${conversation.id === currentConversationId ? "active" : ""} ${runs.has(conversation.id) ? "is-running" : ""}" data-open-thread="${escapeHtml(conversation.id)}">
      ${conversation.pinned ? `<svg class="thread-pin"><use href="#i-pin"></use></svg>` : ""}
      <span>${escapeHtml(conversation.title || "New thread")}</span>
      <span class="thread-row-menu" data-thread-menu-for="${escapeHtml(conversation.id)}" role="button" aria-label="Thread actions"><svg><use href="#i-more"></use></svg></span>
    </button>`;
  }).join("");
}

let threadMenuTarget = "";
els.threadList.addEventListener("click", (event) => {
  const menu = event.target.closest("[data-thread-menu-for]");
  if (menu) {
    event.stopPropagation();
    threadMenuTarget = menu.dataset.threadMenuFor;
    closePopovers();
    positionPopover(els.threadMenu, menu, { align: "right" });
    return;
  }
  const row = event.target.closest("[data-open-thread]");
  if (row) openConversation(row.dataset.openThread);
});
els.threadTitleButton.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!currentConversationId) { if (window.innerWidth <= 900) openMobileSidebar(); else setSidebar(false); return; }
  threadMenuTarget = currentConversationId;
  togglePopover(els.threadMenu, els.threadTitleButton);
});
els.threadMenu.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-thread-menu]");
  if (!button) return;
  const conversation = appState.conversations.find((item) => item.id === threadMenuTarget);
  closePopovers();
  if (!conversation) return;
  const action = button.dataset.threadMenu;
  if (action === "rename") {
    openActionModal({ eyebrow: "THREAD", title: "Rename thread", submitLabel: "Rename", content: `<label class="action-field"><span>Title</span><input name="title" required maxlength="80" value="${escapeHtml(conversation.title)}" /></label>`, onSubmit: (data) => { conversation.title = String(data.get("title") || "").trim() || conversation.title; conversation.titled = true; saveWorkspaceState(); renderThreadList(); if (conversation.id === currentConversationId) els.threadTitle.textContent = conversation.title; } });
  }
  if (action === "pin") { conversation.pinned = !conversation.pinned; saveWorkspaceState(); renderThreadList(); }
  if (action === "export") downloadJson(`${conversation.title.replace(/[^\w.-]+/g, "-").toLowerCase() || "thread"}.json`, conversation);
  if (action === "delete") {
    const ok = await confirmAction("Delete thread", "The thread is removed from your account. Files stay as they are.", "Delete");
    if (!ok) return;
    stopRun(conversation.id);
    appState.conversations = appState.conversations.filter((item) => item.id !== conversation.id);
    forgetItems(conversation.id);
    saveWorkspaceState();
    if (conversation.id === currentConversationId) startNewThread();
    renderThreadList();
  }
});
els.newThreadButton.addEventListener("click", () => startNewThread());

async function nameConversation(conversation) {
  if (!conversation || conversation.titled) return;
  const messages = conversation.messages.filter((message) => message.text).slice(0, 2).map((message) => ({ role: message.role, text: message.text.slice(0, 1200) }));
  if (messages.length < 2) return;
  try {
    const result = await apiJson("/api/title", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
    if (result?.title) {
      conversation.title = result.title;
      conversation.titled = true;
      saveWorkspaceState();
      renderThreadList();
      if (conversation.id === currentConversationId) els.threadTitle.textContent = conversation.title;
    }
  } catch { /* the first prompt remains the title */ }
}

/* Thread interactions */
els.thread.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const toggle = event.target.closest("[data-call-toggle]");
  if (!toggle) return;
  event.preventDefault();
  toggle.click();
});

els.thread.addEventListener("click", async (event) => {
  const openPath = event.target.closest("[data-open-path]");
  if (openPath && !event.target.closest("[data-open-diff]")) {
    event.stopPropagation();
    openFileViewer(openPath.dataset.openPath, Number(openPath.dataset.line) || 0);
    return;
  }
  const diff = event.target.closest("[data-open-diff]");
  if (diff) {
    event.stopPropagation();
    const article = diff.closest("[data-message-id]");
    openDiff(diff.dataset.openDiff, { messageId: article?.dataset.messageId || "" });
    return;
  }
  const toggle = event.target.closest("[data-call-toggle]");
  if (toggle) {
    const detail = toggle.nextElementSibling;
    const open = detail.hidden;
    detail.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    return;
  }
  const accept = event.target.closest("[data-accept-path]");
  if (accept) { markDecision(accept.dataset.acceptPath, "accepted"); return; }
  const reject = event.target.closest("[data-reject-path]");
  if (reject) { await rejectChange(reject.dataset.rejectPath); return; }
  if (event.target.closest("[data-accept-all]")) { acceptAllChanges(event.target.closest("[data-message-id]")?.dataset.messageId); return; }
  if (event.target.closest("[data-reject-all]")) { rejectAllChanges(event.target.closest("[data-message-id]")?.dataset.messageId); return; }
  if (event.target.closest("[data-review-all]")) {
    const article = event.target.closest("[data-message-id]");
    const first = article?.querySelector(".change-row:not([data-decision='accepted']):not([data-decision='rejected']) [data-open-diff]");
    if (first) openDiff(first.dataset.openDiff, { messageId: article.dataset.messageId });
    return;
  }
  const restore = event.target.closest("[data-restore]");
  if (restore) { restoreCheckpoint(restore.dataset.restore); return; }
  const edit = event.target.closest("[data-edit-prompt]");
  if (edit) {
    const message = currentConversation()?.messages.find((item) => item.id === edit.dataset.editPrompt);
    if (message) { els.promptInput.value = message.text; syncComposer(); els.promptInput.focus(); }
    return;
  }
  const copy = event.target.closest("[data-copy-message]");
  if (copy) {
    const article = copy.closest("[data-message-id]");
    const message = currentConversation()?.messages.find((item) => item.id === article.dataset.messageId);
    try { await navigator.clipboard.writeText(message?.text || ""); showToast("Copied"); } catch { /* optional */ }
    return;
  }
  if (event.target.closest("[data-retry]")) { retryLastTurn(); return; }
  if (event.target.closest("[data-continue]")) { sendPrompt("Continue where you left off."); return; }
  const closeDiff = event.target.closest("[data-close-diff]");
  if (closeDiff) closeDiff.closest(".diff-block")?.remove();
});

/* ------------------------------------------------------------
   Composer
   ------------------------------------------------------------ */
function syncComposer() {
  els.promptInput.style.height = "auto";
  els.promptInput.style.height = `${Math.min(280, els.promptInput.scrollHeight)}px`;
}
els.promptInput.addEventListener("input", () => { syncComposer(); syncMenus(); });

function renderComposerContext() {
  const chips = [
    ...composerMentions.map((mention, index) => `<span class="ctx-chip"><svg><use href="#${mention.kind === "folder" ? "i-folder" : mention.kind === "codebase" ? "i-layers" : "i-file"}"></use></svg>${escapeHtml(mention.label || mention.path)}<button type="button" data-remove-mention="${index}" aria-label="Remove"><svg><use href="#i-close"></use></svg></button></span>`),
    ...pendingAttachments.map((file, index) => `<span class="ctx-chip"><svg><use href="#${String(file.type || "").startsWith("image/") ? "i-image" : "i-paperclip"}"></use></svg>${escapeHtml(file.name)}${file.uploading ? " …" : ""}<button type="button" data-remove-attachment="${index}" aria-label="Remove"><svg><use href="#i-close"></use></svg></button></span>`)
  ];
  els.composerContext.hidden = !chips.length;
  els.composerContext.innerHTML = chips.join("");
}
els.composerContext.addEventListener("click", (event) => {
  const mention = event.target.closest("[data-remove-mention]");
  if (mention) { composerMentions.splice(Number(mention.dataset.removeMention), 1); renderComposerContext(); return; }
  const attachment = event.target.closest("[data-remove-attachment]");
  if (attachment) {
    const [file] = pendingAttachments.splice(Number(attachment.dataset.removeAttachment), 1);
    if (file?.remote) apiJson(`/api/files/${encodeURIComponent(file.id)}`, { method: "DELETE" }).catch(() => {});
    renderComposerContext();
  }
});

function addMention(mention) {
  if (composerMentions.some((item) => item.kind === mention.kind && item.path === mention.path)) return;
  composerMentions.push({ label: mention.kind === "folder" ? `${mention.path}/` : mention.kind === "codebase" ? "@codebase" : mention.path, ...mention });
  renderComposerContext();
}

/* Attachments (screenshots, reference files) */
els.attachButton.addEventListener("click", () => els.attachmentInput.click());
els.attachmentInput.addEventListener("change", async () => {
  const files = [...els.attachmentInput.files];
  els.attachmentInput.value = "";
  await uploadAttachments(files);
});
els.promptInput.addEventListener("paste", async (event) => {
  const files = [...(event.clipboardData?.files || [])];
  if (files.length) { event.preventDefault(); await uploadAttachments(files); }
});
async function uploadAttachments(files) {
  if (!files.length) return;
  for (const file of files) {
    if (file.size > 25 * 1024 * 1024) { showToast(`${file.name} is over 25 MB`); continue; }
    const placeholder = { id: makeId("upload"), name: file.name, type: file.type, size: file.size, uploading: true };
    pendingAttachments.push(placeholder);
    renderComposerContext();
    uploadingFiles += 1;
    try {
      const form = new FormData();
      form.append("files", file, file.name);
      const result = await apiJson("/api/files", { method: "POST", body: form });
      const uploaded = result.files?.[0];
      const index = pendingAttachments.indexOf(placeholder);
      if (uploaded && index !== -1) pendingAttachments.splice(index, 1, { ...uploaded });
      else pendingAttachments = pendingAttachments.filter((item) => item !== placeholder);
    } catch (error) {
      pendingAttachments = pendingAttachments.filter((item) => item !== placeholder);
      showToast(`Upload failed: ${error.message}`);
    } finally {
      uploadingFiles -= 1;
      renderComposerContext();
    }
  }
}

/* Mode, model, effort, web */
function setMode(mode) {
  selectedMode = MODES[mode] ? mode : "agent";
  els.modeLabel.textContent = MODES[selectedMode];
  els.modePopover.querySelectorAll("[data-mode]").forEach((choice) => choice.classList.toggle("selected", choice.dataset.mode === selectedMode));
  els.composerNote.textContent = selectedMode === "agent"
    ? "Edits are applied to your files and can be reverted from the thread."
    : selectedMode === "plan" ? "Plan mode reads the project and proposes steps; nothing is changed." : "Ask mode answers questions; nothing is changed.";
  els.promptInput.placeholder = selectedMode === "agent" ? "Plan, search, build anything — @ to add files, / for commands" : selectedMode === "plan" ? "Describe what you want to build and get a plan" : "Ask anything about this project";
  setSetting("mode", selectedMode);
}
els.modeTrigger.addEventListener("click", (event) => { event.stopPropagation(); togglePopover(els.modePopover, els.modeTrigger, { above: true }); });
els.modePopover.addEventListener("click", (event) => {
  const choice = event.target.closest("[data-mode]");
  if (choice) { setMode(choice.dataset.mode); closePopovers(); }
});

function renderSelectedModel() {
  els.modelLabel.textContent = MODEL_NAMES[selectedModel];
  els.modelPopover.querySelectorAll("[data-model]").forEach((choice) => choice.classList.toggle("selected", choice.dataset.model === selectedModel));
}
function selectModel(model) {
  if (!MODEL_KEYS.includes(model)) return;
  if (!modelAvailable(model)) { showToast(`${MODEL_NAMES[model]} needs a higher plan`); return; }
  selectedModel = model;
  setSetting("model-profile", model);
  renderSelectedModel();
}
els.modelTrigger.addEventListener("click", (event) => { event.stopPropagation(); togglePopover(els.modelPopover, els.modelTrigger, { above: true }); });
els.modelPopover.addEventListener("click", (event) => {
  const choice = event.target.closest("[data-model]");
  if (choice && !choice.disabled) { selectModel(choice.dataset.model); closePopovers(); }
});

function maxEffortIndex() {
  return Math.max(0, EFFORT_LEVELS.findIndex((level) => level.name === accountEntitlements.efforts.at(-1)));
}
function applyEffort(index, announce = false, persist = true) {
  const limit = maxEffortIndex();
  const clamped = Math.max(0, Math.min(index, limit));
  effortIndex = clamped;
  selectedEffort = EFFORT_LEVELS[clamped].name;
  els.effortValue.textContent = selectedEffort;
  els.effortHeadingLabel.textContent = selectedEffort;
  els.effortRange.value = String(clamped);
  els.effortRange.max = String(EFFORT_LEVELS.length - 1);
  els.effortSlider.style.setProperty("--effort-pos", String(clamped / (EFFORT_LEVELS.length - 1)));
  els.effortNote.textContent = EFFORT_LEVELS[clamped].note;
  els.effortLock.hidden = limit >= EFFORT_LEVELS.length - 1;
  els.effortLock.title = `${EFFORT_LEVELS[EFFORT_LEVELS.length - 1].name} requires a higher plan`;
  els.effortPopover.querySelectorAll(".effort-labels span").forEach((label, position) => { label.style.opacity = position > limit ? ".35" : "1"; });
  renderSelectedModel();
  if (persist) setSetting("default-effort", selectedEffort);
  if (announce) showToast(`Thinking: ${selectedEffort}`);
}
els.effortTrigger.addEventListener("click", (event) => { event.stopPropagation(); togglePopover(els.effortPopover, els.effortTrigger, { above: true }); });
els.effortRange.addEventListener("input", () => {
  const requested = Number(els.effortRange.value);
  if (requested > maxEffortIndex()) { els.effortRange.value = String(maxEffortIndex()); showToast(`${EFFORT_LEVELS[requested].name} thinking needs a higher plan`); return; }
  applyEffort(requested);
});
els.effortLock.addEventListener("click", () => { window.location.assign("/checkout"); });

function setWeb(on) {
  webEnabled = on;
  els.webToggle.setAttribute("aria-pressed", String(on));
  setSetting("web", on);
}
els.webToggle.addEventListener("click", () => { setWeb(!webEnabled); showToast(webEnabled ? "Web search allowed" : "Web search off"); });

els.mentionButton.addEventListener("click", () => {
  if (!project) return showToast("Open a project first");
  els.promptInput.focus();
  const value = els.promptInput.value;
  const needsSpace = value && !/\s$/.test(value);
  els.promptInput.value = `${value}${needsSpace ? " " : ""}@`;
  syncComposer();
  syncMenus();
});

/* Menus: @ mentions and / commands */
let menuState = null; // { kind: "mention" | "command", items, index, start, end, parent }

function menuQueryInfo() {
  const value = els.promptInput.value;
  const caret = els.promptInput.selectionStart ?? value.length;
  const before = value.slice(0, caret);
  const at = before.match(/(?:^|\s)@([^\s@]*)$/);
  if (at) return { kind: "mention", query: at[1], start: caret - at[1].length - 1, end: caret };
  const slash = before.match(/^\/([^\s]*)$/);
  if (slash && caret === before.length) return { kind: "command", query: slash[1], start: 0, end: caret };
  return null;
}

function syncMenus() {
  const info = menuQueryInfo();
  if (!info) { closeMenus(); return; }
  if (info.kind === "mention") openMentionMenu(info);
  else openCommandMenu(info);
}

function closeMenus() {
  menuState = null;
  els.mentionMenu.hidden = true;
  els.commandMenu.hidden = true;
  els.promptInput.setAttribute("aria-expanded", "false");
}

function openMentionMenu(info) {
  if (!project) { closeMenus(); return; }
  const query = info.query;
  const files = project.findFiles(query, { max: 12 }).map((path) => ({ kind: "file", path, label: path }));
  const folders = query ? [...project.entries.values()].filter((entry) => entry.dir && entry.path.toLowerCase().includes(query.toLowerCase())).slice(0, 4).map((entry) => ({ kind: "folder", path: entry.path, label: `${entry.path}/` })) : [];
  const special = [];
  if (!query || "codebase".startsWith(query.toLowerCase())) special.push({ kind: "codebase", path: "", label: "@codebase", hint: "Attach the file tree" });
  const items = [...special, ...folders, ...files].filter((item, index, list) => list.findIndex((other) => other.kind === item.kind && other.path === item.path) === index).slice(0, 16);
  menuState = { kind: "mention", items, index: 0, start: info.start, end: info.end };
  els.commandMenu.hidden = true;
  els.mentionMenu.hidden = false;
  els.promptInput.setAttribute("aria-expanded", "true");
  renderMenu(els.mentionMenu, items.map((item) => ({
    icon: item.kind === "folder" ? "i-folder" : item.kind === "codebase" ? "i-layers" : "i-file",
    title: item.label.split("/").pop() || item.label,
    hint: item.hint || (item.kind === "folder" ? "Folder" : item.path.includes("/") ? item.path.split("/").slice(0, -1).join("/") : "")
  })), items.length ? "" : "No matching files");
}

function commandItems(query) {
  const conversation = currentConversation();
  const all = [
    { id: "new", label: "New thread", hint: "Start over in this project", icon: "i-plus", run: () => startNewThread() },
    { id: "agent", label: "Agent mode", hint: "Read, edit and create files", icon: "i-orbit", run: () => setMode("agent") },
    { id: "plan", label: "Plan mode", hint: "Propose steps, change nothing", icon: "i-list", run: () => setMode("plan") },
    { id: "ask", label: "Ask mode", hint: "Questions only, read-only", icon: "i-chat", run: () => setMode("ask") },
    { id: "model", label: "Model", hint: MODEL_NAMES[selectedModel], icon: "i-orbit", children: () => MODEL_KEYS.map((key) => ({ id: `model-${key}`, label: MODEL_NAMES[key], hint: modelAvailable(key) ? (key === selectedModel ? "Current" : "") : "Needs a higher plan", icon: "i-orbit", run: () => selectModel(key) })) },
    { id: "effort", label: "Thinking effort", hint: selectedEffort, icon: "i-sliders", children: () => EFFORT_LEVELS.map((level, index) => ({ id: `effort-${index}`, label: level.name, hint: index > maxEffortIndex() ? "Needs a higher plan" : level.note, icon: "i-sliders", run: () => applyEffort(index, true) })) },
    { id: "web", label: webEnabled ? "Turn web search off" : "Allow web search", hint: "Let the agent look up docs online", icon: "i-globe", run: () => setWeb(!webEnabled) },
    { id: "open", label: "Open folder", hint: "Work on files on this computer", icon: "i-folder-open", run: () => openFolderAction() },
    { id: "project", label: "New project", hint: "Saved in this browser", icon: "i-plus", run: () => newProjectAction() },
    { id: "files", label: "Browse files", hint: "Find and read a file in the project", icon: "i-file", run: () => openPalette("") },
    { id: "changes", label: "Review changes", hint: "Every file the agent touched", icon: "i-diff", run: () => { setDrawer("changes"); renderChangesPanel(); } },
    { id: "accept", label: "Accept all changes", hint: "Keep everything the agent changed", icon: "i-check", run: () => acceptAllChanges() },
    { id: "reject", label: "Reject all changes", hint: "Restore files to before the agent", icon: "i-refresh", run: () => rejectAllChanges() },
    { id: "preview", label: activeDrawer() === "preview" ? "Close preview" : "Live preview", hint: "Render the project's HTML beside the thread", icon: "i-play", run: () => togglePreview() },
    { id: "clear", label: "Clear context", hint: "Remove attached files and selections", icon: "i-close", run: () => { composerMentions = []; pendingAttachments = []; renderComposerContext(); } },
    { id: "rules", label: "Project rules", hint: "Instructions the agent follows in this project", icon: "i-shield", run: () => openSettings("agent") },
    { id: "memory", label: "Project memory", hint: `${projectRecord?.memory?.length || 0} saved facts`, icon: "i-database", run: () => openSettings("agent") },
    { id: "mcp", label: "Integrations and MCP", hint: `${loadMcp().length} MCP servers`, icon: "i-plugin", run: () => openSettings("integrations") },
    { id: "settings", label: "Settings", hint: "Preferences, plan, usage", icon: "i-settings", run: () => openSettings("general") },
    { id: "shortcuts", label: "Keyboard shortcuts", hint: "Everything you can do from the keyboard", icon: "i-command", run: () => showShortcuts() },
    { id: "export", label: "Export thread", hint: conversation ? conversation.title : "No thread open", icon: "i-download", run: () => { if (conversation) downloadJson("thread.json", conversation); } }
  ];
  const needle = query.trim().toLowerCase();
  if (!needle) return all;
  return all
    .map((item) => ({ item, score: item.id === needle ? 5 : item.id.startsWith(needle) ? 4 : item.label.toLowerCase().startsWith(needle) ? 3 : item.label.toLowerCase().split(/\s+/).some((word) => word.startsWith(needle)) ? 2 : item.label.toLowerCase().includes(needle) || item.hint.toLowerCase().includes(needle) ? 1 : 0 }))
    .filter((entry) => entry.score)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

function openCommandMenu(info, items = null) {
  const list = items || commandItems(info.query);
  menuState = { kind: "command", items: list, index: 0, start: info.start, end: info.end, parent: menuState?.kind === "command" && items ? menuState : null };
  els.mentionMenu.hidden = true;
  els.commandMenu.hidden = false;
  els.promptInput.setAttribute("aria-expanded", "true");
  renderMenu(els.commandMenu, list.map((item) => ({ icon: item.icon, title: item.label, hint: item.hint, more: Boolean(item.children) })), list.length ? "" : "No matching command");
}

function renderMenu(container, rows, empty) {
  container.innerHTML = rows.length ? rows.map((row, index) => `
    <button type="button" class="menu-row ${index === 0 ? "active" : ""}" data-menu-index="${index}" role="option">
      <span class="menu-icon"><svg><use href="#${row.icon}"></use></svg></span>
      <span class="menu-copy"><strong>${escapeHtml(row.title)}</strong>${row.hint ? `<small>${escapeHtml(row.hint)}</small>` : ""}</span>
      ${row.more ? `<svg class="menu-check" style="opacity:1"><use href="#i-chevron-right"></use></svg>` : ""}
    </button>`).join("") : `<p class="menu-empty">${escapeHtml(empty)}</p>`;
  container.querySelector(".menu-row.active")?.scrollIntoView({ block: "nearest" });
}

function moveMenu(delta) {
  if (!menuState || !menuState.items.length) return;
  menuState.index = (menuState.index + delta + menuState.items.length) % menuState.items.length;
  const container = menuState.kind === "mention" ? els.mentionMenu : els.commandMenu;
  container.querySelectorAll(".menu-row").forEach((row, index) => row.classList.toggle("active", index === menuState.index));
  container.querySelector(".menu-row.active")?.scrollIntoView({ block: "nearest" });
}

function chooseMenu(index = menuState?.index ?? 0) {
  if (!menuState) return;
  const item = menuState.items[index];
  if (!item) return;
  if (menuState.kind === "mention") {
    const value = els.promptInput.value;
    els.promptInput.value = `${value.slice(0, menuState.start)}${value.slice(menuState.end)}`.replace(/\s{2,}/g, " ");
    if (item.kind === "codebase") addMention({ kind: "codebase", path: "" });
    else addMention({ kind: item.kind, path: item.path });
    closeMenus();
    syncComposer();
    els.promptInput.focus();
    return;
  }
  if (item.children) { openCommandMenu({ query: "", start: menuState.start, end: menuState.end }, item.children()); return; }
  const value = els.promptInput.value;
  els.promptInput.value = value.slice(menuState.end).replace(/^\s+/, "");
  closeMenus();
  syncComposer();
  item.run?.();
  els.promptInput.focus();
}

[els.mentionMenu, els.commandMenu].forEach((container) => container.addEventListener("pointerdown", (event) => {
  const row = event.target.closest("[data-menu-index]");
  if (!row) return;
  event.preventDefault();
  chooseMenu(Number(row.dataset.menuIndex));
}));

els.promptInput.addEventListener("keydown", (event) => {
  if (menuState && (!els.mentionMenu.hidden || !els.commandMenu.hidden)) {
    if (event.key === "ArrowDown") { event.preventDefault(); moveMenu(1); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); moveMenu(-1); return; }
    if (event.key === "Enter" || event.key === "Tab") { event.preventDefault(); chooseMenu(); return; }
    if (event.key === "Escape") { event.preventDefault(); if (menuState.parent) { const parent = menuState.parent; menuState = null; openCommandMenu({ query: "", start: parent.start, end: parent.end }, parent.items); } else closeMenus(); return; }
    if (event.key === "ArrowRight" && menuState.kind === "command" && menuState.items[menuState.index]?.children) { event.preventDefault(); chooseMenu(); return; }
  }
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    els.composerForm.requestSubmit();
  }
  if (event.key === "Escape" && body.classList.contains("is-running")) stopRun();
});
els.promptInput.addEventListener("blur", () => setTimeout(() => { if (!els.mentionMenu.matches(":hover") && !els.commandMenu.matches(":hover")) closeMenus(); }, 120));
els.promptInput.addEventListener("click", syncMenus);
els.promptInput.addEventListener("keyup", (event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) syncMenus(); });

els.welcomeStarters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-starter]");
  if (!button) return;
  if (!project) { showToast("Open a project first"); return; }
  sendPrompt(button.dataset.starter);
});

els.composerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (body.classList.contains("is-running") && runs.has(currentConversationId)) { stopRun(); return; }
  const text = els.promptInput.value.trim();
  if (!text) return;
  if (uploadingFiles) { showToast("Wait for the upload to finish"); return; }
  sendPrompt(text);
});
els.sendButton.addEventListener("click", (event) => {
  if (body.classList.contains("is-running") && runs.has(currentConversationId)) { event.preventDefault(); stopRun(); }
});

/* ------------------------------------------------------------
   Running a turn
   ------------------------------------------------------------ */
function setRunning(running) {
  body.classList.toggle("is-running", running);
  els.sendButton.title = running ? "Stop (Esc)" : "Send (Enter)";
  renderThreadList();
}

function stopRun(conversationId = currentConversationId) {
  const run = runs.get(conversationId);
  if (!run) return;
  run.controller.abort(new DOMException("Stopped", "AbortError"));
}

async function readMentions(mentions) {
  if (!project) return [];
  const out = [];
  for (const mention of mentions) {
    if (mention.kind === "codebase") { out.push({ kind: "folder", path: ".", content: project.treeSummary({ maxEntries: 800 }) }); continue; }
    if (mention.kind === "folder") {
      const listing = project.allFiles().filter((file) => file.startsWith(`${mention.path}/`)).slice(0, 200).join("\n");
      out.push({ kind: "folder", path: mention.path, content: listing });
      continue;
    }
    try {
      out.push({ kind: "file", path: mention.path, content: await project.read(mention.path) });
    } catch (error) {
      out.push({ kind: "file", path: mention.path, content: `(could not read: ${error.message})` });
    }
  }
  return out;
}

async function projectRules() {
  if (!project) return projectRecord?.rules || "";
  const pieces = [];
  for (const candidate of ["AGENTS.md", "MERE.md", ".mere/rules.md", ".cursorrules", "CLAUDE.md"]) {
    if (project.has(candidate)) {
      try { pieces.push(`# ${candidate}\n${(await project.read(candidate)).slice(0, 8_000)}`); } catch { /* skip */ }
    }
  }
  if (projectRecord?.rules) pieces.push(projectRecord.rules);
  return pieces.join("\n\n");
}

async function buildContext(mentions) {
  return {
    model: selectedModel,
    effort: selectedEffort,
    mode: selectedMode,
    web: webEnabled,
    project: project ? { name: project.name, kind: project.kind, tree: project.treeSummary({ maxEntries: 320 }) } : { name: "", tree: "" },
    rules: await projectRules(),
    instructions: appState.customInstructions,
    mentions: await readMentions(mentions),
    active: null,
    plugins: appState.plugins,
    memory: (projectRecord?.memory || []).map((note) => note.note),
    mcp: loadMcp().map((server) => ({ label: server.label, url: server.url, token: server.token })),
    previewConsole: previewConsoleLines.slice(-30).join("\n")
  };
}

/* ------------------------------------------------------------
   Helpers the agent can call back into
   ------------------------------------------------------------ */
function rememberNote(note) {
  if (!projectRecord) return;
  const text = String(note || "").trim().slice(0, 400);
  if (!text || projectRecord.memory.some((item) => item.note === text)) return;
  projectRecord.memory.push({ id: makeId("memo"), note: text, at: new Date().toISOString() });
  projectRecord.memory = projectRecord.memory.slice(-60);
  saveWorkspaceState();
  if (!els.settingsModal.hidden && currentSettingsCategory === "agent") renderSettings("agent");
}

/* A delegated sub-task: a fresh, read-only helper run on the same project
   whose report comes back as the tool result. */
async function runDelegate(task, focus, parentSignal, emitParent) {
  const sub = { id: makeId("helper"), messages: [] };
  const context = await buildContext(focus && project?.has(focus) ? [{ kind: project.isDirectory(focus) ? "folder" : "file", path: focus }] : []);
  context.mode = "ask";
  context.nested = true;
  let calls = 0;
  try {
    const result = await runTurn({
      conversation: sub,
      userItem: { type: "message", role: "user", content: [{ type: "input_text", text: task }] },
      fs: project,
      context,
      signal: parentSignal,
      maxRounds: 14,
      previewConsole: () => previewConsoleLines,
      emit: (event) => {
        if (event.type === "call") { calls += 1; emitParent?.({ type: "status", label: "Helper working", detail: `${event.part.name} · ${calls} call${calls === 1 ? "" : "s"}` }); }
      }
    });
    forgetItems(sub.id);
    const report = result.text.trim();
    return report ? `Helper report (${calls} tool call${calls === 1 ? "" : "s"}):\n${report.slice(0, 12_000)}` : "The helper finished without a report.";
  } catch (error) {
    forgetItems(sub.id);
    if (error?.name === "AbortError") throw error;
    return `The helper failed: ${error?.message || error}`;
  }
}

async function sendPrompt(text, { mentions = null, mode = null } = {}) {
  if (!currentUser) return;
  if (!project) { showToast("Open a project so the agent has something to work on"); return; }
  if (mode && mode !== selectedMode) setMode(mode);
  const useMentions = mentions || composerMentions;
  const attachments = pendingAttachments.filter((file) => file.remote);
  let conversation = currentConversation() || createConversation();
  if (conversation.projectId !== project.id) conversation = createConversation();
  if (runs.has(conversation.id)) { showToast("Wait for the current turn to finish, or stop it"); return; }
  if (conversation.messages.length === 0) conversation.title = text.replace(/\s+/g, " ").slice(0, 60);
  const message = {
    id: makeId("msg"),
    role: "user",
    text,
    mentions: useMentions.map((mention) => ({ kind: mention.kind, path: mention.path, label: mention.label || mention.path })),
    attachments: attachments.map(({ id, name, type, size, remote }) => ({ id, name, type, size, remote })),
    createdAt: new Date().toISOString(),
    checkpoint: true
  };
  conversation.messages.push(message);
  conversation.updatedAt = new Date().toISOString();
  saveWorkspaceState();

  els.promptInput.value = "";
  syncComposer();
  closeMenus();
  if (!mentions) composerMentions = [];
  pendingAttachments = [];
  renderComposerContext();
  renderThread(conversation);
  renderThreadList();

  const content = [{ type: "input_text", text }];
  for (const file of attachments) {
    if (String(file.type || "").startsWith("image/")) content.push({ type: "input_image", file_id: file.id });
    else content.push({ type: "input_file", file_id: file.id });
  }
  await runConversationTurn(conversation, { type: "message", role: "user", content }, useMentions);
}

async function runConversationTurn(conversation, userItem, mentions) {
  const controller = new AbortController();
  const live = new LiveTurn(els.thread, { model: MODEL_NAMES[selectedModel] });
  runs.set(conversation.id, { controller, live });
  setRunning(true);
  els.threadScroll.scrollTop = els.threadScroll.scrollHeight;
  const startedAt = Date.now();
  const assistant = { id: makeId("msg"), role: "assistant", text: "", parts: [], createdAt: new Date().toISOString(), model: MODEL_NAMES[selectedModel] };
  const stickToBottom = () => { if (els.threadScroll.scrollHeight - els.threadScroll.scrollTop - els.threadScroll.clientHeight < 160) els.threadScroll.scrollTop = els.threadScroll.scrollHeight; };

  try {
    const context = await buildContext(mentions);
    const result = await runTurn({
      conversation,
      userItem,
      fs: project,
      context,
      signal: controller.signal,
      maxRounds: Number(settingValue("max-rounds", 40)) || 40,
      confirmDelete: settingValue("ask-before-delete", true) ? (path) => confirmAction("Delete file", `The agent wants to delete ${path}. Allow it?`, "Delete") : null,
      delegate: (task, focus) => runDelegate(task, focus, controller.signal, (event) => { if (conversation.id === currentConversationId) live.handle(event); }),
      onMemory: rememberNote,
      previewConsole: () => previewConsoleLines,
      emit: (event) => {
        if (conversation.id === currentConversationId) { live.handle(event); stickToBottom(); }
      }
    });
    Object.assign(assistant, {
      text: result.text,
      parts: result.parts,
      plan: result.plan,
      changes: result.changes.map((change) => ({ ...change, decision: "" })),
      usage: result.usage,
      rounds: result.rounds,
      stopped: result.stopped,
      ms: Date.now() - startedAt
    });
    if (result.entries.length) await recordChanges(conversation, assistant, result.entries);
  } catch (error) {
    assistant.parts = collectLiveParts(live);
    assistant.error = error?.name === "AbortError" ? "Stopped." : (error instanceof AssistantError || error?.message ? error.message : "Mere X could not complete the turn.");
    assistant.ms = Date.now() - startedAt;
    /* Whatever was already applied is still reviewable; the exchange restarts
       cleanly from the prose. */
    if (live.parts.querySelector(".part-call[data-tool='edit_file'], .part-call[data-tool='write_file'], .part-call[data-tool='delete_file'], .part-call[data-tool='move_file']")) forgetItems(conversation.id);
  } finally {
    runs.delete(conversation.id);
    setRunning(runs.size > 0 && runs.has(currentConversationId));
  }

  conversation.messages.push(assistant);
  conversation.updatedAt = new Date().toISOString();
  saveWorkspaceState();
  if (conversation.id === currentConversationId) {
    live.finish(assistant);
    stickToBottom();
  } else live.node.remove();
  renderThreadList();
  if (assistant.changes?.length) schedulePreviewRefresh();
  if (conversation.messages.length === 2) nameConversation(conversation);
  if (settingValue("sound", false)) playTone();
  refreshAccountUsage();
}

function collectLiveParts(live) {
  const parts = [];
  live.parts.querySelectorAll(".part").forEach((node) => {
    if (node.classList.contains("part-thought")) parts.push({ type: "thought", text: node.querySelector("[data-thought-body]")?.textContent || "" });
    else if (node.classList.contains("part-text")) parts.push({ type: "text", text: node.textContent || "" });
    else if (node.classList.contains("part-call")) parts.push({ type: "call", name: node.dataset.tool, args: { path: node.querySelector(".call-target")?.textContent || "" }, output: node.querySelector(".call-output")?.textContent || "", status: node.dataset.status === "running" ? "error" : node.dataset.status });
  });
  return parts;
}

function retryLastTurn() {
  const conversation = currentConversation();
  if (!conversation || runs.has(conversation.id)) return;
  const lastUser = [...conversation.messages].reverse().find((message) => message.role === "user");
  if (!lastUser) return;
  const index = conversation.messages.lastIndexOf(lastUser);
  conversation.messages = conversation.messages.slice(0, index);
  forgetItems(conversation.id);
  saveWorkspaceState();
  renderThread(conversation);
  sendPrompt(lastUser.text, { mentions: (lastUser.mentions || []).map((mention) => ({ ...mention })) });
}

function playTone() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 520;
    gain.gain.setValueAtTime(.03, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .14);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + .14);
    oscillator.addEventListener("ended", () => context.close());
  } catch { /* optional */ }
}

/* ------------------------------------------------------------
   Live preview: the project's HTML rendered beside the thread,
   its console relayed to the drawer and to the agent.
   ------------------------------------------------------------ */
const previewConsoleLines = [];
let previewEntry = "";
let previewTimer = 0;
let previewUrls = [];

function previewPages() {
  return project ? project.allFiles().filter((path) => /\.html?$/i.test(path)).slice(0, 60) : [];
}

async function refreshPreview() {
  if (!project || els.previewPane.hidden) return;
  const pages = previewPages();
  previewEntry = pickEntry(project, previewEntry);
  els.previewSelect.innerHTML = pages.map((path) => `<option value="${escapeHtml(path)}" ${path === previewEntry ? "selected" : ""}>${escapeHtml(path)}</option>`).join("");
  els.previewEntry.textContent = previewEntry || "No HTML file";
  if (!previewEntry) { els.previewFrame.srcdoc = `<!doctype html><body style="margin:0;display:grid;place-items:center;height:100vh;font:14px system-ui;color:#999;background:#121212">Add an index.html to preview it here.</body>`; return; }
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
  try {
    const html = await buildPreviewDocument(project, previewEntry);
    previewUrls = [...html.matchAll(/blob:[^"')\s]+/g)].map((match) => match[0]);
    els.previewFrame.srcdoc = html;
  } catch (error) {
    els.previewFrame.srcdoc = `<!doctype html><body style="margin:0;padding:24px;font:13px system-ui;color:#ddd;background:#121212">Could not render ${escapeHtml(previewEntry)}: ${escapeHtml(error.message)}</body>`;
  }
}

function schedulePreviewRefresh() {
  if (els.previewPane.hidden) return;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshPreview, 450);
}

function openPreview() {
  if (!project) { showToast("Open a project first"); return; }
  setDrawer("preview");
  refreshPreview();
}
function togglePreview() {
  if (activeDrawer() === "preview") setDrawer(""); else openPreview();
}
els.previewToggle.addEventListener("click", togglePreview);
els.previewPane.addEventListener("click", (event) => {
  const action = event.target.closest("[data-preview]");
  if (!action) return;
  if (action.dataset.preview === "refresh") refreshPreview();
  if (action.dataset.preview === "close") setDrawer("");
  if (action.dataset.preview === "console") { els.previewLog.hidden = !els.previewLog.hidden; action.setAttribute("aria-pressed", String(!els.previewLog.hidden)); }
});
els.previewSelect.addEventListener("change", () => { previewEntry = els.previewSelect.value; refreshPreview(); });
window.addEventListener("message", (event) => {
  if (event.data?.source !== "mere-x-preview") return;
  const level = String(event.data.level || "log");
  previewConsoleLines.push(`[${level}] ${String(event.data.text || "").slice(0, 600)}`);
  if (previewConsoleLines.length > 200) previewConsoleLines.shift();
  const node = document.createElement("div");
  node.innerHTML = `<span class="t">${new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span> ${level === "error" ? '<span class="k">error</span> ' : ""}${escapeHtml(String(event.data.text || ""))}`;
  els.previewLog.append(node);
  els.previewLog.scrollTop = els.previewLog.scrollHeight;
  while (els.previewLog.childElementCount > 300) els.previewLog.firstElementChild.remove();
  if (level === "error" && els.previewLog.hidden) { els.previewLog.hidden = false; els.previewPane.querySelector('[data-preview="console"]')?.setAttribute("aria-pressed", "true"); }
});

/* ------------------------------------------------------------
   Palette (Ctrl K)
   ------------------------------------------------------------ */
let paletteItems = [];
let paletteIndex = 0;

function openPalette(prefill = "") {
  closePopovers();
  els.paletteModal.hidden = false;
  els.paletteInput.value = prefill;
  renderPalette();
  els.paletteInput.focus();
}
function closePalette() { els.paletteModal.hidden = true; }

function renderPalette() {
  const raw = els.paletteInput.value;
  const isCommand = raw.startsWith(">");
  const query = (isCommand ? raw.slice(1) : raw).trim();
  const rows = [];
  if (isCommand) {
    for (const item of commandItems(query).slice(0, 14)) rows.push({ icon: item.icon, title: item.label, hint: item.hint, run: () => { if (item.children) { els.paletteInput.value = `>${item.label} `; renderPalette(); return; } closePalette(); item.run?.(); } });
  } else {
    const files = project ? project.findFiles(query, { max: query ? 10 : 8 }) : [];
    for (const path of files) rows.push({ icon: "i-file", title: path.split("/").pop(), path, run: () => { closePalette(); openFileViewer(path); } });
    const threads = projectConversations().filter((conversation) => !query || conversation.title.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
    for (const conversation of threads) rows.push({ icon: "i-chat", title: conversation.title, hint: formatDate(conversation.updatedAt), run: () => { closePalette(); openConversation(conversation.id); } });
    if (query) for (const item of commandItems(query).slice(0, 4)) rows.push({ icon: item.icon, title: item.label, hint: item.hint, run: () => { closePalette(); if (item.children) openPalette(`>${item.label} `); else item.run?.(); } });
    if (!query) rows.push({ icon: "i-command", title: "Type > for commands", hint: "Or start typing a file name", run: () => { els.paletteInput.value = ">"; renderPalette(); } });
  }
  paletteItems = rows;
  paletteIndex = 0;
  els.paletteResults.innerHTML = rows.length ? rows.map((row, index) => `
    <button type="button" class="menu-row ${index === 0 ? "active" : ""}" data-palette-index="${index}">
      <span class="menu-icon"><svg><use href="#${row.icon}"></use></svg></span>
      <span class="menu-copy"><strong>${escapeHtml(row.title)}</strong>${row.path ? `<span class="path">${escapeHtml(row.path)}</span>` : row.hint ? `<small>${escapeHtml(row.hint)}</small>` : ""}</span>
    </button>`).join("") : `<p class="menu-empty">${project ? "Nothing matches." : "Open a project to search its files."}</p>`;
}
els.paletteInput.addEventListener("input", renderPalette);
els.paletteInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!paletteItems.length) return;
    paletteIndex = (paletteIndex + (event.key === "ArrowDown" ? 1 : -1) + paletteItems.length) % paletteItems.length;
    els.paletteResults.querySelectorAll(".menu-row").forEach((row, index) => row.classList.toggle("active", index === paletteIndex));
    els.paletteResults.querySelector(".menu-row.active")?.scrollIntoView({ block: "nearest" });
  }
  if (event.key === "Enter") { event.preventDefault(); paletteItems[paletteIndex]?.run(); }
  if (event.key === "Escape") closePalette();
});
els.paletteResults.addEventListener("click", (event) => {
  const row = event.target.closest("[data-palette-index]");
  if (row) paletteItems[Number(row.dataset.paletteIndex)]?.run();
});
els.paletteModal.querySelector(".modal-backdrop").addEventListener("click", closePalette);
els.paletteTrigger.addEventListener("click", () => openPalette());

/* ------------------------------------------------------------
   Keyboard shortcuts
   ------------------------------------------------------------ */
document.addEventListener("keydown", (event) => {
  if (isAuthOpen()) return;
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (event.key === "Escape") {
    if (!els.fileModal.hidden) { closeFileViewer(); return; }
    if (!els.paletteModal.hidden) { closePalette(); return; }
    if (!els.settingsModal.hidden) { closeSettings(); return; }
    if (!els.actionModal.hidden) { closeActionModal(); return; }
    if (body.classList.contains("mobile-sidebar")) { closeMobileSidebar(); return; }
    closePopovers();
    return;
  }
  if (!mod) return;
  if ((key === "k" || key === "p") && !event.shiftKey && !event.altKey) { event.preventDefault(); openPalette(); return; }
  if (key === "i" && !event.shiftKey) { event.preventDefault(); els.promptInput.focus(); return; }
  if (key === "n" && !event.shiftKey) { event.preventDefault(); startNewThread(); return; }
  if (key === "o" && !event.shiftKey) { event.preventDefault(); openFolderAction(); return; }
  if (key === "b" && !event.shiftKey) { event.preventDefault(); setSidebar(!body.classList.contains("sidebar-collapsed")); return; }
  if (key === "v" && event.shiftKey) { event.preventDefault(); togglePreview(); return; }
  if (key === "d" && event.shiftKey) { event.preventDefault(); setDrawer(activeDrawer() === "changes" ? "" : "changes"); renderChangesPanel(); return; }
  if (key === ",") { event.preventDefault(); openSettings("general"); }
});

function showShortcuts() {
  const rows = [
    ["Ctrl K", "Search files, threads and commands"], ["Ctrl I", "Focus the composer"], ["Ctrl N", "New thread"], ["Ctrl O", "Open a folder"],
    ["Ctrl B", "Toggle the sidebar"], ["Ctrl Shift V", "Live preview"], ["Ctrl Shift D", "Changed files"], ["@", "Mention a file or folder in the prompt"],
    ["/", "Commands in the prompt"], ["Esc", "Stop the agent, close menus"]
  ];
  openActionModal({ eyebrow: "HELP", title: "Keyboard shortcuts", hideSubmit: true, content: `<div class="shortcut-list">${rows.map(([keys, label]) => `<div><span>${escapeHtml(label)}</span><kbd>${escapeHtml(keys)}</kbd></div>`).join("")}</div>` });
}

/* ------------------------------------------------------------
   Modals
   ------------------------------------------------------------ */
let actionSubmitHandler = null;
let pendingConfirm = null;

function openActionModal({ eyebrow = "MERE X", title, content, submitLabel = "Save", submitTone = "primary", hideSubmit = false, cancelLabel = "Cancel", onSubmit = null }) {
  closePopovers();
  els.actionEyebrow.textContent = eyebrow;
  els.actionTitle.textContent = title;
  els.actionBody.innerHTML = content;
  els.actionSubmit.textContent = submitLabel;
  els.actionSubmit.hidden = hideSubmit;
  els.actionSubmit.classList.toggle("is-danger", submitTone === "danger");
  els.actionForm.querySelector("[data-action-cancel]").textContent = cancelLabel;
  actionSubmitHandler = onSubmit;
  els.actionModal.hidden = false;
  requestAnimationFrame(() => els.actionBody.querySelector("input:not([type=checkbox]), textarea, select")?.focus());
}
function closeActionModal() {
  els.actionModal.hidden = true;
  actionSubmitHandler = null;
  if (pendingConfirm) { const resolve = pendingConfirm; pendingConfirm = null; resolve(false); }
}
els.actionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!actionSubmitHandler) { closeActionModal(); return; }
  const data = new FormData(els.actionForm);
  try {
    const result = await actionSubmitHandler(data);
    if (result !== false) { actionSubmitHandler = null; closeActionModal(); }
  } catch (error) {
    showToast(error.message);
  }
});
els.actionForm.querySelector("[data-action-cancel]").addEventListener("click", closeActionModal);
els.actionForm.querySelector(".action-modal-close").addEventListener("click", closeActionModal);
els.actionModal.querySelector(".modal-backdrop").addEventListener("click", closeActionModal);

function confirmAction(title, message, confirmLabel, { cancelLabel = "Cancel" } = {}) {
  return new Promise((resolve) => {
    pendingConfirm = resolve;
    openActionModal({
      eyebrow: "CONFIRM",
      title,
      content: `<p class="action-copy">${escapeHtml(message)}</p>`,
      submitLabel: confirmLabel,
      submitTone: "danger",
      cancelLabel,
      onSubmit: () => { pendingConfirm = null; resolve(true); }
    });
  });
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------
   Integrations: connected services and MCP servers
   ------------------------------------------------------------ */
const MCP_KEY = "mere-x.mcp";
function loadMcp() {
  try {
    const list = JSON.parse(localStorage.getItem(MCP_KEY) || "[]");
    return Array.isArray(list) ? list.filter((server) => server && typeof server.url === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}
function saveMcp(list) {
  try { localStorage.setItem(MCP_KEY, JSON.stringify(list.slice(0, 5))); } catch { showToast("Local storage is unavailable"); }
}

let pluginStatus = null;
async function loadPlugins() {
  try {
    const result = await apiJson("/api/plugins");
    pluginStatus = result.plugins || [];
  } catch (error) {
    pluginStatus = { error: error.message };
  }
  if (!els.settingsModal.hidden && currentSettingsCategory === "integrations") renderSettings("integrations");
}

function integrationsHtml() {
  const list = loadMcp();
  const plugins = Array.isArray(pluginStatus) ? pluginStatus : [];
  return settingUI.header("Tools", "Integrations", "Services the agent can read from while it works, and MCP servers that add tools of their own.") +
    `<p class="settings-group-title">Connected services</p>` +
    (pluginStatus === null ? `<p class="side-note" style="margin:8px 2px">Loading…</p>` : pluginStatus.error ? `<p class="side-note" style="margin:8px 2px">${escapeHtml(pluginStatus.error)}</p>` : `<div class="integrations">${plugins.map((plugin) => {
      const enabled = appState.plugins.includes(plugin.id);
      return `<div class="integration">
        <span class="integration-mark">${escapeHtml(plugin.label.slice(0, 2).toUpperCase())}</span>
        <span><strong>${escapeHtml(plugin.label)}</strong><small>${plugin.connected ? `Connected · ${escapeHtml(plugin.account || "")}` : plugin.configured ? "Not connected" : "Needs OAuth credentials on the server"}</small></span>
        ${plugin.connected
          ? `<label class="switch" title="Use in this workspace"><input type="checkbox" data-plugin-toggle="${escapeHtml(plugin.id)}" ${enabled ? "checked" : ""} /><span></span></label><button type="button" class="call-mini" data-plugin-disconnect="${escapeHtml(plugin.id)}">Disconnect</button>`
          : `<button type="button" class="call-mini" data-plugin-connect="${escapeHtml(plugin.id)}" ${plugin.configured ? "" : "disabled"}>Connect</button>`}
      </div>`;
    }).join("")}</div>`) +
    `<p class="settings-group-title">MCP servers</p>` +
    `<div class="mcp-list">${list.map((server, index) => `<div class="mcp-row"><span><strong>${escapeHtml(server.label)}</strong><small>${escapeHtml(server.url)}${server.token ? " · token set" : ""}</small></span><button type="button" class="call-mini" data-remove-mcp="${index}">Remove</button></div>`).join("")}</div>` +
    `<form class="mcp-form" id="mcpForm">
      <input name="label" placeholder="Label, e.g. docs" maxlength="40" required spellcheck="false" />
      <input name="url" type="url" placeholder="https://mcp.example.com/sse" required spellcheck="false" />
      <input name="token" type="password" placeholder="Bearer token (optional)" autocomplete="off" />
      <button type="submit" class="chip-btn chip-btn-primary">Add</button>
    </form>
    <p class="side-note" style="margin:8px 2px 0">Remote MCP servers give the agent extra tools. Tokens stay in this browser only.</p>`;
}

els.settingsPanel.addEventListener("submit", (event) => {
  const form = event.target.closest("#mcpForm");
  if (!form) return;
  event.preventDefault();
  const data = new FormData(form);
  const label = String(data.get("label") || "").trim().replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 40);
  const url = String(data.get("url") || "").trim();
  if (!label || !/^https:\/\/\S+$/i.test(url)) { showToast("Use a label and an https:// URL"); return; }
  const list = loadMcp().filter((server) => server.label !== label);
  if (list.length >= 5) { showToast("Up to five MCP servers"); return; }
  list.push({ label, url, token: String(data.get("token") || "").trim() });
  saveMcp(list);
  renderSettings("integrations");
  showToast(`${label} added`);
});
window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || event.data?.source !== "mere-x-plugin") return;
  if (event.data.ok) { showToast(`${event.data.pluginId} connected`); appState.plugins = [...new Set([...appState.plugins, event.data.pluginId])]; saveWorkspaceState(); }
  loadPlugins();
});

/* ------------------------------------------------------------
   Settings
   ------------------------------------------------------------ */
const settingUI = {
  header: (eyebrow, title, description) => `<div class="settings-panel-header"><small>${eyebrow}</small><h3>${title}</h3><p>${description}</p></div>`,
  group: (content, title = "") => `${title ? `<p class="settings-group-title">${title}</p>` : ""}<div class="settings-group">${content}</div>`,
  row: (title, description, control) => `<div class="setting-row"><span><strong>${title}</strong><small>${description}</small></span>${control}</div>`,
  toggle: (id, checked = false) => `<label class="switch"><input type="checkbox" data-setting-toggle="${id}"${settingValue(id, checked) ? " checked" : ""} /><span></span></label>`,
  select: (key, options, fallback) => { const selected = settingValue(key, fallback); return `<label class="settings-select"><select data-setting-select="${key}">${options.map((option) => `<option value="${escapeHtml(option)}"${String(option) === String(selected) ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select><svg><use href="#i-chevron"></use></svg></label>`; },
  choice: (key, options, fallback) => { const selected = settingValue(key, fallback); return `<div class="settings-choice" data-setting-choice="${key}">${options.map((option) => `<button type="button" data-value="${escapeHtml(option)}" class="${String(selected) === String(option) ? "active" : ""}">${escapeHtml(option)}</button>`).join("")}</div>`; },
  action: (label, action, className = "", attributes = "") => `<button class="${className}" data-setting-action="${action}"${attributes}>${label}</button>`
};

function usageCardHtml() {
  const usage = accountUsage;
  if (!usage) return `<p class="side-note" style="margin:12px 0 0">Usage is loading, or the account service is offline.</p>`;
  return `<div class="usage-card">${Object.entries(usage).map(([category, stats]) => {
    const label = category === "message" ? "Agent turns" : category === "inline" ? "Inline edits" : category;
    const pct = stats.limits.fiveHours ? Math.min(100, Math.round((stats.fiveHours / stats.limits.fiveHours) * 100)) : 0;
    return `<div class="usage-stat"><small>${escapeHtml(label)} · 5 hours</small><strong>${stats.fiveHours} / ${stats.limits.fiveHours}</strong><div class="usage-meter"><span style="width:${pct}%"></span></div><p>${stats.week} / ${stats.limits.week} this week${stats.resetFiveHoursAt ? ` · resets ${new Date(stats.resetFiveHoursAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : ""}</p></div>`;
  }).join("")}</div>`;
}

const settingsPanels = {
  general: () =>
    settingUI.header("Workspace", "General", "How Mere Code starts and reads.") +
    settingUI.group(
      settingUI.row("Default model", "Used for new threads.", settingUI.select("model-profile", MODEL_KEYS.filter(modelAvailable).map((key) => MODEL_NAMES[key]), MODEL_NAMES[selectedModel])) +
      settingUI.row("Default thinking", "How long the model deliberates before acting.", settingUI.select("default-effort", EFFORT_LEVELS.filter((level) => accountEntitlements.efforts.includes(level.name)).map((level) => level.name), selectedEffort)) +
      settingUI.row("Default mode", "Agent edits files; Plan and Ask do not.", settingUI.choice("mode", ["agent", "plan", "ask"], selectedMode))
    ) +
    settingUI.group(
      settingUI.row("Text size", "Reading size for the thread.", settingUI.choice("text-size", ["Compact", "Default", "Large"], "Default")) +
      settingUI.row("Reduced motion", "Minimise interface animation.", settingUI.toggle("reduced-motion")) +
      settingUI.row("Completion sound", "A short tone when a turn finishes.", settingUI.toggle("sound")) +
      settingUI.row("Install Mere Code", "Add a full-screen app to this device.", settingUI.action("Install app", "install-app", "primary-action"))
    , "Interface"),

  agent: () =>
    settingUI.header("Intelligence", "Agent", "Rules and limits the agent works under.") +
    settingUI.group(
      settingUI.row("Ask before deleting files", "Deletions wait for your approval; edits are applied and reviewable.", settingUI.toggle("ask-before-delete", true)) +
      settingUI.row("Web search", "Allow the agent to look up documentation online.", settingUI.toggle("web")) +
      settingUI.row("Tool rounds per turn", "How many tool rounds a single prompt may use before pausing.", settingUI.select("max-rounds", [20, 40, 80, 150], 40))
    ) +
    `<p class="settings-group-title">Rules for this project</p>` +
    `<textarea class="settings-textarea" data-project-rules placeholder="e.g. Use TypeScript strict mode. Never edit files under generated/. Run through the checklist in docs/CONTRIBUTING.md before finishing." ${project ? "" : "disabled"}>${escapeHtml(projectRecord?.rules || "")}</textarea>` +
    `<p class="side-note" style="margin:8px 2px 0">${project ? "Saved with the project. AGENTS.md, MERE.md, .mere/rules.md, .cursorrules and CLAUDE.md in the project root are read automatically too." : "Open a project to set its rules."}</p>` +
    `<p class="settings-group-title">Project memory</p>` +
    ((projectRecord?.memory || []).length
      ? `<div class="memory-list">${projectRecord.memory.map((note) => `<div class="memory-row"><span>${escapeHtml(note.note)}<small>${escapeHtml(formatDate(note.at))}</small></span><button type="button" class="call-mini" data-forget-memory="${escapeHtml(note.id)}">Forget</button></div>`).join("")}</div>`
      : `<p class="side-note" style="margin:8px 2px 0">${project ? "Nothing saved yet. The agent adds facts here with save_memory; you can also ask it to remember something." : "Open a project to see its memory."}</p>`) +
    `<p class="settings-group-title">Your preferences</p>` +
    `<textarea class="settings-textarea" data-custom-instructions placeholder="How you like the agent to work everywhere: languages, style, testing habits, how much to explain.">${escapeHtml(appState.customInstructions)}</textarea>`,

  integrations: () => integrationsHtml(),

  billing: () =>
    settingUI.header("Account", "Billing", "Your plan, payment details and invoices.") +
    `<div class="plan-card-account"><span class="plan-mark-account"><svg><use href="#i-spark"></use></svg></span><span><strong>Mere X ${escapeHtml(accountEntitlements.plan)}</strong><small>${accountEntitlements.models.map((key) => MODEL_NAMES[key]).join(", ")} · ${accountEntitlements.efforts.join(", ")}</small></span><button data-setting-action="manage-plan">Manage plan</button></div>` +
    settingUI.group(
      settingUI.row("Payment method", "Managed securely by your billing provider.", settingUI.action("Manage", "manage-plan")) +
      settingUI.row("Billing history", "View and download previous invoices.", settingUI.action("View invoices", "billing-history"))
    , "Billing details"),

  usage: () =>
    settingUI.header("Account", "Usage", "Rolling 5-hour and weekly limits for your plan.") +
    usageCardHtml() +
    settingUI.group(settingUI.row("Model training", "Your code and threads are never used to train models.", `<span class="status-pill">Off</span>`)),

  data: () =>
    settingUI.header("Privacy", "Data controls", "What is kept, and how to take it with you.") +
    settingUI.group(
      settingUI.row("Where files live", "Local folders stay on this computer; browser projects live in this browser's storage. Only what the agent reads is sent to the model for that turn.", `<span class="status-pill">Local</span>`) +
      settingUI.row("Export threads", "Download every thread as JSON.", settingUI.action("Export", "export-data"))
    ) +
    settingUI.group(settingUI.row("Delete all threads", "Remove every thread from your account. Files are untouched.", settingUI.action("Delete all", "delete-threads", "danger-action")), "Danger zone"),

  security: () =>
    settingUI.header("Account", "Security", "Protect your account and review access.") +
    settingUI.group(
      settingUI.row("Email address", escapeHtml(currentUser?.email || "No email is linked to this account."), settingUI.action("Manage", "manage-email")) +
      settingUI.row("Password", "Update your account password.", settingUI.action("Change", "change-password")) +
      settingUI.row("Active sessions", "This browser is protected by an HttpOnly server session.", `<span class="status-pill">Active</span>`)
    ),

  profile: () =>
    settingUI.header("Account", "Profile", "Your name and how you appear.") +
    settingUI.group(
      settingUI.row("Display name", "Shown throughout Mere X.", `<input class="settings-text-field" data-profile-field="name" value="${escapeHtml(currentUser?.name ?? "")}" aria-label="Display name" />`) +
      settingUI.row("Username", "Your unique Mere X identity.", `<input class="settings-text-field" data-profile-field="username" value="${escapeHtml(appState.username || usernameFor(currentUser))}" aria-label="Username" />`) +
      settingUI.row("Profile photo", "Upload or replace your account image.", settingUI.action("Change photo", "change-photo"))
    )
};

let currentSettingsCategory = "general";
let rulesTimer = 0;
function renderSettings(category = "general") {
  const builder = settingsPanels[category] || settingsPanels.general;
  currentSettingsCategory = settingsPanels[category] ? category : "general";
  els.settingsPanel.innerHTML = builder();
  els.settingsNav.querySelectorAll("[data-settings]").forEach((button) => button.classList.toggle("active", button.dataset.settings === currentSettingsCategory));
  els.settingsPanel.scrollTop = 0;
}
function openSettings(category = "general") {
  closePopovers();
  renderSettings(category);
  els.settingsModal.hidden = false;
  if (category === "integrations" && pluginStatus === null) loadPlugins();
}
function closeSettings() { els.settingsModal.hidden = true; }
els.settingsNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-settings]");
  if (!button) return;
  renderSettings(button.dataset.settings);
  if (button.dataset.settings === "integrations" && pluginStatus === null) loadPlugins();
});
els.settingsModal.querySelector(".modal-backdrop").addEventListener("click", closeSettings);
els.settingsModal.querySelector(".modal-close").addEventListener("click", closeSettings);

els.settingsPanel.addEventListener("change", (event) => {
  const pluginToggle = event.target.closest("[data-plugin-toggle]");
  if (pluginToggle) {
    const id = pluginToggle.dataset.pluginToggle;
    appState.plugins = pluginToggle.checked ? [...new Set([...appState.plugins, id])] : appState.plugins.filter((item) => item !== id);
    saveWorkspaceState();
    return;
  }
  const toggle = event.target.closest("[data-setting-toggle]");
  if (toggle) {
    const key = toggle.dataset.settingToggle;
    setSetting(key, toggle.checked);
    if (key === "reduced-motion") body.classList.toggle("reduce-motion", toggle.checked);
    if (key === "web") setWeb(toggle.checked);
    if (key === "sound" && toggle.checked) playTone();
    showToast(`${toggle.closest(".setting-row").querySelector("strong").textContent} ${toggle.checked ? "on" : "off"}`);
    return;
  }
  const select = event.target.closest("[data-setting-select]");
  if (select) {
    const key = select.dataset.settingSelect;
    if (key === "model-profile") { const model = MODEL_KEYS.find((candidate) => MODEL_NAMES[candidate] === select.value); if (model) selectModel(model); return; }
    if (key === "default-effort") { applyEffort(Math.max(0, EFFORT_LEVELS.findIndex((level) => level.name === select.value)), true); return; }
    setSetting(key, key === "max-rounds" ? Number(select.value) : select.value);
    showToast(`${select.closest(".setting-row").querySelector("strong").textContent}: ${select.value}`);
    return;
  }
  const field = event.target.closest("[data-profile-field]");
  if (field) {
    const value = field.value.trim();
    if (field.dataset.profileField === "name" && value) updateCurrentUser({ name: value });
    if (field.dataset.profileField === "username") { appState.username = value.replace(/\s+/g, "-").toLowerCase(); saveWorkspaceState(); field.value = appState.username; }
    showToast("Profile updated");
  }
});
els.settingsPanel.addEventListener("input", (event) => {
  const rules = event.target.closest("[data-project-rules]");
  if (rules && projectRecord) { projectRecord.rules = rules.value; clearTimeout(rulesTimer); rulesTimer = setTimeout(saveWorkspaceState, 500); }
  const custom = event.target.closest("[data-custom-instructions]");
  if (custom) { appState.customInstructions = custom.value; clearTimeout(rulesTimer); rulesTimer = setTimeout(saveWorkspaceState, 500); }
});
els.settingsPanel.addEventListener("click", async (event) => {
  const choice = event.target.closest(".settings-choice button");
  if (choice) {
    choice.parentElement.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button === choice));
    const key = choice.parentElement.dataset.settingChoice;
    if (key === "mode") { setMode(choice.dataset.value); return; }
    setSetting(key, choice.dataset.value);
    if (key === "text-size") applySettingsFromState();
    return;
  }
  const forget = event.target.closest("[data-forget-memory]");
  if (forget && projectRecord) {
    projectRecord.memory = projectRecord.memory.filter((note) => note.id !== forget.dataset.forgetMemory);
    saveWorkspaceState();
    renderSettings("agent");
    return;
  }
  const removeMcp = event.target.closest("[data-remove-mcp]");
  if (removeMcp) {
    const list = loadMcp();
    list.splice(Number(removeMcp.dataset.removeMcp), 1);
    saveMcp(list);
    renderSettings("integrations");
    return;
  }
  const connect = event.target.closest("[data-plugin-connect]");
  if (connect) {
    const popup = window.open(`/api/plugins/${encodeURIComponent(connect.dataset.pluginConnect)}/authorize`, "mere-x-plugin", "width=560,height=720");
    if (!popup) showToast("Allow pop-ups to connect");
    return;
  }
  const disconnect = event.target.closest("[data-plugin-disconnect]");
  if (disconnect) {
    await apiJson(`/api/plugins/${encodeURIComponent(disconnect.dataset.pluginDisconnect)}`, { method: "DELETE" }).catch(() => {});
    appState.plugins = appState.plugins.filter((id) => id !== disconnect.dataset.pluginDisconnect);
    saveWorkspaceState();
    loadPlugins();
    return;
  }
  const action = event.target.closest("[data-setting-action]");
  if (action) handleSettingAction(action.dataset.settingAction);
});

async function handleSettingAction(name) {
  if (name === "install-app") {
    if (window.matchMedia("(display-mode: standalone)").matches) return showToast("Mere Code is already installed");
    if (!deferredInstallPrompt) return showToast("Use your browser menu and choose Install");
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; });
    return;
  }
  if (name === "manage-plan") { window.location.assign("/checkout"); return; }
  if (name === "billing-history") {
    const result = await apiJson("/api/paypal/payments").catch(() => ({ payments: [] }));
    const invoices = result.payments || [];
    openActionModal({ eyebrow: "BILLING", title: "Billing history", hideSubmit: true, content: invoices.length
      ? `<div class="action-list">${invoices.map((invoice) => `<div><span><strong>${escapeHtml(`Mere X ${invoice.plan}`)}</strong><small>${escapeHtml(invoice.status)} · ${formatDate(invoice.capturedAt || invoice.createdAt)}</small></span><strong>${escapeHtml(`${invoice.amount} ${invoice.currency}`)}</strong></div>`).join("")}</div>`
      : `<div class="action-empty"><svg><use href="#i-card"></use></svg><strong>No payments yet</strong><p>Completed payments will appear here.</p></div>` });
    return;
  }
  if (name === "export-data") { downloadJson("mere-x-code-threads.json", { exportedAt: new Date().toISOString(), threads: appState.conversations }); return; }
  if (name === "delete-threads") {
    const ok = await confirmAction("Delete all threads", "Every thread will be removed from your account. Files are not affected.", "Delete all");
    if (!ok) return;
    appState.conversations = [];
    saveWorkspaceState();
    startNewThread(false);
    renderSettings("data");
    return;
  }
  if (name === "manage-email") {
    openActionModal({ eyebrow: "SECURITY", title: "Email address", content: `<label class="action-field"><span>Email</span><input type="email" name="email" required value="${escapeHtml(currentUser?.email || "")}" /></label>`, onSubmit: async (data) => { await updateCurrentUser({ email: String(data.get("email") || "").trim().toLowerCase() }); renderSettings("security"); showToast("Email updated — verify the new address from your inbox"); } });
    return;
  }
  if (name === "change-password") {
    openActionModal({ eyebrow: "SECURITY", title: "Change password", submitLabel: "Change password", content: `<label class="action-field"><span>New password</span><input type="password" name="password" required minlength="8" /></label><label class="action-field"><span>Confirm password</span><input type="password" name="confirm" required minlength="8" /></label><p class="action-error" data-action-error hidden></p>`, onSubmit: async (data) => {
      const password = String(data.get("password") || "");
      if (password !== String(data.get("confirm") || "")) { const error = els.actionBody.querySelector("[data-action-error]"); error.textContent = "Passwords do not match."; error.hidden = false; return false; }
      await apiJson("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      showToast("Password changed");
      return true;
    } });
    return;
  }
  if (name === "change-photo") els.profilePhotoInput.click();
}
els.profilePhotoInput.addEventListener("change", () => {
  const file = els.profilePhotoInput.files?.[0];
  els.profilePhotoInput.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) return showToast("Choose an image file");
  if (file.size > 2 * 1024 * 1024) return showToast("Profile images must be under 2 MB");
  const reader = new FileReader();
  reader.addEventListener("load", () => { appState.profilePhoto = String(reader.result); saveWorkspaceState(); applyProfilePhoto(); showToast("Profile photo updated"); });
  reader.readAsDataURL(file);
});

async function updateCurrentUser(patch) {
  if (!currentUser) return;
  const result = await apiJson("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  currentUser = result.user;
  applyIdentity(currentUser);
}

/* Account popover */
els.profileButton.addEventListener("click", (event) => { event.stopPropagation(); togglePopover(els.accountPopover, els.profileButton, { above: true }); });
els.accountPopover.addEventListener("click", (event) => {
  const settingsLink = event.target.closest("[data-open-settings]");
  if (settingsLink) { openSettings(settingsLink.dataset.openSettings); return; }
  const action = event.target.closest("[data-account-action]");
  if (!action) return;
  closePopovers();
  if (action.dataset.accountAction === "upgrade") window.location.assign("/checkout");
  if (action.dataset.accountAction === "console") window.location.assign("/console");
  if (action.dataset.accountAction === "help") showShortcuts();
  if (action.dataset.accountAction === "logout") signOut();
});

/* ------------------------------------------------------------
   Identity and sign-in
   ------------------------------------------------------------ */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const authScreen = $("#authScreen");
const authSwitch = $("#authSwitch");
const passwordStrength = $("#passwordStrength");
const passwordStrengthLabel = $("#passwordStrengthLabel");
const authForms = { signin: $("#signinForm"), signup: $("#signupForm"), reset: $("#resetForm") };

function showAuthScreen() {
  document.documentElement.classList.remove("app-booting");
  document.documentElement.classList.add("auth-open");
}
function isAuthOpen() { return document.documentElement.classList.contains("auth-open"); }

function initialsFor(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "MX";
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}
function usernameFor(user) {
  const source = user?.name?.trim() || user?.email?.split("@")[0] || "mere-x.user";
  return source.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
}
function applyProfilePhoto() {
  $$("[data-identity-avatar]").forEach((avatar) => {
    avatar.classList.toggle("has-photo", Boolean(appState.profilePhoto));
    avatar.style.backgroundImage = appState.profilePhoto ? `url("${appState.profilePhoto}")` : "";
    avatar.textContent = appState.profilePhoto ? "" : (currentUser ? initialsFor(currentUser.name) : "MX");
  });
}
function applyIdentity(user) {
  currentUser = user;
  if (!user) return;
  accountEntitlements = localEntitlements(user);
  $$("[data-identity-avatar]").forEach((node) => { node.textContent = initialsFor(user.name); });
  $$("[data-identity-name]").forEach((node) => { node.textContent = user.name; });
  $$("[data-identity-plan]").forEach((node) => { node.textContent = user.plan; });
  applyProfilePhoto();
  applyEntitlementUI();
}

function setFieldError(input, message = "") {
  const field = input.closest(".auth-field");
  const note = document.getElementById(`${input.id}-error`);
  if (field) field.classList.toggle("invalid", Boolean(message));
  if (note) note.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
  return !message;
}
function showFormAlert(form, message, tone = "error") {
  const alert = form.querySelector(".auth-alert");
  if (!alert) return;
  alert.textContent = message;
  alert.classList.toggle("success", tone === "success");
  alert.hidden = false;
}
function clearFormFeedback(form) {
  form.querySelectorAll(".auth-field").forEach((field) => field.classList.remove("invalid"));
  form.querySelectorAll(".auth-error").forEach((note) => { note.textContent = ""; });
  form.querySelectorAll("input").forEach((input) => input.setAttribute("aria-invalid", "false"));
  const alert = form.querySelector(".auth-alert");
  if (alert) { alert.hidden = true; alert.textContent = ""; alert.classList.remove("success"); }
}
function resetPasswordFields() {
  $$(".auth-peek").forEach((peek) => {
    const input = document.getElementById(peek.dataset.peek);
    if (!input) return;
    input.type = "password";
    peek.setAttribute("aria-label", "Show password");
    peek.querySelector("use").setAttribute("href", "#i-eye");
  });
}
function scorePassword(value) {
  if (value.length < 8) return 0;
  let score = 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  else if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 0.5;
  return Math.min(4, Math.round(score));
}
function renderStrength(value) {
  const level = value ? scorePassword(value) : 0;
  passwordStrength.dataset.empty = String(!value);
  passwordStrength.dataset.level = String(level);
  passwordStrengthLabel.textContent = STRENGTH_LABELS[level];
}
function setAuthView(view) {
  authScreen.dataset.view = view;
  Object.entries(authForms).forEach(([name, form]) => { form.hidden = name !== view; if (name !== view) clearFormFeedback(form); });
  authSwitch.querySelectorAll("[data-auth-view]").forEach((tab) => { const active = tab.dataset.authView === view; tab.classList.toggle("active", active); tab.setAttribute("aria-pressed", String(active)); });
  resetPasswordFields();
  if (view === "signup") renderStrength(authForms.signup.querySelector("#signupPassword").value);
  if (window.innerWidth > 760) requestAnimationFrame(() => authForms[view].querySelector("input:not([type=checkbox])")?.focus());
}
async function runSubmit(form, work) {
  const submit = form.querySelector(".auth-submit");
  submit.classList.add("is-busy");
  submit.disabled = true;
  try { await work(); }
  catch (error) { showFormAlert(form, error.message || "Something went wrong. Try again."); }
  finally { submit.classList.remove("is-busy"); submit.disabled = false; }
}

async function enterWorkspace(user, message) {
  booting = true;
  workspaceStorageKey = `${APP_STATE_KEY}:${user.id}`;
  applyIdentity(user);
  try {
    const cached = localStorage.getItem(workspaceStorageKey);
    if (cached) appState = normalizeWorkspaceState(JSON.parse(cached));
  } catch { /* the database remains the source of truth */ }
  applySettingsFromState();
  Object.values(authForms).forEach((form) => { form.reset(); clearFormFeedback(form); });
  resetPasswordFields();
  renderStrength("");
  document.documentElement.classList.remove("auth-open", "app-booting");
  registerServiceWorker();
  setAuthView("signin");
  if (window.location.pathname === "/login") {
    const requested = new URLSearchParams(window.location.search).get("returnTo") || "/app";
    const returnTo = /^\/(?:app|console)(?:[/?]|$)/.test(requested) || /^\/checkout(?:\?|$)/.test(requested) ? requested : "/app";
    if (!returnTo.startsWith("/app")) { window.location.replace(returnTo); return; }
    history.replaceState({}, "", returnTo);
  }
  /* Older checkout builds left this key behind after cancellation. Never let
     stale pricing intent hijack an ordinary account login. */
  try { localStorage.removeItem("mere-x.pending-plan"); } catch { /* optional */ }
  applyEntitlementUI();
  setMode(selectedMode);
  setWeb(webEnabled);
  renderSelectedModel();
  updateProjectUI();
  renderThread(null);
  showToast(message);

  const hydrationVersion = workspaceMutationVersion;
  const [workspaceResult] = await Promise.allSettled([hydrateWorkspaceFromDatabase(hydrationVersion), refreshAccountUsage()]);
  if (workspaceResult.status === "fulfilled") {
    applyEntitlementUI(false);
    try { localStorage.setItem(workspaceStorageKey, JSON.stringify(persistedWorkspaceState())); localStorage.removeItem(APP_STATE_KEY); } catch { /* optional */ }
    setSyncState("synced", "Synced");
  } else setSyncState("offline", "Local only");
  setMode(selectedMode);
  setWeb(webEnabled);
  updateProjectUI();
  renderThreadList();
  booting = false;

  /* Reopen the last project when the browser still holds permission. */
  let last = "";
  try { last = localStorage.getItem("mere-x.last-project") || ""; } catch { /* optional */ }
  if (last && appState.projects.some((item) => item.id === last)) {
    const result = await reopenProject(last, { request: false }).catch(() => ({ status: "missing" }));
    if (result.status === "ready") await activateProject(result.project);
    else if (result.status === "permission") { showToast(`Reopen ${result.name} from the project menu to continue`); els.recentProjects.hidden = false; }
  }
}

async function signOut() {
  clearTimeout(workspaceSyncTimer);
  workspaceSyncTimer = 0;
  for (const id of [...runs.keys()]) stopRun(id);
  try { await apiJson("/api/auth/logout", { method: "POST" }); } catch { /* clear the local UI regardless */ }
  currentUser = null;
  workspaceStorageKey = APP_STATE_KEY;
  appState = normalizeWorkspaceState({});
  closePopovers();
  closeSettings();
  closePalette();
  currentConversationId = null;
  showAuthScreen();
  setAuthView("signin");
  window.location.assign("/login");
}

authSwitch.addEventListener("click", (event) => { const tab = event.target.closest("[data-auth-view]"); if (tab) setAuthView(tab.dataset.authView); });
authScreen.addEventListener("click", (event) => {
  const link = event.target.closest(".auth-link[data-auth-view], .auth-back[data-auth-view]");
  if (link) setAuthView(link.dataset.authView);
  const peek = event.target.closest(".auth-peek");
  if (peek) {
    const input = document.getElementById(peek.dataset.peek);
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    peek.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    peek.querySelector("use").setAttribute("href", reveal ? "#i-eye-off" : "#i-eye");
    input.focus();
  }
});
$("#signupPassword").addEventListener("input", (event) => renderStrength(event.target.value));
$$(".auth-input input").forEach((input) => input.addEventListener("input", () => { if (input.getAttribute("aria-invalid") === "true") setFieldError(input, ""); }));

authForms.signin.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = authForms.signin;
  const emailInput = $("#signinEmail");
  const passwordInput = $("#signinPassword");
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  clearFormFeedback(form);
  let valid = setFieldError(emailInput, email ? (EMAIL_PATTERN.test(email) ? "" : "Enter a valid email address.") : "Email is required.");
  valid = setFieldError(passwordInput, password ? "" : "Password is required.") && valid;
  if (!valid) return;
  runSubmit(form, async () => {
    const result = await apiJson("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, remember: $("#rememberMe").checked }) });
    await enterWorkspace(result.user, `Welcome back, ${result.user.name.split(" ")[0]}`);
  });
});

authForms.signup.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = authForms.signup;
  const emailInput = $("#signupEmail");
  const passwordInput = $("#signupPassword");
  const confirmInput = $("#signupConfirm");
  const termsInput = $("#acceptTerms");
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  clearFormFeedback(form);
  let valid = setFieldError(emailInput, email ? (EMAIL_PATTERN.test(email) ? "" : "Enter a valid email address.") : "Email is required.");
  valid = setFieldError(passwordInput, password.length >= 8 ? "" : "Use at least 8 characters.") && valid;
  if (password.length >= 8 && !(/[A-Za-z]/.test(password) && /\d/.test(password))) valid = setFieldError(passwordInput, "Mix letters and numbers for a stronger password.") && valid;
  valid = setFieldError(confirmInput, confirmInput.value === password && password ? "" : "Passwords do not match.") && valid;
  valid = setFieldError(termsInput, termsInput.checked ? "" : "Accept the terms to continue.") && valid;
  if (!valid) return;
  runSubmit(form, async () => {
    const result = await apiJson("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    await enterWorkspace(result.user, `Welcome to Mere X, ${result.user.name.split(" ")[0]}`);
  });
});

authForms.reset.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = authForms.reset;
  const emailInput = $("#resetEmail");
  const email = emailInput.value.trim().toLowerCase();
  const resetToken = new URLSearchParams(window.location.search).get("reset");
  clearFormFeedback(form);
  if (!resetToken && !setFieldError(emailInput, email ? (EMAIL_PATTERN.test(email) ? "" : "Enter a valid email address.") : "Email is required.")) return;
  if (resetToken) {
    const password = $("#resetNewPassword").value;
    const confirm = $("#resetConfirmPassword").value;
    let valid = setFieldError($("#resetNewPassword"), password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password) ? "" : "Use at least 8 characters with letters and numbers.");
    valid = setFieldError($("#resetConfirmPassword"), password && confirm === password ? "" : "Passwords do not match.") && valid;
    if (!valid) return;
    runSubmit(form, async () => {
      await apiJson("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: resetToken, password }) });
      history.replaceState({}, "", "/login");
      $("#resetPasswordFields").hidden = true;
      emailInput.closest(".auth-field").hidden = false;
      $("#resetSubmitLabel").innerHTML = 'Send reset link<svg><use href="#i-arrow-ne"></use></svg>';
      setAuthView("signin");
      showToast("Password updated — sign in with your new password");
    });
    return;
  }
  runSubmit(form, async () => {
    const result = await apiJson("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    showFormAlert(form, result.message, "success");
  });
});

async function loadGoogleIdentity() {
  const config = await apiJson("/api/auth/config");
  if (!config.googleClientId) return;
  await new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google sign-in could not load."));
    document.head.append(script);
  });
  window.google.accounts.id.initialize({
    client_id: config.googleClientId,
    auto_select: false,
    cancel_on_tap_outside: true,
    callback: async ({ credential }) => {
      try {
        const result = await apiJson("/api/auth/google", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential }) });
        await enterWorkspace(result.user, `Welcome, ${result.user.name.split(" ")[0]}`);
      } catch (error) {
        showFormAlert(authForms[authScreen.dataset.view] || authForms.signin, error.message);
      }
    }
  });
  $$("[data-google-signin]").forEach((host) => {
    host.replaceChildren();
    const availableWidth = Math.max(220, Math.floor(host.getBoundingClientRect().width || Math.min(360, window.innerWidth - 64)));
    window.google.accounts.id.renderButton(host, { type: "standard", theme: "filled_black", size: "large", shape: "rectangular", text: "continue_with", width: Math.min(360, availableWidth) });
  });
}

async function initializeSession() {
  const resetToken = new URLSearchParams(window.location.search).get("reset");
  if (resetToken) {
    setAuthView("reset");
    $("#resetEmail").closest(".auth-field").hidden = true;
    $("#resetPasswordFields").hidden = false;
    $("#resetSubmitLabel").innerHTML = 'Save new password<svg><use href="#i-arrow-ne"></use></svg>';
  } else setAuthView("signin");
  /* Load Google's identity library alongside the session lookup instead of
     serially afterwards, so the account button is ready as soon as login is. */
  const googleIdentity = loadGoogleIdentity().catch((error) => console.warn(error.message));
  try {
    const result = await apiJson("/api/auth/session");
    if (result.user && !resetToken) await enterWorkspace(result.user, `Welcome back, ${result.user.name.split(" ")[0]}`);
    else showAuthScreen();
  } catch (error) {
    showAuthScreen();
    showToast(error.message);
  }
  await googleIdentity;
}

window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredInstallPrompt = event; });
window.addEventListener("appinstalled", () => { deferredInstallPrompt = null; showToast("Mere Code installed"); });
window.addEventListener("beforeunload", (event) => {
  if (runs.size) { event.preventDefault(); event.returnValue = ""; }
});
function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || (location.protocol !== "https:" && location.hostname !== "localhost")) return;
  navigator.serviceWorker.register("/app/sw.js", { scope: "/app/" }).catch(() => { /* optional */ });
}

initializeSession();
