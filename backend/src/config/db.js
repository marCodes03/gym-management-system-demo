const { Pool } = require('pg');
const env = require('./env');

const isRemoteDatabaseUrl =
  Boolean(env.DATABASE_URL) &&
  !env.DATABASE_URL.includes('@localhost') &&
  !env.DATABASE_URL.includes('@127.0.0.1') &&
  !env.DATABASE_URL.includes('@postgres:');

const useSsl =
  process.env.DB_SSL === 'true' ||
  (process.env.DB_SSL !== 'false' && isRemoteDatabaseUrl);

const sslConfig = useSsl ? { rejectUnauthorized: false } : false;

const poolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl: sslConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ssl: sslConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[db] Unexpected idle PostgreSQL client error:', err.message);
});

/**
 * Execute a parameterized SQL query against the pool.
 * @param {string} text - Parameterized SQL statement ($1, $2, ...)
 * @param {Array} [params] - Bound query parameter values
 */
async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Execute a callback inside a single ACID PostgreSQL transaction.
 * Automatically commits on success and rolls back on any thrown error.
 * @param {(client: import('pg').PoolClient) => Promise<any>} callback
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
};
