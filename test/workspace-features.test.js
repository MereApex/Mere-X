import test from "node:test";
import assert from "node:assert/strict";

import {
  fileRisk,
  isWithinUsageSchedule,
  nextAutomationRun,
  normalizeAutomation,
  periodKey,
  urlRisk,
  usageMetrics
} from "../src/js/workspace-features.js";

test("daily automation selects the next configured local time", () => {
  const from = new Date(2026, 8, 2, 10, 0, 0);
  const next = new Date(nextAutomationRun({ schedule: "Every day", time: "09:00" }, from.getTime()));
  assert.equal(next.getDate(), 3);
  assert.equal(next.getHours(), 9);
});

test("weekday automation skips weekends", () => {
  const fridayEvening = new Date(2026, 8, 4, 18, 0, 0);
  const next = new Date(nextAutomationRun({ schedule: "Every weekday", time: "09:00" }, fridayEvening.getTime()));
  assert.equal(next.getDay(), 1);
});

test("legacy automation records receive runnable defaults", () => {
  const item = normalizeAutomation({ id: "a1", name: "Review", schedule: "Every week" }, new Date(2026, 8, 2).getTime());
  assert.equal(item.prompt, "Review");
  assert.equal(item.mode, "High");
  assert.ok(item.nextRunAt);
});

test("automations preserve agent scope and agent-capable tools", () => {
  const item = normalizeAutomation({ id: "a2", name: "Agent review", agentId: "agent-7", tool: "File analysis" }, new Date(2026, 8, 2).getTime());
  assert.equal(item.agentId, "agent-7");
  assert.equal(item.tool, "File analysis");
});

test("usage schedules support normal and overnight windows", () => {
  assert.equal(isWithinUsageSchedule({ enabled: true, start: "08:00", end: "22:00" }, new Date(2026, 8, 2, 12)), true);
  assert.equal(isWithinUsageSchedule({ enabled: true, start: "08:00", end: "22:00" }, new Date(2026, 8, 2, 23)), false);
  assert.equal(isWithinUsageSchedule({ enabled: true, start: "22:00", end: "07:00" }, new Date(2026, 8, 2, 23)), true);
});

test("file and URL safety checks identify risky inputs", () => {
  assert.match(fileRisk({ name: "installer.exe", size: 4 }), /execute code/);
  assert.equal(fileRisk({ name: "notes.pdf", size: 4, type: "application/pdf" }), "");
  assert.match(urlRisk("http://example.com", "https://mere-x.local").warning, /HTTPS/);
  assert.equal(urlRisk("javascript:alert(1)").blocked, true);
});

test("usage metrics honor the requested time window", () => {
  const now = new Date("2026-09-02T12:00:00Z");
  const state = {
    conversations: [{ messages: [
      { role: "user", createdAt: "2026-09-01T12:00:00Z" },
      { role: "assistant", createdAt: "2026-09-01T12:00:02Z" },
      { role: "user", createdAt: "2026-07-01T12:00:00Z" }
    ] }],
    files: [{ addedAt: "2026-09-02T09:00:00Z" }],
    activity: [{ type: "assistant_completed", tool: "Web search", createdAt: "2026-09-01T12:00:02Z", usage: { total_tokens: 44 } }]
  };
  const metrics = usageMetrics(state, "Last 7 days", now);
  assert.equal(metrics.prompts, 1);
  assert.equal(metrics.responses, 1);
  assert.equal(metrics.files, 1);
  assert.equal(metrics.research, 1);
  assert.equal(metrics.totalTokens, 44);
  assert.match(periodKey("Weekly", now), /^2026-08-3/);
});
