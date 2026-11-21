const planService = require('../services/plan.service');
const { sendSuccess } = require('../middlewares/errorHandler');

async function listPlans(req, res, next) {
  try {
    const plans = await planService.listPlans(req.query);
    return sendSuccess(res, plans, 200);
  } catch (err) {
    return next(err);
  }
}

async function createPlan(req, res, next) {
  try {
    const plan = await planService.createPlan(req.body || {});
    return sendSuccess(res, plan, 201);
  } catch (err) {
    return next(err);
  }
}

async function updatePlan(req, res, next) {
  try {
    const plan = await planService.updatePlan(req.params.id, req.body || {});
    return sendSuccess(res, plan, 200);
  } catch (err) {
    return next(err);
  }
}

async function togglePlanStatus(req, res, next) {
  try {
    const plan = await planService.togglePlanStatus(req.params.id, req.body || {});
    return sendSuccess(res, plan, 200);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
};
