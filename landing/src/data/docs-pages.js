/* ============================================================
   DOCS PAGES — block content for every documentation page.

   Block types:
     p        text (inline HTML allowed)
     h2 / h3  headings (auto-linked into the table of contents)
     ul / ol  lists of strings
     code     { samples: { Lang: source }, caption? }
     callout  { text, variant?, icon? }
     table    { columns: [{key,label,align?}], rows: [...] }
     cards    [{ icon, title, body, href? }]
     steps    [{ title, body }]
     params   [{ name, type, required?, desc }]
   ============================================================ */

import { SAMPLES, ERROR_CODES, RATE_TIERS, SDK_LIST } from "./docs.js";
import { MODELS, CHAT_MODELS, MODES } from "./models.js";

export const DOC_PAGES = {
  /* ------------------------------------------------------ */
  "": {
    title: "Introduction",
    lead: "Mere X is a family of models with one distinguishing idea: you control how long the model thinks. Everything else in these docs follows from that.",
    blocks: [
      { t: "p", v: "The Mere X API has one primary endpoint — <code class=\"inline\">/v1/messages</code> — that handles chat, agents, vision, tool use, and structured output. Specialised endpoints exist for batch processing, embeddings, images, audio, and safety classification, but you can build a great deal without ever leaving Messages." },
      { t: "h2", v: "Start here" },
      { t: "cards", v: [
        { icon: "rocket", title: "Quickstart", body: "Install a client, set a key, send a message. Two minutes.", href: "/docs/quickstart" },
        { icon: "message", title: "Messages", body: "The request shape, content blocks, and stop reasons.", href: "/docs/messages" },
        { icon: "atom", title: "Reasoning budgets", body: "The control that defines the family.", href: "/docs/reasoning" },
        { icon: "plug", title: "Tool use", body: "Let the model call your functions.", href: "/docs/tools" }
      ]},
      { t: "h2", v: "The mental model" },
      { t: "p", v: "Three things determine what a request costs and how good the answer is:" },
      { t: "ol", v: [
        "<strong>The model</strong> sets the capability ceiling. Apex is the frontier; Orion is the workhorse; Nyx is the fast one.",
        "<strong>The mode</strong> sets how long it deliberates. Fast answers immediately; DEEP can think for minutes.",
        "<strong>The context</strong> sets what it knows. Up to a million tokens, and cached prefixes cost a tenth to re-read."
      ]},
      { t: "p", v: "The most common mistake is reaching for a bigger model when the right answer is a bigger budget. Orion in High mode routinely beats Apex in Fast mode, at roughly a quarter of the price." },
      { t: "h2", v: "Your first request" },
      { t: "code", v: { samples: SAMPLES.firstCall, caption: "Every SDK ships the same shape: messages in, content blocks out." } },
      { t: "h2", v: "What to read next" },
      { t: "p", v: "If you are building a product, read <a href=\"/docs/messages\">Messages</a>, then <a href=\"/docs/streaming\">Streaming</a>, then <a href=\"/docs/tools\">Tool use</a>. If you are processing data at volume, go straight to <a href=\"/docs/batch\">Batch</a>. If you are building an agent, read <a href=\"/docs/agents\">Building agents</a> — it will save you a fortnight." },
      { t: "callout", v: { text: "Mere X and Mere X are a design build. The API described here is illustrative; the patterns and the reasoning behind them are real.", icon: "info" } }
    ]
  },

  /* ------------------------------------------------------ */
  quickstart: {
    title: "Quickstart",
    lead: "From nothing to a working request in about two minutes.",
    blocks: [
      { t: "h2", v: "1. Get an API key" },
      { t: "p", v: "Create one in the <a href=\"/console/keys\">console</a>. Scope it to what the service actually needs — a key that only creates messages cannot delete your files. New organisations get $10 of credit, no card required." },
      { t: "callout", v: { text: "The full key is shown once, at creation. Store it in a secret manager; never commit it, and never ship it in client-side code.", variant: "warning", icon: "lock" } },
      { t: "h2", v: "2. Install a client" },
      { t: "code", v: { samples: {
        Python: "pip install mere-x",
        TypeScript: "npm install @mere-x/sdk",
        Go: "go get github.com/mere-x/mere-x-go",
        Shell: "npm install -g @mere-x/cli"
      } } },
      { t: "h2", v: "3. Set the environment variable" },
      { t: "code", v: { samples: {
        Shell: 'export MERE_X_API_KEY="merex-live-..."',
        PowerShell: '$env:MERE_X_API_KEY = "merex-live-..."'
      }, caption: "Every SDK reads this automatically." } },
      { t: "h2", v: "4. Send a message" },
      { t: "code", v: { samples: SAMPLES.firstCall } },
      { t: "h2", v: "5. Add a reasoning budget" },
      { t: "p", v: "The single highest-leverage change you can make. Set a thinking budget and the model plans before it answers." },
      { t: "code", v: { samples: SAMPLES.streaming, caption: "Streaming with an 8,000-token thinking budget." } },
      { t: "h2", v: "Where to go next" },
      { t: "cards", v: [
        { icon: "message", title: "Messages", body: "Content blocks, roles, and stop reasons.", href: "/docs/messages" },
        { icon: "plug", title: "Tool use", body: "Let the model call your functions.", href: "/docs/tools" },
        { icon: "stack", title: "Structured output", body: "Guaranteed-valid JSON against your schema.", href: "/docs/structured-output" },
        { icon: "package", title: "Batch", body: "Half price for anything nobody is waiting on.", href: "/docs/batch" }
      ]}
    ]
  },

  /* ------------------------------------------------------ */
  authentication: {
    title: "Authentication",
    lead: "API keys, scopes, rotation, and the mistakes that cause incidents.",
    blocks: [
      { t: "h2", v: "How requests are authenticated" },
      { t: "p", v: "Send your key in the <code class=\"inline\">x-api-key</code> header. There is no OAuth flow for server-to-server use and no token exchange — the key is the credential." },
      { t: "code", v: { samples: {
        cURL: `curl https://api.merex.ai/v1/messages \\
  -H "x-api-key: $MERE_X_API_KEY" \\
  -H "mere-x-version: 2026-06-18" \\
  -H "content-type: application/json" \\
  -d '{"model":"mere-orion-5-5","max_tokens":256,
       "messages":[{"role":"user","content":"hello"}]}'`,
        Python: `from mere_x import MereX

# Reads MERE_X_API_KEY from the environment.
client = MereX()

# Or pass it explicitly.
client = MereX(api_key=os.environ["MERE_X_API_KEY"])`
      } } },
      { t: "h2", v: "Key formats" },
      { t: "table", v: {
        columns: [{ key: "prefix", label: "Prefix" }, { key: "use", label: "Use" }, { key: "note", label: "Note" }],
        rows: [
          { prefix: "merex-live-", use: "Production traffic", note: "Billed at standard rates" },
          { prefix: "merex-test-", use: "Development and CI", note: "Same models, lower rate limits, isolated spend cap" },
          { prefix: "merex-admin-", use: "Organisation management", note: "Required for usage, cost, and key endpoints" }
        ]
      }},
      { t: "h2", v: "Scopes" },
      { t: "p", v: "Every key carries a set of scopes. A request to an endpoint outside the key's scopes returns <code class=\"inline\">403 permission_error</code> rather than silently succeeding." },
      { t: "ul", v: [
        "<code class=\"inline\">messages</code> — create messages, count tokens",
        "<code class=\"inline\">embeddings</code> — create embeddings",
        "<code class=\"inline\">images</code> — generate and edit images",
        "<code class=\"inline\">audio</code> — transcribe, synthesise, open realtime sessions",
        "<code class=\"inline\">batches</code> — create and read batch jobs",
        "<code class=\"inline\">files</code> — upload, list, and delete files",
        "<code class=\"inline\">admin</code> — read usage and manage keys. Grant sparingly."
      ]},
      { t: "h2", v: "Rotation" },
      { t: "steps", v: [
        { title: "Create the new key first", body: "With the same scopes and a spend cap. Never revoke before the replacement is live." },
        { title: "Deploy it", body: "Roll it through your environments. Both keys work simultaneously." },
        { title: "Confirm the old key is idle", body: "Check last-used in the console. It should stop moving within a deploy cycle." },
        { title: "Revoke", body: "In-flight requests on the old key terminate immediately." }
      ]},
      { t: "callout", v: { text: "A key in a browser bundle is a public key, no matter what your bundler does. Proxy through your own server — the SDKs support a custom base URL for exactly this.", variant: "danger", icon: "alert" } },
      { t: "h2", v: "Restricting by IP" },
      { t: "p", v: "Organisations can set an IP allowlist in <a href=\"/console/settings\">settings</a>. Requests from outside the listed CIDR ranges are refused regardless of key validity. This is the cheapest meaningful control available to most teams." }
    ]
  },

  /* ------------------------------------------------------ */
  sdks: {
    title: "SDKs & tooling",
    lead: "Official clients for six languages, plus a CLI.",
    blocks: [
      { t: "p", v: "Every SDK exposes the same shape: a client, a <code class=\"inline\">messages.create</code> call, a streaming variant, and typed errors. Feature parity is maintained within one release of the API." },
      { t: "table", v: {
        columns: [{ key: "name", label: "SDK" }, { key: "install", label: "Install" }, { key: "version", label: "Version" }, { key: "note", label: "Notes" }],
        rows: SDK_LIST
      }},
      { t: "h2", v: "What the SDKs do for you" },
      { t: "ul", v: [
        "Automatic retries with exponential backoff and jitter on 429, 500, and 529",
        "Idempotency keys on every mutating request, generated if you do not supply one",
        "Streaming helpers that reassemble content blocks and reconnect through transient failures",
        "Typed errors — <code class=\"inline\">RateLimitError</code> carries <code class=\"inline\">retry_after</code>, so you do not parse headers by hand",
        "Token counting locally, so you can check a request will fit before sending it",
        "A tool runner that drives the agent loop, including parallel calls"
      ]},
      { t: "h2", v: "The tool runner" },
      { t: "code", v: { samples: SAMPLES.agent, caption: "The runner handles the call-execute-continue loop, including compaction." } },
      { t: "h2", v: "The CLI" },
      { t: "code", v: { samples: {
        Shell: `npm install -g @mere-x/cli

# Send a request
merex ask "summarise this" --model mere-orion-5-5 --file report.pdf

# Tail request logs
merex logs --follow --status 429

# Manage keys
merex keys create --name ci-runner --scope messages --limit 100

# Run an eval suite
merex eval run ./evals/support-triage.yaml --runs 5`
      } } },
      { t: "h2", v: "Community clients" },
      { t: "p", v: "Ruby, Rust, PHP, and Elixir clients are maintained by the community and generally track the API within one release. They are listed in the developer directory but not supported by us — if you need a guarantee, use one of the six above." }
    ]
  },

  /* ------------------------------------------------------ */
  errors: {
    title: "Errors & retries",
    lead: "What each status code means, and whether retrying will help.",
    blocks: [
      { t: "h2", v: "Error shape" },
      { t: "code", v: { samples: {
        JSON: `{
  "type": "error",
  "request_id": "req_01k4m2p9xq",
  "error": {
    "type": "rate_limit_error",
    "message": "Rate limit exceeded for tokens-per-minute.",
    "param": null
  }
}`
      }, caption: "Always log request_id — it is the fastest route to a resolved support ticket." } },
      { t: "h2", v: "Status codes" },
      { t: "table", v: {
        columns: [
          { key: "code", label: "Code" },
          { key: "type", label: "Type" },
          { key: "meaning", label: "Meaning" },
          { key: "action", label: "What to do" }
        ],
        rows: ERROR_CODES
      }},
      { t: "h2", v: "Retrying correctly" },
      { t: "p", v: "Retry <code class=\"inline\">429</code>, <code class=\"inline\">500</code>, and <code class=\"inline\">529</code>. Never retry <code class=\"inline\">400</code>, <code class=\"inline\">401</code>, or <code class=\"inline\">403</code> — the request will fail identically, and a retry loop on a bad request is how a small bug becomes a rate-limit incident." },
      { t: "code", v: { samples: SAMPLES.errors } },
      { t: "h2", v: "Idempotency" },
      { t: "p", v: "Send an <code class=\"inline\">idempotency-key</code> header on any mutating request. If the same key arrives twice within 24 hours, the original response is replayed rather than the work being repeated. The SDKs generate one automatically." },
      { t: "callout", v: { text: "Exponential backoff with jitter, not a fixed delay. Without jitter, every client that got rate-limited at the same moment retries at the same moment.", variant: "accent", icon: "refresh" } },
      { t: "h2", v: "Timeouts" },
      { t: "p", v: "Default client timeout is 10 minutes, which is right for High mode but far too short for DEEP. For DEEP requests, either raise the timeout to an hour or use streaming — a streaming connection stays alive through deliberation and gives you progress events while it thinks." }
    ]
  },

  /* ------------------------------------------------------ */
  messages: {
    title: "Messages",
    lead: "The primary endpoint. Conversations, content blocks, and stop reasons.",
    blocks: [
      { t: "h2", v: "Request shape" },
      { t: "code", v: { samples: {
        JSON: `{
  "model": "mere-orion-5-5",
  "max_tokens": 2048,
  "system": "You are a careful research assistant.",
  "messages": [
    { "role": "user", "content": "What changed between v3 and v4?" }
  ],
  "thinking": { "type": "enabled", "budget_tokens": 4000 },
  "temperature": 1.0,
  "stream": true
}`
      } } },
      { t: "h2", v: "Roles and alternation" },
      { t: "p", v: "Messages alternate between <code class=\"inline\">user</code> and <code class=\"inline\">assistant</code>. The system prompt is a separate top-level field rather than a message, which is what lets it be cached independently of the conversation." },
      { t: "h2", v: "Content blocks" },
      { t: "p", v: "A message's <code class=\"inline\">content</code> is either a string or an array of blocks. Mix them freely — the model reads them in order." },
      { t: "table", v: {
        columns: [{ key: "type", label: "Block type" }, { key: "use", label: "Use" }, { key: "dir", label: "Direction" }],
        rows: [
          { type: "text", use: "Plain text", dir: "In and out" },
          { type: "image", use: "PNG, JPEG, WebP, GIF, HEIC — base64 or file ID", dir: "In (out on Iris)" },
          { type: "document", use: "PDF, DOCX, PPTX, XLSX, plain text", dir: "In" },
          { type: "audio", use: "mp3, wav, m4a, ogg, flac, webm", dir: "In (out on Lyra)" },
          { type: "tool_use", use: "The model calling one of your tools", dir: "Out" },
          { type: "tool_result", use: "Your response to a tool call", dir: "In" },
          { type: "thinking", use: "A reasoning summary", dir: "Out" }
        ]
      }},
      { t: "h2", v: "Response shape" },
      { t: "code", v: { samples: {
        JSON: `{
  "id": "msg_01k4m2p9xq",
  "type": "message",
  "role": "assistant",
  "model": "mere-orion-5-5-20260618",
  "content": [
    { "type": "thinking", "summary": "Compared the two changelogs; …" },
    { "type": "text", "text": "Three things changed…" }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 1204,
    "output_tokens": 386,
    "thinking_tokens": 812,
    "cache_read_input_tokens": 980
  }
}`
      } } },
      { t: "h2", v: "Stop reasons" },
      { t: "table", v: {
        columns: [{ key: "reason", label: "stop_reason" }, { key: "meaning", label: "Meaning" }, { key: "action", label: "Typical handling" }],
        rows: [
          { reason: "end_turn", meaning: "The model finished naturally.", action: "Use the response." },
          { reason: "max_tokens", meaning: "Hit your max_tokens ceiling.", action: "Raise the ceiling, or continue the turn." },
          { reason: "stop_sequence", meaning: "Emitted one of your stop sequences.", action: "Expected — parse accordingly." },
          { reason: "tool_use", meaning: "The model wants to call a tool.", action: "Execute it and send back a tool_result." },
          { reason: "thinking_budget", meaning: "Deliberation budget exhausted.", action: "The answer is complete but less considered. Raise the budget if quality matters." },
          { reason: "refusal", meaning: "Declined on policy grounds.", action: "Surface appropriately; do not retry blindly." }
        ]
      }},
      { t: "callout", v: { text: "Always branch on <code class=\"inline\">stop_reason</code>. Treating <code class=\"inline\">max_tokens</code> as a complete answer is the single most common source of silently truncated output in production.", variant: "warning", icon: "alert" } },
      { t: "h2", v: "System prompts" },
      { t: "p", v: "The system prompt sets role, constraints, and output shape. Keep it stable across requests so it can be cached — a changing system prompt invalidates the cache on every call and quietly multiplies your bill." }
    ]
  },

  /* ------------------------------------------------------ */
  reasoning: {
    title: "Reasoning budgets",
    lead: "Four depths of deliberation on one model, selectable per request.",
    blocks: [
      { t: "p", v: "Mere X separates <em>thinking</em> from <em>answering</em>. You set a token budget; the model spends it planning, checking, and discarding candidate approaches before emitting a single output token." },
      { t: "h2", v: "The four modes" },
      { t: "table", v: {
        columns: [
          { key: "name", label: "Mode" },
          { key: "budget", label: "Budget" },
          { key: "latency", label: "Latency" },
          { key: "use", label: "Reach for it when" }
        ],
        rows: MODES.map((m) => ({ name: m.name, budget: m.budget, latency: m.latency, use: m.use }))
      }},
      { t: "h2", v: "Setting a budget" },
      { t: "code", v: { samples: {
        Python: `message = client.messages.create(
    model="mere-apex-5-5",
    max_tokens=8192,
    thinking={"type": "enabled", "budget_tokens": 32_000},
    messages=[{"role": "user", "content": prompt}],
)

print(message.usage.thinking_tokens)   # what it actually spent
print(message.thinking.summary)        # how it got there`,
        TypeScript: `const message = await client.messages.create({
  model: "mere-apex-5-5",
  max_tokens: 8192,
  thinking: { type: "enabled", budget_tokens: 32_000 },
  messages: [{ role: "user", content: prompt }],
});`
      } } },
      { t: "h2", v: "Budgets are ceilings, not quotas" },
      { t: "p", v: "The model stops thinking when it is confident. An easy question inside a 32,000-token budget typically spends 400 and bills for 400. This is why setting a generous budget is usually safe — you pay for deliberation that was actually needed." },
      { t: "h2", v: "Which mode to use" },
      { t: "ul", v: [
        "<strong>Default to Medium.</strong> It catches most reasoning slips for roughly two seconds.",
        "<strong>Promote to High</strong> when your evaluation — not your intuition — shows the extra deliberation changes the answer.",
        "<strong>Use Fast</strong> only where a user is watching a cursor blink.",
        "<strong>Use DEEP</strong> for work that would take a person a day, and never where someone is waiting synchronously."
      ]},
      { t: "h2", v: "Interaction with other parameters" },
      { t: "table", v: {
        columns: [{ key: "param", label: "Parameter" }, { key: "effect", label: "Interaction" }],
        rows: [
          { param: "temperature", effect: "Applies below 4,000 thinking tokens. Above that the sampler is constrained during deliberation; temperature still applies to the final answer." },
          { param: "max_tokens", effect: "Caps the answer only. Thinking tokens are counted separately in usage." },
          { param: "tools", effect: "In High and DEEP the model can call a tool mid-deliberation, read the result, and keep thinking." },
          { param: "response_format", effect: "Constrained decoding applies to the answer. Deliberation is unconstrained." },
          { param: "stream", effect: "Emits thinking_delta events carrying progress and summary fragments — never raw chain-of-thought." }
        ]
      }},
      { t: "callout", v: { text: "Thinking tokens bill at the model's output rate and appear separately as <code class=\"inline\">usage.thinking_tokens</code>. If a bill surprises you, look there first.", variant: "accent", icon: "card" } }
    ]
  },

  /* ------------------------------------------------------ */
  streaming: {
    title: "Streaming",
    lead: "Server-sent events, thinking progress, and reconnection.",
    blocks: [
      { t: "p", v: "Set <code class=\"inline\">stream: true</code> and the response arrives as server-sent events. For anything user-facing this is not optional — perceived latency is dominated by time to first token, not total time." },
      { t: "code", v: { samples: SAMPLES.streaming } },
      { t: "h2", v: "Event types" },
      { t: "table", v: {
        columns: [{ key: "event", label: "Event" }, { key: "meaning", label: "Meaning" }],
        rows: [
          { event: "message_start", meaning: "Metadata and the initial usage object." },
          { event: "thinking_delta", meaning: "Deliberation progress. Carries summary fragments, never raw reasoning." },
          { event: "content_block_start", meaning: "A new block began — text, tool_use, or thinking." },
          { event: "content_block_delta", meaning: "Incremental content for the current block." },
          { event: "content_block_stop", meaning: "The current block is complete." },
          { event: "message_delta", meaning: "Top-level updates — stop_reason and final usage." },
          { event: "message_stop", meaning: "The response is complete." },
          { event: "ping", meaning: "Keep-alive during long deliberation. Ignore it." },
          { event: "error", meaning: "A mid-stream failure. The stream ends here." }
        ]
      }},
      { t: "h2", v: "Rendering thinking" },
      { t: "p", v: "During High and DEEP requests the model may deliberate for a long time before any answer text appears. Use <code class=\"inline\">thinking_delta</code> to render a genuine working state — users tolerate a long wait considerably better when they can see something is happening." },
      { t: "code", v: { samples: {
        TypeScript: `const stream = client.messages.stream({ /* … */ });

stream.on("thinking", (event) => {
  setStatus(\`Thinking… \${event.tokens} tokens\`);
});

stream.on("text", (delta) => {
  setStatus(null);
  appendToBubble(delta);
});

stream.on("error", (error) => {
  // The SDK has already retried transient failures.
  showError(error);
});

const final = await stream.finalMessage();`
      } } },
      { t: "h2", v: "Reconnection" },
      { t: "p", v: "The SDKs reconnect automatically through transient network failures and resume from the last received event, so you will not see duplicated content. If you are consuming the raw SSE stream yourself, use the <code class=\"inline\">last-event-id</code> header to resume." },
      { t: "callout", v: { text: "If streams cut off consistently at the same point, check for a proxy in between. Buffering reverse proxies are the most common cause, and they need <code class=\"inline\">proxy_buffering off</code> for this route.", icon: "alert", variant: "warning" } }
    ]
  },

  /* ------------------------------------------------------ */
  tools: {
    title: "Tool use",
    lead: "Let the model call your functions, and ours.",
    blocks: [
      { t: "p", v: "Describe your tools as JSON Schema and the model decides when to call them — often several at once. You execute the call and send the result back as a <code class=\"inline\">tool_result</code> block; the conversation continues from there." },
      { t: "code", v: { samples: SAMPLES.tools } },
      { t: "h2", v: "Writing a good description" },
      { t: "p", v: "The <code class=\"inline\">description</code> field is the single biggest lever on whether tool use works. It is a prompt, not documentation — write it for a capable colleague who has never seen your system." },
      { t: "ul", v: [
        "Say <strong>when</strong> to use it, not just what it does: \"Use whenever the user references an order, even indirectly.\"",
        "Say when <strong>not</strong> to use it: \"Do not call this for shipping questions; use track_shipment instead.\"",
        "Describe side effects plainly: \"This issues a refund. It cannot be undone.\"",
        "Constrain enums tightly. A free-string parameter with three valid values will eventually receive a fourth."
      ]},
      { t: "h2", v: "The loop" },
      { t: "steps", v: [
        { title: "Send the request with tools", body: "The model returns content blocks; some may be <code class=\"inline\">tool_use</code>." },
        { title: "Check stop_reason", body: "<code class=\"inline\">tool_use</code> means it wants to call something before continuing." },
        { title: "Execute", body: "Run each call. Parallel calls can genuinely run in parallel — that is why they are emitted together." },
        { title: "Append results", body: "Add the assistant message and a user message containing one <code class=\"inline\">tool_result</code> block per call, matched by <code class=\"inline\">tool_use_id</code>." },
        { title: "Send again", body: "Repeat until <code class=\"inline\">stop_reason</code> is <code class=\"inline\">end_turn</code>." }
      ]},
      { t: "h2", v: "Server-side tools" },
      { t: "p", v: "Some tools run inside Mere X infrastructure. You enable them by name and never execute anything yourself." },
      { t: "table", v: {
        columns: [{ key: "tool", label: "Tool" }, { key: "does", label: "What it does" }, { key: "price", label: "Price" }],
        rows: [
          { tool: "web_search", does: "Current sources, returned with structured citations", price: "$8 / 1K searches" },
          { tool: "code_execution", does: "Python in an isolated sandbox with no network egress", price: "$0.04 / session-hour" },
          { tool: "file_read", does: "Reads files you have uploaded, with layout preserved", price: "Free" },
          { tool: "computer_use", does: "Screenshot, click, and type against a virtual display", price: "$0.12 / session-hour" }
        ]
      }},
      { t: "h2", v: "Controlling tool choice" },
      { t: "code", v: { samples: {
        JSON: `"tool_choice": { "type": "auto" }                    // default — the model decides
"tool_choice": { "type": "any" }                     // must call some tool
"tool_choice": { "type": "tool", "name": "search" }  // must call this one
"tool_choice": { "type": "none" }                    // may not call any`
      } } },
      { t: "callout", v: { text: "Model Context Protocol servers work as tools. Point the client at an MCP server and its tools appear in the same list as your own.", variant: "accent", icon: "plug" } }
    ]
  },

  /* ------------------------------------------------------ */
  "structured-output": {
    title: "Structured output",
    lead: "Guaranteed-valid JSON against your schema, with no retry loop.",
    blocks: [
      { t: "p", v: "Constrained decoding enforces your JSON Schema at the token level during sampling. A response that violates the schema is not merely discouraged — it is unreachable. The retry-and-repair layer most applications write does not need to exist." },
      { t: "code", v: { samples: SAMPLES.structured } },
      { t: "h2", v: "Supported schema features" },
      { t: "table", v: {
        columns: [{ key: "feature", label: "Feature" }, { key: "support", label: "Support" }],
        rows: [
          { feature: "object, array, string, number, integer, boolean, null", support: "Full" },
          { feature: "required, additionalProperties: false", support: "Full — and strongly recommended" },
          { feature: "enum, const", support: "Full" },
          { feature: "Nested objects and arrays", support: "Full, to a depth of 12" },
          { feature: "anyOf, oneOf", support: "Full" },
          { feature: "$ref and $defs", support: "Full, local references only" },
          { feature: "pattern (regex)", support: "Full" },
          { feature: "minLength, maxLength, minimum, maximum", support: "Advisory — not enforced by decoding" }
        ]
      }},
      { t: "h2", v: "Designing schemas that work" },
      { t: "ul", v: [
        "Always set <code class=\"inline\">additionalProperties: false</code>. Without it the model may add fields you then have to ignore.",
        "Make every field required and use <code class=\"inline\">[\"string\", \"null\"]</code> for optional values. An absent field and a null field are different bugs; the second is easier to find.",
        "Name fields the way a person would. <code class=\"inline\">governing_law</code> extracts better than <code class=\"inline\">gl_field_2</code>.",
        "Add a <code class=\"inline\">description</code> to any field whose meaning is not obvious from its name.",
        "Include a confidence or <code class=\"inline\">not_found</code> field. Giving the model somewhere to put uncertainty stops it inventing a value."
      ]},
      { t: "callout", v: { text: "Constrained decoding guarantees <em>shape</em>, not <em>truth</em>. The model can still return a well-formed wrong answer — which is exactly why the confidence field matters.", variant: "warning", icon: "alert" } },
      { t: "h2", v: "Streaming partial objects" },
      { t: "code", v: { samples: {
        Python: `with client.messages.stream(
    model="mere-orion-5-5",
    max_tokens=2048,
    response_format={"type": "json_schema", "schema": schema},
    messages=[{"role": "user", "content": text}],
) as stream:
    for partial in stream.parsed_partials():
        render(partial)     # fields appear as they are decoded`
      } } }
    ]
  },

  /* ------------------------------------------------------ */
  context: {
    title: "Long context & caching",
    lead: "A million tokens, and how to re-read them cheaply.",
    blocks: [
      { t: "p", v: "Apex and Orion accept up to one million tokens; Nyx accepts 400,000. Recall is measured adversarially across the whole window rather than at the edges, and prompt caching makes re-reading a stable corpus inexpensive." },
      { t: "h2", v: "Prompt caching" },
      { t: "p", v: "Mark a prefix with <code class=\"inline\">cache_control</code> and subsequent requests that share it read at 10% of input price. Writing to the cache costs 1.25×, so caching pays for itself from the second read." },
      { t: "code", v: { samples: SAMPLES.caching } },
      { t: "h2", v: "Cache economics" },
      { t: "table", v: {
        columns: [{ key: "op", label: "Operation" }, { key: "mult", label: "Multiplier" }, { key: "note", label: "Note" }],
        rows: [
          { op: "Cache write", mult: "1.25×", note: "Paid once, on the first request with this prefix" },
          { op: "Cache read", mult: "0.10×", note: "Every subsequent hit within the TTL" },
          { op: "Default TTL", mult: "5 minutes", note: "Refreshed on every hit" },
          { op: "Extended TTL", mult: "1 hour", note: "Set <code class=\"inline\">ttl: \"1h\"</code>; write cost rises to 2×" },
          { op: "Break-even", mult: "2 reads", note: "Anything read twice is cheaper cached" }
        ]
      }},
      { t: "h2", v: "Structuring a long prompt" },
      { t: "ol", v: [
        "<strong>System prompt</strong> — stable, cached.",
        "<strong>Tool definitions</strong> — stable, cached.",
        "<strong>Corpus</strong> — documents, code, history. Cached, with the breakpoint after it.",
        "<strong>Conversation</strong> — variable, uncached.",
        "<strong>The question</strong> — last."
      ]},
      { t: "p", v: "Order matters for quality as well as cost. The model weights later instructions slightly higher, so a question buried above 400,000 tokens of context genuinely receives less attention than the same question at the end." },
      { t: "h2", v: "Recall at depth" },
      { t: "table", v: {
        columns: [{ key: "depth", label: "Depth" }, { key: "apex", label: "Apex", align: "right" }, { key: "orion", label: "Orion", align: "right" }, { key: "nyx", label: "Nyx", align: "right" }],
        rows: [
          { depth: "128K", apex: "99.8%", orion: "99.4%", nyx: "96.1%" },
          { depth: "256K", apex: "99.6%", orion: "98.8%", nyx: "93.2%" },
          { depth: "512K", apex: "99.3%", orion: "98.1%", nyx: "—" },
          { depth: "1M", apex: "99.1%", orion: "97.4%", nyx: "—" }
        ]
      }},
      { t: "callout", v: { text: "Recall is not reasoning. A model that finds every needle can still fail to synthesise them — which is why long-context tasks usually want a higher reasoning budget, not just a bigger window.", icon: "info" } }
    ]
  },

  /* ------------------------------------------------------ */
  vision: {
    title: "Vision & documents",
    lead: "Images, PDFs, charts, and screenshots in the same message array.",
    blocks: [
      { t: "p", v: "Send a PDF directly — no OCR step, no chunking strategy. The document encoder preserves layout, so tables stay tables and footnotes stay attached to their anchors." },
      { t: "code", v: { samples: SAMPLES.vision } },
      { t: "h2", v: "Limits" },
      { t: "table", v: {
        columns: [{ key: "k", label: "" }, { key: "v", label: "Limit" }],
        rows: [
          { k: "Images per request", v: "100" },
          { k: "Max image resolution", v: "8000 × 8000" },
          { k: "Image token cost", v: "≈ 1,600 tokens per megapixel" },
          { k: "PDF pages", v: "3,000" },
          { k: "File size (inline)", v: "20 MB" },
          { k: "File size (Files API)", v: "512 MB" },
          { k: "Formats", v: "PNG, JPEG, WebP, GIF, HEIC · PDF, DOCX, PPTX, XLSX" }
        ]
      }},
      { t: "h2", v: "Getting good results" },
      { t: "ul", v: [
        "Resolution matters more than anything else. Below roughly 150 DPI, handwriting and small chart labels are guessed rather than read.",
        "Crop and re-send the region at higher resolution when you need a specific value from a dense figure.",
        "Ask for page and coordinate references. The encoder preserves them, and citations you can verify are worth far more than citations you cannot.",
        "Give the model somewhere to put uncertainty — a <code class=\"inline\">confidence</code> field turns a confident wrong answer into a routable one.",
        "For video, sample frames and send them as an image sequence with timestamps in the surrounding text blocks."
      ]},
      { t: "h2", v: "Image generation" },
      { t: "code", v: { samples: {
        Python: `image = client.images.generate(
    model="mere-iris",
    prompt="An isometric diagram of a three-tier web architecture, "
           "thin ink lines on cream paper, no text labels.",
    size="1536x1024",
    quality="high",
)

edited = client.images.edit(
    model="mere-iris",
    image=open("product.png", "rb"),
    mask=open("background-mask.png", "rb"),
    prompt="Replace the background with a plain warm grey studio sweep.",
)`
      } } },
      { t: "callout", v: { text: "Long strings of generated text inside an image are still occasionally malformed. Compose text over generated imagery in your own renderer rather than asking the model for it.", variant: "warning", icon: "alert" } }
    ]
  },

  /* ------------------------------------------------------ */
  batch: {
    title: "Batch processing",
    lead: "Half price for anything nobody is waiting on.",
    blocks: [
      { t: "p", v: "Submit up to a million requests in one job. Results stream back as they complete, so you are not waiting for the slowest item. Everything costs 50% of the standard rate." },
      { t: "code", v: { samples: SAMPLES.batch } },
      { t: "h2", v: "When to use it" },
      { t: "ul", v: [
        "Classification, enrichment, or labelling over a dataset",
        "Nightly summarisation or report generation",
        "Backfilling a feature over historical data",
        "Evaluation runs — five runs of a suite is exactly the shape batch is for",
        "Anything where the answer is consumed by a job rather than a person"
      ]},
      { t: "h2", v: "Job lifecycle" },
      { t: "table", v: {
        columns: [{ key: "status", label: "Status" }, { key: "meaning", label: "Meaning" }],
        rows: [
          { status: "validating", meaning: "Checking every request body. Invalid entries are reported without failing the job." },
          { status: "in_progress", meaning: "Running. Results are already retrievable for completed entries." },
          { status: "finalizing", meaning: "Assembling the complete result set." },
          { status: "completed", meaning: "Everything processed. Results available for 30 days." },
          { status: "canceling", meaning: "Cancellation requested; in-flight requests finish." },
          { status: "expired", meaning: "The completion window elapsed. Completed entries are still retrievable." }
        ]
      }},
      { t: "h2", v: "Practical notes" },
      { t: "ul", v: [
        "<code class=\"inline\">custom_id</code> is how you match results to inputs. Make it your own primary key, not an array index.",
        "Batch has its own rate-limit quota, so it does not compete with interactive traffic.",
        "Prompt caching works inside a batch. Order requests so shared prefixes are adjacent and the cache stays warm.",
        "Set <code class=\"inline\">webhook_url</code> rather than polling. Polling a 24-hour job is a waste of both our time.",
        "Failed entries appear in results with an error object; they do not fail the job."
      ]},
      { t: "callout", v: { text: "Most jobs finish well inside the 24-hour window — median completion is under an hour. The window is a guarantee, not an estimate.", variant: "accent", icon: "clock" } }
    ]
  },

  /* ------------------------------------------------------ */
  embeddings: {
    title: "Embeddings",
    lead: "Multilingual vectors with truncatable dimensions.",
    blocks: [
      { t: "p", v: "Mere Atlas was trained alongside the model family, so what it retrieves is what Mere X wants to read. Output dimensions are truncatable from 3072 down to 256 with graceful quality decay." },
      { t: "code", v: { samples: SAMPLES.embeddings } },
      { t: "h2", v: "Choosing a dimension" },
      { t: "table", v: {
        columns: [{ key: "dim", label: "Dimensions" }, { key: "quality", label: "Retrieval quality" }, { key: "size", label: "Index size" }, { key: "use", label: "Use for" }],
        rows: [
          { dim: "3072", quality: "100% (baseline)", size: "12 KB / vector", use: "Highest accuracy, small corpora" },
          { dim: "1536", quality: "99.4%", size: "6 KB / vector", use: "The usual default" },
          { dim: "1024", quality: "98.7%", size: "4 KB / vector", use: "Large corpora" },
          { dim: "512", quality: "96.1%", size: "2 KB / vector", use: "Very large corpora, first-pass retrieval" },
          { dim: "256", quality: "91.8%", size: "1 KB / vector", use: "Candidate generation before a rerank" }
        ]
      }},
      { t: "h2", v: "Asymmetric retrieval" },
      { t: "p", v: "Set <code class=\"inline\">input_type</code> to <code class=\"inline\">\"query\"</code> for search queries and <code class=\"inline\">\"document\"</code> for indexed content. Queries and documents have different shapes, and telling the model which it is looking at improves recall by several points for free." },
      { t: "h2", v: "Chunking" },
      { t: "ul", v: [
        "Chunk on semantic boundaries — sections, not fixed token counts.",
        "Overlap by 10–15% so a sentence spanning a boundary is retrievable from either side.",
        "Prepend the document title and section heading to each chunk. It costs a few tokens and materially improves retrieval.",
        "Keep chunks between 200 and 800 tokens. Smaller loses context; larger dilutes the embedding.",
        "With a million-token window, consider whether you need retrieval at all — for a corpus under about 800K tokens, sending the whole thing with caching is often simpler and better."
      ]},
      { t: "callout", v: { text: "The most common RAG failure is not retrieval quality — it is not telling the model it is allowed to say the corpus does not contain the answer. Put that permission in the system prompt.", variant: "accent", icon: "target" } }
    ]
  },

  /* ------------------------------------------------------ */
  safety: {
    title: "Guard & moderation",
    lead: "Free safety classification on every request, and as a standalone endpoint.",
    blocks: [
      { t: "p", v: "Mere X Guard scores inputs and outputs across the Mere X harm taxonomy. It runs as a parallel head on every request at no charge, and is also available standalone so you can apply your own thresholds before generation starts." },
      { t: "code", v: { samples: SAMPLES.guard } },
      { t: "h2", v: "Taxonomy" },
      { t: "table", v: {
        columns: [{ key: "cat", label: "Category" }, { key: "covers", label: "Covers" }],
        rows: [
          { cat: "violence", covers: "Threats, incitement, graphic depiction, weapons acquisition" },
          { cat: "self_harm", covers: "Suicide, self-injury, disordered eating" },
          { cat: "sexual", covers: "Explicit content, and separately any sexualisation of minors" },
          { cat: "harassment", covers: "Targeted abuse, bullying, doxxing" },
          { cat: "hate", covers: "Dehumanising content directed at protected characteristics" },
          { cat: "deception", covers: "Fraud, impersonation, coordinated inauthentic behaviour" },
          { cat: "dangerous_activity", covers: "Weapons, explosives, and CBRN uplift" },
          { cat: "cyber", covers: "Malware, exploitation of systems without authorisation" },
          { cat: "privacy", covers: "Personal data extraction, surveillance, unauthorised tracking" }
        ]
      }},
      { t: "h2", v: "Choosing thresholds" },
      { t: "p", v: "Scores are 0–1 per category. There is no universally correct threshold — a security research tool and a children's product should not behave identically, and pretending otherwise produces a model that is useless for one of them." },
      { t: "ul", v: [
        "Start at 0.7 and tune with your own data. Measure false positives, not just false negatives.",
        "Use lower thresholds for <code class=\"inline\">self_harm</code> and <code class=\"inline\">sexual</code> where minors may be involved — over-triggering is cheap there.",
        "Use higher thresholds for <code class=\"inline\">cyber</code> and <code class=\"inline\">dangerous_activity</code> if your users are security professionals or clinicians.",
        "Route rather than block where you can. A crisis resource is a better response to a self-harm signal than a refusal."
      ]},
      { t: "callout", v: { text: "Guard is one control, not the whole system. You remain responsible for your application's use under the <a href=\"/safety/usage-policy\">usage policy</a>, regardless of what any individual request scored.", variant: "warning", icon: "shield" } }
    ]
  },

  /* ------------------------------------------------------ */
  agents: {
    title: "Building agents",
    lead: "Long-horizon loops that stay coherent past step two hundred.",
    blocks: [
      { t: "p", v: "An agent is a loop: the model calls tools, reads results, and continues until it is done. What makes long agents hard is not reasoning — it is context management. Most collapses past step two hundred are context failures, and those are fixable." },
      { t: "code", v: { samples: SAMPLES.agent } },
      { t: "h2", v: "The five things that break" },
      { t: "table", v: {
        columns: [{ key: "problem", label: "Failure" }, { key: "fix", label: "Fix" }],
        rows: [
          { problem: "Context window fills with tool output", fix: "Compaction — summarise older turns and keep the summary. The SDK runner does this with <code class=\"inline\">compaction=\"auto\"</code>." },
          { problem: "The agent forgets the original goal", fix: "Restate the objective in the system prompt on every turn. It is cached, so it is nearly free." },
          { problem: "It loops on a failing tool", fix: "Track consecutive failures per tool and force a different approach after two. Give it an explicit escalate tool." },
          { problem: "It cannot resume after a crash", fix: "Checkpoint the message array after every step. Resumption is then a load, not a restart." },
          { problem: "Cost runs away unnoticed", fix: "Hard-cap <code class=\"inline\">max_steps</code> and total token spend per run. Alert on both." }
        ]
      }},
      { t: "h2", v: "Designing the tool surface" },
      { t: "ul", v: [
        "Fewer, broader tools beat many narrow ones. Twelve tools is manageable; forty is a routing problem.",
        "Every agent needs an <code class=\"inline\">escalate</code> tool. Without one, an agent that should stop will invent a way to continue.",
        "Make destructive tools require confirmation through a separate call, not a boolean parameter.",
        "Return structured errors from tools. \"Order not found\" is actionable; a stack trace is not.",
        "Include the current state in tool results. An agent that has to remember state will eventually get it wrong."
      ]},
      { t: "h2", v: "Reasoning in agents" },
      { t: "p", v: "Use High for the planning turn and Medium for execution turns. DEEP is for the whole run rather than a single step — it interleaves thinking with tool calls across the entire trajectory, which is what makes multi-hour agents work." },
      { t: "callout", v: { text: "Have the agent open a pull request rather than push to a protected branch, file a draft rather than send, propose rather than execute. The review step is where most of the value lands.", variant: "accent", icon: "branch" } }
    ]
  },

  /* ------------------------------------------------------ */
  "rate-limits": {
    title: "Rate limits",
    lead: "Per-organisation limits that rise automatically with usage.",
    blocks: [
      { t: "p", v: "Limits apply per organisation, not per key, and are expressed in requests per minute, tokens per minute, and tokens per day. Tiers advance automatically on deposit history — no form, no sales call." },
      { t: "table", v: {
        columns: [
          { key: "tier", label: "Tier" }, { key: "spend", label: "Qualifies at" },
          { key: "rpm", label: "Requests / min", align: "right" }, { key: "tpm", label: "Tokens / min", align: "right" },
          { key: "tpd", label: "Tokens / day", align: "right" }, { key: "batch", label: "Batches", align: "right" }
        ],
        rows: RATE_TIERS
      }},
      { t: "h2", v: "Reading the headers" },
      { t: "code", v: { samples: {
        Headers: `mere-x-ratelimit-requests-limit: 8000
mere-x-ratelimit-requests-remaining: 7913
mere-x-ratelimit-requests-reset: 2026-09-02T14:22:00Z
mere-x-ratelimit-tokens-limit: 4000000
mere-x-ratelimit-tokens-remaining: 3120400
mere-x-ratelimit-tokens-reset: 2026-09-02T14:22:00Z
retry-after: 12`
      } } },
      { t: "h2", v: "Staying under them" },
      { t: "ul", v: [
        "Move offline work to the <a href=\"/docs/batch\">Batch API</a> — separate quota, half price.",
        "Route easy calls to Nyx. Most rate-limit pressure comes from traffic that never needed the frontier model.",
        "Cache stable prefixes. Cached input counts toward tokens-per-minute at a tenth of the weight.",
        "Back off with jitter. Without jitter, everyone who got limited at the same moment retries at the same moment.",
        "Reserve capacity with provisioned throughput if you need a ceiling you cannot reach."
      ]},
      { t: "callout", v: { text: "Your current headroom against each limit is on the <a href=\"/console/limits\">rate limits page</a> in the console, based on your actual peak utilisation.", icon: "gauge" } }
    ]
  },

  /* ------------------------------------------------------ */
  "pricing-guide": {
    title: "Cost optimisation",
    lead: "Five changes that typically cut a production bill by more than half.",
    blocks: [
      { t: "p", v: "In roughly that order of impact, and none of them require changing what your product does." },
      { t: "h2", v: "1. Right-size the model" },
      { t: "p", v: "Audit your call sites. Most applications route everything to the frontier model out of caution, and most of that traffic is classification, formatting, or routing that Nyx handles at 5% of the cost. Orion covers the large middle." },
      { t: "table", v: {
        columns: [{ key: "name", label: "Model" }, { key: "in", label: "Input / MTok", align: "right" }, { key: "out", label: "Output / MTok", align: "right" }, { key: "rel", label: "Relative", align: "right" }],
        rows: CHAT_MODELS.filter((m) => m.price.output).map((m) => ({
          name: m.name,
          in: `$${m.price.input.toFixed(2)}`,
          out: `$${m.price.output.toFixed(2)}`,
          rel: `${(m.price.output / 22.5).toFixed(2)}×`
        }))
      }},
      { t: "h2", v: "2. Cache your prefixes" },
      { t: "p", v: "A stable system prompt, tool schema, or corpus reads at 10% of input price. Break-even is two reads. If your system prompt changes on every request — for example because you interpolate a timestamp into it — you are paying full price on every call for no reason." },
      { t: "h2", v: "3. Batch everything nobody is waiting on" },
      { t: "p", v: "Half price, separate quota, median completion under an hour. If a human is not blocked on the result, it belongs in a batch." },
      { t: "h2", v: "4. Budget reasoning deliberately" },
      { t: "p", v: "Thinking tokens bill at the output rate. A High budget on a call site that did not need it is the most common source of a surprising bill. Check <code class=\"inline\">usage.thinking_tokens</code> per call site and demote the ones where deliberation changed nothing." },
      { t: "h2", v: "5. Cap max_tokens honestly" },
      { t: "p", v: "You are billed for tokens generated, not the ceiling — but a generous ceiling lets a model ramble when the prompt is ambiguous. Setting a realistic cap is a quality control as much as a cost one." },
      { t: "h2", v: "A worked example" },
      { t: "code", v: { samples: {
        Text: `Support triage, 200K requests/day, 6K input + 400 output tokens

  Before:  Apex, High mode, no caching, all interactive
           input   36,000 MTok x $4.50  =  $162,000 / month
           output   2,400 MTok x $22.50 =   $54,000 / month
           thinking 4,800 MTok x $22.50 =  $108,000 / month
                                          -------------------
                                            $324,000 / month

  After:   Orion, Medium mode, cached prefix, 60% batched
           input (cached 80%)                =   $9,504 / month
           output                            =   $9,240 / month
           thinking (Medium)                 =   $3,300 / month
           batch discount on 60%             =  -$7,225 / month
                                                -------------------
                                                 $14,819 / month

  Same eval score to within one point.`
      }, caption: "Illustrative figures at list price." } },
      { t: "callout", v: { text: "Measure before and after with your own eval suite. A cost reduction that quietly costs you three points of accuracy is not a saving.", variant: "warning", icon: "gauge" } }
    ]
  },

  /* ------------------------------------------------------ */
  production: {
    title: "Going to production",
    lead: "A checklist for the day before launch.",
    blocks: [
      { t: "h2", v: "Reliability" },
      { t: "ul", v: [
        "Pin a dated model snapshot, not an alias. Aliases move; pinned IDs never change behaviour.",
        "Pin the API version header. Breaking changes ship behind a new version and never touch a pinned one.",
        "Retry 429, 500, and 529 with exponential backoff and jitter. Never retry 400, 401, or 403.",
        "Set idempotency keys on mutating calls — the SDKs do this for you.",
        "Raise the client timeout for High and DEEP requests, or use streaming."
      ]},
      { t: "h2", v: "Observability" },
      { t: "ul", v: [
        "Log <code class=\"inline\">request_id</code> on every call. It is the fastest route to a resolved support ticket.",
        "Record <code class=\"inline\">stop_reason</code> and alert on unexpected <code class=\"inline\">max_tokens</code> — that is silent truncation.",
        "Track <code class=\"inline\">usage.thinking_tokens</code> per call site so cost regressions are visible.",
        "Monitor cache hit rate. A drop usually means something started varying in your prefix.",
        "Set spend alerts in the console before you need them."
      ]},
      { t: "h2", v: "Safety" },
      { t: "ul", v: [
        "Handle <code class=\"inline\">stop_reason: \"refusal\"</code> explicitly rather than treating it as an error.",
        "Route Guard signals appropriately — a self-harm flag needs a crisis resource, not a 400.",
        "Keep a human in the loop for consequential decisions. This is a <a href=\"/safety/usage-policy\">policy requirement</a>, not a suggestion.",
        "Do not present model output as professional advice from a licensed practitioner."
      ]},
      { t: "h2", v: "Cost control" },
      { t: "ul", v: [
        "Per-key spend caps, so one runaway service cannot exhaust the organisation.",
        "A monthly organisation cap with an alert threshold below it.",
        "Separate keys per environment, so staging noise does not hide in production numbers."
      ]},
      { t: "h2", v: "Quality" },
      { t: "ul", v: [
        "Build an eval suite from real examples before launch, not after the first incident.",
        "Run it on every prompt change, at five runs, and compare the mean.",
        "Keep a set of adversarial prompts specific to your domain and run them too.",
        "Log a sample of production responses for human review — weekly is enough to catch drift."
      ]},
      { t: "callout", v: { text: "The single most valuable thing on this page is the eval suite. Fifty real examples graded by someone who knows what good looks like will tell you more than any benchmark on this site.", variant: "accent", icon: "flask" } }
    ]
  },

  /* ------------------------------------------------------ */
  migration: {
    title: "Migration guide",
    lead: "Moving to Mere X 5.5, or from another provider.",
    blocks: [
      { t: "h2", v: "From Mere 5.0" },
      { t: "table", v: {
        columns: [{ key: "old", label: "3.5" }, { key: "new", label: "4" }, { key: "note", label: "Note" }],
        rows: [
          { old: "mere-x-3-5-apex", new: "mere-apex-5-5", note: "Drop-in. Context rises from 200K to 1M." },
          { old: "mere-x-3-5-orion", new: "mere-orion-5-5", note: "Drop-in, and roughly 30% cheaper per output token." },
          { old: "reasoning_effort", new: "thinking.budget_tokens", note: "The string enum is replaced by an explicit budget." },
          { old: "response_format: json_object", new: "response_format: json_schema", note: "Now constrained; the old mode still works but is advisory." },
          { old: "N/A", new: "Server-side tools", note: "web_search, code_execution, file_read, computer_use." }
        ]
      }},
      { t: "h2", v: "Behavioural differences worth knowing" },
      { t: "ul", v: [
        "Mere X 5.5 refuses less often on ambiguous-but-legitimate requests. If your application relied on a refusal as a filter, it needs a real check.",
        "Output is more concise by default. Prompts that asked for brevity may now under-produce; remove the instruction rather than fighting it.",
        "Tool calls are more often parallel. If your executor assumed one call per turn, it needs to handle an array.",
        "Calibration is better, which means more explicit uncertainty. Do not treat \"I am not certain\" as a failure — it is the feature working."
      ]},
      { t: "h2", v: "From another provider" },
      { t: "p", v: "The request shape is close enough that most migrations are a client swap and a rename. The differences that matter:" },
      { t: "ul", v: [
        "The system prompt is a top-level <code class=\"inline\">system</code> field, not a message with role <code class=\"inline\">system</code>. This is what lets it be cached independently.",
        "<code class=\"inline\">max_tokens</code> is required. There is no unbounded default.",
        "Reasoning is a token budget, not an effort string. Start at 4,000 for anything you previously ran on a reasoning model.",
        "Content blocks are typed objects rather than a union of shapes. Multimodal input is more verbose and considerably less ambiguous.",
        "Errors carry a <code class=\"inline\">type</code> you can branch on rather than a message you have to parse."
      ]},
      { t: "code", v: { samples: {
        Python: `# A compatibility shim covering the common cases.
def to_mere-x(request: dict) -> dict:
    messages = [m for m in request["messages"] if m["role"] != "system"]
    system = next((m["content"] for m in request["messages"]
                   if m["role"] == "system"), None)

    out = {
        "model": MODEL_MAP[request["model"]],
        "max_tokens": request.get("max_tokens", 4096),
        "messages": messages,
    }
    if system:
        out["system"] = system
    if effort := request.get("reasoning_effort"):
        out["thinking"] = {
            "type": "enabled",
            "budget_tokens": {"low": 4_000, "medium": 32_000, "high": 128_000}[effort],
        }
    return out`
      } } },
      { t: "callout", v: { text: "Run your eval suite on both before you cut over. Every migration guide, including this one, understates the behavioural differences that matter to your specific application.", variant: "warning", icon: "gauge" } }
    ]
  },

  /* ------------------------------------------------------ */
  versioning: {
    title: "Versioning",
    lead: "How we change the API without changing what your code does.",
    blocks: [
      { t: "h2", v: "Two things are versioned" },
      { t: "ul", v: [
        "<strong>The API</strong>, through the <code class=\"inline\">mere-x-version</code> header. A date, e.g. <code class=\"inline\">2026-06-18</code>.",
        "<strong>Models</strong>, through dated snapshot IDs, e.g. <code class=\"inline\">mere-apex-5-5-20260618</code>."
      ]},
      { t: "p", v: "Pin both in production. A pinned API version never receives a breaking change, and a pinned model snapshot never changes behaviour — not for a quality improvement, not for a safety fix, not for anything." },
      { t: "h2", v: "What counts as breaking" },
      { t: "table", v: {
        columns: [{ key: "change", label: "Change" }, { key: "breaking", label: "Breaking?" }],
        rows: [
          { change: "Removing a field from a response", breaking: "Yes — new version required" },
          { change: "Changing a field's type or meaning", breaking: "Yes" },
          { change: "Adding a required request parameter", breaking: "Yes" },
          { change: "Changing a default value", breaking: "Yes" },
          { change: "Adding an optional request parameter", breaking: "No" },
          { change: "Adding a field to a response", breaking: "No — parse defensively" },
          { change: "Adding a new enum value", breaking: "No — handle unknown values" },
          { change: "New model snapshots", breaking: "No — old snapshots keep serving" }
        ]
      }},
      { t: "h2", v: "Deprecation" },
      { t: "steps", v: [
        { title: "Announcement", body: "At least six months before retirement, in the changelog, by email, and by webhook if you have subscribed." },
        { title: "Migration guide", body: "Published with the announcement, including behavioural diffs rather than just a rename table." },
        { title: "Deprecation headers", body: "Responses from a deprecated version carry <code class=\"inline\">mere-x-deprecation</code> with the retirement date." },
        { title: "Retirement", body: "The version stops serving and returns <code class=\"inline\">404 not_found_error</code> with a link to the migration guide." }
      ]},
      { t: "callout", v: { text: "Turn on deprecation notices in <a href=\"/console/settings\">notification settings</a>. Six months is plenty of warning only if someone actually receives it.", icon: "bell" } }
    ]
  },

  /* ------------------------------------------------------ */
  models: {
    title: "Model reference",
    lead: "Every model, with specs, pricing, and identifiers.",
    blocks: [
      { t: "table", v: {
        columns: [
          { key: "name", label: "Model" }, { key: "id", label: "ID" },
          { key: "context", label: "Context", align: "right" }, { key: "out", label: "Max out", align: "right" },
          { key: "in", label: "In / MTok", align: "right" }, { key: "outp", label: "Out / MTok", align: "right" }
        ],
        rows: MODELS.map((m) => ({
          name: m.name,
          id: `<code class="mono small">${m.id}</code>`,
          context: m.context.toLocaleString("en-US"),
          out: m.maxOutput.toLocaleString("en-US"),
          in: m.price.input != null ? `$${m.price.input.toFixed(2)}` : "—",
          outp: m.price.output ? `$${m.price.output.toFixed(2)}` : "Free"
        }))
      }},
      { t: "h2", v: "Aliases and snapshots" },
      { t: "p", v: "Every model has an alias that always resolves to the newest snapshot, and dated snapshot IDs that never change. Use the alias in development; pin the snapshot in production." },
      { t: "table", v: {
        columns: [{ key: "alias", label: "Alias" }, { key: "resolves", label: "Currently resolves to" }],
        rows: MODELS.map((m) => ({
          alias: `<code class="mono small">${m.aliases[0]}</code>`,
          resolves: `<code class="mono small">${m.aliases[1] || m.aliases[0]}</code>`
        }))
      }},
      { t: "h2", v: "Modalities" },
      { t: "table", v: {
        columns: [{ key: "name", label: "Model" }, { key: "modalities", label: "Accepts and produces" }, { key: "modes", label: "Reasoning modes" }],
        rows: MODELS.map((m) => ({
          name: m.name,
          modalities: m.modalities.join(", "),
          modes: m.modes.length ? m.modes.join(" · ") : "—"
        }))
      }},
      { t: "callout", v: { text: "Apex, Orion, and Nyx share a tokenizer, so token counts and therefore costs are directly comparable between them. Switching model is genuinely a one-line change.", icon: "info" } }
    ]
  }
};
