const express = require('express');
const memberController = require('../controllers/member.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN', 'FRONT_DESK'));

router.post('/:id/freeze', memberController.freezeSubscription);
router.post('/:id/unfreeze', memberController.unfreezeSubscription);

module.exports = router;
