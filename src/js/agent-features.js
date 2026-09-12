export const AGENT_ICONS = [
  { id: "orbit", label: "Orbit", symbol: "i-orbit" },
  { id: "spark", label: "Spark", symbol: "i-spark" },
  { id: "research", label: "Research", symbol: "i-globe" },
  { id: "strategy", label: "Strategy", symbol: "i-scale" },
  { id: "code", label: "Code", symbol: "i-code" },
  { id: "analysis", label: "Analysis", symbol: "i-chart" },
  { id: "writing", label: "Writing", symbol: "i-canvas" }
];

export const AGENT_CAPABILITIES = [
  { id: "web", label: "Web search", description: "Look up current information and return cited answers." },
  { id: "code", label: "Code workspace", description: "Reason about code and use a secure analysis runtime." },
  { id: "data", label: "Data analysis", description: "Analyze spreadsheets, documents, and structured data." },
  { id: "images", label: "Image creation", description: "Create or transform images when selected as the default tool." },
  { id: "files", label: "File analysis", description: "Read uploaded knowledge and request attachments carefully." }
];

export const AGENT_DEFAULT_TOOLS = ["", "Web search", "Deep research", "Canvas", "Code workspace", "Data analysis", "Images", "File analysis"];
export const AGENT_EFFORTS = ["Fast", "Medium", "High", "DEEP"];

const allowedIcons = new Set(AGENT_ICONS.map((item) => item.id));
const allowedCapabilities = new Set(AGENT_CAPABILITIES.map((item) => item.id));
const allowedTools = new Set(AGENT_DEFAULT_TOOLS);
const allowedEfforts = new Set(AGENT_EFFORTS);
const toolCapability = {
  "Web search": "web",
  "Deep research": "web",
  "Code workspace": "code",
  "Data analysis": "data",
  Images: "images",
  "File analysis": "files"
};

function text(value, max) {
  return String(value || "").trim().slice(0, max);
}

export function normalizeAgent(value = {}) {
  const defaultTool = allowedTools.has(value.defaultTool) ? value.defaultTool : "";
  const capabilities = [...new Set((Array.isArray(value.capabilities) ? value.capabilities : [])
    .map(String)
    .filter((item) => allowedCapabilities.has(item)))];
  const requiredCapability = toolCapability[defaultTool];
  if (requiredCapability && !capabilities.includes(requiredCapability)) capabilities.push(requiredCapability);

  return {
    ...value,
    id: text(value.id, 120).replace(/[^A-Za-z0-9_-]/g, ""),
    name: text(value.name, 60) || "Untitled agent",
    description: text(value.description, 240),
    instructions: text(value.instructions, 12_000),
    icon: allowedIcons.has(value.icon) ? value.icon : "orbit",
    effort: allowedEfforts.has(value.effort) ? value.effort : "High",
    defaultTool,
    capabilities,
    starters: [...new Set((Array.isArray(value.starters) ? value.starters : [])
      .map((item) => text(item, 180))
      .filter(Boolean))].slice(0, 4),
    files: Array.isArray(value.files) ? value.files : [],
    notes: (Array.isArray(value.notes) ? value.notes : []).map((item) => ({
      ...item,
      title: text(item?.title, 80),
      content: text(item?.content, 8_000)
    })).filter((item) => item.title && item.content),
    plugins: [...new Set((Array.isArray(value.plugins) ? value.plugins : []).map(String).filter(Boolean))],
    memoryMode: value.memoryMode === "workspace" ? "workspace" : "agent-only",
    pinned: value.pinned === true,
    enabled: value.enabled !== false,
    createdAt: value.createdAt || new Date().toISOString(),
    updatedAt: value.updatedAt || value.createdAt || new Date().toISOString()
  };
}

export const AGENT_TEMPLATES = [
  {
    id: "research-analyst",
    name: "Research Analyst",
    description: "Finds current evidence, compares sources, and produces decision-ready research.",
    icon: "research",
    effort: "DEEP",
    defaultTool: "Deep research",
    capabilities: ["web", "files", "data"],
    instructions: "Act as a rigorous research analyst. Clarify the decision the research must support, search broadly, prefer primary sources, compare conflicting evidence, distinguish facts from inference, cite material claims, and finish with concise findings, risks, and recommended next steps.",
    starters: ["Research this topic and give me a cited briefing", "Compare these options using current evidence", "Turn these sources into an executive research memo"]
  },
  {
    id: "strategy-operator",
    name: "Strategy Operator",
    description: "Turns ambiguous goals into prioritized plans, decisions, and operating rhythms.",
    icon: "strategy",
    effort: "High",
    defaultTool: "Canvas",
    capabilities: ["web", "files", "data"],
    instructions: "Act as a senior strategy and operations partner. Establish the objective, constraints, stakeholders, evidence, and success metric. Expose assumptions, identify the few highest-leverage decisions, produce an executable plan with owners and checkpoints, and flag material risks before recommending action.",
    starters: ["Turn this goal into an execution plan", "Pressure-test this strategy", "Create a decision memo from these notes"]
  },
  {
    id: "code-architect",
    name: "Code Architect",
    description: "Designs maintainable systems, reviews code, and plans verifiable implementation work.",
    icon: "code",
    effort: "High",
    defaultTool: "Code workspace",
    capabilities: ["code", "web", "files"],
    instructions: "Act as a senior software architect and implementation partner. Inspect context before proposing changes, make assumptions explicit, prefer simple maintainable designs, protect security and data integrity, account for failure modes and migrations, and include proportionate verification for every implementation recommendation.",
    starters: ["Review this architecture and identify its risks", "Design a maintainable implementation plan", "Debug this issue from the available evidence"]
  },
  {
    id: "writing-director",
    name: "Writing Director",
    description: "Creates polished, audience-aware writing with a strong structure and distinct voice.",
    icon: "writing",
    effort: "High",
    defaultTool: "Canvas",
    capabilities: ["files", "web"],
    instructions: "Act as an exacting editorial director. Identify the audience, purpose, desired action, voice, and constraints. Lead with the strongest point, build a clear narrative, remove generic filler, preserve factual accuracy, and deliver polished copy ready to use unless the user asks for alternatives or commentary.",
    starters: ["Turn this draft into polished final copy", "Create a sharp executive narrative", "Rewrite this for a specific audience and outcome"]
  }
];
