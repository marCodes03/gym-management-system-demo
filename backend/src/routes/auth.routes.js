const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth');
const {
  authRateLimiter,
  forgotPasswordRateLimiter,
} = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/login', authRateLimiter, authController.login);
router.post('/forgot-password', forgotPasswordRateLimiter, authController.forgotPassword);
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
