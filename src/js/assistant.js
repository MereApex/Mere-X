// The single browser-side seam to Mere X's private server-side AI gateway.
// Permanent service credentials never cross this boundary or reach the browser.

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
 * Streams a Mere X reply from the same-origin backend as newline-delimited JSON.
 * @param {object} request
 * @param {{role: string, text: string, attachments?: object[]}[]} request.messages
 * @param {object} request.context
 * @param {AbortSignal} request.signal
 * @param {(event: object) => void} [request.onEvent]
 * @yields {string} the next text delta
 */
export async function* streamAssistantReply({ messages, context, signal, onEvent }) {
  if (!messages.length) throw new AssistantError("There is nothing to answer yet.", { retryable: false });

  let response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
      body: JSON.stringify({ messages, context }),
      signal
    });
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
    throw new AssistantError("Mere X's AI server is unavailable. Make sure `npm run dev` is running.", { code: "network_error" });
  }

  if (!response.ok) throw await errorFromResponse(response);
  if (!response.body) throw new AssistantError("The model returned no response stream.", { code: "empty_stream" });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = parseLine(line);
        onEvent?.(event);
        if (event.type === "delta" && typeof event.delta === "string") yield event.delta;
        if (event.type === "error") {
          throw new AssistantError(event.error?.message || "Mere X could not complete the response.", {
            code: event.error?.code || "ai_error",
            retryable: event.error?.code !== "content_blocked"
          });
        }
      }

      if (done) break;
    }

    if (buffer.trim()) {
      const event = parseLine(buffer);
      onEvent?.(event);
      if (event.type === "delta" && typeof event.delta === "string") yield event.delta;
      if (event.type === "error") throw new AssistantError(event.error?.message || "Mere X could not complete the response.", { code: event.error?.code || "ai_error" });
    }
  } finally {
    reader.releaseLock();
  }
}
