/* ============================================================
   CONTENT — publications, news, careers, customers, changelog,
   connectors, status, recipes, prompts, FAQ
   ============================================================ */

export const PUBLICATIONS = [
  {
    slug: "reasoning-budgets",
    date: "2026-06-18",
    kind: "Technical report",
    title: "Reasoning budgets: separating deliberation from answering",
    summary:
      "We describe the training and inference changes that let a single model spend anywhere from zero to 256,000 tokens thinking before it responds, and what that buys on eight capability suites.",
    tags: ["Reasoning", "Mere Apex 4", "Inference"],
    authors: "Adeyemi, Vantrop, Ghorbani, and 14 others"
  },
  {
    slug: "million-token-recall",
    date: "2026-05-30",
    kind: "Paper",
    title: "Recall does not decay: adversarial retrieval across a million tokens",
    summary:
      "Standard needle-in-a-haystack tests overstate long-context ability. We introduce an eight-needle adversarial variant with distractors that share surface form with the target, and report where Mere Code still fails.",
    tags: ["Long context", "Evaluation"],
    authors: "Park, Nadar, Weiss"
  },
  {
    slug: "circuit-tracing",
    date: "2026-04-22",
    kind: "Interpretability",
    title: "Circuit tracing in a production-scale model",
    summary:
      "Attribution graphs over Mere Orion 3 reveal reusable computational motifs for arithmetic, entity binding, and refusal. We release the tracing tooling and 1,400 annotated circuits.",
    tags: ["Interpretability", "Open tooling"],
    authors: "Adeyemi, Okafor, Lindqvist, and 9 others"
  },
  {
    slug: "refusal-geometry",
    date: "2026-03-11",
    kind: "Interpretability",
    title: "The geometry of refusal",
    summary:
      "Refusal behaviour in Mere X concentrates along a small number of directions in residual space. We show these directions are steerable, which is both a safety tool and a jailbreak surface.",
    tags: ["Interpretability", "Safety"],
    authors: "Adeyemi, Lindqvist"
  },
  {
    slug: "agent-horizons",
    date: "2026-02-06",
    kind: "Paper",
    title: "Agent horizons: what breaks after step two hundred",
    summary:
      "An empirical study of long-horizon agent failure. Most collapses are not reasoning failures but context management failures — and they are fixable with compaction policies rather than bigger models.",
    tags: ["Agents", "Evaluation"],
    authors: "Ghorbani, Oyelaran, Park"
  },
  {
    slug: "eval-honesty",
    date: "2025-12-15",
    kind: "Position",
    title: "Against benchmark theatre",
    summary:
      "Our position on how evaluation results should be reported: contamination checks, variance bands, the prompts used, and the tasks the model still cannot do.",
    tags: ["Evaluation", "Policy"],
    authors: "Lindqvist, Vantrop"
  },
  {
    slug: "guard-taxonomy",
    date: "2025-11-04",
    kind: "Technical report",
    title: "The Mere X harm taxonomy and Guard 1",
    summary:
      "How we define categories of harm, how the Guard classifier is trained against them, and the disagreement rates we see between Guard and expert human raters.",
    tags: ["Safety", "Classifiers"],
    authors: "Lindqvist, Watanabe, and 7 others"
  },
  {
    slug: "sparse-routing",
    date: "2025-08-19",
    kind: "Paper",
    title: "Sparse routing without the load-balancing tax",
    summary:
      "A routing formulation that keeps expert utilisation even without auxiliary losses, cutting training instability at the scales where mixture-of-experts models usually become unpleasant.",
    tags: ["Architecture", "Training"],
    authors: "Ghorbani, Weiss, and 11 others"
  }
];

export const RESEARCH_AREAS = [
  {
    icon: "atom",
    title: "Reasoning",
    body: "How does a model decide to think longer, and what does the extra computation actually buy? We study deliberation as a controllable resource rather than an emergent accident."
  },
  {
    icon: "microscope",
    title: "Interpretability",
    body: "Attribution graphs, feature dictionaries, and circuit tracing at production scale. If we cannot say why a model produced an output, we treat that as an open bug."
  },
  {
    icon: "target",
    title: "Alignment",
    body: "Training systems whose behaviour under pressure matches what we intended under calm. Includes reward design, honesty under uncertainty, and resistance to specification gaming."
  },
  {
    icon: "gauge",
    title: "Evaluation",
    body: "Measurement is the bottleneck. We build adversarial suites, contamination detectors, and human-rater protocols, and we publish where our own measurements disagree."
  },
  {
    icon: "cpu",
    title: "Systems",
    body: "Training and inference at the scale where engineering decisions become research decisions: routing, quantisation, kernel design, and the economics of a million-token window."
  },
  {
    icon: "users",
    title: "Societal impact",
    body: "Labour effects, access, language coverage, and the second-order consequences of deploying capable systems into institutions that were not designed for them."
  }
];

export const NEWS = [
  { date: "2026-08-28", kind: "Product", title: "Batch API now supports one million requests per job", summary: "Large offline workloads no longer need chunking. Batch jobs accept up to a million requests and stream results as they complete." },
  { date: "2026-08-12", kind: "Company", title: "Mere X opens an engineering office in Tbilisi", summary: "Our fifth office, focused on inference systems and the developer platform." },
  { date: "2026-07-30", kind: "Safety", title: "Mere Code system card, second revision", summary: "Updated with post-launch evaluation data, three newly discovered failure modes, and the mitigations shipped for each." },
  { date: "2026-07-14", kind: "Product", title: "Plan mode and project rules", summary: "Plan mode proposes steps before touching a file, and rules in AGENTS.md or MERE.md are read at the start of every turn." },
  { date: "2026-06-18", kind: "Product", title: "Mere Apex 4, Orion 3 and Nyx 2 are here", summary: "Three lines, three generations, shipped together inside Mere Code with a million-token window and Extra High thinking." },
  { date: "2026-05-14", kind: "Product", title: "Checkpoints and per-hunk review", summary: "Every prompt becomes a restore point, and every changed file can be accepted or reverted hunk by hunk in the editor." },
  { date: "2026-04-22", kind: "Research", title: "We are releasing our circuit-tracing tooling", summary: "The attribution-graph tooling behind our interpretability work is now open source, with 1,400 annotated circuits." },
  { date: "2026-03-03", kind: "Company", title: "Series C: $1.4B to scale training and safety", summary: "The round funds our next training cluster and doubles the size of the evaluation organisation." }
];

export const CUSTOMERS = [
  { name: "Northwind Health", sector: "Healthcare", quote: "Clinical documentation that used to take our physicians ninety minutes a day now takes eleven. The part that mattered was Mere X knowing when to leave a field blank.", person: "Dr. Marta Kovač, Chief Medical Information Officer", metric: "87%", metricLabel: "reduction in documentation time" },
  { name: "Aster Financial", sector: "Financial services", quote: "We run every draft disclosure through Apex in Extra High mode before it reaches counsel. It has caught inconsistencies our own review process missed for years.", person: "Julian Reyes, Head of Regulatory Reporting", metric: "3.2×", metricLabel: "faster filing cycle" },
  { name: "Helios Robotics", sector: "Manufacturing", quote: "We pointed the agent at a firmware repository nobody wanted to touch. It read the whole thing before it changed a line, and the diff was smaller than ours would have been.", person: "Anke Lindholm, VP Engineering", metric: "94%", metricLabel: "schematic extraction accuracy" },
  { name: "Larkspur Legal", sector: "Legal", quote: "A million tokens means the whole matter fits. No chunking strategy, no retrieval tuning, no arguing about what got left out.", person: "Devon Marsh, Partner", metric: "1M", metricLabel: "token matters, single pass" },
  { name: "Quillon Media", sector: "Media", quote: "Nyx sits in the editing surface and never makes anyone wait. Orion does the heavy passes overnight on the Batch API at half price.", person: "Ravi Chandrasekar, CTO", metric: "$0.31", metricLabel: "cost per finished article" },
  { name: "Orbital Freight", sector: "Logistics", quote: "The agent stack handles exception routing end to end — reads the email, checks the manifest, calls the carrier API, and escalates when it genuinely should.", person: "Ingrid Halvorsen, Director of Operations", metric: "61%", metricLabel: "exceptions resolved without a human" }
];

export const CAREERS = [
  { title: "Research Scientist, Interpretability", team: "Research", location: "San Francisco", type: "Full-time", level: "Senior" },
  { title: "Research Scientist, Reasoning", team: "Research", location: "San Francisco · London", type: "Full-time", level: "Senior" },
  { title: "Research Engineer, Evaluation", team: "Safety", location: "London", type: "Full-time", level: "Mid–Senior" },
  { title: "Member of Technical Staff, Inference", team: "Systems", location: "San Francisco · Tbilisi", type: "Full-time", level: "Senior" },
  { title: "Member of Technical Staff, Training Infrastructure", team: "Systems", location: "San Francisco", type: "Full-time", level: "Staff" },
  { title: "Software Engineer, Developer Platform", team: "Product", location: "Tbilisi · Remote (EU)", type: "Full-time", level: "Mid–Senior" },
  { title: "Software Engineer, Mere Code", team: "Product", location: "San Francisco · Remote (US)", type: "Full-time", level: "Mid–Senior" },
  { title: "Design Engineer", team: "Product", location: "Remote (EU/US)", type: "Full-time", level: "Senior" },
  { title: "Red Team Lead", team: "Safety", location: "London", type: "Full-time", level: "Staff" },
  { title: "Policy Manager, EU", team: "Policy", location: "Zürich", type: "Full-time", level: "Senior" },
  { title: "Solutions Architect", team: "Go-to-market", location: "Tokyo", type: "Full-time", level: "Senior" },
  { title: "Technical Writer, API", team: "Product", location: "Remote (Global)", type: "Full-time", level: "Mid" },
  { title: "Research Resident, 2027 cohort", team: "Research", location: "San Francisco", type: "12-month residency", level: "Early career" },
  { title: "Security Engineer, Infrastructure", team: "Security", location: "San Francisco · Remote (US)", type: "Full-time", level: "Senior" }
];

export const BENEFITS = [
  { icon: "heart", title: "Health, fully covered", body: "Medical, dental, and vision for you and your dependents, in every country we operate in." },
  { icon: "clock", title: "Time that is actually yours", body: "Unlimited leave with a four-week minimum we enforce, and a company-wide week off in December." },
  { icon: "graduation", title: "Learning budget", body: "$12,000 a year for conferences, courses, hardware, or a sabbatical term at a university." },
  { icon: "users", title: "Parental leave", body: "Twenty-six weeks at full pay for any parent, plus a phased return over the following quarter." },
  { icon: "globe", title: "Relocation and visas", body: "We sponsor visas in all five office locations and cover relocation end to end." },
  { icon: "box", title: "Equity for everyone", body: "Every employee holds equity. We publish the bands and the strike price methodology internally." }
];

export const CHANGELOG = [
  { date: "2026-08-28", version: "API", items: [
    { kind: "added", text: "Batch jobs now accept up to 1,000,000 requests, with incremental result streaming." },
    { kind: "added", text: "`thinking.summary` returns a structured reasoning summary for Extra High requests." },
    { kind: "changed", text: "Rate-limit headers now include `mere-x-ratelimit-tokens-reset` as an RFC 3339 timestamp." }
  ]},
  { date: "2026-08-14", version: "SDKs", items: [
    { kind: "added", text: "Python and TypeScript SDKs ship a `tool_runner` helper that drives the agent loop for you." },
    { kind: "fixed", text: "Streaming reconnection no longer duplicates the final content block on flaky networks." }
  ]},
  { date: "2026-07-30", version: "Models", items: [
    { kind: "added", text: "`mere-apex-4-20260730` — improved instruction adherence in long tool-use chains." },
    { kind: "changed", text: "Guard 1 taxonomy updated with two new subcategories under `deception`." }
  ]},
  { date: "2026-07-14", version: "Console", items: [
    { kind: "added", text: "Per-key spend limits and usage alerts." },
    { kind: "added", text: "Request logs with full prompt and response inspection, subject to your retention setting." },
    { kind: "changed", text: "Usage charts now break down by key as well as by model." }
  ]},
  { date: "2026-06-18", version: "Mere Apex 4 · Orion 3 · Nyx 2", items: [
    { kind: "added", text: "Mere Apex 4, Orion, and Nyx are generally available." },
    { kind: "added", text: "One-million-token context on Apex and Orion." },
    { kind: "added", text: "Extra High reasoning mode with budgets up to 256K thinking tokens." },
    { kind: "added", text: "Server-side tools: web search, code execution, and file handling." },
    { kind: "deprecated", text: "Mere 5.0 models enter legacy support; retirement 18 March 2027." }
  ]},
  { date: "2026-05-14", version: "Voice", items: [
    { kind: "added", text: "Checkpoints, per-hunk review and project rules files ship in Mere Code." }
  ]}
];

export const STATUS_SERVICES = [
  { name: "Messages API", state: "operational", uptime: 99.99 },
  { name: "Batch API", state: "operational", uptime: 99.97 },
  { name: "Embeddings", state: "operational", uptime: 100 },
  { name: "Images", state: "operational", uptime: 99.94 },
  { name: "Realtime voice", state: "degraded", uptime: 99.61 },
  { name: "Developer console", state: "operational", uptime: 99.98 },
  { name: "Mere Code", state: "operational", uptime: 99.96 }
];

export const STATUS_INCIDENTS = [
  { date: "2026-08-29", title: "Elevated latency on realtime voice sessions in eu-west", state: "monitoring", body: "A capacity imbalance in eu-west is producing higher session-setup latency. Traffic has been rebalanced and we are monitoring for recovery." },
  { date: "2026-08-11", title: "Batch results delayed up to 90 minutes", state: "resolved", body: "A queue-partition rebalance delayed result delivery for jobs submitted between 09:20 and 11:40 UTC. No results were lost." },
  { date: "2026-07-22", title: "Console sign-in failures", state: "resolved", body: "An expired intermediate certificate on the identity service caused sign-in failures for 18 minutes. Certificate rotation is now automated." }
];

export const CONNECTORS = [
  { group: "Communication", items: ["Gmail", "Outlook", "Slack", "Teams", "Discord", "Telegram", "Intercom", "Zoom"] },
  { group: "Productivity", items: ["Notion", "Linear", "Jira", "Asana", "Trello", "Todoist", "Confluence", "Monday"] },
  { group: "Storage & docs", items: ["Google Drive", "Dropbox", "Box", "SharePoint", "OneDrive", "S3"] },
  { group: "Developer", items: ["GitHub", "GitLab", "Sentry", "Docker", "Vercel", "Cloudflare", "Snyk", "PagerDuty"] },
  { group: "Data", items: ["Snowflake", "BigQuery", "Databricks", "Postgres", "Supabase", "Looker", "dbt"] },
  { group: "Business", items: ["Salesforce", "HubSpot", "Stripe", "Shopify", "Zendesk", "ServiceNow", "NetSuite", "Workday"] },
  { group: "Design & media", items: ["Figma", "Canva", "Adobe", "Miro", "Framer", "Spotify"] },
  { group: "Analytics", items: ["Amplitude", "PostHog", "Google Analytics", "Mixpanel", "Segment"] }
];

export const RECIPES = [
  { slug: "streaming-chat", icon: "chat", title: "Streaming chat with tool use", time: "10 min", level: "Beginner", summary: "A complete chat loop: stream tokens, handle a tool call mid-stream, and resume." , langs: ["Python", "TypeScript"] },
  { slug: "structured-extraction", icon: "stack", title: "Guaranteed-valid structured extraction", time: "8 min", level: "Beginner", summary: "Pull typed records out of messy documents using JSON Schema constrained decoding.", langs: ["Python", "TypeScript"] },
  { slug: "rag-citations", icon: "book", title: "RAG with real citations", time: "20 min", level: "Intermediate", summary: "Embed with Embed 3, retrieve, and return answers where every claim points at a source span.", langs: ["Python"] },
  { slug: "long-context", icon: "layers", title: "Working a million-token corpus", time: "15 min", level: "Intermediate", summary: "Load an entire repository or case file, cache the prefix, and query it cheaply.", langs: ["Python", "TypeScript"] },
  { slug: "agent-loop", icon: "orbit", title: "A durable agent loop", time: "35 min", level: "Advanced", summary: "Long-horizon agents with context compaction, checkpoints, and resumption after failure.", langs: ["Python", "TypeScript"] },
  { slug: "batch-pipeline", icon: "package", title: "Half-price batch pipelines", time: "12 min", level: "Intermediate", summary: "Classify a million records overnight and stream results back as they finish.", langs: ["Python"] },
  { slug: "vision-documents", icon: "image", title: "Reading scanned documents", time: "14 min", level: "Intermediate", summary: "Feed PDFs and photographs to Iris and get back structured, layout-aware output.", langs: ["Python", "TypeScript"] },
  { slug: "voice-agent", icon: "wave", title: "A voice agent that can act", time: "40 min", level: "Advanced", summary: "Realtime speech with interruption handling and the same tool schema as your text agent.", langs: ["TypeScript"] },
  { slug: "evals", icon: "gauge", title: "Evaluating your own prompts", time: "25 min", level: "Intermediate", summary: "Build a small eval harness with Mere X as a graded judge, and keep it honest.", langs: ["Python"] }
];

export const PROMPT_PATTERNS = [
  { title: "Role, task, constraints, format", body: "State who the model is, what it is doing, what it must not do, and the exact shape of the output — in that order. Mere X weights later instructions slightly higher, so put the format last.", tag: "Structure" },
  { title: "Give the model an out", body: "Explicitly allow \"I don't know\" or an empty field. Models confabulate most when every path except answering has been closed off.", tag: "Honesty" },
  { title: "Examples beat adjectives", body: "Two worked examples move behaviour further than a paragraph describing the tone you want. Include one edge case among them.", tag: "Few-shot" },
  { title: "Put the corpus first, the question last", body: "With prompt caching, a stable prefix is cheap to re-read. Documents at the top, instruction at the bottom, cache breakpoint in between.", tag: "Long context" },
  { title: "Budget the thinking, not the words", body: "Instead of 'think step by step', set `thinking.budget_tokens`. It is more reliable and it does not leak deliberation into the answer.", tag: "Reasoning" },
  { title: "Name the failure you fear", body: "\"If the contract does not specify a governing law, return null rather than inferring one\" prevents the specific error you are worried about.", tag: "Precision" }
];

export const FAQ = [
  { q: "Do you train on data sent through the API?", a: "No. API inputs and outputs are never used to train Mere X models. Mere X conversations are also excluded by default; contributing them is opt-in and revocable, and revoking removes the data from future training runs." },
  { q: "How long is data retained?", a: "Thirty days by default, for abuse monitoring and debugging, then deleted. Zero-retention mode is available on request for eligible organisations and removes storage entirely — nothing is written to disk beyond the life of the request." },
  { q: "What happens when a model is deprecated?", a: "We announce deprecation at least six months before retirement, keep the model serving throughout that window, and publish a migration guide with behavioural diffs. Pinned snapshot IDs never change behaviour underneath you." },
  { q: "Can I run Mere X in my own environment?", a: "Enterprise customers can deploy into a dedicated tenancy with committed throughput, or into a private VPC in a supported cloud region. Fully air-gapped installations are available for a small number of workloads under separate agreement." },
  { q: "How do rate limits work?", a: "Limits are per organisation, expressed in requests per minute and tokens per minute, and rise automatically with usage history across five tiers. Every response carries headers describing your remaining budget and reset time." },
  { q: "What is the difference between the modes and the models?", a: "The model decides how capable the underlying system is; the mode decides how long it deliberates. A Orion request in High mode often beats a Apex request in Fast mode, and costs less." },
  { q: "Is there a free tier for developers?", a: "Yes. New organisations receive $10 in credit, and Guard classification is free on every request regardless of plan. Nyx is inexpensive enough that most prototypes never exhaust the initial credit." },
  { q: "How do you handle copyright and attribution?", a: "Server-side web search returns citations with every claim, and the API surfaces them as structured fields. We also honour publisher opt-outs and maintain a takedown process documented in the trust centre." }
];

export const SECURITY_CERTS = [
  { name: "SOC 2 Type II", detail: "Audited annually; report available under NDA", icon: "shield" },
  { name: "ISO 27001", detail: "Information security management", icon: "lock" },
  { name: "ISO 42001", detail: "AI management systems", icon: "atom" },
  { name: "HIPAA", detail: "BAA available for eligible workloads", icon: "heart" },
  { name: "GDPR", detail: "EU data residency and DPA", icon: "globe" },
  { name: "CSA STAR", detail: "Level 2 attestation", icon: "cloud" }
];
