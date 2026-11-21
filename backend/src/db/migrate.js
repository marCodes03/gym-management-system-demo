const fs = require('fs');
const path = require('path');
const { pool, withTransaction } = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function runMigrations() {
  console.log('[migrate] Starting Mad Max Gym database migrations...');
  await ensureMigrationsTable();

  const { rows: appliedRows } = await pool.query(
    'SELECT version FROM schema_migrations ORDER BY version ASC'
  );
  const appliedSet = new Set(appliedRows.map((row) => row.version));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[migrate] No SQL migration files found.');
    return;
  }

  let appliedCount = 0;

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`[migrate] Skipping already applied migration: ${file}`);
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`[migrate] Applying migration: ${file} ...`);
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [file]
      );
    });

    appliedCount += 1;
    console.log(`[migrate] Applied: ${file}`);
  }

  console.log(
    `[migrate] Complete. ${appliedCount} new migration(s) applied (${appliedSet.size + appliedCount} total).`
  );
}

runMigrations()
  .catch((err) => {
    console.error('[migrate] Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
