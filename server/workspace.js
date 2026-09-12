import express from "express";

import { query } from "./database.js";
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
    await query(
      `INSERT INTO workspace_snapshots (workspace_id, state, revision) VALUES ($1, $2, 1)
       ON DUPLICATE KEY UPDATE state = VALUES(state), revision = revision + 1, updated_at = now()`,
      [id, serialized]
    );
    await query(`UPDATE workspaces SET updated_at = now() WHERE id = $1`, [id]);
    const result = await query(`SELECT revision, updated_at FROM workspace_snapshots WHERE workspace_id = $1`, [id]);
    res.json({ revision: Number(result.rows[0].revision), updatedAt: result.rows[0].updated_at });
  }));

  return router;
}
