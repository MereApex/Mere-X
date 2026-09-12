export const AUTOMATION_SCHEDULES = ["Every day", "Every weekday", "Every week", "Every month"];

const RISKY_FILE_EXTENSIONS = new Set([
  "apk", "app", "com", "cpl", "dll", "dmg", "exe", "jar", "lnk", "msi", "msp", "pif", "scr"
]);

function dateValue(value, fallback = 0) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function timeParts(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return [9, 0];
  return [Math.min(23, Number(match[1])), Math.min(59, Number(match[2]))];
}

export function nextAutomationRun(automation, from = Date.now()) {
  const after = new Date(from);
  const [hour, minute] = timeParts(automation?.time);
  const created = new Date(automation?.createdAt || from);
  const weekday = Number.isInteger(Number(automation?.weekday))
    ? Math.max(0, Math.min(6, Number(automation.weekday)))
    : created.getDay();
  const monthDay = Math.max(1, Math.min(31, Number(automation?.monthDay) || created.getDate()));
  const schedule = AUTOMATION_SCHEDULES.includes(automation?.schedule) ? automation.schedule : "Every day";

  for (let offset = 0; offset <= 370; offset += 1) {
    const candidate = new Date(after);
    candidate.setSeconds(0, 0);
    candidate.setDate(after.getDate() + offset);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate.getTime() <= after.getTime()) continue;

    const lastDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
    const matches = schedule === "Every day"
      || (schedule === "Every weekday" && candidate.getDay() > 0 && candidate.getDay() < 6)
      || (schedule === "Every week" && candidate.getDay() === weekday)
      || (schedule === "Every month" && candidate.getDate() === Math.min(monthDay, lastDay));
    if (matches) return candidate.toISOString();
  }
  return new Date(after.getTime() + 86_400_000).toISOString();
}

export function normalizeAutomation(value, now = Date.now()) {
  const item = value && typeof value === "object" ? value : {};
  const normalized = {
    ...item,
    id: String(item.id || `automation-${now}`),
    name: String(item.name || "Untitled automation").trim().slice(0, 80),
    prompt: String(item.prompt || item.name || "Run this recurring task.").trim().slice(0, 8_000),
    schedule: AUTOMATION_SCHEDULES.includes(item.schedule) ? item.schedule : "Every day",
    time: /^\d{2}:\d{2}$/.test(String(item.time || "")) ? item.time : "09:00",
    mode: ["Fast", "Medium", "High", "DEEP"].includes(item.mode) ? item.mode : "High",
    tool: ["", "Web search", "Deep research", "Canvas", "Code workspace", "Data analysis", "Images", "File analysis"].includes(item.tool) ? item.tool : "",
    projectId: String(item.projectId || ""),
    agentId: String(item.agentId || ""),
    enabled: item.enabled !== false,
    createdAt: item.createdAt || new Date(now).toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date(now).toISOString(),
    lastRunAt: item.lastRunAt || "",
    lastStatus: ["running", "completed", "failed"].includes(item.lastStatus) ? item.lastStatus : "",
    lastError: String(item.lastError || "").slice(0, 300),
    lastConversationId: String(item.lastConversationId || ""),
    runCount: Math.max(0, Number(item.runCount) || 0),
    weekday: Number.isInteger(Number(item.weekday)) ? Math.max(0, Math.min(6, Number(item.weekday))) : new Date(item.createdAt || now).getDay(),
    monthDay: Math.max(1, Math.min(31, Number(item.monthDay) || new Date(item.createdAt || now).getDate()))
  };
  normalized.nextRunAt = dateValue(item.nextRunAt) > now
    ? new Date(item.nextRunAt).toISOString()
    : nextAutomationRun(normalized, now);
  return normalized;
}

export function isWithinUsageSchedule(schedule, at = new Date()) {
  if (!schedule?.enabled) return true;
  const [startHour, startMinute] = timeParts(schedule.start || "08:00");
  const [endHour, endMinute] = timeParts(schedule.end || "22:00");
  const current = at.getHours() * 60 + at.getMinutes();
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (start === end) return true;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

export function fileRisk(file) {
  const name = String(file?.name || "").trim();
  const extension = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  const type = String(file?.type || "").toLowerCase();
  if (RISKY_FILE_EXTENSIONS.has(extension)) return `.${extension || "file"} files can execute code`;
  if (type === "application/x-msdownload" || type === "application/x-sh" || type === "application/x-dosexec") return "this executable file type is blocked";
  if (!Number(file?.size || 0)) return "empty files cannot be analyzed";
  return "";
}

export function urlRisk(href, base = "https://mere-x.local") {
  let url;
  try {
    url = new URL(String(href || ""), base);
  } catch {
    return { blocked: true, warning: "This link is not a valid web address." };
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    return { blocked: true, warning: `Links using ${url.protocol || "unknown"} are blocked.` };
  }
  const sameOrigin = url.origin === new URL(base).origin;
  if (url.username || url.password) return { blocked: false, warning: "This address contains hidden sign-in information." };
  if (url.hostname.includes("xn--")) return { blocked: false, warning: "This address uses an encoded international domain. Check it carefully." };
  if (!sameOrigin && url.protocol === "http:") return { blocked: false, warning: "This website does not use an encrypted HTTPS connection." };
  if (url.href.length > 2_048) return { blocked: false, warning: "This unusually long address may hide its destination." };
  return { blocked: false, warning: "", url: url.href };
}

export function usageWindowStart(cycle, now = new Date()) {
  const value = new Date(now);
  if (cycle === "Last 7 days") return new Date(value.getTime() - 7 * 86_400_000);
  if (cycle === "Last 30 days") return new Date(value.getTime() - 30 * 86_400_000);
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function usageMetrics(state, cycle = "Current cycle", now = new Date()) {
  const cutoff = usageWindowStart(cycle, now).getTime();
  const conversations = Array.isArray(state?.conversations) ? state.conversations : [];
  const files = Array.isArray(state?.files) ? state.files : [];
  const activity = Array.isArray(state?.activity) ? state.activity : [];
  const messages = conversations.flatMap((conversation) => Array.isArray(conversation.messages) ? conversation.messages : [])
    .filter((message) => dateValue(message.createdAt) >= cutoff);
  const recentActivity = activity.filter((event) => dateValue(event.createdAt) >= cutoff);
  const replies = recentActivity.filter((event) => event.type === "assistant_completed");
  return {
    cycle,
    since: new Date(cutoff).toISOString(),
    prompts: messages.filter((message) => message.role === "user").length,
    responses: messages.filter((message) => message.role === "assistant").length,
    files: files.filter((file) => dateValue(file.addedAt || file.createdAt) >= cutoff).length,
    research: replies.filter((event) => event.tool === "Web search" || event.tool === "Deep research").length,
    automations: recentActivity.filter((event) => event.type === "automation_completed").length,
    inputTokens: replies.reduce((sum, event) => sum + Number(event.usage?.input_tokens || 0), 0),
    outputTokens: replies.reduce((sum, event) => sum + Number(event.usage?.output_tokens || 0), 0),
    totalTokens: replies.reduce((sum, event) => sum + Number(event.usage?.total_tokens || 0), 0),
    replies
  };
}

export function periodKey(kind, now = new Date()) {
  const date = new Date(now);
  if (kind === "Monthly") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start.toISOString().slice(0, 10);
}
