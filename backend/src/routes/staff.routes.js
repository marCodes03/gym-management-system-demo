const express = require('express');
const staffController = require('../controllers/staff.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', staffController.listStaff);
router.post('/', staffController.createStaff);
router.put('/:id', staffController.updateStaff);
router.post('/:id/reset-password', staffController.resetPassword);

module.exports = router;
