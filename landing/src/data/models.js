/* ============================================================
   MODELS — the Mere X family: specs, capabilities, pricing,
   evaluation results and the reasoning-mode system.

   Mere X and Mere X are a design build. Evaluation figures
   below are illustrative and labelled as such wherever shown.
   ============================================================ */

export const GENERATION = "Mere Studio";
export const KNOWLEDGE_CUTOFF = "June 2026";

export const MODELS = [
  {
    id: "mere-4-2-peak",
    name: "Mere 4.2 Peak",
    short: "Peak",
    tier: "Frontier",
    icon: "atom",
    flagship: true,
    tagline: "Our most capable model. Built for the refactor that has to be right the first time.",
    description:
      "4.2 Peak is the frontier of the Mere family. It plans before it edits, holds a large codebase in view across hundreds of tool calls, and is the model to reach for when a task spans many files, an unfamiliar framework, or a bug nobody has been able to reproduce.",
    context: 1_000_000,
    maxOutput: 128_000,
    modes: ["Fast", "Medium", "High", "Extra High"],
    price: { input: 4.5, output: 22.5, cacheWrite: 5.63, cacheRead: 0.45, batch: 0.5 },
    latency: "1.9 s median first token",
    throughput: "78 tok/s",
    modalities: ["Code", "Text", "Screenshots", "Tools"],
    releasedAt: "2026-09-10",
    status: "Generally available",
    bestFor: [
      "Multi-hour agentic refactors",
      "Debugging across services",
      "Migrations between frameworks",
      "Reviews where a miss is expensive"
    ],
    aliases: ["mere-4-2-peak-latest", "mere-4-2-peak-20260910"]
  },
  {
    id: "mere-4-2-core",
    name: "Mere 4.2 Core",
    short: "Core",
    tier: "Balanced",
    icon: "layers",
    tagline: "The daily driver. Near-frontier quality at the speed of an editor.",
    description:
      "4.2 Core is the model most work should run on. It matches Peak on the majority of everyday engineering at roughly a quarter of the cost, keeps the same million-token window, and is fast enough to sit in a tight loop of edits, reads and re-reads without the person waiting.",
    context: 1_000_000,
    maxOutput: 64_000,
    modes: ["Fast", "Medium", "High"],
    price: { input: 1.1, output: 5.5, cacheWrite: 1.38, cacheRead: 0.11, batch: 0.5 },
    latency: "0.8 s median first token",
    throughput: "142 tok/s",
    modalities: ["Code", "Text", "Screenshots", "Tools"],
    releasedAt: "2026-09-10",
    status: "Generally available",
    bestFor: [
      "Feature work and bug fixes",
      "Tests and documentation",
      "Code review and explanation",
      "Working through a backlog"
    ],
    aliases: ["mere-4-2-core-latest", "mere-4-2-core-20260910"]
  },
  {
    id: "mere-4-0-lite",
    name: "Mere 4.0 Lite",
    short: "Lite",
    tier: "Fast",
    icon: "bolt",
    tagline: "Instant. For the edit you could almost type yourself.",
    description:
      "4.0 Lite answers before you have finished reading the prompt. It is tuned for the quick layer of engineering: renames, small fixes, inline edits, completions, quick questions about a file, and the thousand small calls that make the workspace feel alive.",
    context: 400_000,
    maxOutput: 32_000,
    modes: ["Fast", "Medium"],
    price: { input: 0.22, output: 1.1, cacheWrite: 0.28, cacheRead: 0.022, batch: 0.5 },
    latency: "0.21 s median first token",
    throughput: "310 tok/s",
    modalities: ["Code", "Text", "Tools"],
    releasedAt: "2026-09-10",
    status: "Generally available",
    bestFor: [
      "Inline edits and completions",
      "Quick questions about a file",
      "Renames and mechanical changes",
      "High-volume automation"
    ],
    aliases: ["mere-4-0-lite-latest", "mere-4-0-lite-20260910"]
  }
];

export const MODEL_BY_ID = Object.fromEntries(MODELS.map((model) => [model.id, model]));
export const CHAT_MODELS = MODELS.filter((model) => model.modes.length > 0);

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
    summary: "Answers immediately. No visible deliberation. Best for renames, small fixes and quick questions about a file.",
    use: "Inline edits, quick questions"
  },
  {
    name: "Medium",
    key: "medium",
    budget: "up to 4K thinking tokens",
    depth: 0.42,
    latency: "≈ 2 s",
    summary: "A short planning pass before acting. Catches most slips at almost no latency cost.",
    use: "Everyday changes"
  },
  {
    name: "High",
    key: "high",
    budget: "up to 32K thinking tokens",
    depth: 0.72,
    latency: "≈ 12 s",
    summary: "Full chain-of-thought with self-checking. The model explores alternatives and discards them before it edits.",
    use: "Multi-file work, debugging"
  },
  {
    name: "Extra High",
    key: "extra-high",
    budget: "up to 256K thinking tokens",
    depth: 1,
    latency: "minutes to hours",
    summary: "Extended deliberation with tool use, retrieval and interim checkpoints. Peak only. Returns a reasoning summary alongside the work.",
    use: "Refactors, migrations, novel problems"
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
      "Peak and Core accept up to one million tokens. Recall is measured with adversarial multi-needle retrieval across the full window, not just at the edges, and prompt caching makes re-reading the same corpus inexpensive.",
    bullets: [
      "1M token window on Peak and Core",
      "Multi-needle recall above 99% across the window",
      "Prompt caching at 10% of input price",
      "Automatic context compaction for agent loops"
    ]
  },
  {
    id: "context-tools",
    icon: "terminal",
    name: "Built for tools",
    blurb: "Hundreds of tool calls in one turn, with the reasoning carried across every one of them.",
    detail:
      "The models were trained on long agentic runs: listing, searching, reading and editing files in sequence, checking their own work, and stopping to ask when the task is ambiguous. Screenshots and reference documents ride along in the same message.",
    bullets: [
      "Parallel tool calls when reads are independent",
      "Encrypted reasoning carried between rounds",
      "Screenshots and PDFs as input",
      "Calibrated stopping when a task is unclear"
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
      "Mere Studio CLI and IDE extensions"
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
    blurb: "Our cloud, a dedicated tenancy, your own region, or fully air-gapped for the workloads that require it.",
    detail:
      "Run on the Mere X API, inside a dedicated tenancy with committed throughput, or in your own cloud region through our partner deployments. Data residency can be pinned to the US, EU, or APAC.",
    bullets: [
      "Shared capacity with per-account limits",
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
  { key: "apex", label: "Mere 4.2 Peak", color: "var(--s1)" },
  { key: "orion", label: "Mere 4.2 Core", color: "var(--s2)" },
  { key: "nyx", label: "Mere 4.0 Lite", color: "var(--s3)" },
  { key: "prev", label: "Mere 3.8 Peak", color: "var(--s4)" }
];

export const BENCHMARKS = [
  { name: "Agentic coding", detail: "SWE-bench Verified", apex: 81.7, orion: 72.4, nyx: 51.2, prev: 64.9 },
  { name: "Repository editing", detail: "Aider polyglot", apex: 88.2, orion: 79.6, nyx: 58.4, prev: 71.3 },
  { name: "Terminal tasks", detail: "Terminal-Bench 2", apex: 66.5, orion: 55.1, nyx: 31.8, prev: 43.9 },
  { name: "Graduate reasoning", detail: "GPQA Diamond · 0-shot", apex: 89.4, orion: 82.1, nyx: 68.3, prev: 78.6 },
  { name: "Competition maths", detail: "AIME 2026", apex: 94.2, orion: 86.5, nyx: 63.8, prev: 79.1 },
  { name: "Agentic tool use", detail: "TAU-bench retail", apex: 87.9, orion: 79.8, nyx: 60.4, prev: 71.2 },
  { name: "Long-context recall", detail: "MRCR 8-needle @ 1M", apex: 99.1, orion: 97.4, nyx: 91.0, prev: 88.3 },
  { name: "Multilingual", detail: "MMMLU · 22 languages", apex: 92.6, orion: 88.9, nyx: 79.5, prev: 85.4 },
  { name: "Instruction following", detail: "IFEval strict", apex: 95.8, orion: 93.1, nyx: 87.6, prev: 90.2 }
];

export const SAFETY_EVALS = [
  { name: "Harmless refusal accuracy", value: 0.994, note: "Correctly refuses genuinely harmful requests" },
  { name: "Over-refusal rate", value: 0.008, note: "Refuses benign requests — lower is better", invert: true },
  { name: "Jailbreak resistance", value: 0.971, note: "Held against a red-team suite of 41K adversarial prompts" },
  { name: "Factual grounding with citations", value: 0.962, note: "Claims traceable to a retrieved source" },
  { name: "Bias evaluation (BBQ ambiguous)", value: 0.981, note: "Neutral answer selected under ambiguity" }
];

export const CONSUMER_PLANS = [
  {
    name: "Free",
    price: 0,
    cadence: "forever",
    summary: "Try the agent on a real project, no card required.",
    features: ["Mere 4.0 Lite", "Fast and Medium thinking", "15 agent turns per 5 hours", "Local folders and browser projects"],
    cta: "Start free"
  },
  {
    name: "Starter",
    price: 9.99,
    cadence: "30 days",
    summary: "Room for a side project or a small team's daily fixes.",
    features: ["Mere 4.0 Lite and 4.2 Core", "Fast, Medium and High thinking", "80 agent turns per 5 hours", "Web search for docs"],
    cta: "Choose Starter"
  },
  {
    name: "Plus",
    price: 19.99,
    cadence: "30 days",
    featured: true,
    summary: "The full lineup and the deepest thinking.",
    features: ["Mere 4.2 Peak", "Extra High thinking", "160 agent turns per 5 hours", "GitHub, Linear and Figma integrations"],
    cta: "Choose Plus"
  },
  {
    name: "Pro",
    price: 39.99,
    cadence: "30 days",
    summary: "For engineers who run the agent all day.",
    features: ["Priority capacity on 4.2 Peak", "320 agent turns per 5 hours", "Longest Extra High budgets", "Early access to new models"],
    cta: "Choose Pro"
  },
  {
    name: "Max",
    price: 79.99,
    cadence: "30 days",
    summary: "The highest individual limits we offer.",
    features: ["800 agent turns per 5 hours", "Longest agent runs", "Priority support", "Everything in Pro"],
    cta: "Choose Max"
  },
  {
    name: "Business",
    price: 149,
    cadence: "month",
    plus: true,
    summary: "For teams that need shared rules and administration.",
    features: ["Shared project rules", "SSO and SCIM", "Admin controls and audit logs", "Zero-retention option"],
    cta: "Talk to sales"
  }
];

/* ------------------------------------------------------------
   MODEL LIFECYCLE
   ------------------------------------------------------------ */
export const LIFECYCLE = [
  { model: "mere-4-2-peak", released: "2026-09-10", deprecates: "—", retires: "—", state: "Current" },
  { model: "mere-4-2-core", released: "2026-09-10", deprecates: "—", retires: "—", state: "Current" },
  { model: "mere-4-0-lite", released: "2026-09-10", deprecates: "—", retires: "—", state: "Current" },
  { model: "mere-3-8-peak", released: "2026-02-12", deprecates: "2026-12-18", retires: "2027-03-18", state: "Legacy" },
  { model: "mere-3-8-core", released: "2026-02-12", deprecates: "2026-12-18", retires: "2027-03-18", state: "Legacy" },
  { model: "mere-3-5-lite", released: "2025-09-30", deprecates: "2026-09-30", retires: "2027-01-30", state: "Deprecated" }
];
