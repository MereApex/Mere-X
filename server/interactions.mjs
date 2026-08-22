const endpoint = 'https://generativelanguage.googleapis.com/v1beta/interactions'

function headers(apiKey) {
  return { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }
}

// A stalled upstream call must not hold a request open indefinitely, and a
// visitor who navigates away must not keep paid work running. Both are handled
// by combining the caller's signal with a hard ceiling.
function requestSignal(signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs)
  if (!signal) return timeout
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal
}

function publicApiError(status, body) {
  const error = new Error(body?.error?.message || body?.message || `Interaction failed with status ${status}.`)
  error.status = status
  return error
}

export function interactionInput(messages = []) {
  const recent = messages.filter(message => String(message?.content || '').trim()).slice(-24)
  if (recent.length <= 1) return String(recent.at(-1)?.content || '')
  const history = recent.slice(0, -1).map(message => `${message.role === 'assistant' ? 'Mere Apex 4.0' : 'User'}: ${String(message.content).slice(0, 100_000)}`).join('\n\n')
  return `Continue this conversation faithfully.\n\n${history}\n\nUser: ${String(recent.at(-1)?.content || '')}`
}

export async function streamInteraction({ apiKey, model, input, previousInteractionId, systemInstruction, tools = [], thinkingLevel = 'medium', signal, timeoutMs = 5 * 60 * 1000, onEvent }) {
  const payload = {
    model,
    input,
    stream: true,
    store: true,
    system_instruction: systemInstruction,
    generation_config: { thinking_level: thinkingLevel },
    ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
    ...(tools.length ? { tools } : {}),
  }
  const response = await fetch(`${endpoint}?alt=sse`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify(payload), signal: requestSignal(signal, timeoutMs) })
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}))
    throw publicApiError(response.status, body)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const parseBlock = (block) => {
    const data = block.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n')
    if (!data || data === '[DONE]') return
    try { onEvent(JSON.parse(data)) } catch { /* Ignore incomplete diagnostic events. */ }
  }
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() || ''
    blocks.forEach(parseBlock)
    if (done) break
  }
  if (buffer.trim()) parseBlock(buffer)
}

export function collectInteraction(result) {
  let text = ''
  const sources = new Map()
  const files = []
  for (const step of result?.steps || []) {
    if (step.type !== 'model_output') continue
    for (const content of step.content || []) {
      if (content.type === 'text' && content.text) text += content.text
      for (const annotation of content.annotations || []) {
        const uri = annotation.url || annotation.uri || annotation.document_uri
        if (uri && !sources.has(uri)) sources.set(uri, { title: annotation.title || annotation.file_name || 'Source', uri })
      }
      if (content.type === 'file' && (content.uri || content.data)) files.push(content)
    }
  }
  return { id: result?.id, status: result?.status, text, sources: [...sources.values()], files, usage: result?.usage }
}

export async function createInteraction({ apiKey, model, agent, input, previousInteractionId, systemInstruction, tools, thinkingLevel = 'medium', environment, background = false, agentConfig, signal, timeoutMs = 90 * 1000 }) {
  const payload = {
    ...(agent ? { agent } : { model }),
    input,
    store: true,
    background,
    ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
    ...(systemInstruction ? { system_instruction: systemInstruction } : {}),
    ...(tools?.length ? { tools } : {}),
    ...(model ? { generation_config: { thinking_level: thinkingLevel } } : {}),
    ...(environment ? { environment } : {}),
    ...(agentConfig ? { agent_config: agentConfig } : {}),
  }
  const response = await fetch(endpoint, { method: 'POST', headers: headers(apiKey), body: JSON.stringify(payload), signal: requestSignal(signal, timeoutMs) })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw publicApiError(response.status, body)
  return body
}

export async function getInteraction({ apiKey, id, signal, timeoutMs = 30 * 1000 }) {
  const response = await fetch(`${endpoint}/${encodeURIComponent(id)}`, { headers: headers(apiKey), signal: requestSignal(signal, timeoutMs) })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw publicApiError(response.status, body)
  return body
}

