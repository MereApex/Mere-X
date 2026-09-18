import assert from "node:assert/strict";
import test from "node:test";

import { EFFORT_KEYS, entitlementsFor, resolveAgentAccess } from "../server/entitlements.js";

test("the four depths are Fast, Medium, High and Extra High", () => {
  assert.deepEqual([...EFFORT_KEYS], ["Fast", "Medium", "High", "Extra High"]);
});

test("Free accounts get Lite at the two lighter depths", () => {
  const free = entitlementsFor({ plan: "Free" });
  assert.deepEqual(free.models, ["nyx"]);
  assert.equal(free.defaultModel, "nyx");
  assert.deepEqual(free.efforts, ["Fast", "Medium"]);
  assert.throws(() => resolveAgentAccess({ plan: "Free" }, { model: "nyx", effort: "High" }), (error) => error.code === "effort_plan_required");
  assert.throws(() => resolveAgentAccess({ plan: "Free" }, { model: "apex", effort: "Fast" }), (error) => error.code === "model_plan_required");
});

test("a request outside the plan's models or depths is refused, inside it is honoured", () => {
  const active = { plan: "Starter", planExpiresAt: new Date(Date.now() + 86_400_000) };
  assert.equal(resolveAgentAccess(active, { model: "orion", effort: "High" }).model, "orion");
  assert.throws(() => resolveAgentAccess(active, { model: "apex", effort: "High" }), (error) => error.code === "model_plan_required");
  assert.throws(() => resolveAgentAccess(active, { model: "orion", effort: "Extra High" }), (error) => error.code === "effort_plan_required");
  const plus = resolveAgentAccess({ plan: "Plus", planExpiresAt: new Date(Date.now() + 86_400_000) }, { model: "apex", effort: "Extra High" });
  assert.equal(plus.model, "apex");
  assert.equal(plus.effort, "Extra High");
});

test("an unknown model or depth falls back to the plan default", () => {
  const access = resolveAgentAccess({ plan: "Pro", planExpiresAt: new Date(Date.now() + 86_400_000) }, { model: "nope", effort: "DEEP" });
  assert.equal(access.model, "apex");
  assert.equal(access.effort, "Medium");
});

test("expired subscriptions fall back to Free entitlements", () => {
  const expired = entitlementsFor({ plan: "Max", planExpiresAt: new Date(Date.now() - 1_000) });
  assert.equal(expired.plan, "Free");
  assert.deepEqual(expired.models, ["nyx"]);
});
