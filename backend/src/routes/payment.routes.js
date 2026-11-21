const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/', requireRole('ADMIN', 'FRONT_DESK'), paymentController.createPayment);
router.get('/', requireRole('ADMIN', 'FRONT_DESK'), paymentController.listPayments);
router.get('/:id', requireRole('ADMIN', 'FRONT_DESK'), paymentController.getPaymentById);

// Owner-only atomic void
router.post('/:id/void', requireRole('ADMIN'), paymentController.voidPayment);

module.exports = router;
