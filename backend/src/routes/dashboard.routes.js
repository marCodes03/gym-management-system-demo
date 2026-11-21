const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/summary', dashboardController.getSummary);

module.exports = router;
