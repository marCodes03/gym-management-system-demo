const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PLACEHOLDER_SECRETS = new Set([
  'replace_with_a_strong_64_char_hex_secret_before_starting',
  'changeme',
  'secret',
  'jwt_secret',
]);

function validateEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = Number(process.env.PORT || 4600);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: "${process.env.PORT}". Must be a valid TCP port.`);
  }

  const jwtSecret = (process.env.JWT_SECRET || '').trim();
  if (!jwtSecret || PLACEHOLDER_SECRETS.has(jwtSecret)) {
    throw new Error(
      'Missing or placeholder JWT_SECRET. Set a strong cryptographic JWT_SECRET in backend/.env.'
    );
  }

  if (jwtSecret.length < 32) {
    if (nodeEnv === 'production') {
      throw new Error('JWT_SECRET must be at least 32 characters in production.');
    }
    console.warn('[env] Warning: JWT_SECRET should be at least 32 characters long.');
  }

  const databaseUrl = (process.env.DATABASE_URL || '').trim();
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = Number(process.env.DB_PORT || 5435);
  const dbName = process.env.DB_NAME || 'mad_max_gym';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';

  if (!databaseUrl && (!dbHost || !dbName || !dbUser)) {
    throw new Error(
      'Missing PostgreSQL configuration. Provide DATABASE_URL or DB_HOST, DB_NAME, and DB_USER in backend/.env.'
    );
  }

  return Object.freeze({
    NODE_ENV: nodeEnv,
    IS_PROD: nodeEnv === 'production',
    PORT: port,
    DATABASE_URL: databaseUrl || null,
    DB_HOST: dbHost,
    DB_PORT: dbPort,
    DB_NAME: dbName,
    DB_USER: dbUser,
    DB_PASSWORD: dbPassword,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '12h',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4601',
  });
}

const env = validateEnv();

module.exports = env;
