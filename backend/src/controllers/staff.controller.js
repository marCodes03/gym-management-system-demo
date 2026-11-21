const staffService = require('../services/staff.service');
const { sendSuccess } = require('../middlewares/errorHandler');

async function listStaff(req, res, next) {
  try {
    const { items, pagination } = await staffService.listStaff(req.query);
    return sendSuccess(res, items, 200, pagination);
  } catch (err) {
    return next(err);
  }
}

async function createStaff(req, res, next) {
  try {
    const staff = await staffService.createStaff(req.body || {});
    return sendSuccess(res, staff, 201);
  } catch (err) {
    return next(err);
  }
}

async function updateStaff(req, res, next) {
  try {
    const staff = await staffService.updateStaff(req.params.id, req.body || {}, req.user.id);
    return sendSuccess(res, staff, 200);
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await staffService.resetPassword(req.params.id, req.body || {});
    return sendSuccess(res, result, 200);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listStaff,
  createStaff,
  updateStaff,
  resetPassword,
};
