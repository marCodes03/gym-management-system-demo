const authService = require('../services/auth.service');
const { sendSuccess } = require('../middlewares/errorHandler');

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body || {});
    return sendSuccess(res, result, 200);
  } catch (err) {
    return next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body || {});
    return sendSuccess(res, result, 200);
  } catch (err) {
    return next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    return sendSuccess(res, user, 200);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  forgotPassword,
  getMe,
};
