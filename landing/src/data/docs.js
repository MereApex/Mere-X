/* ============================================================
   DOCS — navigation, page bodies, and the API reference
   Blocks: p | h2 | h3 | ul | ol | code | callout | table |
           endpoint | params | grid
   ============================================================ */

export const DOCS_NAV = [
  {
    title: "Get started",
    items: [
      { slug: "", title: "Introduction" },
      { slug: "quickstart", title: "Quickstart" },
      { slug: "authentication", title: "Authentication" },
      { slug: "sdks", title: "SDKs & tooling" },
      { slug: "errors", title: "Errors & retries" }
    ]
  },
  {
    title: "Core concepts",
    items: [
      { slug: "messages", title: "Messages" },
      { slug: "reasoning", title: "Reasoning budgets" },
      { slug: "streaming", title: "Streaming" },
      { slug: "tools", title: "Tool use" },
      { slug: "structured-output", title: "Structured output" },
      { slug: "context", title: "Long context & caching" },
      { slug: "vision", title: "Vision & documents" },
      { slug: "batch", title: "Batch processing" },
      { slug: "embeddings", title: "Embeddings" },
      { slug: "safety", title: "Guard & moderation" }
    ]
  },
  {
    title: "Build",
    items: [
      { slug: "agents", title: "Building agents" },
      { slug: "rate-limits", title: "Rate limits" },
      { slug: "pricing-guide", title: "Cost optimisation" },
      { slug: "production", title: "Going to production" },
      { slug: "migration", title: "Migration guide" }
    ]
  },
  {
    title: "Reference",
    items: [
      { slug: "api", title: "API reference" },
      { slug: "models", title: "Model reference" },
      { slug: "cookbook", title: "Cookbook" },
      { slug: "prompts", title: "Prompt library" },
      { slug: "versioning", title: "Versioning" }
    ]
  }
];

export const DOCS_ORDER = DOCS_NAV.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title })));

/* ------------------------------------------------------------
   CODE SAMPLES
   ------------------------------------------------------------ */
export const SAMPLES = {
  firstCall: {
    Python: `from mere_x import MereX

client = MereX()  # reads MERE_X_API_KEY

message = client.messages.create(
    model="mere-orion-5-5",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Explain reasoning budgets in two sentences."}
    ],
)

print(message.content[0].text)`,
    TypeScript: `import Mere X from "@mere-x/sdk";

const client = new MereX(); // reads MERE_X_API_KEY

const message = await client.messages.create({
  model: "mere-orion-5-5",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Explain reasoning budgets in two sentences." },
  ],
});

console.log(message.content[0].text);`,
    cURL: `curl https://api.merex.ai/v1/messages \\
  -H "x-api-key: $MERE_X_API_KEY" \\
  -H "mere-x-version: 2026-06-18" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "mere-orion-5-5",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Explain reasoning budgets in two sentences."}
    ]
  }'`,
    Go: `package main

import (
    "context"
    "fmt"
    "github.com/mere-x/mere-x-go"
)

func main() {
    client := mere_x.NewClient()

    msg, err := client.Messages.Create(context.Background(), mere_x.MessageRequest{
        Model:     "mere-orion-5-5",
        MaxTokens: 1024,
        Messages: []mere_x.Message{
            {Role: "user", Content: "Explain reasoning budgets in two sentences."},
        },
    })
    if err != nil {
        panic(err)
    }
    fmt.Println(msg.Content[0].Text)
}`
  },

  streaming: {
    Python: `with client.messages.stream(
    model="mere-apex-5-5",
    max_tokens=4096,
    thinking={"type": "enabled", "budget_tokens": 8000},
    messages=[{"role": "user", "content": "Audit this contract for renewal traps."}],
) as stream:
    for event in stream:
        if event.type == "thinking_delta":
            print(".", end="", flush=True)      # deliberation in progress
        elif event.type == "content_block_delta":
            print(event.delta.text, end="", flush=True)

    final = stream.get_final_message()
    print(final.usage)`,
    TypeScript: `const stream = client.messages.stream({
  model: "mere-apex-5-5",
  max_tokens: 4096,
  thinking: { type: "enabled", budget_tokens: 8000 },
  messages: [{ role: "user", content: "Audit this contract for renewal traps." }],
});

stream.on("thinking", () => process.stdout.write("."));
stream.on("text", (delta) => process.stdout.write(delta));

const final = await stream.finalMessage();
console.log(final.usage);`
  },

  tools: {
    Python: `tools = [
    {
        "name": "search_orders",
        "description": "Find orders for a customer. Use when the user references an order.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {"type": "string"},
                "status": {"type": "string", "enum": ["open", "shipped", "returned"]},
            },
            "required": ["customer_id"],
        },
    }
]

response = client.messages.create(
    model="mere-orion-5-5",
    max_tokens=2048,
    tools=tools,
    messages=[{"role": "user", "content": "Where is Ana's last order?"}],
)

for block in response.content:
    if block.type == "tool_use":
        result = search_orders(**block.input)
        # Send the result back as a tool_result block to continue the turn.`,
    TypeScript: `const tools = [
  {
    name: "search_orders",
    description: "Find orders for a customer. Use when the user references an order.",
    input_schema: {
      type: "object",
      properties: {
        customer_id: { type: "string" },
        status: { type: "string", enum: ["open", "shipped", "returned"] },
      },
      required: ["customer_id"],
    },
  },
];

const response = await client.messages.create({
  model: "mere-orion-5-5",
  max_tokens: 2048,
  tools,
  messages: [{ role: "user", content: "Where is Ana's last order?" }],
});`
  },

  structured: {
    Python: `schema = {
    "type": "object",
    "properties": {
        "counterparty": {"type": "string"},
        "governing_law": {"type": ["string", "null"]},
        "termination_days": {"type": "integer"},
        "auto_renews": {"type": "boolean"},
    },
    "required": ["counterparty", "governing_law", "termination_days", "auto_renews"],
    "additionalProperties": False,
}

response = client.messages.create(
    model="mere-orion-5-5",
    max_tokens=1024,
    response_format={"type": "json_schema", "schema": schema},
    messages=[{"role": "user", "content": contract_text}],
)

record = response.parsed   # already validated against the schema`,
    TypeScript: `import { z } from "zod";

const Contract = z.object({
  counterparty: z.string(),
  governing_law: z.string().nullable(),
  termination_days: z.number().int(),
  auto_renews: z.boolean(),
});

const response = await client.messages.parse({
  model: "mere-orion-5-5",
  max_tokens: 1024,
  response_format: { type: "zod", schema: Contract },
  messages: [{ role: "user", content: contractText }],
});

const record = response.parsed; // typed and validated`
  },

  caching: {
    Python: `response = client.messages.create(
    model="mere-apex-5-5",
    max_tokens=2048,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {"type": "text", "media_type": "text/plain", "data": corpus},
                    "cache_control": {"type": "ephemeral", "ttl": "1h"},
                },
                {"type": "text", "text": "Which clauses changed between v3 and v4?"},
            ],
        }
    ],
)

print(response.usage.cache_read_input_tokens)  # billed at 10%`
  },

  batch: {
    Python: `batch = client.batches.create(
    requests=[
        {
            "custom_id": row["id"],
            "params": {
                "model": "mere-nyx-5-5",
                "max_tokens": 256,
                "messages": [{"role": "user", "content": row["text"]}],
            },
        }
        for row in rows
    ]
)

# Results stream back as they complete — no need to wait for the whole job.
for result in client.batches.results(batch.id, stream=True):
    save(result.custom_id, result.message.content[0].text)`
  },

  embeddings: {
    Python: `vectors = client.embeddings.create(
    model="mere-atlas",
    input=[chunk.text for chunk in chunks],
    dimensions=1024,          # Matryoshka truncation, 256–3072
)

index.upsert([(c.id, v.embedding, c.meta) for c, v in zip(chunks, vectors.data)])`
  },

  agent: {
    Python: `runner = client.tool_runner(
    model="mere-apex-5-5",
    tools=[search_orders, issue_refund, escalate],
    thinking={"type": "enabled", "budget_tokens": 32_000},
    max_steps=200,
    compaction="auto",        # summarise older turns when the window fills
)

for step in runner.run("Resolve ticket 88214 end to end."):
    log(step.type, step.summary)

print(runner.final_message.content[0].text)`
  },

  vision: {
    Python: `response = client.messages.create(
    model="mere-iris",
    max_tokens=2048,
    messages=[{
        "role": "user",
        "content": [
            {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64}},
            {"type": "text", "text": "Extract every line item into a table with page references."},
        ],
    }],
)`
  },

  guard: {
    Python: `check = client.guard.classify(input=user_text)

if check.flagged and check.scores["self_harm"] > 0.4:
    return crisis_response()

# Guard also runs inline on every messages.create call — this endpoint
# just lets you apply your own thresholds before generation starts.`
  },

  errors: {
    Python: `from mere_x import RateLimitError, APIStatusError

try:
    message = client.messages.create(...)
except RateLimitError as exc:
    wait = exc.retry_after or 2
    time.sleep(wait)
except APIStatusError as exc:
    logger.error("mere-x %s: %s", exc.status_code, exc.error.type)
    raise`
  }
};

/* ------------------------------------------------------------
   API REFERENCE
   ------------------------------------------------------------ */
export const API_GROUPS = [
  {
    name: "Messages",
    description: "The primary generation endpoint. Everything conversational, agentic, or multimodal goes through it.",
    endpoints: [
      {
        method: "post",
        path: "/v1/messages",
        title: "Create a message",
        description: "Send a conversation and receive the model's reply.",
        params: [
          { name: "model", type: "string", required: true, desc: "Model ID or alias, e.g. mere-orion-5-5." },
          { name: "messages", type: "array<Message>", required: true, desc: "The conversation so far. Roles alternate between user and assistant; content is a string or an array of content blocks." },
          { name: "max_tokens", type: "integer", required: true, desc: "Hard cap on tokens generated. Must not exceed the model's max output." },
          { name: "system", type: "string | array", desc: "System instructions. Accepts cache_control for a cacheable prefix." },
          { name: "thinking", type: "object", desc: "{ type: \"enabled\" | \"disabled\", budget_tokens: integer }. Sets the deliberation budget. Omit for the model default." },
          { name: "tools", type: "array<Tool>", desc: "Tool definitions the model may call. Include server-side tools by name." },
          { name: "tool_choice", type: "object", desc: "{ type: \"auto\" | \"any\" | \"tool\" | \"none\", name?: string }." },
          { name: "response_format", type: "object", desc: "{ type: \"json_schema\", schema: object } for constrained decoding." },
          { name: "temperature", type: "number", desc: "0–1. Defaults to 1. Ignored when thinking is enabled above 4K tokens." },
          { name: "top_p", type: "number", desc: "Nucleus sampling. Do not set alongside temperature." },
          { name: "stop_sequences", type: "array<string>", desc: "Up to 8 sequences that end generation." },
          { name: "stream", type: "boolean", desc: "Emit server-sent events instead of a single response." },
          { name: "metadata", type: "object", desc: "{ user_id?: string } — opaque identifiers for your own analytics and abuse tracing." }
        ],
        returns: "A Message object with id, model, role, content blocks, stop_reason, and usage."
      },
      {
        method: "post",
        path: "/v1/messages/count_tokens",
        title: "Count tokens",
        description: "Get the exact token count a request would consume, before sending it.",
        params: [
          { name: "model", type: "string", required: true, desc: "The model the count should be computed for." },
          { name: "messages", type: "array<Message>", required: true, desc: "The same message array you would send to /v1/messages." },
          { name: "system", type: "string | array", desc: "System prompt, counted alongside the messages." },
          { name: "tools", type: "array<Tool>", desc: "Tool definitions, which also consume input tokens." }
        ],
        returns: "{ input_tokens: integer }"
      }
    ]
  },
  {
    name: "Batches",
    description: "Half-price asynchronous processing for work that does not need an answer this second.",
    endpoints: [
      {
        method: "post",
        path: "/v1/batches",
        title: "Create a batch",
        description: "Submit up to one million requests for asynchronous processing.",
        params: [
          { name: "requests", type: "array<BatchRequest>", required: true, desc: "Each entry has a custom_id and a params object identical to a /v1/messages body." },
          { name: "completion_window", type: "string", desc: "\"24h\" (default) or \"1h\" at a smaller discount." },
          { name: "webhook_url", type: "string", desc: "Called on batch.completed and batch.failed." }
        ],
        returns: "A Batch object with id, status, counts, and result URLs."
      },
      { method: "get", path: "/v1/batches/{batch_id}", title: "Retrieve a batch", description: "Poll batch status and per-request counts.", params: [{ name: "batch_id", type: "string", required: true, desc: "The batch identifier." }], returns: "A Batch object." },
      { method: "get", path: "/v1/batches/{batch_id}/results", title: "Stream batch results", description: "Read results as JSONL, incrementally, while the batch is still running.", params: [{ name: "batch_id", type: "string", required: true, desc: "The batch identifier." }, { name: "stream", type: "boolean", desc: "Return results as they complete rather than waiting for the whole job." }], returns: "A JSONL stream of results keyed by custom_id." },
      { method: "del", path: "/v1/batches/{batch_id}", title: "Cancel a batch", description: "Stop processing. Completed requests remain billable and retrievable.", params: [{ name: "batch_id", type: "string", required: true, desc: "The batch identifier." }], returns: "A Batch object with status canceling." }
    ]
  },
  {
    name: "Embeddings",
    description: "Vector representations for search, clustering, and retrieval.",
    endpoints: [
      {
        method: "post",
        path: "/v1/embeddings",
        title: "Create embeddings",
        description: "Embed up to 2,048 inputs in a single call.",
        params: [
          { name: "model", type: "string", required: true, desc: "mere-atlas." },
          { name: "input", type: "string | array<string>", required: true, desc: "Text to embed. Each input may be up to 32,000 tokens." },
          { name: "dimensions", type: "integer", desc: "Truncate output to 256–3072 dimensions. Defaults to 3072." },
          { name: "input_type", type: "string", desc: "\"query\" or \"document\". Improves asymmetric retrieval quality." }
        ],
        returns: "{ data: [{ index, embedding }], usage }"
      }
    ]
  },
  {
    name: "Images",
    description: "Generation and editing with Mere Iris.",
    endpoints: [
      {
        method: "post",
        path: "/v1/images/generations",
        title: "Generate an image",
        description: "Create an image from a text prompt.",
        params: [
          { name: "model", type: "string", required: true, desc: "mere-iris." },
          { name: "prompt", type: "string", required: true, desc: "What to draw. Detailed prompts produce more controllable results." },
          { name: "size", type: "string", desc: "\"1024x1024\", \"1536x1024\", \"1024x1536\", or \"auto\"." },
          { name: "quality", type: "string", desc: "\"standard\" or \"high\"." },
          { name: "n", type: "integer", desc: "Number of images, 1–4." }
        ],
        returns: "{ data: [{ b64_json | url, revised_prompt }] }"
      },
      { method: "post", path: "/v1/images/edits", title: "Edit an image", description: "Apply an instruction to an existing image, optionally with a mask.", params: [{ name: "image", type: "file", required: true, desc: "The source image, PNG or WebP, up to 20 MB." }, { name: "prompt", type: "string", required: true, desc: "The edit to apply." }, { name: "mask", type: "file", desc: "Transparent regions mark the area to change." }], returns: "{ data: [{ b64_json }] }" }
    ]
  },
  {
    name: "Audio",
    description: "Transcription, speech synthesis, and realtime duplex sessions.",
    endpoints: [
      { method: "post", path: "/v1/audio/transcriptions", title: "Transcribe audio", description: "Convert speech to text with word-level timestamps.", params: [{ name: "file", type: "file", required: true, desc: "Audio up to 500 MB — mp3, wav, m4a, ogg, flac, webm." }, { name: "model", type: "string", required: true, desc: "mere-lyra." }, { name: "timestamps", type: "string", desc: "\"word\" or \"segment\"." }, { name: "language", type: "string", desc: "ISO-639-1 hint. Auto-detected when omitted." }], returns: "{ text, segments, language, duration }" },
      { method: "post", path: "/v1/audio/speech", title: "Synthesise speech", description: "Turn text into natural audio.", params: [{ name: "model", type: "string", required: true, desc: "mere-lyra." }, { name: "input", type: "string", required: true, desc: "Text to speak, up to 8,000 characters." }, { name: "voice", type: "string", desc: "One of eight voices; see the voice gallery." }, { name: "format", type: "string", desc: "\"mp3\", \"wav\", \"opus\", or \"pcm\"." }], returns: "Binary audio in the requested format." },
      { method: "post", path: "/v1/realtime/sessions", title: "Create a realtime session", description: "Mint a short-lived client token for a duplex WebRTC or WebSocket session.", params: [{ name: "model", type: "string", required: true, desc: "mere-lyra." }, { name: "voice", type: "string", desc: "Voice for the assistant side of the session." }, { name: "tools", type: "array<Tool>", desc: "Tools the voice agent may call mid-conversation." }, { name: "instructions", type: "string", desc: "System behaviour for the session." }], returns: "{ client_secret, expires_at, model }" }
    ]
  },
  {
    name: "Files",
    description: "Upload documents once and reference them across requests and batches.",
    endpoints: [
      { method: "post", path: "/v1/files", title: "Upload a file", description: "Store a document, image, or dataset for later reference.", params: [{ name: "file", type: "file", required: true, desc: "Up to 512 MB. PDF, images, text, CSV, JSONL." }, { name: "purpose", type: "string", required: true, desc: "\"input\" for message content, \"batch\" for batch jobs." }], returns: "A File object with id, bytes, and created_at." },
      { method: "get", path: "/v1/files", title: "List files", description: "Page through the files in your organisation.", params: [{ name: "limit", type: "integer", desc: "1–1000, default 100." }, { name: "after", type: "string", desc: "Cursor from a previous page." }], returns: "{ data: [File], has_more, last_id }" },
      { method: "del", path: "/v1/files/{file_id}", title: "Delete a file", description: "Permanently remove a file and its derived indexes.", params: [{ name: "file_id", type: "string", required: true, desc: "The file identifier." }], returns: "{ id, deleted: true }" }
    ]
  },
  {
    name: "Guard",
    description: "Safety classification. Free on every call, and available standalone.",
    endpoints: [
      {
        method: "post",
        path: "/v1/guard/classify",
        title: "Classify content",
        description: "Score text or images against the Mere X harm taxonomy.",
        params: [
          { name: "input", type: "string | array", required: true, desc: "Text and/or image content blocks to score." },
          { name: "model", type: "string", desc: "mere-aegis. Defaults to the latest Guard model." },
          { name: "categories", type: "array<string>", desc: "Restrict scoring to specific taxonomy categories." }
        ],
        returns: "{ flagged: boolean, scores: { [category]: number }, categories: string[] }"
      }
    ]
  },
  {
    name: "Organisation",
    description: "Programmatic access to keys, usage, and limits. Requires an admin key.",
    endpoints: [
      { method: "get", path: "/v1/organization/usage", title: "Retrieve usage", description: "Token and request counts by day, model, and key.", params: [{ name: "start_date", type: "string", required: true, desc: "ISO date, inclusive." }, { name: "end_date", type: "string", desc: "ISO date, exclusive. Defaults to today." }, { name: "group_by", type: "array<string>", desc: "Any of model, api_key, endpoint." }], returns: "{ data: [{ date, model, api_key, input_tokens, output_tokens, requests }] }" },
      { method: "get", path: "/v1/organization/cost", title: "Retrieve cost", description: "Spend broken down the same way as usage.", params: [{ name: "start_date", type: "string", required: true, desc: "ISO date, inclusive." }, { name: "group_by", type: "array<string>", desc: "Any of model, api_key, endpoint." }], returns: "{ data: [{ date, amount_usd, model }] }" },
      { method: "get", path: "/v1/organization/api_keys", title: "List API keys", description: "Enumerate keys with their scopes and spend.", params: [{ name: "limit", type: "integer", desc: "1–100, default 20." }], returns: "{ data: [ApiKey], has_more }" },
      { method: "del", path: "/v1/organization/api_keys/{key_id}", title: "Revoke a key", description: "Immediately invalidate a key. In-flight requests are terminated.", params: [{ name: "key_id", type: "string", required: true, desc: "The key identifier." }], returns: "{ id, status: \"revoked\" }" }
    ]
  }
];

export const ERROR_CODES = [
  { code: 400, type: "invalid_request_error", meaning: "The request body did not validate — a missing field, a bad enum, or max_tokens above the model limit.", action: "Fix the request. Retrying unchanged will fail identically." },
  { code: 401, type: "authentication_error", meaning: "The API key is missing, malformed, or revoked.", action: "Check the x-api-key header and the key's status in the console." },
  { code: 403, type: "permission_error", meaning: "The key is valid but lacks the scope for this endpoint, or the model is not enabled for your organisation.", action: "Grant the scope on the key, or request model access." },
  { code: 404, type: "not_found_error", meaning: "The referenced resource — file, batch, or model ID — does not exist.", action: "Verify the identifier; check whether the model has been retired." },
  { code: 413, type: "request_too_large", meaning: "The request exceeded 100 MB, or the input exceeded the model's context window.", action: "Upload large documents via /v1/files and reference them by ID." },
  { code: 429, type: "rate_limit_error", meaning: "You exceeded requests or tokens per minute for your tier.", action: "Back off using the retry-after header; exponential backoff with jitter." },
  { code: 500, type: "api_error", meaning: "An unexpected failure on our side.", action: "Retry with backoff. Persistent 500s should be reported with the request-id." },
  { code: 529, type: "overloaded_error", meaning: "The platform is temporarily saturated.", action: "Retry with backoff. Provisioned throughput is not subject to this error." }
];

export const RATE_TIERS = [
  { tier: "Tier 1", spend: "$0", rpm: 50, tpm: "50K", tpd: "1M", batch: 5 },
  { tier: "Tier 2", spend: "$50 deposited", rpm: 500, tpm: "200K", tpd: "20M", batch: 20 },
  { tier: "Tier 3", spend: "$500 deposited", rpm: 2000, tpm: "800K", tpd: "150M", batch: 60 },
  { tier: "Tier 4", spend: "$2,000 deposited", rpm: 8000, tpm: "4M", tpd: "900M", batch: 200 },
  { tier: "Tier 5", spend: "Custom", rpm: "Custom", tpm: "Custom", tpd: "Unlimited", batch: "Custom" }
];

export const SDK_LIST = [
  { name: "Python", install: "pip install mere-x", version: "3.4.1", icon: "code", note: "Sync and async clients, streaming helpers, a tool runner, and Pydantic parsing." },
  { name: "TypeScript", install: "npm install @mere-x/sdk", version: "3.4.1", icon: "code", note: "Works in Node, Deno, Bun, Cloudflare Workers, and the browser with a proxy." },
  { name: "Go", install: "go get github.com/mere-x/mere-x-go", version: "1.9.0", icon: "code", note: "Context-aware, zero-dependency, with streaming over channels." },
  { name: "Java", install: "implementation(\"com.mere-x:sdk:1.6.0\")", version: "1.6.0", icon: "code", note: "Java 17+, reactive streams support, Spring Boot starter available." },
  { name: "Ruby", install: "gem install mere-x", version: "0.9.2", icon: "code", note: "Community-maintained, tracks the API within one release." },
  { name: "CLI", install: "npm install -g @mere-x/cli", version: "2.2.0", icon: "terminal", note: "Send requests, tail logs, manage keys, and run evals from a terminal." }
];
