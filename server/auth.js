import crypto from "node:crypto";
import { promisify } from "node:util";

import express from "express";
import { OAuth2Client } from "google-auth-library";
import { Resend } from "resend";

import "./env.js";
import { query } from "./database.js";
import { effectivePlan } from "./entitlements.js";

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = "mere_x_session";
const SESSION_DAYS = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function clean(value, max = 254) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function email(value) {
  return clean(value).toLowerCase();
}

function nameFromEmail(value) {
  const words = value.split("@")[0].split(/[._+-]+/).filter(Boolean);
  return words.length ? words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ").slice(0, 120) : "Member";
}

function publicUser(row) {
  const plan = effectivePlan(row);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url || "",
    plan,
    planExpiresAt: plan === "Free" ? null : row.plan_expires_at || null,
    emailVerified: Boolean(row.email_verified_at)
  };
}

function tokenHash(token) {
  const secret = process.env.AUTH_CODE_SECRET || "";
  return secret
    ? crypto.createHmac("sha256", secret).update(token).digest("hex")
    : crypto.createHash("sha256").update(token).digest("hex");
}

export function credentialHash(value) {
  const secret = process.env.AUTH_CODE_SECRET || process.env.OPENAI_API_KEY || "mere-x";
  return crypto.createHmac("sha256", secret).update(String(value || "")).digest("hex");
}

function requestIpHash(req) {
  return tokenHash(req.ip || req.socket?.remoteAddress || "unknown");
}

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").flatMap((part) => {
    const index = part.indexOf("=");
    if (index < 1) return [];
    return [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]];
  }));
}

function secureCookies(req) {
  return process.env.NODE_ENV === "production" || req?.secure === true;
}

function setSessionCookie(req, res, token, remember = true) {
  const attributes = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secureCookies(req) ? "Secure" : "",
    remember ? `Max-Age=${SESSION_DAYS * 24 * 60 * 60}` : ""
  ].filter(Boolean);
  res.setHeader("Set-Cookie", attributes.join("; "));
}

function clearSessionCookie(req, res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookies(req) ? "; Secure" : ""}`);
}

async function passwordHash(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, 64, { cost: 16384, blockSize: 8, parallelization: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}

async function passwordMatches(password, stored) {
  const [algorithm, cost, blockSize, parallelization, saltValue, hashValue] = String(stored || "").split("$");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, "base64url");
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltValue, "base64url"), expected.length, {
    cost: Number(cost), blockSize: Number(blockSize), parallelization: Number(parallelization), maxmem: 64 * 1024 * 1024
  }));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

async function ensureWorkspace(userId, name) {
  await query(
    `INSERT INTO workspaces (owner_id, name) VALUES ($1, $2) ON DUPLICATE KEY UPDATE owner_id = VALUES(owner_id)`,
    [userId, `${name}'s Studio`.slice(0, 160)]
  );
}

function sessionTokenFromRequest(req) {
  return cookies(req)[SESSION_COOKIE] || "";
}

async function createSession(req, res, user, remember = true) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO auth_sessions (user_id, token_hash, expires_at, user_agent, ip_hash) VALUES ($1, $2, $3, $4, $5)`,
    [user.id, tokenHash(token), expiresAt, clean(req.headers["user-agent"], 500), requestIpHash(req)]
  );
  setSessionCookie(req, res, token, remember);
  /* Expired-session housekeeping must never delay a successful login. */
  void query(`DELETE FROM auth_sessions WHERE expires_at < now()`).catch((error) => {
    console.warn("Mere X session cleanup paused:", error?.code || error?.message);
  });
}

async function userForRequest(req) {
  const token = sessionTokenFromRequest(req);
  if (!token) return null;
  const result = await query(
    `SELECT u.* FROM auth_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'active' LIMIT 1`,
    [tokenHash(token)]
  );
  return result.rows[0] || null;
}

export async function optionalAuth(req, res, next) {
  try {
    const row = await userForRequest(req);
    req.authMethod = row ? "session" : null;
    req.userRecord = row;
    req.user = row ? publicUser(row) : null;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req, res, next) {
  if (req.user) return next();
  return res.status(401).json({ error: { code: "authentication_required", message: "Sign in to continue." } });
}

export function requireAccountAuth(req, res, next) {
  if (req.user && req.authMethod === "session") return next();
  return res.status(401).json({ error: { code: "account_session_required", message: "Sign in with your Mere X account to continue." } });
}

export async function requirePageAuth(req, res, next) {
  try {
    const row = await userForRequest(req);
    if (row) {
      req.userRecord = row;
      req.user = publicUser(row);
      return next();
    }
    const requested = String(req.originalUrl || "/app");
    const returnTo = /^\/app(?:[/?]|$)/.test(requested) || /^\/checkout(?:\?|$)/.test(requested)
      ? requested
      : "/app";
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(303, `/login?returnTo=${encodeURIComponent(returnTo)}`);
  } catch (error) {
    return next(error);
  }
}

async function issueEmailToken(user, purpose, minutes) {
  const token = crypto.randomBytes(32).toString("base64url");
  await query(`DELETE FROM email_tokens WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL`, [user.email, purpose]);
  await query(
    `INSERT INTO email_tokens (user_id, email, purpose, token_hash, expires_at) VALUES ($1, $2, $3, $4, DATE_ADD(now(), INTERVAL $5 MINUTE))`,
    [user.id, user.email, purpose, tokenHash(token), minutes]
  );
  return token;
}

async function sendAccountEmail({ user, purpose, token }) {
  if (!resend || !process.env.RESEND_FROM) return false;
  const base = String(process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");
  const reset = purpose === "reset_password";
  const url = reset ? `${base}/login?reset=${encodeURIComponent(token)}` : `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const title = reset ? "Reset your Mere X password" : "Verify your Mere X email";
  const action = reset ? "Reset password" : "Verify email";
  await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: user.email,
    subject: title,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#171713"><h1 style="font-size:28px">${title}</h1><p>Hello ${clean(user.name, 120)},</p><p>${reset ? "Use the secure link below to choose a new password. It expires in 30 minutes." : "Confirm this email address to finish securing your account."}</p><p><a href="${url}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#171713;color:#fff;text-decoration:none">${action}</a></p><p style="color:#6e6b62;font-size:12px">If you did not request this, you can ignore this message.</p></div>`
  });
  return true;
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function createAuthRouter() {
  const router = express.Router();

  router.get("/config", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || "" });
  });

  router.get("/session", asyncRoute(async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const row = await userForRequest(req);
    if (!row) return res.json({ user: null });
    res.json({ user: publicUser(row) });
  }));

  router.post("/signup", asyncRoute(async (req, res) => {
    const userEmail = email(req.body?.email);
    const password = String(req.body?.password || "");
    if (!EMAIL_PATTERN.test(userEmail)) return res.status(400).json({ error: { code: "invalid_email", message: "Enter a valid email address." } });
    if (password.length < 8 || password.length > 256 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: { code: "weak_password", message: "Use at least 8 characters with letters and numbers." } });
    }
    const existing = await query(`SELECT id FROM users WHERE lower(email) = $1`, [userEmail]);
    if (existing.rowCount) return res.status(409).json({ error: { code: "email_exists", message: "That email is already registered." } });
    const userName = clean(req.body?.name, 120) || nameFromEmail(userEmail);
    const created = await query(
      `INSERT INTO users (email, name, password_hash, last_login_at) VALUES ($1, $2, $3, now())`,
      [userEmail, userName, await passwordHash(password)]
    );
    const result = await query(`SELECT * FROM users WHERE id = $1`, [created.insertId]);
    const row = result.rows[0];
    await ensureWorkspace(row.id, row.name);
    await createSession(req, res, row, true);
    try {
      const token = await issueEmailToken(row, "verify_email", 24 * 60);
      await sendAccountEmail({ user: row, purpose: "verify_email", token });
    } catch (error) {
      console.error("Mere X verification email failed:", error.message);
    }
    res.status(201).json({ user: publicUser(row) });
  }));

  router.post("/login", asyncRoute(async (req, res) => {
    const userEmail = email(req.body?.email);
    const password = String(req.body?.password || "");
    const result = await query(`SELECT * FROM users WHERE lower(email) = $1 AND status = 'active' LIMIT 1`, [userEmail]);
    const row = result.rows[0];
    if (!row?.password_hash || !(await passwordMatches(password, row.password_hash))) {
      return res.status(401).json({ error: { code: "invalid_credentials", message: "The email or password is incorrect." } });
    }
    await query(`UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1`, [row.id]);
    await createSession(req, res, row, req.body?.remember !== false);
    res.json({ user: publicUser(row) });
  }));

  router.post("/google", asyncRoute(async (req, res) => {
    if (!googleClient || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: { code: "google_not_configured", message: "Google sign-in is not configured." } });
    }
    const credential = clean(req.body?.credential, 8_000);
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    } catch {
      return res.status(401).json({ error: { code: "invalid_google_identity", message: "Google could not verify this account." } });
    }
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ error: { code: "invalid_google_identity", message: "Google could not verify this account." } });
    }
    const userEmail = email(payload.email);
    const userName = clean(payload.name, 120) || nameFromEmail(userEmail);
    let result = await query(`SELECT * FROM users WHERE google_sub = $1 OR lower(email) = $2 LIMIT 1`, [payload.sub, userEmail]);
    let row = result.rows[0];
    if (row && row.google_sub && row.google_sub !== payload.sub) {
      return res.status(409).json({ error: { code: "identity_conflict", message: "This email is linked to a different Google account." } });
    }
    if (row) {
      const avatarUrl = clean(payload.picture, 1_000) || row.avatar_url || null;
      const resolvedName = row.name || userName;
      await query(
        `UPDATE users SET google_sub = COALESCE(google_sub, $2), name = COALESCE(NULLIF(name, ''), $3), avatar_url = COALESCE($4, avatar_url), email_verified_at = COALESCE(email_verified_at, now()), last_login_at = now(), updated_at = now() WHERE id = $1`,
        [row.id, payload.sub, userName, avatarUrl]
      );
      row = {
        ...row,
        google_sub: row.google_sub || payload.sub,
        name: resolvedName,
        avatar_url: avatarUrl,
        email_verified_at: row.email_verified_at || new Date(),
        last_login_at: new Date()
      };
    } else {
      const created = await query(
        `INSERT INTO users (email, name, google_sub, avatar_url, email_verified_at, last_login_at) VALUES ($1, $2, $3, $4, now(), now())`,
        [userEmail, userName, payload.sub, clean(payload.picture, 1_000) || null]
      );
      row = {
        id: created.insertId,
        email: userEmail,
        name: userName,
        google_sub: payload.sub,
        avatar_url: clean(payload.picture, 1_000) || null,
        email_verified_at: new Date(),
        plan: "Free",
        plan_expires_at: null
      };
    }
    await createSession(req, res, row, true);
    /* The Studio row is idempotent and the workspace API can create it too;
       do not make Google sign-in wait on a second non-critical write. */
    void ensureWorkspace(row.id, row.name).catch((error) => {
      console.warn("Mere X Studio provisioning paused:", error?.code || error?.message);
    });
    res.json({ user: publicUser(row) });
  }));

  router.post("/logout", asyncRoute(async (req, res) => {
    const token = sessionTokenFromRequest(req);
    if (token) await query(`DELETE FROM auth_sessions WHERE token_hash = $1`, [tokenHash(token)]);
    clearSessionCookie(req, res);
    res.status(204).end();
  }));

  router.patch("/profile", requireAccountAuth, asyncRoute(async (req, res) => {
    const userName = clean(req.body?.name, 120) || req.user.name;
    const userEmail = email(req.body?.email || req.user.email);
    if (!EMAIL_PATTERN.test(userEmail)) return res.status(400).json({ error: { code: "invalid_email", message: "Enter a valid email address." } });
    if (userEmail !== req.user.email.toLowerCase()) {
      const existing = await query(`SELECT id FROM users WHERE lower(email) = $1 AND id <> $2`, [userEmail, req.user.id]);
      if (existing.rowCount) return res.status(409).json({ error: { code: "email_exists", message: "That email is already registered." } });
    }
    await query(
      `UPDATE users SET name = $2, email_verified_at = CASE WHEN lower(email) = $3 THEN email_verified_at ELSE NULL END, email = $3, updated_at = now() WHERE id = $1`,
      [req.user.id, userName, userEmail]
    );
    const result = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
    const row = result.rows[0];
    if (!row.email_verified_at) {
      try {
        const token = await issueEmailToken(row, "verify_email", 24 * 60);
        await sendAccountEmail({ user: row, purpose: "verify_email", token });
      } catch (error) {
        console.error("Mere X verification email failed:", error.message);
      }
    }
    res.json({ user: publicUser(row) });
  }));

  router.post("/change-password", requireAccountAuth, asyncRoute(async (req, res) => {
    const password = String(req.body?.password || "");
    if (password.length < 8 || password.length > 256 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: { code: "weak_password", message: "Use at least 8 characters with letters and numbers." } });
    }
    await query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [req.user.id, await passwordHash(password)]);
    res.json({ ok: true });
  }));

  router.post("/forgot-password", asyncRoute(async (req, res) => {
    const userEmail = email(req.body?.email);
    const result = EMAIL_PATTERN.test(userEmail) ? await query(`SELECT * FROM users WHERE lower(email) = $1 AND status = 'active' LIMIT 1`, [userEmail]) : { rows: [] };
    const row = result.rows[0];
    if (row) {
      try {
        const token = await issueEmailToken(row, "reset_password", 30);
        await sendAccountEmail({ user: row, purpose: "reset_password", token });
      } catch (error) {
        console.error("Mere X reset email failed:", error.message);
      }
    }
    res.json({ ok: true, message: "If that email has an account, a reset link is on its way." });
  }));

  router.post("/reset-password", asyncRoute(async (req, res) => {
    const token = clean(req.body?.token, 200);
    const password = String(req.body?.password || "");
    if (password.length < 8 || password.length > 256 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: { code: "weak_password", message: "Use at least 8 characters with letters and numbers." } });
    }
    const result = await query(`SELECT user_id FROM email_tokens WHERE token_hash = $1 AND purpose = 'reset_password' AND consumed_at IS NULL AND expires_at > now() LIMIT 1`, [tokenHash(token)]);
    if (!result.rowCount) return res.status(400).json({ error: { code: "invalid_reset_token", message: "This reset link is invalid or expired." } });
    const userId = result.rows[0].user_id;
    const consumed = await query(`UPDATE email_tokens SET consumed_at = now() WHERE token_hash = $1 AND consumed_at IS NULL`, [tokenHash(token)]);
    if (!consumed.rowCount) return res.status(400).json({ error: { code: "invalid_reset_token", message: "This reset link is invalid or expired." } });
    await query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [userId, await passwordHash(password)]);
    await query(`DELETE FROM auth_sessions WHERE user_id = $1`, [userId]);
    res.json({ ok: true });
  }));

  router.get("/verify-email", asyncRoute(async (req, res) => {
    const token = clean(req.query?.token, 200);
    const result = await query(`SELECT user_id FROM email_tokens WHERE token_hash = $1 AND purpose = 'verify_email' AND consumed_at IS NULL AND expires_at > now() LIMIT 1`, [tokenHash(token)]);
    if (!result.rowCount) return res.status(400).send("This verification link is invalid or expired.");
    const consumed = await query(`UPDATE email_tokens SET consumed_at = now() WHERE token_hash = $1 AND consumed_at IS NULL`, [tokenHash(token)]);
    if (!consumed.rowCount) return res.status(400).send("This verification link is invalid or expired.");
    await query(`UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1`, [result.rows[0].user_id]);
    res.redirect("/?verified=1");
  }));

  return router;
}
