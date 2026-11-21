const express = require('express');
const memberController = require('../controllers/member.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN', 'FRONT_DESK'));

router.get('/', memberController.listMembers);
router.get('/:id', memberController.getMemberById);
router.post('/', memberController.createMember);
router.put('/:id', memberController.updateMember);

module.exports = router;
