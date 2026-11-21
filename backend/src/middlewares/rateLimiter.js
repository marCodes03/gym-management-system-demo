const rateLimit = require('express-rate-limit');

const rateLimitHandler = (_req, res) => {
  return res.status(429).json({
    success: false,
    error: {
      message:
        'Too many login attempts from this IP address. Please wait 15 minutes before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  });
};

/**
 * Brute-force rate limiter for authentication endpoints:
 * Max 5 failed attempts per 15-minute sliding window per IP address.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = {
  authRateLimiter,
  forgotPasswordRateLimiter,
};
