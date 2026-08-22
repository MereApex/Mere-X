import mysql from 'mysql2/promise'

let pool = null
let ready = false

const migrations = [
  {
    version: 1,
    name: 'initial_platform_schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) CHARACTER SET ascii PRIMARY KEY,
        email VARCHAR(320) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        plan VARCHAR(32) NOT NULL DEFAULT 'free',
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        INDEX users_updated_at (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS sessions (
        token_hash CHAR(64) CHARACTER SET ascii PRIMARY KEY,
        user_id CHAR(36) CHARACTER SET ascii NOT NULL,
        expires_at BIGINT UNSIGNED NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        INDEX sessions_user_created (user_id, created_at),
        INDEX sessions_expiry (expires_at),
        CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS password_resets (
        token_hash CHAR(64) CHARACTER SET ascii PRIMARY KEY,
        user_id CHAR(36) CHARACTER SET ascii NOT NULL,
        expires_at BIGINT UNSIGNED NOT NULL,
        used_at BIGINT UNSIGNED NULL,
        INDEX password_resets_user (user_id),
        INDEX password_resets_expiry (expires_at),
        CONSTRAINT password_resets_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS workspaces (
        user_id CHAR(36) CHARACTER SET ascii PRIMARY KEY,
        version BIGINT UNSIGNED NOT NULL DEFAULT 1,
        data LONGTEXT NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        CONSTRAINT workspaces_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS shared_conversations (
        id VARCHAR(40) CHARACTER SET ascii PRIMARY KEY,
        owner_id CHAR(36) CHARACTER SET ascii NULL,
        title VARCHAR(160) NOT NULL,
        messages LONGTEXT NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        expires_at BIGINT UNSIGNED NULL,
        INDEX shared_owner (owner_id),
        INDEX shared_expiry (expires_at),
        CONSTRAINT shared_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS usage_events (
        id CHAR(36) CHARACTER SET ascii PRIMARY KEY,
        subject VARCHAR(220) NOT NULL,
        kind VARCHAR(48) NOT NULL,
        units DECIMAL(14,4) NOT NULL,
        cost_usd DECIMAL(14,6) NOT NULL DEFAULT 0,
        metadata LONGTEXT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        INDEX usage_subject_time (subject(191), created_at),
        INDEX usage_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS stored_files (
        id CHAR(36) CHARACTER SET ascii PRIMARY KEY,
        owner_id CHAR(36) CHARACTER SET ascii NULL,
        guest_id VARCHAR(120) CHARACTER SET ascii NULL,
        name VARCHAR(220) NOT NULL,
        mime_type VARCHAR(160) NOT NULL,
        file_data LONGBLOB NOT NULL,
        size BIGINT UNSIGNED NOT NULL,
        checksum CHAR(64) CHARACTER SET ascii NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        INDEX stored_files_owner_created (owner_id, created_at),
        INDEX stored_files_guest_created (guest_id, created_at),
        CONSTRAINT stored_files_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS jobs (
        id CHAR(36) CHARACTER SET ascii PRIMARY KEY,
        owner_id CHAR(36) CHARACTER SET ascii NULL,
        guest_id VARCHAR(120) CHARACTER SET ascii NULL,
        type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        payload LONGTEXT NULL,
        result LONGTEXT NULL,
        error TEXT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        INDEX jobs_owner_updated (owner_id, updated_at),
        INDEX jobs_guest_updated (guest_id, updated_at),
        INDEX jobs_status_updated (status, updated_at),
        CONSTRAINT jobs_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS knowledge_stores (
        owner_id CHAR(36) CHARACTER SET ascii NOT NULL,
        project_id VARCHAR(160) NOT NULL,
        store_name VARCHAR(512) NOT NULL,
        display_name VARCHAR(160) NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (owner_id, project_id),
        CONSTRAINT knowledge_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS billing_events (
        id VARCHAR(160) CHARACTER SET ascii PRIMARY KEY,
        user_id CHAR(36) CHARACTER SET ascii NULL,
        event_type VARCHAR(80) NOT NULL,
        payload LONGTEXT NULL,
        processed_at BIGINT UNSIGNED NOT NULL,
        INDEX billing_events_user (user_id, processed_at),
        CONSTRAINT billing_events_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS audit_events (
        id CHAR(36) CHARACTER SET ascii PRIMARY KEY,
        user_id CHAR(36) CHARACTER SET ascii NULL,
        action VARCHAR(120) NOT NULL,
        metadata LONGTEXT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        INDEX audit_user_time (user_id, created_at),
        INDEX audit_action_time (action, created_at),
        CONSTRAINT audit_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ],
  },
  {
    version: 2,
    name: 'production_billing_schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS billing_products (
        environment VARCHAR(16) CHARACTER SET ascii NOT NULL,
        product_key VARCHAR(64) CHARACTER SET ascii NOT NULL,
        provider_product_id VARCHAR(80) CHARACTER SET ascii NOT NULL,
        status VARCHAR(32) CHARACTER SET ascii NOT NULL DEFAULT 'ACTIVE',
        payload LONGTEXT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (environment, product_key),
        UNIQUE KEY billing_products_provider (provider_product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS billing_plans (
        environment VARCHAR(16) CHARACTER SET ascii NOT NULL,
        plan_key VARCHAR(32) CHARACTER SET ascii NOT NULL,
        billing_cycle VARCHAR(16) CHARACTER SET ascii NOT NULL,
        currency CHAR(3) CHARACTER SET ascii NOT NULL,
        unit_amount DECIMAL(12,2) NOT NULL,
        provider_plan_id VARCHAR(80) CHARACTER SET ascii NOT NULL,
        status VARCHAR(32) CHARACTER SET ascii NOT NULL,
        payload LONGTEXT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (environment, plan_key, billing_cycle),
        UNIQUE KEY billing_plans_provider (provider_plan_id),
        INDEX billing_plans_status (environment, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS billing_subscriptions (
        id CHAR(36) CHARACTER SET ascii PRIMARY KEY,
        user_id CHAR(36) CHARACTER SET ascii NOT NULL,
        provider_subscription_id VARCHAR(80) CHARACTER SET ascii NOT NULL,
        provider_plan_id VARCHAR(80) CHARACTER SET ascii NOT NULL,
        plan_key VARCHAR(32) CHARACTER SET ascii NOT NULL,
        billing_cycle VARCHAR(16) CHARACTER SET ascii NOT NULL,
        quantity INT UNSIGNED NOT NULL DEFAULT 1,
        status VARCHAR(32) CHARACTER SET ascii NOT NULL,
        payer_id VARCHAR(80) CHARACTER SET ascii NULL,
        access_expires_at BIGINT UNSIGNED NULL,
        cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
        payload LONGTEXT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        UNIQUE KEY billing_subscriptions_provider (provider_subscription_id),
        INDEX billing_subscriptions_user_updated (user_id, updated_at),
        INDEX billing_subscriptions_status_expiry (status, access_expires_at),
        CONSTRAINT billing_subscriptions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS billing_transactions (
        id VARCHAR(160) CHARACTER SET ascii PRIMARY KEY,
        subscription_id CHAR(36) CHARACTER SET ascii NULL,
        user_id CHAR(36) CHARACTER SET ascii NULL,
        provider_transaction_id VARCHAR(160) CHARACTER SET ascii NULL,
        event_type VARCHAR(100) CHARACTER SET ascii NOT NULL,
        status VARCHAR(40) CHARACTER SET ascii NOT NULL,
        amount DECIMAL(12,2) NULL,
        currency CHAR(3) CHARACTER SET ascii NULL,
        payload LONGTEXT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        INDEX billing_transactions_provider (provider_transaction_id),
        INDEX billing_transactions_user_created (user_id, created_at),
        CONSTRAINT billing_transactions_subscription_fk FOREIGN KEY (subscription_id) REFERENCES billing_subscriptions(id) ON DELETE SET NULL,
        CONSTRAINT billing_transactions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ],
  },
  {
    version: 3,
    name: 'billing_transaction_event_history',
    statements: [
      'ALTER TABLE billing_transactions DROP INDEX billing_transactions_provider',
      'ALTER TABLE billing_transactions ADD INDEX billing_transactions_provider (provider_transaction_id)',
    ],
  },
  {
    version: 4,
    name: 'verified_email_and_federated_identity',
    statements: [
      'ALTER TABLE users ADD COLUMN email_verified_at BIGINT UNSIGNED NULL AFTER plan',
      'UPDATE users SET email_verified_at=created_at WHERE email_verified_at IS NULL',
      `CREATE TABLE IF NOT EXISTS auth_identities (
        provider VARCHAR(32) CHARACTER SET ascii NOT NULL,
        provider_subject VARCHAR(255) CHARACTER SET ascii NOT NULL,
        user_id CHAR(36) CHARACTER SET ascii NOT NULL,
        provider_email VARCHAR(320) NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (provider, provider_subject),
        INDEX auth_identities_user (user_id),
        CONSTRAINT auth_identities_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS email_challenges (
        id CHAR(36) CHARACTER SET ascii PRIMARY KEY,
        email VARCHAR(320) NOT NULL,
        purpose VARCHAR(32) CHARACTER SET ascii NOT NULL,
        code_hash CHAR(64) CHARACTER SET ascii NOT NULL,
        name VARCHAR(100) NULL,
        password_hash VARCHAR(255) CHARACTER SET ascii NULL,
        attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
        expires_at BIGINT UNSIGNED NOT NULL,
        consumed_at BIGINT UNSIGNED NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        INDEX email_challenges_email_purpose (email, purpose, created_at),
        INDEX email_challenges_expiry (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ],
  },
  {
    version: 5,
    name: 'profile_photo_and_password_state',
    statements: [
      // avatar_url is the URL the interface renders: a federated provider photo,
      // or /api/account/avatar for a photo the account owner uploaded.
      'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512) NULL AFTER name',
      'ALTER TABLE users ADD COLUMN avatar_updated_at BIGINT UNSIGNED NULL AFTER avatar_url',
      // Accounts created through a federated provider have no password the person
      // knows, so password-only confirmations must not lock them out of their account.
      'ALTER TABLE users ADD COLUMN password_set TINYINT(1) NOT NULL DEFAULT 1 AFTER password_hash',
      `CREATE TABLE IF NOT EXISTS user_avatars (
        user_id CHAR(36) CHARACTER SET ascii PRIMARY KEY,
        mime_type VARCHAR(64) CHARACTER SET ascii NOT NULL,
        image_data MEDIUMBLOB NOT NULL,
        size INT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        CONSTRAINT user_avatars_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      'ALTER TABLE auth_identities ADD COLUMN updated_at BIGINT UNSIGNED NULL',
      // Keeping the provider photo here lets the account fall back to it when an
      // uploaded photo is removed, without re-authenticating with the provider.
      'ALTER TABLE auth_identities ADD COLUMN provider_avatar_url VARCHAR(512) NULL',
      'UPDATE auth_identities SET updated_at=created_at WHERE updated_at IS NULL',
      // Accounts that were *created* by Google (rather than linked to an existing
      // password account) hold an unusable random password. The creation audit
      // record is the only reliable marker, so use it to flag them.
      `UPDATE users SET password_set=0 WHERE id IN (
        SELECT user_id FROM audit_events
        WHERE action='account.created' AND user_id IS NOT NULL AND metadata LIKE '%"method":"google"%'
      )`,
    ],
  },
  {
    version: 6,
    name: 'federated_profile_photo_fallback',
    statements: [
      'ALTER TABLE auth_identities ADD COLUMN provider_avatar_url VARCHAR(512) NULL',
    ],
  },
  {
    version: 7,
    name: 'verified_email_change',
    statements: [
      // An email challenge can now belong to a specific account, which is what
      // lets a change of address be confirmed at the new address.
      'ALTER TABLE email_challenges ADD COLUMN user_id CHAR(36) CHARACTER SET ascii NULL',
      'ALTER TABLE email_challenges ADD INDEX email_challenges_user (user_id, purpose)',
    ],
  },
]

// MySQL commits DDL implicitly, so a migration that fails halfway leaves the
// statements before it in place. Re-running must therefore treat "this change is
// already here" as success instead of blocking every later migration.
const alreadyAppliedCodes = new Set([
  'ER_DUP_FIELDNAME',
  'ER_DUP_KEYNAME',
  'ER_TABLE_EXISTS_ERROR',
  'ER_CANT_DROP_FIELD_OR_KEY',
  'ER_DUP_ENTRY',
  'ER_FK_DUP_NAME',
])

function connectionOptions() {
  const value = process.env.DATABASE_URL || process.env.MYSQL_URL
  if (!value) throw new Error('DATABASE_URL or MYSQL_URL is required.')
  const url = new URL(value.replace(/^mysql:/, 'http:'))
  const sslEnabled = ['1', 'true', 'required'].includes(String(process.env.MYSQL_SSL || '').toLowerCase())
  const poolSize = Math.max(2, Math.min(30, Number(process.env.MYSQL_POOL_SIZE || 10)))
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    waitForConnections: true,
    connectionLimit: poolSize,
    maxIdle: poolSize,
    idleTimeout: 60_000,
    queueLimit: 100,
    connectTimeout: 12_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
    decimalNumbers: true,
    ssl: sslEnabled ? { rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
  }
}

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.MYSQL_URL)
}

export function databaseReady() {
  return ready
}

export function getPool() {
  if (!pool) pool = mysql.createPool(connectionOptions())
  return pool
}

export async function execute(sql, values = []) {
  return getPool().execute(sql, values)
}

export async function withTransaction(callback) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const connection = await getPool().getConnection()
    try {
      await connection.beginTransaction()
      const result = await callback(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback().catch(() => undefined)
      const retryable = error?.code === 'ER_LOCK_DEADLOCK' || error?.code === 'ER_LOCK_WAIT_TIMEOUT'
      if (!retryable || attempt === 2) throw error
      await new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1)))
    } finally {
      connection.release()
    }
  }
}

async function runMigrations() {
  const connection = await getPool().getConnection()
  let lockAcquired = false
  try {
    const [lockRows] = await connection.query("SELECT GET_LOCK('mere_x_schema_migrations', 30) AS acquired")
    lockAcquired = Number(lockRows?.[0]?.acquired) === 1
    if (!lockAcquired) throw new Error('Could not acquire the database migration lock.')
    await connection.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INT UNSIGNED PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      applied_at BIGINT UNSIGNED NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    const [rows] = await connection.execute('SELECT version FROM schema_migrations')
    const applied = new Set(rows.map(row => Number(row.version)))
    for (const migration of migrations) {
      if (applied.has(migration.version)) continue
      await connection.beginTransaction()
      try {
        for (const statement of migration.statements) {
          try { await connection.execute(statement) }
          catch (error) {
            if (!alreadyAppliedCodes.has(error?.code)) throw error
            console.warn('[database-migration]', { version: migration.version, skipped: error.code })
          }
        }
        await connection.execute('INSERT INTO schema_migrations (version,name,applied_at) VALUES (?,?,?)', [migration.version, migration.name, Date.now()])
        await connection.commit()
      } catch (error) {
        await connection.rollback().catch(() => undefined)
        throw error
      }
    }
  } finally {
    if (lockAcquired) await connection.query("SELECT RELEASE_LOCK('mere_x_schema_migrations')").catch(() => undefined)
    connection.release()
  }
}

export async function initializeDatabase() {
  await getPool().query('SELECT 1')
  await runMigrations()
  ready = true
}

export async function databaseHealth() {
  const started = Date.now()
  try {
    await getPool().query('SELECT 1')
    return { ok: true, ready, latencyMs: Date.now() - started }
  } catch {
    return { ok: false, ready: false, latencyMs: Date.now() - started }
  }
}

export async function closeDatabase() {
  ready = false
  if (!pool) return
  const activePool = pool
  pool = null
  await activePool.end()
}
