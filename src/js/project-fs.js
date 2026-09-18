/* ============================================================
   PROJECT FILE SYSTEM
   One interface over two kinds of project: a real folder on the
   person's computer (File System Access API, Chromium) and a
   project that lives entirely in this browser (IndexedDB). The
   agent's tools, the explorer and the editor all go through here,
   so a write from any of them lands on disk and in the index at
   the same time.
   ============================================================ */

const DB_NAME = "mere-x-code";
const DB_VERSION = 1;

const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build", "out", ".next", ".nuxt", ".output", ".svelte-kit",
  "coverage", ".cache", ".parcel-cache", ".turbo", ".vercel", "__pycache__", ".venv", "venv", ".mypy_cache",
  ".pytest_cache", "target", ".idea", ".vscode", ".DS_Store", "vendor", ".gradle", "bin", "obj", ".terraform"
]);
const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "ico", "icns", "tif", "tiff", "psd", "ai",
  "woff", "woff2", "ttf", "otf", "eot", "pdf", "zip", "gz", "tgz", "bz2", "7z", "rar", "jar", "war",
  "mp3", "wav", "ogg", "flac", "m4a", "mp4", "mov", "avi", "mkv", "webm", "exe", "dll", "so", "dylib",
  "bin", "dat", "db", "sqlite", "sqlite3", "class", "pyc", "pyo", "wasm", "o", "a", "lib", "pdb", "lock"
]);
const MAX_INDEX_FILES = 20_000;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_SEARCH_BYTES = 600 * 1024;

export const supportsLocalFolders = typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";

/* ------------------------------------------------------------
   IndexedDB
   ------------------------------------------------------------ */
let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
      if (!db.objectStoreNames.contains("vfiles")) {
        const store = db.createObjectStore("vfiles", { keyPath: "key" });
        store.createIndex("project", "projectId", { unique: false });
      }
      if (!db.objectStoreNames.contains("changes")) {
        const store = db.createObjectStore("changes", { keyPath: "key" });
        store.createIndex("conversation", "conversationId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB is unavailable."));
  });
  return dbPromise;
}

function tx(db, store, mode, work) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const target = transaction.objectStore(store);
    let result;
    try {
      result = work(target);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(result && "result" in result ? result.result : result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Transaction aborted."));
  });
}

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const projectStore = {
  async get(id) {
    const db = await openDatabase();
    return tx(db, "projects", "readonly", (store) => store.get(id));
  },
  async put(record) {
    const db = await openDatabase();
    await tx(db, "projects", "readwrite", (store) => store.put(record));
  },
  async delete(id) {
    const db = await openDatabase();
    await tx(db, "projects", "readwrite", (store) => store.delete(id));
    const vdb = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = vdb.transaction("vfiles", "readwrite");
      const index = transaction.objectStore("vfiles").index("project");
      const cursor = index.openKeyCursor(IDBKeyRange.only(id));
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (!current) return;
        transaction.objectStore("vfiles").delete(current.primaryKey);
        current.continue();
      };
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }
};

export const changeStore = {
  async put(record) {
    const db = await openDatabase();
    await tx(db, "changes", "readwrite", (store) => store.put(record));
  },
  async get(key) {
    const db = await openDatabase();
    return tx(db, "changes", "readonly", (store) => store.get(key));
  },
  async forConversation(conversationId) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction("changes", "readonly").objectStore("changes").index("conversation").getAll(IDBKeyRange.only(conversationId));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
};

/* ------------------------------------------------------------
   Path helpers
   ------------------------------------------------------------ */
export function normalizePath(value) {
  const parts = [];
  for (const part of String(value || "").replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { parts.pop(); continue; }
    parts.push(part);
  }
  return parts.join("/");
}

export function extensionOf(path) {
  const name = String(path).split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function isBinaryPath(path) {
  return BINARY_EXTENSIONS.has(extensionOf(path));
}

function looksBinary(text) {
  const sample = text.slice(0, 4_000);
  let odd = 0;
  for (let index = 0; index < sample.length; index += 1) {
    const code = sample.charCodeAt(index);
    if (code === 0) return true;
    if (code < 9 || (code > 13 && code < 32)) odd += 1;
  }
  return odd > sample.length * 0.05;
}

/* A glob to a regular expression: ** spans folders, * stays inside one,
   ? is a single character, {a,b} is an alternation. */
export function globToRegExp(glob) {
  let source = "";
  const pattern = String(glob || "").replace(/\\/g, "/").replace(/^\.?\//, "");
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        index += 1;
        if (pattern[index + 1] === "/") { index += 1; source += "(?:.*/)?"; }
        else source += ".*";
      } else source += "[^/]*";
    } else if (char === "?") source += "[^/]";
    else if (char === "{") {
      const close = pattern.indexOf("}", index);
      if (close === -1) { source += "\\{"; continue; }
      source += `(?:${pattern.slice(index + 1, close).split(",").map((part) => part.replace(/[.+^$()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")).join("|")})`;
      index = close;
    } else if (/[.+^$()|[\]\\]/.test(char)) source += `\\${char}`;
    else source += char;
  }
  /* A pattern without a slash matches at any depth. */
  return new RegExp(pattern.includes("/") ? `^${source}$` : `(?:^|/)${source}$`, "i");
}

/* ------------------------------------------------------------
   The project
   ------------------------------------------------------------ */
export class ProjectFS {
  constructor({ id, name, kind, handle = null }) {
    this.id = id;
    this.name = name;
    this.kind = kind;
    this.handle = handle;
    /* path -> { path, name, size, mtime, dir: boolean } */
    this.entries = new Map();
    this.contents = new Map();
    this.truncated = false;
    this.listeners = new Set();
    this.indexed = false;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(change) {
    for (const fn of this.listeners) {
      try { fn(change); } catch { /* one listener must not break the others */ }
    }
  }

  /* ---- Indexing --------------------------------------------- */
  async index() {
    this.entries.clear();
    this.contents.clear();
    this.truncated = false;
    if (this.kind === "local") await this.walkLocal(this.handle, "");
    else await this.loadVirtual();
    this.indexed = true;
    this.emit({ type: "index" });
    return this;
  }

  async walkLocal(directory, prefix) {
    const pending = [];
    for await (const [name, entry] of directory.entries()) {
      if (this.entries.size >= MAX_INDEX_FILES) { this.truncated = true; return; }
      const path = prefix ? `${prefix}/${name}` : name;
      if (entry.kind === "directory") {
        if (IGNORED_DIRS.has(name)) continue;
        this.entries.set(path, { path, name, dir: true, handle: entry });
        pending.push(this.walkLocal(entry, path));
      } else {
        this.entries.set(path, { path, name, dir: false, handle: entry, size: 0, mtime: 0 });
      }
    }
    await Promise.all(pending);
  }

  async loadVirtual() {
    const db = await openDatabase();
    const rows = await new Promise((resolve, reject) => {
      const request = db.transaction("vfiles", "readonly").objectStore("vfiles").index("project").getAll(IDBKeyRange.only(this.id));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    for (const row of rows) {
      this.registerFile(row.path, row.content.length, row.mtime || 0);
      this.contents.set(row.path, row.content);
    }
  }

  registerFile(path, size = 0, mtime = 0) {
    const parts = path.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      const dir = parts.slice(0, index).join("/");
      if (!this.entries.has(dir)) this.entries.set(dir, { path: dir, name: parts[index - 1], dir: true });
    }
    this.entries.set(path, { path, name: parts[parts.length - 1], dir: false, size, mtime });
  }

  /* ---- Reading ---------------------------------------------- */
  has(path) {
    return this.entries.has(normalizePath(path));
  }

  isDirectory(path) {
    const entry = this.entries.get(normalizePath(path));
    return Boolean(entry && entry.dir);
  }

  fileCount() {
    let count = 0;
    for (const entry of this.entries.values()) if (!entry.dir) count += 1;
    return count;
  }

  children(path = "") {
    const base = normalizePath(path);
    const prefix = base ? `${base}/` : "";
    const out = [];
    for (const entry of this.entries.values()) {
      if (!entry.path.startsWith(prefix)) continue;
      const rest = entry.path.slice(prefix.length);
      if (!rest || rest.includes("/")) continue;
      out.push(entry);
    }
    return out.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }) : a.dir ? -1 : 1));
  }

  allFiles() {
    return [...this.entries.values()].filter((entry) => !entry.dir).map((entry) => entry.path).sort();
  }

  /* A compact tree for the model: folders first, capped, deepest levels
     summarised as counts once the budget is spent. */
  treeSummary({ maxEntries = 400 } = {}) {
    const lines = [];
    let remaining = maxEntries;
    const walk = (dir, depth) => {
      const kids = this.children(dir);
      for (const entry of kids) {
        if (remaining <= 0) return;
        remaining -= 1;
        lines.push(`${"  ".repeat(depth)}${entry.name}${entry.dir ? "/" : ""}`);
        if (entry.dir) {
          if (depth >= 3) {
            const count = this.countUnder(entry.path);
            if (count) { lines.push(`${"  ".repeat(depth + 1)}… ${count} files`); remaining -= 1; }
          } else walk(entry.path, depth + 1);
        }
      }
    };
    walk("", 0);
    if (remaining <= 0) lines.push(`… ${this.fileCount()} files in total; use list_files for the rest`);
    return lines.join("\n");
  }

  countUnder(dir) {
    const prefix = `${dir}/`;
    let count = 0;
    for (const entry of this.entries.values()) if (!entry.dir && entry.path.startsWith(prefix)) count += 1;
    return count;
  }

  async read(path) {
    const key = normalizePath(path);
    const entry = this.entries.get(key);
    if (!entry) throw new Error(`No such file: ${key}`);
    if (entry.dir) throw new Error(`${key} is a folder, not a file.`);
    if (this.contents.has(key)) return this.contents.get(key);
    if (isBinaryPath(key)) throw new Error(`${key} is a binary file.`);
    if (this.kind !== "local") return "";
    const file = await entry.handle.getFile();
    entry.size = file.size;
    entry.mtime = file.lastModified;
    if (file.size > MAX_TEXT_BYTES) throw new Error(`${key} is ${Math.round(file.size / 1024)} KB, too large to open here.`);
    const text = await file.text();
    if (looksBinary(text)) throw new Error(`${key} is a binary file.`);
    this.contents.set(key, text);
    return text;
  }

  async readBinary(path) {
    const key = normalizePath(path);
    const entry = this.entries.get(key);
    if (!entry || entry.dir) throw new Error(`No such file: ${key}`);
    if (this.kind === "local") return entry.handle.getFile();
    return new File([this.contents.get(key) || ""], entry.name);
  }

  /* Drop a cached copy so the next read comes from disk again. */
  forget(path) {
    this.contents.delete(normalizePath(path));
  }

  /* ---- Writing ---------------------------------------------- */
  async write(path, content) {
    const key = normalizePath(path);
    if (!key) throw new Error("A file path is required.");
    if (this.isDirectory(key)) throw new Error(`${key} is a folder.`);
    const existed = this.entries.has(key);
    if (this.kind === "local") {
      const handle = await this.localFileHandle(key, true);
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      const parts = key.split("/");
      for (let index = 1; index < parts.length; index += 1) {
        const dir = parts.slice(0, index).join("/");
        if (!this.entries.has(dir)) this.entries.set(dir, { path: dir, name: parts[index - 1], dir: true, handle: await this.localDirectoryHandle(dir, false) });
      }
      this.entries.set(key, { path: key, name: parts[parts.length - 1], dir: false, handle, size: content.length, mtime: Date.now() });
    } else {
      await this.putVirtual(key, content);
      this.registerFile(key, content.length, Date.now());
    }
    this.contents.set(key, content);
    this.emit({ type: existed ? "change" : "create", path: key });
    return { path: key, created: !existed };
  }

  async delete(path) {
    const key = normalizePath(path);
    const entry = this.entries.get(key);
    if (!entry) throw new Error(`No such file: ${key}`);
    if (entry.dir) {
      const prefix = `${key}/`;
      const inside = [...this.entries.keys()].filter((candidate) => candidate.startsWith(prefix));
      if (this.kind === "local") {
        const parent = await this.localDirectoryHandle(key.split("/").slice(0, -1).join("/"), false);
        await parent.removeEntry(entry.name, { recursive: true });
      } else {
        for (const candidate of inside) if (!this.entries.get(candidate).dir) await this.deleteVirtual(candidate);
      }
      for (const candidate of inside) { this.entries.delete(candidate); this.contents.delete(candidate); }
      this.entries.delete(key);
    } else {
      if (this.kind === "local") {
        const parent = await this.localDirectoryHandle(key.split("/").slice(0, -1).join("/"), false);
        await parent.removeEntry(entry.name);
      } else await this.deleteVirtual(key);
      this.entries.delete(key);
      this.contents.delete(key);
    }
    this.emit({ type: "delete", path: key });
  }

  async move(from, to) {
    const source = normalizePath(from);
    const target = normalizePath(to);
    if (!this.entries.has(source)) throw new Error(`No such file: ${source}`);
    if (this.isDirectory(source)) throw new Error("Moving folders is not supported; move the files inside it.");
    if (this.entries.has(target)) throw new Error(`${target} already exists.`);
    const content = await this.read(source);
    await this.write(target, content);
    await this.delete(source);
    this.emit({ type: "move", path: target, from: source });
  }

  async createFolder(path) {
    const key = normalizePath(path);
    if (!key || this.entries.has(key)) return;
    if (this.kind === "local") {
      const handle = await this.localDirectoryHandle(key, true);
      this.entries.set(key, { path: key, name: key.split("/").pop(), dir: true, handle });
    } else {
      this.entries.set(key, { path: key, name: key.split("/").pop(), dir: true });
    }
    this.emit({ type: "create", path: key });
  }

  async localDirectoryHandle(dir, create) {
    let current = this.handle;
    if (!dir) return current;
    for (const part of dir.split("/")) current = await current.getDirectoryHandle(part, { create });
    return current;
  }

  async localFileHandle(path, create) {
    const parts = path.split("/");
    const name = parts.pop();
    const directory = await this.localDirectoryHandle(parts.join("/"), create);
    return directory.getFileHandle(name, { create });
  }

  async putVirtual(path, content) {
    const db = await openDatabase();
    await tx(db, "vfiles", "readwrite", (store) => store.put({ key: `${this.id}:${path}`, projectId: this.id, path, content, mtime: Date.now() }));
  }

  async deleteVirtual(path) {
    const db = await openDatabase();
    await tx(db, "vfiles", "readwrite", (store) => store.delete(`${this.id}:${path}`));
  }

  /* ---- Search ----------------------------------------------- */
  findFiles(pattern, { max = 100 } = {}) {
    const files = this.allFiles();
    const raw = String(pattern || "").trim();
    if (!raw) return files.slice(0, max);
    const isGlob = /[*?{[]/.test(raw);
    if (isGlob) {
      const regex = globToRegExp(raw);
      return files.filter((path) => regex.test(path)).slice(0, max);
    }
    const needle = raw.toLowerCase();
    const scored = [];
    for (const path of files) {
      const lower = path.toLowerCase();
      const name = lower.split("/").pop();
      let score = 0;
      if (name === needle) score = 100;
      else if (name.startsWith(needle)) score = 80;
      else if (name.includes(needle)) score = 60;
      else if (lower.includes(needle)) score = 40;
      else if (fuzzyMatch(needle, lower)) score = 15;
      if (score) scored.push({ path, score });
    }
    return scored.sort((a, b) => b.score - a.score || a.path.length - b.path.length).map((item) => item.path).slice(0, max);
  }

  async search(query, { path = "", glob = "", regex = false, caseSensitive = false, max = 80, onProgress } = {}) {
    const raw = String(query || "");
    if (!raw) return { matches: [], files: 0, truncated: false };
    let matcher;
    try {
      matcher = regex
        ? new RegExp(raw, caseSensitive ? "g" : "gi")
        : new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), caseSensitive ? "g" : "gi");
    } catch (error) {
      throw new Error(`Invalid regular expression: ${error.message}`);
    }
    const base = normalizePath(path);
    const prefix = base ? `${base}/` : "";
    const globRegex = glob ? globToRegExp(glob) : null;
    const matches = [];
    let files = 0;
    let truncated = false;
    const candidates = this.allFiles().filter((file) => file.startsWith(prefix) && (!globRegex || globRegex.test(file)) && !isBinaryPath(file));
    for (const file of candidates) {
      if (matches.length >= max) { truncated = true; break; }
      let text;
      try {
        text = await this.read(file);
      } catch {
        continue;
      }
      if (text.length > MAX_SEARCH_BYTES) continue;
      files += 1;
      onProgress?.(files, candidates.length);
      matcher.lastIndex = 0;
      if (!matcher.test(text)) continue;
      const lines = text.split("\n");
      for (let index = 0; index < lines.length; index += 1) {
        matcher.lastIndex = 0;
        if (!matcher.test(lines[index])) continue;
        matches.push({ path: file, line: index + 1, text: lines[index].slice(0, 300) });
        if (matches.length >= max) { truncated = true; break; }
      }
    }
    return { matches, files, truncated };
  }
}

function fuzzyMatch(needle, haystack) {
  let position = 0;
  for (const char of needle) {
    position = haystack.indexOf(char, position);
    if (position === -1) return false;
    position += 1;
  }
  return true;
}

/* ------------------------------------------------------------
   Opening projects
   ------------------------------------------------------------ */
function makeId() {
  return `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function openLocalFolder() {
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  const id = makeId();
  await projectStore.put({ id, name: handle.name, kind: "local", handle, createdAt: Date.now() });
  return new ProjectFS({ id, name: handle.name, kind: "local", handle });
}

export async function createVirtualProject(name, files = {}) {
  const id = makeId();
  await projectStore.put({ id, name, kind: "virtual", createdAt: Date.now() });
  const project = new ProjectFS({ id, name, kind: "virtual" });
  for (const [path, content] of Object.entries(files)) await project.putVirtual(normalizePath(path), content);
  return project;
}

/* Files dropped on the window: folders arrive as entries, so the tree is
   walked and copied into a browser project. */
export async function projectFromDrop(dataTransfer) {
  const items = [...(dataTransfer.items || [])];
  const files = {};
  let rootName = "Dropped project";
  const readEntry = (entry, prefix) => new Promise((resolve) => {
    if (entry.isFile) {
      entry.file(async (file) => {
        const path = prefix ? `${prefix}/${file.name}` : file.name;
        if (!isBinaryPath(path) && file.size <= MAX_TEXT_BYTES) {
          const text = await file.text();
          if (!looksBinary(text)) files[path] = text;
        }
        resolve();
      }, () => resolve());
    } else if (entry.isDirectory) {
      if (IGNORED_DIRS.has(entry.name)) return resolve();
      const reader = entry.createReader();
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const readBatch = () => reader.readEntries(async (batch) => {
        if (!batch.length) return resolve();
        for (const child of batch) await readEntry(child, path);
        readBatch();
      }, () => resolve());
      readBatch();
    } else resolve();
  });
  const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
  if (entries.length === 1 && entries[0].isDirectory) {
    rootName = entries[0].name;
    const reader = entries[0].createReader();
    await new Promise((resolve) => {
      const readBatch = () => reader.readEntries(async (batch) => {
        if (!batch.length) return resolve();
        for (const child of batch) await readEntry(child, "");
        readBatch();
      }, () => resolve());
      readBatch();
    });
  } else {
    for (const entry of entries) await readEntry(entry, "");
  }
  if (!Object.keys(files).length) throw new Error("Nothing readable was dropped. Drop a folder of text files.");
  return createVirtualProject(rootName, files);
}

/* Reopen a stored project. A local folder needs its permission renewed
   after a reload, which the browser only allows from a user gesture. */
export async function reopenProject(id, { request = false } = {}) {
  const record = await projectStore.get(id);
  if (!record) return { status: "missing" };
  if (record.kind === "virtual") return { status: "ready", project: new ProjectFS({ id: record.id, name: record.name, kind: "virtual" }) };
  const handle = record.handle;
  if (!handle) return { status: "missing" };
  let permission = await handle.queryPermission({ mode: "readwrite" });
  if (permission !== "granted" && request) permission = await handle.requestPermission({ mode: "readwrite" });
  if (permission !== "granted") return { status: "permission", name: record.name };
  return { status: "ready", project: new ProjectFS({ id: record.id, name: record.name, kind: "local", handle }) };
}

export async function forgetProject(id) {
  await projectStore.delete(id);
}
