/* ============================================================
   SITE — navigation map, company facts, footer
   ============================================================ */

export const COMPANY = {
  name: "Mere X",
  founded: 2023,
  hq: "San Francisco, California",
  offices: ["San Francisco", "London", "Zürich", "Tokyo", "Tbilisi"],
  people: 640,
  researchers: 210,
  tagline: "Building intelligence that advances humanity.",
  mission:
    "Mere X exists to make advanced AI a dependable part of human work — capable enough to matter, and understood well enough to trust.",
  model: "Mere X",
  email: "hello@mere-x.com",
  press: "press@mere-x.com",
  security: "security@mere-x.com",
  support: "support@mere-x.com"
};

export const NAV = [
  {
    id: "research",
    label: "Research",
    href: "/research",
    panelWide: false,
    links: [
      { title: "Research overview", href: "/research", desc: "How we work and what we are pursuing", icon: "flask" },
      { title: "Publications", href: "/research/publications", desc: "Papers, technical reports, and notes", icon: "book" },
      { title: "Interpretability", href: "/research/interpretability", desc: "Reading what a model is actually doing", icon: "microscope" },
      { title: "Alignment", href: "/research/alignment", desc: "Making capable systems behave as intended", icon: "target" },
      { title: "Evaluations", href: "/research/evaluations", desc: "How we measure capability and harm", icon: "gauge" },
      { title: "Residency & fellows", href: "/research/residency", desc: "Come do a year of research with us", icon: "graduation" }
    ]
  },
  {
    id: "technology",
    label: "Technology",
    href: "/technology",
    panelWide: true,
    links: [
      { title: "The Mere X family", href: "/technology", desc: "Every model, side by side", icon: "orbit" },
      { title: "Mere Apex 5.5", href: "/technology/models/mere-apex-5-5", desc: "Frontier reasoning", icon: "sun" },
      { title: "Mere Orion 5.5", href: "/technology/models/mere-orion-5-5", desc: "The production workhorse", icon: "globe" },
      { title: "Mere Nyx 5.5", href: "/technology/models/mere-nyx-5-5", desc: "Fast and inexpensive", icon: "moon" },
      { title: "Reasoning modes", href: "/technology/reasoning", desc: "Fast, Medium, High, and DEEP", icon: "atom" },
      { title: "Architecture", href: "/technology/architecture", desc: "How Mere X is built", icon: "cpu" },
      { title: "Multimodality", href: "/technology/multimodal", desc: "Vision, documents, audio", icon: "image" },
      { title: "Infrastructure", href: "/technology/infrastructure", desc: "The compute behind the models", icon: "server" },
      { title: "Benchmarks", href: "/technology/benchmarks", desc: "Evaluation results in full", icon: "chart" }
    ]
  },
  {
    id: "products",
    label: "Products",
    href: "/products",
    panelWide: false,
    links: [
      { title: "Mere X", href: "/products/mere-x", desc: "The assistant, for everyone", icon: "sparkle" },
      { title: "Mere X for Work", href: "/products/work", desc: "Shared context for teams", icon: "users" },
      { title: "Mere X Code", href: "/products/code", desc: "An agent that lives in your repo", icon: "terminal" },
      { title: "The API", href: "/products/api", desc: "Build Mere X into your product", icon: "code" },
      { title: "Connectors", href: "/products/connectors", desc: "80+ tools Mere X can operate", icon: "plug" },
      { title: "Enterprise", href: "/products/enterprise", desc: "Deployment, residency, and support", icon: "building" },
      { title: "Pricing", href: "/pricing", desc: "Plans and per-token rates", icon: "card" }
    ]
  },
  {
    id: "safety",
    label: "Safety",
    href: "/safety",
    panelWide: false,
    links: [
      { title: "Our approach", href: "/safety", desc: "What safety means here in practice", icon: "shield" },
      { title: "Responsible Scaling Policy", href: "/safety/scaling-policy", desc: "What must be true before we ship", icon: "scale" },
      { title: "System cards", href: "/safety/system-cards", desc: "Per-release capability and risk reports", icon: "file" },
      { title: "Usage policy", href: "/safety/usage-policy", desc: "What Mere X may and may not be used for", icon: "list" },
      { title: "Transparency reports", href: "/safety/transparency", desc: "Enforcement and incident data", icon: "eye" },
      { title: "Report a vulnerability", href: "/safety/disclosure", desc: "Coordinated disclosure process", icon: "fingerprint" }
    ]
  },
  {
    id: "company",
    label: "Company",
    href: "/company",
    panelWide: false,
    links: [
      { title: "About Mere X", href: "/company", desc: "Who we are and how we got here", icon: "building" },
      { title: "Careers", href: "/company/careers", desc: "Open roles across research and product", icon: "briefcase" },
      { title: "News", href: "/company/news", desc: "Announcements and press", icon: "news" },
      { title: "Customers", href: "/company/customers", desc: "What people build on Mere X", icon: "star" },
      { title: "Trust centre", href: "/company/trust", desc: "Compliance, security, and privacy", icon: "lock" },
      { title: "Contact", href: "/company/contact", desc: "Sales, press, and support", icon: "mail" }
    ]
  },
  {
    id: "resources",
    label: "Resources",
    href: "/docs",
    panelWide: true,
    links: [
      { title: "Documentation", href: "/docs", desc: "Guides and concepts", icon: "book" },
      { title: "Quickstart", href: "/docs/quickstart", desc: "First call in under two minutes", icon: "rocket" },
      { title: "API reference", href: "/docs/api", desc: "Every endpoint and parameter", icon: "code" },
      { title: "SDKs", href: "/docs/sdks", desc: "Python, TypeScript, Go, Java", icon: "package" },
      { title: "Cookbook", href: "/docs/cookbook", desc: "Working recipes you can copy", icon: "flask" },
      { title: "Prompt library", href: "/docs/prompts", desc: "Patterns that hold up in production", icon: "wand" },
      { title: "Changelog", href: "/changelog", desc: "What shipped, and when", icon: "list" },
      { title: "Status", href: "/status", desc: "Live platform health", icon: "activity" },
      { title: "Support", href: "/support", desc: "Get help from a human", icon: "help" }
    ]
  }
];

export const FOOTER = [
  {
    title: "Platform",
    links: [
      { label: "Developer console", href: "/console" },
      { label: "API reference", href: "/docs/api" },
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "SDKs", href: "/docs/sdks" },
      { label: "Cookbook", href: "/docs/cookbook" },
      { label: "Pricing", href: "/pricing" },
      { label: "Status", href: "/status" }
    ]
  },
  {
    title: "Models",
    links: [
      { label: "Mere Apex 5.5", href: "/technology/models/mere-apex-5-5" },
      { label: "Mere Orion 5.5", href: "/technology/models/mere-orion-5-5" },
      { label: "Mere Nyx 5.5", href: "/technology/models/mere-nyx-5-5" },
      { label: "Mere Vision 5.5", href: "/technology/models/mere-vision-5-5" },
      { label: "Mere Voice 5.5", href: "/technology/models/mere-voice-5-5" },
      { label: "Benchmarks", href: "/technology/benchmarks" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/company" },
      { label: "Careers", href: "/company/careers" },
      { label: "News", href: "/company/news" },
      { label: "Customers", href: "/company/customers" },
      { label: "Research", href: "/research" },
      { label: "Contact", href: "/company/contact" }
    ]
  },
  {
    title: "Safety & trust",
    links: [
      { label: "Our approach", href: "/safety" },
      { label: "Responsible Scaling", href: "/safety/scaling-policy" },
      { label: "System cards", href: "/safety/system-cards" },
      { label: "Usage policy", href: "/safety/usage-policy" },
      { label: "Trust centre", href: "/company/trust" },
      { label: "Disclosure", href: "/safety/disclosure" }
    ]
  }
];

export const LEGAL_LINKS = [
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
  { label: "Usage policy", href: "/safety/usage-policy" },
  { label: "Cookies", href: "/legal/cookies" }
];

export const HERO_STATS = [
  { value: 3, suffix: "", label: "Mere models" },
  { value: 4, suffix: "", label: "Reasoning depths" },
  { value: 5, suffix: "h", label: "Rolling usage window" },
  { value: 1, suffix: "", label: "Synchronized Studio" }
];

export const TRUST_LOGOS = [
  "Northwind Health", "Aster Financial", "Cartwright & Vale", "Helios Robotics",
  "Meridian Labs", "Quillon Media", "Vantage Bio", "Orbital Freight",
  "Larkspur Legal", "Fenwick Energy"
];

export const VALUES = [
  {
    icon: "target",
    title: "Useful before impressive",
    body: "A model that wins a benchmark and loses a user has not helped anyone. We optimise for the work people actually bring us."
  },
  {
    icon: "eye",
    title: "Understand what we build",
    body: "Capability without interpretability is a liability. Every capability push is matched by investment in reading the system from the inside."
  },
  {
    icon: "scale",
    title: "Say what is true",
    body: "We publish failures alongside results, name the limits of our evaluations, and refuse to describe a model as more reliable than it is."
  },
  {
    icon: "users",
    title: "Broad benefit, deliberately",
    body: "Access, pricing, and language coverage are design decisions. We make them on purpose rather than letting them fall out of the roadmap."
  }
];

export const MILESTONES = [
  { date: "March 2023", title: "Mere X is founded", body: "Eleven researchers and engineers leave frontier labs to work on interpretable, reliable systems. The first office is a converted print shop in the Mission." },
  { date: "January 2024", title: "Mere 3.5 — internal only", body: "The first model in the family. Never released publicly; it existed to prove the training stack and the evaluation harness worked end to end." },
  { date: "September 2024", title: "Mere 4.0 and the first API", body: "A private beta with 40 companies. The reasoning-budget control that defines the family ships in its first, crude form." },
  { date: "May 2025", title: "Mere 4.5 and Studio", body: "The consumer product launches alongside the API. Connectors arrive; the model can finally act on the tools people already use." },
  { date: "November 2025", title: "Mere 5.0 and the Responsible Scaling Policy", body: "We publish the commitments that gate every future release, and the evaluation suite that decides whether a model has met them." },
  { date: "June 2026", title: "Mere X 5.5", body: "Apex, Orion, and Nyx ship together with a million-token window, DEEP reasoning, and the agent stack that had been running internally for eight months." }
];

export const LEADERSHIP = [
  { name: "Dr. Ilse Vantrop", role: "Co-founder & Chief Executive", bio: "Previously led the reasoning group at a frontier lab. Physicist by training; spent a decade on inference systems before deciding the interesting problem was upstream." },
  { name: "Marcus Adeyemi", role: "Co-founder & Chief Scientist", bio: "Works on interpretability and the internal geometry of large models. Believes an unexplained capability is an unfinished one." },
  { name: "Sana Ghorbani", role: "Chief Technology Officer", bio: "Built the training and serving stack. Cares more about the tail of the latency distribution than almost anyone should." },
  { name: "Peter Lindqvist", role: "Head of Safety", bio: "Runs the evaluation and red-team organisation. Holds the release gate, and has used it." },
  { name: "Renata Oyelaran", role: "Head of Product", bio: "Shapes Studio and the developer platform. Convinced that most AI products fail on ergonomics, not intelligence." },
  { name: "Dai Watanabe", role: "General Counsel", bio: "Policy, privacy, and the long negotiations that make regulated deployments possible." }
];
