const memberService = require('../services/member.service');
const subscriptionService = require('../services/subscription.service');
const { sendSuccess } = require('../middlewares/errorHandler');

async function listMembers(req, res, next) {
  try {
    const { items, pagination } = await memberService.listMembers(req.query);
    return sendSuccess(res, items, 200, pagination);
  } catch (err) {
    return next(err);
  }
}

async function getMemberById(req, res, next) {
  try {
    const member = await memberService.getMemberById(req.params.id);
    return sendSuccess(res, member, 200);
  } catch (err) {
    return next(err);
  }
}

async function createMember(req, res, next) {
  try {
    const member = await memberService.createMember(req.body || {});
    return sendSuccess(res, member, 201);
  } catch (err) {
    return next(err);
  }
}

async function updateMember(req, res, next) {
  try {
    const member = await memberService.updateMember(req.params.id, req.body || {});
    return sendSuccess(res, member, 200);
  } catch (err) {
    return next(err);
  }
}

async function freezeSubscription(req, res, next) {
  try {
    const result = await subscriptionService.freezeSubscription(req.params.id);
    return sendSuccess(res, result, 200);
  } catch (err) {
    return next(err);
  }
}

async function unfreezeSubscription(req, res, next) {
  try {
    const result = await subscriptionService.unfreezeSubscription(req.params.id);
    return sendSuccess(res, result, 200);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listMembers,
  getMemberById,
  createMember,
  updateMember,
  freezeSubscription,
  unfreezeSubscription,
};
