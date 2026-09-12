// OAuth tokens stay server-side, encrypted with AES-256-GCM, and are persisted
// in Railway MySQL under the authenticated Mere X account that owns them.

import crypto from "node:crypto";

import { query } from "./database.js";
import { PLUGIN_PROVIDERS, credentialsFor } from "./plugin-providers.js";

const connections = new Map();
let key;

function encryptionKey() {
  if (key) return key;
  const dedicated = String(process.env.PLUGIN_ENCRYPTION_KEY || "");
  if (dedicated) {
    const decoded = Buffer.from(dedicated, "base64");
    if (decoded.length !== 32) throw new Error("PLUGIN_ENCRYPTION_KEY must be 32 bytes encoded as base64.");
    key = decoded;
    return key;
  }

  const accountSecret = String(process.env.AUTH_CODE_SECRET || "");
  if (!accountSecret) throw new Error("AUTH_CODE_SECRET is required to protect plugin connections.");
  key = crypto.createHash("sha256").update("mere-x/plugin-connections/v1\0").update(accountSecret).digest();
  return key;
}

function ownerConnections(userId) {
  const owner = String(userId || "");
  if (!connections.has(owner)) connections.set(owner, {});
  return connections.get(owner);
}

export async function initConnections() {
  encryptionKey();
  connections.clear();
  const result = await query(
    `SELECT user_id, plugin_id, account, scope, encrypted_secret, connected_at
     FROM plugin_connections`
  );
  for (const row of result.rows) {
    ownerConnections(row.user_id)[row.plugin_id] = {
      account: row.account,
      scope: row.scope || "",
      connectedAt: row.connected_at instanceof Date ? row.connected_at.toISOString() : String(row.connected_at || ""),
      secret: row.encrypted_secret
    };
  }
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const sealed = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${sealed.toString("base64")}`;
}

function decrypt(value) {
  try {
    const [iv, tag, sealed] = String(value).split(".");
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    const plain = Buffer.concat([decipher.update(Buffer.from(sealed, "base64")), decipher.final()]);
    return JSON.parse(plain.toString("utf8"));
  } catch {
    return null;
  }
}

export async function saveConnection(userId, pluginId, connection) {
  const owner = String(userId);
  const connectedAt = new Date().toISOString();
  const secret = encrypt({
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken || "",
    expiresAt: connection.expiresAt || 0
  });
  await query(
    `INSERT INTO plugin_connections (user_id, plugin_id, account, scope, encrypted_secret, connected_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON DUPLICATE KEY UPDATE account = $3, scope = $4, encrypted_secret = $5, connected_at = now(), updated_at = now()`,
    [owner, pluginId, connection.account, connection.scope || "", secret]
  );
  ownerConnections(owner)[pluginId] = { account: connection.account, scope: connection.scope || "", connectedAt, secret };
}

export async function forgetConnection(userId, pluginId) {
  const owner = String(userId);
  const result = await query(`DELETE FROM plugin_connections WHERE user_id = $1 AND plugin_id = $2`, [owner, pluginId]);
  if (connections.get(owner)) delete connections.get(owner)[pluginId];
  return result.rowCount > 0;
}

export function connectionSummary(userId, pluginId) {
  const record = connections.get(String(userId))?.[pluginId];
  if (!record) return null;
  return { account: record.account, connectedAt: record.connectedAt, scope: record.scope };
}

export function connectedPluginIds(userId) {
  return Object.keys(connections.get(String(userId)) || {});
}

export async function accessTokenFor(userId, pluginId) {
  const record = connections.get(String(userId))?.[pluginId];
  if (!record) return null;
  const secret = decrypt(record.secret);
  if (!secret) return null;

  const expiresSoon = secret.expiresAt && secret.expiresAt - Date.now() < 60_000;
  if (!expiresSoon || !secret.refreshToken) return secret.accessToken;

  const config = PLUGIN_PROVIDERS[pluginId];
  const credentials = credentialsFor(pluginId);
  if (!config || !credentials) return secret.accessToken;

  try {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: secret.refreshToken,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret
      })
    });
    if (!response.ok) return secret.accessToken;
    const payload = await response.json();
    if (!payload.access_token) return secret.accessToken;

    await saveConnection(userId, pluginId, {
      account: record.account,
      scope: record.scope,
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token || secret.refreshToken,
      expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1_000 : 0
    });
    return payload.access_token;
  } catch {
    return secret.accessToken;
  }
}

export function signState(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, at: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", encryptionKey()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readState(state) {
  const [body, signature] = String(state || "").split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", encryptionKey()).update(body).digest("base64url");
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return Date.now() - payload.at > 10 * 60_000 ? null : payload;
  } catch {
    return null;
  }
}
