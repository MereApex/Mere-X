/* ============================================================
   THREAD — renders an agent conversation: prompts with their
   context chips, the model's thinking, every tool call as a
   compact row, the prose, the live plan and the review card for
   changed files. Live turns update in place while streaming.
   ============================================================ */

import DOMPurify from "dompurify";
import { Marked } from "marked";

import { highlight } from "./highlight.js";
import { describeArgs } from "./agent.js";
import { TOOL_LABELS } from "./agent-tools.js";
import { unifiedHunks } from "./diff.js";

const marked = new Marked({ gfm: true, breaks: false });

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

/* ---- Markdown ------------------------------------------------ */
export function renderMarkdown(text) {
  const html = marked.parse(String(text || ""));
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ["target", "rel"] });
}

export function decorateMarkdown(node) {
  node.querySelectorAll("pre > code").forEach((code) => {
    const pre = code.parentElement;
    if (pre.dataset.decorated) return;
    pre.dataset.decorated = "true";
    const language = (code.className.match(/language-([\w+-]+)/) || [])[1] || "";
    const source = code.textContent;
    code.innerHTML = highlight(source, language || "js");
    const frame = document.createElement("div");
    frame.className = "code-frame";
    const head = document.createElement("div");
    head.className = "code-frame-head";
    head.innerHTML = `<span>${escapeHtml(language || "code")}</span><button type="button" class="code-copy" data-copy-code><svg><use href="#i-copy"></use></svg><span>Copy</span></button>`;
    pre.replaceWith(frame);
    frame.append(head, pre);
    head.querySelector("[data-copy-code]").addEventListener("click", async (event) => {
      try {
        await navigator.clipboard.writeText(source);
        event.currentTarget.querySelector("span").textContent = "Copied";
        setTimeout(() => { event.currentTarget && (event.currentTarget.querySelector("span").textContent = "Copy"); }, 1400);
      } catch { /* clipboard is optional */ }
    });
  });
  node.querySelectorAll("a[href]").forEach((anchor) => {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  });
}

/* ---- Time --------------------------------------------------- */
function seconds(ms) {
  if (!ms || ms < 1000) return "a moment";
  const value = Math.round(ms / 1000);
  if (value < 60) return `${value}s`;
  return `${Math.floor(value / 60)}m ${value % 60}s`;
}

export function formatTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/* ---- Icons per tool ------------------------------------------ */
const TOOL_ICONS = {
  list_files: "i-folder",
  read_file: "i-file",
  search_files: "i-search",
  find_files: "i-search",
  write_file: "i-edit",
  edit_file: "i-edit",
  delete_file: "i-trash",
  move_file: "i-arrow-right",
  run_javascript: "i-terminal",
  update_plan: "i-list",
  web_search: "i-globe",
  delegate: "i-network",
  save_memory: "i-database",
  read_url: "i-globe",
  read_preview_console: "i-terminal",
  run_command: "i-terminal",
  git_status: "i-history",
  git_diff: "i-diff",
  git_log: "i-history"
};

function callLabel(part) {
  const name = part.name;
  const label = TOOL_LABELS[name] || name;
  if (part.status === "running") {
    if (name === "read_file") return "Reading";
    if (name === "search_files" || name === "find_files") return "Searching";
    if (name === "edit_file" || name === "write_file") return "Editing";
    if (name === "list_files") return "Listing";
    if (name === "run_javascript") return "Running";
    if (name === "delete_file") return "Deleting";
    if (name === "move_file") return "Moving";
    if (name === "update_plan") return "Planning";
    if (name === "delegate") return "Delegating";
    if (name === "save_memory") return "Remembering";
    if (name === "read_url") return "Reading page";
    if (name === "read_preview_console") return "Reading preview";
    return "Calling";
  }
  return label;
}

function callMeta(part) {
  if (part.status === "running") return "";
  const output = String(part.output || "");
  if (part.name === "search_files") {
    const match = output.match(/^(\d+) match/);
    if (match) return `${match[1]} ${match[1] === "1" ? "result" : "results"}`;
    if (/^No matches/.test(output)) return "no results";
  }
  if (part.name === "find_files") {
    const match = output.match(/^(\d+) file/);
    if (match) return `${match[1]} ${match[1] === "1" ? "file" : "files"}`;
  }
  if (part.name === "read_file") {
    const match = output.match(/showing (\d+)-(\d+)/);
    if (match) return `L${match[1]}-${match[2]}`;
  }
  if (part.name === "edit_file" || part.name === "write_file") {
    const match = output.match(/\(\+(\d+) −(\d+)\)/) || output.match(/\((\d+) lines\)/);
    if (match && match[2] !== undefined) return `+${match[1]} −${match[2]}`;
    if (match) return `${match[1]} lines`;
  }
  return "";
}

/* ---- Parts --------------------------------------------------- */
export function renderThoughtPart(part, live = false) {
  const node = document.createElement("details");
  node.className = "part part-thought";
  if (live) node.open = false;
  node.innerHTML = `<summary><svg class="part-spinner"><use href="#i-spinner"></use></svg><span data-thought-label>${live ? "Thinking" : `Thought for ${seconds(part.ms)}`}</span><svg class="part-chevron"><use href="#i-chevron"></use></svg></summary><div class="thought-body" data-thought-body></div>`;
  node.querySelector("[data-thought-body]").innerHTML = renderMarkdown(part.text || "");
  return node;
}

export function renderCallPart(part) {
  const node = document.createElement("div");
  node.className = "part part-call";
  node.dataset.status = part.status || "done";
  node.dataset.tool = part.name;
  paintCallPart(node, part);
  return node;
}

export function paintCallPart(node, part) {
  node.dataset.status = part.status || "done";
  const detail = describeArgs(part.name, part.args);
  const meta = callMeta(part);
  const isChange = part.name === "edit_file" || part.name === "write_file" || part.name === "delete_file" || part.name === "move_file";
  node.innerHTML = `
    <div class="call-row" role="button" tabindex="0" data-call-toggle aria-expanded="false">
      <span class="call-icon"><svg><use href="#${TOOL_ICONS[part.name] || "i-spark"}"></use></svg><svg class="call-spin"><use href="#i-spinner"></use></svg></span>
      <span class="call-label">${escapeHtml(callLabel(part))}</span>
      ${detail ? `<span class="call-target ${part.args?.path || part.name === "move_file" || part.name === "list_files" ? "is-path" : ""}" ${part.args?.path ? `data-open-path="${escapeHtml(part.args.path)}"` : ""}>${escapeHtml(detail)}</span>` : ""}
      ${meta ? `<span class="call-meta">${escapeHtml(meta)}</span>` : ""}
      ${part.status === "error" ? `<span class="call-meta is-error">failed</span>` : ""}
      ${isChange && part.status !== "running" && part.args?.path ? `<span class="call-actions"><button type="button" class="call-mini" data-open-diff="${escapeHtml(part.args.path)}">Diff</button></span>` : ""}
    </div>
    <div class="call-detail" hidden>
      ${part.args && part.name !== "write_file" && part.name !== "edit_file" ? `<pre class="call-args">${escapeHtml(argsPreview(part))}</pre>` : ""}
      ${part.name === "edit_file" && part.args ? `<pre class="call-edit"><span class="del">${escapeHtml(part.args.old_string || "")}</span>\n<span class="add">${escapeHtml(part.args.new_string || "")}</span></pre>` : ""}
      ${part.name === "write_file" && part.args ? `<pre class="call-args">${escapeHtml(String(part.args.content || "").slice(0, 1600))}${String(part.args.content || "").length > 1600 ? "\n…" : ""}</pre>` : ""}
      ${part.output ? `<pre class="call-output">${escapeHtml(part.output)}</pre>` : ""}
    </div>`;
}

function argsPreview(part) {
  const args = { ...(part.args || {}) };
  if (part.name === "run_javascript") return String(args.code || "");
  if (part.name === "update_plan") return (args.steps || []).map((step) => `[${step.status}] ${step.title}`).join("\n");
  return Object.entries(args).map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`).join("\n");
}

export function renderTextPart(part) {
  const node = document.createElement("div");
  node.className = "part part-text markdown";
  node.innerHTML = renderMarkdown(part.text || "");
  decorateMarkdown(node);
  return node;
}

/* ---- Plan ----------------------------------------------------- */
export function renderPlan(steps) {
  const node = document.createElement("div");
  node.className = "plan-card";
  paintPlan(node, steps);
  return node;
}

export function paintPlan(node, steps) {
  const done = steps.filter((step) => step.status === "done").length;
  node.innerHTML = `
    <div class="plan-head"><span>Plan</span><small>${done}/${steps.length}</small></div>
    <ol class="plan-steps">
      ${steps.map((step) => `<li data-status="${escapeHtml(step.status)}"><span class="plan-mark"></span><span>${escapeHtml(step.title)}</span></li>`).join("")}
    </ol>`;
}

/* ---- Changes ---------------------------------------------------- */
export function renderChanges(changes, { reviewed = false } = {}) {
  const node = document.createElement("div");
  node.className = "changes-card";
  paintChanges(node, changes, { reviewed });
  return node;
}

export function paintChanges(node, changes, { reviewed = false } = {}) {
  const added = changes.reduce((sum, change) => sum + (change.added || 0), 0);
  const removed = changes.reduce((sum, change) => sum + (change.removed || 0), 0);
  const pending = changes.filter((change) => !change.decision);
  node.innerHTML = `
    <div class="changes-head">
      <span class="changes-title">${changes.length} file${changes.length === 1 ? "" : "s"} changed</span>
      <span class="changes-stat"><b class="add">+${added}</b> <b class="del">−${removed}</b></span>
      <span class="changes-actions">
        ${pending.length ? `<button type="button" class="chip-btn" data-review-all>Review</button><button type="button" class="chip-btn chip-btn-primary" data-accept-all>Accept all</button><button type="button" class="chip-btn" data-reject-all>Reject all</button>` : `<span class="changes-done">${reviewed ? "Reviewed" : ""}</span>`}
      </span>
    </div>
    <div class="changes-list">
      ${changes.map((change) => `
        <div class="change-row" data-path="${escapeHtml(change.path)}" data-decision="${escapeHtml(change.decision || "")}">
          <button type="button" class="change-path" data-open-diff="${escapeHtml(change.path)}" title="Open diff">
            <svg><use href="#i-file"></use></svg><span>${escapeHtml(change.path)}</span>
          </button>
          <span class="change-kind">${change.kind === "create" ? "new" : change.kind === "delete" ? "deleted" : ""}</span>
          <span class="changes-stat"><b class="add">+${change.added || 0}</b> <b class="del">−${change.removed || 0}</b></span>
          ${change.decision
            ? `<span class="change-decision">${change.decision === "accepted" ? "Accepted" : "Reverted"}</span>`
            : `<span class="change-buttons"><button type="button" class="call-mini" data-accept-path="${escapeHtml(change.path)}">Accept</button><button type="button" class="call-mini" data-reject-path="${escapeHtml(change.path)}">Reject</button></span>`}
        </div>`).join("")}
    </div>`;
}

/* A unified diff block for the thread, used when the editor is not the
   place to review (mobile, or a deleted file). */
export function renderDiffBlock(path, before, after) {
  const node = document.createElement("div");
  node.className = "diff-block";
  const hunks = unifiedHunks(before || "", after || "");
  node.innerHTML = `
    <div class="diff-head"><span>${escapeHtml(path)}</span><button type="button" class="call-mini" data-close-diff>Close</button></div>
    <div class="diff-body">
      ${hunks.length ? hunks.map((hunk) => `
        <div class="diff-hunk">
          <div class="diff-hunk-head">@@ -${hunk.oldStart} +${hunk.newStart} @@</div>
          ${hunk.lines.map((line) => `<div class="diff-line diff-${line.type}"><span class="diff-num">${line.oldLine ?? ""}</span><span class="diff-num">${line.newLine ?? ""}</span><span class="diff-sign">${line.type === "add" ? "+" : line.type === "del" ? "−" : " "}</span><span class="diff-text">${escapeHtml(line.text)}</span></div>`).join("")}
        </div>`).join("") : `<p class="diff-empty">No line changes.</p>`}
    </div>`;
  return node;
}

/* ---- Messages --------------------------------------------------- */
export function renderUserMessage(message, { index = 0 } = {}) {
  const node = document.createElement("article");
  node.className = "turn turn-user";
  node.dataset.messageId = message.id;
  const mentions = (message.mentions || []).map((mention) => `<span class="ctx-chip"><svg><use href="#${mention.kind === "folder" ? "i-folder" : mention.kind === "selection" ? "i-code" : "i-file"}"></use></svg>${escapeHtml(mention.label || mention.path)}</span>`).join("");
  const files = (message.attachments || []).map((file) => `<span class="ctx-chip"><svg><use href="#${String(file.type || "").startsWith("image/") ? "i-image" : "i-paperclip"}"></use></svg>${escapeHtml(file.name)}</span>`).join("");
  node.innerHTML = `
    <div class="turn-user-frame">
      ${mentions || files ? `<div class="turn-context">${mentions}${files}</div>` : ""}
      <div class="turn-user-text">${escapeHtml(message.text || "")}</div>
    </div>
    <div class="turn-user-meta">
      ${index > 0 || message.checkpoint ? `<button type="button" class="turn-link" data-restore="${escapeHtml(message.id)}"><svg><use href="#i-refresh"></use></svg>Restore checkpoint</button>` : ""}
      <button type="button" class="turn-link" data-edit-prompt="${escapeHtml(message.id)}"><svg><use href="#i-edit"></use></svg>Edit</button>
      <span class="turn-time">${formatTime(message.createdAt)}</span>
    </div>`;
  return node;
}

export function renderAssistantMessage(message) {
  const node = document.createElement("article");
  node.className = "turn turn-assistant";
  node.dataset.messageId = message.id;
  const parts = document.createElement("div");
  parts.className = "turn-parts";
  for (const part of message.parts || []) {
    if (part.type === "thought" && part.text?.trim()) parts.append(renderThoughtPart(part));
    else if (part.type === "call") parts.append(renderCallPart(part));
    else if (part.type === "text" && part.text?.trim()) parts.append(renderTextPart(part));
  }
  if (!(message.parts || []).length && message.text) parts.append(renderTextPart({ text: message.text }));
  node.append(parts);
  if (message.plan?.length) node.append(renderPlan(message.plan));
  if (message.changes?.length) node.append(renderChanges(message.changes, { reviewed: message.changes.every((change) => change.decision) }));
  if (message.error) {
    const error = document.createElement("div");
    error.className = "turn-error";
    error.innerHTML = `<svg><use href="#i-warning"></use></svg><span>${escapeHtml(message.error)}</span><button type="button" class="call-mini" data-retry>Retry</button>`;
    node.append(error);
  }
  if (message.stopped === "budget") {
    const note = document.createElement("div");
    note.className = "turn-error is-note";
    note.innerHTML = `<svg><use href="#i-clock"></use></svg><span>The tool budget for one turn was used up.</span><button type="button" class="call-mini" data-continue>Continue</button>`;
    node.append(note);
  }
  const foot = document.createElement("div");
  foot.className = "turn-foot";
  foot.innerHTML = `
    <span class="turn-model">${escapeHtml(message.model || "")}${message.usage?.output ? ` · ${Math.round((message.usage.input + message.usage.output) / 1000)}k tokens` : ""}${message.ms ? ` · ${seconds(message.ms)}` : ""}</span>
    <span class="turn-foot-actions">
      <button type="button" class="turn-icon" data-copy-message title="Copy"><svg><use href="#i-copy"></use></svg></button>
      <button type="button" class="turn-icon" data-retry title="Retry"><svg><use href="#i-refresh"></use></svg></button>
    </span>`;
  node.append(foot);
  return node;
}

/* ---- The live turn ------------------------------------------------- */
export class LiveTurn {
  constructor(container, { model }) {
    this.node = document.createElement("article");
    this.node.className = "turn turn-assistant is-live";
    this.parts = document.createElement("div");
    this.parts.className = "turn-parts";
    this.status = document.createElement("div");
    this.status.className = "turn-status";
    this.status.innerHTML = `<span class="status-pulse"></span><span data-status-label>Starting</span><span class="turn-status-detail" data-status-detail></span>`;
    this.node.append(this.parts, this.status);
    this.model = model;
    this.map = new WeakMap();
    this.planNode = null;
    this.startedAt = Date.now();
    this.thoughtStart = 0;
    container.append(this.node);
  }

  setStatus(label, detail = "") {
    this.status.querySelector("[data-status-label]").textContent = label;
    this.status.querySelector("[data-status-detail]").textContent = detail;
  }

  handle(event) {
    if (event.type === "status") this.setStatus(event.label, event.detail);
    else if (event.type === "thought") {
      let node = this.map.get(event.part);
      if (!node) {
        node = renderThoughtPart(event.part, true);
        this.map.set(event.part, node);
        this.parts.append(node);
        this.thoughtStart = Date.now();
        this.setStatus("Thinking");
      }
      const body = node.querySelector("[data-thought-body]");
      body.innerHTML = renderMarkdown(event.part.text);
    } else if (event.type === "text") {
      let node = this.map.get(event.part);
      if (!node) {
        node = document.createElement("div");
        node.className = "part part-text markdown";
        this.map.set(event.part, node);
        this.parts.append(node);
        this.closeThought();
        this.setStatus("Writing");
      }
      node.innerHTML = renderMarkdown(event.part.text);
    } else if (event.type === "call") {
      this.closeThought();
      const node = renderCallPart(event.part);
      this.map.set(event.part, node);
      this.parts.append(node);
      this.setStatus(callLabel(event.part), describeArgs(event.part.name, event.part.args));
    } else if (event.type === "call-done") {
      const node = this.map.get(event.part);
      if (node) paintCallPart(node, event.part);
    } else if (event.type === "plan") {
      if (!this.planNode) {
        this.planNode = renderPlan(event.steps);
        this.node.insertBefore(this.planNode, this.status);
      } else paintPlan(this.planNode, event.steps);
    }
  }

  closeThought() {
    const last = this.parts.lastElementChild;
    if (last && last.classList.contains("part-thought") && !last.dataset.closed) {
      last.dataset.closed = "true";
      last.querySelector("[data-thought-label]").textContent = `Thought for ${seconds(Date.now() - this.thoughtStart)}`;
      last.classList.add("is-done");
    }
  }

  finish(message) {
    this.closeThought();
    const final = renderAssistantMessage(message);
    /* Keep the streamed prose nodes so the page does not jump; only swap
       what changed shape. */
    this.node.replaceWith(final);
    final.querySelectorAll(".part-text").forEach((node) => decorateMarkdown(node));
    return final;
  }

  fail(message) {
    return this.finish(message);
  }
}
