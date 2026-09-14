import assert from "node:assert/strict";
import test from "node:test";

import { entitlementsFor, resolveChatAccess } from "../server/entitlements.js";

test("Free accounts are restricted to Nyx and cannot enter Studio", () => {
  const free = entitlementsFor({ plan: "Free" });
  assert.deepEqual(free.models, ["nyx"]);
  assert.equal(free.defaultChatModel, "nyx");
  assert.equal(free.studio, false);
  assert.throws(() => resolveChatAccess({ plan: "Free" }, { surface: "studio", model: "nyx", effort: "High" }), (error) => error.code === "studio_plan_required");
});

test("ordinary chat always uses the plan default model", () => {
  const access = resolveChatAccess({ plan: "Plus", planExpiresAt: new Date(Date.now() + 86_400_000) }, {
    surface: "chat",
    model: "apex",
    effort: "Medium"
  });
  assert.equal(access.model, "orion");
  assert.equal(access.effort, "Medium");
});

test("paid Studio honors only models and efforts included in the plan", () => {
  const active = { plan: "Starter", planExpiresAt: new Date(Date.now() + 86_400_000) };
  assert.equal(resolveChatAccess(active, { surface: "studio", model: "orion", effort: "High" }).model, "orion");
  assert.throws(() => resolveChatAccess(active, { surface: "studio", model: "apex", effort: "High" }), (error) => error.code === "model_plan_required");
  assert.throws(() => resolveChatAccess(active, { surface: "studio", model: "orion", effort: "DEEP" }), (error) => error.code === "effort_plan_required");
});

test("expired subscriptions fall back to Free entitlements", () => {
  const expired = entitlementsFor({ plan: "Max", planExpiresAt: new Date(Date.now() - 1_000) });
  assert.equal(expired.plan, "Free");
  assert.deepEqual(expired.models, ["nyx"]);
});
