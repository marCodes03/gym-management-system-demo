const dashboardService = require('../services/dashboard.service');
const { sendSuccess } = require('../middlewares/errorHandler');

async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getSummary(req.query);
    return sendSuccess(res, summary, 200);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getSummary,
};
