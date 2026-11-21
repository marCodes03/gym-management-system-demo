const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const db = require('./config/db');
const {
  notFoundHandler,
  errorHandler,
} = require('./middlewares/errorHandler');
const apiV1Routes = require('./routes');

const app = express();

// Trust first proxy hop (required on Render / cloud load balancers for express-rate-limit)
app.set('trust proxy', 1);

// Core Middlewares
const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (!env.IS_PROD && allowedOrigins.includes('http://localhost:4601')) {
  allowedOrigins.push('http://127.0.0.1:4601');
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.IS_PROD ? 'combined' : 'dev'));

// Mount Versioned REST API (/api/v1)
app.use('/api/v1', apiV1Routes);

// 404 & Standardized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(
    `[Mad Max Gym API] Listening on http://localhost:${env.PORT} (${env.NODE_ENV})`
  );
});

function shutdown(signal) {
  console.log(`[Mad Max Gym API] Received ${signal}. Closing server and database pool...`);
  server.close(async () => {
    try {
      await db.pool.end();
      console.log('[Mad Max Gym API] Database pool closed cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('[Mad Max Gym API] Error closing database pool:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = app;
