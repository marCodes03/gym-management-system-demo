const express = require('express');
const db = require('../config/db');
const env = require('../config/env');
const { sendSuccess } = require('../middlewares/errorHandler');

const authRoutes = require('./auth.routes');
const staffRoutes = require('./staff.routes');
const planRoutes = require('./plan.routes');
const memberRoutes = require('./member.routes');
const subscriptionRoutes = require('./subscription.routes');
const checkinRoutes = require('./checkin.routes');
const paymentRoutes = require('./payment.routes');
const dashboardRoutes = require('./dashboard.routes');
const settingsRoutes = require('./settings.routes');

const router = express.Router();

// Health Check Endpoint (verifies live PostgreSQL 16 connectivity)
router.get('/health', async (_req, res, next) => {
  try {
    const result = await db.query(
      'SELECT NOW() AS server_time, current_database() AS database_name, version() AS pg_version'
    );
    const row = result.rows[0];

    return sendSuccess(res, {
      status: 'ok',
      service: 'mad-max-gym-api',
      environment: env.NODE_ENV,
      database: {
        connected: true,
        name: row.database_name,
        serverTime: row.server_time,
        version: row.pg_version.split(',')[0],
      },
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (err) {
    return next(err);
  }
});

// Mount Module 1–6 REST API Routes
router.use('/auth', authRoutes);
router.use('/staff', staffRoutes);
router.use('/plans', planRoutes);
router.use('/members', memberRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/check-in', checkinRoutes);
router.use('/payments', paymentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
