const express = require('express');
const checkinController = require('../controllers/checkin.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN', 'FRONT_DESK'));

router.post('/', checkinController.processCheckIn);
router.post('/verify-exit', checkinController.verifyExit);
router.get('/logs', checkinController.listLogs);

module.exports = router;
