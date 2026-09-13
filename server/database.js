import mysql from "mysql2/promise";

import "./env.js";

let pool;

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function database() {
  if (!databaseConfigured()) {
    const error = new Error("The Mere X database is not configured.");
    error.status = 503;
    error.code = "database_not_configured";
    throw error;
  }
  pool ||= mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: Number(process.env.DATABASE_POOL_SIZE || 10),
    maxIdle: Number(process.env.DATABASE_POOL_SIZE || 10),
    idleTimeout: 30_000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: "utf8mb4"
  });
  return pool;
}

function mysqlParameters(text, values) {
  const ordered = [];
  const sql = text.replace(/\$(\d+)/g, (match, number) => {
    ordered.push(values[Number(number) - 1]);
    return "?";
  });
  return { sql, ordered };
}

async function execute(target, text, values = []) {
  const { sql, ordered } = mysqlParameters(text, values);
  const [result] = await target.execute(sql, ordered);
  if (Array.isArray(result)) return { rows: result, rowCount: result.length };
  return {
    rows: [],
    rowCount: Number(result.affectedRows || 0),
    insertId: result.insertId,
    changedRows: Number(result.changedRows || 0)
  };
}

export async function query(text, values = []) {
  return execute(database(), text, values);
}

export async function transaction(work, { maxRetries = 2 } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    const connection = await database().getConnection();
    try {
      await connection.beginTransaction();
      const result = await work((text, values = []) => execute(connection, text, values));
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      if (error?.code !== "ER_LOCK_DEADLOCK" || attempt >= maxRetries) throw error;
    } finally {
      connection.release();
    }
    await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
  }
}

export async function initDatabase() {
  if (!databaseConfigured()) return false;
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      email varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
      name varchar(120) NOT NULL,
      password_hash varchar(255),
      google_sub varchar(255) UNIQUE,
      avatar_url varchar(1000),
      email_verified_at datetime(3),
      status enum('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active',
      plan varchar(40) NOT NULL DEFAULT 'Free',
      plan_expires_at datetime(3),
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      last_login_at datetime(3),
      PRIMARY KEY (id),
      UNIQUE KEY users_email_uidx (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      user_id bigint unsigned NOT NULL,
      token_hash char(64) NOT NULL,
      expires_at datetime(3) NOT NULL,
      user_agent varchar(500),
      ip_hash char(64),
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY auth_sessions_token_uidx (token_hash),
      KEY auth_sessions_user_idx (user_id),
      KEY auth_sessions_expiry_idx (expires_at),
      CONSTRAINT auth_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS plugin_connections (
      user_id bigint unsigned NOT NULL,
      plugin_id varchar(80) NOT NULL,
      account varchar(500) NOT NULL,
      scope varchar(2000) NOT NULL DEFAULT '',
      encrypted_secret longtext NOT NULL,
      connected_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (user_id, plugin_id),
      CONSTRAINT plugin_connections_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS email_tokens (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      user_id bigint unsigned,
      email varchar(254) NOT NULL,
      purpose enum('verify_email', 'reset_password') NOT NULL,
      token_hash char(64) NOT NULL,
      expires_at datetime(3) NOT NULL,
      consumed_at datetime(3),
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY email_tokens_hash_uidx (token_hash),
      KEY email_tokens_lookup_idx (token_hash, purpose, expires_at),
      CONSTRAINT email_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      owner_id bigint unsigned NOT NULL,
      name varchar(160) NOT NULL DEFAULT 'My Mere X workspace',
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY workspaces_owner_uidx (owner_id),
      CONSTRAINT workspaces_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS workspace_snapshots (
      workspace_id bigint unsigned NOT NULL,
      state json NOT NULL,
      revision bigint unsigned NOT NULL DEFAULT 1,
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (workspace_id),
      CONSTRAINT workspace_snapshots_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS projects (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      workspace_id bigint unsigned NOT NULL,
      external_id varchar(160) NOT NULL,
      data json NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY projects_external_uidx (workspace_id, external_id),
      CONSTRAINT projects_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      workspace_id bigint unsigned NOT NULL,
      external_id varchar(160) NOT NULL,
      project_external_id varchar(160),
      title varchar(255) NOT NULL DEFAULT 'New conversation',
      data json NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY conversations_external_uidx (workspace_id, external_id),
      CONSTRAINT conversations_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      conversation_id bigint unsigned NOT NULL,
      external_id varchar(160) NOT NULL,
      role enum('user', 'assistant', 'system', 'tool') NOT NULL,
      content longtext NOT NULL,
      data json NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY messages_external_uidx (conversation_id, external_id),
      CONSTRAINT messages_conversation_fk FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS user_files (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      user_id bigint unsigned NOT NULL,
      workspace_id bigint unsigned,
      external_id varchar(160),
      name varchar(255) NOT NULL,
      mime_type varchar(160),
      size_bytes bigint unsigned NOT NULL DEFAULT 0,
      storage_key varchar(1000) NOT NULL,
      metadata json NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY user_files_user_idx (user_id, created_at),
      CONSTRAINT user_files_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT user_files_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      user_id bigint unsigned NOT NULL,
      provider varchar(40) NOT NULL DEFAULT 'paypal',
      provider_order_id varchar(120) NOT NULL,
      provider_capture_id varchar(120),
      plan varchar(40) NOT NULL,
      amount decimal(12,2) NOT NULL,
      currency char(3) NOT NULL,
      status varchar(40) NOT NULL,
      payment_method varchar(40),
      provider_status json NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      captured_at datetime(3),
      PRIMARY KEY (id),
      UNIQUE KEY payments_order_uidx (provider_order_id),
      UNIQUE KEY payments_capture_uidx (provider_capture_id),
      KEY payments_user_idx (user_id, created_at),
      CONSTRAINT payments_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      provider_event_id varchar(120) NOT NULL,
      event_type varchar(120) NOT NULL,
      payload json NOT NULL,
      processed_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (provider_event_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS developer_api_keys (
      id char(36) NOT NULL,
      user_id bigint unsigned NOT NULL,
      name varchar(120) NOT NULL,
      token_hash char(64) NOT NULL,
      key_prefix varchar(24) NOT NULL,
      last_four char(4) NOT NULL,
      environment enum('live', 'test') NOT NULL DEFAULT 'live',
      scopes json NOT NULL,
      monthly_limit_usd decimal(12,2) NOT NULL DEFAULT 0,
      status enum('active', 'revoked') NOT NULL DEFAULT 'active',
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      last_used_at datetime(3),
      revoked_at datetime(3),
      PRIMARY KEY (id),
      UNIQUE KEY developer_api_keys_token_uidx (token_hash),
      KEY developer_api_keys_user_idx (user_id, created_at),
      CONSTRAINT developer_api_keys_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS developer_webhooks (
      id char(36) NOT NULL,
      user_id bigint unsigned NOT NULL,
      url varchar(2000) NOT NULL,
      events json NOT NULL,
      signing_secret_hash char(64) NOT NULL,
      status enum('active', 'disabled') NOT NULL DEFAULT 'active',
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY developer_webhooks_user_idx (user_id, created_at),
      CONSTRAINT developer_webhooks_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS developer_preferences (
      user_id bigint unsigned NOT NULL,
      settings json NOT NULL,
      billing json NOT NULL,
      onboarding json NOT NULL,
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (user_id),
      CONSTRAINT developer_preferences_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS developer_request_logs (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      request_id char(36) NOT NULL,
      user_id bigint unsigned NOT NULL,
      api_key_id char(36),
      endpoint varchar(160) NOT NULL,
      model varchar(120),
      status_code smallint unsigned NOT NULL,
      latency_ms int unsigned NOT NULL DEFAULT 0,
      input_tokens int unsigned NOT NULL DEFAULT 0,
      output_tokens int unsigned NOT NULL DEFAULT 0,
      estimated_cost_usd decimal(14,8) NOT NULL DEFAULT 0,
      stop_reason varchar(80),
      error_code varchar(120),
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY developer_request_logs_request_uidx (request_id),
      KEY developer_request_logs_user_idx (user_id, created_at),
      CONSTRAINT developer_request_logs_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT developer_request_logs_key_fk FOREIGN KEY (api_key_id) REFERENCES developer_api_keys(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS developer_audit_events (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      user_id bigint unsigned NOT NULL,
      action varchar(120) NOT NULL,
      target varchar(500) NOT NULL DEFAULT '',
      ip_hash char(64),
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY developer_audit_events_user_idx (user_id, created_at),
      CONSTRAINT developer_audit_events_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  return true;
}

export async function closeDatabase() {
  if (pool) await pool.end();
  pool = undefined;
}
