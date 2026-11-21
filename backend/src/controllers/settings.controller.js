const settingsService = require('../services/settings.service');
const { sendSuccess } = require('../middlewares/errorHandler');

async function getSettings(_req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    return sendSuccess(res, settings, 200);
  } catch (err) {
    return next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const settings = await settingsService.updateSettings(req.body || {});
    return sendSuccess(res, settings, 200);
  } catch (err) {
    return next(err);
  }
}

async function updateQrCodes(req, res, next) {
  try {
    const settings = await settingsService.updateQrCodes(req.body || {});
    return sendSuccess(res, settings, 200);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  updateQrCodes,
};
