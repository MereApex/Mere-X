/* ============================================================
   AGENT TOOLS — the browser side of the contract in
   server/agent.js. Each tool takes parsed arguments and returns
   the text the model reads next. Writes go through the change
   tracker so every edit is reviewable and reversible.
   ============================================================ */

import { normalizePath, isBinaryPath } from "./project-fs.js";
import { diffStats } from "./diff.js";

const READ_DEFAULT_LINES = 600;
const READ_MAX_CHARS = 60_000;
const LIST_MAX = 400;

const NUL = String.fromCharCode(0);

export class ChangeTracker {
  constructor() {
    /* path -> { before, after, kind } for the current turn */
    this.changes = new Map();
  }

  /* The first version we saw of a file in this turn is its "before". */
  async remember(fs, path, kind) {
    const key = normalizePath(path);
    if (this.changes.has(key)) {
      const existing = this.changes.get(key);
      if (kind === "delete") existing.kind = existing.kind === "create" ? "create-delete" : "delete";
      return existing;
    }
    let before = null;
    if (fs.has(key) && !fs.isDirectory(key)) {
      try { before = await fs.read(key); } catch { before = null; }
    }
    const entry = { path: key, before, after: before, kind: before === null ? "create" : kind };
    if (kind === "delete") entry.kind = "delete";
    this.changes.set(key, entry);
    return entry;
  }

  update(path, after) {
    const entry = this.changes.get(normalizePath(path));
    if (entry) entry.after = after;
  }

  summary() {
    return [...this.changes.values()]
      .filter((entry) => entry.before !== entry.after || entry.kind === "delete" || entry.kind === "create")
      .filter((entry) => !(entry.kind === "create-delete"))
      .map((entry) => {
        const stats = diffStats(entry.before || "", entry.after === null ? "" : entry.after || "");
        return { path: entry.path, kind: entry.kind, added: stats.added, removed: stats.removed };
      });
  }

  entries() {
    return [...this.changes.values()].filter((entry) => entry.kind !== "create-delete");
  }
}

function numberLines(text, start, end) {
  const lines = text.split("\n");
  const from = Math.max(1, start || 1);
  const to = Math.min(lines.length, end || from + READ_DEFAULT_LINES - 1);
  const width = String(to).length;
  const out = [];
  let chars = 0;
  for (let index = from; index <= to; index += 1) {
    const line = `${String(index).padStart(width, " ")}│${lines[index - 1]}`;
    chars += line.length + 1;
    if (chars > READ_MAX_CHARS) {
      out.push(`… output truncated at line ${index - 1}; read a narrower range for the rest`);
      break;
    }
    out.push(line);
  }
  const header = `${lines.length} lines total · showing ${from}-${Math.min(to, lines.length)}`;
  return `${header}\n${out.join("\n")}`;
}

/* ------------------------------------------------------------
   The isolated sandbox for run_javascript: a worker built from a
   blob, no access to the page, killed on timeout.
   ------------------------------------------------------------ */
function runInSandbox(code, timeout = 5_000) {
  const source = `
    const __logs = [];
    const __format = (value) => {
      if (typeof value === "string") return value;
      try { return JSON.stringify(value, (k, v) => typeof v === "bigint" ? String(v) + "n" : v, 2) ?? String(value); } catch { return String(value); }
    };
    const __console = { log: (...a) => __logs.push(a.map(__format).join(" ")), error: (...a) => __logs.push("[error] " + a.map(__format).join(" ")), warn: (...a) => __logs.push("[warn] " + a.map(__format).join(" ")), info: (...a) => __logs.push(a.map(__format).join(" ")) };
    self.fetch = undefined; self.XMLHttpRequest = undefined; self.WebSocket = undefined; self.importScripts = undefined;
    self.onmessage = async (event) => {
      let value;
      try {
        const fn = new Function("console", "return (async () => { " + event.data + "\\n })()");
        value = await fn(__console);
        self.postMessage({ ok: true, logs: __logs, value: value === undefined ? undefined : __format(value) });
      } catch (error) {
        self.postMessage({ ok: false, logs: __logs, error: String(error && error.stack || error) });
      }
    };
  `;
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  return new Promise((resolve) => {
    let worker;
    try {
      worker = new Worker(url);
    } catch (error) {
      URL.revokeObjectURL(url);
      resolve({ ok: false, logs: [], error: `Sandbox unavailable: ${error.message}` });
      return;
    }
    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ ok: false, logs: [], error: `Timed out after ${timeout} ms.` });
    }, timeout);
    worker.onmessage = (event) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(event.data);
    };
    worker.onerror = (event) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ ok: false, logs: [], error: event.message || "The sandbox crashed." });
    };
    worker.postMessage(code);
  });
}

/* ------------------------------------------------------------
   Tools
   ------------------------------------------------------------ */
export function createToolRunner({ fs, tracker, onPlan, confirmDelete, delegate, onMemory, previewConsole }) {
  const ensureProject = () => {
    if (!fs) throw new Error("No project is open. Ask the person to open a folder or create a project first.");
  };

  const tools = {
    async list_files({ path = "", depth = 2 }) {
      ensureProject();
      const base = normalizePath(path);
      if (base && !fs.has(base)) return `No such folder: ${base}`;
      if (base && !fs.isDirectory(base)) return `${base} is a file, not a folder.`;
      const levels = Math.min(5, Math.max(1, Number(depth) || 2));
      const lines = [];
      let count = 0;
      let truncated = false;
      const walk = (dir, level) => {
        for (const entry of fs.children(dir)) {
          if (count >= LIST_MAX) { truncated = true; return; }
          count += 1;
          lines.push(`${"  ".repeat(level)}${entry.name}${entry.dir ? "/" : ""}`);
          if (entry.dir && level + 1 < levels) walk(entry.path, level + 1);
          else if (entry.dir) {
            const inside = fs.countUnder(entry.path);
            if (inside) lines.push(`${"  ".repeat(level + 1)}… ${inside} files`);
          }
        }
      };
      walk(base, 0);
      if (!lines.length) return `${base || "The project root"} is empty.`;
      return `${base || "."}/\n${lines.join("\n")}${truncated ? `\n… listing truncated at ${LIST_MAX} entries; list a subfolder` : ""}`;
    },

    async read_file({ path, start_line, end_line }) {
      ensureProject();
      const key = normalizePath(path);
      if (!fs.has(key)) {
        const guesses = fs.findFiles(key.split("/").pop() || key, { max: 5 });
        return `No such file: ${key}${guesses.length ? `\nDid you mean: ${guesses.join(", ")}` : ""}`;
      }
      if (fs.isDirectory(key)) return `${key} is a folder. Use list_files.`;
      const text = await fs.read(key);
      if (!text.length) return `${key} is empty (0 lines).`;
      return numberLines(text, Number(start_line) || 1, Number(end_line) || undefined);
    },

    async search_files({ query, path = "", glob = "", regex = false, case_sensitive = false, max_results = 80 }) {
      ensureProject();
      const result = await fs.search(query, { path, glob, regex: regex === true, caseSensitive: case_sensitive === true, max: Math.min(300, Math.max(1, Number(max_results) || 80)) });
      if (!result.matches.length) return `No matches for ${JSON.stringify(query)} in ${result.files} files${path ? ` under ${normalizePath(path)}` : ""}.`;
      const grouped = new Map();
      for (const match of result.matches) {
        if (!grouped.has(match.path)) grouped.set(match.path, []);
        grouped.get(match.path).push(`${match.line}: ${match.text.trim()}`);
      }
      const body = [...grouped].map(([file, lines]) => `${file}\n  ${lines.join("\n  ")}`).join("\n");
      return `${result.matches.length} match${result.matches.length === 1 ? "" : "es"} in ${grouped.size} file${grouped.size === 1 ? "" : "s"}${result.truncated ? " (truncated; narrow the search)" : ""}\n${body}`;
    },

    async find_files({ pattern, max_results = 100 }) {
      ensureProject();
      const found = fs.findFiles(pattern, { max: Math.min(300, Math.max(1, Number(max_results) || 100)) });
      if (!found.length) return `No files match ${JSON.stringify(pattern)}.`;
      return `${found.length} file${found.length === 1 ? "" : "s"}\n${found.join("\n")}`;
    },

    async write_file({ path, content }) {
      ensureProject();
      const key = normalizePath(path);
      if (!key) return "A file path is required.";
      if (isBinaryPath(key)) return `${key} has a binary extension; write text files only.`;
      const text = String(content ?? "");
      const existed = fs.has(key);
      await tracker.remember(fs, key, existed ? "edit" : "create");
      await fs.write(key, text);
      tracker.update(key, text);
      const lines = text.split("\n").length;
      return existed ? `Replaced ${key} (${lines} lines).` : `Created ${key} (${lines} lines).`;
    },

    async edit_file({ path, old_string, new_string, replace_all = false }) {
      ensureProject();
      const key = normalizePath(path);
      if (!fs.has(key)) return `No such file: ${key}. Use write_file to create it.`;
      if (fs.isDirectory(key)) return `${key} is a folder.`;
      const before = await fs.read(key);
      const target = String(old_string ?? "");
      const replacement = String(new_string ?? "");
      if (!target) return "old_string is empty. Provide the exact text to replace, or use write_file for a new file.";
      if (target === replacement) return "old_string and new_string are identical; nothing to change.";
      let count = 0;
      let index = before.indexOf(target);
      while (index !== -1) { count += 1; index = before.indexOf(target, index + target.length); }
      if (count === 0) {
        const hint = nearestLine(before, target);
        return `old_string was not found in ${key}. Match the file exactly, including whitespace.${hint ? `\nClosest line: ${hint}` : ""}`;
      }
      if (count > 1 && !replace_all) return `old_string matches ${count} places in ${key}. Include more surrounding lines to make it unique, or set replace_all to true.`;
      await tracker.remember(fs, key, "edit");
      const after = replace_all ? before.split(target).join(replacement) : before.replace(target, () => replacement);
      await fs.write(key, after);
      tracker.update(key, after);
      const stats = diffStats(before, after);
      const at = before.slice(0, before.indexOf(target)).split("\n").length;
      return `Edited ${key}: ${count > 1 ? `${count} replacements` : `replaced at line ${at}`} (+${stats.added} −${stats.removed}).`;
    },

    async delete_file({ path }) {
      ensureProject();
      const key = normalizePath(path);
      if (!fs.has(key)) return `No such file: ${key}`;
      if (confirmDelete && !(await confirmDelete(key))) return `The person declined to delete ${key}. Leave it in place.`;
      await tracker.remember(fs, key, "delete");
      await fs.delete(key);
      tracker.update(key, null);
      return `Deleted ${key}.`;
    },

    async move_file({ from, to }) {
      ensureProject();
      const source = normalizePath(from);
      const target = normalizePath(to);
      if (!fs.has(source)) return `No such file: ${source}`;
      if (fs.has(target)) return `${target} already exists.`;
      const content = await fs.read(source);
      await tracker.remember(fs, source, "delete");
      await tracker.remember(fs, target, "create");
      await fs.move(source, target);
      tracker.update(source, null);
      tracker.update(target, content);
      return `Moved ${source} → ${target}. Update any imports that reference the old path.`;
    },

    async run_javascript({ code, timeout_ms = 5000 }) {
      const result = await runInSandbox(String(code || ""), Math.min(20_000, Math.max(100, Number(timeout_ms) || 5_000)));
      const logs = result.logs?.length ? `console:\n${result.logs.join("\n").slice(0, 20_000)}` : "console: (no output)";
      if (!result.ok) return `${logs}\nerror: ${String(result.error).slice(0, 4_000)}`;
      return `${logs}\nresult: ${result.value === undefined ? "undefined" : String(result.value).slice(0, 8_000)}`;
    },

    async delegate({ task, focus = "" }) {
      if (!delegate) return "Delegation is not available in this context; investigate directly.";
      const brief = String(task || "").trim();
      if (!brief) return "delegate needs a task.";
      return delegate(brief, String(focus || ""));
    },

    async save_memory({ note }) {
      const text = String(note || "").trim().slice(0, 400);
      if (!text) return "save_memory needs a note.";
      if (!onMemory) return "Memory is not available without an open project.";
      onMemory(text);
      return `Remembered: ${text}`;
    },

    async read_preview_console() {
      const lines = previewConsole ? previewConsole() : [];
      if (!lines.length) return "The live preview has logged nothing yet. Ask the person to open the preview, or open it with the Preview button, then try again.";
      return lines.slice(-80).join("\n");
    },

    async update_plan({ steps }) {
      const list = (Array.isArray(steps) ? steps : []).slice(0, 20).map((step) => ({
        title: String(step?.title || "").slice(0, 200),
        status: ["pending", "in_progress", "done"].includes(step?.status) ? step.status : "pending"
      })).filter((step) => step.title);
      onPlan?.(list);
      return `Plan shown to the person: ${list.map((step) => `[${step.status}] ${step.title}`).join("; ")}`;
    }
  };
  return async function run(name, args) {
    const tool = tools[name];
    if (!tool) return `${name} is not available in this workspace.`;
    try {
      const output = await tool(args || {});
      return String(output ?? "").replace(new RegExp(NUL, "g"), "");
    } catch (error) {
      return `${name} failed: ${error?.message || error}`;
    }
  };
}

/* When an edit misses, show the model the most similar line so its next
   attempt lands. */
function nearestLine(text, target) {
  const first = target.split("\n").find((line) => line.trim());
  if (!first) return "";
  const needle = first.trim();
  const lines = text.split("\n");
  let best = null;
  let bestScore = 0;
  lines.forEach((line, index) => {
    const candidate = line.trim();
    if (!candidate) return;
    const score = similarity(needle, candidate);
    if (score > bestScore) { bestScore = score; best = `${index + 1}: ${line}`; }
  });
  return bestScore > 0.5 ? best.slice(0, 200) : "";
}

function similarity(a, b) {
  if (a === b) return 1;
  const grams = (value) => {
    const set = new Set();
    for (let index = 0; index < value.length - 1; index += 1) set.add(value.slice(index, index + 2));
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (!ga.size || !gb.size) return 0;
  let shared = 0;
  for (const gram of ga) if (gb.has(gram)) shared += 1;
  return (2 * shared) / (ga.size + gb.size);
}

export const TOOL_LABELS = Object.freeze({
  list_files: "Listed",
  read_file: "Read",
  search_files: "Searched",
  find_files: "Found files",
  write_file: "Wrote",
  edit_file: "Edited",
  delete_file: "Deleted",
  move_file: "Moved",
  run_javascript: "Ran JavaScript",
  update_plan: "Updated plan",
  delegate: "Delegated",
  save_memory: "Remembered",
  read_url: "Read page",
  read_preview_console: "Read preview console",
  run_command: "Ran",
  git_status: "Checked git",
  git_diff: "Read git diff",
  git_log: "Read git log"
});
