import express from "express";

import { query, transaction } from "./database.js";
import { requireAccountAuth } from "./auth.js";

const MAX_STATE_BYTES = 1_750_000;

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function workspaceId(userId) {
  const result = await query(`SELECT id FROM workspaces WHERE owner_id = $1 LIMIT 1`, [userId]);
  if (result.rows[0]) return result.rows[0].id;
  const created = await query(`INSERT INTO workspaces (owner_id) VALUES ($1)`, [userId]);
  return created.insertId;
}

function uniqueRecords(value, maxIdLength = 160) {
  const records = new Map();
  for (const item of Array.isArray(value) ? value : []) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const id = String(item.id || "").trim().slice(0, maxIdLength);
    if (id) records.set(id, item);
  }
  return [...records.entries()];
}

async function insertRows(run, table, columns, rows) {
  if (!rows.length) return;
  const values = [];
  const placeholders = rows.map((row) => `(${row.map((value) => {
    values.push(value);
    return `$${values.length}`;
  }).join(", ")})`).join(", ");
  await run(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`, values);
}

/* Keep queryable records in step with the canonical workspace snapshot. The
   replacement happens in the same transaction, so reporting and future APIs
   never observe a partially synchronized conversation history. */
async function replaceWorkspaceRecords(run, id, state) {
  await run(`DELETE FROM conversations WHERE workspace_id = $1`, [id]);
  await run(`DELETE FROM projects WHERE workspace_id = $1`, [id]);

  const projects = uniqueRecords(state.projects);
  await insertRows(run, "projects", ["workspace_id", "external_id", "data"], projects.map(([externalId, project]) => [
    id,
    externalId,
    JSON.stringify(project)
  ]));

  const conversations = uniqueRecords(state.conversations);
  await insertRows(run, "conversations", ["workspace_id", "external_id", "project_external_id", "title", "data"], conversations.map(([externalId, conversation]) => {
    const { messages, ...conversationData } = conversation;
    return [
      id,
      externalId,
      String(conversation.projectId || "").trim().slice(0, 160) || null,
      String(conversation.title || "New conversation").trim().slice(0, 255) || "New conversation",
      JSON.stringify(conversationData)
    ];
  }));
  if (!conversations.length) return;

  const stored = await run(`SELECT id, external_id FROM conversations WHERE workspace_id = $1`, [id]);
  const databaseIds = new Map(stored.rows.map((row) => [String(row.external_id), row.id]));
  const messages = [];
  for (const [externalId, conversation] of conversations) {
    const conversationId = databaseIds.get(externalId);
    if (!conversationId) continue;
    for (const [messageId, message] of uniqueRecords(conversation.messages)) {
      const role = ["user", "assistant", "system", "tool"].includes(message.role) ? message.role : "user";
      messages.push([conversationId, messageId, role, String(message.text || ""), JSON.stringify(message)]);
    }
  }
  await insertRows(run, "messages", ["conversation_id", "external_id", "role", "content", "data"], messages);
}

export function createWorkspaceRouter() {
  const router = express.Router();
  router.use(requireAccountAuth);

  router.get("/", asyncRoute(async (req, res) => {
    const id = await workspaceId(req.user.id);
    const result = await query(`SELECT state, revision, updated_at FROM workspace_snapshots WHERE workspace_id = $1`, [id]);
    const snapshot = result.rows[0];
    res.setHeader("Cache-Control", "no-store");
    res.json({ state: snapshot?.state || null, revision: Number(snapshot?.revision || 0), updatedAt: snapshot?.updated_at || null });
  }));

  router.put("/", asyncRoute(async (req, res) => {
    const state = req.body?.state;
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      return res.status(400).json({ error: { code: "invalid_workspace", message: "Workspace state must be an object." } });
    }
    const serialized = JSON.stringify(state);
    if (Buffer.byteLength(serialized, "utf8") > MAX_STATE_BYTES) {
      return res.status(413).json({ error: { code: "workspace_too_large", message: "This workspace snapshot is too large to sync." } });
    }
    const id = await workspaceId(req.user.id);
    try {
      await transaction(async (run) => {
        await run(
          `INSERT INTO workspace_snapshots (workspace_id, state, revision) VALUES ($1, $2, 1)
           ON DUPLICATE KEY UPDATE state = VALUES(state), revision = revision + 1, updated_at = now()`,
          [id, serialized]
        );
        await replaceWorkspaceRecords(run, id, state);
        await run(`UPDATE workspaces SET updated_at = now() WHERE id = $1`, [id]);
      });
    } catch (error) {
      console.error("Mere X workspace sync failed:", error?.code || "database_error", error?.message || "Unknown database error");
      throw error;
    }
    const result = await query(`SELECT revision, updated_at FROM workspace_snapshots WHERE workspace_id = $1`, [id]);
    res.json({ revision: Number(result.rows[0].revision), updatedAt: result.rows[0].updated_at });
  }));

  return router;
}
