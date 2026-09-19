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
  tagline: "Building the agent that works in your codebase.",
  mission:
    "Mere X exists to make a coding agent a dependable part of engineering work — capable enough to hand a real task to, and transparent enough to review every change it makes.",
  model: "Mere",
  email: "hello@merex.ai",
  press: "press@merex.ai",
  security: "security@merex.ai",
  support: "support@merex.ai"
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
      { title: "Alignment", href: "/research/alignment", desc: "Making capable agents behave as intended", icon: "target" },
      { title: "Evaluations", href: "/research/evaluations", desc: "How we measure capability and harm", icon: "gauge" },
      { title: "Residency & fellows", href: "/research/residency", desc: "Come do a year of research with us", icon: "graduation" }
    ]
  },
  {
    id: "technology",
    label: "Models",
    href: "/technology",
    panelWide: true,
    links: [
      { title: "The Mere family", href: "/technology", desc: "Every model, side by side", icon: "orbit" },
      { title: "Mere 4.2 Peak", href: "/technology/models/mere-4-2-peak", desc: "Frontier reasoning for the hardest work", icon: "sun" },
      { title: "Mere 4.2 Core", href: "/technology/models/mere-4-2-core", desc: "The daily driver", icon: "globe" },
      { title: "Mere 4.0 Lite", href: "/technology/models/mere-4-0-lite", desc: "Instant and inexpensive", icon: "moon" },
      { title: "Thinking depths", href: "/technology/reasoning", desc: "Fast, Medium, High, and Extra High", icon: "atom" },
      { title: "Architecture", href: "/technology/architecture", desc: "How the models are built", icon: "cpu" },
      { title: "Infrastructure", href: "/technology/infrastructure", desc: "The compute behind the models", icon: "server" },
      { title: "Benchmarks", href: "/technology/benchmarks", desc: "Evaluation results in full", icon: "chart" }
    ]
  },
  {
    id: "products",
    label: "Product",
    href: "/products",
    panelWide: false,
    links: [
      { title: "Mere Code", href: "/products/code", desc: "The coding agent, in your browser", icon: "terminal" },
      { title: "Enterprise", href: "/products/enterprise", desc: "Deployment, residency, and support", icon: "building" },
      { title: "Pricing", href: "/pricing", desc: "Plans for every way of working", icon: "card" }
    ]
  },
  {
    id: "safety",
    label: "Safety",
    href: "/safety",
    panelWide: false,
    links: [
      { title: "Our approach", href: "/safety", desc: "What safety means for an agent that edits code", icon: "shield" },
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
      { title: "Customers", href: "/company/customers", desc: "What teams ship with Mere X", icon: "star" },
      { title: "Trust centre", href: "/company/trust", desc: "Compliance, security, and privacy", icon: "lock" },
      { title: "Contact", href: "/company/contact", desc: "Sales, press, and support", icon: "mail" }
    ]
  },
  {
    id: "resources",
    label: "Resources",
    href: "/changelog",
    panelWide: false,
    links: [
      { title: "Changelog", href: "/changelog", desc: "What shipped, and when", icon: "list" },
      { title: "Status", href: "/status", desc: "Live platform health", icon: "activity" },
      { title: "Support", href: "/support", desc: "Get help from a human", icon: "help" }
    ]
  }
];

export const FOOTER = [
  {
    title: "Product",
    links: [
      { label: "Mere Code", href: "/products/code" },
      { label: "Open the workspace", href: "/app" },
      { label: "Enterprise", href: "/products/enterprise" },
      { label: "Pricing", href: "/pricing" },
      { label: "Status", href: "/status" }
    ]
  },
  {
    title: "Models",
    links: [
      { label: "Mere 4.2 Peak", href: "/technology/models/mere-4-2-peak" },
      { label: "Mere 4.2 Core", href: "/technology/models/mere-4-2-core" },
      { label: "Mere 4.0 Lite", href: "/technology/models/mere-4-0-lite" },
      { label: "Thinking depths", href: "/technology/reasoning" },
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
  { value: 4, suffix: "", label: "Thinking depths" },
  { value: 1, suffix: "M", label: "Token context" },
  { value: 0, suffix: "", label: "Installs required" }
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
    body: "A model that wins a benchmark and loses an engineer has not helped anyone. We optimise for the pull requests people actually need to ship."
  },
  {
    icon: "eye",
    title: "Every change reviewable",
    body: "An agent that edits code must show its work. Every file it touches is a diff you can read, keep, or revert — nothing lands silently."
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
  { date: "January 2024", title: "Mere Lite — internal only", body: "The first model in the family. Never released publicly; it existed to prove the training stack and the evaluation harness worked end to end." },
  { date: "September 2024", title: "Mere Core 1, in private beta", body: "A private beta with 40 companies. The thinking-budget control that defines the family ships in its first, crude form." },
  { date: "May 2025", title: "Mere 2.0 Peak and the first agent", body: "The agent runs internally on our own repositories for eight months before anyone outside sees it. Most of what it learned is about when to stop and ask." },
  { date: "November 2025", title: "The Responsible Scaling Policy", body: "We publish the commitments that gate every future release, and the evaluation suite that decides whether a model has met them." },
  { date: "September 2026", title: "Mere Code", body: "4.2 Peak, 4.2 Core, and 4.0 Lite ship together inside a coding agent that runs in the browser, with a million-token window, Extra High thinking, and every edit reviewable." }
];

export const LEADERSHIP = [
  { name: "Dr. Ilse Vantrop", role: "Co-founder & Chief Executive", bio: "Previously led the reasoning group at a frontier lab. Physicist by training; spent a decade on inference systems before deciding the interesting problem was upstream." },
  { name: "Marcus Adeyemi", role: "Co-founder & Chief Scientist", bio: "Works on interpretability and the internal geometry of large models. Believes an unexplained capability is an unfinished one." },
  { name: "Sana Ghorbani", role: "Chief Technology Officer", bio: "Built the training and serving stack. Cares more about the tail of the latency distribution than almost anyone should." },
  { name: "Peter Lindqvist", role: "Head of Safety", bio: "Runs the evaluation and red-team organisation. Holds the release gate, and has used it." },
  { name: "Renata Oyelaran", role: "Head of Product", bio: "Shapes Mere Code and the developer platform. Convinced that most AI products fail on ergonomics, not intelligence." },
  { name: "Dai Watanabe", role: "General Counsel", bio: "Policy, privacy, and the long negotiations that make regulated deployments possible." }
];
