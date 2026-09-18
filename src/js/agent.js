/* ============================================================
   AGENT RUN LOOP
   A turn is: send the exchange, stream the round, run whatever
   tools the model asked for here in the browser, send everything
   back, repeat until the model answers in prose. The loop owns the
   Responses items for each thread so the model keeps its
   reasoning between rounds inside a session.
   ============================================================ */

import { streamAgentRound, AssistantError } from "./assistant.js";
import { ChangeTracker, createToolRunner } from "./agent-tools.js";

const READ_ONLY = new Set(["list_files", "read_file", "search_files", "find_files", "run_javascript", "update_plan", "delegate", "save_memory", "read_preview_console"]);
const MAX_ROUNDS_DEFAULT = 40;
const OUTPUT_KEEP = 2_400;
const ARGS_KEEP = 1_600;

const sessionItems = new Map();

export function itemsFor(conversationId) {
  return sessionItems.get(conversationId) || null;
}

export function forgetItems(conversationId) {
  sessionItems.delete(conversationId);
}

/* A thread reopened after a reload has only its prose; the model gets the
   exchange back as plain messages. */
export function rebuildItems(conversation) {
  const items = [];
  for (const message of conversation.messages || []) {
    if (message.role === "user") {
      const content = [{ type: "input_text", text: message.text || "" }];
      for (const file of message.attachments || []) {
        if (!file?.remote || !file.id) continue;
        if (String(file.type || "").startsWith("image/")) content.push({ type: "input_image", file_id: file.id });
        else content.push({ type: "input_file", file_id: file.id });
      }
      items.push({ type: "message", role: "user", content });
    } else if (message.role === "assistant") {
      const summary = summarizeParts(message.parts || []);
      const text = (message.text || "").trim();
      if (text || summary) items.push({ type: "message", role: "assistant", content: [{ type: "output_text", text: summary ? `${summary}\n\n${text}` : text }] });
    }
  }
  sessionItems.set(conversation.id, items);
  return items;
}

function summarizeParts(parts) {
  const calls = parts.filter((part) => part.type === "call");
  if (!calls.length) return "";
  const lines = calls.slice(0, 40).map((part) => `- ${part.name} ${describeArgs(part.name, part.args)}${part.status === "error" ? " (failed)" : ""}`);
  return `(Earlier in this thread I used these tools:\n${lines.join("\n")})`;
}

export function describeArgs(name, args = {}) {
  if (!args || typeof args !== "object") return "";
  if (args.path) return args.path;
  if (name === "search_files") return JSON.stringify(args.query || "");
  if (name === "find_files") return JSON.stringify(args.pattern || "");
  if (name === "move_file") return `${args.from} → ${args.to}`;
  if (name === "run_javascript") return `${String(args.code || "").split("\n").length} lines`;
  if (name === "update_plan") return `${(args.steps || []).length} steps`;
  if (name === "delegate") return String(args.task || "").slice(0, 90);
  if (name === "save_memory") return String(args.note || "").slice(0, 90);
  if (name === "read_url") return String(args.url || "").replace(/^https?:\/\//, "").slice(0, 90);
  if (name === "list_files") return args.path || ".";
  if (name === "run_command") return String(args.command || "").slice(0, 120);
  if (name === "git_log") return `${args.count || 15} commits`;
  if (name === "git_diff") return args.staged ? "staged" : "working tree";
  return "";
}

function safeParse(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return null;
  }
}

function keep(text, limit) {
  const value = String(text ?? "");
  return value.length > limit ? `${value.slice(0, limit)}\n…` : value;
}

/**
 * Run one turn. `emit(event)` receives:
 *   status {label, detail} · thought {delta} · text {delta}
 *   call {part} · call-done {part} · plan {steps} · round {n}
 */
export async function runTurn({
  conversation,
  userItem,
  fs,
  context,
  signal,
  emit,
  maxRounds = MAX_ROUNDS_DEFAULT,
  confirmDelete,
  delegate,
  onMemory,
  previewConsole,
  extraTools
}) {
  const items = sessionItems.get(conversation.id) || rebuildItems(conversation);
  if (userItem) items.push(userItem);
  const tracker = new ChangeTracker();
  const parts = [];
  let plan = null;
  const run = createToolRunner({
    fs,
    tracker,
    onPlan: (steps) => { plan = steps; emit({ type: "plan", steps }); },
    confirmDelete,
    delegate,
    onMemory,
    previewConsole,
    extra: extraTools
  });

  let text = "";
  let thought = "";
  let usage = { input: 0, output: 0 };
  let rounds = 0;
  let stopped = "";
  let pendingCalls = new Map();

  const closeThought = () => {
    const last = parts[parts.length - 1];
    if (last && last.type === "thought" && !last.ms) last.ms = Date.now() - (last.startedAt || Date.now());
  };
  const currentTextPart = () => {
    const last = parts[parts.length - 1];
    if (last && last.type === "text") return last;
    closeThought();
    const part = { type: "text", text: "" };
    parts.push(part);
    return part;
  };
  const currentThoughtPart = () => {
    const last = parts[parts.length - 1];
    if (last && last.type === "thought") return last;
    const part = { type: "thought", text: "", startedAt: Date.now() };
    parts.push(part);
    return part;
  };

  while (rounds < maxRounds) {
    rounds += 1;
    emit({ type: "round", n: rounds });
    pendingCalls = new Map();

    const result = await streamAgentRound({
      items,
      context,
      signal,
      onEvent: (event) => {
        if (event.type === "status") emit({ type: "status", label: event.label, detail: event.detail, stage: event.stage });
        else if (event.type === "thought" && event.delta) {
          const last = parts[parts.length - 1];
          /* Summary part boundaries arrive as blank lines; they only matter
             once there is a summary to separate. */
          if (!event.delta.trim() && !(last && last.type === "thought" && last.text.trim())) return;
          const part = currentThoughtPart();
          part.text += event.delta;
          thought += event.delta;
          emit({ type: "thought", delta: event.delta, part });
        } else if (event.type === "delta" && typeof event.delta === "string") {
          const part = currentTextPart();
          part.text += event.delta;
          text += event.delta;
          emit({ type: "text", delta: event.delta, part });
        } else if (event.type === "call_start") {
          closeThought();
          const part = { type: "call", name: event.name, callId: event.call_id, args: null, argsText: "", output: "", status: "running", startedAt: Date.now() };
          parts.push(part);
          pendingCalls.set(event.call_id || `${event.name}:${parts.length}`, part);
          emit({ type: "call", part });
        } else if (event.type === "incomplete") {
          stopped = event.reason || "incomplete";
        }
      }
    });

    for (const item of result.output) {
      if (item.type === "reasoning" && Array.isArray(item.summary) && item.summary.length && !thought) {
        /* Summaries that arrived whole rather than streamed. */
        const summary = item.summary.map((part) => part.text || "").join("\n\n");
        if (summary) { const part = currentThoughtPart(); part.text += summary; thought += summary; emit({ type: "thought", delta: summary, part }); }
      }
    }
    items.push(...result.output);
    if (result.usage) {
      usage.input += Number(result.usage.input_tokens || 0);
      usage.output += Number(result.usage.output_tokens || 0);
    }

    const calls = result.output.filter((item) => item.type === "function_call");
    /* Plugin calls were answered by the server and echoed as items already. */
    const answered = new Set(result.output.filter((item) => item.type === "function_call_output").map((item) => item.call_id));
    const mine = calls.filter((call) => !answered.has(call.call_id));
    if (!mine.length) break;

    /* Reads can run together; writes go one at a time and in order. */
    const outputs = new Map();
    const runCall = async (call) => {
      if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
      const part = pendingCalls.get(call.call_id) || findPart(parts, call);
      const args = safeParse(call.arguments);
      if (part) { part.args = args; part.callId = call.call_id; }
      let output;
      if (!args) output = `${call.name} received invalid JSON arguments. Send a valid JSON object.`;
      else output = await run(call.name, args);
      if (part) {
        part.output = keep(output, OUTPUT_KEEP);
        part.status = /^(No such|.* failed:|old_string was not found|old_string matches|The person declined)/.test(output) ? "error" : "done";
        part.ms = Date.now() - (part.startedAt || Date.now());
        if (call.name === "edit_file" || call.name === "write_file" || call.name === "delete_file" || call.name === "move_file") part.changes = tracker.summary();
        emit({ type: "call-done", part });
      }
      outputs.set(call.call_id, output);
    };
    let batch = [];
    for (const call of mine) {
      if (READ_ONLY.has(call.name)) { batch.push(call); continue; }
      if (batch.length) { await Promise.all(batch.map(runCall)); batch = []; }
      await runCall(call);
    }
    if (batch.length) await Promise.all(batch.map(runCall));
    for (const call of mine) items.push({ type: "function_call_output", call_id: call.call_id, output: outputs.get(call.call_id) ?? "" });
    if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
  }

  if (rounds >= maxRounds) stopped = "budget";
  closeThought();
  sessionItems.set(conversation.id, items);

  return {
    text,
    thought,
    parts: parts.map((part) => part.type === "call"
      ? { ...part, argsText: undefined, args: compactArgs(part.args), output: keep(part.output, OUTPUT_KEEP) }
      : part),
    plan,
    changes: tracker.summary(),
    entries: tracker.entries(),
    usage,
    rounds,
    stopped
  };
}

function findPart(parts, call) {
  return [...parts].reverse().find((part) => part.type === "call" && part.name === call.name && part.status === "running" && !part.args) || null;
}

function compactArgs(args) {
  if (!args || typeof args !== "object") return args;
  const out = {};
  for (const [key, value] of Object.entries(args)) {
    out[key] = typeof value === "string" ? keep(value, ARGS_KEEP) : value;
  }
  return out;
}

export { AssistantError };
