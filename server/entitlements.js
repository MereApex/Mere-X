import { query, transaction } from "./database.js";

const FIVE_HOURS_MS = 5 * 60 * 60 * 1_000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1_000;
const MODEL_KEYS = Object.freeze(["nyx", "orion", "apex"]);
const EFFORT_KEYS = Object.freeze(["Fast", "Medium", "High", "DEEP"]);

/* One catalog drives the API guardrails and the client UI. Commercial limits
   can be tuned here without scattering plan checks throughout the product. */
export const PLAN_CATALOG = Object.freeze({
  Free: Object.freeze({
    studio: false,
    models: Object.freeze(["nyx"]),
    defaultChatModel: "nyx",
    efforts: Object.freeze(["Fast", "Medium", "High"]),
    limits: Object.freeze({
      message: Object.freeze({ fiveHours: 20, week: 100 }),
      image: Object.freeze({ fiveHours: 2, week: 8 }),
      voice: Object.freeze({ fiveHours: 2, week: 10 }),
      transcription: Object.freeze({ fiveHours: 12, week: 60 })
    })
  }),
  Starter: Object.freeze({
    studio: true,
    models: Object.freeze(["nyx", "orion"]),
    defaultChatModel: "orion",
    efforts: Object.freeze(["Fast", "Medium", "High"]),
    limits: Object.freeze({
      message: Object.freeze({ fiveHours: 80, week: 500 }),
      image: Object.freeze({ fiveHours: 20, week: 100 }),
      voice: Object.freeze({ fiveHours: 12, week: 70 }),
      transcription: Object.freeze({ fiveHours: 60, week: 350 })
    })
  }),
  Plus: Object.freeze({
    studio: true,
    models: Object.freeze(MODEL_KEYS),
    defaultChatModel: "orion",
    efforts: Object.freeze(EFFORT_KEYS),
    limits: Object.freeze({
      message: Object.freeze({ fiveHours: 160, week: 1_000 }),
      image: Object.freeze({ fiveHours: 40, week: 220 }),
      voice: Object.freeze({ fiveHours: 30, week: 180 }),
      transcription: Object.freeze({ fiveHours: 120, week: 700 })
    })
  }),
  Pro: Object.freeze({
    studio: true,
    models: Object.freeze(MODEL_KEYS),
    defaultChatModel: "apex",
    efforts: Object.freeze(EFFORT_KEYS),
    limits: Object.freeze({
      message: Object.freeze({ fiveHours: 320, week: 2_000 }),
      image: Object.freeze({ fiveHours: 80, week: 450 }),
      voice: Object.freeze({ fiveHours: 70, week: 420 }),
      transcription: Object.freeze({ fiveHours: 240, week: 1_400 })
    })
  }),
  Max: Object.freeze({
    studio: true,
    models: Object.freeze(MODEL_KEYS),
    defaultChatModel: "apex",
    efforts: Object.freeze(EFFORT_KEYS),
    limits: Object.freeze({
      message: Object.freeze({ fiveHours: 800, week: 5_000 }),
      image: Object.freeze({ fiveHours: 200, week: 1_100 }),
      voice: Object.freeze({ fiveHours: 180, week: 1_000 }),
      transcription: Object.freeze({ fiveHours: 600, week: 3_500 })
    })
  })
});

export function effectivePlan(user, now = new Date()) {
  const requested = Object.prototype.hasOwnProperty.call(PLAN_CATALOG, user?.plan) ? user.plan : "Free";
  const expiry = user?.planExpiresAt ?? user?.plan_expires_at;
  if (requested === "Free" || !expiry) return requested;
  const expiresAt = new Date(expiry);
  return Number.isFinite(expiresAt.getTime()) && expiresAt > now ? requested : "Free";
}

export function entitlementsFor(user, now = new Date()) {
  const plan = effectivePlan(user, now);
  const value = PLAN_CATALOG[plan];
  return {
    plan,
    studio: value.studio,
    models: [...value.models],
    defaultChatModel: value.defaultChatModel,
    efforts: [...value.efforts],
    limits: Object.fromEntries(Object.entries(value.limits).map(([category, limits]) => [category, { ...limits }]))
  };
}

function accessError(code, message, status = 403) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

export function resolveChatAccess(user, context = {}) {
  const entitlements = entitlementsFor(user);
  const surface = context?.surface === "studio" ? "studio" : "chat";
  if (surface === "studio" && !entitlements.studio) {
    throw accessError("studio_plan_required", "Studio is available on paid Mere X plans.");
  }

  const requestedEffort = EFFORT_KEYS.includes(context?.effort) ? context.effort : "High";
  if (!entitlements.efforts.includes(requestedEffort)) {
    throw accessError("effort_plan_required", `${requestedEffort} reasoning is not included with the ${entitlements.plan} plan.`);
  }

  let model = entitlements.defaultChatModel;
  if (surface === "studio") {
    const requestedModel = MODEL_KEYS.includes(context?.model) ? context.model : entitlements.defaultChatModel;
    if (!entitlements.models.includes(requestedModel)) {
      throw accessError("model_plan_required", "That model is not included with this Mere X plan.");
    }
    model = requestedModel;
  }
  return { entitlements, surface, model, effort: requestedEffort };
}

function quotaError(windowName, limit, resetAt) {
  const error = new Error(`Your ${windowName} Mere X limit is reached. It resets at ${resetAt.toISOString()}.`);
  error.code = windowName === "5-hour" ? "usage_limit_5h" : "usage_limit_week";
  error.status = 429;
  error.resetAt = resetAt;
  error.limit = limit;
  return error;
}

function resetTime(value, windowMs, now = new Date()) {
  const first = value ? new Date(value) : now;
  const reset = new Date(first.getTime() + windowMs);
  return Number.isFinite(reset.getTime()) && reset > now ? reset : now;
}

export async function consumeUsage(user, category, detail = {}) {
  const entitlements = entitlementsFor(user);
  const limits = entitlements.limits[category];
  if (!limits) throw accessError("invalid_usage_category", "This Mere X usage category is invalid.", 400);
  const units = Math.max(1, Math.min(100, Number(detail.units) || 1));

  return transaction(async (run) => {
    /* Locking the account row serializes concurrent tabs, so two requests can
       never both pass the final available slot. */
    await run(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [user.id]);
    const result = await run(
      `SELECT
         COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(now(), INTERVAL 5 HOUR) THEN units ELSE 0 END), 0) AS five_hour,
         COALESCE(SUM(units), 0) AS weekly,
         MIN(CASE WHEN created_at >= DATE_SUB(now(), INTERVAL 5 HOUR) THEN created_at END) AS first_five_hour,
         MIN(created_at) AS first_week
       FROM usage_events
       WHERE user_id = $1 AND category = $2 AND created_at >= DATE_SUB(now(), INTERVAL 7 DAY)`,
      [user.id, category]
    );
    const row = result.rows[0] || {};
    const fiveHours = Number(row.five_hour || 0);
    const week = Number(row.weekly || 0);
    const now = new Date();
    if (fiveHours + units > limits.fiveHours) throw quotaError("5-hour", limits.fiveHours, resetTime(row.first_five_hour, FIVE_HOURS_MS, now));
    if (week + units > limits.week) throw quotaError("weekly", limits.week, resetTime(row.first_week, WEEK_MS, now));

    await run(
      `INSERT INTO usage_events (user_id, category, model_profile, effort, units, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        category,
        MODEL_KEYS.includes(detail.model) ? detail.model : null,
        EFFORT_KEYS.includes(detail.effort) ? detail.effort : null,
        units,
        JSON.stringify(detail.metadata && typeof detail.metadata === "object" ? detail.metadata : {})
      ]
    );
    return { category, fiveHours: fiveHours + units, week: week + units, limits };
  });
}

export async function usageSummary(user) {
  const entitlements = entitlementsFor(user);
  const result = await query(
    `SELECT category,
       COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(now(), INTERVAL 5 HOUR) THEN units ELSE 0 END), 0) AS five_hour,
       COALESCE(SUM(units), 0) AS weekly,
       MIN(CASE WHEN created_at >= DATE_SUB(now(), INTERVAL 5 HOUR) THEN created_at END) AS first_five_hour,
       MIN(created_at) AS first_week
     FROM usage_events
     WHERE user_id = $1 AND created_at >= DATE_SUB(now(), INTERVAL 7 DAY)
     GROUP BY category`,
    [user.id]
  );
  const rows = new Map(result.rows.map((row) => [row.category, row]));
  const now = new Date();
  const usage = Object.fromEntries(Object.entries(entitlements.limits).map(([category, limits]) => {
    const row = rows.get(category) || {};
    const fiveHours = Number(row.five_hour || 0);
    const week = Number(row.weekly || 0);
    return [category, {
      fiveHours,
      week,
      remainingFiveHours: Math.max(0, limits.fiveHours - fiveHours),
      remainingWeek: Math.max(0, limits.week - week),
      resetFiveHoursAt: row.first_five_hour ? resetTime(row.first_five_hour, FIVE_HOURS_MS, now).toISOString() : null,
      resetWeekAt: row.first_week ? resetTime(row.first_week, WEEK_MS, now).toISOString() : null,
      limits
    }];
  }));
  return { entitlements, usage, generatedAt: now.toISOString() };
}
