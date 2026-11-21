const paymentService = require('../services/payment.service');
const { sendSuccess } = require('../middlewares/errorHandler');

async function createPayment(req, res, next) {
  try {
    const result = await paymentService.createPayment(req.body || {}, req.user);
    return sendSuccess(res, result, 201);
  } catch (err) {
    return next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    const { items, pagination } = await paymentService.listPayments(req.query);
    return sendSuccess(res, items, 200, pagination);
  } catch (err) {
    return next(err);
  }
}

async function getPaymentById(req, res, next) {
  try {
    const receipt = await paymentService.getPaymentById(req.params.id);
    return sendSuccess(res, receipt, 200);
  } catch (err) {
    return next(err);
  }
}

async function voidPayment(req, res, next) {
  try {
    const result = await paymentService.voidPayment(req.params.id, req.body || {}, req.user);
    return sendSuccess(res, result, 200);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createPayment,
  listPayments,
  getPaymentById,
  voidPayment,
};
