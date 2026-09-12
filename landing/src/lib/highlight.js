/* ============================================================
   HIGHLIGHT — a small single-pass tokenizer for the four
   languages the docs actually show: bash, json, python, js/ts.

   One master regex with ordered alternation, so a match can
   never be re-scanned by a later rule. Output is escaped as it
   is emitted, which keeps source text inert.
   ============================================================ */

const esc = (s) => s
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const KEYWORDS = {
  js: new Set(["const", "let", "var", "function", "return", "await", "async", "import", "from", "export", "default", "new", "if", "else", "for", "of", "in", "while", "try", "catch", "finally", "class", "extends", "throw", "typeof", "instanceof", "null", "undefined", "true", "false", "this", "yield", "interface", "type"]),
  python: new Set(["import", "from", "def", "class", "return", "await", "async", "if", "elif", "else", "for", "in", "while", "try", "except", "finally", "with", "as", "not", "and", "or", "is", "None", "True", "False", "lambda", "raise", "yield", "pass", "print"]),
  bash: new Set(["curl", "export", "echo", "cat", "npm", "pip", "npx", "uv", "set", "cd", "sudo", "source", "bash", "sh", "go", "gem", "brew"]),
  json: new Set(["true", "false", "null"])
};

const VARS = new Set(["client", "mere-x", "mere-x", "response", "stream", "message", "res", "self", "runner", "batch", "vectors", "check"]);

/* Ordered alternation. Group order defines precedence. */
const PATTERN = new RegExp(
  [
    "(#[^\\n]*|//[^\\n]*|/\\*[\\s\\S]*?\\*/)",           // 1 comment
    '("""[\\s\\S]*?"""|`(?:[^`\\\\]|\\\\.)*`|"(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\')', // 2 string
    "(\\b\\d[\\d_]*\\.?\\d*(?:[eE][+-]?\\d+)?\\b)",      // 3 number
    "(\\$[A-Za-z_][\\w]*|\\$\\{[^}]*\\})",                // 4 shell variable
    "(^|\\s)(--?[A-Za-z][\\w-]*)",                        // 5+6 cli flag
    "([A-Za-z_$][\\w$]*)(?=\\s*\\()",                     // 7 call
    "([A-Za-z_$][\\w$]*)"                                 // 8 word
  ].join("|"),
  "gm"
);

const normalise = (language) => {
  const l = String(language || "").toLowerCase();
  if (["ts", "typescript", "javascript", "js", "jsx", "tsx"].includes(l)) return "js";
  if (["py", "python"].includes(l)) return "python";
  if (["bash", "sh", "shell", "curl", "console"].includes(l)) return "bash";
  if (l === "json") return "json";
  return "js";
};

export function highlight(code, language = "js") {
  const lang = normalise(language);
  const keywords = KEYWORDS[lang] || KEYWORDS.js;
  const source = String(code);
  let out = "";
  let last = 0;

  for (const match of source.matchAll(PATTERN)) {
    const [full, comment, string, number, shellVar, flagLead, flag, call, word] = match;
    const start = match.index;
    out += esc(source.slice(last, start));
    last = start + full.length;

    if (comment) {
      out += `<span class="tok-com">${esc(comment)}</span>`;
    } else if (string) {
      // In JSON a string immediately followed by a colon is a key.
      const rest = source.slice(last);
      const isKey = lang === "json" && /^\s*:/.test(rest);
      out += `<span class="${isKey ? "tok-key" : "tok-str"}">${esc(string)}</span>`;
    } else if (number) {
      out += `<span class="tok-num">${esc(number)}</span>`;
    } else if (shellVar) {
      out += `<span class="tok-var">${esc(shellVar)}</span>`;
    } else if (flag) {
      out += `${esc(flagLead || "")}<span class="tok-op">${esc(flag)}</span>`;
    } else if (call) {
      out += keywords.has(call)
        ? `<span class="tok-kw">${esc(call)}</span>`
        : `<span class="tok-fn">${esc(call)}</span>`;
    } else if (word) {
      if (keywords.has(word)) out += `<span class="tok-kw">${esc(word)}</span>`;
      else if (VARS.has(word)) out += `<span class="tok-var">${esc(word)}</span>`;
      else out += esc(word);
    } else {
      out += esc(full);
    }
  }

  out += esc(source.slice(last));
  return out;
}
