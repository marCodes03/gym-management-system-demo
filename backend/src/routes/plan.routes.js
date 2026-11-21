const express = require('express');
const planController = require('../controllers/plan.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);

// Accessible to both ADMIN and FRONT_DESK
router.get('/', requireRole('ADMIN', 'FRONT_DESK'), planController.listPlans);

// Restricted to ADMIN only
router.post('/', requireRole('ADMIN'), planController.createPlan);
router.put('/:id', requireRole('ADMIN'), planController.updatePlan);
router.patch('/:id/status', requireRole('ADMIN'), planController.togglePlanStatus);

module.exports = router;
