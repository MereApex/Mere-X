import test from "node:test";
import assert from "node:assert/strict";

import { AGENT_TEMPLATES, normalizeAgent } from "../src/js/agent-features.js";

test("agent normalization keeps safe supported configuration", () => {
  const agent = normalizeAgent({
    id: "agent-1",
    name: "  Analyst  ",
    icon: "missing",
    effort: "High",
    defaultTool: "Deep research",
    capabilities: ["data", "unknown", "data"],
    starters: ["One", "One", "Two", "Three", "Four", "Five"]
  });
  assert.equal(agent.name, "Analyst");
  assert.equal(agent.icon, "orbit");
  assert.deepEqual(agent.capabilities, ["data", "web"]);
  assert.deepEqual(agent.starters, ["One", "Two", "Three", "Four"]);
});

test("built-in agent templates normalize into runnable agents", () => {
  for (const template of AGENT_TEMPLATES) {
    const agent = normalizeAgent(template);
    assert.ok(agent.name.length > 3);
    assert.ok(agent.instructions.length > 80);
    assert.ok(agent.starters.length >= 3);
    assert.ok(agent.capabilities.length >= 2);
  }
});
