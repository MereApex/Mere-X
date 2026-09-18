// The single browser-side seam to Mere X's private server-side AI gateway.
// Permanent service credentials never cross this boundary or reach the browser.

import { apiFetch } from "./api-config.js";

export class AssistantError extends Error {
  constructor(message, { retryable = true, code = "assistant_error" } = {}) {
    super(message);
    this.name = "AssistantError";
    this.retryable = retryable;
    this.code = code;
  }
}

async function errorFromResponse(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const code = payload?.error?.code || `http_${response.status}`;
  const message = payload?.error?.message || `Mere X's AI service is unavailable (${response.status}).`;
  return new AssistantError(message, { retryable: response.status >= 500 || response.status === 429, code });
}

function parseLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    throw new AssistantError("The model stream returned an unreadable event.", { code: "invalid_stream" });
  }
}

/**
 * One model round: the whole exchange goes up as Responses items and the
 * server streams back text, thoughts, tool calls and every completed item.
 * Resolves with the completed output items and whether tools are pending.
 */
export async function streamAgentRound({ items, context, signal, onEvent }) {
  if (!items.length) throw new AssistantError("There is nothing to work on yet.", { retryable: false });

  let response;
  try {
    response = await apiFetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
      body: JSON.stringify({ items, context }),
      signal
    });
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
    throw new AssistantError("Mere X's AI server is unavailable. Make sure the server is running.", { code: "network_error" });
  }

  if (!response.ok) throw await errorFromResponse(response);
  if (!response.body) throw new AssistantError("The model returned no response stream.", { code: "empty_stream" });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const output = [];
  let done = null;

  const handle = (event) => {
    onEvent?.(event);
    if (event.type === "item" && event.item) output.push(event.item);
    if (event.type === "done") done = event;
    if (event.type === "error") {
      throw new AssistantError(event.error?.message || "Mere X could not complete the response.", {
        code: event.error?.code || "ai_error",
        retryable: event.error?.code !== "content_blocked"
      });
    }
  };

  try {
    while (true) {
      const { done: finished, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !finished });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        handle(parseLine(line));
      }
      if (finished) break;
    }
    if (buffer.trim()) handle(parseLine(buffer));
  } finally {
    reader.releaseLock();
  }

  if (!done) throw new AssistantError("The connection closed before the model finished.", { code: "stream_closed" });
  return { output, pending: Number(done.pending || 0), usage: done.usage || null, model: done.model || "" };
}
