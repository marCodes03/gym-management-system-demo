const checkinService = require('../services/checkin.service');
const { sendSuccess } = require('../middlewares/errorHandler');

async function processCheckIn(req, res, next) {
  try {
    const result = await checkinService.processCheckIn(req.body || {}, req.user);
    return sendSuccess(res, result, 200);
  } catch (err) {
    return next(err);
  }
}

async function verifyExit(req, res, next) {
  try {
    const result = await checkinService.verifyKioskExit(req.user.id, req.body || {});
    return sendSuccess(res, result, 200);
  } catch (err) {
    return next(err);
  }
}

async function listLogs(req, res, next) {
  try {
    const { items, pagination } = await checkinService.listCheckInLogs(req.query);
    return sendSuccess(res, items, 200, pagination);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  processCheckIn,
  verifyExit,
  listLogs,
};
