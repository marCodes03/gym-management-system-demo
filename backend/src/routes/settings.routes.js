const express = require('express');
const settingsController = require('../controllers/settings.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);

// Readable by all authenticated staff for 80mm thermal receipts & merchant QR display
router.get('/', requireRole('ADMIN', 'FRONT_DESK'), settingsController.getSettings);

// Mutable strictly by ADMIN
router.put('/', requireRole('ADMIN'), settingsController.updateSettings);
router.put('/qr-codes', requireRole('ADMIN'), settingsController.updateQrCodes);

module.exports = router;
