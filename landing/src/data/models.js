/* ============================================================
   MODELS — the Mere X family: specs, capabilities, pricing,
   evaluation results and the reasoning-mode system.

   Mere X and Mere X are a design build. Evaluation figures
   below are illustrative and labelled as such wherever shown.
   ============================================================ */

export const GENERATION = "Mere X 5.5";
export const KNOWLEDGE_CUTOFF = "March 2026";

export const MODELS = [
  {
    id: "mere-apex-5-5",
    name: "Mere Apex 5.5",
    short: "Apex",
    tier: "Frontier",
    icon: "atom",
    flagship: true,
    tagline: "Our most capable model. Built for problems that need real deliberation.",
    description:
      "Apex is the frontier of the Mere X family. It plans before it answers, holds long multi-step arguments together, and is the model we reach for when a task has to be right rather than merely fast — deep research, novel code, legal and scientific analysis, and agents that run for hours.",
    context: 1_000_000,
    maxOutput: 128_000,
    modes: ["Fast", "Medium", "High", "DEEP"],
    price: { input: 4.5, output: 22.5, cacheWrite: 5.63, cacheRead: 0.45, batch: 0.5 },
    latency: "1.9 s median first token",
    throughput: "78 tok/s",
    modalities: ["Text", "Images", "PDF", "Audio in", "Code"],
    releasedAt: "2026-06-18",
    status: "Generally available",
    bestFor: [
      "Multi-hour agentic workflows",
      "Frontier research and analysis",
      "Complex refactors across large repositories",
      "High-stakes review where errors are costly"
    ],
    aliases: ["mere-apex-5-5-latest", "mere-apex-5-5-20260618"]
  },
  {
    id: "mere-orion-5-5",
    name: "Mere Orion 5.5",
    short: "Orion",
    tier: "Balanced",
    icon: "layers",
    tagline: "The workhorse. Near-frontier quality at production economics.",
    description:
      "Orion is the model most products should be built on. It matches Apex on the majority of everyday tasks at roughly a quarter of the cost, holds the same million-token context window, and is fast enough to sit in an interactive loop with a user.",
    context: 1_000_000,
    maxOutput: 64_000,
    modes: ["Fast", "Medium", "High"],
    price: { input: 1.1, output: 5.5, cacheWrite: 1.38, cacheRead: 0.11, batch: 0.5 },
    latency: "0.8 s median first token",
    throughput: "142 tok/s",
    modalities: ["Text", "Images", "PDF", "Code"],
    releasedAt: "2026-06-18",
    status: "Generally available",
    bestFor: [
      "Customer-facing assistants",
      "RAG and document workflows",
      "Code review and test generation",
      "Classification and extraction at scale"
    ],
    aliases: ["mere-orion-5-5-latest", "mere-orion-5-5-20260618"]
  },
  {
    id: "mere-nyx-5-5",
    name: "Mere Nyx 5.5",
    short: "Nyx",
    tier: "Fast",
    icon: "bolt",
    tagline: "Instant, inexpensive, and surprisingly sharp.",
    description:
      "Nyx answers before you have finished reading the prompt. It is tuned for the high-volume, low-latency layer of a product — routing, moderation pre-passes, autocomplete, summarisation, and the thousand small calls that make an application feel alive.",
    context: 400_000,
    maxOutput: 32_000,
    modes: ["Fast", "Medium"],
    price: { input: 0.22, output: 1.1, cacheWrite: 0.28, cacheRead: 0.022, batch: 0.5 },
    latency: "0.21 s median first token",
    throughput: "310 tok/s",
    modalities: ["Text", "Images", "Code"],
    releasedAt: "2026-06-18",
    status: "Generally available",
    bestFor: [
      "Realtime UI features",
      "Routing and triage layers",
      "Bulk labelling and enrichment",
      "Edge and on-device-adjacent deployments"
    ],
    aliases: ["mere-nyx-5-5-latest", "mere-nyx-5-5-20260618"]
  },
  {
    id: "mere-vision-5-5",
    name: "Mere Vision 5.5",
    short: "Vision",
    tier: "Multimodal",
    icon: "image",
    tagline: "Reads diagrams and renders images with the same model.",
    description:
      "Vision 2 handles the pixel side of the platform: document and chart understanding, UI screenshots, hand-drawn sketches, and high-fidelity image generation and editing with instruction-level control.",
    context: 300_000,
    maxOutput: 16_000,
    modes: ["Fast", "High"],
    price: { input: 3.2, output: 12, cacheWrite: 4, cacheRead: 0.32, batch: 0.5, perImage: 0.04 },
    latency: "2.4 s median image",
    throughput: "—",
    modalities: ["Images in", "Images out", "Text", "PDF"],
    releasedAt: "2026-04-02",
    status: "Generally available",
    bestFor: [
      "Document and form understanding",
      "Chart and table extraction",
      "Product imagery and editing",
      "Visual QA over screenshots"
    ],
    aliases: ["mere-vision-5-5-latest"]
  },
  {
    id: "mere-voice-5-5",
    name: "Mere Voice 5.5",
    short: "Voice",
    tier: "Realtime",
    icon: "wave",
    tagline: "Speech in, speech out, under 300 milliseconds.",
    description:
      "A duplex realtime model for spoken conversation. It interrupts gracefully, keeps prosody natural across turns, and exposes the same tool-calling surface as the text models so a voice agent can actually do things.",
    context: 128_000,
    maxOutput: 8_000,
    modes: ["Fast"],
    price: { audioIn: 0.06, audioOut: 0.12, input: 0.6, output: 2.4 },
    latency: "290 ms round trip",
    throughput: "realtime",
    modalities: ["Audio in", "Audio out", "Text", "Tools"],
    releasedAt: "2026-05-14",
    status: "Generally available",
    bestFor: [
      "Voice agents and phone systems",
      "Live translation",
      "Accessibility interfaces",
      "Hands-free field tools"
    ],
    aliases: ["mere-voice-5-5-latest"]
  },
  {
    id: "mere-embed-5-5",
    name: "Mere Embed 5.5",
    short: "Embed",
    tier: "Retrieval",
    icon: "network",
    tagline: "Multilingual embeddings with Matryoshka dimensions.",
    description:
      "A retrieval model trained alongside the Mere X family so that what it retrieves is what Mere X wants to read. Output dimensions are truncatable from 3072 down to 256 with graceful quality decay.",
    context: 32_000,
    maxOutput: 3072,
    modes: [],
    price: { input: 0.03, output: 0 },
    latency: "40 ms / batch of 64",
    throughput: "—",
    modalities: ["Text", "Code"],
    releasedAt: "2026-02-20",
    status: "Generally available",
    bestFor: [
      "Semantic search",
      "RAG pipelines",
      "Deduplication and clustering",
      "Recommendation features"
    ],
    aliases: ["mere-embed-5-5-latest"]
  },
  {
    id: "mere-guard-5-5",
    name: "Mere Guard 5.5",
    short: "Guard",
    tier: "Safety",
    icon: "shield",
    tagline: "The classifier that ships with every request.",
    description:
      "Guard scores inputs and outputs across the Mere X harm taxonomy. It runs free of charge on every API call and is also available as a standalone endpoint so you can apply your own thresholds before content reaches a user.",
    context: 32_000,
    maxOutput: 512,
    modes: [],
    price: { input: 0, output: 0 },
    latency: "60 ms",
    throughput: "—",
    modalities: ["Text", "Images"],
    releasedAt: "2026-01-09",
    status: "Generally available · free",
    bestFor: [
      "Pre- and post-generation filtering",
      "Trust and safety pipelines",
      "Age-appropriate experiences",
      "Compliance evidence"
    ],
    aliases: ["mere-guard-5-5-latest"]
  }
];

export const MODEL_BY_ID = Object.fromEntries(MODELS.map((model) => [model.id, model]));
export const CHAT_MODELS = MODELS.filter((model) => model.modes.length > 0 && model.id !== "mere-guard-5-5");

/* ------------------------------------------------------------
   REASONING MODES — the control users actually feel
   ------------------------------------------------------------ */
export const MODES = [
  {
    name: "Fast",
    key: "fast",
    budget: "0 thinking tokens",
    depth: 0.18,
    latency: "≈ 0.3 s",
    summary: "Answers immediately. No visible deliberation. Best for lookups, formatting, and anything conversational.",
    use: "Chat turns, routing, extraction"
  },
  {
    name: "Medium",
    key: "medium",
    budget: "up to 4K thinking tokens",
    depth: 0.42,
    latency: "≈ 2 s",
    summary: "A short planning pass before answering. Catches most reasoning slips at almost no latency cost.",
    use: "Everyday product traffic"
  },
  {
    name: "High",
    key: "high",
    budget: "up to 32K thinking tokens",
    depth: 0.72,
    latency: "≈ 12 s",
    summary: "Full chain-of-thought with self-checking. The model explores alternatives and discards them before committing.",
    use: "Code, analysis, hard maths"
  },
  {
    name: "DEEP",
    key: "deep",
    budget: "up to 256K thinking tokens",
    depth: 1,
    latency: "minutes to hours",
    summary: "Extended deliberation with tool use, retrieval, and interim checkpoints. Apex only. Returns a reasoning summary alongside the answer.",
    use: "Research, agents, novel problems"
  }
];

/* ------------------------------------------------------------
   CAPABILITIES
   ------------------------------------------------------------ */
export const CAPABILITIES = [
  {
    id: "reasoning",
    icon: "atom",
    name: "Extended reasoning",
    blurb: "Four deliberation depths on one model, selectable per request — from instant replies to hours of structured thought.",
    detail:
      "Mere X separates thinking from answering. You set a thinking budget; the model spends it planning, checking, and revising before a single output token is emitted. Reasoning summaries are returned so you can audit how a conclusion was reached without exposing raw chain-of-thought to end users.",
    bullets: [
      "Per-request thinking budgets from 0 to 256K tokens",
      "Interleaved thinking between tool calls",
      "Auditable reasoning summaries",
      "Deterministic stop reasons for orchestration"
    ]
  },
  {
    id: "tools",
    icon: "plug",
    name: "Tool use & agents",
    blurb: "Parallel function calling, server-side tools, and a loop that stays coherent across hundreds of steps.",
    detail:
      "Define tools as JSON schemas and Mere X decides when to call them — often several at once. Server-side tools for web search, code execution, and file handling run inside Mere X infrastructure, so you do not have to build a sandbox to get an agent working.",
    bullets: [
      "Parallel and sequential tool calls",
      "Server-side web search, code execution, and file tools",
      "Model Context Protocol (MCP) connector support",
      "Long-horizon loops with memory compaction"
    ]
  },
  {
    id: "context",
    icon: "layers",
    name: "Million-token context",
    blurb: "A whole codebase, a deposition, or a year of tickets — held in one window with reliable recall.",
    detail:
      "Apex and Orion accept up to one million tokens. Recall is measured with adversarial multi-needle retrieval across the full window, not just at the edges, and prompt caching makes re-reading the same corpus inexpensive.",
    bullets: [
      "1M token window on Apex and Orion",
      "Multi-needle recall above 99% across the window",
      "Prompt caching at 10% of input price",
      "Automatic context compaction for agent loops"
    ]
  },
  {
    id: "multimodal",
    icon: "image",
    name: "Multimodal in and out",
    blurb: "Text, images, PDFs, charts, screenshots, audio — and image generation from the same interface.",
    detail:
      "Send a 400-page PDF, a photograph of a whiteboard, a UI screenshot, or an audio file in the same message array. Vision 2 also generates and edits images with instruction-level control, and Voice 1 closes the loop for spoken interaction.",
    bullets: [
      "Native PDF parsing with layout preservation",
      "Chart, table, and diagram understanding",
      "Image generation and targeted editing",
      "Realtime speech with sub-300 ms latency"
    ]
  },
  {
    id: "code",
    icon: "code",
    name: "Software engineering",
    blurb: "Repository-scale changes, test authoring, and review that reads like a careful colleague's.",
    detail:
      "Mere X was trained with a heavy emphasis on real engineering workflows: reading unfamiliar code, making minimal correct changes, writing tests that fail for the right reason, and explaining trade-offs rather than listing them.",
    bullets: [
      "Repo-scale edits with patch-format output",
      "Terminal and computer-use tooling",
      "Structured diagnostics and stack-trace reasoning",
      "Mere X Code CLI and IDE extensions"
    ]
  },
  {
    id: "structured",
    icon: "stack",
    name: "Structured output",
    blurb: "Guaranteed-valid JSON against your schema, every time, with no retry loop.",
    detail:
      "Constrained decoding enforces your JSON Schema at the token level. The model cannot emit a response that fails validation, which removes the retry-and-repair layer most applications end up writing.",
    bullets: [
      "JSON Schema constrained decoding",
      "Typed SDK helpers in Python and TypeScript",
      "Citations as first-class structured fields",
      "Streaming partial objects"
    ]
  },
  {
    id: "safety",
    icon: "shield",
    name: "Safety by construction",
    blurb: "Guard classification on every call, refusal behaviour you can tune, and published evaluations.",
    detail:
      "Every request is scored by Mere X Guard across the Mere X harm taxonomy at no cost. Behaviour is documented in a system card per release, and the Responsible Scaling Policy defines what has to be true before a model ships.",
    bullets: [
      "Free Guard classification inline with every call",
      "Configurable refusal thresholds per deployment",
      "Published system cards and evaluations",
      "Zero-retention mode for regulated workloads"
    ]
  },
  {
    id: "deployment",
    icon: "server",
    name: "Deployment options",
    blurb: "Public API, private VPC, regional residency, or fully air-gapped for the workloads that require it.",
    detail:
      "Run on the Mere X API, inside a dedicated tenancy with committed throughput, or in your own cloud region through our partner deployments. Data residency can be pinned to the US, EU, or APAC.",
    bullets: [
      "Shared API with per-key rate limits",
      "Provisioned throughput with latency SLAs",
      "US / EU / APAC data residency",
      "Private VPC and air-gapped installations"
    ]
  }
];

/* ------------------------------------------------------------
   EVALUATIONS — illustrative figures for this build
   ------------------------------------------------------------ */
export const BENCH_SERIES = [
  { key: "apex", label: "Mere Apex 5.5", color: "var(--s1)" },
  { key: "orion", label: "Mere Orion 5.5", color: "var(--s2)" },
  { key: "nyx", label: "Mere Nyx 5.5", color: "var(--s3)" },
  { key: "prev", label: "Mere Apex 5.0", color: "var(--s4)" }
];

export const BENCHMARKS = [
  { name: "Graduate reasoning", detail: "GPQA Diamond · 0-shot", apex: 89.4, orion: 82.1, nyx: 68.3, prev: 78.6 },
  { name: "Agentic coding", detail: "SWE-bench Verified", apex: 81.7, orion: 72.4, nyx: 51.2, prev: 64.9 },
  { name: "Competition maths", detail: "AIME 2026", apex: 94.2, orion: 86.5, nyx: 63.8, prev: 79.1 },
  { name: "Agentic tool use", detail: "TAU-bench retail", apex: 87.9, orion: 79.8, nyx: 60.4, prev: 71.2 },
  { name: "Long-context recall", detail: "MRCR 8-needle @ 1M", apex: 99.1, orion: 97.4, nyx: 91.0, prev: 88.3 },
  { name: "Multilingual", detail: "MMMLU · 22 languages", apex: 92.6, orion: 88.9, nyx: 79.5, prev: 85.4 },
  { name: "Visual reasoning", detail: "MMMU validation", apex: 84.3, orion: 76.6, nyx: 62.1, prev: 70.8 },
  { name: "Instruction following", detail: "IFEval strict", apex: 95.8, orion: 93.1, nyx: 87.6, prev: 90.2 }
];

export const SAFETY_EVALS = [
  { name: "Harmless refusal accuracy", value: 0.994, note: "Correctly refuses genuinely harmful requests" },
  { name: "Over-refusal rate", value: 0.008, note: "Refuses benign requests — lower is better", invert: true },
  { name: "Jailbreak resistance", value: 0.971, note: "Held against a red-team suite of 41K adversarial prompts" },
  { name: "Factual grounding with citations", value: 0.962, note: "Claims traceable to a retrieved source" },
  { name: "Bias evaluation (BBQ ambiguous)", value: 0.981, note: "Neutral answer selected under ambiguity" }
];

/* ------------------------------------------------------------
   PRICING
   ------------------------------------------------------------ */
export const PRICING_NOTES = [
  { label: "Batch API", value: "50% off input and output", detail: "24-hour turnaround for non-interactive work" },
  { label: "Prompt caching", value: "Write 1.25× · Read 0.10×", detail: "Cached prefixes live for 5 minutes, or 1 hour on request" },
  { label: "Guard classification", value: "Free", detail: "Runs inline on every request" },
  { label: "Long context", value: "Standard rate to 1M", detail: "No premium tier above 200K tokens" }
];

export const CONSUMER_PLANS = [
  {
    name: "Free",
    price: 0,
    cadence: "forever",
    summary: "A calm place to start with Mere X's everyday intelligence.",
    features: ["Mere Nyx 5.5 and limited Mere Orion 5.5", "Fast and Medium reasoning", "Personal workspace and projects", "Web search"],
    cta: "Start free"
  },
  {
    name: "Starter",
    price: 9.99,
    cadence: "30 days",
    summary: "More room for writing, files, and daily focused work.",
    features: ["Full Mere Orion 5.5 access", "File and image tools", "Expanded project limits", "Plugin connectors"],
    cta: "Choose Starter"
  },
  {
    name: "Plus",
    price: 19.99,
    cadence: "30 days",
    featured: true,
    summary: "Deeper thinking and higher limits across the workspace.",
    features: ["Mere Apex 5.5 access", "DEEP reasoning mode", "Memory across conversations", "Canvas and deep research"],
    cta: "Choose Plus"
  },
  {
    name: "Pro",
    price: 39.99,
    cadence: "30 days",
    summary: "Advanced research and priority access for demanding work.",
    features: ["Priority capacity on Mere Apex 5.5", "Extended DEEP budgets", "Mere X Code CLI", "Early access to new models"],
    cta: "Choose Pro"
  },
  {
    name: "Max",
    price: 79.99,
    cadence: "30 days",
    summary: "The highest individual limits we offer.",
    features: ["Highest DEEP budgets", "Longest agent runs", "Realtime voice", "Priority support"],
    cta: "Choose Max"
  },
  {
    name: "Business",
    price: 149,
    cadence: "month",
    plus: true,
    summary: "For teams that need shared context and administration.",
    features: ["Shared projects and knowledge", "SSO and SCIM", "Admin controls and audit logs", "Zero-retention option"],
    cta: "Talk to sales"
  }
];

/* ------------------------------------------------------------
   MODEL LIFECYCLE
   ------------------------------------------------------------ */
export const LIFECYCLE = [
  { model: "mere-apex-5-5", released: "2026-06-18", deprecates: "—", retires: "—", state: "Current" },
  { model: "mere-orion-5-5", released: "2026-06-18", deprecates: "—", retires: "—", state: "Current" },
  { model: "mere-nyx-5-5", released: "2026-06-18", deprecates: "—", retires: "—", state: "Current" },
  { model: "mere-x-3-5-apex", released: "2025-11-04", deprecates: "2026-12-18", retires: "2027-03-18", state: "Legacy" },
  { model: "mere-x-3-5-orion", released: "2025-11-04", deprecates: "2026-12-18", retires: "2027-03-18", state: "Legacy" },
  { model: "mere-x-3-nyx", released: "2025-05-22", deprecates: "2026-05-22", retires: "2026-11-22", state: "Deprecated" }
];
